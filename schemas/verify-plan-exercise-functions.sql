-- Script de verificación y limpieza para las funciones de plan_exercises
-- Ejecutar este script si hay problemas con las funciones

-- 1. Verificar si las funciones existen
SELECT 
  routine_name,
  routine_type,
  data_type,
  parameter_name,
  parameter_mode,
  parameter_default
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE routine_name IN ('get_plan_exercises_with_details', 'insert_plan_exercises')
ORDER BY routine_name, ordinal_position;

-- 2. Si las funciones no existen o tienen parámetros incorrectos, eliminarlas
DROP FUNCTION IF EXISTS get_plan_exercises_with_details(UUID);
DROP FUNCTION IF EXISTS get_plan_exercises_with_details(TEXT);
DROP FUNCTION IF EXISTS insert_plan_exercises(UUID, JSONB);
DROP FUNCTION IF EXISTS insert_plan_exercises(TEXT, JSONB);

-- 3. Recrear la función get_plan_exercises_with_details
CREATE OR REPLACE FUNCTION get_plan_exercises_with_details(p_plan_id TEXT)
RETURNS TABLE(
  day_letter TEXT,
  block_index INTEGER,
  exercise_name TEXT,
  exercise_id UUID,
  gif_url TEXT,
  equipment TEXT,
  category TEXT,
  primary_muscles TEXT,
  sets INTEGER,
  reps_min INTEGER,
  reps_max INTEGER,
  rest_sec INTEGER,
  cues TEXT[]
) AS $$
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
$$ LANGUAGE plpgsql;

-- 4. Recrear la función insert_plan_exercises
CREATE OR REPLACE FUNCTION insert_plan_exercises(
  p_plan_id TEXT,
  p_exercises JSONB
)
RETURNS INTEGER AS $$
DECLARE
  exercise_record RECORD;
  exercise_count INTEGER := 0;
  exercise_id UUID;
BEGIN
  -- Limpiar ejercicios existentes del plan
  DELETE FROM plan_exercises WHERE plan_id = p_plan_id;
  
  -- Insertar nuevos ejercicios
  FOR exercise_record IN 
    SELECT * FROM jsonb_array_elements(p_exercises)
  LOOP
    -- Buscar el ID del ejercicio por nombre
    SELECT id INTO exercise_id 
    FROM exercises 
    WHERE name ILIKE exercise_record->>'name';
    
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
      exercise_id,
      exercise_record->>'day',
      (exercise_record->>'block_index')::INTEGER,
      (exercise_record->>'sets')::INTEGER,
      (exercise_record->>'reps')[1]::INTEGER,
      (exercise_record->>'reps')[2]::INTEGER,
      (exercise_record->>'rest_sec')::INTEGER,
      ARRAY(SELECT jsonb_array_elements_text(exercise_record->'cues'))
    );
    
    exercise_count := exercise_count + 1;
  END LOOP;
  
  RETURN exercise_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Verificar que las funciones se crearon correctamente
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN ('get_plan_exercises_with_details', 'insert_plan_exercises')
ORDER BY routine_name;

-- 6. Verificar los parámetros de las funciones
SELECT 
  r.routine_name,
  p.parameter_name,
  p.data_type,
  p.parameter_mode,
  p.ordinal_position
FROM information_schema.routines r
JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_name IN ('get_plan_exercises_with_details', 'insert_plan_exercises')
ORDER BY r.routine_name, p.ordinal_position;

-- 7. Probar la función get_plan_exercises_with_details (debería funcionar sin errores)
-- SELECT * FROM get_plan_exercises_with_details('test_plan_id') LIMIT 0;
