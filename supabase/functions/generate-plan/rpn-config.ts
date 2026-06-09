// Configuración RPN (Rate of Perceived Exertion) — copia autónoma para la Edge Function.
//
// Las Edge Functions corren en Deno y NO pueden importar de `src/lib`. Por eso este
// archivo replica `src/lib/config/rpn-config.ts`. Si cambias uno, cambia el otro.

export const RPN_CONFIG = {
  level: {
    beginner: {
      sets: { min: 1, max: 2 },
      reps: { min: 5, max: 8 },
      rest_sec: { min: 90, max: 120 },
      intensity: "very_low",
      progression: "conservative",
    },
    intermediate: {
      sets: { min: 2, max: 3 },
      reps: { min: 8, max: 12 },
      rest_sec: { min: 60, max: 90 },
      intensity: "low_to_medium",
      progression: "moderate",
    },
    advanced: {
      sets: { min: 3, max: 4 },
      reps: { min: 10, max: 15 },
      rest_sec: { min: 45, max: 75 },
      intensity: "medium_to_high",
      progression: "aggressive",
    },
  },

  objective: {
    rehabilitation: {
      sets: { min: 1, max: 2 },
      reps: { min: 3, max: 6 },
      rest_sec: { min: 120, max: 180 },
      intensity: "very_low",
      focus: ["mobility", "stability", "gentle_movement"],
      restrictions: ["no_jumps", "no_high_impact", "no_heavy_lifting"],
    },
    fat_loss: {
      sets: { min: 2, max: 3 },
      reps: { min: 12, max: 20 },
      rest_sec: { min: 30, max: 60 },
      intensity: "medium",
      focus: ["cardio", "endurance", "metabolic"],
    },
    muscle_gain: {
      sets: { min: 3, max: 4 },
      reps: { min: 8, max: 12 },
      rest_sec: { min: 60, max: 120 },
      intensity: "medium_to_high",
      focus: ["hypertrophy", "strength", "progressive_overload"],
    },
    strength: {
      sets: { min: 3, max: 5 },
      reps: { min: 3, max: 8 },
      rest_sec: { min: 120, max: 300 },
      intensity: "high",
      focus: ["maximal_strength", "power", "technique"],
    },
    endurance: {
      sets: { min: 2, max: 3 },
      reps: { min: 15, max: 30 },
      rest_sec: { min: 30, max: 60 },
      intensity: "low_to_medium",
      focus: ["aerobic", "muscular_endurance", "recovery"],
    },
    mobility: {
      sets: { min: 1, max: 2 },
      reps: { min: 8, max: 15 },
      rest_sec: { min: 30, max: 60 },
      intensity: "very_low",
      focus: ["flexibility", "range_of_motion", "joint_health"],
    },
    general_health: {
      sets: { min: 2, max: 3 },
      reps: { min: 8, max: 15 },
      rest_sec: { min: 60, max: 90 },
      intensity: "low_to_medium",
      focus: [
        "overall_fitness",
        "cardiovascular_health",
        "functional_movement",
        "strength_maintenance",
      ],
    },
    body_recomposition: {
      sets: { min: 2, max: 4 },
      reps: { min: 8, max: 15 },
      rest_sec: { min: 45, max: 90 },
      intensity: "medium",
      focus: ["muscle_building", "fat_loss", "metabolic_conditioning"],
    },
    power: {
      sets: { min: 3, max: 5 },
      reps: { min: 3, max: 6 },
      rest_sec: { min: 120, max: 300 },
      intensity: "high",
      focus: ["explosive_power", "speed", "athletic_performance"],
    },
    sports_performance: {
      sets: { min: 3, max: 4 },
      reps: { min: 6, max: 12 },
      rest_sec: { min: 90, max: 180 },
      intensity: "medium_to_high",
      focus: ["sport_specific", "agility", "coordination", "power"],
    },
    functional_fitness: {
      sets: { min: 2, max: 3 },
      reps: { min: 8, max: 15 },
      rest_sec: { min: 45, max: 90 },
      intensity: "medium",
      focus: [
        "daily_activities",
        "functional_movement",
        "core_stability",
        "balance",
      ],
    },
  },

  gender: {
    male: {
      focus_areas: ["upper_body_strength", "core_stability", "flexibility"],
      common_weaknesses: ["hip_mobility", "shoulder_stability", "posture"],
    },
    female: {
      focus_areas: [
        "upper_body_strength",
        "core_stability",
        "lower_body_power",
      ],
      common_weaknesses: ["upper_body_strength", "grip_strength", "bone_density"],
    },
    other: {
      focus_areas: [
        "balanced_development",
        "functional_movement",
        "overall_fitness",
      ],
      common_weaknesses: ["general_fitness", "movement_patterns", "consistency"],
    },
  },

  age: {
    young_adult: { recovery_factor: 1.0, progression_rate: "normal", intensity_modifier: 1.0 },
    adult: { recovery_factor: 1.2, progression_rate: "moderate", intensity_modifier: 0.9 },
    mature_adult: { recovery_factor: 1.5, progression_rate: "conservative", intensity_modifier: 0.8 },
    senior: { recovery_factor: 2.0, progression_rate: "very_conservative", intensity_modifier: 0.7 },
  },
} as const;

