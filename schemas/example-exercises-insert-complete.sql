-- Script de ejemplo para insertar un ejercicio completo
-- Demuestra cómo usar ambas tablas: exercises y exercise_muscles_detail

-- 1. Insertar un ejercicio en la tabla principal
INSERT INTO exercises (
    -- Campos básicos (obligatorios)
    name,
    kind,
    
    -- Campos obligatorios (🟢 mandatory_fields)
    gif_url,
    equipment,
    primary_muscles,
    detail_url,
    category,
    page_url,
    page_number,
    
    -- Campos detallados (🟡 detailed_fields)
    page_title,
    overview,
    instructions,
    tips,
    benefits,
    
    -- Campos de metadatos (🟠 metadata_fields)
    muscle_groups_primary,
    muscle_groups_secondary,
    
    -- Campo meta (para compatibilidad con el sistema actual)
    meta
) VALUES (
    -- Campos básicos
    'Barbell Bench Press',
    'strength',
    
    -- Campos obligatorios
    'https://fitnessprogramer.com/wp-content/uploads/2021/02/barbell-bench-press.gif',
    'Barbell, Bench, Full Gym',
    'Chest, Triceps',
    'https://fitnessprogramer.com/exercise/barbell-bench-press/',
    'Chest',
    'https://fitnessprogramer.com/exercise-primary-muscle/chest/page/1/',
    1,
    
    -- Campos detallados
    'Barbell Bench Press - Complete Exercise Guide',
    'The Barbell Bench Press is a compound exercise that primarily targets the chest muscles while also working the triceps and shoulders. It''s one of the most fundamental upper body exercises for building strength and muscle mass.',
    ARRAY[
        'Lie on a flat bench with your feet flat on the floor',
        'Grip the barbell slightly wider than shoulder width',
        'Unrack the bar and position it directly above your chest',
        'Lower the bar to your chest with control, keeping your elbows at about 45 degrees',
        'Press the bar back up to the starting position in a straight line',
        'Maintain tension throughout the entire range of motion'
    ],
    ARRAY[
        'Keep your core tight throughout the movement',
        'Don''t bounce the bar off your chest',
        'Maintain proper shoulder blade retraction',
        'Keep your feet planted firmly on the ground',
        'Use a spotter for heavy weights',
        'Breathe in on the way down, exhale on the way up'
    ],
    ARRAY[
        'Builds upper body strength and power',
        'Improves chest muscle development and definition',
        'Enhances pushing power for sports and daily activities',
        'Increases bone density in the upper body',
        'Improves shoulder stability when performed correctly'
    ],
    
    -- Campos de metadatos
    ARRAY['Chest', 'Triceps', 'Shoulders'],
    ARRAY['Core', 'Forearms'],
    
    -- Campo meta (compatibilidad con sistema actual)
    '{
        "difficulty": "intermediate",
        "equipment": ["barbell", "bench"],
        "target": ["chest", "triceps"],
        "secondary": ["shoulders", "core"],
        "safety_notes": ["Use spotter for heavy weights", "Warm up thoroughly"],
        "variations": ["Incline Bench Press", "Decline Bench Press", "Dumbbell Bench Press"],
        "progression": {
            "beginner": {"sets": 3, "reps": [8, 12], "weight": "bodyweight_percentage", "rest_sec": 90},
            "intermediate": {"sets": 4, "reps": [6, 10], "weight": "progressive", "rest_sec": 120},
            "advanced": {"sets": 5, "reps": [4, 8], "weight": "heavy", "rest_sec": 180}
        }
    }'::jsonb
);

-- 2. Obtener el ID del ejercicio que acabamos de insertar
-- (para usarlo en la tabla de músculos detallados)
DO $$
DECLARE
    exercise_uuid UUID;
