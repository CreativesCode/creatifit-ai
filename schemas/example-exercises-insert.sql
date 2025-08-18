-- Ejemplos de inserción de ejercicios con la nueva estructura
-- Basado en la estructura completa de la tabla exercises

-- 1. Ejercicio: Barbell Bench Press
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

-- 2. Ejercicio: Push-ups (Bodyweight)
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
    'Push-ups',
    'strength',
    'https://fitnessprogramer.com/wp-content/uploads/2021/02/push-ups.gif',
    'None (Bodyweight)',
    'Chest, Triceps, Shoulders',
    'https://fitnessprogramer.com/exercise/push-ups/',
    'Chest',
    'https://fitnessprogramer.com/exercise-primary-muscle/chest/page/1/',
    2,
    'Push-ups - Complete Exercise Guide',
    'Push-ups are a fundamental bodyweight exercise that targets the chest, triceps, and shoulders. They can be performed anywhere and are excellent for building upper body strength and endurance.',
    ARRAY[
        'Start in a plank position with hands slightly wider than shoulders',
        'Lower your body until your chest nearly touches the floor',
        'Push your body back up to the starting position',
        'Keep your body in a straight line throughout the movement'
    ],
    ARRAY[
        'Keep your core engaged',
        'Don''t let your hips sag',
        'Breathe steadily throughout the movement'
    ],
    ARRAY[
        'Builds upper body strength',
        'Improves core stability',
        'No equipment required',
        'Can be done anywhere'
    ],
    ARRAY['Chest', 'Triceps', 'Shoulders'],
    ARRAY['Core', 'Forearms'],
    '{
        "difficulty": "beginner",
        "target": ["chest", "triceps", "shoulders", "core"],
        "equipment": ["none"],
        "description": "Classic bodyweight exercise for upper body",
        "cues": [
            "Keep body straight",
            "Lower chest to ground",
            "Push through hands"
        ],
        "variations": [
            "Incline Push-ups",
            "Decline Push-ups",
            "Diamond Push-ups",
            "Wide Push-ups"
        ]
    }'::jsonb
) RETURNING id;

-- 3. Ejercicio: Squats (Bodyweight)
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
    'Bodyweight Squats',
    'strength',
    'https://fitnessprogramer.com/wp-content/uploads/2021/02/bodyweight-squats.gif',
    'None (Bodyweight)',
    'Quadriceps, Glutes, Hamstrings',
    'https://fitnessprogramer.com/exercise/bodyweight-squats/',
    'Legs',
    'https://fitnessprogramer.com/exercise-primary-muscle/legs/page/1/',
    1,
    'Bodyweight Squats - Complete Exercise Guide',
    'Bodyweight squats are a fundamental lower body exercise that targets the quadriceps, glutes, and hamstrings. They are excellent for building leg strength and improving mobility.',
    ARRAY[
        'Stand with feet shoulder-width apart',
        'Lower your body by bending at the knees and hips',
        'Keep your chest up and back straight',
        'Lower until thighs are parallel to the ground',
        'Push back up to the starting position'
    ],
    ARRAY[
        'Keep your knees in line with your toes',
        'Don''t let your knees go past your toes',
        'Keep your weight in your heels'
    ],
    ARRAY[
        'Builds leg strength',
        'Improves balance and coordination',
        'Enhances mobility',
        'No equipment required'
    ],
    ARRAY['Quadriceps', 'Glutes', 'Hamstrings'],
    ARRAY['Core', 'Calves', 'Lower Back'],
    '{
        "difficulty": "beginner",
        "target": ["quadriceps", "glutes", "hamstrings", "core"],
        "equipment": ["none"],
        "description": "Fundamental lower body exercise",
        "cues": [
            "Sit back like sitting in a chair",
            "Keep chest up",
            "Push through heels"
        ],
        "variations": [
            "Jump Squats",
            "Pistol Squats",
            "Sumo Squats",
            "Wall Squats"
        ]
    }'::jsonb
) RETURNING id;

