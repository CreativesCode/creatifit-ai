-- Permite que el dueno de un plan lo ELIMINE (RLS).
--
-- Contexto: la lista de planes necesita poder borrar un plan. Hasta ahora
-- `plans` solo tenia politicas de SELECT, INSERT y UPDATE, por lo que cualquier
-- DELETE era rechazado silenciosamente por RLS (0 filas afectadas, sin error).
--
-- Las tablas hijas (plan_days -> plan_exercises) tienen ON DELETE CASCADE, asi
-- que se borran solas. `workout_logs` NO referencia plan_days por FK, asi que el
-- historial de entrenamientos se conserva aunque se borre el plan.
--
-- Ejecutar una vez (via scripts/run-sql.ps1 o el SQL editor de Supabase).

DROP POLICY IF EXISTS "Users can delete own plans" ON public.plans;
CREATE POLICY "Users can delete own plans" ON public.plans
  FOR DELETE
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
