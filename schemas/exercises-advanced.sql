-- CreatiFit AI - Ejercicios Avanzados y Especializados
-- Ejecuta este SQL en Supabase para agregar ejercicios avanzados

-- EJERCICIOS AVANZADOS (SIN EQUIPOS)
INSERT INTO exercises (name, kind, meta) VALUES
-- Push avanzados
('One Arm Push-ups', 'push', '{"equipment": ["none"], "difficulty": "advanced", "target": ["chest", "triceps", "core", "stability"]}'),
('Archer Push-ups', 'push', '{"equipment": ["none"], "difficulty": "advanced", "target": ["chest", "triceps", "shoulders"]}'),
('Pseudo Planche Push-ups', 'push', '{"equipment": ["none"], "difficulty": "advanced", "target": ["chest", "triceps", "shoulders", "core"]}'),
('Handstand Push-ups', 'push', '{"equipment": ["wall"], "difficulty": "advanced", "target": ["shoulders", "triceps", "core"]}'),

-- Pull avanzados
('Muscle-ups', 'pull', '{"equipment": ["pull-up bar"], "difficulty": "advanced", "target": ["back", "biceps", "chest", "triceps"]}'),
('Front Lever Progressions', 'pull', '{"equipment": ["pull-up bar"], "difficulty": "advanced", "target": ["back", "core", "shoulders"]}'),
('Back Lever Progressions', 'pull', '{"equipment": ["pull-up bar"], "difficulty": "advanced", "target": ["back", "core", "shoulders"]}'),
('Human Flag', 'pull', '{"equipment": ["pull-up bar"], "difficulty": "advanced", "target": ["back", "core", "shoulders", "obliques"]}'),

-- Squat avanzados
('Pistol Squats', 'squat', '{"equipment": ["none"], "difficulty": "advanced", "target": ["quads", "glutes", "balance", "core"]}'),
('Shrimp Squats', 'squat', '{"equipment": ["none"], "difficulty": "advanced", "target": ["quads", "glutes", "balance"]}'),
('Cossack Squats', 'squat', '{"equipment": ["none"], "difficulty": "advanced", "target": ["quads", "glutes", "adductors", "flexibility"]}'),
('Jump Lunges', 'squat', '{"equipment": ["none"], "difficulty": "advanced", "target": ["quads", "glutes", "cardio", "explosiveness"]}'),

-- Core avanzado
('L-Sit', 'core', '{"equipment": ["none"], "difficulty": "advanced", "target": ["core", "hip flexors", "shoulders"]}'),
('V-Sit', 'core', '{"equipment": ["none"], "difficulty": "advanced", "target": ["core", "hip flexors", "shoulders"]}'),
('Front Lever Tuck', 'core', '{"equipment": ["pull-up bar"], "difficulty": "advanced", "target": ["core", "back", "shoulders"]}'),
('Dragon Flag', 'core', '{"equipment": ["none"], "difficulty": "advanced", "target": ["core", "hip flexors"]}'),
('Human Flag Progressions', 'core', '{"equipment": ["pull-up bar"], "difficulty": "advanced", "target": ["core", "obliques", "shoulders"]}'),

-- EJERCICIOS ESPECIALIZADOS POR OBJETIVO
INSERT INTO exercises (name, kind, meta) VALUES
-- Pérdida de grasa (HIIT)
('Burpee Pull-ups', 'cardio', '{"equipment": ["pull-up bar"], "difficulty": "advanced", "target": ["cardio", "full body", "strength"]}'),
('Mountain Climber Burpees', 'cardio', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["cardio", "core", "full body"]}'),
('Sprint in Place', 'cardio', '{"equipment": ["none"], "difficulty": "beginner", "target": ["cardio", "legs"]}'),
('High Intensity Intervals', 'cardio', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["cardio", "full body"]}'),

-- Ganancia muscular
('Pike Push-ups Progression', 'push', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["shoulders", "triceps", "core"]}'),
('Diamond Push-ups Progression', 'push', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["triceps", "chest"]}'),
('Pull-up Negatives', 'pull', '{"equipment": ["pull-up bar"], "difficulty": "beginner", "target": ["back", "biceps"]}'),
('Isometric Holds', 'core', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["core", "stability"]}'),

-- Flexibilidad y movilidad
('Deep Squat Hold', 'squat', '{"equipment": ["none"], "difficulty": "beginner", "target": ["quads", "glutes", "flexibility"]}'),
('Pigeon Pose', 'core', '{"equipment": ["yoga mat"], "difficulty": "beginner", "target": ["hip flexors", "glutes", "flexibility"]}'),
('Downward Dog', 'core', '{"equipment": ["yoga mat"], "difficulty": "beginner", "target": ["shoulders", "hamstrings", "flexibility"]}'),
('Cat-Cow Stretch', 'core', '{"equipment": ["yoga mat"], "difficulty": "beginner", "target": ["spine", "core", "flexibility"]}'),

-- Equilibrio y estabilidad
('Single Leg Deadlift', 'hinge', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["hamstrings", "glutes", "balance", "stability"]}'),
('Single Leg Squat', 'squat', '{"equipment": ["none"], "difficulty": "advanced", "target": ["quads", "glutes", "balance", "stability"]}'),
('Tree Pose', 'core', '{"equipment": ["none"], "difficulty": "beginner", "target": ["balance", "stability", "focus"]}'),
('Warrior III', 'core', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["balance", "stability", "core", "legs"]}'),

-- EJERCICIOS FUNCIONALES
INSERT INTO exercises (name, kind, meta) VALUES
-- Movimientos compuestos
('Turkish Get-up', 'core', '{"equipment": ["none"], "difficulty": "advanced", "target": ["core", "shoulders", "stability", "coordination"]}'),
('Bear Crawl', 'core', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["core", "shoulders", "coordination"]}'),
('Crab Walk', 'core', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["core", "shoulders", "glutes", "coordination"]}'),
('Duck Walk', 'squat', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["quads", "glutes", "coordination"]}'),

-- Ejercicios de coordinación
('Cross-body Mountain Climbers', 'core', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["core", "coordination", "cardio"]}'),
('Spider-man Push-ups', 'push', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["chest", "triceps", "core", "coordination"]}'),
('Bird Dog with Knee Drive', 'core', '{"equipment": ["none"], "difficulty": "intermediate", "target": ["core", "stability", "coordination"]}'),

-- EJERCICIOS DE RECUPERACIÓN
INSERT INTO exercises (name, kind, meta) VALUES
('Foam Rolling', 'core', '{"equipment": ["foam roller"], "difficulty": "beginner", "target": ["recovery", "mobility", "flexibility"]}'),
('Static Stretching', 'core', '{"equipment": ["none"], "difficulty": "beginner", "target": ["flexibility", "recovery", "mobility"]}'),
('Deep Breathing', 'core', '{"equipment": ["none"], "difficulty": "beginner", "target": ["recovery", "stress relief", "focus"]}'),
('Progressive Muscle Relaxation', 'core', '{"equipment": ["none"], "difficulty": "beginner", "target": ["recovery", "stress relief", "relaxation"]}')
ON CONFLICT (name) DO NOTHING;
