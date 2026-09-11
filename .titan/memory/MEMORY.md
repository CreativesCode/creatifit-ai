# Memoria de CreatiFit AI

Reconstruida el **2026-09-10**, base de código **2cb14df**. Reconstrucción de documentos y Git, no historial ficticio de Titan. Leer este índice y solo las entradas relevantes. Código actual e instrucciones explícitas prevalecen sobre notas históricas. No se verificó producción en esta revisión.

## Orientación inmediata

- App móvil/web de planes de entrenamiento, sesiones y progreso. Next **15.4.10**, React **19.1.0**, Tailwind **4.1**, Supabase y Capacitor 7.
- **Export estático**, `out` para Android. Backend privilegiado en **Supabase Edge Functions**, no APIs Next ni Prisma.
- Pagos **RevenueCat**; mantener el proveedor existente. EasyPanel es alternativa futura del toolkit.
- Rutina de cuatro días repetidos; “Mejorar plan” crea otro plan basado en logs. No confundir con periodización semanal ni offline completo.
- **No seguir MOBILE-ENV-SETUP.md para secretos**: instrucciones obsoletas. Nunca OpenAI/service-role en NEXT_PUBLIC_.
- SQL local no acredita RLS/despliegue live. “HECHO” en auditoría de junio no significa prueba actual.

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

## Al retomar

Comprobar git status y cambios posteriores al baseline; leer contexto y área solicitada. No reabrir pendientes ya resueltos de documentos antiguos. Proponer próximos pasos desde pendientes sin ejecutarlos fuera de alcance. Actualizar la entrada correspondiente con fecha/evidencia tras cambios significativos. No cargar todos los documentos ni datos personales cada vez.

La instalación Titan quedó en commit 2cb14df. Esta reconstrucción de memoria es posterior y su existencia en disco no significa commit/push. El catálogo de esta interfaz muestra entradas directas y namespaced de las mismas recetas: no contarlas como capacidades distintas.
