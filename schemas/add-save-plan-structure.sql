-- Guardado único y atómico de la estructura de un plan.
--
-- Un plan vive en dos sitios: plans.payload (lo lee la sesión) y plan_exercises
-- (lo usan las imágenes y los listados). Hasta ahora el cliente los escribía por
-- separado y podían divergir. save_plan_structure crea o actualiza el plan del
-- usuario y reescribe plan_exercises a partir del mismo payload, todo en una
-- transacción. Con el id generado en el teléfono, repetir la llamada tras un
-- corte de red es inocuo.
--
-- Qué normaliza:
--   - etiqueta los días A, B, C… por posición;
--   - fija el nombre canónico del catálogo para cada exercise_id;
--   - acota series (1-10), repeticiones (1-100) y descanso (0-600 s).
-- Qué rechaza: plan sin días, más de 7 días, día sin ejercicios o con más de 15,
-- y bloques sin ejercicio reconocible.
--
-- Los topes son los de src/lib/plans/plan-structure.ts (PLAN_LIMITS): cambiar uno
-- obliga a cambiar el otro.
--
-- SECURITY INVOKER: manda la RLS de plans y plan_exercises (solo el dueño).
-- Idempotente. Aplicar con: scripts/run-sql.ps1 -SqlFile schemas/add-save-plan-structure.sql

