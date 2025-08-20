-- Script de prueba para verificar las funciones de plan_exercises
-- Ejecutar este script para verificar que todo funciona correctamente

-- 1. Verificar que la tabla existe
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

-- 3. Verificar los parámetros de las funciones
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

-- 4. Verificar que hay planes en la tabla plans
SELECT 
  id,
  weeks,
  created_at
FROM plans 
LIMIT 5;

-- 5. Verificar que hay ejercicios en la tabla exercises
SELECT 
  id,
  name,
  equipment,
  category
FROM exercises 
LIMIT 5;

-- 6. Probar la función get_plan_exercises_with_details con un plan existente
-- (Descomenta la siguiente línea si tienes planes en la base de datos)
-- SELECT * FROM get_plan_exercises_with_details('plan_id_aqui') LIMIT 0;

-- 7. Probar la función insert_plan_exercises con datos de prueba
-- (Descomenta las siguientes líneas para probar)
/*
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
    }
  ]'::jsonb
);
*/
