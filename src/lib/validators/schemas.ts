import { z } from "zod";

// Esquema para el cuestionario de intake
export const IntakeSchema = z.object({
  objective: z.enum([
    "fat_loss",
    "muscle_gain",
    "body_recomposition",
    "strength",
    "power",
    "endurance",
    "mobility",
    "rehabilitation",
    "sports_performance",
    "functional_fitness",
    "general_health",
  ]),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  gender: z.enum(["male", "female", "other"]),
  age: z.number().min(16).max(80),
  weightKg: z.number().min(30).max(200),
  heightCm: z.number().min(120).max(250),
  weeks: z.number().min(4).max(12).optional(),
  equipment: z.object({
    none: z.boolean().optional(),
    wall: z.boolean().optional(),
    chair: z.boolean().optional(),
    table: z.boolean().optional(),
    resistance_band: z.boolean().optional(),
    resistance_tubes: z.boolean().optional(),
    dumbbells: z.boolean().optional(),
    barbell: z.boolean().optional(),
    weight_plates: z.boolean().optional(),
    ez_bar: z.boolean().optional(),
    trap_bar: z.boolean().optional(),
    pullup_bar: z.boolean().optional(),
    ab_wheel: z.boolean().optional(),
    pushup_handles: z.boolean().optional(),
    yoga_mat: z.boolean().optional(),
    foam_roller: z.boolean().optional(),
    jump_rope: z.boolean().optional(),
    vibration_platform: z.boolean().optional(),
    power_rack: z.boolean().optional(),
    bench: z.boolean().optional(),
    incline_bench: z.boolean().optional(),
    dip_bars: z.boolean().optional(),
  }),
  constraints: z
    .object({
      jumps: z.boolean().optional(),
      high_impact: z.boolean().optional(),
      heavy_lifting: z.boolean().optional(),
    })
    .optional(),
  stepsDay: z.number().min(1000).max(20000).optional(),
  notes: z.string().max(500).optional(),
});

// Esquema para la generación de planes
export const PlanGenerationSchema = z.object({
  weeks: z.number().min(4).max(12),
  objective: z.enum([
    "fat_loss",
    "muscle_gain",
    "body_recomposition",
    "strength",
    "power",
    "endurance",
    "mobility",
    "rehabilitation",
    "sports_performance",
    "functional_fitness",
    "general_health",
  ]),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  gender: z.enum(["male", "female", "other"]),
  age: z.number().min(16).max(80),
  weightKg: z.number().min(30).max(200),
  heightCm: z.number().min(120).max(250),
  equipment: z.object({
    none: z.boolean().optional(),
    wall: z.boolean().optional(),
    chair: z.boolean().optional(),
    table: z.boolean().optional(),
    resistance_band: z.boolean().optional(),
    resistance_tubes: z.boolean().optional(),
    dumbbells: z.boolean().optional(),
    barbell: z.boolean().optional(),
    weight_plates: z.boolean().optional(),
    ez_bar: z.boolean().optional(),
    trap_bar: z.boolean().optional(),
    pullup_bar: z.boolean().optional(),
    ab_wheel: z.boolean().optional(),
    pushup_handles: z.boolean().optional(),
    yoga_mat: z.boolean().optional(),
    foam_roller: z.boolean().optional(),
    jump_rope: z.boolean().optional(),
    vibration_platform: z.boolean().optional(),
    power_rack: z.boolean().optional(),
    bench: z.boolean().optional(),
    incline_bench: z.boolean().optional(),
    dip_bars: z.boolean().optional(),
  }),
  constraints: z
    .object({
      jumps: z.boolean().optional(),
      high_impact: z.boolean().optional(),
      heavy_lifting: z.boolean().optional(),
    })
    .optional(),
  stepsDay: z.number().min(1000).max(20000).optional(),
});

// Esquema para la respuesta del plan generado
export const GeneratedPlanSchema = z.object({
  weeks: z.number(),
  days: z.array(
    z.object({
      day: z.string(), // A, B, C, D
      focus: z.string(),
      blocks: z.array(
        z.object({
          name: z.string(),
          // id real del ejercicio en la BD, resuelto por la Edge Function a partir
          // del `ref` que devuelve el modelo. Permite enlazar GIF/músculos sin
          // depender del frágil matching por nombre.
          exercise_id: z.string().uuid().optional(),
          sets: z.number(),
          reps: z.array(z.number()).length(2), // [min, max]
          rest_sec: z.number(),
          cues: z.array(z.string()).optional(),
        })
      ),
    })
  ),
});

// Esquema para logging de entrenamientos
export const WorkoutLogSchema = z.object({
  dayExerciseId: z.string(),
  setIndex: z.number().min(1),
  reps: z.number().min(1),
  load: z.number().min(0).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().max(200).optional(),
  ts: z.string().datetime().optional(),
});

// Tipos derivados
export type Intake = z.infer<typeof IntakeSchema>;
export type PlanGeneration = z.infer<typeof PlanGenerationSchema>;
export type GeneratedPlan = z.infer<typeof GeneratedPlanSchema>;
export type WorkoutLog = z.infer<typeof WorkoutLogSchema>;
