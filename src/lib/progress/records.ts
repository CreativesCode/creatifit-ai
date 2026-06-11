// Cálculo de récords (PRs) y logros a partir del historial de series.
// Todo determinista y en cliente: coste $0, sin IA. Funciones puras y testeables.

// Forma mínima normalizada de una serie registrada. Compatible con la fila de
// Supabase (`workout_logs`, snake_case) y con un map desde el log de sesión.
export interface LogEntry {
  exercise_name: string;
  session_id: string;
  actual_reps: number;
  weight?: number | null;
  rpe?: number | null;
  timestamp?: string; // columna real (ISO)
  created_at?: string; // fallback
}

export type RecordType = "weight" | "e1rm" | "reps";

export interface ExerciseRecord {
  exerciseName: string;
  bestWeight?: number; // serie más pesada
  bestWeightReps?: number; // reps logradas en esa serie
  best1RM?: number; // 1RM estimado (Epley)
  bestReps?: number; // más reps en una serie (cualquier carga)
}

export interface NewPR {
  exerciseName: string;
  type: RecordType;
  value: number;
  previous?: number;
}

export interface Achievement {
  id: string;
  metric: "sessions" | "tonnage" | "streak";
  current: number;
  target: number;
  unlocked: boolean;
}

export interface ProgressStats {
  totalSessions: number;
  totalVolume: number;
  dayStreak: number;
}

const logTime = (l: LogEntry): string => l.timestamp ?? l.created_at ?? "";
const logWeight = (l: LogEntry): number | undefined =>
  typeof l.weight === "number" ? l.weight : undefined;

// 1RM estimado (fórmula de Epley). undefined si no hay carga: un único número
// comparable para medir progreso aunque cambien las reps o el peso.
export function estimate1RM(
  weight?: number | null,
  reps?: number
): number | undefined {
  if (!weight || weight <= 0 || !reps || reps <= 0) return undefined;
  return weight * (1 + reps / 30);
}

// Mejor marca por ejercicio a partir de todo el historial.
export function computeExerciseRecords(
  logs: LogEntry[]
): Map<string, ExerciseRecord> {
  const map = new Map<string, ExerciseRecord>();
  for (const l of logs) {
    const rec = map.get(l.exercise_name) ?? { exerciseName: l.exercise_name };
    const w = logWeight(l);
    if (w != null && w > 0) {
      if (rec.bestWeight == null || w > rec.bestWeight) {
        rec.bestWeight = w;
        rec.bestWeightReps = l.actual_reps;
      }
      const e = estimate1RM(w, l.actual_reps);
      if (e != null && (rec.best1RM == null || e > rec.best1RM)) {
        rec.best1RM = e;
      }
    }
    if (rec.bestReps == null || l.actual_reps > rec.bestReps) {
      rec.bestReps = l.actual_reps;
    }
    map.set(l.exercise_name, rec);
  }
  return map;
}

// Detecta los récords batidos en `sessionLogs` respecto al historial previo.
// Solo cuenta si ya existía marca previa del ejercicio (evita falsos PRs la
// primera vez que se hace). Devuelve un PR "titular" por ejercicio.
export function detectNewPRs(
  priorLogs: LogEntry[],
  sessionLogs: LogEntry[]
): NewPR[] {
  const prior = computeExerciseRecords(priorLogs);
  const session = computeExerciseRecords(sessionLogs);
  const prs: NewPR[] = [];
  for (const [name, s] of session) {
    const p = prior.get(name);
    if (!p) continue; // primera vez con este ejercicio → no es "récord batido"
    if (s.bestWeight != null && p.bestWeight != null && s.bestWeight > p.bestWeight) {
      prs.push({ exerciseName: name, type: "weight", value: s.bestWeight, previous: p.bestWeight });
    } else if (s.best1RM != null && p.best1RM != null && s.best1RM > p.best1RM + 0.01) {
      prs.push({ exerciseName: name, type: "e1rm", value: s.best1RM, previous: p.best1RM });
    } else if (s.bestReps != null && p.bestReps != null && s.bestReps > p.bestReps) {
      prs.push({ exerciseName: name, type: "reps", value: s.bestReps, previous: p.bestReps });
    }
  }
  return prs;
}

interface SessionAgg {
  sessionId: string;
  date: string; // YYYY-MM-DD
  volume: number;
}

function aggregateSessions(logs: LogEntry[]): SessionAgg[] {
  const m = new Map<string, SessionAgg>();
  for (const l of logs) {
    const date = logTime(l).split("T")[0] || "";
    const cur = m.get(l.session_id) ?? { sessionId: l.session_id, date, volume: 0 };
    cur.volume += l.actual_reps * (logWeight(l) ?? 0);
    if (!cur.date && date) cur.date = date;
    m.set(l.session_id, cur);
  }
  return Array.from(m.values());
}

// Racha de días consecutivos terminando en el último día entrenado.
function computeDayStreak(dates: string[]): number {
  const days = Array.from(new Set(dates.filter(Boolean))).sort();
  if (days.length === 0) return 0;
  let streak = 1;
  for (let i = days.length - 1; i > 0; i--) {
    const d1 = new Date(days[i] + "T00:00:00").getTime();
    const d0 = new Date(days[i - 1] + "T00:00:00").getTime();
    if (Math.round((d1 - d0) / 86400000) === 1) streak++;
    else break;
  }
  return streak;
}

export function computeStats(logs: LogEntry[]): ProgressStats {
  const sessions = aggregateSessions(logs);
  return {
    totalSessions: sessions.length,
    totalVolume: sessions.reduce((s, x) => s + x.volume, 0),
    dayStreak: computeDayStreak(sessions.map((s) => s.date)),
  };
}

interface AchievementDef {
  id: string;
  metric: Achievement["metric"];
  target: number;
}

// Hitos desbloqueables. Los títulos/descripciones se traducen en la UI por id.
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_session", metric: "sessions", target: 1 },
  { id: "sessions_5", metric: "sessions", target: 5 },
  { id: "sessions_10", metric: "sessions", target: 10 },
  { id: "sessions_25", metric: "sessions", target: 25 },
  { id: "sessions_50", metric: "sessions", target: 50 },
  { id: "streak_3", metric: "streak", target: 3 },
  { id: "streak_7", metric: "streak", target: 7 },
  { id: "tonnage_1000", metric: "tonnage", target: 1000 },
  { id: "tonnage_10000", metric: "tonnage", target: 10000 },
  { id: "tonnage_50000", metric: "tonnage", target: 50000 },
];

export function computeAchievements(logs: LogEntry[]): Achievement[] {
  const stats = computeStats(logs);
  const valueFor = (metric: Achievement["metric"]) =>
    metric === "sessions"
      ? stats.totalSessions
      : metric === "tonnage"
        ? stats.totalVolume
        : stats.dayStreak;
  return ACHIEVEMENT_DEFS.map((def) => {
    const current = valueFor(def.metric);
    return {
      id: def.id,
      metric: def.metric,
      current,
      target: def.target,
      unlocked: current >= def.target,
    };
  });
}

// Logros que pasan de bloqueado→desbloqueado al añadir la sesión en curso.
// `priorLogs` = historial sin la sesión; `allLogs` = historial + sesión actual.
// Se usa para celebrar SOLO los hitos recién conseguidos (no los ya logrados).
export function detectNewAchievements(
  priorLogs: LogEntry[],
  allLogs: LogEntry[]
): Achievement[] {
  const before = new Map(
    computeAchievements(priorLogs).map((a) => [a.id, a.unlocked])
  );
  return computeAchievements(allLogs).filter(
    (a) => a.unlocked && !before.get(a.id)
  );
}
