-- CreatiFit AI - Ejercicios con Equipamiento de Casa
-- Ejecuta este SQL en Supabase para agregar más ejercicios

-- BANDAS ELÁSTICAS
INSERT INTO exercises (name, kind, meta) VALUES
-- Push con bandas
('Band Push-ups', 'push', '{"equipment": ["resistance band"], "difficulty": "intermediate", "target": ["chest", "triceps"]}'),
('Band Chest Press', 'push', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["chest", "triceps"]}'),
('Band Overhead Press', 'push', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["shoulders", "triceps"]}'),
('Band Lateral Raises', 'push', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["shoulders"]}'),
('Band Front Raises', 'push', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["shoulders"]}'),
('Band Tricep Extensions', 'push', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["triceps"]}'),

-- Pull con bandas
('Band Rows', 'pull', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["back", "biceps"]}'),
('Band Lat Pulldowns', 'pull', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["back", "biceps"]}'),
('Band Bicep Curls', 'pull', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["biceps"]}'),
('Band Hammer Curls', 'pull', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["biceps", "forearms"]}'),
('Band Face Pulls', 'pull', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["shoulders", "upper back"]}'),

-- Squat con bandas
('Band Squats', 'squat', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["quads", "glutes"]}'),
('Band Side Steps', 'squat', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["quads", "glutes", "adductors"]}'),
('Band Glute Bridges', 'hinge', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["glutes", "hamstrings"]}'),
('Band Deadlifts', 'hinge', '{"equipment": ["resistance band"], "difficulty": "beginner", "target": ["hamstrings", "glutes", "lower back"]}'),

-- Core con bandas
('Band Woodchoppers', 'core', '{"equipment": ["resistance band"], "difficulty": "intermediate", "target": ["core", "obliques"]}'),
('Band Pallof Press', 'core', '{"equipment": ["resistance band"], "difficulty": "intermediate", "target": ["core", "stability"]}'),

-- MANCUERNAS
INSERT INTO exercises (name, kind, meta) VALUES
-- Push con mancuernas
('Dumbbell Chest Press', 'push', '{"equipment": ["dumbbells"], "difficulty": "beginner", "target": ["chest", "triceps"]}'),
('Dumbbell Flyes', 'push', '{"equipment": ["dumbbells"], "difficulty": "intermediate", "target": ["chest"]}'),
('Dumbbell Shoulder Press', 'push', '{"equipment": ["dumbbells"], "difficulty": "beginner", "target": ["shoulders", "triceps"]}'),
('Dumbbell Lateral Raises', 'push', '{"equipment": ["dumbbells"], "difficulty": "beginner", "target": ["shoulders"]}'),
('Dumbbell Front Raises', 'push', '{"equipment": ["dumbbells"], "difficulty": "beginner", "target": ["shoulders"]}'),
('Dumbbell Tricep Extensions', 'push', '{"equipment": ["dumbbells"], "difficulty": "beginner", "target": ["triceps"]}'),

-- Pull con mancuernas
('Dumbbell Rows', 'pull', '{"equipment": ["dumbbells"], "difficulty": "beginner", "target": ["back", "biceps"]}'),
('Dumbbell Bicep Curls', 'pull', '{"equipment": ["dumbbells"], "difficulty": "beginner", "target": ["biceps"]}'),
('Dumbbell Hammer Curls', 'pull', '{"equipment": ["dumbbells"], "difficulty": "beginner", "target": ["biceps", "forearms"]}'),
('Dumbbell Shrugs', 'pull', '{"equipment": ["dumbbells"], "difficulty": "beginner", "target": ["traps", "shoulders"]}'),

-- Squat con mancuernas
('Dumbbell Squats', 'squat', '{"equipment": ["dumbbells"], "difficulty": "beginner", "target": ["quads", "glutes"]}'),
('Dumbbell Lunges', 'squat', '{"equipment": ["dumbbells"], "difficulty": "intermediate", "target": ["quads", "glutes"]}'),
('Dumbbell Step-ups', 'squat', '{"equipment": ["dumbbells", "chair"], "difficulty": "intermediate", "target": ["quads", "glutes"]}'),
('Dumbbell Deadlifts', 'hinge', '{"equipment": ["dumbbells"], "difficulty": "beginner", "target": ["hamstrings", "glutes", "lower back"]}'),
('Dumbbell Romanian Deadlifts', 'hinge', '{"equipment": ["dumbbells"], "difficulty": "intermediate", "target": ["hamstrings", "glutes"]}'),

-- Core con mancuernas
('Dumbbell Russian Twists', 'core', '{"equipment": ["dumbbells"], "difficulty": "intermediate", "target": ["abs", "obliques"]}'),
('Dumbbell Side Bends', 'core', '{"equipment": ["dumbbells"], "difficulty": "beginner", "target": ["obliques"]}'),

-- EQUIPAMIENTO ESPECÍFICO
INSERT INTO exercises (name, kind, meta) VALUES
-- Silla
('Chair Dips', 'push', '{"equipment": ["chair"], "difficulty": "intermediate", "target": ["triceps", "chest"]}'),
('Chair Step-ups', 'squat', '{"equipment": ["chair"], "difficulty": "beginner", "target": ["quads", "glutes"]}'),
('Chair Bulgarian Split Squats', 'squat', '{"equipment": ["chair"], "difficulty": "intermediate", "target": ["quads", "glutes"]}'),

-- Pared
('Wall Sits', 'squat', '{"equipment": ["wall"], "difficulty": "beginner", "target": ["quads", "glutes"]}'),
('Wall Angels', 'push', '{"equipment": ["wall"], "difficulty": "beginner", "target": ["shoulders", "upper back"]}'),
('Wall Slides', 'push', '{"equipment": ["wall"], "difipment": "beginner", "target": ["shoulders", "upper back"]}'),

-- Esterilla de yoga
('Yoga Flow Sequences', 'core', '{"equipment": ["yoga mat"], "difficulty": "beginner", "target": ["core", "flexibility", "balance"]}'),
('Sun Salutations', 'core', '{"equipment": ["yoga mat"], "difficulty": "beginner", "target": ["core", "flexibility", "cardio"]}'),

-- Barra fija
('Pull-ups', 'pull', '{"equipment": ["pull-up bar"], "difficulty": "intermediate", "target": ["back", "biceps"]}'),
('Chin-ups', 'pull', '{"equipment": ["pull-up bar"], "difficulty": "intermediate", "target": ["back", "biceps"]}'),
('Hanging Leg Raises', 'core', '{"equipment": ["pull-up bar"], "difficulty": "advanced", "target": ["core", "hip flexors"]}'),
('Hanging Knee Raises', 'core', '{"equipment": ["pull-up bar"], "difficulty": "intermediate", "target": ["core", "hip flexors"]}'),

-- Plataforma vibratoria
('Vibration Platform Squats', 'squat', '{"equipment": ["vibration platform"], "difficulty": "beginner", "target": ["quads", "glutes", "stability"]}'),
('Vibration Platform Planks', 'core', '{"equipment": ["vibration platform"], "difficulty": "intermediate", "target": ["core", "stability"]}'),

-- Suiza (cuerda)
('Jump Rope', 'cardio', '{"equipment": ["jump rope"], "difficulty": "beginner", "target": ["cardio", "coordination"]}'),
('Single Leg Jumps', 'cardio', '{"equipment": ["jump rope"], "difficulty": "intermediate", "target": ["cardio", "balance", "coordination"]}'),
('Double Unders', 'cardio', '{"equipment": ["jump rope"], "difficulty": "advanced", "target": ["cardio", "coordination"]}')
ON CONFLICT (name) DO NOTHING;
