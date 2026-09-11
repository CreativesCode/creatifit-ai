# Fuentes y cobertura de la reconstrucción

Fecha de lectura: 2026-09-10. Base: 2cb14df. Las rutas de esta tabla parten de la raíz del repo. [Inventario con hashes](inventario.json) fija qué documentos/artefactos existían al revisar; un hash no demuestra validez de sus afirmaciones.

| Fuente | Tratamiento y conocimiento conservado |
|---|---|
| README.md | Lectura completa. Visión original útil; Prisma/API/scripts db obsoletos. LICENSE sí existe en raíz (MIT de CreativesCode); no extenderla automáticamente a recursos terceros de Titan |
| instructions.md | Lectura completa. Brief, restricciones UX, i18n y Tailwind; arquitectura/ejemplos de arranque superados parcialmente. Offline/push/periodización como propuestas |
| EXERCISES-README.md | Lectura completa. Tres SQL home/equipment/advanced citados no existen en árbol actual. No seguir su instalación como vigente |
| MOBILE-ENV-SETUP.md | Lectura completa. Instrucciones de secretos inseguras/obsoletas; no aplicables |
| REVISION-MEJORAS.md | Lectura completa. Auditoría de 2026-06-09; conclusiones contrastadas, preservando fecha de sus pruebas históricas |
| docs/PLAN-ENGAGEMENT-FEATURES.md | Lectura completa pese a estar ignorado. Features base presentes; pendientes opcionales y contradicciones internas depurados |
| docs/design/REDESIGN-PLAN.md | Lectura completa. 25 artboards declarados históricamente; muchas brechas ya implementadas |
| supabase/functions/generate-plan/DEPLOY.md | Lectura completa. Dependencias SQL, catálogo numerado, smoke histórico y operación; no se ejecutó |
| AGENTS.md / .titan/INSTALLATION.md / memoria inicial | Integración y límites de Titan; estado sin commit superado por commit de instalación |
| docs/design/*.jsx, *.css, Redesign.html | Inspección estructural de prototipo, componentes y composición; no ejecución ni auditoría línea por línea del canvas |
| docs/design/**/*.png y SVG | Inventario de assets/capturas históricos; no revisión visual exhaustiva de cada imagen |
| docs/design/_dev*.log | Inventariados como logs de herramienta, no fuente de hechos vigentes ni memoria a copiar |
| Páginas privacy/terms/account-deletion/support | Lectura de contenido como documentación de producto, no validación jurídica |
| src/, schemas/, scripts/, configs, .github/ | Contraste selectivo de flujos, reglas, contratos, side effects y configuración; no auditoría exhaustiva de cada línea |
| Git | Historia de commits para fechar cambios; no prueba automática de despliegue |

## Datos de catálogo

`schemas/data/complete_exercises_data_optimized.json` contiene 16 categorías en su estructura; archivos gif_urls_only y gif_urls_with_names tienen 1725 entradas cada uno. Son snapshots locales; no recuento de filas live, ni verificación de disponibilidad/licencia de cada GIF.

## Qué se excluyó deliberadamente

Dependencias, código generado de Next/Android, exportaciones out/dist/mobile-build y archivos index.txt de bundles no son documentación de decisiones. `.env.local`, keystores, credenciales y dumps personales no se leyeron para alimentar la memoria. Las recetas genéricas de `.agents/skills/titan-factory-codex` no se convirtieron en decisiones del producto.

No se ejecutó build/lint completo, tests de aplicación, compras, IA, migraciones, despliegue ni inspección live. Se validan vínculos/inventario/estructura de memoria y paridad de nombres i18n. No se garantiza una “memoria perfecta”: la base es verificable y debe actualizarse con evidencia nueva.

## Mantenimiento

Al cambiar una feature, actualizar su entrada y el pendiente asociado, con fecha y fuente. Mantener MEMORY.md breve; leer solo áreas relevantes. Si una fuente cambia de hash, revisar las conclusiones derivadas antes de reutilizarlas. No almacenar copias completas de docs, logs privados o valores de secretos.
