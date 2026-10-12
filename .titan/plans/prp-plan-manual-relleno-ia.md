# PRP-001: Plan manual desde el catálogo + relleno con IA

> **Estado**: APROBADO (2026-10-12) — en ejecución, ver "Progreso"
> **Fecha**: 2026-10-12
> **Proyecto**: Creatifit AI
> **Base de código**: `959c9d7` (main)

---

## Objetivo

Que cualquier usuario pueda crear y editar un plan de entrenamiento a mano, eligiendo ejercicios del catálogo y ajustando series, repeticiones y descanso, con el mismo editor para planes manuales y planes generados por IA. Dentro de ese editor, "Rellenar con IA" completa un día o el plan entero a partir de opciones estructuradas (objetivo + zona muscular).

## Por Qué

| Problema | Solución |
|----------|----------|
| Hoy un plan solo nace del cuestionario + IA. Un usuario Free que ya gastó su única generación no puede crear nada más | Planes manuales ilimitados para todos los tiers; solo se limita lo que llama a la IA |
| Un plan de IA solo admite cambiar un ejercicio por otro "similar" de la misma categoría. No se pueden añadir, quitar ni reordenar ejercicios o días, ni tocar series/reps/descanso | Editor completo que sirve para cualquier plan |
| Quien ya tiene su rutina (la del gimnasio, la de un entrenador) no puede pasarla a la app | Crear plan vacío y montarlo desde el catálogo |
| La IA solo se usa para generar el plan entero, con un cuestionario largo | Relleno puntual por día o plan con dos elecciones (objetivo, zona) |
| En Cuba Google Play no cobra: Pro solo llega por asignación manual, así que casi todos los testers son Free con 1 generación | El piloto puede seguir usando la app después de la primera generación |

**Valor de negocio**: retención de usuarios Free tras su única generación (hoy la app deja de ofrecerles planes nuevos) y más superficie para el paywall: cada "Rellenar con IA" y cada "Mejorar plan" es un punto de conversión con valor claro.

## Qué

### Decisiones ya tomadas por el usuario

- Free tiene planes manuales ilimitados. Solo se restringe lo que usa IA, con los límites actuales de `plan_generations` (Free 1 de por vida; Pro 30 cada 30 días).
- "Mejorar plan" sobre un plan manual pide el cuestionario una primera vez y lo guarda para las siguientes.
- "Rellenar con IA" usa opciones estructuradas (objetivo + zona muscular), por día o plan entero. El texto libre es solo una nota opcional.
- Prioridad: móvil (APK Android) y mala conexión.

### Criterios de Éxito

- [ ] Un usuario Free que ya consumió su generación crea, guarda y entrena un plan manual sin ver el paywall.
- [ ] Crear un plan manual no consume cupo de IA: con un plan manual guardado y cero generaciones, el usuario Free todavía puede generar su plan gratuito (hoy no podría, ver Gotchas).
- [ ] En el editor se puede: añadir, quitar y reordenar días; añadir ejercicios desde el catálogo con buscador y filtro por grupo muscular; quitar y reordenar ejercicios; ajustar series, repeticiones (mín/máx) y descanso.
- [ ] El mismo editor abre un plan generado por IA y guarda los cambios.
- [ ] Tras guardar, `plans.payload` y `plan_exercises` coinciden siempre (mismo ejercicio, día y posición): la sesión muestra los ejercicios e imágenes correctos.
- [ ] Un guardado que falla por red no pierde lo editado: el borrador sigue en el teléfono y el reintento no duplica el plan.
- [ ] "Rellenar con IA" completa un día o el plan entero respetando equipo y restricciones, cuenta como una generación en `plan_generations` y un reintento tras un corte de red no cobra otra.
- [ ] En un plan manual sin perfil, "Rellenar con IA" y "Mejorar plan" piden el cuestionario corto una vez; la segunda vez no.
- [ ] Todo el flujo es usable a 360 px de ancho, con el botón Atrás del teléfono y en español e inglés.

### Comportamiento Esperado

