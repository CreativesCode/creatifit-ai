# Recorrido del editor de planes — 2026-10-12

PRP-001, fases 1 a 5. Base de código: commit de la fase 5 más el arreglo del botón Atrás.

## Cómo se probó

- **SQL** (`add-save-plan-structure.sql`, `backfill-plan-generations-legacy.sql`): en un PostgreSQL 17 local desechable con las tablas `plans`, `plan_exercises`, `exercises` y `plan_generations`, los roles `authenticated` y `anon` y las mismas políticas RLS. No se aplicó nada al Supabase real.
- **Interfaz**: `next dev`, Chrome sin ventana a 360 × 740 con perfil táctil, sesión con la cuenta admin (sin planes) contra el Supabase real. Solo lecturas: la función `save_plan_structure` no existe allí todavía.

## SQL

| Caso | Resultado |
|---|---|
| Crear un plan de dos días con valores fuera de rango | Días reetiquetados A y B, nombres tomados del catálogo, series 99 → 10, reps [20, 5] → [20, 20], descanso −5 → 0 |
| Bloque sin `exercise_id` con nombre que existe en el catálogo | Enlazado por nombre |
| Bloque sin `exercise_id` con nombre que no existe | Se conserva con su nombre, sin enlace |
| Repetir la llamada con otro contenido y `p_weeks` nulo | Un solo plan, `plan_exercises` reescrito, semanas conservadas |
| `payload` frente a `plan_exercises` | Mismo ejercicio, día y posición |
| Día vacío, sin días, 8 días, ejercicio desconocido, id vacío | Rechazados; no queda nada escrito |
| Otro usuario guarda sobre el plan | Rechazado (clave primaria); no ve el plan |
| `anon` | Sin permiso de ejecución |
| Backfill | Fila `ok` para planes de IA (también con payload en texto), ninguna para el manual ni para planes sin usuario; repetirlo no añade filas |

## Interfaz

| Paso | Resultado |
|---|---|
| "+" en Planes | Abre la hoja "Crear a mano / Crear con IA" |
| Atrás con la hoja abierta | Cierra la hoja y sigue en `/plans` |
| "Crear a mano" | Abre el editor con el día A vacío |
| Selector | 30 ejercicios por página con miniatura; el filtro por grupo muscular responde |
| Elegir 3 ejercicios de dos grupos en una visita | Entran en el día con 3 series, 8-12 reps y 60 s |
| Ancho de 360 px | Sin desbordamiento horizontal |
| Guardar con un día vacío | Aviso y no guarda |
| Atrás con cambios | Pide confirmación; Atrás otra vez la cierra y sigue en el editor |
| Salir y volver | La hoja ofrece "Seguir con mi plan a mano"; se recuperan nombre y ejercicios, con aviso |
| Selector sin conexión | "Hace falta conexión", sin lista |
| Guardar sin conexión | Mensaje de sin conexión; el borrador sigue en el teléfono |
| Volver la conexión | Reintenta solo (respondió 404 porque la función no está en el servidor) |
| "Descartar cambios" | Borra el borrador y vuelve a la lista |

## Fallo encontrado y corregido

Al cerrar la hoja y abrir el editor seguido, el botón Atrás del teléfono salía de la página en vez de cerrar el editor: el retroceso que retiraba la marca del historial de la hoja dejaba atrás la marca nueva del editor. `src/lib/back-guard.ts` ahora hereda la marca libre y no añade ninguna mientras hay un retroceso en curso.

## Sin probar

- Guardar un plan de verdad, reabrirlo, entrenarlo y verlo en el historial: necesita `save_plan_structure` en el Supabase real.
- Editar un plan existente (la cuenta de prueba no tenía ninguno) y que un plan de IA conserve su cuestionario al guardarlo.
- El cupo de IA con cuentas reales (Free con plan manual y sin generaciones; cuenta antigua con plan previo a `plan_generations`).
- El panel admin con un plan manual como el más reciente.
- Red lenta (perfil 3G) en el selector.
- Todo en un APK o un teléfono: teclado, Atrás físico, rendimiento del selector.
