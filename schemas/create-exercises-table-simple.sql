-- Script SIMPLIFICADO para crear la tabla exercises desde cero
-- Nueva estructura completa para ejercicios (versión sin problemas de sintaxis)

-- 1. Crear la tabla principal de ejercicios
CREATE TABLE IF NOT EXISTS exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Campos básicos (siempre requeridos)
    name TEXT NOT NULL,
    kind TEXT NOT NULL, -- strength, cardio, flexibility, etc.
    
    -- Campos obligatorios (🟢 mandatory_fields)
    gif_url TEXT,
    equipment TEXT NOT NULL,
    primary_muscles TEXT NOT NULL,
    detail_url TEXT,
    category TEXT NOT NULL, -- Chest, Back, Legs, etc.
    page_url TEXT,
    page_number INTEGER,
    
    -- Campos detallados (🟡 detailed_fields)
    page_title TEXT,
    overview TEXT,
    instructions TEXT[], -- Array de strings
    tips TEXT[], -- Array de strings
    benefits TEXT[], -- Array de strings
    
    -- Campos de metadatos (🟠 metadata_fields)
    muscle_groups_primary TEXT[], -- Array de strings
    muscle_groups_secondary TEXT[], -- Array de strings
    
    -- Campo meta para compatibilidad y datos adicionales
    meta JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla para músculos detallados
CREATE TABLE IF NOT EXISTS exercise_muscles_detail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_name TEXT NOT NULL,
    muscle_group TEXT NOT NULL CHECK (muscle_group IN ('primary', 'secondary')),
    muscle_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índices BÁSICOS (sin sintaxis compleja)
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_kind ON exercises(kind);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscles ON exercises(primary_muscles);

-- 4. Crear índices GIN para arrays
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups_primary ON exercises USING GIN(muscle_groups_primary);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups_secondary ON exercises USING GIN(muscle_groups_secondary);

-- 5. Crear índices GIN para JSONB
CREATE INDEX IF NOT EXISTS idx_exercises_meta ON exercises USING GIN(meta);

-- 6. Índices para la tabla de músculos
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_exercise_id ON exercise_muscles_detail(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_group ON exercise_muscles_detail(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_name ON exercise_muscles_detail(muscle_name);

-- 7. Agregar comentarios básicos
COMMENT ON TABLE exercises IS 'Tabla principal de ejercicios con estructura completa';
COMMENT ON COLUMN exercises.id IS 'Identificador único del ejercicio';
COMMENT ON COLUMN exercises.name IS 'Nombre del ejercicio';
COMMENT ON COLUMN exercises.kind IS 'Tipo de ejercicio: strength, cardio, flexibility, etc.';
COMMENT ON COLUMN exercises.equipment IS 'Equipamiento requerido para el ejercicio';
COMMENT ON COLUMN exercises.primary_muscles IS 'Músculos principales trabajados';
COMMENT ON COLUMN exercises.category IS 'Categoría del ejercicio: Chest, Back, Legs, etc.';
COMMENT ON COLUMN exercises.meta IS 'Campo JSONB para datos adicionales y compatibilidad';

-- 8. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Crear trigger para updated_at
CREATE TRIGGER trigger_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_exercises_updated_at();

-- 10. Crear función para insertar músculos detallados
CREATE OR REPLACE FUNCTION insert_exercise_muscles(
    p_exercise_id UUID,
    p_muscles_detail JSONB
)
RETURNS VOID AS $$
DECLARE
    muscle_record RECORD;
BEGIN
    -- Limpiar músculos existentes para este ejercicio
    DELETE FROM exercise_muscles_detail WHERE exercise_id = p_exercise_id;
    
    -- Insertar músculos primarios
    IF p_muscles_detail->'primary' IS NOT NULL THEN
        FOR muscle_record IN SELECT * FROM jsonb_array_elements_text(p_muscles_detail->'primary')
        LOOP
            INSERT INTO exercise_muscles_detail (exercise_id, muscle_name, muscle_group, muscle_description)
            VALUES (p_exercise_id, muscle_record.value, 'primary', NULL);
        END LOOP;
    END IF;
    
    -- Insertar músculos secundarios
    IF p_muscles_detail->'secondary' IS NOT NULL THEN
        FOR muscle_record IN SELECT * FROM jsonb_array_elements_text(p_muscles_detail->'secondary')
        LOOP
            INSERT INTO exercise_muscles_detail (exercise_id, muscle_name, muscle_group, muscle_description)
            VALUES (p_exercise_id, muscle_record.value, 'secondary', NULL);
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 11. Crear función para obtener músculos detallados
CREATE OR REPLACE FUNCTION get_exercise_muscles_detail(p_exercise_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'primary', COALESCE(
            (SELECT jsonb_agg(muscle_name) 
             FROM exercise_muscles_detail 
             WHERE exercise_id = p_exercise_id AND muscle_group = 'primary'), 
            '[]'::jsonb
        ),
        'secondary', COALESCE(
            (SELECT jsonb_agg(muscle_name) 
             FROM exercise_muscles_detail 
             WHERE exercise_id = p_exercise_id AND muscle_group = 'secondary'), 
            '[]'::jsonb
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 12. Crear vista para ejercicios completos
CREATE OR REPLACE VIEW exercises_complete AS
SELECT 
    e.*,
    get_exercise_muscles_detail(e.id) as muscles_detail
FROM exercises e;

-- 13. Verificar la estructura creada
SELECT 
    'Table: exercises' as object_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'exercises'
ORDER BY ordinal_position;

-- 14. Mostrar la estructura de la tabla
\d exercises;

-- 15. Mostrar la vista completa
\d exercises_complete;

-- 16. Mostrar las funciones creadas
\df+ insert_exercise_muscles
\df+ get_exercise_muscles_detail
