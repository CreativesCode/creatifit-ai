-- Ejemplo de inserción de ejercicio con la nueva estructura completa
-- Basado en el ejemplo del usuario: Barbell Bench Press

-- 1. Insertar el ejercicio principal
INSERT INTO exercises (
    name,
    kind,
    gif_url,
    equipment,
    primary_muscles,
    detail_url,
    category,
    page_url,
    page_number,
    page_title,
    overview,
    instructions,
    tips,
    benefits,
    muscle_groups_primary,
    muscle_groups_secondary,
    meta
) VALUES (
    'Barbell Bench Press',
    'strength',
    'https://fitnessprogramer.com/wp-content/uploads/2021/02/barbell-bench-press.gif',
    'Barbell, Bench, Full Gym',
    'Chest, Triceps',
    'https://fitnessprogramer.com/exercise/barbell-bench-press/',
    'Chest',
    'https://fitnessprogramer.com/exercise-primary-muscle/chest/page/1/',
    1,
    'Barbell Bench Press - Complete Exercise Guide',
    'The Barbell Bench Press is a compound exercise that primarily targets the chest muscles while also working the triceps and shoulders. It''s one of the most fundamental upper body exercises for building strength and muscle mass.',
    ARRAY[
        'Lie on a flat bench with your feet flat on the floor',
        'Grip the barbell slightly wider than shoulder width',
        'Lower the bar to your chest with control',
        'Press the bar back up to the starting position'
    ],
    ARRAY[
        'Keep your core tight throughout the movement',
        'Don''t bounce the bar off your chest',
        'Maintain proper shoulder blade retraction'
    ],
    ARRAY[
        'Builds upper body strength',
        'Improves chest muscle development',
        'Enhances pushing power'
    ],
    ARRAY['Chest', 'Triceps'],
    ARRAY['Shoulders', 'Core'],
    '{
        "difficulty": "intermediate",
        "target": ["chest", "triceps", "shoulders"],
        "equipment": ["barbell", "bench"],
        "description": "Compound exercise for upper body strength",
        "cues": [
            "Keep feet flat on floor",
            "Retract shoulder blades",
            "Control the descent"
        ],
        "variations": [
            "Incline Bench Press",
            "Decline Bench Press",
            "Dumbbell Bench Press"
        ]
    }'::jsonb
) RETURNING id;

-- 2. Insertar músculos detallados usando la función
-- (Esto se haría después de obtener el ID del ejercicio insertado)
-- SELECT insert_exercise_muscles(
--     'ID_DEL_EJERCICIO_INSERTADO',
--     '{
--         "primary": [
--             "Pectoralis Major (Chest)",
--             "Anterior Deltoids (Front Shoulders)"
--         ],
--         "secondary": [
--             "Triceps Brachii",
--             "Serratus Anterior"
--         ]
--     }'::jsonb
-- );

-- 3. Ejemplo de consulta para obtener el ejercicio completo
-- SELECT * FROM exercises_complete WHERE name = 'Barbell Bench Press';

-- 4. Ejemplo de consulta con filtros
-- SELECT 
--     name,
--     category,
--     equipment,
--     primary_muscles,
--     meta->>'difficulty' as difficulty
-- FROM exercises 
-- WHERE category = 'Chest' 
-- AND meta->>'difficulty' = 'intermediate'
-- ORDER BY name;

-- 5. Ejemplo de búsqueda por músculos
-- SELECT 
--     name,
--     category,
--     primary_muscles,
--     muscle_groups_primary
-- FROM exercises 
-- WHERE 'Chest' = ANY(muscle_groups_primary)
-- OR 'Chest' = ANY(muscle_groups_secondary)
-- ORDER BY name;