**Crear a mano.** En Planes, el botón "+" abre una hoja con dos opciones: "Crear con IA" (cuestionario actual) y "Crear a mano". La segunda pide nombre y semanas y abre el editor con un día A vacío. El usuario toca "Añadir ejercicio", busca o filtra por grupo muscular, toca los ejercicios que quiere y vuelve al día con ellos ya puestos con valores por defecto (3 series, 8-12 reps, 60 s). Ajusta cada uno con controles de +/-, reordena, añade el día B. Toca "Guardar": el plan aparece en la lista y se puede entrenar.

**Editar un plan existente.** El botón "Editar" del detalle del plan abre el mismo editor con el contenido actual, sea de IA o manual.

**Rellenar con IA.** En un día del editor (o en la cabecera, para el plan entero) el usuario toca "Rellenar con IA", elige objetivo y una o varias zonas musculares, opcionalmente escribe una nota corta y confirma. Si el día ya tiene ejercicios elige entre añadir o reemplazar. Ve la pantalla de espera, y el resultado entra en el borrador del editor, donde puede retocarlo antes de guardar.

**Mejorar un plan manual.** Tras al menos un entrenamiento con ese plan aparece "Mejorar plan con mi progreso". Si el plan no tiene perfil guardado se abre el cuestionario corto (nivel, género, edad, peso, altura, equipo, restricciones), ya relleno con las respuestas del plan más reciente que las tenga. Se guarda en el plan y la mejora continúa como hoy.

**Límite alcanzado.** Si una acción de IA topa con el cupo, en la app se abre el paywall de RevenueCat y en web se muestra el mensaje actual. Nada de lo manual se bloquea nunca.

---

## Contexto

### Referencias

Código que este PRP toca o reutiliza:

- `src/app/(app)/plans/page.tsx` (1.202 líneas): lista, detalle, día, cambio de ejercicio y "Mejorar plan". Patrón "estado primero, URL después" para la navegación por query en Capacitor (ver comentario de `dayView`).
- `src/lib/supabase-client.ts`: `savePlan` (insert + RPC `insert_plan_exercises`, trata 23505 como guardado), `swapPlanExercise` (escribe payload y luego `plan_exercises`, sin transacción), `getExercises` (paginado, buscador, categoría), `countPlans`, y las lecturas con copia local (`offlineCapable`).
- `src/lib/ai/openai.ts`: `generateFitnessPlan`, `generationRequestId`, `clearGenerationRequest`. El id pendiente vive en un único hueco (`cf-pending-generation`).
- `src/lib/ai/improve-plan.ts`: `buildImproveIntake` reconstruye el cuestionario desde `payload.meta` con valores por defecto si faltan.
- `src/components/forms/intake-form.tsx`: cuestionario, `GeneratingOverlay`, gating por tier, borrador en `sessionStorage`, Atrás del teléfono por pasos.
- `src/app/(app)/exercises/page.tsx`: buscador, chips de categoría (`Chest`, `Back / Wing`, `Leg`, `Hips`, `Abs / Core`, `Cardio`, `General`) y scroll infinito.
- `src/components/ui/{exercise-image,exercise-detail-view}.tsx`, `src/lib/data-saver.ts`: miniaturas y ahorro de datos.
- `src/lib/{local-cache,workout-outbox}.ts`: copia local por usuario, `newId()` e id generado en el teléfono.
- `src/lib/validators/schemas.ts`, `src/lib/plan-display.ts`, `src/lib/config/plans-config.ts`.
- `supabase/functions/generate-plan/index.ts`: auth, límites, idempotencia, `fetchExercises`, `isAvailable`, `balancedSample`, `resolvePlan`.
- `supabase/functions/admin-api/index.ts`: `userDetail` lee el cuestionario del `payload.meta` del plan más reciente.
- `schemas/update-insert-plan-exercises.sql`, `schemas/create-plan-exercise-relation.sql`, `schemas/add-plans-update-policy.sql`, `schemas/add-plan-generations.sql`, `scripts/auth-rls.sql`.
- Memoria: `.titan/memory/project/{generacion-planes,suscripciones,datos-seguridad}.md` y `.titan/plans/2026-10-12-piloto-cuba-qa.md`.

### Estado actual relevante

