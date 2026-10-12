# Pendientes y puntos que requieren verificación

Tabla del 2026-09-10, con filas actualizadas el 2026-10-12 donde se indica. Priorización propuesta por esta revisión, no nueva autorización de implementación. “Local” indica código inspeccionado; “remoto” exige comprobar el entorno real.

| ID | Hallazgo / estado | Siguiente comprobación útil |
|---|---|---|
| P01 | Guía móvil recomienda secretos públicos; contradice implementación actual | Corregir/retirar MOBILE-ENV-SETUP.md en una tarea documental; mientras, tratarla como obsoleta |
| P02 | **Resuelto 2026-10-12.** El REVOKE por columna no bloqueaba nada; se revocó la escritura de tabla sobre `profiles` | Nada pendiente. Si se añade un campo editable por el usuario, hace falta GRANT de columna o Edge Function |
| P03 | No existe cadena supabase/migrations; SQL disperso y variantes antiguas | Inventariar schema remoto y ordenar migraciones; no ejecutar todos los SQL |
| P04 | **Resuelto 2026-10-12.** Los límites cuentan generaciones reales en `plan_generations`: Free 1, Pro 30 cada 30 días | Nada pendiente |
| P05 | json_object y validación servidor parcial; fallback de catálogo general | Validar esquema, cuatro días, restricciones/equipo y fallback con pruebas reproducibles |
| P06 | Guardado/sustitución de plan en varias escrituras | Definir transacción/recuperación; verificar consistency de payload y plan_exercises |
| P07 | **Resuelto 2026-10-12.** El cliente propaga `FREE_LIMIT_REACHED`, `PRO_LIMIT_REACHED`, red y fallo por separado | Probar el 402 hasta el paywall en un APK |
| P08 | Webhook sin control persistido de orden/idempotencia observado | Probar eventos fuera de orden, expiración, cambios de producto y perfiles inexistentes |
| P09 | Borrado de cuenta sin limpieza explícita de fotos | Verificar Storage + cascadas + errores; alinear promesa pública con comportamiento |
| P10 | React Query montado sin hooks; dependencias auth-ui/helpers heredadas | Decidir migración de fetching o retirada selectiva; no añadir más clientes Supabase |
| P11 | any, lint omitido en build y sin suite general en package.json | Establecer baseline actual antes de afirmar calidad; audit de 18 vulnerabilidades era histórico, no se repitió |
| P12 | Logros recalculados y rachas con semánticas distintas | Persistencia de desbloqueos/longest, fechas locales/UTC y DST |
| P13 | “Sesión terminada” en mejora se infiere de logs, sin marca verificada. Desde 2026-10-12 las sesiones a medias caducan a las 12 h, pero sigue sin haber marca de finalización | Definir completado real y tratamiento de sesiones parciales |
| P14 | Rutina semanal repetida; mejora crea otra rutina | Separar en copy y roadmap mejora puntual de periodización semanal real |
| P15 | Offline SQLite/sync, push y export avanzado del brief sin implementación encontrada. Desde 2026-10-12 sí hay offline básico: cola local de series y copia local de lecturas (sin SQLite ni sync bidireccional) | Mantener SQLite, push y export como propuestas |
| P16 | UI pública española y privacidad anterior a fotos/medidas | Revisar cobertura de textos y consistencia con datos enviados/almacenados |
| P17 | Release/tiendas/hosting/secrets no verificados | Comprobar entorno elegido, keys de plataforma, redirects y QA de dispositivo cuando se pida release |
| P18 | Catálogo Titan aparece directo y con namespace en esta interfaz | Revisar compatibilidad de carga entre host y CLI antes de universalizar instalador; no son 58 recetas distintas |

## QA general para el piloto en Cuba — 2026-10-12

Auditoría de código por áreas más pruebas en navegador contra el Supabase real (sin APK ni teléfono físico). Plan priorizado en `.titan/plans/2026-10-12-piloto-cuba-qa.md`; evidencia en `.titan/qa/2026-10-12-piloto-cuba/`. **El avance tarea por tarea se lleva en la sección "Progreso" de ese plan**; aquí solo queda el resumen.

