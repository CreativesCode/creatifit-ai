-- Alterar tabla workout_logs existente para agregar columnas faltantes
-- Este script modifica la tabla existente en lugar de crear una nueva

-- 1. Agregar columna plan_day_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workout_logs' AND column_name = 'plan_day_id') THEN
        ALTER TABLE workout_logs ADD COLUMN plan_day_id TEXT;
    END IF;
END $$;

-- 2. Agregar columna target_reps si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workout_logs' AND column_name = 'target_reps') THEN
        ALTER TABLE workout_logs ADD COLUMN target_reps INTEGER[];
    END IF;
END $$;

-- 3. Agregar columna set_index si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workout_logs' AND column_name = 'set_index') THEN
        ALTER TABLE workout_logs ADD COLUMN set_index INTEGER;
    END IF;
END $$;

-- 4. Agregar columna weight si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workout_logs' AND column_name = 'weight') THEN
        ALTER TABLE workout_logs ADD COLUMN weight DECIMAL(5,2);
    END IF;
END $$;

-- 5. Agregar columna rpe si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workout_logs' AND column_name = 'rpe') THEN
        ALTER TABLE workout_logs ADD COLUMN rpe INTEGER;
    END IF;
END $$;

-- 6. Agregar columna notes si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workout_logs' AND column_name = 'notes') THEN
        ALTER TABLE workout_logs ADD COLUMN notes TEXT;
    END IF;
END $$;

-- 7. Agregar columna timestamp si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workout_logs' AND column_name = 'timestamp') THEN
        ALTER TABLE workout_logs ADD COLUMN timestamp TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 8. Agregar columna created_at si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workout_logs' AND column_name = 'created_at') THEN
        ALTER TABLE workout_logs ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 9. Agregar constraint para RPE si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'workout_logs_rpe_check') THEN
        ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_rpe_check CHECK (rpe >= 1 AND rpe <= 10);
    END IF;
END $$;

-- 10. Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_plan_day_id ON workout_logs(plan_day_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_timestamp ON workout_logs(timestamp);

-- 11. Verificar la estructura final de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'workout_logs' 
ORDER BY ordinal_position;