- Un plan es una fila de `plans` (`id` TEXT, `weeks`, `source_hash` NOT NULL, `payload` JSONB con `meta` y `days[].blocks[]`) más su desnormalización en `plan_exercises`. La sesión lee los ejercicios de `payload` y las imágenes de `plan_exercises`.
- RLS ya permite al dueño insertar, actualizar y borrar sus planes y sus `plan_exercises`. `insert_plan_exercises` borra y reinserta todo el plan (SECURITY INVOKER).
- El cuestionario no usa la tabla `intake` (0 filas): las respuestas viven en `payload.meta` de cada plan.
- No hay rutas dinámicas (export estático): todo va por query params.
- No hay `supabase/migrations/`: el SQL se versiona en `schemas/` y se aplica con `scripts/run-sql.ps1`.

### Arquitectura Propuesta

El proyecto no es feature-first: se sigue su estructura real (`src/app`, `src/components`, `src/lib`).

```
src/components/plans/
├── plan-editor.tsx          # editor: nombre, semanas, días, borrador, guardar
├── day-editor.tsx           # ejercicios del día: reordenar, quitar, ajustar
├── block-controls.tsx       # series / reps mín-máx / descanso con +/-
├── exercise-picker.tsx      # hoja a pantalla completa: buscador + chips + multiselección
├── create-plan-sheet.tsx    # "Crear con IA" / "Crear a mano"
├── ai-fill-sheet.tsx        # Fase 2: objetivo + zonas + nota
└── ai-profile-form.tsx      # cuestionario corto para planes sin perfil

src/lib/plans/
├── plan-draft.ts            # borrador local por usuario y plan
├── plan-structure.ts        # operaciones puras: añadir/quitar/mover, reetiquetar A..G, límites
└── ai-quota.ts              # cupo de IA usado (sustituye a countPlans en el gating)

src/lib/ai/fill-plan.ts      # llamada de relleno (reutiliza openai.ts)
src/lib/validators/schemas.ts   # + EditablePlanSchema, AiFillSchema
src/lib/supabase-client.ts      # + savePlanStructure; swapPlanExercise pasa a usarlo

supabase/functions/generate-plan/index.ts   # + modo "fill"; límite Free sin contar planes
schemas/add-save-plan-structure.sql         # RPC de guardado atómico
schemas/backfill-plan-generations-legacy.sql
```

`plans/page.tsx` solo gana las entradas al editor; el editor no se escribe dentro de ese archivo.

**Decisiones de arquitectura**

1. **Sin tabla nueva para planes manuales.** Un plan manual es una fila normal de `plans` con `payload.meta.source = "manual"` (ausente = IA), `payload.meta.name` puesto por el usuario y `source_hash = id`. Sesión, historial, progreso y "Mejorar plan" funcionan sin cambios de modelo.
2. **Un único camino de guardado, atómico.** RPC nueva `save_plan_structure(p_plan_id, p_weeks, p_payload)`: crea o actualiza el plan del usuario y reescribe `plan_exercises` derivándolo del payload en la misma transacción, reetiquetando los días A, B, C… por posición. Sustituye a la pareja "update de payload + update de plan_exercises" que hoy puede divergir. Con id generado en el teléfono, repetir la llamada es inocuo.
3. **El cupo de IA deja de mirar la tabla `plans`.** Servidor y cliente cuentan solo `plan_generations`. Los planes anteriores a esa tabla se convierten una vez en filas `ok` con un backfill. Es requisito previo de "manuales ilimitados" (ver primer Gotcha).
4. **El editor trabaja sobre un borrador local** (`cf-plan-draft:<uid>:<planId>` en `localStorage`) y guarda con una sola llamada al pulsar "Guardar". Sin red, el borrador se conserva y se ofrece reintentar. Un plan solo se persiste con al menos un día y ningún día vacío.
5. **"Rellenar con IA" es un modo de `generate-plan`, no otra función.** Reutiliza autenticación, límites, idempotencia por `requestId`, filtro de equipo y restricciones y `resolvePlan`. El resultado entra en el borrador; no se guarda solo.
6. **El perfil para la IA sigue en `payload.meta` del plan.** Coherente con la decisión del 2026-10-12 de no usar `intake`. El cuestionario corto se rellena desde el plan más reciente que tenga perfil.
7. **Navegación por query params** con el patrón "estado primero": `/plans?id=<id>&edit=1` y `/plans?new=1`. El Atrás del teléfono cierra primero la hoja abierta (selector, relleno) y después el editor, avisando si hay cambios sin guardar.

