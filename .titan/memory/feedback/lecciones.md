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

Lecciones del plan del piloto (trabajo real del 2026-10-12, no reconstruidas):

13. (2026-10-12) Un `REVOKE` de columna no protege nada si el rol conserva el permiso de tabla. Comprobar los permisos efectivos con una sonda real como usuario normal, no leyendo el SQL.
14. (2026-10-12) No esperar a la red para avanzar en la sesión ni prometer reintentos que no existen. Toda escritura que el usuario no puede perder va primero al dispositivo, con id propio y envío idempotente.
15. (2026-10-12) Un fallo de red no es una cuenta vacía. Las pantallas deben distinguir "no hay datos" de "no se pudo cargar"; si no, a un usuario con planes se le ofrece crear el primero.
16. (2026-10-12) Con el token caducado y sin red, supabase-js espera ~30 s por llamada al refresh y luego consulta como anónimo, devolviendo listas vacías sin error. Tratar la falta de sesión como falta de conexión y no cachear ese resultado.
17. (2026-10-12) Lo que cuesta dinero necesita id de petición de extremo a extremo y registro en servidor antes de responder. Un reintento automático tras un timeout puede cobrar dos veces.
18. (2026-10-12) Si se oculta la navegación en una pantalla, comprobar que todas sus fases tienen salida: el descanso no tenía botón de salir y solo se vio al probarlo.
19. (2026-10-12) Probar en navegador a 360×640 con perfil táctil destapa fallos que no se ven en escritorio (acción principal fuera de pantalla, campos tapados), pero no sustituye al APK: teclado, wake lock, vibración y botón Atrás solo se confirman en un teléfono.
20. (2026-10-12) En Windows PowerShell 5.1, `Set-Content -Encoding utf8` añade BOM y puede romper archivos fuente: editar el código con las herramientas de edición, no con PowerShell.
21. (2026-10-12) En modo oscuro `.cf-card-solid` es translúcida (5 % de blanco): una hoja o diálogo sobre contenido necesita fondo propio (`var(--surface)`). Mirar la captura, no fiarse del nombre de la clase.
22. (2026-10-12) No reescribir los `common.json` con `JSON.parse` + `JSON.stringify`: reformatea todo el archivo y funde claves duplicadas. Insertar las claves como texto.
23. (2026-10-12) Al insertar texto con `s.replace(cadena, ...)` se sustituye la PRIMERA aparición: una línea con poca indentación es subcadena de otra más indentada. Insertar por índice (el script `add-keys` de la sesión recorre la ruta por indentación).
24. (2026-10-12) Antes de escribir en una página legal que algo "se borra", comprobar que el código lo borra: las fotos del Storage sobrevivían a la cuenta.
25. (2026-10-12) `history.back()` se aplica más tarde y su destino queda fijado al pedirlo. Si justo después se hace `pushState` (cerrar una hoja y abrir otra vista, o el doble montaje de React en desarrollo), el retroceso deja atrás la entrada nueva y el siguiente Atrás saca de la página. Para vistas que se abren sin cambiar de ruta usar `useBackGuard` (`src/lib/back-guard.ts`), que hereda la entrada libre en vez de quitarla y volver a ponerla; para navegar tras cerrar una, `afterBackGuards`.
26. (2026-10-12) Un `git commit -m @'...'@` desde PowerShell 5.1 se rompe si el mensaje lleva comillas dobles: escribir el mensaje en un archivo y usar `git commit -F`.
28. (2026-10-12) `next/font/google` descarga las fuentes al compilar: el build de la app (fastlane, en una máquina externa) falló con un error de `next-font-loader` por no llegar a Google Fonts. Las fuentes van en `src/app/fonts` con `next/font/local`; no volver a `next/font/google`. Una fuente o un peso nuevo exige añadir el archivo al repo.
27. (2026-10-12) Para probar SQL nuevo sin tocar el Supabase real: `initdb` + `pg_ctl` de PostgreSQL 17 (instalado en la máquina) en una carpeta temporal y otro puerto, con las tablas, los roles `authenticated`/`anon`, un `auth.uid()` que lee un ajuste de sesión y las mismas políticas RLS. Arrancar `pg_ctl` en segundo plano: en primer plano no devuelve el control.
