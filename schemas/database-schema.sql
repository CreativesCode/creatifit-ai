-- CreatiFit AI Database Schema - VERSION ACTUALIZADA
-- Ejecuta este SQL directamente en el SQL Editor de Supabase
-- Este esquema refleja la estructura actual de la base de datos

-- =====================================================
-- TABLAS PRINCIPALES
-- =====================================================

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de datos de entrada del usuario
CREATE TABLE IF NOT EXISTS public.intake (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  level TEXT NOT NULL,
  age INTEGER NOT NULL,
  weight_kg NUMERIC NOT NULL,
  height_cm INTEGER NOT NULL,
  equipment JSONB DEFAULT '{}',
  steps_day INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de planes de entrenamiento
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  weeks INTEGER NOT NULL,
  version INTEGER DEFAULT 1,
  source_hash TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de días del plan
CREATE TABLE IF NOT EXISTS public.plan_days (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  plan_id TEXT REFERENCES public.plans(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  focus TEXT NOT NULL
);

-- Tabla de ejercicios
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  gif_url TEXT,
  equipment TEXT NOT NULL DEFAULT '',
  primary_muscles TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  overview TEXT,
  instructions TEXT[] DEFAULT ARRAY[]::text[],
  tips TEXT[] DEFAULT ARRAY[]::text[],
  benefits TEXT[] DEFAULT ARRAY[]::text[],
  muscle_groups_primary TEXT[] DEFAULT ARRAY[]::text[],
  muscle_groups_secondary TEXT[] DEFAULT ARRAY[]::text[],
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de categorías de ejercicios
CREATE TABLE IF NOT EXISTS public.exercise_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de relación ejercicio-categoría (muchos a muchos)
CREATE TABLE IF NOT EXISTS public.exercise_category_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.exercise_categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exercise_name, category_id)
);

-- Tabla de detalles de músculos por ejercicio
CREATE TABLE IF NOT EXISTS public.exercise_muscles_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  muscle_name TEXT NOT NULL,
  muscle_group TEXT NOT NULL CHECK (muscle_group = ANY (ARRAY['primary', 'secondary'])),
  muscle_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de ejercicios del día
CREATE TABLE IF NOT EXISTS public.day_exercises (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  day_id TEXT REFERENCES public.plan_days(id) ON DELETE CASCADE,
  exercise_id TEXT REFERENCES public.exercises(id) ON DELETE CASCADE,
  target_sets INTEGER NOT NULL,
  target_reps_lo INTEGER NOT NULL,
  target_reps_hi INTEGER NOT NULL,
  rest_sec INTEGER NOT NULL,
  cues JSONB DEFAULT '[]'
);

-- Tabla de logs de entrenamiento
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  target_reps TEXT[] NOT NULL,
  actual_reps INTEGER NOT NULL,
  weight NUMERIC,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  notes TEXT,
  plan_day_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id UUID DEFAULT gen_random_uuid()
);

-- =====================================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- =====================================================

-- Índices para perfiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Índices para intake
CREATE INDEX IF NOT EXISTS idx_intake_user_id ON public.intake(user_id);

-- Índices para planes
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON public.plans(created_at);

-- Índices para días del plan
CREATE INDEX IF NOT EXISTS idx_plan_days_plan_id ON public.plan_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_days_day_index ON public.plan_days(day_index);

-- Índices para ejercicios
CREATE INDEX IF NOT EXISTS idx_exercises_name ON public.exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_kind ON public.exercises(kind);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON public.exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscles ON public.exercises(primary_muscles);
CREATE INDEX IF NOT EXISTS idx_exercises_updated_at ON public.exercises(updated_at);

-- Índices para categorías
CREATE INDEX IF NOT EXISTS idx_exercise_categories_name ON public.exercise_categories(name);