### Modelo de Datos

No se crean tablas ni columnas. Cambia la forma de `payload.meta` y se añade una función.

```jsonc
// plans.payload
{
  "meta": {
    "source": "manual",          // nuevo; ausente = "ai"
    "name": "Mi rutina de casa", // en manuales manda sobre el título por objetivo
    // Perfil para la IA: ausente en un plan manual hasta el primer uso de IA
    "objective": "muscle_gain", "level": "intermediate", "gender": "male",
    "age": 31, "weight_kg": 78, "height_cm": 176,
    "equipment": { "dumbbells": true }, "constraints": { "jumps": false },
    "created_at": "2026-10-12T00:00:00.000Z"
  },
  "weeks": 8,
  "days": [
    { "day": "A", "focus": "Pecho y core",
      "blocks": [ { "exercise_id": "<uuid>", "name": "<nombre canónico>",
                    "sets": 3, "reps": [8, 12], "rest_sec": 60, "cues": [] } ] }
  ]
}
```

```sql
-- schemas/add-save-plan-structure.sql (esbozo; el detalle se define en su fase)
CREATE OR REPLACE FUNCTION public.save_plan_structure(
  p_plan_id TEXT,
  p_weeks   INTEGER,
  p_payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER            -- RLS de plans y plan_exercises sigue mandando
SET search_path = public
AS $$
  -- 1. Validar: 1..7 días, 1..12 bloques por día, series 1-6, reps 1-50,
  --    descanso 15-300 (mismos topes que resolvePlan), exercise_id existente.
  -- 2. Reetiquetar los días A..G por posición y fijar el nombre canónico del
  --    catálogo para cada exercise_id.
  -- 3. INSERT ... ON CONFLICT (id) DO UPDATE sobre plans (user_id = auth.uid()).
  -- 4. DELETE + INSERT de plan_exercises a partir del payload ya normalizado.
  -- 5. Devolver el payload guardado.
$$;

REVOKE ALL ON FUNCTION public.save_plan_structure(TEXT, INTEGER, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_plan_structure(TEXT, INTEGER, JSONB) TO authenticated;
```

```sql
-- schemas/backfill-plan-generations-legacy.sql (esbozo)
-- Una fila 'ok' por cada plan sin generación registrada, para que el límite
-- Free pueda dejar de contar la tabla plans. Idempotente por (user_id, request_id).
INSERT INTO public.plan_generations (user_id, request_id, status, created_at, finished_at)
SELECT p.user_id, p.id, 'ok', p.created_at, p.created_at
FROM public.plans p
WHERE p.user_id IS NOT NULL
ON CONFLICT (user_id, request_id) DO NOTHING;
```

**Contrato del modo relleno de `generate-plan`**

```jsonc
// petición
{
  "mode": "fill",
  "requestId": "<uuid del teléfono>",
  "scope": "day",                      // "day" | "plan"
  "days": 1,                           // 1 si scope=day; 2-7 si scope=plan
  "blocks": 5,                         // ejercicios por día, 3-8
  "objective": "muscle_gain",          // mismo enum que el cuestionario
  "zones": ["Chest", "Abs / Core"],    // categorías del catálogo; vacío = cuerpo completo
  "exclude": ["<uuid>", "..."],        // ya presentes en el día (modo añadir)
  "note": "sin ejercicios en el suelo",// opcional, máx. 200 caracteres
  "level": "...", "gender": "...", "age": 0, "weightKg": 0, "heightCm": 0,
  "equipment": {}, "constraints": {}, "language": "es"
}
// respuesta: la misma de hoy -> { plan: { days: [...] }, meta, requestId, reused? }
```

---

## Blueprint (Assembly Line)

