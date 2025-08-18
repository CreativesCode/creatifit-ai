-- Script COMPLETO Y SIMPLIFICADO para crear la tabla exercises
-- ✅ Todo-en-uno: Limpia y crea las tablas en un solo script

-- 1. LIMPIEZA FORZADA (eliminar todo lo existente)
DO $$
BEGIN
    RAISE NOTICE '🧹 Iniciando limpieza completa...';
    
    -- Eliminar tablas con CASCADE (fuerza eliminación de dependencias)
    DROP TABLE IF EXISTS exercise_muscles_detail CASCADE;
    DROP TABLE IF EXISTS exercises CASCADE;
    
    -- Eliminar funciones existentes
    DROP FUNCTION IF EXISTS insert_exercise_muscles(UUID, JSONB) CASCADE;
    DROP FUNCTION IF EXISTS get_exercise_muscles_detail(UUID) CASCADE;
    DROP FUNCTION IF EXISTS search_exercises(TEXT) CASCADE;
    DROP FUNCTION IF EXISTS get_exercises_by_equipment(TEXT[]) CASCADE;
    DROP FUNCTION IF EXISTS get_exercises_by_muscles(TEXT[]) CASCADE;
    DROP FUNCTION IF EXISTS update_exercises_updated_at() CASCADE;
    
    -- Eliminar triggers
    DROP TRIGGER IF EXISTS trigger_exercises_updated_at ON exercises;
    
    -- Eliminar vistas
    DROP VIEW IF EXISTS exercises_complete CASCADE;
    
    RAISE NOTICE '✅ Limpieza completada';
END $$;

-- 2. CREAR TABLA PRINCIPAL DE EJERCICIOS
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
    instructions TEXT[] DEFAULT ARRAY[]::TEXT[],
    tips TEXT[] DEFAULT ARRAY[]::TEXT[],
    benefits TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Campos de metadatos (🟠 metadata_fields)
    muscle_groups_primary TEXT[] DEFAULT ARRAY[]::TEXT[],
    muscle_groups_secondary TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Campo meta para compatibilidad
    meta JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREAR TABLA DE MÚSCULOS DETALLADOS
CREATE TABLE exercise_muscles_detail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id UUID NOT NULL,
    muscle_name TEXT NOT NULL,
    muscle_group TEXT NOT NULL CHECK (muscle_group IN ('primary', 'secondary')),
    muscle_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. AGREGAR FOREIGN KEY
ALTER TABLE exercise_muscles_detail 
ADD CONSTRAINT fk_exercise_muscles_detail_exercise_id 
FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;

-- 5. CREAR ÍNDICES BÁSICOS
CREATE INDEX idx_exercises_name ON exercises(name);
CREATE INDEX idx_exercises_kind ON exercises(kind);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_equipment ON exercises(equipment);
CREATE INDEX idx_exercises_primary_muscles ON exercises(primary_muscles);

-- 6. CREAR ÍNDICES GIN
CREATE INDEX idx_exercises_meta ON exercises USING GIN(meta);
CREATE INDEX idx_exercises_muscle_groups_primary ON exercises USING GIN(muscle_groups_primary);
CREATE INDEX idx_exercises_muscle_groups_secondary ON exercises USING GIN(muscle_groups_secondary);

-- 7. ÍNDICES PARA TABLA DE MÚSCULOS
CREATE INDEX idx_exercise_muscles_exercise_id ON exercise_muscles_detail(exercise_id);
CREATE INDEX idx_exercise_muscles_group ON exercise_muscles_detail(muscle_group);
CREATE INDEX idx_exercise_muscles_name ON exercise_muscles_detail(muscle_name);

-- 8. AGREGAR COMENTARIOS
COMMENT ON TABLE exercises IS 'Tabla principal de ejercicios con estructura completa';
COMMENT ON TABLE exercise_muscles_detail IS 'Tabla para músculos detallados de cada ejercicio';

-- 9. VERIFICACIÓN FINAL
DO $$
DECLARE
    exercises_count INTEGER;
    columns_count INTEGER;
    indexes_count INTEGER;
    fk_count INTEGER;
BEGIN
    -- Verificar tablas creadas
    SELECT COUNT(*) INTO exercises_count
    FROM information_schema.tables 
    WHERE table_name IN ('exercises', 'exercise_muscles_detail')
    AND table_schema = 'public';
    
    -- Verificar columnas
    SELECT COUNT(*) INTO columns_count
    FROM information_schema.columns 
    WHERE table_name = 'exercises'
    AND table_schema = 'public';
    
    -- Verificar índices
    SELECT COUNT(*) INTO indexes_count
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND tablename IN ('exercises', 'exercise_muscles_detail');
    
    -- Verificar foreign keys
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_name = 'exercise_muscles_detail'
    AND table_schema = 'public';
    
    -- Verificar que todo está correcto
    IF exercises_count != 2 THEN
        RAISE EXCEPTION '❌ ERROR: Se esperaban 2 tablas, se encontraron %', exercises_count;
    END IF;
    
    IF columns_count = 0 THEN
        RAISE EXCEPTION '❌ ERROR: No se encontraron columnas en la tabla exercises';
    END IF;
    
    IF fk_count = 0 THEN
        RAISE EXCEPTION '❌ ERROR: No se encontró el foreign key';
    END IF;
    
    -- Mensaje de éxito
    RAISE NOTICE '🎉 ¡CREACIÓN EXITOSA!';
    RAISE NOTICE '📊 Tablas creadas: %', exercises_count;
    RAISE NOTICE '📋 Columnas en exercises: %', columns_count;
    RAISE NOTICE '🔍 Índices creados: %', indexes_count;
    RAISE NOTICE '🔗 Foreign keys: %', fk_count;
    RAISE NOTICE '✅ ¡Todo listo! Puedes insertar ejercicios ahora.';
END $$;

-- 10. MOSTRAR ESTRUCTURA FINAL
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('exercises', 'exercise_muscles_detail')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
