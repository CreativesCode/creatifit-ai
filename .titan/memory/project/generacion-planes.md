# Generación de planes

Revisado: 2026-09-10. Código local; secretos/modelo desplegado no consultados.

1. `src/lib/ai/openai.ts` invoca `generate-plan` mediante Supabase. Clave OpenAI solo en servidor.
2. Función verifica JWT con `auth.getUser`, lee `profiles.tier` y aplica límite Free.
3. Consulta directamente `exercises` por equipamiento, siempre incluyendo `NO EQUIPMENT`, hasta 150 filas. No usa `get_filtered_exercises`, pese al comentario inicial antiguo.
4. Lista numerada nombre/músculo + instrucciones RPN/edad/género/nivel/objetivo + restricciones/notas. Modelo devuelve `ref`; servidor resuelve IDs/nombres del catálogo.
5. Chat Completions: default local `gpt-4o` si falta `MODEL_NAME`, `json_object`, temperatura 0.3, hasta dos intentos de 45 s cada uno. Sin backoff explícito; catch también puede reintentar red/timeout.
6. `resolvePlan` descarta referencias inválidas y aplica defaults numéricos. Rechaza cero coincidencias o cero días; no garantiza cuatro días completos.
7. Respuesta `{plan, meta:{matched,total}}`; wrapper cliente valida plan con Zod, pero devuelve solo plan y pierde diagnóstico matched/total.
8. `savePlan` inserta plans y después llama `insert_plan_exercises`; comunica `exercisesInserted`/`exercisesError`. No hay transacción global.

## Contratos y advertencias

- Días A/B/C/D, bloques con ID/nombre, sets, reps[min,max], rest_sec, cues. `savePlan` deriva letra por índice; UI lee `day.day`. Unificar o validar orden sigue pendiente.
- Nombres canónicos no se traducen; focus/cues sí, ES/EN. No usar nombres traducidos para relaciones.
- Prompt pide cuatro días repetidos durante N semanas. “Mejorar plan” basado en historial no equivale a periodización semanal dentro del plan.
- `rpn-config.ts` está duplicado en frontend y función: revisar ambos cuando cambien reglas.
- `schemas/update-insert-plan-exercises.sql` actualiza IDs/reps; depende de `create-plan-exercise-relation.sql`. Archivos fix/verify/test contienen versiones anteriores y acciones SQL: no ejecutar por orden alfabético.
- `DEPLOY.md` y revisión de junio reportan smoke histórico 16/16 bloques con GIF; no es una prueba nueva.
- Falta `json_schema` estricto; servidor valida entrada mínimamente, no todos los límites del cliente.
- Si filtro de equipo falla/no devuelve filas, fallback trae muestra general; puede ignorar equipamiento. Selección no prioriza relevancia. IDs válidos no garantizan respeto de restricciones físicas.
- `FREE_LIMIT_REACHED`: error creado al parsear 402 puede convertirse en mensaje genérico en catch exterior, que solo conserva prefijos “Error”/“No se”. Revisar junto al paywall.
- Sustituir ejercicio actualiza primero payload y luego plan_exercises; segundo fallo solo advierte. Cues se limpian. Puede divergir sesión/media.

Fuentes: `supabase/functions/generate-plan/{index.ts,rpn-config.ts,DEPLOY.md}`, `src/lib/ai/{openai,improve-plan}.ts`, `src/lib/supabase-client.ts`, `src/lib/validators/schemas.ts`.
