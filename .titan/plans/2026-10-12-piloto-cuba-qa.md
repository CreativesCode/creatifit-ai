# Plan de correcciones para el piloto en Cuba (QA general)

Fecha: 2026-10-12. Estado: **hallazgos anotados, nada corregido todavía.**

## Progreso

**Siguiente por hacer, en este orden:** 1.12 (día sugerido y calentamiento opcional), 1.7 resto (tarjeta "Continuar entrenamiento") y 1.8, 1.14 y 1.15 (botón Atrás y navegación en sesión), 4.1 y 4.3 (generación idempotente y registro de consumo; tocan la Edge Function y hay que desplegarla), 5.2 (actividad en admin), 3.1 (GIF). Pendientes de decisión del usuario: 0.2 (alta con o sin confirmación de correo), 0.3 (Pro del piloto desde admin) y 0.6 (cambiar contraseña del admin y quitar el secret de bootstrap). 0.4 y 0.5 se hacen al preparar el APK.

Hecho el 2026-10-12 (un commit por tarea, sin push):

- **0.1** Aplicado en la BD live con `schemas/harden-profiles-privileges.sql` (REVOKE de escritura sobre `profiles` y eliminación de la política de UPDATE). Verificado: un usuario normal recibe 403. De paso se comprobó que `execute_sql` no existe en la BD (5.6) y que hay un solo admin.
- **1.1, 1.2** Cola local de series en `src/lib/workout-outbox.ts`: id generado en el teléfono, upsert que ignora duplicados, reintento al recuperar red, al volver a primer plano y al abrir la app; aviso de series pendientes en la sesión y en el resumen. "Completar serie" ya no espera a la red y un segundo toque no duplica.
- **1.3** El `session_id` se conserva al reanudar.
- **1.4, 1.5** Peso con teclado decimal y coma aceptada; RPE entero 1-10; topes de reps (200) y peso (500 kg).
- **1.10** Peso y RPE se arrastran entre series del mismo ejercicio; el campo se selecciona al enfocarlo.
- **2.8 (parcial)** Historial y fecha por defecto de Mi cuerpo usan el día local. Falta `records.ts` y `trends.ts` (logros y volumen semanal siguen en UTC).

- **1.11** El descanso y el calentamiento cuentan contra la hora de fin (no se desincronizan con la pantalla apagada), se pide wake lock de pantalla durante la sesión y el manifest declara `VIBRATE`. Verificado en navegador (cuenta, pausa, reanudar, saltar); wake lock y vibración solo se confirman en un teléfono, y el permiso exige recompilar el APK.
- **1.9** Pantalla de ejercicio reordenada: barra de acción fija sobre la navegación, GIF más pequeño, objetivo en una línea y pista de progresión bajo los campos. Medido a 360×640: campos y "Completar serie" visibles sin desplazarse. Falta ocultar la navegación durante la sesión (1.15).
- **4.2** Bloqueo inmediato contra el doble toque en "Generar plan" (`intake-form.tsx`) y en "Mejorar plan" (`plans/page.tsx`). No probado en vivo para no generar planes; la guarda de servidor llega con 4.1.
- **5.1** Entrada "Panel de administración" en Ajustes, visible solo para admins, y botón de volver en `/admin`. Verificado en navegador con ambos usuarios.
- **2.2** Límite de tiempo global en el cliente Supabase (`src/lib/supabase-config.ts`): 15 s, y 120 s para Edge Functions y Storage.
- **2.1** Arranque con la sesión guardada en el dispositivo (`auth-context.tsx`): sin red y con el token caducado ya no se manda al login; solo se cierra sesión si auth-js borró el token.
- **1.7 (parcial) y 2.7 (parcial)** Copia local de lecturas en `src/lib/local-cache.ts`, aplicada en `supabase-client.ts` a planes, plan por id, ejercicios del plan, historial, favoritos y medidas: red primero y, si falla, lo último guardado. El panel deja en el teléfono los ejercicios del plan activo, así que la sesión arranca sin conexión. Falta la tarjeta "Continuar entrenamiento" de 1.7 y reducir las descargas repetidas de 2.7 (sigue siendo red primero en cada visita).
- **2.3** Fallo de carga distinto de cuenta vacía: componente `LoadError` con "Reintentar" en inicio, planes, ejercicios y sesión. Falta historial y Mi cuerpo, que sin copia local siguen mostrando "sin datos".
- **2.4** "Reintentar" limpia el error en Planes y Ejercicios.
- **2.5 (parcial)** Banda "Sin conexión / conexión inestable · mostrando datos guardados" (`connection-banner.tsx`). Falta traducir los errores de red del login y de admin.

