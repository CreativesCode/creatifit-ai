-- CreatiFit AI - Ejercicios con Barras y Equipamiento de Peso
-- Ejecuta este SQL en Supabase para agregar ejercicios con barras

-- EJERCICIOS CON BARRA OLÍMPICA
INSERT INTO exercises (name, kind, meta) VALUES
-- Push con barra
('Barbell Bench Press', 'push', '{"equipment": ["barbell", "bench"], "difficulty": "intermediate", "target": ["chest", "triceps", "shoulders"]}'),
('Barbell Overhead Press', 'push', '{"equipment": ["barbell"], "difficulty": "intermediate", "target": ["shoulders", "triceps"]}'),
('Barbell Incline Press', 'push', '{"equipment": ["barbell", "incline_bench"], "difficulty": "intermediate", "target": ["chest", "triceps", "shoulders"]}'),
('Barbell Decline Press', 'push', '{"equipment": ["barbell", "bench"], "difficulty": "intermediate", "target": ["chest", "triceps"]}'),
('Barbell Close Grip Bench Press', 'push', '{"equipment": ["barbell", "bench"], "difficulty": "intermediate", "target": ["triceps", "chest"]}'),
('Barbell Floor Press', 'push', '{"equipment": ["barbell"], "difficulty": "intermediate", "target": ["chest", "triceps"]}'),

-- Pull con barra
('Barbell Rows', 'pull', '{"equipment": ["barbell"], "difficulty": "intermediate", "target": ["back", "biceps"]}'),
('Barbell Curls', 'pull', '{"equipment": ["barbell"], "difficulty": "beginner", "target": ["biceps", "forearms"]}'),
('Barbell Preacher Curls', 'pull', '{"equipment": ["barbell", "bench"], "difficulty": "intermediate", "target": ["biceps"]}'),
('Barbell Shrugs', 'pull', '{"equipment": ["barbell"], "difficulty": "beginner", "target": ["traps", "shoulders"]}'),
('Barbell Upright Rows', 'pull', '{"equipment": ["barbell"], "difficulty": "intermediate", "target": ["shoulders", "traps"]}'),

-- Squat con barra
('Barbell Squats', 'squat', '{"equipment": ["barbell", "power_rack"], "difficulty": "intermediate", "target": ["quads", "glutes", "core"]}'),
('Barbell Front Squats', 'squat', '{"equipment": ["barbell"], "difficulty": "advanced", "target": ["quads", "glutes", "core"]}'),
('Barbell Back Squats', 'squat', '{"equipment": ["barbell", "power_rack"], "difficulty": "intermediate", "target": ["quads", "glutes", "core"]}'),
('Barbell Split Squats', 'squat', '{"equipment": ["barbell"], "difficulty": "advanced", "target": ["quads", "glutes", "core"]}'),
('Barbell Bulgarian Split Squats', 'squat', '{"equipment": ["barbell", "bench"], "difficulty": "advanced", "target": ["quads", "glutes", "core"]}'),

-- Hinge con barra
('Barbell Deadlifts', 'hinge', '{"equipment": ["barbell"], "difficulty": "intermediate", "target": ["hamstrings", "glutes", "lower back", "core"]}'),
('Barbell Romanian Deadlifts', 'hinge', '{"equipment": ["barbell"], "difficulty": "intermediate", "target": ["hamstrings", "glutes", "lower back"]}'),
('Barbell Sumo Deadlifts', 'hinge', '{"equipment": ["barbell"], "difficulty": "intermediate", "target": ["hamstrings", "glutes", "adductors", "core"]}'),
('Barbell Good Mornings', 'hinge', '{"equipment": ["barbell"], "difficulty": "intermediate", "target": ["hamstrings", "lower back"]}'),
('Barbell Hip Thrusts', 'hinge', '{"equipment": ["barbell", "bench"], "difficulty": "intermediate", "target": ["glutes", "hamstrings"]}'),

-- Core con barra
('Barbell Rollouts', 'core', '{"equipment": ["barbell"], "difficulty": "advanced", "target": ["core", "shoulders"]}'),
('Barbell Russian Twists', 'core', '{"equipment": ["barbell"], "difficulty": "intermediate", "target": ["core", "obliques"]}'),
('Barbell Side Bends', 'core', '{"equipment": ["barbell"], "difficulty": "intermediate", "target": ["obliques", "core"]}'),

