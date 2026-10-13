-- Linea base del esquema public de CreatiFit AI.
--
-- Volcado del proyecto Supabase real (oacjsudvmgkrtcesxjsr) el 2026-10-12 con
-- pg_dump --schema-only --schema=public --no-owner. Sustituye, como punto de
-- partida, a los SQL sueltos de schemas/ y scripts/ (ver schemas/README.md).
--
-- El proyecto real YA tiene todo esto: alli esta migracion se marca como
-- aplicada, no se ejecuta (ver supabase/migrations/README.md). Sirve para
-- levantar una base nueva con el mismo esquema.
--
-- Lo que vive fuera de public (trigger en auth.users, buckets y politicas de
-- Storage) esta en la migracion siguiente.

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS "public";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: admin_user_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."admin_user_activity"() RETURNS TABLE("user_id" "uuid", "plan_count" bigint, "session_count" bigint, "set_count" bigint, "last_workout" timestamp with time zone, "generation_count" bigint, "last_sign_in" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    u.id,
    (SELECT count(*) FROM public.plans p WHERE p.user_id::text = u.id::text),
    (SELECT count(DISTINCT w.session_id) FROM public.workout_logs w WHERE w.user_id = u.id),
    (SELECT count(*) FROM public.workout_logs w WHERE w.user_id = u.id),
    (SELECT max(w."timestamp") FROM public.workout_logs w WHERE w.user_id = u.id),
    (SELECT count(*) FROM public.plan_generations g WHERE g.user_id = u.id AND g.status = 'ok'),
    u.last_sign_in_at
  FROM auth.users u;
$$;


--
-- Name: exercise_movement_flags("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."exercise_movement_flags"("p_name" "text") RETURNS "text"[]
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  WITH f AS (
    SELECT
      (
        p_name ~* '\m(jumps?|jumping|hops?|hopping|leaps?|bounds?|bounding|plyo|plyometrics?|burpees?|skips?|skipping|skaters?|bunny)\M'
        AND p_name !~* '\mskater squat\M'
      ) AS j,
      (
        p_name ~* '\m(run|running|sprints?|sprinter|sprinting|high knees|butt kicks?|mountain climbers?|slams?|shuffle|jog|jogging|drills?|fast feet|battle rope)\M'
        AND p_name !~* '\m(bike|wheel run)\M'
      ) AS i,
      (
        (
          p_name ~* '\m(deadlifts?|clean|snatch|jerk|good mornings?|rack pull|thrusters?|zercher|farmers?|hack squat|leg press|t-bar|trap bar)\M'
          OR p_name ~* '\mbarbell\M.*\m(squat|lunge|row|press|thrusts?|step-up|shrug|bridge)\M'
          OR p_name ~* '^(bench press|back squat|front squat|military press|overhead press|close grip bench press)$'
        )
        AND p_name !~* '\m(bodyweight|band|banded|stretch|stick|pvc|kettlebell swing)\M'
      ) AS h
  )
  SELECT array_remove(
    ARRAY[
      CASE WHEN j THEN 'jumps' END,
      CASE WHEN j OR i THEN 'high_impact' END,
      CASE WHEN h THEN 'heavy_lifting' END
    ],
    NULL
  )
  FROM f;
$_$;


--
-- Name: get_available_filters(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_available_filters"() RETURNS TABLE("filter_type" "text", "filter_value" "text", "count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Categorías
    RETURN QUERY
    SELECT 'category'::TEXT, category, COUNT(*)::BIGINT
    FROM exercises 
    WHERE category IS NOT NULL AND category != ''
    GROUP BY category
    ORDER BY count DESC;
    
    -- Tipos
    RETURN QUERY
    SELECT 'kind'::TEXT, kind, COUNT(*)::BIGINT
    FROM exercises 
    WHERE kind IS NOT NULL AND kind != ''
    GROUP BY kind
    ORDER BY count DESC;
    
    -- Equipamiento
    RETURN QUERY
    SELECT 'equipment'::TEXT, equipment, COUNT(*)::BIGINT
    FROM exercises 
    WHERE equipment IS NOT NULL AND equipment != ''
    GROUP BY equipment
    ORDER BY count DESC;
END;
$$;


--
-- Name: get_exercises_by_category("text", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_exercises_by_category"("p_category" "text", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "name" "text", "kind" "text", "gif_url" "text", "equipment" "text", "primary_muscles" "text", "category" "text", "overview" "text", "instructions" "text"[], "tips" "text"[], "benefits" "text"[], "muscle_groups_primary" "text"[], "muscle_groups_secondary" "text"[], "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.kind,
        e.gif_url,
        e.equipment,
        e.primary_muscles,
        e.category,
        e.overview,
        e.instructions,
        e.tips,
        e.benefits,
        e.muscle_groups_primary,
        e.muscle_groups_secondary,
        e.created_at,
        e.updated_at
    FROM exercises e
    WHERE e.category ILIKE '%' || p_category || '%'
    ORDER BY e.name ASC
    LIMIT p_limit;
END;
$$;


--
-- Name: get_exercises_simple(integer, integer, "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_exercises_simple"("p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 10, "p_category" "text" DEFAULT NULL::"text", "p_kind" "text" DEFAULT NULL::"text", "p_equipment" "text" DEFAULT NULL::"text", "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "name" "text", "kind" "text", "gif_url" "text", "equipment" "text", "primary_muscles" "text", "category" "text", "overview" "text", "instructions" "text"[], "tips" "text"[], "benefits" "text"[], "muscle_groups_primary" "text"[], "muscle_groups_secondary" "text"[], "meta" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_offset INTEGER;
  v_total_count BIGINT;
BEGIN
  -- Calcular offset para paginación
  v_offset := (p_page - 1) * p_limit;
  
  -- Obtener el total de ejercicios que coinciden con los filtros
  SELECT COUNT(*)
  INTO v_total_count
  FROM exercises e
  WHERE (p_category IS NULL OR e.category ILIKE '%' || p_category || '%')
    AND (p_kind IS NULL OR e.kind ILIKE '%' || p_kind || '%')
    AND (p_equipment IS NULL OR e.equipment ILIKE '%' || p_equipment || '%')
    AND (p_search IS NULL OR 
         e.name ILIKE '%' || p_search || '%' OR
         e.overview ILIKE '%' || p_search || '%' OR
         e.primary_muscles ILIKE '%' || p_search || '%');
  
  -- Retornar ejercicios paginados con el total count
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.kind,
    e.gif_url,
    e.equipment,
    e.primary_muscles,
    e.category,
    e.overview,
    e.instructions,
    e.tips,
    e.benefits,
    e.muscle_groups_primary,
    e.muscle_groups_secondary,
    e.meta,
    e.created_at,
    e.updated_at,
    v_total_count
  FROM exercises e
  WHERE (p_category IS NULL OR e.category ILIKE '%' || p_category || '%')
    AND (p_kind IS NULL OR e.kind ILIKE '%' || p_kind || '%')
    AND (p_equipment IS NULL OR e.equipment ILIKE '%' || p_equipment || '%')
    AND (p_search IS NULL OR 
         e.name ILIKE '%' || p_search || '%' OR
         e.overview ILIKE '%' || p_search || '%' OR
         e.primary_muscles ILIKE '%' || p_search || '%')
  ORDER BY e.name
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;


--
-- Name: get_exercises_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_exercises_stats"() RETURNS TABLE("total_exercises" bigint, "categories_count" bigint, "kinds_count" bigint, "equipment_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_exercises,
        COUNT(DISTINCT category)::BIGINT as categories_count,
        COUNT(DISTINCT kind)::BIGINT as kinds_count,
        COUNT(DISTINCT equipment)::BIGINT as equipment_count
    FROM exercises;
END;
$$;


--
-- Name: get_exercises_with_categories(integer, integer, "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_exercises_with_categories"("p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 10, "p_category" "text" DEFAULT NULL::"text", "p_kind" "text" DEFAULT NULL::"text", "p_equipment" "text" DEFAULT NULL::"text", "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "name" "text", "kind" "text", "gif_url" "text", "equipment" "text", "primary_muscles" "text", "categories" "text"[], "primary_category" "text", "overview" "text", "instructions" "text"[], "tips" "text"[], "benefits" "text"[], "muscle_groups_primary" "text"[], "muscle_groups_secondary" "text"[], "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_offset INTEGER;
    v_total_count BIGINT;
BEGIN
    -- Calcular offset para paginación
    v_offset := (p_page - 1) * p_limit;
    
    -- Obtener el conteo total con filtros
    SELECT COUNT(DISTINCT e.id) INTO v_total_count
    FROM exercises_clean e
    LEFT JOIN exercise_category_relations ecr ON e.name = ecr.exercise_name
    LEFT JOIN exercise_categories cat ON ecr.category_id = cat.id
    WHERE (p_category IS NULL OR cat.name ILIKE '%' || p_category || '%')
      AND (p_kind IS NULL OR e.kind ILIKE '%' || p_kind || '%')
      AND (p_equipment IS NULL OR e.equipment ILIKE '%' || p_equipment || '%')
      AND (p_search IS NULL OR (
        e.name ILIKE '%' || p_search || '%' OR 
        COALESCE(e.overview, '') ILIKE '%' || p_search || '%' OR
        e.primary_muscles ILIKE '%' || p_search || '%'
      ));
    
    -- Retornar los ejercicios paginados con todas sus categorías
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.kind,
        e.gif_url,
        e.equipment,
        e.primary_muscles,
        ARRAY_AGG(DISTINCT cat.name) as categories, -- Todas las categorías
        (SELECT cat2.name 
         FROM exercise_category_relations ecr2 
         JOIN exercise_categories cat2 ON ecr2.category_id = cat2.id 
         WHERE ecr2.exercise_name = e.name AND ecr2.is_primary = true 
         LIMIT 1) as primary_category, -- Categoría principal
        e.overview,
        e.instructions,
        e.tips,
        e.benefits,
        e.muscle_groups_primary,
        e.muscle_groups_secondary,
        e.created_at,
        e.updated_at,
        v_total_count
    FROM exercises_clean e
    LEFT JOIN exercise_category_relations ecr ON e.name = ecr.exercise_name
    LEFT JOIN exercise_categories cat ON ecr.category_id = cat.id
    WHERE (p_category IS NULL OR cat.name ILIKE '%' || p_category || '%')
      AND (p_kind IS NULL OR e.kind ILIKE '%' || p_kind || '%')
      AND (p_equipment IS NULL OR e.equipment ILIKE '%' || p_equipment || '%')
      AND (p_search IS NULL OR (
        e.name ILIKE '%' || p_search || '%' OR 
        COALESCE(e.overview, '') ILIKE '%' || p_search || '%' OR
        e.primary_muscles ILIKE '%' || p_search || '%'
      ))
    GROUP BY e.id, e.name, e.kind, e.gif_url, e.equipment, e.primary_muscles,
             e.overview, e.instructions, e.tips, e.benefits, 
             e.muscle_groups_primary, e.muscle_groups_secondary, 
             e.created_at, e.updated_at
    ORDER BY e.name
    LIMIT p_limit
    OFFSET v_offset;
END;
$$;


--
-- Name: get_filtered_exercises("text"[], "text", integer, "text", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_filtered_exercises"("p_equipment" "text"[] DEFAULT NULL::"text"[], "p_objective" "text" DEFAULT NULL::"text", "p_age" integer DEFAULT NULL::integer, "p_gender" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 200) RETURNS TABLE("id" "uuid", "name" "text", "kind" "text", "gif_url" "text", "equipment" "text", "primary_muscles" "text", "category" "text", "overview" "text", "instructions" "text"[], "tips" "text"[], "benefits" "text"[], "muscle_groups_primary" "text"[], "muscle_groups_secondary" "text"[], "meta" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  equipment_filter TEXT := '';
  objective_filter TEXT := '';
  age_gender_filter TEXT := '';
  final_query TEXT;
BEGIN
  -- Construir filtro de equipamiento más selectivo
  IF p_equipment IS NOT NULL AND array_length(p_equipment, 1) > 0 THEN
    -- Priorizar ejercicios sin equipamiento y con equipamiento disponible
    SELECT string_agg(
      CASE 
        WHEN eq = 'none' THEN "equipment ILIKE '%NO EQUIPMENT%'"
        WHEN eq = 'resistance_band' THEN "equipment ILIKE '%resistance%'"
        WHEN eq = 'dumbbells' THEN "equipment ILIKE '%dumbbell%'"
        WHEN eq = 'barbell' THEN "equipment ILIKE '%barbell%'"
        WHEN eq = 'kettlebell' THEN "equipment ILIKE '%kettlebell%'"
        WHEN eq = 'bench' THEN "equipment ILIKE '%bench%'"
        WHEN eq = 'wall' THEN "equipment ILIKE '%wall%'"
        WHEN eq = 'chair' THEN "equipment ILIKE '%chair%'"
        WHEN eq = 'table' THEN "equipment ILIKE '%table%'"
        ELSE "equipment ILIKE '%' || eq || '%'"
      END, ' OR '
    ) INTO equipment_filter
    FROM unnest(p_equipment) AS eq;
    
    equipment_filter := '(' || equipment_filter || ')';
  ELSE
    -- Si no tiene equipamiento, solo ejercicios sin equipamiento
    equipment_filter := "equipment ILIKE '%NO EQUIPMENT%'";
  END IF;

  -- Filtro por tipo de ejercicio según objetivo (más específico)
  IF p_objective IS NOT NULL THEN
    IF p_objective ILIKE '%strength%' OR p_objective ILIKE '%muscle%' OR p_objective ILIKE '%build%' THEN
      objective_filter := "AND kind = 'strength'";
      -- Para fuerza, priorizar ejercicios compuestos
      objective_filter := objective_filter || " AND (category ILIKE '%Strength%' OR category ILIKE '%Compound%')";
    ELSIF p_objective ILIKE '%cardio%' OR p_objective ILIKE '%endurance%' OR p_objective ILIKE '%weight%' THEN
      objective_filter := "AND kind = 'cardio'";
      -- Para cardio, priorizar ejercicios de alta intensidad
      objective_filter := objective_filter || " AND (category ILIKE '%Cardio%' OR category ILIKE '%HIIT%')";
    ELSIF p_objective ILIKE '%flexibility%' OR p_objective ILIKE '%mobility%' OR p_objective ILIKE '%rehabilitation%' THEN
      objective_filter := "AND kind = 'stretching'";
      -- Para flexibilidad, priorizar ejercicios de movilidad
      objective_filter := objective_filter || " AND (category ILIKE '%Stretching%' OR category ILIKE '%Mobility%')";
    END IF;
  END IF;

  -- Filtro por edad y género (ejercicios apropiados)
  IF p_age IS NOT NULL THEN
    IF p_age < 18 THEN
      age_gender_filter := "AND kind != 'strength'"; -- Evitar ejercicios de fuerza intensos para menores
    ELSIF p_age > 65 THEN
      age_gender_filter := "AND (kind = 'stretching' OR kind = 'cardio')"; -- Priorizar ejercicios suaves para mayores
    END IF;
  END IF;

  -- Construir la consulta SQL completa
  final_query := '
    SELECT 
      id, name, kind, gif_url, equipment, primary_muscles, category,
      overview, instructions, tips, benefits, muscle_groups_primary, 
      muscle_groups_secondary, meta, created_at, updated_at
    FROM exercises 
    WHERE ' || equipment_filter || '
    ' || COALESCE(objective_filter, '') || '
    ' || COALESCE(age_gender_filter, '') || '
    ORDER BY 
      CASE 
        WHEN equipment ILIKE ''%NO EQUIPMENT%'' THEN 1
        WHEN equipment ILIKE ''%' || COALESCE(p_equipment[1], 'none') || '%'' THEN 2
        ELSE 3
      END,
      name
    LIMIT ' || p_limit;

  -- Ejecutar la consulta dinámicamente
  RETURN QUERY EXECUTE final_query;
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, devolver ejercicios básicos
    RAISE WARNING 'Error en filtrado, devolviendo ejercicios básicos: %', SQLERRM;
    
    RETURN QUERY
    SELECT 
      id, name, kind, gif_url, equipment, primary_muscles, category,
      overview, instructions, tips, benefits, muscle_groups_primary, 
      muscle_groups_secondary, meta, created_at, updated_at
    FROM exercises 
    WHERE equipment ILIKE '%NO EQUIPMENT%'
    ORDER BY name
    LIMIT 50;
END;
$$;


--
-- Name: FUNCTION "get_filtered_exercises"("p_equipment" "text"[], "p_objective" "text", "p_age" integer, "p_gender" "text", "p_limit" integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."get_filtered_exercises"("p_equipment" "text"[], "p_objective" "text", "p_age" integer, "p_gender" "text", "p_limit" integer) IS 'Función segura para filtrar ejercicios según equipamiento, objetivo, edad y género del usuario';


--
-- Name: get_plan_exercises_with_details("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_plan_exercises_with_details"("p_plan_id" "text") RETURNS TABLE("day_letter" "text", "block_index" integer, "exercise_name" "text", "exercise_id" "uuid", "gif_url" "text", "equipment" "text", "category" "text", "primary_muscles" "text", "sets" integer, "reps_min" integer, "reps_max" integer, "rest_sec" integer, "cues" "text"[])
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pe.day_letter,
    pe.block_index,
    pe.exercise_name,
    pe.exercise_id,
    e.gif_url,
    e.equipment,
    e.category,
    e.primary_muscles,
    pe.sets,
    pe.reps_min,
    pe.reps_max,
    pe.rest_sec,
    pe.cues
  FROM plan_exercises pe
  LEFT JOIN exercises e ON pe.exercise_id = e.id
  WHERE pe.plan_id = p_plan_id
  ORDER BY pe.day_letter, pe.block_index;
END;
$$;


--
-- Name: FUNCTION "get_plan_exercises_with_details"("p_plan_id" "text"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."get_plan_exercises_with_details"("p_plan_id" "text") IS 'Obtiene ejercicios de un plan con todos sus detalles';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(left(btrim(NEW.raw_user_meta_data->>'full_name'), 80), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: insert_plan_exercises("text", "jsonb"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."insert_plan_exercises"("p_plan_id" "text", "p_exercises" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
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

    -- 1) Preferir el exercise_id provisto por la Edge Function (si es un UUID v�lido).
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
$$;


--
-- Name: FUNCTION "insert_plan_exercises"("p_plan_id" "text", "p_exercises" "jsonb"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."insert_plan_exercises"("p_plan_id" "text", "p_exercises" "jsonb") IS 'Inserta ejercicios de un plan usando el exercise_id provisto (Edge Function) con respaldo por nombre. Devuelve el n� de ejercicios enlazados.';


--
-- Name: ping(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."ping"() RETURNS timestamp with time zone
    LANGUAGE "sql" STABLE
    AS $$
  select now();
$$;


--
-- Name: plan_clamp_int("jsonb", integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."plan_clamp_int"("p_value" "jsonb", "p_min" integer, "p_max" integer, "p_default" integer) RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_value) = 'number'
      THEN LEAST(p_max, GREATEST(p_min, round((p_value #>> '{}')::numeric)::integer))
    ELSE p_default
  END;
$$;


--
-- Name: save_plan_structure("text", integer, "jsonb"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."save_plan_structure"("p_plan_id" "text", "p_weeks" integer, "p_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
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
$_$;


--
-- Name: FUNCTION "save_plan_structure"("p_plan_id" "text", "p_weeks" integer, "p_payload" "jsonb"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."save_plan_structure"("p_plan_id" "text", "p_weeks" integer, "p_payload" "jsonb") IS 'Crea o actualiza un plan del usuario y reescribe plan_exercises desde el mismo payload, en una transacción.';


--
-- Name: search_exercises_advanced("text", "text", "text", "text", "text", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."search_exercises_advanced"("p_search" "text" DEFAULT NULL::"text", "p_category" "text" DEFAULT NULL::"text", "p_kind" "text" DEFAULT NULL::"text", "p_equipment" "text" DEFAULT NULL::"text", "p_muscle_group" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "name" "text", "kind" "text", "gif_url" "text", "equipment" "text", "primary_muscles" "text", "category" "text", "overview" "text", "instructions" "text"[], "tips" "text"[], "benefits" "text"[], "muscle_groups_primary" "text"[], "muscle_groups_secondary" "text"[], "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "relevance_score" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.kind,
        e.gif_url,
        e.equipment,
        e.primary_muscles,
        e.category,
        e.overview,
        e.instructions,
        e.tips,
        e.benefits,
        e.muscle_groups_primary,
        e.muscle_groups_secondary,
        e.created_at,
        e.updated_at,
        CASE 
            WHEN p_search IS NOT NULL AND (
                e.name ILIKE '%' || p_search || '%' OR 
                e.overview ILIKE '%' || p_search || '%'
            ) THEN 3
            WHEN p_search IS NOT NULL AND e.primary_muscles ILIKE '%' || p_search || '%' THEN 2
            ELSE 1
        END::INTEGER as relevance_score
    FROM exercises e
    WHERE (p_category IS NULL OR e.category ILIKE '%' || p_category || '%')
      AND (p_kind IS NULL OR e.kind ILIKE '%' || p_kind || '%')
      AND (p_equipment IS NULL OR e.equipment ILIKE '%' || p_equipment || '%')
      AND (p_muscle_group IS NULL OR e.primary_muscles ILIKE '%' || p_muscle_group || '%')
      AND (p_search IS NULL OR (
        e.name ILIKE '%' || p_search || '%' OR 
        e.overview ILIKE '%' || p_search || '%' OR
        e.primary_muscles ILIKE '%' || p_search || '%'
      ))
    ORDER BY relevance_score DESC, e.name ASC
    LIMIT p_limit;
END;
$$;


--
-- Name: set_exercise_movement_flags(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."set_exercise_movement_flags"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.movement_flags := public.exercise_movement_flags(NEW.name);
  RETURN NEW;
END;
$$;


--
-- Name: update_plan_exercises_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_plan_exercises_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: body_measurements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."body_measurements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "weight" numeric,
    "body_fat" numeric,
    "chest" numeric,
    "waist" numeric,
    "hips" numeric,
    "arms" numeric,
    "thighs" numeric,
    "photo_path" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: day_exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."day_exercises" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "day_id" "text",
    "exercise_id" "text",
    "target_sets" integer NOT NULL,
    "target_reps_lo" integer NOT NULL,
    "target_reps_hi" integer NOT NULL,
    "rest_sec" integer NOT NULL,
    "cues" "jsonb" DEFAULT '[]'::"jsonb"
);


--
-- Name: exercise_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exercise_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: exercise_category_relations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exercise_category_relations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exercise_name" "text" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: exercise_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exercise_favorites" (
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: exercise_muscles_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exercise_muscles_detail" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "muscle_name" "text" NOT NULL,
    "muscle_group" "text" NOT NULL,
    "muscle_description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "exercise_muscles_detail_muscle_group_check" CHECK (("muscle_group" = ANY (ARRAY['primary'::"text", 'secondary'::"text"])))
);


--
-- Name: TABLE "exercise_muscles_detail"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."exercise_muscles_detail" IS 'Tabla para músculos detallados de cada ejercicio';


--
-- Name: COLUMN "exercise_muscles_detail"."exercise_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."exercise_muscles_detail"."exercise_id" IS 'Referencia UUID al ejercicio en la tabla exercises';


--
-- Name: exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "gif_url" "text",
    "equipment" "text" DEFAULT ''::"text" NOT NULL,
    "primary_muscles" "text" DEFAULT ''::"text" NOT NULL,
    "category" "text" DEFAULT ''::"text" NOT NULL,
    "overview" "text",
    "instructions" "text"[] DEFAULT ARRAY[]::"text"[],
    "tips" "text"[] DEFAULT ARRAY[]::"text"[],
    "benefits" "text"[] DEFAULT ARRAY[]::"text"[],
    "muscle_groups_primary" "text"[] DEFAULT ARRAY[]::"text"[],
    "muscle_groups_secondary" "text"[] DEFAULT ARRAY[]::"text"[],
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "movement_flags" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


--
-- Name: TABLE "exercises"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."exercises" IS 'Tabla principal de ejercicios con estructura completa';


--
-- Name: COLUMN "exercises"."id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."exercises"."id" IS 'Identificador único UUID del ejercicio';


--
-- Name: intake; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."intake" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "objective" "text" NOT NULL,
    "level" "text" NOT NULL,
    "age" integer NOT NULL,
    "weight_kg" numeric(5,2) NOT NULL,
    "height_cm" integer NOT NULL,
    "equipment" "jsonb" DEFAULT '{}'::"jsonb",
    "steps_day" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: plan_days; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."plan_days" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "plan_id" "text",
    "day_index" integer NOT NULL,
    "date" timestamp with time zone,
    "focus" "text" NOT NULL
);


--
-- Name: plan_exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."plan_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "text" NOT NULL,
    "exercise_name" "text" NOT NULL,
    "exercise_id" "uuid",
    "day_letter" "text" NOT NULL,
    "block_index" integer NOT NULL,
    "sets" integer NOT NULL,
    "reps_min" integer NOT NULL,
    "reps_max" integer NOT NULL,
    "rest_sec" integer NOT NULL,
    "cues" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: TABLE "plan_exercises"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."plan_exercises" IS 'Tabla de relación entre planes y ejercicios específicos';


--
-- Name: plan_generations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."plan_generations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "model" "text",
    "prompt_tokens" integer,
    "completion_tokens" integer,
    "plan" "jsonb",
    "meta" "jsonb",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    CONSTRAINT "plan_generations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'ok'::"text", 'failed'::"text"])))
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."plans" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "weeks" integer NOT NULL,
    "version" integer DEFAULT 1,
    "source_hash" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_admin" boolean DEFAULT false NOT NULL,
    "tier" "text" DEFAULT 'free'::"text" NOT NULL,
    "subscription_updated_at" timestamp with time zone
);


--
-- Name: workout_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."workout_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "exercise_name" "text" NOT NULL,
    "set_index" integer NOT NULL,
    "target_reps" integer[] NOT NULL,
    "actual_reps" integer NOT NULL,
    "weight" numeric(5,2),
    "rpe" integer,
    "notes" "text",
    "plan_day_id" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "session_id" "uuid" DEFAULT "gen_random_uuid"(),
    "plan_id" "text",
    CONSTRAINT "workout_logs_rpe_check" CHECK ((("rpe" >= 1) AND ("rpe" <= 10)))
);


--
-- Name: TABLE "workout_logs"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."workout_logs" IS 'Registros de sesiones de entrenamiento individuales';


--
-- Name: COLUMN "workout_logs"."exercise_name"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."workout_logs"."exercise_name" IS 'Nombre del ejercicio realizado';


--
-- Name: COLUMN "workout_logs"."set_index"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."workout_logs"."set_index" IS 'Número de serie (1, 2, 3, etc.)';


--
-- Name: COLUMN "workout_logs"."target_reps"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."workout_logs"."target_reps" IS 'Rango de repeticiones objetivo [min, max]';


--
-- Name: COLUMN "workout_logs"."actual_reps"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."workout_logs"."actual_reps" IS 'Repeticiones realmente completadas';


--
-- Name: COLUMN "workout_logs"."weight"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."workout_logs"."weight" IS 'Peso utilizado en kg (opcional)';


--
-- Name: COLUMN "workout_logs"."rpe"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."workout_logs"."rpe" IS 'Rate of Perceived Exertion 1-10 (opcional)';


--
-- Name: COLUMN "workout_logs"."notes"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."workout_logs"."notes" IS 'Notas adicionales sobre la serie';


--
-- Name: COLUMN "workout_logs"."plan_day_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."workout_logs"."plan_day_id" IS 'Referencia al día del plan de entrenamiento';


--
-- Name: COLUMN "workout_logs"."timestamp"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."workout_logs"."timestamp" IS 'Cuándo se realizó la serie';


--
-- Name: COLUMN "workout_logs"."session_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."workout_logs"."session_id" IS 'Identificador único de la sesión de entrenamiento. Permite separar múltiples entrenamientos del mismo día.';


--
-- Name: body_measurements body_measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."body_measurements"
    ADD CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id");


--
-- Name: day_exercises day_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."day_exercises"
    ADD CONSTRAINT "day_exercises_pkey" PRIMARY KEY ("id");


--
-- Name: exercise_categories exercise_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exercise_categories"
    ADD CONSTRAINT "exercise_categories_name_key" UNIQUE ("name");


--
-- Name: exercise_categories exercise_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exercise_categories"
    ADD CONSTRAINT "exercise_categories_pkey" PRIMARY KEY ("id");


--
-- Name: exercise_category_relations exercise_category_relations_exercise_name_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exercise_category_relations"
    ADD CONSTRAINT "exercise_category_relations_exercise_name_category_id_key" UNIQUE ("exercise_name", "category_id");


--
-- Name: exercise_category_relations exercise_category_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exercise_category_relations"
    ADD CONSTRAINT "exercise_category_relations_pkey" PRIMARY KEY ("id");


--
-- Name: exercise_favorites exercise_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exercise_favorites"
    ADD CONSTRAINT "exercise_favorites_pkey" PRIMARY KEY ("user_id", "exercise_id");


--
-- Name: exercise_muscles_detail exercise_muscles_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exercise_muscles_detail"
    ADD CONSTRAINT "exercise_muscles_detail_pkey" PRIMARY KEY ("id");


--
-- Name: exercises exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");


--
-- Name: intake intake_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."intake"
    ADD CONSTRAINT "intake_pkey" PRIMARY KEY ("id");


--
-- Name: intake intake_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."intake"
    ADD CONSTRAINT "intake_user_id_key" UNIQUE ("user_id");


--
-- Name: plan_days plan_days_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."plan_days"
    ADD CONSTRAINT "plan_days_pkey" PRIMARY KEY ("id");


--
-- Name: plan_exercises plan_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."plan_exercises"
    ADD CONSTRAINT "plan_exercises_pkey" PRIMARY KEY ("id");


--
-- Name: plan_generations plan_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."plan_generations"
    ADD CONSTRAINT "plan_generations_pkey" PRIMARY KEY ("id");


--
-- Name: plan_generations plan_generations_user_id_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."plan_generations"
    ADD CONSTRAINT "plan_generations_user_id_request_id_key" UNIQUE ("user_id", "request_id");


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: workout_logs workout_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workout_logs"
    ADD CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id");


--
-- Name: idx_body_measurements_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_body_measurements_user_date" ON "public"."body_measurements" USING "btree" ("user_id", "date" DESC);


--
-- Name: idx_exercise_muscles_exercise_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_exercise_muscles_exercise_id" ON "public"."exercise_muscles_detail" USING "btree" ("exercise_id");


--
-- Name: idx_exercise_muscles_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_exercise_muscles_group" ON "public"."exercise_muscles_detail" USING "btree" ("muscle_group");


--
-- Name: idx_exercise_muscles_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_exercise_muscles_name" ON "public"."exercise_muscles_detail" USING "btree" ("muscle_name");


--
-- Name: idx_exercises_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_exercises_category" ON "public"."exercises" USING "btree" ("category");


--
-- Name: idx_exercises_equipment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_exercises_equipment" ON "public"."exercises" USING "btree" ("equipment");


--
-- Name: idx_exercises_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_exercises_kind" ON "public"."exercises" USING "btree" ("kind");


--
-- Name: idx_exercises_meta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_exercises_meta" ON "public"."exercises" USING "gin" ("meta");


--
-- Name: idx_exercises_muscle_groups_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_exercises_muscle_groups_primary" ON "public"."exercises" USING "gin" ("muscle_groups_primary");


--
-- Name: idx_exercises_muscle_groups_secondary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_exercises_muscle_groups_secondary" ON "public"."exercises" USING "gin" ("muscle_groups_secondary");


--
-- Name: idx_exercises_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_exercises_name" ON "public"."exercises" USING "btree" ("name");


--
-- Name: idx_exercises_primary_muscles; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_exercises_primary_muscles" ON "public"."exercises" USING "btree" ("primary_muscles");


--
-- Name: idx_plan_days_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_plan_days_plan_id" ON "public"."plan_days" USING "btree" ("plan_id");


--
-- Name: idx_plan_exercises_day_letter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_plan_exercises_day_letter" ON "public"."plan_exercises" USING "btree" ("day_letter");


--
-- Name: idx_plan_exercises_exercise_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_plan_exercises_exercise_id" ON "public"."plan_exercises" USING "btree" ("exercise_id");


--
-- Name: idx_plan_exercises_exercise_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_plan_exercises_exercise_name" ON "public"."plan_exercises" USING "btree" ("exercise_name");


--
-- Name: idx_plan_exercises_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_plan_exercises_plan_id" ON "public"."plan_exercises" USING "btree" ("plan_id");


--
-- Name: idx_plans_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_plans_user_id" ON "public"."plans" USING "btree" ("user_id");


--
-- Name: idx_workout_logs_exercise_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_workout_logs_exercise_name" ON "public"."workout_logs" USING "btree" ("exercise_name");


--
-- Name: idx_workout_logs_plan_day_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_workout_logs_plan_day_id" ON "public"."workout_logs" USING "btree" ("plan_day_id");


--
-- Name: idx_workout_logs_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_workout_logs_plan_id" ON "public"."workout_logs" USING "btree" ("plan_id");


--
-- Name: idx_workout_logs_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_workout_logs_session_id" ON "public"."workout_logs" USING "btree" ("session_id");


--
-- Name: idx_workout_logs_session_plan_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_workout_logs_session_plan_date" ON "public"."workout_logs" USING "btree" ("session_id", "plan_day_id", "timestamp");


--
-- Name: idx_workout_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_workout_logs_timestamp" ON "public"."workout_logs" USING "btree" ("timestamp");


--
-- Name: idx_workout_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_workout_logs_user_id" ON "public"."workout_logs" USING "btree" ("user_id");


--
-- Name: plan_generations_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "plan_generations_user_created_idx" ON "public"."plan_generations" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: exercises exercises_movement_flags; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "exercises_movement_flags" BEFORE INSERT OR UPDATE OF "name" ON "public"."exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_exercise_movement_flags"();


--
-- Name: plan_exercises trigger_plan_exercises_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_plan_exercises_updated_at" BEFORE UPDATE ON "public"."plan_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."update_plan_exercises_updated_at"();


--
-- Name: body_measurements body_measurements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."body_measurements"
    ADD CONSTRAINT "body_measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: day_exercises day_exercises_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."day_exercises"
    ADD CONSTRAINT "day_exercises_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "public"."plan_days"("id") ON DELETE CASCADE;


--
-- Name: exercise_category_relations exercise_category_relations_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exercise_category_relations"
    ADD CONSTRAINT "exercise_category_relations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."exercise_categories"("id") ON DELETE CASCADE;


--
-- Name: exercise_favorites exercise_favorites_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exercise_favorites"
    ADD CONSTRAINT "exercise_favorites_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;


--
-- Name: exercise_favorites exercise_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exercise_favorites"
    ADD CONSTRAINT "exercise_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: exercise_muscles_detail fk_exercise_muscles_detail_exercise_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exercise_muscles_detail"
    ADD CONSTRAINT "fk_exercise_muscles_detail_exercise_id" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;


--
-- Name: intake intake_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."intake"
    ADD CONSTRAINT "intake_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: plan_days plan_days_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."plan_days"
    ADD CONSTRAINT "plan_days_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE CASCADE;


--
-- Name: plan_exercises plan_exercises_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."plan_exercises"
    ADD CONSTRAINT "plan_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE SET NULL;


--
-- Name: plan_exercises plan_exercises_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."plan_exercises"
    ADD CONSTRAINT "plan_exercises_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE CASCADE;


--
-- Name: plan_generations plan_generations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."plan_generations"
    ADD CONSTRAINT "plan_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: plans plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: workout_logs workout_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workout_logs"
    ADD CONSTRAINT "workout_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: exercise_categories Public read exercise_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read exercise_categories" ON "public"."exercise_categories" FOR SELECT USING (true);


--
-- Name: exercise_category_relations Public read exercise_category_relations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read exercise_category_relations" ON "public"."exercise_category_relations" FOR SELECT USING (true);


--
-- Name: exercise_muscles_detail Public read exercise_muscles_detail; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read exercise_muscles_detail" ON "public"."exercise_muscles_detail" FOR SELECT USING (true);


--
-- Name: exercises Public read exercises; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read exercises" ON "public"."exercises" FOR SELECT USING (true);


--
-- Name: plans Users can delete own plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own plans" ON "public"."plans" FOR DELETE USING (("auth"."uid"() = "user_id"));


--
-- Name: workout_logs Users can delete their own workout logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own workout logs" ON "public"."workout_logs" FOR DELETE USING (("auth"."uid"() = "user_id"));


--
-- Name: day_exercises Users can insert own day exercises; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own day exercises" ON "public"."day_exercises" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."plan_days" "pd"
     JOIN "public"."plans" "p" ON (("pd"."plan_id" = "p"."id")))
  WHERE (("pd"."id" = "day_exercises"."day_id") AND ("p"."user_id" = "auth"."uid"())))));


--
-- Name: intake Users can insert own intake; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own intake" ON "public"."intake" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: plan_days Users can insert own plan days; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own plan days" ON "public"."plan_days" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."plans"
  WHERE (("plans"."id" = "plan_days"."plan_id") AND ("plans"."user_id" = "auth"."uid"())))));


--
-- Name: plans Users can insert own plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own plans" ON "public"."plans" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: workout_logs Users can insert their own workout logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own workout logs" ON "public"."workout_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: intake Users can update own intake; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own intake" ON "public"."intake" FOR UPDATE USING (("auth"."uid"() = "user_id"));


--
-- Name: plans Users can update own plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own plans" ON "public"."plans" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: workout_logs Users can update their own workout logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own workout logs" ON "public"."workout_logs" FOR UPDATE USING (("auth"."uid"() = "user_id"));


--
-- Name: day_exercises Users can view own day exercises; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own day exercises" ON "public"."day_exercises" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."plan_days" "pd"
     JOIN "public"."plans" "p" ON (("pd"."plan_id" = "p"."id")))
  WHERE (("pd"."id" = "day_exercises"."day_id") AND ("p"."user_id" = "auth"."uid"())))));


--
-- Name: intake Users can view own intake; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own intake" ON "public"."intake" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: plan_days Users can view own plan days; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own plan days" ON "public"."plan_days" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."plans"
  WHERE (("plans"."id" = "plan_days"."plan_id") AND ("plans"."user_id" = "auth"."uid"())))));


--
-- Name: plan_generations Users can view own plan generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own plan generations" ON "public"."plan_generations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: plans Users can view own plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own plans" ON "public"."plans" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));


--
-- Name: workout_logs Users can view their own workout logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own workout logs" ON "public"."workout_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: plan_exercises Users manage own plan_exercises; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own plan_exercises" ON "public"."plan_exercises" USING ((EXISTS ( SELECT 1
   FROM "public"."plans" "p"
  WHERE (("p"."id" = "plan_exercises"."plan_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."plans" "p"
  WHERE (("p"."id" = "plan_exercises"."plan_id") AND ("p"."user_id" = "auth"."uid"())))));


--
-- Name: body_measurements bm_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "bm_delete_own" ON "public"."body_measurements" FOR DELETE USING (("auth"."uid"() = "user_id"));


--
-- Name: body_measurements bm_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "bm_insert_own" ON "public"."body_measurements" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: body_measurements bm_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "bm_select_own" ON "public"."body_measurements" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: body_measurements bm_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "bm_update_own" ON "public"."body_measurements" FOR UPDATE USING (("auth"."uid"() = "user_id"));


--
-- Name: body_measurements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."body_measurements" ENABLE ROW LEVEL SECURITY;

--
-- Name: day_exercises; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."day_exercises" ENABLE ROW LEVEL SECURITY;

--
-- Name: exercise_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."exercise_categories" ENABLE ROW LEVEL SECURITY;

--
-- Name: exercise_category_relations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."exercise_category_relations" ENABLE ROW LEVEL SECURITY;

--
-- Name: exercise_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."exercise_favorites" ENABLE ROW LEVEL SECURITY;

--
-- Name: exercise_muscles_detail; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."exercise_muscles_detail" ENABLE ROW LEVEL SECURITY;

--
-- Name: exercises; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;

--
-- Name: exercise_favorites favorites_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "favorites_delete_own" ON "public"."exercise_favorites" FOR DELETE USING (("auth"."uid"() = "user_id"));


--
-- Name: exercise_favorites favorites_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "favorites_insert_own" ON "public"."exercise_favorites" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: exercise_favorites favorites_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "favorites_select_own" ON "public"."exercise_favorites" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: intake; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."intake" ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_days; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."plan_days" ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_exercises; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."plan_exercises" ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_generations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."plan_generations" ENABLE ROW LEVEL SECURITY;

--
-- Name: plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: workout_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."workout_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: FUNCTION "admin_user_activity"(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION "public"."admin_user_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_user_activity"() TO "service_role";


--
-- Name: FUNCTION "exercise_movement_flags"("p_name" "text"); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."exercise_movement_flags"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."exercise_movement_flags"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exercise_movement_flags"("p_name" "text") TO "service_role";


--
-- Name: FUNCTION "get_available_filters"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."get_available_filters"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_filters"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_filters"() TO "service_role";


--
-- Name: FUNCTION "get_exercises_by_category"("p_category" "text", "p_limit" integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."get_exercises_by_category"("p_category" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_exercises_by_category"("p_category" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exercises_by_category"("p_category" "text", "p_limit" integer) TO "service_role";


--
-- Name: FUNCTION "get_exercises_simple"("p_page" integer, "p_limit" integer, "p_category" "text", "p_kind" "text", "p_equipment" "text", "p_search" "text"); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."get_exercises_simple"("p_page" integer, "p_limit" integer, "p_category" "text", "p_kind" "text", "p_equipment" "text", "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exercises_simple"("p_page" integer, "p_limit" integer, "p_category" "text", "p_kind" "text", "p_equipment" "text", "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exercises_simple"("p_page" integer, "p_limit" integer, "p_category" "text", "p_kind" "text", "p_equipment" "text", "p_search" "text") TO "service_role";


--
-- Name: FUNCTION "get_exercises_stats"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."get_exercises_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_exercises_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exercises_stats"() TO "service_role";


--
-- Name: FUNCTION "get_exercises_with_categories"("p_page" integer, "p_limit" integer, "p_category" "text", "p_kind" "text", "p_equipment" "text", "p_search" "text"); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."get_exercises_with_categories"("p_page" integer, "p_limit" integer, "p_category" "text", "p_kind" "text", "p_equipment" "text", "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exercises_with_categories"("p_page" integer, "p_limit" integer, "p_category" "text", "p_kind" "text", "p_equipment" "text", "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exercises_with_categories"("p_page" integer, "p_limit" integer, "p_category" "text", "p_kind" "text", "p_equipment" "text", "p_search" "text") TO "service_role";


--
-- Name: FUNCTION "get_filtered_exercises"("p_equipment" "text"[], "p_objective" "text", "p_age" integer, "p_gender" "text", "p_limit" integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."get_filtered_exercises"("p_equipment" "text"[], "p_objective" "text", "p_age" integer, "p_gender" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_filtered_exercises"("p_equipment" "text"[], "p_objective" "text", "p_age" integer, "p_gender" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_filtered_exercises"("p_equipment" "text"[], "p_objective" "text", "p_age" integer, "p_gender" "text", "p_limit" integer) TO "service_role";


--
-- Name: FUNCTION "get_plan_exercises_with_details"("p_plan_id" "text"); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."get_plan_exercises_with_details"("p_plan_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_plan_exercises_with_details"("p_plan_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_plan_exercises_with_details"("p_plan_id" "text") TO "service_role";


--
-- Name: FUNCTION "handle_new_user"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


--
-- Name: FUNCTION "insert_plan_exercises"("p_plan_id" "text", "p_exercises" "jsonb"); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."insert_plan_exercises"("p_plan_id" "text", "p_exercises" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_plan_exercises"("p_plan_id" "text", "p_exercises" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_plan_exercises"("p_plan_id" "text", "p_exercises" "jsonb") TO "service_role";


--
-- Name: FUNCTION "ping"(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION "public"."ping"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ping"() TO "anon";
GRANT ALL ON FUNCTION "public"."ping"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ping"() TO "service_role";


--
-- Name: FUNCTION "plan_clamp_int"("p_value" "jsonb", "p_min" integer, "p_max" integer, "p_default" integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."plan_clamp_int"("p_value" "jsonb", "p_min" integer, "p_max" integer, "p_default" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."plan_clamp_int"("p_value" "jsonb", "p_min" integer, "p_max" integer, "p_default" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."plan_clamp_int"("p_value" "jsonb", "p_min" integer, "p_max" integer, "p_default" integer) TO "service_role";


--
-- Name: FUNCTION "save_plan_structure"("p_plan_id" "text", "p_weeks" integer, "p_payload" "jsonb"); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION "public"."save_plan_structure"("p_plan_id" "text", "p_weeks" integer, "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_plan_structure"("p_plan_id" "text", "p_weeks" integer, "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_plan_structure"("p_plan_id" "text", "p_weeks" integer, "p_payload" "jsonb") TO "service_role";


--
-- Name: FUNCTION "search_exercises_advanced"("p_search" "text", "p_category" "text", "p_kind" "text", "p_equipment" "text", "p_muscle_group" "text", "p_limit" integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."search_exercises_advanced"("p_search" "text", "p_category" "text", "p_kind" "text", "p_equipment" "text", "p_muscle_group" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_exercises_advanced"("p_search" "text", "p_category" "text", "p_kind" "text", "p_equipment" "text", "p_muscle_group" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_exercises_advanced"("p_search" "text", "p_category" "text", "p_kind" "text", "p_equipment" "text", "p_muscle_group" "text", "p_limit" integer) TO "service_role";


--
-- Name: FUNCTION "set_exercise_movement_flags"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."set_exercise_movement_flags"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_exercise_movement_flags"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_exercise_movement_flags"() TO "service_role";


--
-- Name: FUNCTION "update_plan_exercises_updated_at"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."update_plan_exercises_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_plan_exercises_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_plan_exercises_updated_at"() TO "service_role";


--
-- Name: TABLE "body_measurements"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."body_measurements" TO "anon";
GRANT ALL ON TABLE "public"."body_measurements" TO "authenticated";
GRANT ALL ON TABLE "public"."body_measurements" TO "service_role";


--
-- Name: TABLE "day_exercises"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."day_exercises" TO "anon";
GRANT ALL ON TABLE "public"."day_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."day_exercises" TO "service_role";


--
-- Name: TABLE "exercise_categories"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."exercise_categories" TO "anon";
GRANT ALL ON TABLE "public"."exercise_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_categories" TO "service_role";


--
-- Name: TABLE "exercise_category_relations"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."exercise_category_relations" TO "anon";
GRANT ALL ON TABLE "public"."exercise_category_relations" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_category_relations" TO "service_role";


--
-- Name: TABLE "exercise_favorites"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."exercise_favorites" TO "anon";
GRANT ALL ON TABLE "public"."exercise_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_favorites" TO "service_role";


--
-- Name: TABLE "exercise_muscles_detail"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."exercise_muscles_detail" TO "anon";
GRANT ALL ON TABLE "public"."exercise_muscles_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_muscles_detail" TO "service_role";


--
-- Name: TABLE "exercises"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."exercises" TO "anon";
GRANT ALL ON TABLE "public"."exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises" TO "service_role";


--
-- Name: TABLE "intake"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."intake" TO "anon";
GRANT ALL ON TABLE "public"."intake" TO "authenticated";
GRANT ALL ON TABLE "public"."intake" TO "service_role";


--
-- Name: TABLE "plan_days"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."plan_days" TO "anon";
GRANT ALL ON TABLE "public"."plan_days" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_days" TO "service_role";


--
-- Name: TABLE "plan_exercises"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."plan_exercises" TO "anon";
GRANT ALL ON TABLE "public"."plan_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_exercises" TO "service_role";


--
-- Name: TABLE "plan_generations"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."plan_generations" TO "service_role";


--
-- Name: COLUMN "plan_generations"."id"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT("id") ON TABLE "public"."plan_generations" TO "authenticated";


--
-- Name: COLUMN "plan_generations"."request_id"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT("request_id") ON TABLE "public"."plan_generations" TO "authenticated";


--
-- Name: COLUMN "plan_generations"."status"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT("status") ON TABLE "public"."plan_generations" TO "authenticated";


--
-- Name: COLUMN "plan_generations"."created_at"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT("created_at") ON TABLE "public"."plan_generations" TO "authenticated";


--
-- Name: COLUMN "plan_generations"."finished_at"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT("finished_at") ON TABLE "public"."plan_generations" TO "authenticated";


--
-- Name: TABLE "plans"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";


--
-- Name: TABLE "profiles"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";


--
-- Name: TABLE "workout_logs"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."workout_logs" TO "anon";
GRANT ALL ON TABLE "public"."workout_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_logs" TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- PostgreSQL database dump complete
--