> Solo fases. Las subtareas se generan al entrar a cada fase con `/tf-bucle-agentico`
> (mapear contexto, generar subtareas, ejecutar). Las fases 1 a 5 son la Fase 1 del
> producto (editor manual) y se pueden entregar sin las 6 a 8 (IA).

### Fase 1: Cupo de IA independiente de los planes guardados
**Objetivo**: el límite Free y el gating del cliente cuentan generaciones (`plan_generations`), no filas de `plans`. Backfill de los planes anteriores a esa tabla, `generate-plan` sin el recuento de `plans`, y `ai-quota.ts` en lugar de `countPlans()` en el cuestionario y en "Mejorar plan".
**Validación**: con una cuenta Free sin generaciones y un plan insertado a mano, generar un plan funciona; con una generación `ok`, el servidor responde `FREE_LIMIT_REACHED` y el cliente abre el paywall o muestra el mensaje. Una cuenta antigua con un plan previo a `plan_generations` sigue bloqueada.

### Fase 2: Guardado único y atómico de la estructura del plan
**Objetivo**: RPC `save_plan_structure`, `supabaseClient.savePlanStructure`, `EditablePlanSchema` (Zod) y `plan-structure.ts` con las operaciones puras y los topes. `swapPlanExercise` pasa por el mismo camino.
**Validación**: crear, modificar y volver a guardar un plan deja `payload` y `plan_exercises` idénticos en ejercicio, día y posición; repetir la misma llamada no duplica nada; otro usuario no puede guardar sobre el plan (RLS); cambiar un ejercicio desde el día sigue funcionando.

### Fase 3: Editor de plan (estructura y borrador)
**Objetivo**: `plan-editor` y `day-editor`: nombre y semanas, añadir/quitar/reordenar días y ejercicios, ajustar series, reps y descanso, borrador local, guardar con reintento, aviso de cambios sin guardar y Atrás del teléfono. Abre tanto un plan nuevo como uno existente (IA o manual).
**Validación**: a 360 px se monta un plan de 2 días con ejercicios ya conocidos, se guarda, se reabre y se edita. Cortar la red antes de guardar conserva el borrador y el reintento guarda una sola vez. Editar un plan de IA no le quita su perfil (`meta`).

### Fase 4: Selector de ejercicios del catálogo
**Objetivo**: `exercise-picker` con buscador, chips de grupo muscular, favoritos, miniaturas con ahorro de datos, multiselección y marca de "ya está en este día". Comportamiento definido con conexión lenta y sin conexión.
**Validación**: añadir 5 ejercicios de dos categorías en una sola visita al selector; con red limitada (perfil 3G lento) la lista responde y no descarga GIF completos; sin red no lista nada y dice que hace falta conexión para elegir ejercicios (decisión del usuario), nunca una lista vacía que parezca "no hay ejercicios".

### Fase 5: Entradas y coherencia en el resto de la app
**Objetivo**: hoja "Crear con IA / Crear a mano" en el "+" y en el estado vacío; chip de origen (hoy "Generado por IA" está fijo); título del plan que respeta el nombre en los manuales; la sesión, el inicio y el panel admin se comportan bien con planes manuales; textos ES/EN.
**Validación**: un plan manual se crea desde la lista, se ve con su nombre y su chip, se entrena de principio a fin y sus series aparecen en el historial. El detalle de usuario en admin sigue mostrando el cuestionario cuando el plan más reciente es manual.

### Fase 6: `generate-plan` en modo relleno
**Objetivo**: rama `mode: "fill"` con validación estricta de entrada, catálogo filtrado por zonas además de equipo y restricciones, prompt para uno o varios días, exclusión de ejercicios ya presentes y `resolvePlan` con mínimos adaptados. Misma idempotencia y mismos límites. La generación de plan completo no cambia de comportamiento.
**Validación**: llamada real de un día y de un plan: todos los ejercicios pertenecen a las zonas pedidas y al equipo del usuario, ninguno de `exclude` aparece, queda una fila en `plan_generations`, y repetir el `requestId` devuelve `reused` sin tokens nuevos. El flujo del cuestionario sigue generando como antes.