Verificado en navegador con Supabase bloqueado: sin copia local aparece "No pudimos cargar tus datos" en vez de "Crea tu primer plan" y Reintentar recupera; con copia local se ven panel y plan y la sesión arranca; con el token caducado el panel aparece en ~5 s desde la copia y 40 s después el usuario sigue dentro; al volver la red se quita la banda.

Verificado en navegador con perfil de teléfono: doble toque = 1 fila; serie registrada con Supabase bloqueado, sincronizada al volver; mismo `session_id` tras recargar; "62,5" guardado como 62.50. Falta probarlo en un teléfono real.

## Cómo se probó

- **Auditoría de código** en 9 áreas (sesión, datos y caché, mala conexión, refrescos, generación y coste, admin y seguridad, resto de pantallas e idiomas, peso y arranque, cáscara Android). Cada hallazgo de código pasó por un segundo revisor que intentó refutarlo; ninguno fue refutado, varios se corrigieron o bajaron de gravedad.
- **Pruebas en navegador** (Chrome automatizado contra `next dev` y el Supabase real): usuario normal haciendo una sesión completa, admin, visitante sin sesión, y un pase con perfil de teléfono (Pixel 5, 360×640, CPU ×4). Se simuló sin conexión, 2G/3G lento y Supabase bloqueado.
- **No se probó:** un APK en un teléfono real, compras, alta de usuario con correo real, generación o mejora de planes (por coste). Los tiempos absolutos son de modo desarrollo y no valen; sí valen conteos de peticiones, bytes y comparaciones.

Evidencia completa (278 hallazgos brutos con archivo, línea, evidencia y arreglo propuesto): `.titan/qa/2026-10-12-piloto-cuba/`. Los ID entre paréntesis remiten a esos archivos.

Esfuerzo: **S** menos de una hora, **M** medio día, **L** más. "Dispositivo" = solo se confirma en un teléfono real.

## Lo que funciona bien

- Con buena red, el camino feliz de la sesión es corto: 1 toque por serie con las repeticiones prellenadas y 1 petición de ~430 bytes por serie.
- El servidor protege el panel admin: un usuario normal recibe 403 en `admin-api` (listar y cambiar tier) y 401 sin token.
- Las rutas protegidas redirigen a login, las públicas no llaman a Supabase ni cargan nada externo (fuentes autoalojadas, sin analítica).
- Sin desbordes horizontales en ninguna pantalla a 390 ni a 360 px. Estados vacíos correctos para una cuenta sin datos.
- El cambio de tier desde admin se refleja al instante en el panel y persiste.

## Fase 0 — Imprescindible antes de dar acceso a nadie

