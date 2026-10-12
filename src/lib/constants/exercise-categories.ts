// Grupos musculares del catálogo. `value` es el valor EXACTO de
// exercises.category en la BD (los filtros usan igualdad, sensible a
// mayúsculas); `fallback` es la etiqueta en español si falta la traducción
// `exercises.categories.<value>`.
export const EXERCISE_CATEGORIES = [
  { value: "Chest", fallback: "Pecho" },
  { value: "Back / Wing", fallback: "Espalda" },
  { value: "Leg", fallback: "Piernas" },
  { value: "Hips", fallback: "Glúteos" },
  { value: "Abs / Core", fallback: "Core" },
  { value: "Cardio", fallback: "Cardio" },
  { value: "General", fallback: "General" },
] as const;
