-- Script para crear la tabla exercises desde cero
-- Nueva estructura completa para ejercicios

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

-- 2. Crear tabla para músculos detallados (estructura más compleja)
CREATE TABLE IF NOT EXISTS exercise_muscles_detail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id UUID NOT NULL,
    muscle_name TEXT NOT NULL,
    muscle_group TEXT NOT NULL CHECK (muscle_group IN ('primary', 'secondary')),
    muscle_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_exercise_muscles_detail_exercise_id 
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

-- 3. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_kind ON exercises(kind);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscles ON exercises(primary_muscles);

-- Índices para campos JSONB (usar sintaxis correcta)
-- NOTA: Para índices específicos en campos JSONB, usar solo el campo completo
CREATE INDEX IF NOT EXISTS idx_exercises_meta ON exercises USING GIN(meta);

-- Índices GIN para arrays
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups_primary ON exercises USING GIN(muscle_groups_primary);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups_secondary ON exercises USING GIN(muscle_groups_secondary);

-- Índices para la tabla de músculos detallados
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_exercise_id ON exercise_muscles_detail(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_group ON exercise_muscles_detail(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_name ON exercise_muscles_detail(muscle_name);

-- 4. Crear índices para búsquedas de texto
CREATE INDEX IF NOT EXISTS idx_exercises_name_search ON exercises USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_exercises_overview_search ON exercises USING gin(to_tsvector('english', COALESCE(overview, '')));

-- Índice para instrucciones (convertir array a texto)
CREATE INDEX IF NOT EXISTS idx_exercises_instructions_search ON exercises USING gin(to_tsvector('english', array_to_string(COALESCE(instructions, ARRAY[]::text[]), ' ')));

-- 5. Agregar comentarios para documentar la estructura
COMMENT ON TABLE exercises IS 'Tabla principal de ejercicios con estructura completa';
COMMENT ON COLUMN exercises.id IS 'Identificador único del ejercicio';
COMMENT ON COLUMN exercises.name IS 'Nombre del ejercicio';
COMMENT ON COLUMN exercises.kind IS 'Tipo de ejercicio: strength, cardio, flexibility, etc.';
COMMENT ON COLUMN exercises.gif_url IS 'URL del GIF animado del ejercicio';
COMMENT ON COLUMN exercises.equipment IS 'Equipamiento requerido para el ejercicio';
COMMENT ON COLUMN exercises.primary_muscles IS 'Músculos principales trabajados';
COMMENT ON COLUMN exercises.detail_url IS 'URL de la página de detalles del ejercicio';
COMMENT ON COLUMN exercises.category IS 'Categoría del ejercicio: Chest, Back, Legs, etc.';
COMMENT ON COLUMN exercises.page_url IS 'URL de la página de categoría';
COMMENT ON COLUMN exercises.page_number IS 'Número de página en la categoría';
COMMENT ON COLUMN exercises.page_title IS 'Título completo de la página del ejercicio';
COMMENT ON COLUMN exercises.overview IS 'Descripción general del ejercicio';
COMMENT ON COLUMN exercises.instructions IS 'Array de instrucciones paso a paso';
COMMENT ON COLUMN exercises.tips IS 'Array de consejos y tips de seguridad';
COMMENT ON COLUMN exercises.benefits IS 'Array de beneficios del ejercicio';
COMMENT ON COLUMN exercises.muscle_groups_primary IS 'Array de grupos musculares principales';
COMMENT ON COLUMN exercises.muscle_groups_secondary IS 'Array de grupos musculares secundarios';
COMMENT ON COLUMN exercises.meta IS 'Campo JSONB para datos adicionales y compatibilidad';
COMMENT ON COLUMN exercises.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN exercises.updated_at IS 'Fecha de última actualización';

COMMENT ON TABLE exercise_muscles_detail IS 'Tabla para músculos detallados de cada ejercicio';
COMMENT ON COLUMN exercise_muscles_detail.exercise_id IS 'Referencia al ejercicio';
COMMENT ON COLUMN exercise_muscles_detail.muscle_name IS 'Nombre del músculo';
COMMENT ON COLUMN exercise_muscles_detail.muscle_group IS 'Grupo del músculo: primary o secondary';
COMMENT ON COLUMN exercise_muscles_detail.muscle_description IS 'Descripción adicional del músculo';

-- 6. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para updated_at
CREATE TRIGGER trigger_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_exercises_updated_at();

-- 8. Crear función para insertar músculos detallados
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

-- 9. Crear función para obtener músculos detallados
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

-- 10. Crear vista para ejercicios completos
CREATE OR REPLACE VIEW exercises_complete AS
SELECT 
    e.*,
    get_exercise_muscles_detail(e.id) as muscles_detail
FROM exercises e;

-- 11. Crear función para buscar ejercicios por texto
CREATE OR REPLACE FUNCTION search_exercises(search_term TEXT)
RETURNS TABLE(
    id UUID,
    name TEXT,
    kind TEXT,
    category TEXT,
    equipment TEXT,
    primary_muscles TEXT,
    overview TEXT,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.kind,
        e.category,
        e.equipment,
        e.primary_muscles,
        e.overview,
        GREATEST(
            similarity(e.name, search_term),
            similarity(COALESCE(e.overview, ''), search_term),
            similarity(array_to_string(COALESCE(e.instructions, ARRAY[]::text[]), ' '), search_term)
        ) as similarity
    FROM exercises e
    WHERE 
        e.name ILIKE '%' || search_term || '%'
        OR e.overview ILIKE '%' || search_term || '%'
        OR e.primary_muscles ILIKE '%' || search_term || '%'
        OR e.category ILIKE '%' || search_term || '%'
    ORDER BY similarity DESC, e.name;
END;
$$ LANGUAGE plpgsql;

-- 12. Crear función para obtener ejercicios por equipamiento
CREATE OR REPLACE FUNCTION get_exercises_by_equipment(equipment_list TEXT[])
RETURNS TABLE(
    id UUID,
    name TEXT,
    kind TEXT,
    category TEXT,
    equipment TEXT,
    primary_muscles TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.kind,
        e.category,
        e.equipment,
        e.primary_muscles
    FROM exercises e
    WHERE 
        e.equipment = ANY(equipment_list)
        OR e.equipment ILIKE '%none%'
        OR e.equipment ILIKE '%bodyweight%'
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql;

-- 13. Crear función para obtener ejercicios por músculos
CREATE OR REPLACE FUNCTION get_exercises_by_muscles(muscle_list TEXT[])
RETURNS TABLE(
    id UUID,
    name TEXT,
    kind TEXT,
    category TEXT,
    equipment TEXT,
    primary_muscles TEXT,
    muscle_groups_primary TEXT[],
    muscle_groups_secondary TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.kind,
        e.category,
        e.equipment,
        e.primary_muscles,
        e.muscle_groups_primary,
        e.muscle_groups_secondary
    FROM exercises e
    WHERE 
        e.primary_muscles ILIKE ANY(SELECT '%' || muscle || '%' FROM unnest(muscle_list) AS muscle)
        OR e.muscle_groups_primary && muscle_list
        OR e.muscle_groups_secondary && muscle_list
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql;

-- 14. Verificar la estructura creada
SELECT 
    'Table: exercises' as object_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'exercises'
ORDER BY ordinal_position;

-- 15. Verificar la tabla de músculos
SELECT 
    'Table: exercise_muscles_detail' as object_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'exercise_muscles_detail'
ORDER BY ordinal_position;

-- 16. Verificar las funciones creadas
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
    AND routine_name IN (
        'insert_exercise_muscles',
        'get_exercise_muscles_detail',
        'search_exercises',
        'get_exercises_by_equipment',
        'get_exercises_by_muscles'
    )
ORDER BY routine_name;

-- 17. Verificar las vistas creadas
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
    AND table_name = 'exercises_complete';