| # | Problema | Dónde | Arreglo | Esf. |
|---|---|---|---|---|
| 0.1 | **Cualquier usuario puede ponerse Pro o admin a sí mismo.** Confirmado en vivo: la BD acepta `UPDATE` de `tier` e `is_admin` sobre el propio perfil (el `REVOKE` por columna no sirve si existe el permiso de tabla). Con admin obtiene listar correos, cambiar tiers y borrar cuentas. (ADM-01, P02) | `schemas/add-admin-role.sql:16`, `add-subscription-tier.sql:18` | `REVOKE UPDATE ON public.profiles FROM authenticated, anon;` (el cliente nunca actualiza `profiles`). Añadir `WITH CHECK` a la política y revisar que no haya ya filas alteradas. | S |
| 0.2 | Alta y recuperación de contraseña desde el teléfono: los enlaces del correo apuntan a `http://localhost:3000`, no hay deep link a la app y el SMTP integrado de Supabase tiene cupo mínimo. Recuperar contraseña desde el APK es imposible de completar. (USR-01, MOB-03, ANON-07) | `src/lib/auth/auth-context.tsx:59,86`, `.env.local` | Decidir si el piloto lleva confirmación de correo (con usuarios conocidos, lo más robusto es desactivarla o crear las cuentas desde admin). Compilar con `NEXT_PUBLIC_APP_URL` público, añadirlo a Redirect URLs, SMTP propio y plantilla de recovery con `token_hash`. | M |
| 0.3 | El APK se compila con la key de Test Store de RevenueCat (la de Android está vacía). (MOB-02) Además, Google Play no cobra en Cuba y el botón "Pro" no avisa de nada. (MOB-13) | `src/lib/revenuecat/config.ts:20`, `revenuecat-context.tsx:221` | No configurar RevenueCat sin key de producción. Decidir que los testers reciben Pro desde admin y mostrar un aviso propio cuando no haya compras disponibles. | S |
| 0.4 | Tailwind 4 exige Android System WebView ≥ 111; en teléfonos sin actualizar la app sale sin estilos y sin explicación. (MOB-01) | `capacitor.config.ts:26` | `minWebViewVersion: 111` más una página de aviso en CSS plano. Anotar la versión de WebView de los teléfonos reales del piloto. Dispositivo. | M |
| 0.5 | El proyecto `android/` versionado no tiene plugins sincronizados y sus assets web son de septiembre de 2025: no se sabe qué lleva hoy el APK. `next dev` escribe en `out`, la misma carpeta que empaqueta Capacitor. (MOB-05, PERF-13, PERF-20) | `android/app/capacitor.build.gradle`, `next.config.ts:5` | Build limpio + `cap sync` antes de generar el APK del piloto; usar otro `distDir` en desarrollo. | S |
| 0.6 | El bootstrap de admin sigue activo mientras exista el secret, permite resetear contraseñas y el ejemplo versionado usa una contraseña trivial que coincide con la que tiene hoy la cuenta admin. (ADM-11) | `supabase/functions/admin-api/index.ts:82` | Cambiar la contraseña del admin y eliminar `ADMIN_BOOTSTRAP_SECRET`. | S |

## Fase 1 — La sesión de entrenamiento (lo más importante)

Resultado de la prueba real: una sola sesión de 8 series, con un corte de conexión, una recarga y un doble toque, terminó como **4 "sesiones" en el historial, con 2 series perdidas, 2 duplicadas, resumen "10/8 · 125 %" y fecha del día anterior.**

### 1A. No perder ni duplicar datos

| # | Problema | Dónde | Arreglo | Esf. |
|---|---|---|---|---|
| 1.1 | **Una serie cuyo guardado falla se pierde.** El aviso dice "lo reintentaremos" pero no existe reintento; al terminar se borra la única copia local y el resumen la cuenta como registrada. (SES-01) | `src/components/ui/workout-session.tsx:1207` | Cola local de series pendientes: id generado en el teléfono, guardar primero en el dispositivo, enviar con upsert idempotente, reintentar al volver la red, al reabrir la app y con un botón. Mostrar "N series pendientes de sincronizar". | M |
| 1.2 | **"Completar serie" espera a la red antes de avanzar**, sin límite de tiempo y sin bloquear el botón: con red lenta la pantalla se congela y un segundo toque duplica la serie. (SES-02, TCH-01) | `workout-session.tsx:1175-1221` | Avance inmediato (el guardado va a la cola de 1.1) y guard de reentrada. | M (con 1.1) |
| 1.3 | Al reanudar tras una recarga o cierre de la app se genera un `session_id` nuevo: el entrenamiento queda partido en varias sesiones. (SES-03) | `workout-session.tsx:1117` | Inicializar el id una sola vez a partir del estado guardado. | S |
| 1.4 | El peso con coma se corrompe: "62,5" se guarda como 625 kg. El campo pide teclado sin decimales. Reps y RPE no respetan máximos. (TCH-04, MOB-07) | `workout-session.tsx:329` | Peso con `inputMode="decimal"` y coma normalizada (ya resuelto así en `/body`); límites reales en reps y RPE. Dispositivo. | S |
| 1.5 | Un RPE con decimales o fuera de 1-10 hace fallar el guardado de la serie entera (la columna es entera con `CHECK`). (DAT-M1) | `workout-session.tsx:540` | Validar y redondear antes de enviar. | S |
| 1.6 | Una serie mal registrada no se puede corregir ni borrar; no hay "deshacer". (WOR-M1) | `src/lib/supabase-client.ts:319` | Deshacer la última serie en la sesión; editar/borrar desde el historial. | M |
| 1.7 | No se puede empezar ni reanudar un entrenamiento sin red: el plan se pide siempre al servidor. Tras un cierre de la app nada indica que hay una sesión por reanudar. (SES-04, TCH-06) | `src/app/(app)/session/page.tsx:57,146` | Guardar en el dispositivo el plan activo con sus ejercicios; tarjeta "Continuar entrenamiento" en inicio. | M |
| 1.8 | La sesión guardada no caduca: días después se "reanuda" y mezcla series nuevas con la antigua. Una sesión abandonada con una serie cuenta como "Sesión completada". (SES-10, SES-07 en vivo, P13) | `workout-session.tsx:957`, `dashboard/page.tsx:88` | Caducidad (p. ej. 12 h) y pregunta "¿reanudar o empezar de nuevo?"; marca real de sesión terminada. | M |

