// Cálculo de racha de entrenamiento ("streak"), determinista y en cliente: $0, sin IA.
// A diferencia de `computeStats().dayStreak` (que cuenta días consecutivos terminando
// en el ÚLTIMO día entrenado, aunque sea de hace semanas), aquí la racha está anclada
// a HOY: solo está viva si el último entreno fue hoy o ayer. Es lo que motiva volver.

import type { LogEntry } from "./records";

export interface StreakInfo {
  current: number; // días consecutivos vivos hasta hoy (0 si la racha está rota)
  longest: number; // mejor racha histórica
  isActiveToday: boolean; // ya entrenó hoy
  atRisk: boolean; // entrenó ayer pero aún no hoy → puede romperse al acabar el día
  lastActiveDate: string | null; // YYYY-MM-DD (local) del último entreno
  weekDays: boolean[]; // 7 flags Lun→Dom de la semana actual (true = entrenó)
}

const DAY_MS = 86400000;

// Fecha LOCAL en formato YYYY-MM-DD (no UTC). Importante: usar el día local hace
// que "hoy" coincida con lo que ve el usuario, incluso para entrenos de noche.
function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function logLocalDay(l: LogEntry): string | null {
  const iso = l.timestamp ?? l.created_at;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : localDay(d);
}

// Días (YYYY-MM-DD local) en los que hubo al menos un entreno, ordenados asc.
function distinctTrainingDays(logs: LogEntry[]): string[] {
  const set = new Set<string>();
  for (const l of logs) {
    const day = logLocalDay(l);
    if (day) set.add(day);
  }
  return Array.from(set).sort();
}

function daysBetween(a: string, b: string): number {
  const ta = new Date(a + "T00:00:00").getTime();
  const tb = new Date(b + "T00:00:00").getTime();
  return Math.round((tb - ta) / DAY_MS);
}

// Racha histórica más larga: mayor secuencia de días calendario consecutivos.
function longestRun(days: string[]): number {
  if (days.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i - 1], days[i]) === 1) run++;
    else run = 1;
    if (run > best) best = run;
  }
  return best;
}

// Racha viva hasta hoy: empieza en hoy (si entrenó hoy) o en ayer (si entrenó ayer)
// y cuenta hacia atrás mientras los días sean consecutivos. Si el último entreno es
// más antiguo que ayer, la racha está rota → 0.
function currentRun(daySet: Set<string>, today: string): number {
  let count = 0;
  let cursor = today;
  if (!daySet.has(cursor)) {
    // Si hoy aún no entrena, la racha sigue viva desde ayer.
    const yesterday = localDay(new Date(new Date(today + "T00:00:00").getTime() - DAY_MS));
    if (!daySet.has(yesterday)) return 0;
    cursor = yesterday;
  }
  while (daySet.has(cursor)) {
    count++;
    cursor = localDay(new Date(new Date(cursor + "T00:00:00").getTime() - DAY_MS));
  }
  return count;
}

// Flags Lun→Dom de la semana que contiene `today` (semana empieza en lunes).
function weekFlags(daySet: Set<string>, today: string): boolean[] {
  const base = new Date(today + "T00:00:00");
  const dow = (base.getDay() + 6) % 7; // 0 = lunes
  const monday = new Date(base.getTime() - dow * DAY_MS);
  return Array.from({ length: 7 }, (_, i) =>
    daySet.has(localDay(new Date(monday.getTime() + i * DAY_MS)))
  );
}

// `today` se inyecta (YYYY-MM-DD local) para que la función sea pura y testeable.
// El llamador lo obtiene del reloj del dispositivo.
export function computeStreak(logs: LogEntry[], today: string): StreakInfo {
  const days = distinctTrainingDays(logs);
  const daySet = new Set(days);
  const current = currentRun(daySet, today);
  return {
    current,
    longest: Math.max(longestRun(days), current),
    isActiveToday: daySet.has(today),
    atRisk: current > 0 && !daySet.has(today),
    lastActiveDate: days.length ? days[days.length - 1] : null,
    weekDays: weekFlags(daySet, today),
  };
}

// Helper para el cliente: día local de hoy.
export function todayLocal(): string {
  return localDay(new Date());
}
