# SQL histórico

Estos archivos son los cambios de esquema que se aplicaron a mano, uno a uno,
hasta el 2026-10-12. Se conservan como referencia de por qué existe cada cosa
(los comentarios de cada archivo lo explican).

**No se aplican de nuevo y no se añaden más aquí.** Varios se pisan entre sí
(dos archivos redefinen la misma función) y el orden no está registrado. El
estado real de la base de datos está en `supabase/migrations/`, que es donde va
cualquier cambio nuevo.

`database-schema.sql` es el esquema inicial de 2025, anterior a muchos cambios:
no describe la base actual.