BEGIN
    -- Obtener el ID del ejercicio recién insertado
    SELECT id INTO exercise_uuid 
    FROM exercises 
    WHERE name = 'Barbell Bench Press' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Verificar que se encontró el ejercicio
    IF exercise_uuid IS NULL THEN
        RAISE EXCEPTION '❌ ERROR: No se pudo encontrar el ejercicio insertado';
    END IF;
    
    RAISE NOTICE '✅ Ejercicio insertado con ID: %', exercise_uuid;
    
    -- 3. Insertar información detallada de músculos
    -- Músculos primarios
    INSERT INTO exercise_muscles_detail (exercise_id, muscle_name, muscle_group, muscle_description) VALUES
    (exercise_uuid, 'Pectoralis Major', 'primary', 'Músculo principal del pecho, responsable del movimiento de empuje horizontal'),
    (exercise_uuid, 'Pectoralis Minor', 'primary', 'Músculo auxiliar del pecho que ayuda en la estabilización'),
    (exercise_uuid, 'Anterior Deltoids', 'primary', 'Parte frontal del hombro, asiste en el empuje'),
    (exercise_uuid, 'Triceps Brachii', 'primary', 'Músculo posterior del brazo, extiende el codo durante el empuje');
    
    -- Músculos secundarios
    INSERT INTO exercise_muscles_detail (exercise_id, muscle_name, muscle_group, muscle_description) VALUES
    (exercise_uuid, 'Serratus Anterior', 'secondary', 'Músculo que ayuda en la protracción de los omóplatos'),
    (exercise_uuid, 'Rectus Abdominis', 'secondary', 'Músculo abdominal que proporciona estabilidad central'),
    (exercise_uuid, 'External Obliques', 'secondary', 'Músculos laterales del abdomen que ayudan en la estabilización'),
    (exercise_uuid, 'Forearm Flexors', 'secondary', 'Músculos del antebrazo que mantienen el agarre de la barra');
    
    RAISE NOTICE '✅ Información detallada de músculos insertada correctamente';
    
    -- 4. Mostrar el resultado final
    RAISE NOTICE '🎉 ¡Ejercicio completo insertado exitosamente!';
    RAISE NOTICE '📊 Datos en tabla exercises: 1 registro';
    RAISE NOTICE '💪 Datos en exercise_muscles_detail: 8 registros';
END $$;

-- 5. Verificar los datos insertados
-- Mostrar el ejercicio principal
SELECT 
    '=== EJERCICIO PRINCIPAL ===' as section,
    name,
    kind,
    category,
    equipment,
    primary_muscles,
    array_length(instructions, 1) as instructions_count,
    array_length(tips, 1) as tips_count,
    array_length(benefits, 1) as benefits_count,
    created_at
FROM exercises 
WHERE name = 'Barbell Bench Press';

-- Mostrar los músculos detallados
SELECT 
    '=== MÚSCULOS DETALLADOS ===' as section,
    muscle_name,
    muscle_group,
    muscle_description
FROM exercise_muscles_detail emd
JOIN exercises e ON e.id = emd.exercise_id
WHERE e.name = 'Barbell Bench Press'
ORDER BY 
    CASE WHEN muscle_group = 'primary' THEN 1 ELSE 2 END,
    muscle_name;

-- 6. Mostrar el campo meta (JSON)
SELECT 
    '=== META INFORMACIÓN ===' as section,
    jsonb_pretty(meta) as meta_json
FROM exercises 
WHERE name = 'Barbell Bench Press';

-- 7. Ejemplo de consulta combinada (ejercicio + músculos)
SELECT 
    '=== VISTA COMBINADA ===' as section,
    e.name as exercise_name,
    e.category,
    e.equipment,
    string_agg(
        CASE WHEN emd.muscle_group = 'primary' 
             THEN emd.muscle_name 
             ELSE NULL 
        END, 
        ', '
    ) as primary_muscles_detailed,
    string_agg(
        CASE WHEN emd.muscle_group = 'secondary' 
             THEN emd.muscle_name 
             ELSE NULL 
        END, 
        ', '
    ) as secondary_muscles_detailed
FROM exercises e
LEFT JOIN exercise_muscles_detail emd ON e.id = emd.exercise_id
WHERE e.name = 'Barbell Bench Press'
GROUP BY e.id, e.name, e.category, e.equipment;

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '✅ Script de ejemplo completado exitosamente';
    RAISE NOTICE '📝 Este ejercicio demuestra todos los campos disponibles';
    RAISE NOTICE '💡 Puedes usar este formato para insertar más ejercicios';
    RAISE NOTICE '🔗 Las dos tablas están correctamente relacionadas';
END $$;
