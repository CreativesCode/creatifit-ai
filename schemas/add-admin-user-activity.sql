-- Actividad por usuario para el panel de administracion (seguimiento del piloto).
-- Una sola consulta agregada en vez de traer todas las filas de plans al servidor
-- de funciones. Solo la puede ejecutar service_role (la Edge Function admin-api).
--
-- Idempotente. Aplicar con: scripts/run-sql.ps1 -SqlFile schemas/add-admin-user-activity.sql

CREATE OR REPLACE FUNCTION public.admin_user_activity()
RETURNS TABLE (
  user_id uuid,
  plan_count bigint,
  session_count bigint,
  set_count bigint,
  last_workout timestamptz,
  generation_count bigint,
  last_sign_in timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    (SELECT count(*) FROM public.plans p WHERE p.user_id::text = u.id::text),
    (SELECT count(DISTINCT w.session_id) FROM public.workout_logs w WHERE w.user_id = u.id),
    (SELECT count(*) FROM public.workout_logs w WHERE w.user_id = u.id),
    (SELECT max(w."timestamp") FROM public.workout_logs w WHERE w.user_id = u.id),
    (SELECT count(*) FROM public.plan_generations g WHERE g.user_id = u.id AND g.status = 'ok'),
    u.last_sign_in_at
  FROM auth.users u;
$$;

REVOKE ALL ON FUNCTION public.admin_user_activity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_activity() TO service_role;
