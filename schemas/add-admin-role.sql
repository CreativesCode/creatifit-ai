-- Rol de administrador en `profiles`.
--
-- `is_admin` marca las cuentas con acceso al panel /admin. Igual que `tier`
-- (ver add-subscription-tier.sql), es una columna PROTEGIDA: el usuario puede
-- LEER su propio valor (para que el cliente decida si muestra el panel) pero NO
-- puede modificarlo desde el cliente. Solo el service_role (la Edge Function
-- `admin-api`) lo escribe, así nadie se auto-concede admin.
--
-- Ejecutar en el SQL Editor de Supabase (o `supabase db push`).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Anti-escalada de privilegios: revocamos el UPDATE a nivel de COLUMNA sobre
-- `is_admin` para `authenticated`/`anon`. El service_role no se ve afectado.
REVOKE UPDATE (is_admin) ON public.profiles FROM authenticated, anon;

NOTIFY pgrst, 'reload schema';
