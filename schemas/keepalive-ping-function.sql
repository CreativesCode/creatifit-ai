-- =====================================================================
-- RPC `public.ping()` - endpoint trivial para keepalive.
--
-- Supabase free pausa el proyecto tras ~7 dias sin actividad en la BD.
-- Esta funcion la invoca un GitHub Actions cron diariamente via
-- POST /rest/v1/rpc/ping con la anon key, manteniendo el proyecto activo.
--
-- "Tocar la API REST" no basta: el contador de inactividad mide actividad
-- en la base de datos, no en el edge. Un RPC SQL garantiza que cuente.
--
-- Retorna now() para que el ping sea observable en los logs del workflow.
-- =====================================================================
create or replace function public.ping()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
