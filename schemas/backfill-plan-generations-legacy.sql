-- Los planes creados antes de existir plan_generations no tienen generación
-- registrada. Esta carga les da una fila 'ok' para que el cupo de IA pueda
-- contarse SOLO sobre plan_generations y dejar de mirar la tabla plans (un plan
-- hecho a mano no debe gastar cupo).
--
-- APLICAR ANTES de desplegar la versión de generate-plan que ya no cuenta
-- planes: en el orden contrario, las cuentas Free con planes antiguos recuperan
-- una generación gratis.
--
-- Los planes manuales (payload.meta.source = 'manual') se excluyen, así que
-- volver a ejecutarlo más adelante no les cobra nada.
--
-- Idempotente. Aplicar con: scripts/run-sql.ps1 -SqlFile schemas/backfill-plan-generations-legacy.sql

INSERT INTO public.plan_generations
  (user_id, request_id, status, meta, created_at, finished_at)
SELECT
  p.user_id,
  p.id,
  'ok',
  '{"legacy": true}'::jsonb,
  p.created_at,
  p.created_at
FROM public.plans p
WHERE p.user_id IS NOT NULL
  AND COALESCE(
    (CASE
       -- Algunos planes antiguos guardan el payload como texto JSON.
       WHEN jsonb_typeof(p.payload) = 'string' THEN (p.payload #>> '{}')::jsonb
       ELSE p.payload
     END) #>> '{meta,source}',
    'ai'
  ) <> 'manual'
ON CONFLICT (user_id, request_id) DO NOTHING;
