-- Script CORREGIDO para crear la tabla exercises desde cero
-- Nueva estructura completa para ejercicios (SIN PROBLEMAS DE TIPOS)

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

-- 2. Crear tabla para músculos detallados (TIPOS EXPLÍCITOS)
CREATE TABLE IF NOT EXISTS exercise_muscles_detail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id UUID NOT NULL,
    muscle_name TEXT NOT NULL,
    muscle_group TEXT NOT NULL CHECK (muscle_group IN ('primary', 'secondary')),
    muscle_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Agregar Foreign Key DESPUÉS de crear ambas tablas
ALTER TABLE exercise_muscles_detail 
ADD CONSTRAINT fk_exercise_muscles_detail_exercise_id 
FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;

-- 4. Crear índices básicos
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_kind ON exercises(kind);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscles ON exercises(primary_muscles);

-- 5. Crear índices GIN para JSONB y arrays
CREATE INDEX IF NOT EXISTS idx_exercises_meta ON exercises USING GIN(meta);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups_primary ON exercises USING GIN(muscle_groups_primary);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups_secondary ON exercises USING GIN(muscle_groups_secondary);

-- 6. Índices para la tabla de músculos
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_exercise_id ON exercise_muscles_detail(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_group ON exercise_muscles_detail(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_name ON exercise_muscles_detail(muscle_name);

-- 7. Agregar comentarios básicos
COMMENT ON TABLE exercises IS 'Tabla principal de ejercicios con estructura completa';
COMMENT ON TABLE exercise_muscles_detail IS 'Tabla para músculos detallados de cada ejercicio';

-- 8. Verificar la estructura creada
SELECT 
    'Table: exercises' as object_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'exercises'
ORDER BY ordinal_position;

-- 9. Verificar la tabla de músculos
SELECT 
    'Table: exercise_muscles_detail' as object_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'exercise_muscles_detail'
ORDER BY ordinal_position;
