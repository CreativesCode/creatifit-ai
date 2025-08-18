-- CreatiFit AI - Ejercicios para Casa
-- Ejecuta este SQL en Supabase para agregar ejercicios

-- EQUIPAMIENTO BÁSICO (SIN EQUIPOS)
INSERT INTO exercises (name, kind, meta) VALUES
-- PUSH (Empuje)
('Push-ups', 'push', '{"equipment": ["none"], "difficulty": "beginner", "target": ["chest", "triceps", "shoulders"]}'),
('Incline Push-ups', 'push', '{"equipment": ["wall", "chair"], "difficulty": "beginner", "target": ["chest", "triceps"]}'),
('Decline Push-ups', 'push', '{"equipment": ["chair"], "difficulty": "intermediate", "target": ["chest", "triceps"]}'),
('Diamond Push-ups', 'push', '{"equipment": ["none"], "difficulty": "advanced", "target": ["triceps", "chest"]}'),
('Pike Push-ups', 'push', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["shoulders", "triceps"]}'),
('Wall Handstand Push-ups', 'push', '{"equipment": ["wall"], "difficulty": "advanced", "target": ["shoulders", "triceps"]}'),

-- PULL (Tirón)
('Pull-ups', 'pull', '{"equipment": ["pull-up bar"], "difficulty": "intermediate", "target": ["back", "biceps"]}'),
('Assisted Pull-ups', 'pull', '{"equipment": ["pull-up bar", "resistance band"], "difficulty": "beginner", "target": ["back", "biceps"]}'),
('Negative Pull-ups', 'pull', '{"equipment": ["pull-up bar"], "difficulty": "beginner", "target": ["back", "biceps"]}'),
('Australian Pull-ups', 'pull', '{"equipment": ["table", "chair"], "difficulty": "beginner", "target": ["back", "biceps"]}'),
('Inverted Rows', 'pull', '{"equipment": ["table"], "difficulty": "beginner", "target": ["back", "biceps"]}'),

-- SQUAT (Sentadillas)
('Bodyweight Squats', 'squat', '{"equipment": ["none"], "difficulty": "beginner", "target": ["quads", "glutes"]}'),
('Chair Squats', 'squat', '{"equipment": ["chair"], "difficulty": "beginner", "target": ["quads", "glutes"]}'),
('Wall Squats', 'squat', '{"equipment": ["wall"], "difficulty": "beginner", "target": ["quads", "glutes"]}'),
('Jump Squats', 'squat', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["quads", "glutes", "cardio"]}'),
('Pistol Squats', 'squat', '{"equipment": ["none"], "difficulty": "advanced", "target": ["quads", "glutes", "balance"]}'),
('Split Squats', 'squat', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["quads", "glutes"]}'),

-- HINGE (Bisagra)
('Glute Bridges', 'hinge', '{"equipment": ["none"], "difficulty": "beginner", "target": ["glutes", "hamstrings"]}'),
('Single Leg Glute Bridges', 'hinge', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["glutes", "hamstrings"]}'),
('Good Mornings', 'hinge', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["hamstrings", "lower back"]}'),
('Romanian Deadlifts', 'hinge', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["hamstrings", "glutes"]}'),

-- CORE
('Plank', 'core', '{"equipment": ["none"], "difficulty": "beginner", "target": ["core", "shoulders"]}'),
('Side Plank', 'core', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["obliques", "shoulders"]}'),
('Forearm Plank', 'core', '{"equipment": ["none"], "difficulty": "beginner", "target": ["core", "shoulders"]}'),
('Mountain Climbers', 'core', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["core", "cardio"]}'),
('Bicycle Crunches', 'core', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["abs", "obliques"]}'),
('Russian Twists', 'core', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["abs", "obliques"]}'),
('Dead Bug', 'core', '{"equipment": ["none"], "difficulty": "beginner", "target": ["core", "stability"]}'),
('Bird Dog', 'core', '{"equipment": ["none"], "difficulty": "beginner", "target": ["core", "stability"]}'),

-- CARDIO
('Jumping Jacks', 'cardio', '{"equipment": ["none"], "difficulty": "beginner", "target": ["cardio", "full body"]}'),
('High Knees', 'cardio', '{"equipment": ["none"], "difficulty": "beginner", "target": ["cardio", "legs"]}'),
('Burpees', 'cardio', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["cardio", "full body"]}'),
('Mountain Climbers', 'cardio', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["cardio", "core"]}'),
('Butt Kicks', 'cardio', '{"equipment": ["none"], "difficulty": "beginner", "target": ["cardio", "hamstrings"]}'),
('Skater Jumps', 'cardio', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["cardio", "legs", "balance"]}')
ON CONFLICT (name) DO NOTHING;