### 1B. Menos fricción por serie

| # | Problema | Dónde | Arreglo | Esf. |
|---|---|---|---|---|
| 1.9 | "Completar serie" queda fuera de pantalla en cada serie (y=925 en un Pixel 5 de 727 px útiles) y el scroll vuelve arriba tras cada descanso. (TCH-02, SES-08) | `workout-session.tsx:446,559` | Barra de acción fija sobre la navegación; reducir el GIF; quitar las tres tarjetas que repiten reps/serie/descanso. | M |
| 1.10 | El peso no se arrastra de una serie a la siguiente y el RPE nunca se prerrellena; al tocar reps el número se añade en vez de reemplazarse. (SES-07, TCH-03) | `workout-session.tsx:1128,1217` | Arrastrar peso y RPE de la serie anterior; seleccionar el contenido al enfocar. | S |
| 1.11 | El descanso cuenta ticks en vez de reloj real y nada mantiene la pantalla encendida: el teléfono se bloquea en cada descanso, el contador se congela y el aviso no suena. La vibración no puede funcionar (falta el permiso `VIBRATE`). (SES-05, MOB-04, MOB-08) | `workout-session.tsx:1143`, `AndroidManifest.xml:40` | Guardar la hora de fin del descanso y derivar el tiempo; wake lock durante la sesión; añadir el permiso. Dispositivo. | M |
| 1.12 | Llegar a la primera serie pide 3 toques y 2 esperas: elegir día sin sugerencia de cuál toca y un calentamiento decorativo de 15 s, bajo un botón que dice "Iniciar Sesión". (SES-13, TCH-18) | `dashboard/page.tsx:222`, `session/page.tsx:147` | Proponer el día siguiente al último hecho; calentamiento opcional; renombrar a "Entrenar". | S |
| 1.13 | No se puede saltar un ejercicio ni terminar antes: la única salida descarta el estado. (SES-06) | `workout-session.tsx:1219` | "Saltar ejercicio" y "Terminar aquí" que guardan lo hecho. | M |
| 1.14 | Botón Atrás de Android: tras salir de una sesión vuelve a meter al usuario en una sesión nueva; en el detalle del historial cambia la URL pero no la pantalla; en el cuestionario se pierden las respuestas. El handler nativo es código muerto. (TCH-05, TCH-11, TCH-12, MOB-10) | `session/page.tsx:76`, `(app)/layout.tsx:40`, `workout-history/page.tsx:41` | Importar `@capacitor/app` y gestionar Atrás de forma explícita; limpiar las entradas centinela al salir. Dispositivo. | M |
| 1.15 | Con el teclado abierto la navegación fija tapa campos y botón; no hay acción "Hecho". El menú inferior de 6 pestañas sigue visible durante la sesión y a 360 px sus zonas táctiles miden 30 px. (MOB-09, TCH-09, MOB-11) | `workout-session.tsx:327`, `globals.css:301` | Ocultar la navegación en sesión; `windowSoftInputMode`; revisar el menú a 5 pestañas. Dispositivo. | M |

## Fase 2 — Mala conexión, caché y refrescos