- **P02 resuelto (2026-10-12):** la BD aceptaba que un usuario normal hiciera UPDATE de `tier` e `is_admin` en su propio perfil. Aplicado en live `schemas/harden-profiles-privileges.sql`; verificado 403. El cliente no debe volver a escribir en `profiles`: cualquier campo editable por el usuario necesita un GRANT de columna explícito o pasar por una Edge Function.
- **Sesión de entrenamiento (2026-10-12):** las series pasan por una cola local (`src/lib/workout-outbox.ts`) con id de cliente y upsert idempotente; ya no se pierden sin red ni se duplican por doble toque, y el `session_id` se conserva al reanudar. `workout_logs` no debe volver a escribirse con un insert directo esperando a la red. Verificado en navegador, no en teléfono.
- **Mala conexión (2026-10-12):** el cliente Supabase tiene límite de tiempo (15 s; 120 s en functions/storage). Las lecturas de planes, ejercicios del plan, historial, favoritos y medidas pasan por `src/lib/local-cache.ts` (red primero, copia local por usuario si falla). Una lectura nueva que deba verse sin red se envuelve con `offlineCapable` al final de `supabase-client.ts`; nunca cachear cuotas, compras ni admin. `AuthProvider` arranca con la sesión guardada y no manda al login por un fallo de red. Con el token caducado y sin red, cualquier llamada Supabase sin envolver espera ~30 s por el refresh: por eso `requireSession` corta a los 4 s.
- **P04 y P07 resueltos (2026-10-12):** `generate-plan` registra cada generación en `plan_generations` y es idempotente por `requestId` (= id del plan). Límites sobre generaciones reales: Free 1, Pro 30 cada 30 días. Desplegada y verificada con una generación real. Al tocar la generación, mantener el `requestId` de extremo a extremo y no añadir reintentos automáticos que llamen a OpenAI. Modelo desplegado: `gpt-4o-mini`.
- **Despliegue de funciones:** el comando `supabase` de la máquina puede estar logueado con otra cuenta; funciona pasando en `SUPABASE_ACCESS_TOKEN` el token de Credential Manager (`Supabase CLI:supabase`) y `functions deploy <fn> --project-ref oacjsudvmgkrtcesxjsr --use-api` (sin Docker). `generate-plan` mantiene `verify_jwt` activo.
- **Flujo de entrenamiento (2026-10-12):** `src/lib/session-resume.ts` concentra la clave de la sesión guardada, su caducidad (12 h), la sesión reanudable, el día sugerido y el indicador de sesión activa que oculta la navegación inferior. Con la navegación oculta, toda pantalla de la sesión necesita su propio botón de salir. Las salidas de la sesión pasan por `leaveSession`, que retira las entradas centinela del historial antes de navegar.
- **P12 parcial:** historial y Mi cuerpo usan día local (`localDay`/`parseLocalDay` en `streak.ts`); `records.ts` y `trends.ts` siguen en UTC.
- **Panel admin (2026-10-12):** la lista sale de la función SQL `admin_user_activity()` (solo `service_role`) vía `admin-api`; muestra último entreno, sesiones, accesos y generaciones. Ese día, de 11 usuarios solo la cuenta de pruebas había entrenado en la última semana.
- **Decisiones del usuario (2026-10-12):** los testers conservan su tier (no se toca la compra); autorizado desplegar Edge Functions mientras la app esté en modo prueba; la contraseña del admin se cambió y vive en `reference/credenciales.local.md`, fuera de git. Sin decidir: alta con o sin confirmación de correo (0.2 del plan).
- El proyecto Supabase estaba pausado ese día (el host no resolvía en DNS) y lo restauró el usuario; el keep-alive no lo evitó.
- El piloto es principalmente móvil (APK Android); priorizar ese flujo.

## No volver a abrir como si estuviera ausente

Prisma eliminado; cliente Supabase consolidado; JWT de generate-plan presente; constraints en onboarding; marca/sidebar/ring implementados; PRs, rachas, tendencias, fotos, favoritos, mejora/borrado de plan y detalle de ejercicio existentes. Las secciones antiguas que los dicen ausentes quedaron superadas por código/commits posteriores.

## Opcionales conservados

Virtualizar biblioteca, posters/vídeo en listas, selector de ejercicios para fuerza, edición de medidas, elección manual de fotos a comparar, persistencia de logros, toggle de sonido y notificaciones de racha. No confundir “opcional” con aprobado ni con fallo actual.

Fuentes/razones detalladas: [datos](datos-seguridad.md), [generación](generacion-planes.md), [pagos](suscripciones.md), [producto](producto-flujos.md), [operación](operacion.md), REVISION-MEJORAS.md y docs/PLAN-ENGAGEMENT-FEATURES.md.
