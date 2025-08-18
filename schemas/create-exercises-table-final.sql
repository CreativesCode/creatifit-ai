-- Script FINAL para crear la tabla exercises desde cero
-- ⚠️ IMPORTANTE: Ejecutar cleanup-and-recreate.sql PRIMERO

-- Verificar que las tablas no existen (con verificación de esquema)
DO $$
DECLARE
    exercises_exists BOOLEAN := FALSE;
    muscles_exists BOOLEAN := FALSE;
BEGIN
    -- Verificar en el esquema public específicamente
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'exercises' 
        AND table_schema = 'public'
    ) INTO exercises_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'exercise_muscles_detail' 
        AND table_schema = 'public'
    ) INTO muscles_exists;
    
    -- Si existen, intentar eliminarlas primero
    IF exercises_exists OR muscles_exists THEN
        RAISE NOTICE '⚠️ Tablas existentes detectadas. Eliminando automáticamente...';
        
        -- Eliminar tablas existentes
        DROP TABLE IF EXISTS exercise_muscles_detail CASCADE;
        DROP TABLE IF EXISTS exercises CASCADE;
        
        RAISE NOTICE '🧹 Tablas eliminadas. Procediendo a crear nuevas tablas...';
    ELSE
        RAISE NOTICE '✅ No se detectaron tablas existentes. Procediendo a crear las tablas...';
    END IF;
END $$;

-- 1. Crear la tabla principal de ejercicios
CREATE TABLE exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Campos básicos (siempre requeridos)
    name TEXT NOT NULL,
    kind TEXT NOT NULL, -- strength, cardio, flexibility, etc.
    
    -- Campos obligatorios (🟢 mandatory_fields)
    gif_url TEXT,
    equipment TEXT NOT NULL DEFAULT '',
    primary_muscles TEXT NOT NULL DEFAULT '',
    detail_url TEXT,
    category TEXT NOT NULL DEFAULT '',
    page_url TEXT,
    page_number INTEGER,
    
    -- Campos detallados (🟡 detailed_fields)
    page_title TEXT,
    overview TEXT,
    instructions TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array de strings
    tips TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array de strings
    benefits TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array de strings
    
    -- Campos de metadatos (🟠 metadata_fields)
    muscle_groups_primary TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array de strings
    muscle_groups_secondary TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array de strings
    
    -- Campo meta para compatibilidad y datos adicionales
    meta JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Verificar que la tabla exercises se creó correctamente
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercises') THEN
        RAISE EXCEPTION '❌ ERROR: No se pudo crear la tabla exercises';
    END IF;
    
    -- Verificar que el campo id es UUID
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exercises' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        RAISE EXCEPTION '❌ ERROR: El campo id de exercises no es de tipo UUID';
    END IF;
    
    RAISE NOTICE '✅ Tabla exercises creada correctamente con id UUID';
END $$;

-- 3. Crear tabla para músculos detallados
CREATE TABLE exercise_muscles_detail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id UUID NOT NULL,
    muscle_name TEXT NOT NULL,
    muscle_group TEXT NOT NULL CHECK (muscle_group IN ('primary', 'secondary')),
    muscle_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Verificar que la tabla exercise_muscles_detail se creó correctamente
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercise_muscles_detail') THEN
        RAISE EXCEPTION '❌ ERROR: No se pudo crear la tabla exercise_muscles_detail';
    END IF;
    
    -- Verificar que el campo exercise_id es UUID
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exercise_muscles_detail' 
        AND column_name = 'exercise_id' 
        AND data_type = 'uuid'
    ) THEN
        RAISE EXCEPTION '❌ ERROR: El campo exercise_id de exercise_muscles_detail no es de tipo UUID';
    END IF;
    
    RAISE NOTICE '✅ Tabla exercise_muscles_detail creada correctamente con exercise_id UUID';
END $$;

-- 5. Agregar Foreign Key DESPUÉS de verificar ambas tablas
ALTER TABLE exercise_muscles_detail 
ADD CONSTRAINT fk_exercise_muscles_detail_exercise_id 
FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;

-- 6. Verificar que el Foreign Key se creó correctamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_exercise_muscles_detail_exercise_id'
        AND table_name = 'exercise_muscles_detail'
    ) THEN
        RAISE EXCEPTION '❌ ERROR: No se pudo crear el Foreign Key';
    END IF;
    
    RAISE NOTICE '✅ Foreign Key creado correctamente';
END $$;

-- 7. Crear índices básicos
CREATE INDEX idx_exercises_name ON exercises(name);
CREATE INDEX idx_exercises_kind ON exercises(kind);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_equipment ON exercises(equipment);
CREATE INDEX idx_exercises_primary_muscles ON exercises(primary_muscles);

-- 8. Crear índices GIN para JSONB y arrays
CREATE INDEX idx_exercises_meta ON exercises USING GIN(meta);
CREATE INDEX idx_exercises_muscle_groups_primary ON exercises USING GIN(muscle_groups_primary);
CREATE INDEX idx_exercises_muscle_groups_secondary ON exercises USING GIN(muscle_groups_secondary);

-- 9. Índices para la tabla de músculos
CREATE INDEX idx_exercise_muscles_exercise_id ON exercise_muscles_detail(exercise_id);
CREATE INDEX idx_exercise_muscles_group ON exercise_muscles_detail(muscle_group);
CREATE INDEX idx_exercise_muscles_name ON exercise_muscles_detail(muscle_name);

-- 10. Agregar comentarios
COMMENT ON TABLE exercises IS 'Tabla principal de ejercicios con estructura completa';
COMMENT ON TABLE exercise_muscles_detail IS 'Tabla para músculos detallados de cada ejercicio';
COMMENT ON COLUMN exercises.id IS 'Identificador único UUID del ejercicio';
COMMENT ON COLUMN exercise_muscles_detail.exercise_id IS 'Referencia UUID al ejercicio en la tabla exercises';

-- 11. Verificación final y mensaje de éxito
DO $$
DECLARE
    exercises_count INTEGER;
    columns_count INTEGER;
    indexes_count INTEGER;
BEGIN
    -- Contar tablas
    SELECT COUNT(*) INTO exercises_count
    FROM information_schema.tables 
    WHERE table_name IN ('exercises', 'exercise_muscles_detail');
    
    -- Contar columnas de exercises
    SELECT COUNT(*) INTO columns_count
    FROM information_schema.columns 
    WHERE table_name = 'exercises';
    
    -- Contar índices
    SELECT COUNT(*) INTO indexes_count
    FROM pg_indexes 
    WHERE tablename IN ('exercises', 'exercise_muscles_detail');
    
    RAISE NOTICE '🎉 ¡CREACIÓN EXITOSA!';
    RAISE NOTICE '📊 Tablas creadas: %', exercises_count;
    RAISE NOTICE '📋 Columnas en exercises: %', columns_count;
    RAISE NOTICE '🔍 Índices creados: %', indexes_count;
    RAISE NOTICE '✅ Puedes proceder a ejecutar example-exercises-insert.sql';
END $$;

-- 12. Mostrar la estructura final
SELECT 
    'exercises' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'exercises'
ORDER BY ordinal_position;

SELECT 
    'exercise_muscles_detail' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'exercise_muscles_detail'
ORDER BY ordinal_position;
