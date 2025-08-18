-- CreatiFit AI Database Schema
-- Ejecuta este SQL directamente en el SQL Editor de Supabase

-- Nota: app.jwt_secret se configura automáticamente en Supabase

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create intake table
CREATE TABLE IF NOT EXISTS intake (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  objective TEXT NOT NULL,
  level TEXT NOT NULL,
  age INTEGER NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  height_cm INTEGER NOT NULL,
  equipment JSONB DEFAULT '{}',
  steps_day INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  weeks INTEGER NOT NULL,
  version INTEGER DEFAULT 1,
  source_hash TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plan_days table
CREATE TABLE IF NOT EXISTS plan_days (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  focus TEXT NOT NULL
);

-- Create exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT UNIQUE NOT NULL,
  kind TEXT NOT NULL,
  meta JSONB DEFAULT '{}'
);

-- Create day_exercises table
CREATE TABLE IF NOT EXISTS day_exercises (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  day_id TEXT REFERENCES plan_days(id) ON DELETE CASCADE,
  exercise_id TEXT REFERENCES exercises(id) ON DELETE CASCADE,
  target_sets INTEGER NOT NULL,
  target_reps_lo INTEGER NOT NULL,
  target_reps_hi INTEGER NOT NULL,
  rest_sec INTEGER NOT NULL,
  cues JSONB DEFAULT '[]'
);

-- Create workout_logs table
CREATE TABLE IF NOT EXISTS workout_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  day_ex_id TEXT REFERENCES day_exercises(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  load DECIMAL(5,2),
  rpe DECIMAL(3,1),
  notes TEXT,
  ts TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_days_plan_id ON plan_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_ts ON workout_logs(ts);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own intake" ON intake
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own intake" ON intake
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intake" ON intake
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own plans" ON plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans" ON plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own plan days" ON plan_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plans WHERE plans.id = plan_days.plan_id AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own plan days" ON plan_days
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans WHERE plans.id = plan_days.plan_id AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view exercises" ON exercises
  FOR SELECT USING (true);

CREATE POLICY "Users can view own day exercises" ON day_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plan_days pd 
      JOIN plans p ON pd.plan_id = p.id 
      WHERE pd.id = day_exercises.day_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own day exercises" ON day_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM plan_days pd 
      JOIN plans p ON pd.plan_id = p.id 
      WHERE pd.id = day_exercises.day_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own workout logs" ON workout_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout logs" ON workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert some sample exercises
INSERT INTO exercises (name, kind) VALUES
  ('Push-ups', 'push'),
  ('Pull-ups', 'pull'),
  ('Squats', 'squat'),
  ('Deadlift', 'hinge'),
  ('Plank', 'core'),
  ('Mountain Climbers', 'cardio')
ON CONFLICT (name) DO NOTHING;