-- EJERCICIOS CON EZ BAR
INSERT INTO exercises (name, kind, meta) VALUES
('EZ Bar Curls', 'pull', '{"equipment": ["ez_bar"], "difficulty": "beginner", "target": ["biceps", "forearms"]}'),
('EZ Bar Preacher Curls', 'pull', '{"equipment": ["ez_bar", "bench"], "difficulty": "intermediate", "target": ["biceps"]}'),
('EZ Bar Spider Curls', 'pull', '{"equipment": ["ez_bar", "bench"], "difficulty": "intermediate", "target": ["biceps"]}'),
('EZ Bar Skull Crushers', 'push', '{"equipment": ["ez_bar", "bench"], "difficulty": "intermediate", "target": ["triceps"]}'),
('EZ Bar Overhead Extensions', 'push', '{"equipment": ["ez_bar"], "difficulty": "intermediate", "target": ["triceps"]}'),
('EZ Bar Close Grip Press', 'push', '{"equipment": ["ez_bar", "bench"], "difficulty": "intermediate", "target": ["triceps", "chest"]}'),

-- EJERCICIOS CON TRAP BAR
INSERT INTO exercises (name, kind, meta) VALUES
('Trap Bar Deadlifts', 'hinge', '{"equipment": ["trap_bar"], "difficulty": "intermediate", "target": ["hamstrings", "glutes", "lower back", "core"]}'),
('Trap Bar Shrugs', 'pull', '{"equipment": ["trap_bar"], "difficulty": "beginner", "target": ["traps", "shoulders"]}'),
('Trap Bar Farmer\'s Walks', 'core', '{"equipment": ["trap_bar"], "difficulty": "intermediate", "target": ["core", "grip", "shoulders"]}'),
('Trap Bar Jumps', 'squat', '{"equipment": ["trap_bar"], "difficulty": "advanced", "target": ["quads", "glutes", "explosiveness"]}'),

-- EJERCICIOS CON POWER RACK
INSERT INTO exercises (name, kind, meta) VALUES
('Rack Pulls', 'hinge', '{"equipment": ["barbell", "power_rack"], "difficulty": "intermediate", "target": ["hamstrings", "glutes", "lower back"]}'),
('Pin Presses', 'push', '{"equipment": ["barbell", "power_rack"], "difficulty": "advanced", "target": ["chest", "triceps", "explosiveness"]}'),
('Rack Squats', 'squat', '{"equipment": ["barbell", "power_rack"], "difficulty": "intermediate", "target": ["quads", "glutes", "core"]}'),
('Safety Bar Squats', 'squat', '{"equipment": ["barbell", "power_rack"], "difficulty": "intermediate", "target": ["quads", "glutes", "core"]}'),

-- EJERCICIOS CON BANCO
INSERT INTO exercises (name, kind, meta) VALUES
('Incline Barbell Press', 'push', '{"equipment": ["barbell", "incline_bench"], "difficulty": "intermediate", "target": ["chest", "triceps", "shoulders"]}'),
('Decline Barbell Press', 'push', '{"equipment": ["barbell", "bench"], "difficulty": "intermediate", "target": ["chest", "triceps"]}'),
('Barbell Pullovers', 'pull', '{"equipment": ["barbell", "bench"], "difficulty": "intermediate", "target": ["back", "chest"]}'),
('Barbell Hip Thrusts', 'hinge', '{"equipment": ["barbell", "bench"], "difficulty": "intermediate", "target": ["glutes", "hamstrings"]}'),

-- EJERCICIOS CON DIP BARS
INSERT INTO exercises (name, kind, meta) VALUES
('Parallel Bar Dips', 'push', '{"equipment": ["dip_bars"], "difficulty": "intermediate", "target": ["triceps", "chest", "shoulders"]}'),
('L-Sit Dips', 'push', '{"equipment": ["dip_bars"], "difficulty": "advanced", "target": ["triceps", "chest", "core"]}'),
('Ring Dips', 'push', '{"equipment": ["dip_bars"], "difficulty": "advanced", "target": ["triceps", "chest", "stability"]}'),
('Weighted Dips', 'push', '{"equipment": ["dip_bars", "dumbbells"], "difficulty": "advanced", "target": ["triceps", "chest", "shoulders"]}'),

-- VARIACIONES AVANZADAS
INSERT INTO exercises (name, kind, meta) VALUES
('Pause Reps', 'push', '{"equipment": ["barbell"], "difficulty": "advanced", "target": ["strength", "control"], "variation": "pause_at_bottom"}'),
('Tempo Reps', 'push', '{"equipment": ["barbell"], "difficulty": "advanced", "target": ["strength", "control"], "variation": "slow_eccentric"}'),
('Cluster Sets', 'push', '{"equipment": ["barbell"], "difficulty": "advanced", "target": ["strength", "power"], "variation": "short_rest_between_reps"}'),
('Drop Sets', 'push', '{"equipment": ["barbell", "dumbbells"], "difficulty": "advanced", "target": ["muscle_gain", "endurance"], "variation": "decrease_weight_continue"}')
ON CONFLICT (name) DO NOTHING;
