// Series temporales para las gráficas de tendencias. Determinista, en cliente, $0.
// Agrega el historial de series (`workout_logs`) por semana y normaliza la serie
// de peso corporal (`body_measurements`).

import { estimate1RM, type LogEntry } from "./records";

const DAY_MS = 86400000;

export interface WeekPoint {
  week: string; // YYYY-MM-DD del lunes de esa semana
  volume: number; // tonelaje (kg·reps) de la semana
}

export interface WeightPoint {
  date: string; // YYYY-MM-DD
  weight: number;
}

export interface ExerciseTrendPoint {
  date: string; // YYYY-MM-DD
  e1rm: number; // 1RM estimado (Epley) máximo de ese día
}

const logDay = (l: LogEntry): string => {
  const iso = l.timestamp ?? l.created_at;
  return iso ? iso.split("T")[0] : "";
};

const toDay = (ms: number): string => new Date(ms).toISOString().split("T")[0];

// Lunes (YYYY-MM-DD) de la semana que contiene `day`.
function weekStartOf(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  return toDay(d.getTime() - dow * DAY_MS);
}

// Volumen (tonelaje) por semana, como serie CONTINUA desde la primera a la última
// semana con datos (las semanas sin entreno aparecen con volumen 0 → la gráfica no
// "miente" comprimiendo huecos).
export function weeklyVolume(logs: LogEntry[]): WeekPoint[] {
  const m = new Map<string, number>();
  for (const l of logs) {
    const day = logDay(l);
    if (!day) continue;
    const w = weekStartOf(day);
    const vol = l.actual_reps * (typeof l.weight === "number" ? l.weight : 0);
    m.set(w, (m.get(w) ?? 0) + vol);
  }
  if (m.size === 0) return [];
  const weeks = Array.from(m.keys()).sort();
  const out: WeekPoint[] = [];
  let cur = new Date(weeks[0] + "T00:00:00Z").getTime();
  const end = new Date(weeks[weeks.length - 1] + "T00:00:00Z").getTime();
  while (cur <= end) {
    const key = toDay(cur);
    out.push({ week: key, volume: Math.round(m.get(key) ?? 0) });
    cur += 7 * DAY_MS;
  }
  return out;
}

// Serie de peso corporal, ascendente por fecha, ignorando filas sin peso.
export function bodyWeightSeries(
  rows: { date: string; weight?: number | null }[]
): WeightPoint[] {
  return rows
    .filter((r) => r.weight != null)
    .map((r) => ({ date: r.date, weight: r.weight as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// 1RM estimado máximo por día para un ejercicio concreto (progreso de fuerza).
export function exerciseStrengthTrend(
  logs: LogEntry[],
  exerciseName: string
): ExerciseTrendPoint[] {
  const m = new Map<string, number>();
  for (const l of logs) {
    if (l.exercise_name !== exerciseName) continue;
    const day = logDay(l);
    if (!day) continue;
    const e = estimate1RM(l.weight, l.actual_reps);
    if (e == null) continue;
    if (e > (m.get(day) ?? 0)) m.set(day, e);
  }
  return Array.from(m.entries())
    .map(([date, e1rm]) => ({ date, e1rm: Math.round(e1rm) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
