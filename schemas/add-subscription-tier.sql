-- Suscripción: tier del usuario en `profiles`.
--
-- El `tier` lo escribe SOLO el servidor (la Edge Function `revenuecat-webhook`,
-- que usa la service role key y por tanto ignora RLS y los REVOKE de abajo).
-- El cliente puede LEER su tier pero NO modificarlo: así nadie se auto-concede Pro.
--
-- Valores: 'free' | 'pro_monthly' | 'pro_annual' (espejo de src/lib/config/plans-config.ts).
--
-- Ejecutar en el SQL Editor de Supabase (o `supabase db push`).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_updated_at TIMESTAMP WITH TIME ZONE;

-- Anti-escalada de privilegios: la policy "Users can update own profile" permite
-- al usuario editar su fila. Revocamos el UPDATE a nivel de COLUMNA sobre `tier`
-- para que no pueda ponerse Pro a sí mismo. El service_role no se ve afectado.
REVOKE UPDATE (tier) ON public.profiles FROM authenticated, anon;

-- Índice para contar/filtrar planes por usuario rápido en el enforcement.
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans(user_id);

NOTIFY pgrst, 'reload schema';