-- 4. Ejercicio: Plank
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
    'Plank',
    'core',
    'https://fitnessprogramer.com/wp-content/uploads/2021/02/plank.gif',
    'None (Bodyweight)',
    'Core, Shoulders, Glutes',
    'https://fitnessprogramer.com/exercise/plank/',
    'Core',
    'https://fitnessprogramer.com/exercise-primary-muscle/core/page/1/',
    1,
    'Plank - Complete Exercise Guide',
    'The plank is an isometric core exercise that strengthens the entire core, including the abs, obliques, and lower back. It also engages the shoulders and glutes for stability.',
    ARRAY[
        'Start in a push-up position',
        'Bend your elbows and rest on your forearms',
        'Keep your body in a straight line from head to heels',
        'Hold the position for the desired time'
    ],
    ARRAY[
        'Keep your core engaged',
        'Don''t let your hips sag',
        'Breathe steadily',
        'Keep your neck neutral'
    ],
    ARRAY[
        'Strengthens entire core',
        'Improves posture',
        'Enhances stability',
        'No equipment required'
    ],
    ARRAY['Core', 'Shoulders', 'Glutes'],
    ARRAY['Arms', 'Legs'],
    '{
        "difficulty": "beginner",
        "target": ["core", "shoulders", "glutes"],
        "equipment": ["none"],
        "description": "Isometric core strengthening exercise",
        "cues": [
            "Keep body straight",
            "Engage core muscles",
            "Hold position steady"
        ],
        "variations": [
            "Side Plank",
            "Plank with Leg Lift",
            "Plank with Arm Reach",
            "Forearm Plank"
        ]
    }'::jsonb
) RETURNING id;

-- 5. Ejercicio: Pull-ups
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
    'Pull-ups',
    'strength',
    'https://fitnessprogramer.com/wp-content/uploads/2021/02/pull-ups.gif',
    'Pull-up Bar',
    'Back, Biceps, Shoulders',
    'https://fitnessprogramer.com/exercise/pull-ups/',
    'Back',
    'https://fitnessprogramer.com/exercise-primary-muscle/back/page/1/',
    1,
    'Pull-ups - Complete Exercise Guide',
    'Pull-ups are a compound upper body exercise that primarily targets the back muscles, particularly the latissimus dorsi. They also work the biceps and shoulders effectively.',
    ARRAY[
        'Grab the pull-up bar with hands slightly wider than shoulders',
        'Hang with arms fully extended',
        'Pull your body up until your chin is above the bar',
        'Lower your body back down with control'
    ],
    ARRAY[
        'Keep your core engaged',
        'Don''t swing your body',
        'Focus on pulling with your back muscles',
        'Lower with control'
    ],
    ARRAY[
        'Builds back strength',
        'Improves grip strength',
        'Enhances upper body power',
        'Great for functional fitness'
    ],
    ARRAY['Back', 'Biceps', 'Shoulders'],
    ARRAY['Forearms', 'Core'],
    '{
        "difficulty": "intermediate",
        "target": ["back", "biceps", "shoulders"],
        "equipment": ["pull-up bar"],
        "description": "Compound upper body pulling exercise",
        "cues": [
            "Pull with back muscles",
            "Keep body straight",
            "Control the movement"
        ],
        "variations": [
            "Assisted Pull-ups",
            "Wide Grip Pull-ups",
            "Close Grip Pull-ups",
            "Neutral Grip Pull-ups"
        ]
    }'::jsonb
) RETURNING id;

-- 6. Insertar músculos detallados para el primer ejercicio (Barbell Bench Press)
-- Primero obtener el ID del ejercicio insertado
DO $$
DECLARE
    exercise_id UUID;
BEGIN
    -- Obtener el ID del Barbell Bench Press
    SELECT id INTO exercise_id FROM exercises WHERE name = 'Barbell Bench Press' LIMIT 1;
    
    -- Insertar músculos detallados
    PERFORM insert_exercise_muscles(
        exercise_id,
        '{
            "primary": [
                "Pectoralis Major (Chest)",
                "Anterior Deltoids (Front Shoulders)"
            ],
            "secondary": [
                "Triceps Brachii",
                "Serratus Anterior"
            ]
        }'::jsonb
    );
END $$;

-- 7. Verificar los ejercicios insertados
SELECT 
    name,
    kind,
    category,
    equipment,
    primary_muscles,
    meta->>'difficulty' as difficulty
FROM exercises 
ORDER BY name;

-- 8. Verificar la vista completa
SELECT 
    name,
    category,
    equipment,
    muscle_groups_primary,
    muscle_groups_secondary
FROM exercises_complete 
ORDER BY name;

-- 9. Probar las funciones de búsqueda
SELECT * FROM search_exercises('chest');
SELECT * FROM get_exercises_by_equipment(ARRAY['None (Bodyweight)']);
SELECT * FROM get_exercises_by_muscles(ARRAY['Chest', 'Back']);

-- 10. Mostrar el total de ejercicios insertados
SELECT COUNT(*) as total_exercises FROM exercises;
