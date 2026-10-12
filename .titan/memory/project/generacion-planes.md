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

## Actualización 2026-10-12 (desplegado y probado con una generación real)

Sustituye los puntos 5, 7 y 8 de arriba y la advertencia sobre `FREE_LIMIT_REACHED`.

- **Idempotencia:** el cliente genera el id del plan antes de llamar y lo envía como `requestId`. La función reserva una fila `pending` en `plan_generations`, llama a OpenAI y guarda el plan como `ok` antes de responder. Mismo `requestId` otra vez: devuelve el plan guardado (`reused`) sin llamar a OpenAI. Mismo id aún en curso: 409 `GENERATION_IN_PROGRESS` y el cliente espera y reintenta.
- **Cliente (`src/lib/ai/openai.ts`):** guarda el id pendiente en el dispositivo ligado a la huella del cuestionario, lo reutiliza si el usuario reintenta la misma petición y lo borra al guardar el plan. Ante red caída reintenta con el mismo id hasta ~2 min. `savePlan` trata un plan ya existente (23505) como guardado.
- **Límites:** Free 1 generación (cuenta también los planes anteriores a la tabla); Pro 30 cada 30 días (`PRO_LIMIT_REACHED`, 429). Las `pending` de menos de 3 min cuentan, para que dos peticiones simultáneas no pasen a la vez.
- **Coste:** modelo desplegado `gpt-4o-mini`; `max_tokens` 4096; timeout 75 s sin reintento (solo se reintenta si OpenAI rechaza con 429/5xx). Prueba real: 12 s, 2.401 tokens de entrada y 1.056 de salida, 16/16 ejercicios resueltos.
- **Catálogo (2026-10-12, sustituye el punto 3 de arriba):** se leen todos los ejercicios compatibles con el equipo (por páginas) y se envía al modelo una muestra de 150 repartida entre categorías, con semilla en el `requestId`. Antes eran las primeras 150 filas sin orden y los planes repetían siempre los mismos ejercicios.
- **Validación (2026-10-12, sustituye el punto 6):** `resolvePlan` descarta refs inventadas y ejercicios repetidos en el día, acota series/reps/descanso, limita a 2 indicaciones cortas, descarta días con menos de 3 ejercicios, rechaza planes con menos de 2 días y etiqueta los días A, B, C por posición (resuelve la discrepancia con `savePlan`). `meta` incluye `days` y `days_returned`.
- **Restricciones físicas (2026-10-12):** `exercises.movement_flags` marca saltos, alto impacto y cargas pesadas con reglas sobre el nombre (`schemas/add-exercise-movement-flags.sql`, con trigger). `generate-plan` excluye del catálogo lo marcado con una restricción activa. Para cambiar las reglas se edita la función SQL `exercise_movement_flags` y se vuelve a ejecutar el archivo. Añadir una restricción nueva exige: clave en el cuestionario, marca en esa función y nombre en `MOVEMENT_FLAGS` de la Edge Function.
- **Cuestionario (2026-10-12):** decisión: no se usa la tabla `intake` (0 filas); las respuestas viven en `payload.meta` de cada plan, de donde las leen el panel admin y el propio cuestionario para abrirse ya relleno. Si se quisiera editar el perfil sin generar un plan, habría que empezar a escribir `intake`.
- **Equipo (2026-10-12):** `isAvailable` en `generate-plan` decide ejercicio a ejercicio: "Full Gym" (presente en casi todo el catálogo) se ignora, "NO EQUIPMENT" marca el peso corporal y el resto de aparatos deben estar todos cubiertos por lo que marcó el usuario (`TOKEN_NEEDS`), más reglas por nombre (`NAME_NEEDS`). Lo que no tiene equivalencia (máquinas, poleas…) exige `full_gym`. Al añadir una opción de equipo: constante en `equipment.ts`, clave en `EquipmentSchema`, traducción y entrada en `TOKEN_NEEDS`.
- **Imágenes:** un ejercicio con `gif_url` NULL no se ofrece al modelo.
- **Espera en pantalla (2026-10-12):** `GeneratingOverlay` en `intake-form.tsx` (paso actual, barra aproximada, aviso de conexión lenta a los 30 s). No se vio en vivo. El cuestionario guarda un borrador en `sessionStorage` y el Atrás del teléfono retrocede un paso.

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