| # | Problema | Dónde | Arreglo | Esf. |
|---|---|---|---|---|
| 2.1 | **Abrir la app sin red con el token caducado** (más de 1 h sin usarla) deja ~30 s de carga muda y luego manda al login, como si hubiera cerrado sesión. (OFF-05, DAT-09) | `src/lib/auth/auth-context.tsx:36`, `auth-gate.tsx:14` | Tratar como autenticado si hay sesión guardada; ir a login solo ante cierre real. Dispositivo. | M |
| 2.2 | Ninguna petición tiene límite de tiempo: loaders y "Procesando…" pueden quedarse para siempre (login incluido). (DAT-18, ANON-01) | `src/lib/supabase-config.ts:27` | `fetch` con timeout global (8-15 s) en el cliente Supabase. | S |
| 2.3 | **Los fallos de red se pintan como cuenta vacía**: "Crea tu primer plan" a un usuario con 6 planes, "aún no hay entrenamientos", "sin datos" en Mi cuerpo. Confirmado en vivo. (DAT-07, USR-06) | `dashboard/page.tsx:103`, `workout-history.tsx:155` | Distinguir error de vacío; mostrar los últimos datos conocidos con aviso y "Reintentar". | S |
| 2.4 | "Reintentar" en Planes y Ejercicios nunca recupera: el estado de error no se limpia. (STA-M1) | `plans/page.tsx:593`, `exercises/page.tsx:344` | Limpiar el error al reintentar. | S |
| 2.5 | Errores en inglés crudo ("Failed to fetch", "Error 500"); no hay detección ni aviso de sin conexión en toda la app. (OFF-09, OFF-12) | `auth-screen.tsx:462`, `(app)/layout.tsx:91` | Traductor de errores de red y banda "Sin conexión". | S |
| 2.6 | Un fallo al leer el tier deja como Free a un usuario Pro toda la sesión; el Pro concedido por admin no llega hasta reiniciar la app; nada se refresca al volver a primer plano. Un fallo al leer `is_admin` muestra "Acceso denegado" al admin real. (DAT-08, BAD-M4, OFF-11) | `revenuecat-context.tsx:188,197`, `admin/page.tsx:76` | Guardar el último tier conocido; releer al volver a primer plano; no degradar por error de red. | S |
| 2.7 | El historial completo (`select *`, sin límite) se descarga hasta 5 veces en una navegación normal y se truncará en silencio al llegar al tope de filas de la API (~1000 series). Inicio hace tres descargas completas para pintar tres números. (DAT-04, DAT-05, PERF-08) | `src/lib/supabase-client.ts:303` | Ver "Decisión de caché". Columnas mínimas, paginación y sincronización incremental. | M |
| 2.8 | Fechas: el historial muestra los entrenamientos con un día de menos en Cuba (día UTC reinterpretado); logros y volumen semanal agrupan en UTC y contradicen la racha; la fecha por defecto de una medida sale en UTC. Confirmado en vivo. (DAT-M2, REF-08, REF-20, P12) | `workout-history.tsx:134`, `records.ts:120`, `body/page.tsx:99` | Un único helper de día local (el de `streak.ts`) en todos. | S |
| 2.9 | Cerrar sesión y eliminar cuenta sin red no hacen nada y no avisan. Las claves de `localStorage` no llevan id de usuario ni se limpian al cerrar sesión. (OFF-15, ADM-14, REF-25) | `auth-context.tsx:70`, `settings/page.tsx:126` | Cierre local inmediato; claves por usuario. | S |
| 2.10 | RevenueCat puede quedarse con usuario anónimo (el `logIn` no se ejecuta si `configure` termina después de resolverse la sesión): una compra no se asociaría al perfil. (REF-11) | `revenuecat-context.tsx:147` | Añadir `ready` a las dependencias del efecto de identidad. Dispositivo. | S |

### Decisión de caché (qué guardar en el teléfono y qué no)

| Dato | ¿Caché local? | Cómo |
|---|---|---|
| Plan activo con sus ejercicios y cues | **Sí, prioridad 1** | Se guarda al abrirlo; se invalida al sustituir un ejercicio, mejorar o borrar el plan. |
| Series registradas pendientes | **Sí, prioridad 1** | Cola de salida propia (1.1), nunca se borra hasta confirmar el servidor. |
| Historial de series | **Sí** | Copia local que solo crece; pedir al servidor solo lo posterior a la última fecha conocida. |
| Catálogo de ejercicios (1176) | **Sí, larga duración** | Texto en el dispositivo, refresco semanal o por versión; búsqueda y filtros locales. |
| Perfil / tier / is_admin, favoritos, medidas | **Sí, último valor conocido** | Mostrar lo guardado y refrescar en segundo plano; escritura optimista con reversión. |
| GIF de ejercicios | **Sí, pero solo los del plan activo** | Ver 3.1; hoy la caché es de 1 hora. |
| Cuota de generación, estado de compra, URLs firmadas de fotos, panel admin, sesión de auth | **No** | Deben ser siempre del servidor (dinero, permisos, caducidad). |