-- Entero acotado leído de un valor JSON; `p_default` si no es un número.
CREATE OR REPLACE FUNCTION public.plan_clamp_int(
  p_value   JSONB,
  p_min     INTEGER,
  p_max     INTEGER,
  p_default INTEGER
) RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_value) = 'number'
      THEN LEAST(p_max, GREATEST(p_min, round((p_value #>> '{}')::numeric)::integer))
    ELSE p_default
  END;
$$;

CREATE OR REPLACE FUNCTION public.save_plan_structure(
  p_plan_id TEXT,
  p_weeks   INTEGER,
  p_payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_days      JSONB;
  v_day       JSONB;
  v_block     JSONB;
  v_blocks    JSONB;
  v_out_days  JSONB := '[]'::jsonb;
  v_payload   JSONB;
  v_day_idx   INTEGER := 0;
  v_letter    TEXT;
  v_raw_id    TEXT;
  v_ex_id     UUID;
  v_name      TEXT;
  v_min       INTEGER;
  v_max       INTEGER;
  v_weeks     INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000';
  END IF;
  IF p_plan_id IS NULL OR length(p_plan_id) NOT BETWEEN 1 AND 64 THEN
    RAISE EXCEPTION 'INVALID_PLAN_ID' USING ERRCODE = '22023';
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR length(p_payload::text) > 200000 THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = '22023';
  END IF;

  v_days := p_payload->'days';
  IF v_days IS NULL OR jsonb_typeof(v_days) <> 'array'
     OR jsonb_array_length(v_days) NOT BETWEEN 1 AND 7 THEN
    RAISE EXCEPTION 'INVALID_DAYS' USING ERRCODE = '22023';
  END IF;

  FOR v_day IN SELECT value FROM jsonb_array_elements(v_days) WITH ORDINALITY ORDER BY ordinality
  LOOP
    IF jsonb_typeof(v_day) <> 'object'
       OR jsonb_typeof(v_day->'blocks') IS DISTINCT FROM 'array'
       OR jsonb_array_length(v_day->'blocks') NOT BETWEEN 1 AND 15 THEN
      RAISE EXCEPTION 'INVALID_DAY_BLOCKS' USING ERRCODE = '22023';
    END IF;

    v_letter := chr(65 + v_day_idx);
    v_blocks := '[]'::jsonb;

    FOR v_block IN
      SELECT value FROM jsonb_array_elements(v_day->'blocks') WITH ORDINALITY ORDER BY ordinality
    LOOP
      IF jsonb_typeof(v_block) <> 'object' THEN
        RAISE EXCEPTION 'INVALID_BLOCK' USING ERRCODE = '22023';
      END IF;

      -- El ejercicio se identifica por id; el nombre sale siempre del catálogo.
      v_ex_id := NULL;
      v_name := NULL;
      v_raw_id := v_block->>'exercise_id';
      IF v_raw_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT e.id, e.name INTO v_ex_id, v_name
        FROM exercises e WHERE e.id = v_raw_id::uuid;
      END IF;
      -- Planes antiguos sin exercise_id: se enlaza por nombre exacto si existe.
      IF v_ex_id IS NULL THEN
        SELECT e.id, e.name INTO v_ex_id, v_name
        FROM exercises e
        WHERE lower(e.name) = lower(btrim(COALESCE(v_block->>'name', '')))
        LIMIT 1;
      END IF;
      IF v_ex_id IS NULL THEN
        v_name := left(btrim(COALESCE(v_block->>'name', '')), 120);
        IF v_name = '' THEN
          RAISE EXCEPTION 'UNKNOWN_EXERCISE' USING ERRCODE = '22023';
        END IF;
      END IF;

      v_min := plan_clamp_int(v_block->'reps'->0, 1, 100, 8);
      v_max := GREATEST(v_min, plan_clamp_int(v_block->'reps'->1, 1, 100, GREATEST(v_min, 12)));

      v_blocks := v_blocks || jsonb_build_array(
        (v_block - 'exercise_id')
        || jsonb_build_object(
             'name', v_name,
             'sets', plan_clamp_int(v_block->'sets', 1, 10, 3),
             'reps', jsonb_build_array(v_min, v_max),
             'rest_sec', plan_clamp_int(v_block->'rest_sec', 0, 600, 60),
             'cues', CASE WHEN jsonb_typeof(v_block->'cues') = 'array'
                          THEN v_block->'cues' ELSE '[]'::jsonb END
           )
        || CASE WHEN v_ex_id IS NULL THEN '{}'::jsonb
                ELSE jsonb_build_object('exercise_id', v_ex_id) END
      );
    END LOOP;

    v_out_days := v_out_days || jsonb_build_array(
      v_day || jsonb_build_object(
        'day', v_letter,
        'focus', left(COALESCE(v_day->>'focus', ''), 80),
        'blocks', v_blocks
      )
    );
    v_day_idx := v_day_idx + 1;
  END LOOP;

  -- p_weeks NULL = conservar las semanas del plan (8 si es nuevo).
  v_weeks := CASE WHEN p_weeks IS NULL THEN NULL ELSE LEAST(52, GREATEST(1, p_weeks)) END;

  UPDATE plans
  SET weeks = COALESCE(v_weeks, weeks),
      payload = p_payload || jsonb_build_object(
        'days', v_out_days, 'weeks', COALESCE(v_weeks, weeks))
  WHERE id = p_plan_id AND user_id = v_uid
  RETURNING payload INTO v_payload;

  IF NOT FOUND THEN
    -- Plan nuevo. Si el id ya es de otro usuario, la clave primaria lo rechaza.
    INSERT INTO plans (id, user_id, weeks, source_hash, payload)
    VALUES (
      p_plan_id, v_uid, COALESCE(v_weeks, 8), p_plan_id,
      p_payload || jsonb_build_object('days', v_out_days, 'weeks', COALESCE(v_weeks, 8))
    )
    RETURNING payload INTO v_payload;
  END IF;

  DELETE FROM plan_exercises WHERE plan_id = p_plan_id;

  INSERT INTO plan_exercises (
    plan_id, exercise_name, exercise_id, day_letter, block_index,
    sets, reps_min, reps_max, rest_sec, cues
  )
  SELECT
    p_plan_id,
    b.value->>'name',
    (b.value->>'exercise_id')::uuid,
    d.value->>'day',
    (b.ord - 1)::integer,
    (b.value->>'sets')::integer,
    (b.value->'reps'->>0)::integer,
    (b.value->'reps'->>1)::integer,
    (b.value->>'rest_sec')::integer,
    ARRAY(SELECT jsonb_array_elements_text(b.value->'cues'))
  FROM jsonb_array_elements(v_out_days) AS d(value)
  CROSS JOIN LATERAL jsonb_array_elements(d.value->'blocks') WITH ORDINALITY AS b(value, ord);

  RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.save_plan_structure(TEXT, INTEGER, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_plan_structure(TEXT, INTEGER, JSONB) TO authenticated;

COMMENT ON FUNCTION public.save_plan_structure(TEXT, INTEGER, JSONB) IS
  'Crea o actualiza un plan del usuario y reescribe plan_exercises desde el mismo payload, en una transacción.';
