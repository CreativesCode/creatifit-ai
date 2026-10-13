// Filtros de equipo del selector de ejercicios. `token` es el texto que se busca
// dentro de exercises.equipment, una lista libre separada por comas
// ("Full Gym, Resistance Band"); va en singular para cubrir "Dumbbell" y
// "Dumbbells". `fallback` es la etiqueta en español si falta la traducción
// `exercises.filters.<key>`.
export const EQUIPMENT_FILTERS = [
  { key: "bodyweight", token: "no equipment", fallback: "Sin equipo" },
  { key: "bands", token: "resistance band", fallback: "Bandas elásticas" },
  { key: "dumbbells", token: "dumbbell", fallback: "Mancuernas" },
  { key: "barbell", token: "barbell", fallback: "Barra" },
  { key: "kettlebell", token: "kettlebell", fallback: "Pesa rusa" },
  { key: "bench", token: "bench", fallback: "Banco" },
  { key: "ball", token: "exercise ball", fallback: "Pelota" },
  { key: "machine", token: "machine", fallback: "Máquina" },
  { key: "cable", token: "cable", fallback: "Cable" },
] as const;

export type EquipmentFilterKey = (typeof EQUIPMENT_FILTERS)[number]["key"];
