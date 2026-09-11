# Pendientes y puntos que requieren verificación

Fecha: 2026-09-10. Priorización propuesta por esta revisión, no nueva autorización de implementación. “Local” indica código inspeccionado; “remoto” exige comprobar el entorno real.

| ID | Hallazgo / estado | Siguiente comprobación útil |
|---|---|---|
| P01 | Guía móvil recomienda secretos públicos; contradice implementación actual | Corregir/retirar MOBILE-ENV-SETUP.md en una tarea documental; mientras, tratarla como obsoleta |
| P02 | SQL tier/is_admin intenta impedir escritura por columna | Probar permisos efectivos SELECT/INSERT/UPDATE con dos usuarios y anon, incluyendo grants de tabla; no afirmar bloqueo solo por REVOKE |
| P03 | No existe cadena supabase/migrations; SQL disperso y variantes antiguas | Inventariar schema remoto y ordenar migraciones; no ejecutar todos los SQL |
| P04 | Free cuenta planes existentes; Pro ignora cupo 30/mes | Decidir contador de consumo real/rate limit y probar borrado, concurrencia y generación sin guardado |
| P05 | json_object y validación servidor parcial; fallback de catálogo general | Validar esquema, cuatro días, restricciones/equipo y fallback con pruebas reproducibles |
| P06 | Guardado/sustitución de plan en varias escrituras | Definir transacción/recuperación; verificar consistency de payload y plan_exercises |
| P07 | FREE_LIMIT_REACHED puede perderse en catch del wrapper | Probar respuesta 402 hasta la UI/paywall sin gasto de IA |
| P08 | Webhook sin control persistido de orden/idempotencia observado | Probar eventos fuera de orden, expiración, cambios de producto y perfiles inexistentes |
| P09 | Borrado de cuenta sin limpieza explícita de fotos | Verificar Storage + cascadas + errores; alinear promesa pública con comportamiento |
| P10 | React Query montado sin hooks; dependencias auth-ui/helpers heredadas | Decidir migración de fetching o retirada selectiva; no añadir más clientes Supabase |
| P11 | any, lint omitido en build y sin suite general en package.json | Establecer baseline actual antes de afirmar calidad; audit de 18 vulnerabilidades era histórico, no se repitió |
| P12 | Logros recalculados y rachas con semánticas distintas | Persistencia de desbloqueos/longest, fechas locales/UTC y DST |
| P13 | “Sesión terminada” en mejora se infiere de logs, sin marca verificada | Definir completado real y tratamiento de sesiones parciales |
| P14 | Rutina semanal repetida; mejora crea otra rutina | Separar en copy y roadmap mejora puntual de periodización semanal real |
| P15 | Offline SQLite/sync, push y export avanzado del brief sin implementación encontrada | Mantener como propuestas, no features disponibles |
| P16 | UI pública española y privacidad anterior a fotos/medidas | Revisar cobertura de textos y consistencia con datos enviados/almacenados |
| P17 | Release/tiendas/hosting/secrets no verificados | Comprobar entorno elegido, keys de plataforma, redirects y QA de dispositivo cuando se pida release |
| P18 | Catálogo Titan aparece directo y con namespace en esta interfaz | Revisar compatibilidad de carga entre host y CLI antes de universalizar instalador; no son 58 recetas distintas |

## No volver a abrir como si estuviera ausente

Prisma eliminado; cliente Supabase consolidado; JWT de generate-plan presente; constraints en onboarding; marca/sidebar/ring implementados; PRs, rachas, tendencias, fotos, favoritos, mejora/borrado de plan y detalle de ejercicio existentes. Las secciones antiguas que los dicen ausentes quedaron superadas por código/commits posteriores.

## Opcionales conservados

Virtualizar biblioteca, posters/vídeo en listas, selector de ejercicios para fuerza, edición de medidas, elección manual de fotos a comparar, persistencia de logros, toggle de sonido y notificaciones de racha. No confundir “opcional” con aprobado ni con fallo actual.

Fuentes/razones detalladas: [datos](datos-seguridad.md), [generación](generacion-planes.md), [pagos](suscripciones.md), [producto](producto-flujos.md), [operación](operacion.md), REVISION-MEJORAS.md y docs/PLAN-ENGAGEMENT-FEATURES.md.