-- Índices para relaciones ejercicio-categoría
CREATE INDEX IF NOT EXISTS idx_exercise_category_relations_exercise_name ON public.exercise_category_relations(exercise_name);
CREATE INDEX IF NOT EXISTS idx_exercise_category_relations_category_id ON public.exercise_category_relations(category_id);
CREATE INDEX IF NOT EXISTS idx_exercise_category_relations_is_primary ON public.exercise_category_relations(is_primary);

-- Índices para músculos
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_detail_exercise_id ON public.exercise_muscles_detail(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_detail_muscle_group ON public.exercise_muscles_detail(muscle_group);

-- Índices para ejercicios del día
CREATE INDEX IF NOT EXISTS idx_day_exercises_day_id ON public.day_exercises(day_id);
CREATE INDEX IF NOT EXISTS idx_day_exercises_exercise_id ON public.day_exercises(exercise_id);

-- Índices para logs de entrenamiento
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON public.workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_session_id ON public.workout_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_timestamp ON public.workout_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_workout_logs_exercise_name ON public.workout_logs(exercise_name);
CREATE INDEX IF NOT EXISTS idx_workout_logs_plan_day_id ON public.workout_logs(plan_day_id);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en ejercicios
DROP TRIGGER IF EXISTS trigger_exercises_updated_at ON public.exercises;
CREATE TRIGGER trigger_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_exercises_updated_at();

-- Función para insertar músculos de ejercicio
CREATE OR REPLACE FUNCTION insert_exercise_muscles(
  p_exercise_id UUID,
  p_primary_muscles TEXT[],
  p_secondary_muscles TEXT[]
)
RETURNS VOID AS $$
DECLARE
  muscle TEXT;
BEGIN
  -- Limpiar músculos existentes
  DELETE FROM public.exercise_muscles_detail WHERE exercise_id = p_exercise_id;
  
  -- Insertar músculos primarios
  IF p_primary_muscles IS NOT NULL THEN
    FOREACH muscle IN ARRAY p_primary_muscles
    LOOP
      INSERT INTO public.exercise_muscles_detail (exercise_id, muscle_name, muscle_group)
      VALUES (p_exercise_id, muscle, 'primary');
    END LOOP;
  END IF;
  
  -- Insertar músculos secundarios
  IF p_secondary_muscles IS NOT NULL THEN
    FOREACH muscle IN ARRAY p_secondary_muscles
    LOOP
      INSERT INTO public.exercise_muscles_detail (exercise_id, muscle_name, muscle_group)
      VALUES (p_exercise_id, muscle, 'secondary');
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista para ejercicios con información completa
CREATE OR REPLACE VIEW public.exercises_complete AS
SELECT 
  e.*,
  ARRAY_AGG(DISTINCT ec.name) FILTER (WHERE ecr.is_primary = true) as primary_categories,
  ARRAY_AGG(DISTINCT ec.name) FILTER (WHERE ecr.is_primary = false) as secondary_categories,
  ARRAY_AGG(DISTINCT emd.muscle_name) FILTER (WHERE emd.muscle_group = 'primary') as detailed_primary_muscles,
  ARRAY_AGG(DISTINCT emd.muscle_name) FILTER (WHERE emd.muscle_group = 'secondary') as detailed_secondary_muscles
FROM public.exercises e
LEFT JOIN public.exercise_category_relations ecr ON e.name = ecr.exercise_name
LEFT JOIN public.exercise_categories ec ON ecr.category_id = ec.id
LEFT JOIN public.exercise_muscles_detail emd ON e.id = emd.exercise_id
GROUP BY e.id, e.name, e.kind, e.gif_url, e.equipment, e.primary_muscles, e.category, 
         e.overview, e.instructions, e.tips, e.benefits, e.muscle_groups_primary, 
         e.muscle_groups_secondary, e.meta, e.created_at, e.updated_at;

-- =====================================================
-- SEGURIDAD (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_category_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_muscles_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para intake
CREATE POLICY "Users can view own intake" ON public.intake
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own intake" ON public.intake
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intake" ON public.intake
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para planes
CREATE POLICY "Users can view own plans" ON public.plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans" ON public.plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para días del plan
CREATE POLICY "Users can view own plan days" ON public.plan_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.plans WHERE plans.id = plan_days.plan_id AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own plan days" ON public.plan_days
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plans WHERE plans.id = plan_days.plan_id AND plans.user_id = auth.uid()
    )
  );

