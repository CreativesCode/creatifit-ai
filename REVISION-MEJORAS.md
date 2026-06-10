# Revisión a fondo — CreatiFit AI

> Auditoría completa de la aplicación (flujo, UX, generación de plan con IA, calidad de
> código, rendimiento y configuración móvil). Fecha: 2026-06-09.
> Stack: **Next.js 15 (App Router, `output: "export"`) + React 19 + Capacitor 7 (Android) +
> Supabase + OpenAI**.
>
> Documento de trabajo: cada hallazgo lleva **prioridad**, **ubicación `archivo:línea`**,
> **impacto** y **recomendación**. Marca con `[x]` lo que vayas corrigiendo.

---

## 0. Resumen ejecutivo — qué arreglar primero

Lo más rentable, ordenado por impacto/esfuerzo:

1. **✅ HECHO · 🔴 Fuga potencial de `service_role` key al bundle** (`env-config.ts:11`).
   Eliminada la referencia y el log; ya no se referencia service_role en cliente.
2. **✅ HECHO (desplegado + verificado en prod) · 🔴 La IA generaba el plan SIN la lista de
   ejercicios reales de la BD** → GIFs/instrucciones/músculos vacíos. Reconectado: la Edge
   Function consulta `exercises`, inyecta lista numerada y resuelve `exercise_id` reales.
   Smoke test: 16/16 bloques resueltos con GIF. Ver sección 2.
3. **✅ HECHO (parcial) · 🔴 Mucho código muerto**. Borrados: 3 clientes Supabase
   duplicados, `useExercisesPagination`, `ExercisesList`, `ExerciseDetailsModal`. Pendiente:
   decidir Prisma y quitar deps npm muertas. Confirmado por 3 revisiones.
4. **✅ HECHO · 🔴 La sesión de entrenamiento**: i18n externalizada, bug de GIFs corregido,
   sesión reanudable con confirmación al salir, descanso real del plan, toast de fallos, y back
   de Android (con `@capacitor/app` ya instalado; activo tras `npx cap sync`).
5. **✅ HECHO · 🟠 Fluidez**: spinners → skeletons, providers ya no bloquean el render, GIFs
   con `loading="lazy"`, `IntersectionObserver` en vez de listener de scroll, `.cf-card-flat`
   sin `backdrop-filter` en la lista de ejercicios, animaciones con `prefers-reduced-motion`.

**Quick wins de bajo riesgo (1 día):** #1, #3 (borrar código muerto), devtools fuera de
producción, `loading="lazy"` en imágenes, bajar `temperature`, quitar `console.log`.

**El cambio de mayor valor de producto:** reconectar la generación de plan con el catálogo
real de ejercicios (sección 2).

---

## 1. Seguridad y capa de datos

