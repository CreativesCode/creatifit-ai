-- Migración: insert_plan_exercises usa el exercise_id provisto por la Edge Function
-- y solo cae al matching por nombre como respaldo.
--
-- Cambios respecto a la versión anterior (create-plan-exercise-relation.sql):
--   1. Usa el `exercise_id` que ya viene resuelto desde la Edge Function (numérico
--      ref -> uuid real). Si no viene, busca por nombre como antes.
--   2. Corrige la extracción de `reps`: antes hacía (exercise_record->>'reps')[1],
--      que NO es indexación de array válida en Postgres sobre texto. Ahora se lee
--      del array JSON con ->'reps'->>0 y ->'reps'->>1.
--   3. Devuelve cuántos ejercicios quedaron enlazados (exercise_id no nulo).
--
-- Aplicar en Supabase (SQL Editor o `supabase db push`):
--   Ejecuta este archivo completo. Es idempotente (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION insert_plan_exercises(
  p_plan_id TEXT,
  p_exercises JSONB
)
RETURNS INTEGER AS $$
DECLARE
  exercise_record JSONB;
  exercise_count INTEGER := 0;
  v_exercise_id UUID;
  v_provided_id TEXT;
BEGIN
  -- Limpiar ejercicios existentes del plan
  DELETE FROM plan_exercises WHERE plan_id = p_plan_id;

  -- Insertar nuevos ejercicios
  FOR exercise_record IN
    SELECT * FROM jsonb_array_elements(p_exercises)
  LOOP
    v_exercise_id := NULL;

    -- 1) Preferir el exercise_id provisto por la Edge Function (si es un UUID válido).
    v_provided_id := exercise_record->>'exercise_id';
    IF v_provided_id IS NOT NULL AND v_provided_id <> '' THEN
      BEGIN
        v_exercise_id := v_provided_id::UUID;
      EXCEPTION WHEN OTHERS THEN
        v_exercise_id := NULL;
      END;
    END IF;

    -- 2) Respaldo: buscar por nombre exacto (case-insensitive).
    IF v_exercise_id IS NULL THEN
      SELECT id INTO v_exercise_id
      FROM exercises
      WHERE name ILIKE exercise_record->>'name'
      LIMIT 1;
    END IF;

    INSERT INTO plan_exercises (
      plan_id,
      exercise_name,
      exercise_id,
      day_letter,
      block_index,
      sets,
      reps_min,
      reps_max,
      rest_sec,
      cues
    ) VALUES (
      p_plan_id,
      exercise_record->>'name',
      v_exercise_id,
      exercise_record->>'day',
      (exercise_record->>'block_index')::INTEGER,
      (exercise_record->>'sets')::INTEGER,
      COALESCE((exercise_record->'reps'->>0)::INTEGER, 8),
      COALESCE((exercise_record->'reps'->>1)::INTEGER, 12),
      (exercise_record->>'rest_sec')::INTEGER,
      CASE
        WHEN jsonb_typeof(exercise_record->'cues') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(exercise_record->'cues'))
        ELSE '{}'::TEXT[]
      END
    );

    -- Contamos solo los que quedaron enlazados a un ejercicio real.
    IF v_exercise_id IS NOT NULL THEN
      exercise_count := exercise_count + 1;
    END IF;
  END LOOP;

  RETURN exercise_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION insert_plan_exercises(TEXT, JSONB) IS
  'Inserta ejercicios de un plan usando el exercise_id provisto (Edge Function) con respaldo por nombre. Devuelve el nº de ejercicios enlazados.';