Vehículo recomendado: TanStack Query, que ya está montado pero sin usar, con caché persistida para lecturas; la cola de series va aparte. No hace falta SQLite ni sincronización bidireccional. (DAT-21 a DAT-26, P10, P15)

## Fase 3 — Consumo de datos

| # | Problema | Dónde | Arreglo | Esf. |
|---|---|---|---|---|
| 3.1 | **Los GIF animados dominan el consumo**: 0,2-0,9 MB cada uno, ~1,4 MB por sesión, 3,2 MB en la primera pantalla de Ejercicios y 8 MB tras un scroll, usados también para miniaturas de 46-64 px, con caché de 1 hora. (DATA-01, TCH-10, PERF-04) | `exercises/page.tsx:268`, `scripts/upload-storage.mjs:78` | Miniaturas estáticas (primer fotograma en WebP) en listas; GIF o vídeo corto solo en el detalle y bajo demanda; caché larga; modo "ahorro de datos". | L |
| 3.2 | La misma imagen se pide con dos URL distintas (doble barra) y se descarga dos veces. (DATA-02, PERF-12) | `exercises/page.tsx:61` | Un único constructor de URL. | S |
| 3.3 | Las fotos de progreso se suben tal cual salen de la cámara y se vuelven a descargar enteras en cada visita (URL firmada nueva = sin caché) para miniaturas de 56 px. (DAT-12, USR-12, USR-13) | `body/page.tsx:72,240` | Comprimir y redimensionar antes de subir; miniatura aparte; reutilizar la URL firmada mientras sea válida. | M |
| 3.4 | Abrir el detalle de una sesión del historial lanza 3 peticiones para datos que ya están en memoria; volver del detalle de un ejercicio recarga la lista desde la página 1 y pierde el scroll; empezar la sesión repite tres peticiones de la pantalla anterior. (USR-05, DAT-M4, DAT-06) | `workout-history/page.tsx:99`, `exercises/page.tsx:109` | Se resuelve con la caché de la fase 2. | S-M |
| 3.5 | El buscador de ejercicios pierde el foco y cierra el teclado en cada búsqueda (el campo se desmonta al cargar). (USR-07) | `exercises/page.tsx:305` | Mantener cabecera y campo montados; esqueleto solo en resultados. | S |
| 3.6 | `/login` no pinta nada útil hasta descargar y ejecutar todo el JS; en web no hay service worker (recargar sin red da el error del navegador). En el APK los archivos son locales, así que esto afecta sobre todo a la versión web. (ANON-03, ANON-06, OFF-18) | `src/app/login/page.tsx:18` | Baja prioridad si el piloto es solo APK. | M |
| 3.7 | Peso del bundle: banderas (2.555 líneas, 99,8 KB) en Ajustes, React Query sin uso, ambos idiomas cargados, paquetes sin importar. Efectos de blur costosos en gama baja (dos capas fijas más `backdrop-filter` en cada tarjeta; 31 tarjetas en el historial). (PERF-17, PERF-18, MOB-12, TCH-21) | `flags.tsx`, `globals.css:333` | Carga diferida y limpieza de dependencias; reducir blur en listas. Dispositivo. | S-M |

## Fase 4 — Generación de planes (dinero)

