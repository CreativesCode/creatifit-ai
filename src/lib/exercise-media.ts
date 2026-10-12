// Único constructor de la URL de una imagen de ejercicio. Antes cada pantalla
// la armaba a su manera y la misma imagen salía con dos URL distintas (una con
// doble barra), así que el navegador la descargaba dos veces.

const BASE = (process.env.NEXT_PUBLIC_STATICS_IMAGES ?? "").replace(/\/+$/, "");

export const EXERCISE_PLACEHOLDER = "/placeholder-exercise.svg";

/** URL de la imagen, o null si no hay archivo o falta la base configurada. */
export function exerciseImageUrl(gif?: string | null): string | null {
  if (!gif || !BASE) return null;
  return `${BASE}/${gif.replace(/^\/+/, "")}`;
}

/** Igual que `exerciseImageUrl`, pero cae al placeholder local. */
export function exerciseImageSrc(gif?: string | null): string {
  return exerciseImageUrl(gif) ?? EXERCISE_PLACEHOLDER;
}
