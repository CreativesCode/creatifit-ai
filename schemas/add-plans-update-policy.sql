-- Permite que el dueño de un plan lo ACTUALICE (RLS).
--
-- Contexto: la app necesita poder editar un plan ya creado (p. ej. cambiar un
-- ejercicio por otro similar). La sesión de entrenamiento lee los ejercicios
-- desde `plans.payload`, así que el cambio debe persistirse ahí. Hasta ahora
-- `plans` solo tenía políticas de SELECT e INSERT, por lo que cualquier UPDATE
-- era rechazado por RLS.
--
-- Ejecutar una vez en el SQL editor de Supabase (o vía CLI):
--   supabase db execute -f schemas/add-plans-update-policy.sql

DROP POLICY IF EXISTS "Users can update own plans" ON public.plans;
CREATE POLICY "Users can update own plans" ON public.plans
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