type LevelKey = keyof typeof RPN_CONFIG.level;
type ObjectiveKey = keyof typeof RPN_CONFIG.objective;
type GenderKey = keyof typeof RPN_CONFIG.gender;
type AgeKey = keyof typeof RPN_CONFIG.age;

interface UserProfile {
  level: string;
  objective: string;
  gender: string;
  age: number;
}

export function getRPNConfig(userProfile: UserProfile) {
  const levelConfig =
    RPN_CONFIG.level[userProfile.level as LevelKey] ?? RPN_CONFIG.level.beginner;
  const objectiveConfig =
    RPN_CONFIG.objective[userProfile.objective as ObjectiveKey] ??
    RPN_CONFIG.objective.general_health;
  const genderConfig =
    RPN_CONFIG.gender[userProfile.gender as GenderKey] ?? RPN_CONFIG.gender.other;

  let ageGroup: AgeKey = "adult";
  if (userProfile.age <= 30) ageGroup = "young_adult";
  else if (userProfile.age <= 50) ageGroup = "adult";
  else if (userProfile.age <= 65) ageGroup = "mature_adult";
  else ageGroup = "senior";

  const ageConfig = RPN_CONFIG.age[ageGroup];

  return {
    level: levelConfig,
    objective: objectiveConfig,
    gender: genderConfig,
    age: ageConfig,
    combined: {
      sets: {
        min: Math.max(levelConfig.sets.min, objectiveConfig.sets.min),
        max: Math.max(
          Math.max(levelConfig.sets.min, objectiveConfig.sets.min),
          Math.min(levelConfig.sets.max, objectiveConfig.sets.max)
        ),
      },
      reps: {
        min: Math.max(levelConfig.reps.min, objectiveConfig.reps.min),
        max: Math.max(
          Math.max(levelConfig.reps.min, objectiveConfig.reps.min),
          Math.min(levelConfig.reps.max, objectiveConfig.reps.max)
        ),
      },
      rest_sec: {
        min: Math.max(levelConfig.rest_sec.min, objectiveConfig.rest_sec.min),
        max: Math.max(
          Math.max(levelConfig.rest_sec.min, objectiveConfig.rest_sec.min),
          Math.min(levelConfig.rest_sec.max, objectiveConfig.rest_sec.max)
        ),
      },
      intensity: objectiveConfig.intensity,
      focus: ("focus" in objectiveConfig ? objectiveConfig.focus : []) as string[],
      restrictions: ("restrictions" in objectiveConfig
        ? objectiveConfig.restrictions
        : []) as string[],
    },
  };
}

export function generateRPNInstructions(userProfile: UserProfile): string {
  const config = getRPNConfig(userProfile);

  return `RPN-SPECIFIC INSTRUCTIONS:
- Sets: ${config.combined.sets.min}-${config.combined.sets.max} sets per exercise
- Reps: ${config.combined.reps.min}-${config.combined.reps.max} reps per set
- Rest: ${config.combined.rest_sec.min}-${config.combined.rest_sec.max} seconds between sets
- Intensity: ${config.combined.intensity}
- Focus areas: ${config.combined.focus.join(", ")}
${config.combined.restrictions.length > 0 ? `- Restrictions: ${config.combined.restrictions.join(", ")}` : ""}

GENDER-SPECIFIC FOCUS:
- ${config.gender.focus_areas.join(", ")}
- Common weaknesses to address: ${config.gender.common_weaknesses.join(", ")}

AGE CONSIDERATIONS:
- Recovery factor: ${config.age.recovery_factor}x longer rest periods
- Progression rate: ${config.age.progression_rate}
- Intensity modifier: ${config.age.intensity_modifier}x intensity`;
}