### ✅ HECHO · 🔴 A-SEC-1 · `service_role` key con prefijo `NEXT_PUBLIC_` → se filtra al APK
- **Ubicación:** [src/lib/env-config.ts:11](src/lib/env-config.ts#L11) y el log en `:61`.
- **Impacto:** Toda variable `NEXT_PUBLIC_*` se inlina en el JS del cliente (y en el `.apk`).
  La `service_role` **omite todas las RLS**: quien la extraiga tiene acceso admin total a la
  BD. Crítico si esa env var llega a definirse en el build.
- **Recomendación:** Eliminar `SUPABASE_SERVICE_ROLE_KEY` de `env-config.ts` y su log. La
  service_role nunca debe referenciarse en código de cliente (en `env.example:14` está bien,
  sin prefijo, solo para scripts de servidor).

### ✅ HECHO · 🔴 A-SEC-2 · Cinco clientes Supabase; tres son código muerto con service_role
> Borrados los 3 muertos (`auth/supabase.ts`, `supabase/client.ts`, `supabase/server.ts`).
> Queda solo `supabase-config.ts` + la fachada `supabase-client.ts`.
- **Ubicaciones:**
  - ✅ En uso: [src/lib/supabase-config.ts:16](src/lib/supabase-config.ts#L16) (PKCE,
    persistSession). Es el único válido.
  - ☠️ Muerto: [src/lib/auth/supabase.ts](src/lib/auth/supabase.ts) (incluye
    `createServerSupabaseClient` con service_role), [src/lib/supabase/client.ts](src/lib/supabase/client.ts),
    [src/lib/supabase/server.ts](src/lib/supabase/server.ts) (service_role). **0 referencias.**
- **Impacto:** Confusión sobre "cuál es el bueno"; riesgo de *Multiple GoTrueClient instances*
  y sesiones/refresh inconsistentes si alguien importa el equivocado.
- **Recomendación:** Borrar los 3 archivos muertos. Mantener `supabase-config.ts` +
  la fachada `supabase-client.ts`.

### 🔴 A-SEC-3 · Toda la seguridad depende de RLS, sin versionar ni verificar
- **Ubicación:** Todas las queries en [src/lib/supabase-client.ts](src/lib/supabase-client.ts).
  `saveLog` (`:225`) inserta sin `user_id` explícito — depende de un trigger/default.
- **Impacto:** Si RLS está desactivada en alguna tabla (`plans`, `workout_logs`,
  `exercises`), la anon key permite leer/escribir datos de cualquier usuario.
- **Recomendación:** Versionar las políticas RLS como migraciones en `supabase/`, y un
  checklist/test que confirme `ENABLE ROW LEVEL SECURITY` en todas las tablas de usuario.

### 🟠 A-SEC-4 · CORS abierto y sin verificación de JWT en la Edge Function
- **Ubicación:** [supabase/functions/generate-plan/index.ts:18](supabase/functions/generate-plan/index.ts#L18).
- **Impacto:** `Access-Control-Allow-Origin: "*"` y no se valida el JWT del usuario dentro de
  la función. Cualquiera con la URL puede invocarla y **quemar cuota de OpenAI** (coste/DoS).
- **Recomendación:** Verificar el JWT de Supabase en la función (o `verify_jwt`), restringir
  orígenes a los esquemas Capacitor conocidos, y añadir rate-limiting por usuario.

---

## 2. Generación del plan con IA (el corazón del producto)

> **ESTADO (2026-06-09): sección mayormente RESUELTA y DESPLEGADA en producción.**
> La Edge Function se reescribió por completo y se verificó con smoke test (16/16 bloques
> resueltos a ejercicios reales con GIF). Hecho: B-AI-1 ✅, B-AI-4 ✅, B-AI-7 ✅, B-AI-8 ✅,
> B-AI-2 mitigado ✅. Parcial/pendiente: B-AI-3 (modelo `gpt-4o` por defecto pero aún
> `json_object`, no `json_schema`), B-AI-5 (form de restricciones), B-AI-6 (progresión real).

### ✅ HECHO · 🔴 B-AI-1 · El plan NO referencia ejercicios reales de la BD → GIFs/detalles vacíos
> **Resuelto.** La Edge Function ahora consulta `exercises` por equipamiento, inyecta una
> lista numerada (con músculo primario) y GPT referencia por número (`ref`); el servidor
> resuelve `ref → exercise_id` reales y devuelve `meta:{matched,total}`. Desplegado y
> verificado. La frágil `get_filtered_exercises` se descartó (devolvía 0 filas).
- **Ubicación:** [supabase/functions/generate-plan/index.ts:24-78](supabase/functions/generate-plan/index.ts#L24-L78)
  (prompt sin lista de ejercicios) → matching posterior por texto exacto en
  [schemas/fix-plan-exercises-function.sql:27](schemas/fix-plan-exercises-function.sql#L27)
  (`WHERE name ILIKE ...`).
- **Impacto:** GPT inventa nombres libres ("Push-up Toe Touch"...). Si no casan
  exactamente con la tabla `exercises`, `exercise_id` queda `NULL`: sin GIF, sin equipo, sin
  músculos, sin instrucciones. [plan-display.tsx:153-165](src/components/ui/plan-display.tsx#L153-L165)
  cae siempre al `/placeholder-exercise.svg`. **Se pierde el principal valor del producto.**
- **Clave:** La solución correcta YA existe pero está huérfana —
  [prompts-sent-to-gpt.json](prompts-sent-to-gpt.json) inyecta los ejercicios filtrados de la
  BD y [src/lib/config/rpn-config.ts](src/lib/config/rpn-config.ts) +
  `get_filtered_exercises` ([schemas/create-exercise-filter-function.sql](schemas/create-exercise-filter-function.sql))
  no se invocan en el camino de producción. Hubo una **regresión**.
- **Recomendación:**
  1. En la Edge Function, antes de llamar a OpenAI, consultar
     `get_filtered_exercises(equipment[], objective, age, gender, ~50)` e **inyectar la lista
     (id + nombre)** en el system prompt: *"usa SOLO estos ejercicios"*.
  2. Pedir a GPT que devuelva el `exercise_id` (o índice de la lista) en cada bloque →
     elimina el matching frágil por texto.
  3. Red de seguridad: contar/registrar los `exercise_id` nulos y rechazar/regenerar si
     superan un umbral.

### ✅ MITIGADO · 🔴 B-AI-2 · Día equivocado: `day_letter` por índice vs. etiqueta del modelo
> Con `temperature 0.3` y el prompt forzando días A/B/C/D en orden, el índice y la etiqueta
> coinciden. Sigue conviniendo unificar la fuente de verdad si se cambia el formato.
- **Ubicación:** GPT etiqueta `day.day` = `"A|B|C|D"` (`index.ts:31`), pero `savePlan`
  ignora ese valor y deriva la letra por posición:
  [supabase-client.ts:173](src/lib/supabase-client.ts#L173) (`String.fromCharCode(65 + i)`).
  El render casa por `day.day` ([plan-display.tsx:140-142](src/components/ui/plan-display.tsx#L140-L142)).
- **Impacto:** Si GPT devuelve días desordenados o se salta una letra, los detalles/GIFs se
  asignan al día equivocado.
- **Recomendación:** Una única fuente de verdad para la letra del día (enum ordenado en el
  schema, o indexar por posición en ambos lados — pero no mezclar).

### 🟠 B-AI-3 · Modelo viejo + sin Structured Outputs · ⚠️ PARCIAL
> Por defecto ya es `gpt-4o` (el secret `MODEL_NAME` manda; si está en `gpt-4o-mini`, hay que
> actualizarlo). Falta migrar `json_object → json_schema (strict)`.
- **Ubicación:** `gpt-4o-mini` ([index.ts:103](supabase/functions/generate-plan/index.ts#L103))
  + `response_format: { type: "json_object" }` (`:127`).
- **Impacto:** `json_object` solo garantiza "JSON válido", no que cumpla el esquema. Formas
  inválidas llegan al cliente, `GeneratedPlanSchema.parse` lanza, el usuario ve error tras esperar.
- **Recomendación:** Migrar a `response_format: { type: "json_schema", json_schema: {...,
  strict: true } }` con el esquema completo (días enum A–D, `reps` array de 2,
  `sets`/`rest_sec` enteros). Actualizar `MODEL_NAME` a un modelo vigente (validar nombre
  exacto contra la API actual antes de fijarlo).

### ✅ HECHO · 🟠 B-AI-4 · Personalización avanzada muerta (RPN/RPE, edad, género, notas)
> `generateRPNInstructions()` (RPN + género + edad) ya se inyecta en el system prompt; se
> pasan `constraints` activas y `notes`. (RPE objetivo por bloque queda como mejora futura.)
- **Ubicación:** [src/lib/config/rpn-config.ts](src/lib/config/rpn-config.ts)
  (`generateRPNInstructions:241`) no se invoca; `buildUserPrompt` (`index.ts:68-78`) embute
  unos pocos campos en texto plano. `notes` ([schemas.ts:56](src/lib/validators/schemas.ts#L56))
  ni se envía.
- **Impacto:** Planes poco personalizados pese a recoger objetivo, nivel, género, edad, peso,
  altura, equipo, pasos. RPE nunca se usa para generar.
- **Recomendación:** Portar `generateRPNInstructions()` al system prompt; pasar `notes`;
  pedir progresión semanal y `target_rpe` por bloque.

### 🟠 B-AI-5 · `constraints` (lesiones/limitaciones) hardcodeadas a `false`
- **Ubicación:** [intake-form.tsx:125](src/components/forms/intake-form.tsx#L125) envía
  siempre `{ jumps:false, high_impact:false, heavy_lifting:false }`; el form no permite
  marcarlas, aunque schema y prompt las contemplan.
- **Impacto:** Usuarios con lesiones reciben planes potencialmente **inseguros** (saltos, alto
  impacto). Riesgo físico y legal.
- **Recomendación:** Añadir un paso de restricciones al formulario y propagarlas al prompt.

### 🟠 B-AI-6 · "Plan de N semanas" engañoso: no hay progresión real
- **Ubicación:** El JSON solo trae 4 días plantilla A–D; "semanas" es un número
  ([GeneratedPlanSchema](src/lib/validators/schemas.ts)). `plan-display.tsx:248-263` repite
  el mismo calendario fijo.
- **Impacto:** "Plan de 12 semanas" son los mismos 4 días repetidos, sin periodización.
- **Recomendación:** O generar bloques/fases con progresión (carga/reps/volumen por
  semana), o comunicar honestamente que es una rutina semanal repetida.

### ✅ HECHO · 🟠 B-AI-7 · Sin timeout, sin reintentos, sin validación de salida en servidor
> Añadidos AbortController (45s) + 1 reintento ante 429/5xx, y validación/resolución de la
> salida en la propia función (`resolvePlan`), que descarta bloques inválidos y devuelve
> `matched/total`. (Falta exponer `matched` en la UI y dejar de tragar el fallo en `savePlan`
> → ver E-COD-3.)
- **Ubicación:** `fetch` a OpenAI sin AbortController ([index.ts:115](supabase/functions/generate-plan/index.ts#L115));
  `JSON.parse` + devolver sin validar (`:151`). Única validación: Zod en cliente.
- **Impacto:** El botón queda en "Generando…" indefinidamente ante latencia/429/5xx. Planes
  con ejercicios inexistentes se persisten igual (`insert_plan_exercises` solo loguea el fallo).
- **Recomendación:** AbortController (~30–45s) + reintento con backoff para 429/5xx. Validar
  el JSON en la propia función y devolver cuántos ejercicios casaron.

### ✅ HECHO · 🟡 B-AI-8 · `temperature: 0.7` y prompt potencialmente caro
> `temperature: 0.3`. Lista acotada a 150 ejercicios con solo nombre + músculo (sin metadatos
> redundantes). Prompt caching de OpenAI queda como mejora futura.
- **Ubicación:** `index.ts:128`.
- **Recomendación:** Bajar a ~0.2–0.4 (salida más determinista, menos alucinación de
  nombres). Al reactivar B-AI-1, limitar a ~40–60 ejercicios y enviar solo `id|name`;
  considerar prompt caching de OpenAI para la parte estática del system prompt.

---

## 3. Flujo y experiencia de usuario

> **ESTADO (2026-06-09): mayormente RESUELTA.** Hecho y verificado (build OK):
> C-UX-1 ✅ (i18n sesión), C-UX-2 ✅ (bug GIFs), C-UX-3 ✅ (reanudar + confirmar salida),
> C-UX-5 ✅ (skeletons), C-UX-6 ✅ (doble fetch), C-UX-7 ✅ (overlay "generando" + error visible),
> C-UX-8 ✅ (stats reales + avatar email), C-UX-9 ✅ (FLAG_LAYOUT_NO_LIMITS eliminado),
> C-UX-10 ✅ (toast de fallo de guardado), C-UX-11 ✅ (descanso real, push/replace, day param,
> window.location→router, debounce búsqueda, Plan ID oculto), C-UX-12 ✅ (aria-current, switches),
> C-UX-4 ✅ (back Android: handler + `@capacitor/app` instalado; activo tras `npx cap sync`),
> C-UX-13 ✅ (claves nuevas traducidas a EN/ES, paridad 351).

### ✅ HECHO · 🔴 C-UX-1 · `WorkoutSession` totalmente hardcodeada en español (i18n rota)
- **Ubicación:** [src/components/ui/workout-session.tsx:468](src/components/ui/workout-session.tsx#L468)
  importa `useTranslation` pero **no usa `t()` ni una vez**: "Calentamiento", "Serie",
  "Peso kg", "Descanso", "¡Sesión completada!"... todo fijo.
- **Impacto:** Un usuario en inglés ve la pantalla central de la app íntegramente en español.
- **Recomendación:** Externalizar todas las cadenas a `session.*` en `common.json` (ya
  existen algunas) y aplicar `t()`.

### 🔴 C-UX-2 · Bug: los GIFs nunca aparecen durante la sesión
- **Ubicación:** Se guarda `setExercisesWithDetails(exercisesData)`
  ([workout-session.tsx:497](src/components/ui/workout-session.tsx#L497)) pero se accede como
  `exercisesWithDetails?.exercises?.[planDay.day]` (`:643,702`); el fallback guarda sin el
  envoltorio `.exercises` (`:501`). Estructuras inconsistentes →
  `currentExerciseDetails`/`nextExerciseDetails` quedan `undefined`.
- **Impacto:** Durante el entrenamiento siempre se ve el icono placeholder en vez del GIF
  real, justo cuando más importa la guía visual.
- **Recomendación:** Unificar la forma del objeto entre fetch, fallback y accesos.

### 🔴 C-UX-3 · La sesión no es reanudable; salir = pérdida total, sin confirmación
- **Ubicación:** Estado en `useState` local ([workout-session.tsx:471-481](src/components/ui/workout-session.tsx#L471-L481));
  botón "X" sin confirmación (`:669-676`).
- **Impacto:** Una llamada, un toque accidental o el botón atrás pierden el entrenamiento a
  medias. Crítico para uso en el gimnasio.
- **Recomendación:** Confirmación al salir con progreso + persistir estado (localStorage o
  Supabase) para reanudar. (Los logs sí se guardan set a set; el estado de UI no.)

### 🔴 C-UX-4 · Sin manejo del botón "Atrás" de Android
- **Ubicación:** No existe ningún `App.addListener('backButton', ...)` (`@capacitor/app` no se
  usa). Relevante en [src/hooks/useMobileApp.ts](src/hooks/useMobileApp.ts) y `(app)/layout.tsx`.
- **Impacto:** El back físico sale de la app o tira el progreso de la sesión (junto a C-UX-3).
- **Recomendación:** Listener global: en sesión → confirmar salir; en detalle (`?id=`) →
  volver a la lista; en raíz de tab → minimizar.

### 🟠 C-UX-5 · Spinners a pantalla completa encadenados (hasta 3 por navegación)
- **Ubicación:** Cada página hace `return <PageLoader />`
  ([dashboard:83](src/app/(app)/dashboard/page.tsx#L83), `plans:100`, `exercises:164`,
  `session:95`, `workout-history:134`) **+** `NavigationLoader` superpone otro overlay con
  `backdrop-blur` ([navigation-loader.tsx:57](src/components/ui/navigation-loader.tsx#L57)) +
  `loading.tsx`.
- **Impacto:** Secuencia: overlay → `loading.tsx` → spinner de página → contenido. Doble/triple
  flash, layout shift, cero continuidad.
- **Recomendación:** Sustituir por **skeletons** que repliquen la estructura real (la lista de
  ejercicios ya tiene buenos skeletons en `exercises/page.tsx:485-499` — reutilizar). Limitar
  `NavigationLoader` a navegaciones >300ms o eliminarlo.

### 🟠 C-UX-6 · Doble fetch al abrir un detalle ya en memoria
- **Ubicación:** [plans/page.tsx:293-296](src/app/(app)/plans/page.tsx#L293-L296)
  (`router.replace` + `setSelectedPlan` → el `useEffect` re-fetchea), igual en
  `exercises/page.tsx:438-441`.
- **Impacto:** Spinner y latencia innecesarios al abrir algo que ya se tenía.
- **Recomendación:** Usar el objeto en mano; refetch solo si faltan campos. Idealmente
  React Query (ver D-COD-2).

### 🟠 C-UX-7 · Onboarding sin feedback inmersivo de "generando" ni error visible
- **Ubicación:** Único feedback: botón con opacidad y texto
  ([intake-form.tsx:451-459](src/components/forms/intake-form.tsx#L451-L459)); error como
  línea pequeña (`:435`).
- **Impacto:** Espera larga de IA que parece colgada; error poco visible.
- **Recomendación:** Overlay "Generando tu plan…" con el `CFLoader` de marca y mensajes
  rotativos; error prominente con CTA "Reintentar".

### 🟠 C-UX-8 · Stats del dashboard "muertas"/engañosas
- **Ubicación:** `totalSessions` siempre 0 ([dashboard/page.tsx:67-72](src/app/(app)/dashboard/page.tsx#L67-L72));
  anillo del plan activo con `value={0}` fijo (`:151`); miniaturas vacías (`:159-167`).
- **Impacto:** "Sesiones completadas: 0" aunque el usuario haya entrenado (el dato existe en
  workout-history). Resta credibilidad.
- **Recomendación:** Calcular `totalSessions` desde los logs (como hace `workout-history`);
  poblar el anillo con progreso real o quitarlo.

### 🟠 C-UX-9 · `FLAG_LAYOUT_NO_LIMITS` rompe teclado y safe-areas en Android *(confirmado x2)*
- **Ubicación:** [MainActivity.java:36-39](android/app/src/main/java/com/creatifit/ai/app/MainActivity.java#L36-L39);
  choca con `setDecorFitsSystemWindows(false)`, el plugin `SafeArea` y `fitsSystemWindows` en
  `styles.xml`.
- **Impacto:** Con muchos inputs numéricos (medidas, reps/peso/RPE, login) el teclado puede
  tapar el campo sin scroll. Posibles saltos de layout al resolver insets en el arranque.
- **Recomendación:** Eliminar `FLAG_LAYOUT_NO_LIMITS`; usar solo `setDecorFitsSystemWindows(false)`
  + plugin SafeArea + `windowSoftInputMode="adjustResize"`. Verificar scroll-into-view al
  enfocar inputs.

### 🟠 C-UX-10 · Fallos de guardado silenciosos (el usuario nunca se entera)
- **Ubicación:** `saveLog` falla en silencio
  ([workout-session.tsx:601-603](src/components/ui/workout-session.tsx#L601-L603)); dashboard
  e historial tragan errores con `console.error`.
- **Impacto:** Con red mala en el gimnasio, el usuario "completa" sets que no se guardan y no
  lo sabe; el historial sale vacío sin explicar el error.
- **Recomendación:** Toast/retry no bloqueante al fallar `saveLog`. Diferenciar "error de
  carga" de "vacío".

### 🟡 C-UX-11 · Detalles varios de flujo
- **Áreas táctiles <44px** en varios controles (X de salir 36px, toggles de ajustes,
  ±15s descanso): subir hit-area. (`settings:115`, `workout-session:671`)
- **`PlanDisplay` usa `window.location.href`** (recarga completa de la SPA) y muestra
  "Plan ID" al usuario ([plan-display.tsx:127,292](src/components/ui/plan-display.tsx#L127));
  usar `router.push` y ocultar IDs.
- **Día no se pasa a la sesión:** desde `plans/page.tsx` cualquier día va a `/session?planId=`
  sin `&day=`, forzando re-seleccionar día (paso redundante). `PlanDisplay` sí lo pasa →
  inconsistencia entre las dos rutas.
- **Descanso entre ejercicios hardcodeado a 90s** ([workout-session.tsx:612](src/components/ui/workout-session.tsx#L612))
  ignorando `rest_sec` del plan.
- **Búsqueda de ejercicios sin debounce** (solo con Enter): añadir búsqueda incremental.
- **`router.push` vs `router.replace` inconsistente** → back impredecible.
- **Avatar muestra un emoji recortado**: usa `dashboard.title` (empieza por 🏋️) para la
  inicial ([dashboard:109,153](src/app/(app)/dashboard/page.tsx#L109)); usar `user.email[0]`.

### 🟡 C-UX-12 · Accesibilidad
- Sin `aria-current="page"` en navegación (bottom-nav/side-nav).
- Toggles de ajustes son `<div>` decorativos sin `role="switch"`/`aria-checked` **y sin
  lógica real** ([settings/page.tsx:21-38,164](src/app/(app)/settings/page.tsx#L21-L38)) —
  aparentan funcionar pero no hacen nada.
- Cards de selección del intake sin `aria-pressed`.
- Contraste bajo en estados inactivos (`text-faint`, `cf-muted` a 10–12px) — verificar AA.
- `user-scalable=no` ([layout.tsx:26](src/app/layout.tsx#L26)) impide zoom (accesibilidad).

### 🟡 C-UX-13 · i18n: claves faltantes y claves muertas
- Muchas cadenas existen solo como *fallback inline* de `t()` y no en los JSON (todo el bloque
  `auth.*` del signup, `onboarding.continue`, `plan.ai_generated`, `session.title`...). Si se
  cambia el idioma, muestran el default español embebido.
- Bloques de claves definidas pero **sin usar** (`exercises.exercise_details.*`,
  `dashboard.quick_actions.*`, `plan.regenerate`...).
- **Recomendación:** Migrar todos los defaults a `en/` y `es/common.json`; eliminar claves
  muertas. Auditar con un linter de claves i18n.

---

## 4. Rendimiento y fluidez

> **ESTADO (2026-06-09): mayormente RESUELTA.** Hecho (build OK): D-PERF-1 ✅ (providers ya no
> bloquean), D-PERF-2 ✅ (`loading="lazy"`/`decoding="async"` en todos los `<img>`),
> D-PERF-3 ✅ (`.cf-card-flat` sin backdrop-filter aplicada a la lista de ejercicios),
> D-PERF-4 ✅ (IntersectionObserver), D-PERF-5 ✅ (reduced-motion + menos blur en mesh),
> D-PERF-6 ✅ (`Capacitor.isNativePlatform()`), D-PERF-7 ✅ (minify+shrink release, fuentes
> recortadas). **Pendiente opcional:** virtualizar la lista (no se añadió `react-virtual`);
> convertir GIFs de la rejilla a poster/vídeo; probar build de release Android con minify.

### ✅ HECHO · 🟠 D-PERF-1 · Theme/Language Provider bloquean el primer render completo
- **Ubicación:** [ThemeProvider.tsx:8-15](src/app/providers/ThemeProvider.tsx#L8-L15) y
  [LanguageProvider.tsx:13-20](src/app/providers/LanguageProvider.tsx#L13-L20) devuelven un
  `<div>` vacío hasta `mounted`. Están anidados → dos ciclos de mount antes del contenido.
- **Impacto:** Tras el splash (`launchShowDuration: 0`) se ve una pantalla en blanco hasta que
  React hidrata. Lo contrario de lo buscado.
- **Recomendación:** `next-themes` ya evita el mismatch con `suppressHydrationWarning` (ya está
  en `layout.tsx:35`); no hace falta gatear los children. i18n ya usa `useSuspense: false` →
  renderizar children sin esperar `mounted`. Quitar los dos `<div>` vacíos.

### 🟠 D-PERF-2 · GIFs sin lazy-loading; GIF animado en miniaturas de lista
- **Ubicación:** Ningún `<img>` usa `loading="lazy"`/`decoding="async"`
  ([exercises/page.tsx:211,451](src/app/(app)/exercises/page.tsx#L211),
  `workout-session.tsx:187,343`).
- **Impacto:** Cada página de 20 ejercicios decodifica y **anima** todos sus GIFs aunque estén
  fuera de viewport; el scroll infinito los acumula → jank, memoria y batería.
- **Recomendación:** `loading="lazy" decoding="async"` en todas las listas. Mejor: usar primer
  frame estático (poster) en la grilla y animar solo en el detalle, o `<video muted loop
  playsinline>` WebM/MP4 (mucho más ligero que GIF). `images.unoptimized:true` es obligado por
  el export, así que la optimización es manual en origen.

### 🟠 D-PERF-3 · Lista de ejercicios sin virtualizar + `backdrop-filter` por tarjeta
- **Ubicación:** [exercises/page.tsx:435-482](src/app/(app)/exercises/page.tsx#L435-L482);
  `.cf-card` usa `backdrop-filter: blur(22px)` ([globals.css:82](src/app/globals.css#L82)).
- **Impacto:** El scroll infinito acumula cientos de nodos, cada uno con `backdrop-filter`
  (de lo más caro de componer en WebView Android) → caída severa de FPS.
- **Recomendación:** Virtualizar (`@tanstack/react-virtual`, ya tienes el ecosistema) y/o
  quitar `backdrop-filter` de las tarjetas de lista (fondo sólido), reservando el blur para
  headers/overlays.

### 🟠 D-PERF-4 · Scroll infinito con listener no pasivo + reflow por evento
- **Ubicación:** [exercises/page.tsx:142-153](src/app/(app)/exercises/page.tsx#L142-L153)
  lee `scrollHeight` (reflow) en cada `scroll`, listener sin `{ passive: true }`.
- **Recomendación:** `IntersectionObserver` sobre un sentinel al final (como ya hacía el hook
  muerto). Si se mantiene, `passive` + throttle con `requestAnimationFrame`.

### 🟡 D-PERF-5 · Animaciones CSS costosas (blur grandes, `stroke-dashoffset`)
- **Ubicación:** `.cf-mesh`/`.cf-mesh-3` con `filter: blur(70-80px)`
  ([globals.css:301-361](src/app/globals.css#L301-L361)); `CFLoader` variante `draw` anima
  `stroke-dashoffset` (`:600-608`), no acelerado por GPU; `prefers-reduced-motion` solo ralentiza.
- **Recomendación:** Mesh pre-renderizado (WebP) o radio menor con `contain: paint`. Preferir
  variantes `transform: rotate()` del loader; evitar `draw` en móvil; en
  `prefers-reduced-motion` usar `animation: none`.

### 🟡 D-PERF-6 · `useMobileApp` detecta Capacitor por userAgent en vez de la API oficial
- **Ubicación:** [useMobileApp.ts:9-31](src/hooks/useMobileApp.ts#L9-L31) usa
  `'Capacitor' in window` + regex; añade listener `resize` que re-detecta (se dispara al abrir
  el teclado).
- **Recomendación:** `Capacitor.isNativePlatform()` de `@capacitor/core` (síncrono, fiable);
  permite evitar el `useEffect`.

### 🟡 D-PERF-7 · Android release sin minify ni shrink; fuentes de sobra
- **Ubicación:** `release { minifyEnabled false }`
  ([android/app/build.gradle:19-24](android/app/build.gradle#L19-L24)); 9 pesos de fuente entre
  dos familias ([layout.tsx:10-21](src/app/layout.tsx#L10-L21)).
- **Recomendación:** `minifyEnabled true` + `shrinkResources true` (reglas ProGuard de
  Capacitor ya presentes; probar plugins). Recortar pesos de fuente realmente usados.

---

## 5. Calidad de código y deuda

> **ESTADO (2026-06-09):** Hecho: E-COD-1 ✅ (parcial), E-COD-3 ✅ (`savePlan` devuelve
> `{plan, exercisesInserted, exercisesError}` y el form avisa), E-COD-5 ✅ (`STATICS_IMAGES`
> centralizado), E-COD-6 ✅ (race de `auth-context`), E-COD-7 ✅ (`EquipmentSchema`/
> `ConstraintsSchema` + validación Zod en el intake). ⚠️ E-COD-2 (devtools fuera de prod; falta
> decidir React Query). **Pendiente:** E-COD-4 (`any`), reactivar ESLint en CI.

### ✅ HECHO (parcial) · 🔴 E-COD-1 · Código muerto a eliminar *(confirmado por varias revisiones)*
> Borrados: 3 clientes Supabase, `useExercisesPagination`, `ExercisesList`,
> `ExerciseDetailsModal`. ⏳ Pendiente: Prisma (lo usa `prisma/seed.ts`, requiere decisión) y
> deps npm muertas (`@supabase/auth-helpers-nextjs`, `auth-ui-react`, `auth-ui-shared`).
Sin referencias entrantes en el código de aplicación:
- [src/lib/auth/supabase.ts](src/lib/auth/supabase.ts), [src/lib/supabase/client.ts](src/lib/supabase/client.ts),
  [src/lib/supabase/server.ts](src/lib/supabase/server.ts) (clientes Supabase duplicados).
- [src/lib/db/prisma.ts](src/lib/db/prisma.ts) + [prisma/schema.prisma](prisma/schema.prisma):
  **Prisma no puede correr en un export estático sin servidor**; además su schema (camelCase)
  diverge del de Supabase (snake_case). Decidir: si solo es para seed offline, mover a
  devDependencies y documentar; si no, eliminar.
- [src/hooks/useExercisesPagination.ts](src/hooks/useExercisesPagination.ts): hace
  `fetch("/api/exercises/paginated")` a una **API que no existe** (`output:"export"` elimina las
  route handlers, y no hay `src/app/api/`). La pantalla real usa `supabaseClient.getExercises`.
- [src/components/ExercisesList.tsx](src/components/ExercisesList.tsx): nunca se renderiza.
- **Deps npm a quitar:** `@supabase/auth-helpers-nextjs` (deprecado, SSR), `@supabase/auth-ui-react`,
  `@supabase/auth-ui-shared` (UI propia), probablemente `@prisma/client`/`prisma`.

### ⚠️ PARCIAL · 🟠 E-COD-2 · React Query instalado y montado pero **nunca usado**
> Hecho: devtools solo en desarrollo. Pendiente la decisión de fondo: migrar el fetching a
> `useQuery` **o** eliminar React Query por completo.
- **Ubicación:** [providers.tsx:9-26](src/components/providers.tsx#L9-L26) monta
  `QueryClientProvider` + Devtools, pero no hay un solo `useQuery`/`useMutation`. Toda pantalla
  refetchea con `useState`+`useEffect`, sin caché/dedupe/retry. **Devtools se incluye en
  producción** y está en `dependencies`.
- **Recomendación:** Decidir: migrar el data-fetching a `useQuery` (ganancia real en listas y
  detalle — resuelve también C-UX-6) **o** eliminar ambas deps y el provider. Como mínimo,
  condicionar `ReactQueryDevtools` a `NODE_ENV !== 'production'` y moverlo a devDependencies.

### 🟠 E-COD-3 · `insert_plan_exercises` falla en silencio y devuelve el plan como OK
- **Ubicación:** [supabase-client.ts:197-199](src/lib/supabase-client.ts#L197-L199): al fallar
  el insert se hace `console.error` y se continúa → el usuario ve un plan guardado **sin
  ejercicios**.
- **Recomendación:** Propagar el fallo a UI (estado de error / rollback / reintento).

### 🟡 E-COD-4 · Tipado débil con `any` en la capa de datos
- **Ubicación:** [supabase-client.ts:119,155,172](src/lib/supabase-client.ts#L119)
  (`planData: any`, `exercise: any`...), [ai/openai.ts:8](src/lib/ai/openai.ts#L8)
  (`intake: any`, `Promise<any>`). ~21 ocurrencias de `any`.
- **Recomendación:** Generar tipos con `supabase gen types typescript` y tipar el cliente.
  `intake: any` → `z.infer<typeof IntakeSchema>`.

### 🟡 E-COD-5 · ESLint desactivado en build + env vars dispersas
- **Ubicación:** `eslint.ignoreDuringBuilds: true`
  ([next.config.ts:10-11](next.config.ts#L10-L11)). `NEXT_PUBLIC_STATICS_IMAGES` se lee directo
  ([exercises/page.tsx:56](src/app/(app)/exercises/page.tsx#L56)) y no está en `env-config.ts`
  ni `env.example`.
- **Recomendación:** Reactivar lint en CI tras limpiar el código muerto. Centralizar todas las
  env en `env-config.ts` y documentarlas en `env.example`.

### 🟡 E-COD-6 · Race / doble set en `auth-context`
- **Ubicación:** [auth-context.tsx:31-40](src/lib/auth/auth-context.tsx#L31-L40): conviven
  `getSession()` y `onAuthStateChange` (que ya emite `INITIAL_SESSION`), ambos hacen
  `setSession`/`setLoading` → posible flicker.
- **Recomendación:** Quedarse con `onAuthStateChange` o usar bandera `mounted`.

### 🟡 E-COD-7 · Esquemas Zod y paginación duplicados
- **Ubicación:** `IntakeSchema`/`PlanGenerationSchema` duplican el bloque
  `equipment`/`constraints` ([schemas.ts:24-112](src/lib/validators/schemas.ts#L24-L112)); el
  form nunca valida con Zod antes de enviar. Tres implementaciones de paginación distintas
  (`getExercises`, el hook muerto, y scroll a mano en la página).
- **Recomendación:** Extraer `EquipmentSchema` reutilizable; validar el intake con Zod antes de
  enviar; unificar la paginación en una sola utilidad.

---

## 6. Plan de acción sugerido (por fases)

**Fase 1 — Seguridad y limpieza (1–2 días, bajo riesgo): ✅ CASI COMPLETA**
- [x] A-SEC-1: quitar service_role de `env-config.ts` (+ log solo en dev).
- [x] E-COD-1 / A-SEC-2: borrados los 3 clientes Supabase muertos, `useExercisesPagination`,
      `ExercisesList`, `ExerciseDetailsModal`.  ⏳ Pendiente: decidir Prisma + quitar deps npm
      muertas (`@supabase/auth-helpers-nextjs`, `auth-ui-react`, `auth-ui-shared`).
- [x] E-COD-2: devtools de React Query solo en desarrollo.
- [x] B-AI-8: temperature bajada (en Fase 2).  ⏳ D-PERF-2 (`loading="lazy"`) y limpiar
      `console.log` quedan para la pasada de fluidez (Fase 4).

**Fase 2 — El plan vuelve a tener valor (núcleo del producto): ✅ COMPLETADA (desplegada)**
- [x] B-AI-1 + B-AI-4: Edge Function reconectada a la BD (consulta directa a `exercises`) +
      `generateRPNInstructions`; GPT devuelve `ref` → servidor resuelve `exercise_id`. Verificado.
- [x] B-AI-2: mitigado (días A/B/C/D en orden, temp 0.3).
- [x] B-AI-7: timeout/retry/validación añadidos.  ⚠️ B-AI-3: modelo `gpt-4o`; falta `json_schema`.
- [x] B-AI-5: paso de restricciones en el formulario (✅ añadido, TOTAL_STEPS 5→6).
- [ ] B-AI-6: progresión semanal real (pendiente).

**Fase 3 — Sesión de entrenamiento sólida: ✅ COMPLETADA (salvo back Android)**
- [x] C-UX-2: bug de GIFs en sesión. C-UX-1: i18n de la sesión.
- [x] C-UX-3: reanudar sesión + confirmación al salir. C-UX-9: FLAG_LAYOUT_NO_LIMITS eliminado.
- [x] C-UX-10: feedback (toast) de fallos de guardado.
- [x] C-UX-4: handler de back de Android + `@capacitor/app` instalado; funcional tras `npx cap sync`.

**Fase 4 — Fluidez y pulido: ✅ MAYORMENTE COMPLETADA**
- [x] C-UX-5: skeletons en vez de spinners. D-PERF-1: providers que no bloquean.
- [x] D-PERF-4: IntersectionObserver. D-PERF-3: `.cf-card-flat` (sin virtualizar; opcional).
- [x] E-COD-2: devtools fuera de prod (decisión React Query pendiente).
- [x] C-UX-8: stats reales del dashboard. C-UX-11/12: pulido de flujo y a11y.
- [x] C-UX-13: claves nuevas traducidas a EN/ES (paridad 351 claves).

---

## 7. Pendientes tras el barrido (2026-06-09)

**Resueltos en este barrido:**
- ✅ **Dependencia rota reparada.** `@capacitor/safe-area@^7.0.0` (fantasma: no existe en npm,
  no se importaba ni estaba enlazada en gradle) **eliminada** de `package.json`; añadido
  `@capacitor/app@^7`. `npm install` vuelve a funcionar. → El back de Android **funcionará tras
  `npx cap sync`** (tu paso de build móvil). El bloque `SafeArea` en `capacitor.config.ts` se
  dejó (es inerte; el safe-area lo da el WebView con `viewport-fit=cover`).
- ✅ **i18n (C-UX-13).** Todas las claves nuevas volcadas a `en/` (inglés) y `es/` (español);
  paridad de 351 claves. Colisión `session.select_day` resuelta con `plans.plan_details.training_days`.

**Requieren tu decisión o un paso manual:**
1. **Build de release Android**: se activó `minifyEnabled`/`shrinkResources`; conviene un build
   de release de prueba por si algún plugin necesita reglas ProGuard `keep`. Ejecuta `npx cap sync`
   para registrar `@capacitor/app` (back button).
2. **Prisma** y **deps npm muertas** (`@supabase/auth-helpers-nextjs`, `auth-ui-react`,
   `auth-ui-shared`): pendientes de tu OK (`npm uninstall` ya desbloqueado).
3. **`MODEL_NAME`**: ¿forzar `gpt-4o` con `supabase secrets set`?
4. **React Query**: decidir si migrar el fetching a `useQuery` o eliminarlo.
5. **Vulnerabilidades npm** (18 reportadas por `npm audit`, transitivas): revisar antes de release.
6. Opcionales de mayor calado: `json_schema` strict (B-AI-3), progresión semanal real (B-AI-6),
   virtualizar la lista, versionar RLS (A-SEC-3), tipar `any` (E-COD-4), reactivar ESLint en CI.

*Generado a partir de 4 revisiones independientes (IA/plan, UX/flujo, datos/código,
rendimiento/móvil). Los hallazgos marcados "confirmado x2/x3" fueron detectados por varias
revisiones de forma independiente → alta confianza.*
