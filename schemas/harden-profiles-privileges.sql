-- Bloquea que un usuario escriba en su propia fila de profiles.
--
-- add-subscription-tier.sql y add-admin-role.sql revocaban UPDATE solo sobre las
-- columnas tier e is_admin, pero un REVOKE de columna no tiene efecto mientras el
-- rol conserve UPDATE a nivel de tabla (Supabase lo concede por defecto). Con la
-- politica "Users can update own profile" cualquier usuario podia ponerse Pro o
-- admin. El cliente nunca actualiza profiles: tier lo escriben el webhook de
-- RevenueCat y admin-api con service role, que no se ve afectado por esto.
--
-- Idempotente. Aplicar con: scripts/run-sql.ps1 -SqlFile schemas/harden-profiles-privileges.sql

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM authenticated, anon;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