-- Políticas para ejercicios (lectura pública)
CREATE POLICY "Anyone can view exercises" ON public.exercises
  FOR SELECT USING (true);

-- Políticas para categorías (lectura pública)
CREATE POLICY "Anyone can view exercise categories" ON public.exercise_categories
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view exercise category relations" ON public.exercise_category_relations
  FOR SELECT USING (true);

-- Políticas para músculos (lectura pública)
CREATE POLICY "Anyone can view exercise muscles detail" ON public.exercise_muscles_detail
  FOR SELECT USING (true);

-- Políticas para ejercicios del día
CREATE POLICY "Users can view own day exercises" ON public.day_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.plan_days pd 
      JOIN public.plans p ON pd.plan_id = p.id 
      WHERE pd.id = day_exercises.day_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own day exercises" ON public.day_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_days pd 
      JOIN public.plans p ON pd.plan_id = p.id 
      WHERE pd.id = day_exercises.day_id AND p.user_id = auth.uid()
    )
  );

-- Políticas para logs de entrenamiento
CREATE POLICY "Users can view own workout logs" ON public.workout_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout logs" ON public.workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- DATOS INICIALES (OPCIONAL)
-- =====================================================

-- Insertar algunas categorías básicas de ejercicios
INSERT INTO public.exercise_categories (name, description) VALUES
  ('Chest', 'Ejercicios para el pecho'),
  ('Back', 'Ejercicios para la espalda'),
  ('Legs', 'Ejercicios para las piernas'),
  ('Shoulders', 'Ejercicios para los hombros'),
  ('Arms', 'Ejercicios para brazos'),
  ('Core', 'Ejercicios para el núcleo'),
  ('Cardio', 'Ejercicios cardiovasculares'),
  ('Flexibility', 'Ejercicios de flexibilidad'),
  ('Strength', 'Ejercicios de fuerza'),
  ('General', 'Ejercicios generales')
ON CONFLICT (name) DO NOTHING;

-- Insertar algunos ejercicios de ejemplo
INSERT INTO public.exercises (name, kind, category, equipment, primary_muscles, overview) VALUES
  ('Push-ups', 'strength', 'Chest', 'Bodyweight', 'Chest, Triceps', 'Ejercicio básico de empuje para el pecho'),
  ('Pull-ups', 'strength', 'Back', 'Bodyweight', 'Back, Biceps', 'Ejercicio de tracción para la espalda'),
  ('Squats', 'strength', 'Legs', 'Bodyweight', 'Quadriceps, Glutes', 'Ejercicio fundamental para las piernas'),
  ('Plank', 'strength', 'Core', 'Bodyweight', 'Core, Shoulders', 'Ejercicio isométrico para el núcleo'),
  ('Mountain Climbers', 'cardio', 'Cardio', 'Bodyweight', 'Core, Shoulders', 'Ejercicio cardiovascular dinámico')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

-- Este esquema incluye:
-- ✅ Todas las tablas actuales de la base de datos
-- ✅ Índices optimizados para rendimiento
-- ✅ Funciones y triggers útiles
-- ✅ Vista para ejercicios completos
-- ✅ Políticas de seguridad (RLS) configuradas
-- ✅ Datos iniciales básicos
-- ✅ Restricciones y validaciones apropiadas

-- Para usar este esquema:
-- 1. Ejecuta este SQL en el SQL Editor de Supabase
-- 2. Verifica que todas las tablas se creen correctamente
-- 3. Revisa que los índices y políticas estén activos
-- 4. Confirma que la vista exercises_complete funcione
