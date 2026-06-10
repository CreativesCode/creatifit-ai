# Despliegue de `generate-plan` (plan anclado al catálogo real)

Esta función vuelve a inyectar los ejercicios reales de la BD en el prompt y resuelve
cada ejercicio a su `exercise_id` (GIF/músculos/equipo). Para que surta efecto hay que
aplicar **dos cosas**: la migración SQL y el redeploy de la función.

## 1. Aplicar la migración SQL

En Supabase → SQL Editor, ejecuta el contenido de:

    schemas/update-insert-plan-exercises.sql

Redefine `insert_plan_exercises` para usar el `exercise_id` que ahora envía la función
(con respaldo por nombre) y corrige la extracción de `reps`.

> Requisito previo (si aún no existe): haber ejecutado antes
> `schemas/create-plan-exercise-relation.sql` (tabla `plan_exercises` + RPC de lectura).
>
> Nota: la Edge Function ya **no** depende de `get_filtered_exercises` (resultaba frágil
> y devolvía 0 filas). Ahora consulta la tabla `exercises` directamente por `equipment`.

## 2. Secrets de la función

La función usa OpenAI y el cliente de Supabase. `SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente en las Edge Functions;
solo necesitas configurar OpenAI:

    supabase secrets set OPENAI_API_KEY=sk-...
    supabase secrets set MODEL_NAME=gpt-4o      # opcional; por defecto gpt-4o

## 3. Desplegar la función

    supabase functions deploy generate-plan

## 4. Verificar

Genera un plan desde la app y comprueba en `plan_exercises` que `exercise_id` ya NO es
NULL. La respuesta de la función incluye `meta: { matched, total }` con cuántos
ejercicios se enlazaron.

    select day_letter, exercise_name, exercise_id
    from plan_exercises
    where plan_id = '<id-del-plan-generado>'
    order by day_letter, block_index;

## Qué cambió (resumen técnico)

- La función consulta la tabla `exercises` directamente filtrando por el `equipment` del
  usuario (texto libre tipo "Dumbbells, Full Gym") y pasa a GPT una **lista numerada** con
  el músculo primario de cada ejercicio.
- GPT referencia cada ejercicio por su número (`ref`), nunca por nombre libre → no puede
  inventar ejercicios.
- El servidor resuelve `ref → { exercise_id, name }` canónicos antes de devolver el plan, y
  devuelve `meta: { matched, total }`.
- Se añadieron: instrucciones RPN (nivel/objetivo/edad/género), restricciones del usuario,
  notas, `temperature: 0.3`, timeout de 45s y 1 reintento ante 429/5xx.
- Modelo por defecto `gpt-4o` (configurable con el secret `MODEL_NAME`).

Verificado en producción: smoke test con perfil strength/intermediate/dumbbells →
16/16 bloques resueltos a ejercicios reales con `gif_url`.

## Pendiente / mejora futura (no bloqueante)

- Relevancia: la selección de 150 ejercicios por equipamiento no prioriza por objetivo/
  músculo (el catálogo es 99% `kind=strength`). Para afinar, se podría rankear por
  `primary_muscles` según el objetivo. Ver `REVISION-MEJORAS.md` §B-AI.
- `MODEL_NAME` sigue apuntando al valor previo del secret; si quieres forzar `gpt-4o`,
  ejecútalo: `supabase secrets set MODEL_NAME=gpt-4o`.
- Migrar `response_format` a `json_schema` (strict) para garantía de forma total.
