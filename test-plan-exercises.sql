-- Script de prueba para verificar las funciones de plan_exercises
-- Ejecutar este script en Supabase SQL Editor

-- 1. Verificar que la tabla plan_exercises existe
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'plan_exercises'
ORDER BY ordinal_position;

-- 2. Verificar que las funciones existen
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN ('get_plan_exercises_with_details', 'insert_plan_exercises')
ORDER BY routine_name;

-- 3. Verificar que hay planes en la tabla plans
SELECT 
  id,
  weeks,
  created_at
FROM plans 
LIMIT 5;

-- 4. Verificar que hay ejercicios en la tabla exercises
SELECT 
  id,
  name,
  equipment,
  category
FROM exercises 
LIMIT 5;

-- 5. Probar la función insert_plan_exercises con datos de prueba
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

-- 6. Verificar que se insertaron los ejercicios
SELECT * FROM plan_exercises WHERE plan_id = 'test_plan_id';

-- 7. Probar la función get_plan_exercises_with_details
SELECT * FROM get_plan_exercises_with_details('test_plan_id');

-- 8. Limpiar datos de prueba
DELETE FROM plan_exercises WHERE plan_id = 'test_plan_id';
