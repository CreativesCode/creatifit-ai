-- Script para actualizar la estructura de la tabla exercises
-- Agregar todos los nuevos campos para la estructura completa de ejercicios

-- 1. Agregar campos obligatorios (🟢 mandatory_fields)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gif_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS primary_muscles TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS detail_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS page_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS page_number INTEGER;

-- 2. Agregar campos detallados (🟡 detailed_fields)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS page_title TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS overview TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions TEXT[]; -- Array de strings
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tips TEXT[]; -- Array de strings
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS benefits TEXT[]; -- Array de strings

-- 3. Agregar campos de metadatos (🟠 metadata_fields)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS muscle_groups_primary TEXT[]; -- Array de strings
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS muscle_groups_secondary TEXT[]; -- Array de strings

-- 4. Crear tabla para músculos detallados (estructura más compleja)
CREATE TABLE IF NOT EXISTS exercise_muscles_detail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_name TEXT NOT NULL,
    muscle_group TEXT NOT NULL, -- 'primary' o 'secondary'
    muscle_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscles ON exercises(primary_muscles);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(meta->>'difficulty');
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_exercise_id ON exercise_muscles_detail(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_group ON exercise_muscles_detail(muscle_group);

-- 6. Agregar comentarios para documentar la estructura
COMMENT ON COLUMN exercises.gif_url IS 'URL del GIF animado del ejercicio';
COMMENT ON COLUMN exercises.equipment IS 'Equipamiento requerido para el ejercicio';
COMMENT ON COLUMN exercises.primary_muscles IS 'Músculos principales trabajados';
COMMENT ON COLUMN exercises.detail_url IS 'URL de la página de detalles del ejercicio';
COMMENT ON COLUMN exercises.page_url IS 'URL de la página de categoría';
COMMENT ON COLUMN exercises.page_number IS 'Número de página en la categoría';
COMMENT ON COLUMN exercises.page_title IS 'Título completo de la página del ejercicio';
COMMENT ON COLUMN exercises.overview IS 'Descripción general del ejercicio';
COMMENT ON COLUMN exercises.instructions IS 'Array de instrucciones paso a paso';
COMMENT ON COLUMN exercises.tips IS 'Array de consejos y tips de seguridad';
COMMENT ON COLUMN exercises.benefits IS 'Array de beneficios del ejercicio';
COMMENT ON COLUMN exercises.muscle_groups_primary IS 'Array de grupos musculares principales';
COMMENT ON COLUMN exercises.muscle_groups_secondary IS 'Array de grupos musculares secundarios';

-- 7. Crear función para insertar músculos detallados
CREATE OR REPLACE FUNCTION insert_exercise_muscles(
    p_exercise_id UUID,
    p_muscles_detail JSONB
)
RETURNS VOID AS $$
DECLARE
    muscle_record RECORD;
BEGIN
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

-- 8. Crear función para obtener músculos detallados
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

-- 9. Crear vista para ejercicios completos
CREATE OR REPLACE VIEW exercises_complete AS
SELECT 
    e.*,
    get_exercise_muscles_detail(e.id) as muscles_detail
FROM exercises e;

-- 10. Verificar la estructura actualizada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'exercises'
ORDER BY ordinal_position;

-- 11. Mostrar la nueva estructura de la tabla
\d exercises;

-- 12. Mostrar la nueva vista
\d exercises_complete;
