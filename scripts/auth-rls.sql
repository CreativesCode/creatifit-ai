-- Auth + RLS para CreatiFit AI
-- Activa seguridad por usuario en plans / plan_exercises / workout_logs.
SET statement_timeout = 0;

-- 1) Crear automaticamente un perfil al registrarse (plans/intake referencian profiles).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Backfill: perfiles para usuarios que ya existan sin perfil.
INSERT INTO public.profiles (id, email)
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 3) Default user_id = auth.uid() (robustez en inserts).
ALTER TABLE public.plans        ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.workout_logs ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.intake       ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 4) plan_exercises: politica por propietario (a traves del plan). RPC es SECURITY INVOKER.
DROP POLICY IF EXISTS "Users manage own plan_exercises" ON public.plan_exercises;
CREATE POLICY "Users manage own plan_exercises" ON public.plan_exercises
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_exercises.plan_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_exercises.plan_id AND p.user_id = auth.uid()));

-- 5) Activar RLS en las tablas de usuario.
ALTER TABLE public.plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs   ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
