-- Crear tabla de relación entre planes y ejercicios
-- Esta tabla permite mapear ejercicios específicos a cada plan generado
-- NOTA: plan_id es TEXT porque la tabla plans usa IDs de texto (no UUIDs)

CREATE TABLE IF NOT EXISTS plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  day_letter TEXT NOT NULL, -- A, B, C, D
  block_index INTEGER NOT NULL, -- Posición en el bloque del día
  sets INTEGER NOT NULL,
  reps_min INTEGER NOT NULL,
  reps_max INTEGER NOT NULL,
  rest_sec INTEGER NOT NULL,
  cues TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan_id ON plan_exercises(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_exercise_name ON plan_exercises(exercise_name);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_exercise_id ON plan_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_day_letter ON plan_exercises(day_letter);

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_plan_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_plan_exercises_updated_at
  BEFORE UPDATE ON plan_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_exercises_updated_at();

-- Función para obtener ejercicios de un plan con detalles completos
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

-- Función para insertar ejercicios de un plan
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

-- Comentarios
COMMENT ON TABLE plan_exercises IS 'Tabla de relación entre planes y ejercicios específicos';
COMMENT ON FUNCTION get_plan_exercises_with_details(TEXT) IS 'Obtiene ejercicios de un plan con todos sus detalles';
COMMENT ON FUNCTION insert_plan_exercises(TEXT, JSONB) IS 'Inserta ejercicios de un plan y los relaciona con la tabla exercises';

-- Verificar la creación
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'plan_exercises'
ORDER BY ordinal_position;
