import { IntakeSchema } from "@/lib/validators/schemas";

/* Perfil que la IA necesita para trabajar sobre un plan: lo mismo que pregunta
   el cuestionario, sin la duración. Vive en `payload.meta` del plan, igual que
   en los planes generados por IA. Un plan hecho a mano no lo tiene hasta que el
   usuario usa la IA por primera vez ("Rellenar con IA" o "Mejorar plan"). */

export const AI_OBJECTIVES = IntakeSchema.shape.objective.options;
export const AI_LEVELS = IntakeSchema.shape.level.options;
export const AI_GENDERS = IntakeSchema.shape.gender.options;
export const AI_CONSTRAINTS = ["jumps", "high_impact", "heavy_lifting"] as const;

export interface AiProfile {
  objective: (typeof AI_OBJECTIVES)[number];
  level: (typeof AI_LEVELS)[number];
  gender: (typeof AI_GENDERS)[number];
  age: number;
  weightKg: number;
  heightCm: number;
  equipment: Record<string, boolean>;
  constraints: Record<string, boolean>;
}

const ProfileSchema = IntakeSchema.pick({
  objective: true,
  level: true,
  gender: true,
  age: true,
  weightKg: true,
  heightCm: true,
  equipment: true,
  constraints: true,
});

const onlyTrue = (flags: unknown): Record<string, boolean> =>
  Object.fromEntries(
    Object.entries((flags ?? {}) as Record<string, unknown>).filter(([, on]) => on === true)
  ) as Record<string, boolean>;

/** Valida un perfil; devuelve null si falta algo o está fuera de rango. */
export function parseAiProfile(candidate: Partial<AiProfile>): AiProfile | null {
  const equipment = onlyTrue(candidate.equipment);
  // Sin equipo marcado el servidor lo trataría como "solo peso corporal" sin
  // que el usuario lo haya elegido.
  if (Object.keys(equipment).length === 0) return null;
  const parsed = ProfileSchema.safeParse({
    ...candidate,
    equipment,
    constraints: onlyTrue(candidate.constraints),
  });
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    equipment,
    constraints: onlyTrue(parsed.data.constraints),
  };
}

/** Perfil guardado en el meta de un plan, o null si ese plan no lo tiene. */
export function profileFromMeta(meta: Record<string, unknown> | null | undefined): AiProfile | null {
  if (!meta) return null;
  return parseAiProfile({
    objective: meta.objective as AiProfile["objective"],
    level: meta.level as AiProfile["level"],
    gender: (meta.gender as AiProfile["gender"]) ?? "other",
    age: Number(meta.age),
    weightKg: Number(meta.weight_kg),
    heightCm: Number(meta.height_cm),
    equipment: meta.equipment as Record<string, boolean>,
    constraints: (meta.constraints as Record<string, boolean>) ?? {},
  });
}

/** Campos de `payload.meta` que guardan el perfil (mismos nombres que los planes de IA). */
export function profileToMeta(profile: AiProfile): Record<string, unknown> {
  return {
    objective: profile.objective,
    level: profile.level,
    gender: profile.gender,
    age: profile.age,
    weight_kg: profile.weightKg,
    height_cm: profile.heightCm,
    equipment: profile.equipment,
    constraints: profile.constraints,
  };
}
