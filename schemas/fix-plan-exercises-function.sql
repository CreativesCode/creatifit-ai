-- Corregir la función insert_plan_exercises
-- El problema estaba en el manejo de tipos en el bucle FOR

-- Primero, eliminar la función existente
DROP FUNCTION IF EXISTS insert_plan_exercises(TEXT, JSONB);

-- Crear la función corregida
CREATE OR REPLACE FUNCTION insert_plan_exercises(
  p_plan_id TEXT,
  p_exercises JSONB
)
RETURNS INTEGER AS $$
DECLARE
  exercise_record JSONB;
  exercise_count INTEGER := 0;
  exercise_id UUID;
BEGIN
  -- Limpiar ejercicios existentes del plan
  DELETE FROM plan_exercises WHERE plan_id = p_plan_id;
  
  -- Insertar nuevos ejercicios
  FOR exercise_record IN 
    SELECT value FROM jsonb_array_elements(p_exercises)
  LOOP
    -- Buscar el ID del ejercicio por nombre
    SELECT id INTO exercise_id 
    FROM exercises 
    WHERE name ILIKE exercise_record->>'name';
    
    -- Insertar en plan_exercises
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
      (exercise_record->'reps')[0]::INTEGER,  -- Usar -> en lugar de ->> para permitir subíndices
      (exercise_record->'reps')[1]::INTEGER,  -- Usar -> en lugar de ->> para permitir subíndices
      (exercise_record->>'rest_sec')::INTEGER,
      CASE 
        WHEN exercise_record->'cues' IS NOT NULL 
        THEN ARRAY(SELECT jsonb_array_elements_text(exercise_record->'cues'))
        ELSE ARRAY[]::TEXT[]
      END
    );
    
    exercise_count := exercise_count + 1;
  END LOOP;
  
  RETURN exercise_count;
END;
$$ LANGUAGE plpgsql;

-- Verificar que la función se creó correctamente
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'insert_plan_exercises';

-- Crear un plan de prueba primero
INSERT INTO plans (id, user_id, weeks, version, source_hash, payload) VALUES (
  'test_plan_id',
  NULL,
  4,
  1,
  'test_hash_' || extract(epoch from now())::text,
  '{"weeks": 4, "days": []}'::jsonb
);

-- Probar la función con datos de prueba
SELECT insert_plan_exercises(
  'test_plan_id',
  '[
    {
      "name": "Push-ups",
      "day": "A",
      "block_index": 0,
      "sets": 3,
      "reps": [8, 12],
      "rest_sec": 60,
      "cues": ["Keep core tight", "Full range of motion"]
    },
    {
      "name": "Squats",
      "day": "A",
      "block_index": 1,
      "sets": 3,
      "reps": [10, 15],
      "rest_sec": 90,
      "cues": ["Keep chest up", "Knees over toes"]
    }
  ]'::jsonb
);

-- Verificar que se insertaron los ejercicios
SELECT * FROM plan_exercises WHERE plan_id = 'test_plan_id';

-- Limpiar datos de prueba
DELETE FROM plan_exercises WHERE plan_id = 'test_plan_id';
DELETE FROM plans WHERE id = 'test_plan_id';
