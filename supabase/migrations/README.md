# Migraciones de la base de datos

Todo cambio de esquema (tablas, funciones, políticas, permisos) va aquí, en un
archivo nuevo. Los SQL de `schemas/` y `scripts/` son historia: no se añaden más
ahí ni se vuelven a aplicar.

## Qué hay

| Archivo | Contenido |
|---|---|
| `20261012000000_baseline.sql` | Esquema `public` completo, volcado del proyecto real el 2026-10-12 |
| `20261012000100_auth_and_storage.sql` | Trigger de perfil en `auth.users`, buckets y políticas de Storage |

Las dos se probaron juntas sobre un PostgreSQL 17 vacío: recrean las 14 tablas,
17 funciones y 32 políticas del proyecto real.

## Antes del primer `supabase db push`

El proyecto real ya tiene todo lo que describen esas dos migraciones. Hay que
decírselo al CLI una vez, o intentará crearlo de nuevo y fallará:

```bash
supabase migration repair --status applied 20261012000000 20261012000100 --linked
```

## Añadir un cambio

```bash
supabase migration new nombre_del_cambio   # crea el archivo con la fecha
# escribe el SQL; que se pueda ejecutar dos veces sin romper nada
supabase db push --linked                  # lo aplica y lo registra
```

`scripts/run-sql.ps1 -SqlFile <archivo>` también aplica un archivo, pero no lo
registra en el historial: después hay que marcarlo con `migration repair`.

Para probar un SQL sin tocar el proyecto real, levanta un PostgreSQL local
vacío, aplica las migraciones y luego el cambio.

## Volver a sacar la línea base

Si el esquema real cambió por fuera de las migraciones (desde el panel, por
ejemplo), se vuelca de nuevo con `supabase db dump --linked --schema public`
(necesita Docker en marcha) y se compara con lo que hay aquí.