### Fase 7: "Rellenar con IA" en el editor
**Objetivo**: `ai-fill-sheet` (objetivo, zonas, nota opcional), por día y para el plan entero; añadir o reemplazar; pantalla de espera reutilizada; gating y paywall; resultado al borrador; recuperación tras corte de red.
**Validación**: rellenar un día vacío y otro con ejercicios (añadir y reemplazar); cortar la red durante la espera y recuperar el resultado sin segunda generación; un Free sin cupo ve el paywall y su borrador queda intacto.

### Fase 8: Perfil para la IA en planes manuales y "Mejorar plan"
**Objetivo**: `ai-profile-form` (cuestionario corto), mostrado la primera vez que un plan sin perfil usa IA (relleno o mejora), prellenado desde el plan más reciente con perfil y guardado en `payload.meta`. "Mejorar plan" deja de caer en los valores por defecto silenciosos.
**Validación**: en un plan manual con un entrenamiento hecho, "Mejorar plan" pide el cuestionario, genera con ese equipo y nivel y crea el plan nuevo; al repetir sobre el mismo plan no lo vuelve a pedir.

### Fase 9: Validación final
**Objetivo**: sistema funcionando de extremo a extremo.
**Validación**:
- [ ] `npx tsc --noEmit` pasa (no existe script `typecheck` en `package.json`)
- [ ] `npm run lint` pasa
- [ ] `npm run build` exitoso (export estático)
- [ ] Recorrido en navegador con perfil de teléfono (360 px, red lenta) contra el Supabase real, con capturas en `.titan/qa/`
- [ ] Criterios de éxito cumplidos
- [ ] Memoria actualizada (`generacion-planes`, `suscripciones`, `datos-seguridad`, `producto-flujos`) y lista de lo que solo se confirma en el APK

---

## Progreso

> Se actualiza al cerrar cada fase. "Local" = código y SQL en el repo; "live" = aplicado en el Supabase real.

- **Despliegue:** el usuario aprobó el PRP con "comienza" pero no respondió si extiende a este PRP la autorización de aplicar SQL y desplegar Edge Functions. Hasta que lo confirme, todo queda en local.
- **Fase 1 — hecha en local (2026-10-12).** `generate-plan` ya no cuenta filas de `plans` para el límite Free; el cliente usa `countAiGenerations` (`src/lib/plans/ai-quota.ts`) en el cuestionario y en "Mejorar plan"; `countPlans` se retiró. `tsc` pasa. **Pendiente en live, en este orden:** aplicar `schemas/backfill-plan-generations-legacy.sql` y después desplegar `generate-plan`. Sin eso, el servidor desplegado sigue contando planes y un plan manual gastaría el cupo Free. Validación contra cuentas reales: pendiente del despliegue.
- **Fase 2 — hecha en local (2026-10-12).** `schemas/add-save-plan-structure.sql` (función `save_plan_structure` + auxiliar `plan_clamp_int`), `supabaseClient.savePlanStructure`, `EditablePlanSchema`, `src/lib/plans/plan-structure.ts` (operaciones puras y `PLAN_LIMITS`) y `clearPlanSessions` en `session-resume.ts`. `swapPlanExercise` ya guarda por ese camino. Topes finales: 1-7 días, 1-15 ejercicios por día, series 1-10, reps 1-100, descanso 0-600 s, semanas 1-52 (más amplios que los de la IA, a propósito: una rutina propia puede salirse de ellos). Los valores numéricos fuera de rango se acotan, no se rechazan; se rechaza un plan sin días, un día vacío y un bloque sin ejercicio reconocible. Un bloque de un plan antiguo sin `exercise_id` se enlaza por nombre exacto y, si no existe, se conserva con su nombre.
  **Probado** en un Postgres local desechable con las mismas tablas y políticas RLS (no en live): crear, repetir la llamada sin duplicar, `payload` y `plan_exercises` iguales, los cinco rechazos, otro usuario no puede escribir sobre el plan, `anon` sin permiso, y el backfill de la fase 1 (cuenta planes de IA, también con payload en texto; no cuenta manuales; repetirlo no añade filas).
  **Pendiente en live:** aplicar `schemas/add-save-plan-structure.sql` **antes de publicar el cliente** (push a `main` despliega la web): sin la función, cambiar un ejercicio de un plan falla.

