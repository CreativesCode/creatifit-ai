# Producto y flujos

Reconstruido el 2026-09-10 sobre `2cb14df`. Implementación local inspeccionada; no prueba de producción.

CreatiFit AI acompaña el ciclo cuestionario → rutina → entrenamiento → historial → mejora. Experiencia principal móvil Android/Capacitor, con frontend web exportado. El brief pedía 6–8 semanas y generación menor de 10 s: objetivos históricos, no SLA comprobado. El esquema actual permite 4–12 semanas, edad 16–80, peso 30–200 kg, altura 120–250 cm; no son garantías médicas.

## Rutas actuales (17 páginas)

| Rutas | Uso |
|---|---|
| `/`, `/welcome`, `/login` | Entrada, presentación, autenticación |
| `/reset-password` | Recuperación de contraseña |
| `/dashboard` | Planes, actividad, racha, acceso al seguimiento corporal |
| `/onboarding` | Wizard de seis pasos |
| `/plans` | Lista/detalle por query string; sustituir, borrar, mejorar |
| `/session` | `planId` y día; calentamiento, ejercicio, descanso, resumen |
| `/exercises` | Búsqueda, categorías, favoritos, detalle |
| `/workout-history` | Sesiones, PRs, logros, tendencias |
| `/body` | Medidas, fotos privadas, comparación Pro |
| `/settings` | Idioma, tema, suscripción, cuenta |
| `/admin` | Gestión de usuarios mediante Edge Function |
| `/privacy`, `/terms`, `/account-deletion`, `/support` | Información pública y soporte |

`(app)` es grupo físico, no segmento de URL. No reconstruir rutas API/dinámicas del README antiguo.

## Contratos funcionales

- Auth por email/contraseña con confirmación, reenvío y recuperación. `onAuthStateChange` fija estado inicial; evitar duplicarlo con `getSession`. Confirmación vuelve a APP_URL; recuperación a `/reset-password/`. AuthGate redirige a login; no sustituye RLS.
- Intake: objetivo, nivel/perfil, medidas, equipo, restricciones y duración. Restricciones `jumps`, `high_impact`, `heavy_lifting` activas significan patrones a evitar; ya no están siempre false.
- Generación y persistencia son separadas; contexto del usuario se guarda en `payload.meta` para futuras mejoras.
- “Mejorar plan” crea un plan NUEVO, conservando anterior e historial. Atribución por `workout_logs.plan_id`; los logs antiguos NULL se excluyen, no se atribuyen por nombre de ejercicio.
- Elegibilidad real del helper: ≥1 `session_id` y ≥1 serie con reps o peso positivos. Su comentario habla de sesión terminada, pero no verifica un estado persistido de finalización.
- Sesión guarda series individualmente con `session_id`/`plan_id`, conserva estado de UI en localStorage y confirma salida. Reanudar UI no equivale a cola offline/sincronización entre dispositivos.
- Borrado de plan conserva logs: `workout_logs.plan_id` no tiene FK deliberadamente. El borrado de cuenta es otro flujo.
- Favoritos son por usuario; lista de IDs vacía evita consulta y duplicado de favorito se trata como éxito.

## Retención

- `streak.ts`: racha viva anclada a hoy/ayer en fecha local; máxima histórica y semana lunes–domingo. `records.ts` mantiene otra racha terminada en el último entrenamiento; no son intercambiables.
- PRs/logros, overlay de celebración, señal de descanso y tendencias de volumen/peso están presentes. Logros se recalculan; no se encontró persistencia de desbloqueos históricos.
- Volumen = reps × peso; semanas sin datos se rellenan con cero. Tendencias usan fechas ISO/UTC y racha usa fecha local: revisar bordes de día/DST.
- Comparación de fotos Pro es un gate de UI, no una política de Storage por tier.

## Actualización 2026-10-12 (plan del piloto)

Sustituye lo dicho arriba sobre la sesión donde choque.

- **Entrada al entrenamiento:** el panel lleva en un toque al día que toca ("Entrenar · Día X" = siguiente al último entrenado de ese plan) o a la sesión a medias ("Continuar · Día X"). El selector de días queda como camino secundario. El calentamiento de 15 s sigue existiendo.
- **Series:** cada serie se guarda primero en el teléfono (cola local) y se sincroniza en segundo plano; la sesión no espera a la red. El `session_id` se conserva al reanudar. Peso con decimales y coma; RPE entero 1-10.
- **Sesión a medias:** se guarda en el dispositivo y caduca a las 12 h. Reanudar sigue siendo local a ese teléfono, no entre dispositivos.
- **Durante la sesión** la navegación inferior está oculta; se sale con la X (también en el descanso) o con Atrás. Con series hechas, salir ofrece "Terminar aquí" (resumen con lo hecho), "Pausar y salir" (la sesión queda guardada y se retoma desde el inicio) o "Seguir entrenando"; ya no se descarta nada.
- **Corregir y saltar:** "Corregir la serie anterior" (en el descanso y en la hoja de opciones "⋯") borra la última serie y vuelve a ella con sus valores. La misma hoja permite "Saltar este ejercicio" y "Terminar aquí". En el detalle de una sesión del historial se puede borrar una serie (dos toques).
- **Sin conexión:** planes, ejercicios del plan, historial, favoritos y medidas se ven desde la última copia guardada, con una banda que lo avisa. Generar o mejorar un plan, comprar y el panel admin exigen red.
- **Fechas:** historial, Mi cuerpo, logros, volumen semanal y progreso de fuerza usan el día local.
- **Ejercicios:** el campo de búsqueda conserva el foco mientras cargan los resultados. Las listas muestran miniaturas fijas; la animación solo se ve en el detalle y en la sesión.
- **Ahorro de datos** (Ajustes): en detalle y sesión muestra una imagen fija con "Ver animación". Sin elección del usuario se activa solo si el teléfono pide ahorro de datos o informa 2G/3G.
- **Admin:** se entra desde Ajustes (solo admins) y el panel muestra actividad por usuario.

Fuentes: `src/app/**/page.tsx`, `src/components/forms/intake-form.tsx`, `src/components/ui/workout-session.tsx`, `src/lib/ai/improve-plan.ts`, `src/lib/progress/*`, `src/lib/validators/schemas.ts`, `docs/PLAN-ENGAGEMENT-FEATURES.md`.
