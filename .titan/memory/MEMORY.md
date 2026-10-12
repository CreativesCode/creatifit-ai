# Memoria de CreatiFit AI

Reconstruida el **2026-09-10**, base de código **2cb14df**. Reconstrucción de documentos y Git, no historial ficticio de Titan. Leer este índice y solo las entradas relevantes. Código actual e instrucciones explícitas prevalecen sobre notas históricas. No se verificó producción en esta revisión.

## Orientación inmediata

- App móvil/web de planes de entrenamiento, sesiones y progreso. Next **15.4.10**, React **19.1.0**, Tailwind **4.1**, Supabase y Capacitor 7.
- **Export estático**, `out` para Android. Backend privilegiado en **Supabase Edge Functions**, no APIs Next ni Prisma.
- Pagos **RevenueCat**; mantener el proveedor existente. EasyPanel es alternativa futura del toolkit.
- Rutina de cuatro días repetidos; “Mejorar plan” crea otro plan basado en logs. No confundir con periodización semanal ni offline completo.
- **No seguir MOBILE-ENV-SETUP.md para secretos**: instrucciones obsoletas. Nunca OpenAI/service-role en NEXT_PUBLIC_.
- SQL local no acredita RLS/despliegue live. “HECHO” en auditoría de junio no significa prueba actual.

## Estado a 2026-10-12

- **Plan de correcciones para el piloto en Cuba: cerrado en código** (`.titan/plans/2026-10-12-piloto-cuba-qa.md`), todo en `origin/main` (commit `190ea9b` más los de memoria). Su sección "Progreso" dice qué se hizo en cada tarea; leerla antes de tocar sesión, conexión, generación o admin.
- **Lo siguiente es del usuario:** generar el APK (`npm run build`, `npx cap sync android`, compilar) y probar en un teléfono lo marcado como "dispositivo" en el plan. Si vuelve con fallos del teléfono, empezar por ahí.
- Edge Functions desplegadas con el código de `main`: `generate-plan`, `admin-api`, `delete-account`. La web pública (`https://creatifit-ai.vercel.app`) se despliega sola con cada push.
- Desde esa fecha hay **offline básico** (cola local de series y copia local de lecturas), **corrección de la última serie, saltar ejercicio y terminar antes**, **generación idempotente con registro de consumo**, **tier y admin que no se degradan sin red**, **admin con actividad, detalle, alta de cuentas y Pro en bloque**, **filtro de equipo y restricciones aplicados en el servidor**, **miniaturas de ejercicios y ahorro de datos** y **recuperación de contraseña por la web pública**. Varias notas de septiembre que los daban por ausentes quedaron superadas; cada entrada lleva su apartado "Actualización 2026-10-12".
- Verificado en navegador con perfil de teléfono contra el Supabase real. **Nada probado aún en un APK ni en un teléfono físico.**
- La app es principalmente móvil (APK Android) y el piloto será con conexión lenta e intermitente.

## Plan manual + relleno con IA (PRP-001) — en curso desde 2026-10-12

- Plan y avance: `.titan/plans/prp-plan-manual-relleno-ia.md`, sección "Progreso". **Fases 1 a 5 (editor manual) hechas en código y con commit en `main` local, sin push.** Fases 6 a 8 (relleno con IA y cuestionario corto para mejorar planes manuales) sin empezar.
- **Aplicado en el Supabase real el 2026-10-12** con autorización expresa del usuario para este plan: backfill de generaciones (12 planes antiguos), `save_plan_structure`, `generate-plan` v14 y `admin-api` v10. Las fases 6 a 8 volverán a tocar `generate-plan`: esa autorización cubrió "los cambios necesarios" de entonces; confirmar antes de desplegar lo nuevo.
- **Falta el push:** la web pública sigue con el cliente anterior (compatible con lo aplicado). El editor manual no llega a los usuarios hasta el push y, en el teléfono, hasta un APK nuevo.
- `scripts/run-sql.ps1` lee el SQL sin codificación y estropea los acentos; para archivos con acentos enviar en UTF-8.
- Decisiones del usuario: planes manuales ilimitados en Free; solo se limita lo que usa IA; rellenar un día gasta una generación; el selector de ejercicios no funciona sin conexión (lo dice); un plan con entrenamientos se edita en sitio; "Mejorar plan" en un plan manual pedirá el cuestionario la primera vez.
- Reglas nuevas del código: el cupo de IA se cuenta solo sobre `plan_generations` (`countAiGenerations`), nunca sobre filas de `plans`; días y ejercicios de un plan se escriben solo con `supabaseClient.savePlanStructure`; un plan manual es una fila normal con `payload.meta.source = "manual"` (`isManualPlan`).
- Verificado en navegador a 360 px contra el Supabase real (`.titan/qa/2026-10-12-plan-manual/`): crear, guardar, editar, recargar, cambiar un ejercicio y arrancar la sesión de un plan manual, con `payload` y `plan_exercises` iguales en la BD. **Sin verificar: generar con IA teniendo un plan manual, cuentas antiguas bloqueadas, y todo en APK o teléfono.**

## Entradas por tarea

| Memoria | Cuándo leer |
|---|---|
| [Contexto técnico](project/creatifit.md) | Arranque y arquitectura |
| [Producto y flujos](project/producto-flujos.md) | Rutas, usuarios, sesiones, progreso |
| [Generación de planes](project/generacion-planes.md) | IA, catálogo, guardado, mejora |
| [Datos y seguridad](project/datos-seguridad.md) | SQL, RLS, Storage, cuenta y privacidad |
| [Suscripciones](project/suscripciones.md) | RevenueCat, tiers, cuotas, admin |
| [Diseño y móvil](project/diseno-movil.md) | Marca, idiomas, Capacitor, UX |
| [Operación](project/operacion.md) | Entorno, scripts, QA, despliegue |
| [Historial](project/historial.md) | Evolución desde agosto 2025 |
| [Pendientes](project/pendientes.md) | Priorización y comprobaciones abiertas |
| [Preferencias](user/preferencias.md) | Instrucciones explícitas del usuario |
| [Lecciones](feedback/lecciones.md) | Evitar errores/regresiones anteriores |
| [Fuentes y cobertura](reference/fuentes.md) | Evidencia, límites y documentación obsoleta |
| [Inventario](reference/inventario.json) | Rutas, hashes y clase de revisión |
| [Credenciales de prueba](reference/credenciales.local.md) | Acceso admin y uso del CLI de Supabase. **Archivo local, fuera de git**: solo existe en el equipo donde se creó |
| [Plan del piloto en Cuba](../plans/2026-10-12-piloto-cuba-qa.md) | QA general de octubre 2026: qué se corrigió y qué falta |
| [Plan manual + relleno con IA](../plans/prp-plan-manual-relleno-ia.md) | Editor de planes, cupo de IA, guardado de la estructura de un plan |

## Al retomar

Comprobar git status y cambios posteriores al baseline; leer contexto y área solicitada. No reabrir pendientes ya resueltos de documentos antiguos. Proponer próximos pasos desde pendientes sin ejecutarlos fuera de alcance. Actualizar la entrada correspondiente con fecha/evidencia tras cambios significativos. No cargar todos los documentos ni datos personales cada vez.

La instalación Titan quedó en commit 2cb14df. Esta reconstrucción de memoria es posterior y su existencia en disco no significa commit/push. El catálogo de esta interfaz muestra entradas directas y namespaced de las mismas recetas: no contarlas como capacidades distintas.
