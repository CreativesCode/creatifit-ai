-- Crear tabla workout_logs para registrar las sesiones de entrenamiento
CREATE TABLE IF NOT EXISTS workout_logs (
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

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_plan_day_id ON workout_logs(plan_day_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_timestamp ON workout_logs(timestamp);

-- Habilitar RLS (Row Level Security)
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propios logs
CREATE POLICY "Users can view their own workout logs" ON workout_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Política para que los usuarios solo inserten sus propios logs
CREATE POLICY "Users can insert their own workout logs" ON workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios solo actualicen sus propios logs
CREATE POLICY "Users can update their own workout logs" ON workout_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Política para que los usuarios solo eliminen sus propios logs
CREATE POLICY "Users can delete their own workout logs" ON workout_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Comentarios de la tabla
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