## Preguntas abiertas — respondidas por el usuario el 2026-10-12

1. Rellenar un día gasta una generación entera: **sí**.
2. El primer "Rellenar con IA" en un plan sin perfil pide el cuestionario corto: **sí**.
3. Borrador en el teléfono y guardar exige conexión: **sí**.
4. **Cambiado:** el selector de ejercicios no funciona sin conexión. No se guardan páginas vistas ni favoritos para ese caso: se dice claramente que hace falta conexión para elegir ejercicios.
5. Un plan con entrenamientos se edita en sitio: **sí**.

Texto original de las preguntas (la 4 quedó superada por la respuesta de arriba):

1. **¿Rellenar un solo día gasta lo mismo que generar un plan entero?** Con "los límites actuales" un Free tiene 1 generación de por vida: quien la usó en el cuestionario no podrá rellenar nada, y quien empiece a mano podrá rellenar un único día. *Asumido: sí, cada relleno es una generación, sin cupo aparte.*
2. **Primer uso de "Rellenar con IA" en un plan sin perfil.** El servidor necesita al menos el equipo para filtrar el catálogo. *Asumido: se pide el mismo cuestionario corto que en "Mejorar plan", una vez, y se reutiliza.*
3. **Editar sin conexión.** *Asumido: el borrador vive en el teléfono y guardar exige conexión, con reintento manual y al recuperar red mientras el editor está abierto. No se construye una cola en segundo plano ni se puede entrenar un plan que aún no se guardó.*
4. **Catálogo sin conexión en el selector.** Depende del tamaño real del catálogo, que hay que medir. *Asumido: se guardan en el teléfono las páginas ya vistas y los favoritos; no se descarga el catálogo entero.*
5. **Editar un plan que ya tiene entrenamientos.** Los cambios se aplican al mismo plan; el historial se conserva porque `workout_logs` guarda el nombre del ejercicio y el `plan_id`. *Asumido: se edita en sitio, sin "duplicar plan".*

---

## Aprendizajes (Self-Annealing)

> Esta sección crece con cada error encontrado durante la implementación.

*(vacío)*

---

## Gotchas

