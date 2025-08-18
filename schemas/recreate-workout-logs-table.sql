-- Recrear tabla workout_logs con el esquema correcto
-- Primero eliminamos la tabla existente que tiene el esquema incorrecto

-- 1. Eliminar la tabla existente
DROP TABLE IF EXISTS workout_logs CASCADE;

-- 2. Crear la tabla nueva con el esquema correcto
CREATE TABLE workout_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  target_reps INTEGER[] NOT NULL, -- [min, max] repeticiones objetivo
  actual_reps INTEGER NOT NULL,   -- repeticiones realmente completadas
  weight DECIMAL(5,2),           -- peso en kg (opcional)
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10), -- Rate of Perceived Exertion 1-10 (opcional)
  notes TEXT,                     -- notas adicionales (opcional)
  plan_day_id TEXT NOT NULL,      -- referencia al día del plan
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear índices para mejorar el rendimiento
CREATE INDEX idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX idx_workout_logs_plan_day_id ON workout_logs(plan_day_id);
CREATE INDEX idx_workout_logs_timestamp ON workout_logs(timestamp);
CREATE INDEX idx_workout_logs_exercise_name ON workout_logs(exercise_name);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- 5. Políticas para que los usuarios solo vean sus propios logs
CREATE POLICY "Users can view their own workout logs" ON workout_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout logs" ON workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout logs" ON workout_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout logs" ON workout_logs
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Comentarios de la tabla
COMMENT ON TABLE workout_logs IS 'Registros de sesiones de entrenamiento individuales';
COMMENT ON COLUMN workout_logs.exercise_name IS 'Nombre del ejercicio realizado';
COMMENT ON COLUMN workout_logs.set_index IS 'Número de serie (1, 2, 3, etc.)';
COMMENT ON COLUMN workout_logs.target_reps IS 'Rango de repeticiones objetivo [min, max]';
COMMENT ON COLUMN workout_logs.actual_reps IS 'Repeticiones realmente completadas';
COMMENT ON COLUMN workout_logs.weight IS 'Peso utilizado en kg (opcional)';
COMMENT ON COLUMN workout_logs.rpe IS 'Rate of Perceived Exertion 1-10 (opcional)';
COMMENT ON COLUMN workout_logs.notes IS 'Notas adicionales sobre la serie';
COMMENT ON COLUMN workout_logs.plan_day_id IS 'Referencia al día del plan de entrenamiento';
COMMENT ON COLUMN workout_logs.timestamp IS 'Cuándo se realizó la serie';

-- 7. Verificar la estructura final de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'workout_logs' 
ORDER BY ordinal_position;
