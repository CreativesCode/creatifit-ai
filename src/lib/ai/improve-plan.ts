// "Mejorar plan": genera una PROGRESIÓN del plan actual usando el historial de
// entrenamientos del usuario. No requiere una nueva Edge Function: reutiliza
// `generate-plan` reconstruyendo el intake desde `plan.payload.meta` y pasando
// un resumen del progreso en el campo `notes` (que la función inyecta en el
// prompt como "USER NOTES"). El resultado se guarda como un plan NUEVO, así el
// plan anterior y el historial se conservan.

interface WorkoutLog {
  exercise_name?: string | null;
  actual_reps?: number | null;
  weight?: number | null;
  rpe?: number | null;
  session_id?: string | null;
  plan_id?: string | null;
  timestamp?: string | null;
}

// Filtra los logs a los ENTRENAMIENTOS INICIADOS DESDE ESTE plan. `workout_logs`
// guarda `plan_id` (ver schemas/add-workout-log-plan-id.sql) con el id del plan
// desde el que se inició la sesión, así que la atribución es exacta —no un cruce
// por nombre—. Los logs anteriores a esa migración tienen plan_id NULL y no se
// cuentan (no se pueden atribuir a ningún plan de forma fiable).
export function logsForPlan<T extends { plan_id?: string | null }>(
  logs: T[] | null | undefined,
  planId: string | undefined
): T[] {
  if (!planId) return [];
  const rows = Array.isArray(logs) ? logs : [];
  return rows.filter((l) => l.plan_id === planId);
}

export interface ImproveEligibility {
  eligible: boolean;
  sessions: number; // nº de entrenamientos terminados (session_id distintos)
  loggedSets: number; // series con datos reales (reps/peso)
}

// Regla de negocio (pedida por producto): "Mejorar plan" solo debe estar
// disponible si hay AL MENOS un entrenamiento terminado y datos para mejorar.
// Exigimos ≥1 sesión con ≥1 serie registrada con reps/peso.
export function computeImproveEligibility(
  logs: WorkoutLog[] | null | undefined
): ImproveEligibility {
  const rows = Array.isArray(logs) ? logs : [];
  const sessions = new Set<string>();
  let loggedSets = 0;
  for (const l of rows) {
    if (l.session_id) sessions.add(String(l.session_id));
    const reps = Number(l.actual_reps);
    const weight = Number(l.weight);
    if ((Number.isFinite(reps) && reps > 0) || (Number.isFinite(weight) && weight > 0)) {
      loggedSets++;
    }
  }
  return {
    sessions: sessions.size,
    loggedSets,
    eligible: sessions.size >= 1 && loggedSets >= 1,
  };
}

// Mejor serie registrada por ejercicio (mayor peso; a igualdad, más reps), para
// dar al modelo referencias concretas de carga sobre las que progresar.
function topLifts(logs: WorkoutLog[], limit = 6): string[] {
  const best = new Map<string, { weight: number; reps: number }>();
  for (const l of logs) {
    const name = (l.exercise_name || "").trim();
    if (!name) continue;
    const weight = Number(l.weight) || 0;
    const reps = Number(l.actual_reps) || 0;
    const prev = best.get(name);
    if (!prev || weight > prev.weight || (weight === prev.weight && reps > prev.reps)) {
      best.set(name, { weight, reps });
    }
  }
  return Array.from(best.entries())
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, limit)
    .map(([name, v]) =>
      v.weight > 0
        ? `${name}: ${v.weight}kg x ${v.reps || "?"} reps`
        : `${name}: ${v.reps || "?"} reps (bodyweight)`
    );
}

// Construye el resumen de progreso (en inglés, como el resto del prompt) que se
// pasa en `notes`. Los textos legibles (focus/cues) los escribe el modelo en el
// idioma del usuario según el `language` del intake.
export function buildProgressionNotes(
  logs: WorkoutLog[],
  eligibility: ImproveEligibility
): string {
  const rpes = logs
    .map((l) => Number(l.rpe))
    .filter((n) => Number.isFinite(n) && n > 0);
  const avgRpe = rpes.length
    ? rpes.reduce((a, b) => a + b, 0) / rpes.length
    : 0;

  let intensitySignal: string;
  if (avgRpe && avgRpe < 7) {
    intensitySignal =
      "Recent sessions felt relatively easy (low average RPE), so INCREASE intensity and/or volume more assertively.";
  } else if (avgRpe && avgRpe > 8.5) {
    intensitySignal =
      "Recent sessions felt very hard (high average RPE), so progress CONSERVATIVELY and manage fatigue.";
  } else {
    intensitySignal =
      "Intensity has been appropriate; apply moderate progressive overload.";
  }

  const lifts = topLifts(logs);
  const liftsText = lifts.length
    ? `\nRecent best sets (progress from these): ${lifts.join("; ")}.`
    : "";

  return [
    "This plan is a PROGRESSION of the user's previous plan, based on their real training history.",
    `They have completed ${eligibility.sessions} training session(s) with ${eligibility.loggedSets} logged set(s).`,
    avgRpe ? `Average RPE across logged sets: ${avgRpe.toFixed(1)}/10.` : "",
    intensitySignal,
    "Keep a similar split and structure, but PROGRESS the plan (adjust load, reps and/or sets) to drive continued improvement. Prioritise the movement patterns they have been training and do NOT regress difficulty.",
    liftsText,
  ]
    .filter(Boolean)
    .join(" ");
}

// Reconstruye el `intake` de generate-plan desde el meta del plan actual, más el
// idioma y las notas de progresión. Si el plan viejo no guardó algún campo,
// caemos a valores seguros por defecto.
export function buildImproveIntake(
  planMeta: Record<string, any> | undefined,
  weeks: number,
  language: string,
  notes: string
) {
  const m = planMeta || {};
  return {
    weeks: Number(weeks) || 8,
    objective: m.objective || "general_health",
    level: m.level || "beginner",
    gender: m.gender || "other",
    age: Number(m.age) || 30,
    weightKg: Number(m.weight_kg) || 70,
    heightCm: Number(m.height_cm) || 170,
    equipment: m.equipment || {},
    stepsDay: m.steps_day,
    language,
    constraints: {
      jumps: !!m.constraints?.jumps,
      high_impact: !!m.constraints?.high_impact,
      heavy_lifting: !!m.constraints?.heavy_lifting,
    },
    notes,
  };
}
