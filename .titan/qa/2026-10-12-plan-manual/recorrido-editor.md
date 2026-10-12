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

## Después de aplicar en el Supabase real (mismo día)

Aplicados el backfill, `save_plan_structure`, `generate-plan` v14 y `admin-api` v10. Estado previo: 12 planes, ninguno con generación registrada, 4 generaciones de prueba. Después: 16 generaciones, 12 marcadas `legacy`, ningún plan sin fila.

| Paso (cuenta admin, Free, sin generaciones) | Resultado |
|---|---|
| Crear a mano con 2 ejercicios y guardar | Aparece en la lista; el borrador se borra del teléfono |
| Detalle | Título con el nombre puesto y etiqueta "Hecho a mano" |
| Editar: +1 serie, día nuevo con 1 ejercicio, mover ese día al principio, guardar | Detalle con "Día A · Core" y "Día B · Pecho" |
| Recargar la página | Los mismos días: lo guardado viene del servidor |
| Cambiar un ejercicio desde el día | Guardado por el mismo camino |
| Abrir la sesión del día A | Arranca el calentamiento |
| Base de datos | `payload` y `plan_exercises` con los mismos ejercicios, días, posiciones y series (0 diferencias); `source = manual`; ninguna generación nueva |
| Borrar el plan desde la app | Sin plan de prueba ni filas huérfanas; 12 planes como al empezar |

Fallo encontrado y corregido: la hoja "Cambiar ejercicio" ofrecía ejercicios que el día ya tenía y permitía duplicarlos.

## Rellenar con IA (fases 6 a 8, `generate-plan` v16)

Cuenta admin (Free, sin generaciones al empezar), navegador a 360 px.

| Paso | Resultado |
|---|---|
| `/plans?new=1` | Abre el editor de plan nuevo |
| "Rellenar este día con IA" en un plan sin perfil | Abre "Datos para la IA" |
| Enviar el cuestionario vacío | Rechazado con el aviso de rangos y equipo |
| Cuestionario con 31 años, 78,5 kg, 176 cm, intermedio, mancuernas y banco | Pasa a las opciones del relleno |
| Fuerza, zona Pecho, 4 ejercicios, nota corta, "Generar" | Pantalla de espera; resultado en 8 s |
| Resultado | 4 ejercicios en el día, los 4 de `Chest` y compatibles con mancuernas, banco o peso corporal; 1.355 + 238 tokens |
| Segundo relleno | Va directo a las opciones (el perfil se conserva), ofrece añadir o reemplazar, y al generar muestra el mensaje de límite sin llamar a la IA; el día no cambia |
| Guardar | El plan guarda el perfil en `payload.meta` (edad, peso 78.5, altura, nivel, equipo) con `source = manual` |
| Repetir el mismo `requestId` por la API | 200 con `reused: true`, sin tokens nuevos |
| Otro relleno por la API | 402 `FREE_LIMIT_REACHED` |
| Objetivo inventado por la API | 400 `INVALID_FILL` |
| 7 días × 8 ejercicios de Cardio solo con rodillo | 422 `NOT_ENOUGH_EXERCISES` (35 disponibles); fila `failed`, no gasta cupo |

Observación: el nombre del día salió "Cuerpo Superior + Núcleo" para un día solo de pecho. Se añadió al prompt que el nombre diga lo que el día entrena; ese ajuste no se pudo comprobar con otra generación.

## Sin probar

- Rellenar el plan entero, la generación de plan completo tras el cambio, "Mejorar plan" sobre un plan manual, recuperar un relleno tras un corte de red y el paywall nativo: la cuenta de prueba agotó su única generación.
- Entrenar el plan manual hasta el final y verlo en el historial.
- Editar un plan de IA y que conserve su cuestionario al guardarlo.
- Generar con IA teniendo un plan manual, y que una cuenta antigua con plan previo a `plan_generations` siga bloqueada (exige una generación real o la sesión de un tester).
- El panel admin con un plan manual como el más reciente.
- Red lenta (perfil 3G) en el selector.
- Todo en un APK o un teléfono: teclado, Atrás físico, rendimiento del selector.
