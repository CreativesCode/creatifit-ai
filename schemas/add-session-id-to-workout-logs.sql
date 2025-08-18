-- Agregar session_id a la tabla workout_logs para mejor agrupación de sesiones
-- Esto permite que múltiples entrenamientos del mismo día se separen correctamente

-- 1. Agregar la columna session_id
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT gen_random_uuid();

-- 2. Crear índice para mejorar el rendimiento de consultas por sesión
CREATE INDEX IF NOT EXISTS idx_workout_logs_session_id ON workout_logs(session_id);

-- 3. Crear índice compuesto para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_workout_logs_session_plan_date ON workout_logs(session_id, plan_day_id, timestamp);

-- 4. Comentario explicativo
COMMENT ON COLUMN workout_logs.session_id IS 'Identificador único de la sesión de entrenamiento. Permite separar múltiples entrenamientos del mismo día.';

-- 5. Verificar la estructura actualizada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'workout_logs' 
ORDER BY ordinal_position;
