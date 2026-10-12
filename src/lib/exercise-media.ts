// Único constructor de la URL de una imagen de ejercicio. Antes cada pantalla
// la armaba a su manera y la misma imagen salía con dos URL distintas (una con
// doble barra), así que el navegador la descargaba dos veces.
//
// Cada GIF (0,2-0,9 MB) tiene además dos imágenes estáticas en el Storage,
// generadas con `scripts/build-exercise-thumbs.mjs`:
//   exercise-thumbs/<archivo>.webp   160 px, ~2 KB  -> listas y miniaturas
//   exercise-posters/<archivo>.webp  480 px, ~7 KB  -> sesión/detalle en ahorro de datos

const BASE = (process.env.NEXT_PUBLIC_STATICS_IMAGES ?? "").replace(/\/+$/, "");
// La base apunta a la carpeta de los GIF; las estáticas cuelgan del mismo bucket.
const BUCKET_ROOT = BASE.replace(/\/[^/]+$/, "");

export const EXERCISE_PLACEHOLDER = "/placeholder-exercise.svg";

const cleanName = (gif: string) => gif.replace(/^\/+/, "");

/** URL del GIF animado, o null si no hay archivo o falta la base configurada. */
export function exerciseImageUrl(gif?: string | null): string | null {
  if (!gif || !BASE) return null;
  return `${BASE}/${cleanName(gif)}`;
}

/** Igual que `exerciseImageUrl`, pero cae al placeholder local. */
export function exerciseImageSrc(gif?: string | null): string {
  return exerciseImageUrl(gif) ?? EXERCISE_PLACEHOLDER;
}

function staticUrl(folder: string, gif?: string | null): string | null {
  if (!gif || !BUCKET_ROOT) return null;
  return `${BUCKET_ROOT}/${folder}/${encodeURIComponent(cleanName(gif))}.webp`;
}

/** Miniatura estática (160 px) para listas. */
export const exerciseThumbUrl = (gif?: string | null) => staticUrl("exercise-thumbs", gif);

/** Imagen estática grande (480 px) que sustituye al GIF hasta que se pide verlo. */
export const exercisePosterUrl = (gif?: string | null) => staticUrl("exercise-posters", gif);
