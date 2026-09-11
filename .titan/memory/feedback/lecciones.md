# Lecciones para evitar regresiones

Reconstruidas 2026-09-10 de código, commits y revisión de junio. No se atribuyen como mensajes personales del usuario.

1. Código actual prevalece sobre snippets de README/instructions: el giro a export estático dejó contratos Next/Prisma obsoletos.
2. No poner claves privadas en NEXT_PUBLIC_; la antigua guía móvil contradice la corrección documentada de seguridad.
3. Mantener un cliente Supabase único; varios clientes de auth produjeron confusión/riesgo de carreras. INITIAL_SESSION evita carga inicial duplicada.
4. Generar desde catálogo real con IDs; matching libre por nombre dio planes sin GIFs/detalles. Validar estructura y compatibilidad además del ID.
5. UI de sesión y tablas usan representaciones diferentes: cambios deben mantener payload, detalles por día e historial coherentes. No volver a mezclar objeto agrupado con su wrapper `.exercises`.
6. Guardar progresivamente y avisar fallos; no simular éxito. Reanudar localmente no permite afirmar soporte offline completo.
7. Safe-area una sola vez; no restaurar padding global duplicado ni FLAG_LAYOUT_NO_LIMITS por copiar ejemplos viejos.
8. Conservar skeletons, lazy-loading, IntersectionObserver y reduced-motion; no añadir blur por cientos de tarjetas.
9. Dos archivos SQL con la misma función no son dos migraciones acumulativas: revisar cuál reemplaza cuál.
10. Un “HECHO” histórico debe contrastarse con código; un “verificado en producción” sin nueva ejecución conserva su fecha original.
11. Toolkit y proyecto tienen memoria distinta. No guardar decisiones de Creatifit dentro del paquete ni copiar esta memoria a otra app.
12. La documentación del toolkit tampoco es infalible: INSTALLATION decía “sin commit”, ya superado por 2cb14df. CLI detectó 29 entradas directas; esta interfaz también expone las recetas con namespace. No ocultar esa diferencia ni contar duplicados como capacidades nuevas.