| # | Problema | Dónde | Arreglo | Esf. |
|---|---|---|---|---|
| 4.1 | **Una generación ya pagada se pierde si se corta la conexión**: el plan solo viaja en la respuesta y solo vive en memoria hasta guardarse; "Reintentar" vuelve a facturar. (GEN-01, GEN-02) | `supabase/functions/generate-plan/index.ts:461`, `intake-form.tsx:244` | El teléfono genera el id del plan antes de llamar; la función guarda el plan en BD y, si recibe el mismo id, devuelve el existente sin llamar a OpenAI. | M |
| 4.2 | **Doble toque en "Generar plan" lanza dos generaciones**: el botón no se bloquea hasta después de una petición de red y el servidor no tiene guarda. (GEN-03, PERF-02) | `intake-form.tsx:180` | Bloqueo inmediato; la idempotencia de 4.1 lo cierra en servidor. | S |
| 4.3 | El límite gratuito se cuenta sobre los planes existentes: borrar y regenerar da generaciones ilimitadas. Pro no tiene tope ni hay límite de frecuencia; "Mejorar plan" tampoco tiene protección contra repeticiones. (GEN-04, GEN-05, REF-16, P04) | `generate-plan/index.ts:394` | Tabla de generaciones escrita solo por la función; contar sobre ella. De paso da el coste real por usuario del piloto. | M |
| 4.4 | El aviso de límite alcanzado (402) se convierte en un error genérico y todo fallo del servidor se muestra como "error de conexión". (GEN-06, P07) | `src/lib/ai/openai.ts:48` | Propagar el código de error hasta la pantalla. | S |
| 4.5 | Coste por llamada: modelo por defecto `gpt-4o` para una tarea de selección (~20× más caro que `gpt-4o-mini`), sin `max_tokens`, reintento tras timeout que factura dos veces, y el modelo redacta 2-3 indicaciones por ejercicio (la mayor parte de los tokens de salida). (GEN-07, GEN-08, PLA-M2) | `generate-plan/index.ts:242,347` | Confirmar qué `MODEL_NAME` está desplegado; fijar `max_tokens`; quitar el reintento automático. | S |
| 4.6 | Calidad del plan: se aceptan planes con menos de 4 días o días vacíos; el catálogo enviado son 150 filas sin orden y el respaldo ignora el equipamiento; las restricciones por lesión son solo una línea del prompt. (GEN-09, GEN-10, GEN-12, P05) | `generate-plan/index.ts:125,160,453` | Validar en servidor antes de guardar. | M |
| 4.7 | Durante la generación solo hay un spinner con "unos segundos" y la navegación sigue activa; el cuestionario tiene 6 pantallas, no guarda borrador y el Atrás lo pierde. (GEN-17, GEN-18) | `intake-form.tsx:66,643` | Mensaje realista, bloquear salida accidental, guardar borrador. | M |

## Fase 5 — Administración del piloto

| # | Problema | Dónde | Arreglo | Esf. |
|---|---|---|---|---|
| 5.1 | **En móvil no hay ninguna entrada a `/admin`** (solo en la barra lateral de escritorio) ni enlace de vuelta a la app. (ADM-02 en vivo, ADM-03) | `src/components/ui/bottom-navigation.tsx:17` | Entrada en Ajustes para admins y botón de volver. | S |
| 5.2 | El panel solo muestra correo, fecha de alta, número de planes y tier: sin último entrenamiento, último acceso, sesiones ni generaciones. No se puede ver el plan o los registros de un usuario ni crear cuentas. (ADM-04, ADM-07, ADM-15) | `supabase/functions/admin-api/index.ts:145` | Columnas de actividad primero; vista de usuario y alta de cuentas después. | M-L |
| 5.3 | No se puede conceder Pro en bloque ni por defecto a los usuarios del piloto. (ADM-05) | `src/app/admin/page.tsx:298` | Acción en bloque o tier por defecto durante el piloto. | M |
| 5.4 | Sin ordenar ni filtrar; los errores salen arriba, fuera de pantalla y en inglés; recargar vacía la lista; a 390 px cada usuario ocupa 194 px con el tier duplicado y la papelera pegada al selector. La lista y el conteo de planes se truncarán a 1000 filas. (ADM-08, ADM-06, ADM-09 en vivo, ADM-07) | `admin/page.tsx:134,217,245` | Orden, filtro y fila compacta; paginación en la función. | M |
| 5.5 | Borrar un usuario (desde admin o desde Ajustes) deja sus fotos en Storage; no hay protección del último admin. La búsqueda por nombre no encuentra nada porque el nombre nunca llega a `profiles.name`. (ADM-12, ADM-13, ADM-M2, P09) | `admin-api/index.ts:193`, `scripts/auth-rls.sql:13` | Limpiar Storage al borrar; impedir borrar el último admin; guardar el nombre en el alta. | S-M |
| 5.6 | La función `execute_sql` (SQL dinámico con privilegios) sigue en `schemas/`; comprobar que no exista en la BD. (ADM-02 de código) | `schemas/create-execute-sql-function.sql:5` | Verificar en vivo y eliminar. | S |

