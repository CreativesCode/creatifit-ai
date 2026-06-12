-- Favoritos de ejercicios por usuario (corazón en el detalle + filtro del listado).
-- Owner-only vía RLS; user_id lo pone el DEFAULT auth.uid() al insertar.
-- NOTA: exercises.id es UUID según database-schema.sql. Si en el DB live fuera
-- TEXT, cambia el tipo de exercise_id a TEXT antes de ejecutar.

CREATE TABLE IF NOT EXISTS public.exercise_favorites (
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exercise_id)
);

ALTER TABLE public.exercise_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON public.exercise_favorites;
CREATE POLICY "favorites_select_own" ON public.exercise_favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON public.exercise_favorites;
CREATE POLICY "favorites_insert_own" ON public.exercise_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete_own" ON public.exercise_favorites;
CREATE POLICY "favorites_delete_own" ON public.exercise_favorites
  FOR DELETE USING (auth.uid() = user_id);
