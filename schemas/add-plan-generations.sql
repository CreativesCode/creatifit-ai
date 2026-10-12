-- Registro de generaciones de plan (IA). Lo escribe SOLO la Edge Function
-- generate-plan con service role. Sirve para tres cosas:
--   1. Idempotencia: el cliente envia un request_id; si la respuesta se pierde por
--      la red, el reintento con el mismo id devuelve el plan guardado sin volver a
--      llamar (ni pagar) a OpenAI.
--   2. Limites: el cupo Free y el tope mensual Pro se cuentan sobre generaciones
--      reales, no sobre los planes que queden en la tabla plans.
--   3. Coste: tokens y modelo por generacion y por usuario.
--
-- Idempotente. Aplicar con: scripts/run-sql.ps1 -SqlFile schemas/add-plan-generations.sql

CREATE TABLE IF NOT EXISTS public.plan_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ok', 'failed')),
  model text,
  prompt_tokens integer,
  completion_tokens integer,
  plan jsonb,
  meta jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  UNIQUE (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS plan_generations_user_created_idx
  ON public.plan_generations (user_id, created_at DESC);

ALTER TABLE public.plan_generations ENABLE ROW LEVEL SECURITY;

-- El usuario puede ver sus generaciones (contador de cupo); nunca escribirlas.
REVOKE ALL ON public.plan_generations FROM authenticated, anon;
GRANT SELECT (id, request_id, status, created_at, finished_at) ON public.plan_generations TO authenticated;

DROP POLICY IF EXISTS "Users can view own plan generations" ON public.plan_generations;
CREATE POLICY "Users can view own plan generations" ON public.plan_generations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