- [ ] **Un plan manual consumiría hoy el cupo Free.** `generate-plan` bloquea con `Math.max(generaciones, planes en la tabla) >= 1`, y el cliente (`intake-form.tsx` y `handleImprovePlan`) usa `countPlans()`. Sin la Fase 1, crear un plan a mano deja al usuario Free sin su generación gratuita.
- [ ] **El backfill va antes del despliegue de la función.** Si se despliega primero, las cuentas con planes anteriores a `plan_generations` recuperan una generación gratis.
- [ ] **`buildImproveIntake` rellena en silencio lo que falta**: `beginner`, 30 años y `equipment: {}`, que en el servidor equivale a solo peso corporal. En un plan manual sin perfil la mejora saldría mal sin avisar.
- [ ] **`planTitle` prefiere el objetivo al nombre.** En cuanto un plan manual reciba `meta.objective` (al guardar el perfil) su título cambiaría al nombre por objetivo. En los manuales debe mandar `meta.name`.
- [ ] **"Generado por IA" está escrito fijo** en la cabecera del detalle del plan.
- [ ] **Un solo hueco para la generación pendiente** (`cf-pending-generation`). Dos rellenos seguidos con peticiones distintas pisan el id del primero: si su respuesta se perdió, esa generación pagada ya no se recupera. El id debe liberarse solo cuando el resultado esté en el borrador, y hay que decidir si el hueco pasa a ser por plan y ámbito.
- [ ] **Reetiquetar días cambia sus letras.** La sesión a medias se guarda por plan + letra de día: tras mover o quitar un día, una sesión guardada podría reanudarse sobre otro día. Al guardar la estructura hay que descartar las sesiones a medias de ese plan.
- [ ] **Un día sin ejercicios rompe la sesión** (`planDay.blocks[currentExerciseIndex]`). Los días vacíos solo pueden existir en el borrador.
- [ ] **Copias locales.** Tras guardar hay que invalidar `plan:<id>`, `plan-exercises:<id>` y `plans`, como ya hace `swapPlanExercise`; si no, sin red se entrena la versión vieja.
- [ ] **`plans.source_hash` es NOT NULL** y `plans.weeks` también: el plan manual necesita ambos (`source_hash = id`, semanas elegidas o 8).
- [ ] **`IntakeSchema` exige 4-12 semanas** y `GeneratedPlanSchema` no pone topes. El esquema del editor es propio y sus topes deben ser los mismos que valida la RPC.
- [ ] **Nombres canónicos.** El nombre del ejercicio no se traduce ni se edita: sale del catálogo por `exercise_id`. El `focus` del día sí es texto libre del usuario.
- [ ] **Categorías sensibles a mayúsculas.** Las zonas se envían con el valor exacto de `exercises.category`. Confirmar los valores distintos en la BD real antes de fijar la lista (la de `exercises/page.tsx` es la referencia).
- [ ] **Zonas + equipo pueden dejar muy poco catálogo.** Hoy, por debajo de 24 ejercicios el servidor cae a todo el peso corporal, lo que ignoraría la zona pedida. El modo relleno necesita su propio mínimo y un error claro ("no hay ejercicios suficientes para esa zona con tu equipo").
- [ ] **`resolvePlan` descarta días con menos de 3 ejercicios y planes con menos de 2 días.** El relleno de un día necesita mínimos distintos sin tocar los del plan completo.
- [ ] **La nota libre llega al prompt.** Tope de longitud en cliente y servidor, y los campos estructurados validados contra lista cerrada en el servidor (hoy la validación de entrada es mínima).
- [ ] **`admin-api` (`userDetail`) toma el cuestionario del plan más reciente.** Si ese plan es manual y sin perfil, el panel lo mostraría vacío.
- [ ] **El plan más reciente es el "Activo"** en la lista y en el inicio. Un plan manual recién creado pasa a serlo; comprobar que es lo deseado.
- [ ] **`plans/page.tsx` ya tiene 1.200 líneas.** El editor va en componentes aparte.
- [ ] **Navegación en Capacitor.** `router.push/replace` puede no propagar el cambio de query: estado primero, URL después, igual que `dayView`.
- [ ] **Reordenar en táctil.** Arrastrar dentro de una lista con scroll es frágil en WebView antiguos (mínimo 111) y no hay librería de arrastre instalada. Empezar con botones subir/bajar.
- [ ] **`localStorage` es compartido** con la cola de series y las copias de lectura. Un borrador grande o un índice de catálogo pueden llenar la cuota; `cacheWrite` falla en silencio.
- [ ] **`rpn-config.ts` está duplicado** (cliente y función). Si el relleno cambia reglas de series/reps, revisar los dos.
- [ ] **Despliegue.** Los cambios de `generate-plan` y el SQL se aplican sobre el Supabase real. La autorización para desplegar dada el 2026-10-12 fue para el plan del piloto: confirmar antes de desplegar en este PRP.
- [ ] **Nada de esto está probado en un APK.** El teclado numérico, el Atrás físico y el rendimiento del selector solo se confirman en un teléfono.

## Anti-Patrones

- NO crear tablas nuevas para planes manuales ni una segunda Edge Function para el relleno.
- NO escribir `plans.payload` y `plan_exercises` por separado desde el cliente.
- NO contar filas de `plans` para decidir cupos de IA.
- NO bloquear ninguna acción manual por tier.
- NO guardar en cada toque: se edita el borrador y se guarda una vez.
- NO usar nombres de ejercicio escritos o traducidos para relacionar; siempre `exercise_id`.
- NO generar con valores de perfil por defecto sin que el usuario los haya visto.
- NO meter el editor dentro de `plans/page.tsx`.
- NO aplicar recetas del toolkit que asumen Server Actions, Vercel o Polar: aquí es export estático, Edge Functions y RevenueCat.
- NO exponer claves de OpenAI ni service-role en el cliente.
- NO ignorar errores de TypeScript ni omitir validación Zod en lo que escribe el usuario.

---

*PRP aprobado el 2026-10-12.*
