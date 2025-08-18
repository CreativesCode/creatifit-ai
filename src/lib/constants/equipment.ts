// CreatiFit AI - Tipos de Equipamiento Disponibles
// Sincronizado con los ejercicios en la base de datos

export interface EquipmentOption {
  key: string;
  label: string;
  category: "basic" | "resistance" | "weight" | "specialized";
  description: string;
}

export const EQUIPMENT_OPTIONS: EquipmentOption[] = [
  // EQUIPAMIENTO BÁSICO (SIN EQUIPOS)
  {
    key: "none",
    label: "No Equipment (Bodyweight Only)",
    category: "basic",
    description: "Solo peso corporal, pared, silla",
  },

  // EQUIPAMIENTO BÁSICO DOMÉSTICO
  {
    key: "wall",
    label: "Wall",
    category: "basic",
    description: "Pared para ejercicios de apoyo",
  },
  {
    key: "chair",
    label: "Chair/Stool",
    category: "basic",
    description: "Silla para ejercicios de apoyo y step-ups",
  },
  {
    key: "table",
    label: "Table/Desk",
    category: "basic",
    description: "Mesa para Australian pull-ups",
  },

  // BANDAS ELÁSTICAS
  {
    key: "resistance_band",
    label: "Resistance Bands",
    category: "resistance",
    description: "Bandas elásticas circulares y rectas",
  },
  {
    key: "resistance_tubes",
    label: "Resistance Tubes",
    category: "resistance",
    description: "Tubos de resistencia con mangos",
  },

  // PESOS
  {
    key: "dumbbells",
    label: "Dumbbells",
    category: "weight",
    description: "Mancuernas ajustables o fijas",
  },
  {
    key: "barbell",
    label: "Barbell",
    category: "weight",
    description: "Barra con pesas",
  },
  {
    key: "weight_plates",
    label: "Weight Plates",
    category: "weight",
    description: "Discos de peso para barra",
  },
  {
    key: "ez_bar",
    label: "EZ Bar",
    category: "weight",
    description: "Barra curva para curl y press",
  },
  {
    key: "trap_bar",
    label: "Trap Bar",
    category: "weight",
    description: "Barra hexagonal para deadlifts",
  },

  // EQUIPAMIENTO ESPECIALIZADO
  {
    key: "pullup_bar",
    label: "Pull-up Bar",
    category: "specialized",
    description: "Barra fija para dominadas",
  },
  {
    key: "ab_wheel",
    label: "Ab Wheel",
    category: "specialized",
    description: "Rueda abdominal",
  },
  {
    key: "pushup_handles",
    label: "Push-up Handles",
    category: "specialized",
    description: "Mangos para flexiones",
  },
  {
    key: "yoga_mat",
    label: "Yoga Mat",
    category: "specialized",
    description: "Esterilla de yoga",
  },
  {
    key: "foam_roller",
    label: "Foam Roller",
    category: "specialized",
    description: "Rodillo de espuma para recuperación",
  },
  {
    key: "jump_rope",
    label: "Jump Rope",
    category: "specialized",
    description: "Cuerda para saltar",
  },
  {
    key: "vibration_platform",
    label: "Vibration Platform",
    category: "specialized",
    description: "Plataforma vibratoria",
  },
  {
    key: "power_rack",
    label: "Power Rack",
    category: "specialized",
    description: "Rack de potencia para sentadillas y press",
  },
  {
    key: "bench",
    label: "Bench",
    category: "specialized",
    description: "Banco para press de pecho y otros ejercicios",
  },
  {
    key: "incline_bench",
    label: "Incline Bench",
    category: "specialized",
    description: "Banco inclinable para variaciones de press",
  },
  {
    key: "dip_bars",
    label: "Dip Bars",
    category: "specialized",
    description: "Barras paralelas para fondos",
  },
];

// Agrupar por categoría para mostrar en el formulario
export const EQUIPMENT_BY_CATEGORY = {
  basic: EQUIPMENT_OPTIONS.filter((e) => e.category === "basic"),
  resistance: EQUIPMENT_OPTIONS.filter((e) => e.category === "resistance"),
  weight: EQUIPMENT_OPTIONS.filter((e) => e.category === "weight"),
  specialized: EQUIPMENT_OPTIONS.filter((e) => e.category === "specialized"),
};

// Mapeo de claves del formulario a claves de la base de datos
export const EQUIPMENT_KEY_MAPPING: Record<string, string> = {
  dumbbells: "dumbbells",
  barbell: "barbell",
  weight_plates: "weight_plates",
  ez_bar: "ez_bar",
  trap_bar: "trap_bar",
  pullup_bar: "pullup_bar",
  ab_wheel: "ab_wheel",
  pushup_handles: "pushup_handles",
  resistance_tubes: "resistance_band",
  resistance_band: "resistance_band",
  wall: "wall",
  chair: "chair",
  table: "table",
  yoga_mat: "yoga_mat",
  foam_roller: "foam_roller",
  jump_rope: "jump_rope",
  vibration_platform: "vibration_platform",
  power_rack: "power_rack",
  bench: "bench",
  incline_bench: "incline_bench",
  dip_bars: "dip_bars",
  none: "none",
};