## Fase 6 — Resto y pulido

- **Alta:** todos los botones de registro del landing abren "iniciar sesión"; no aceptar términos muestra "Ingresa correo y contraseña"; Términos y Privacidad no son enlaces; registrarse con un correo existente dice "revisa tu correo" sin enviar nada; reenviar confirmación no da señal de éxito. (ANON-04, ANON-05, USR-18, REM-M2) — S
- **Mi cuerpo:** guardar falla en silencio y deja fotos huérfanas; borrar una medida es inmediato y sin confirmación; acepta registros vacíos. (USR-14, USR-15, BODY-01) — S
- **Planes:** sustituir un ejercicio da por buena una actualización que puede no haber tocado filas; las alternativas ignoran el equipo y cargan hasta 60 GIF; la letra del día se recalcula por índice. (GEN-19, GEN-11, P06) — M
- **Historial:** RPE medio, cabecera de volumen y títulos incorrectos; la gráfica semanal deja sin barra la semana más floja; los logros de racha usan la última racha, no la mejor. (USR-26, REM-M3, USR-25) — S
- **Idiomas:** 46 claves usadas en código no existen en ningún JSON; pantallas de acceso en idioma mezclado; `/reset-password` falla la hidratación en navegadores en español. (USR-30, ANON-08, ANON-09) — M
- **Táctil y legibilidad:** papelera de plan de 30 px, salir de sesión de 36 px, info de RPE de 15 px; texto tenue con contraste insuficiente a pleno sol; el popover de RPE tapa "Completar serie". (TCH-16, TCH-17, TCH-15) — S-M
- **Android:** orientación sin bloquear; versión inconsistente (Ajustes dice 1.0.3, APK 1.0.4, `package.json` 0.1.0); `allowBackup` incluye el token de sesión; áreas seguras con configuración contradictoria; comprobar el `targetSdk` que exige hoy Google Play. (MOB-15, MOB-16, MOB-18, MOB-06, MOB-19) — S, dispositivo
- **Legal:** privacidad y borrado no mencionan fotos ni medidas; `public/index.html` es una portada antigua que enlaza a `creatifit-ai.vercel.app`. (USR-29, OFF-19, P16) — S

## Orden propuesto

1. **Fase 0** completa (0.1 hoy mismo: es una línea de SQL).
2. **1.1 a 1.5** juntas: son el mismo trozo de código y eliminan toda la pérdida y duplicación de series.
3. **2.1 a 2.5** y **1.7**: la app deja de expulsar al usuario o mentirle cuando no hay red, y puede entrenar sin conexión.
4. **1.9 a 1.12**: fricción por serie.
5. **4.1 y 4.2**: dejar de pagar generaciones perdidas o dobles.
6. **5.1 y 5.2** (columnas de actividad): para poder seguir el piloto.
7. **3.1**: el mayor ahorro de datos, pero requiere reprocesar los GIF.
8. Lo demás.

## Comprobar en un teléfono real antes del piloto

Versión de WebView y aspecto de la app; teclado y coma decimal en peso; pantalla que se apaga y temporizador durante el descanso; vibración; botón Atrás en sesión, historial y cuestionario; teclado tapando campos; áreas seguras; apertura sin red tras más de una hora; alta y recuperación de contraseña completas; paywall sin Google Play; fluidez con blur en gama baja.

## Datos de prueba que quedaron en la cuenta `robert.cabrer92@gmail.com`

- 11 filas en `workout_logs` del 2026-10-12: 9 del tester de sesión (8 del Día A repartidas en 4 `session_id` por el fallo 1.3, incluidas 2 duplicadas, y 1 del Día B) y 2 del tester móvil ("Bodyweight Lunge", duplicadas). La app no ofrece borrado (1.6).
- El tier se cambió 4 veces desde admin y quedó en su valor original (`pro_annual`); `subscription_updated_at` quedó con fecha de hoy.
- Una medida corporal y un favorito creados y borrados; idioma y tema restaurados. No se generó, mejoró ni borró ningún plan.
