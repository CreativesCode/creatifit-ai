# Historial reconstruido

Creado: 2026-09-10. Fechas/commits de Git; describen cambios registrados, no certifican releases o despliegues. Titan se instaló el 10 de septiembre, no desde el inicio.

| Fecha | Evidencia | Evolución |
|---|---|---|
| 2025-08-17/18 | cf80500, 9255ae3 | Inicio y estructura Next, datos, planes y sesiones |
| 2025-08-20 | e41932e, d5ba155, 8836d57 | Validación/detalles, UX y preparación Capacitor |
| 2025-08-21 | d3ddab1 → 6b28692 → e2b8465 | De wrapper que redirigía a web a export estático con Supabase directo; APIs Next eliminadas |
| 2026-06-09 | a5553f2, 543724b, db68e96, 3f69b58 | Auth/RLS, marca/componentes, enlaces de ejercicios y mejoras móvil/sesión |
| 2026-06-09 | REVISION-MEJORAS.md | Auditoría histórica: declara correcciones, smoke 16/16 y builds verdes. Estados mezclados; contrastados con código en esta memoria |
| 2026-06-10 | b4ec28e, 1176b08 | RevenueCat incorporado; Prisma retirado explícitamente |
| 2026-06-10 | 486f3dd, 24af55b, a30c989 | Títulos/i18n, sugerencias de progresión, PRs/logros |
| 2026-06-11 | 4c7ac9c, 1d2d8ed, 746fea2, db8497d | Admin, páginas estáticas, medidas/fotos, firma Android |
| 2026-06-12 | b1e32ea, 9656d4a, c89b3f7 | Versiones Android y favoritos |
| 2026-06-19 | c8382d1 | Keepalive Supabase |
| 2026-07-06/07 | cf12c1c, 18123df, ddf0f8f | Eliminar/mejorar planes, atribución de logs, versión 1.0.4, loaders y viewport |
| 2026-07-08 | e940dc7 | Detalle de ejercicio compartido en biblioteca/planes |
| 2026-09-10 | 2cb14df | Instalación Titan solo en Creatifit: paquete, skills, perfiles, instrucciones, memoria base y exclusiones de build |

## Decisiones con evidencia

- Export estático/Supabase directo sustituyó API Next/Prisma; razón observable: empaquetado Capacitor y camino cliente actual.
- IDs canónicos del catálogo sustituyen matching libre para evitar detalles/GIFs ausentes.
- Mejora crea plan nuevo; plan_id de logs sin FK conserva historial y atribución aun si se borra plan.
- Retención mediante cálculos deterministas (rachas/PRs/tendencias) evita llamadas de IA adicionales para esas features; no equivale a infraestructura gratuita.
- Instalación Titan por proyecto preserva stack y conocimiento propios; no activa servicios ni delegación automática.

Si hace falta reconstruir una decisión más fina, consultar git show del commit y la implementación; no inferir autor, aprobación del usuario o éxito operativo a partir del título.
