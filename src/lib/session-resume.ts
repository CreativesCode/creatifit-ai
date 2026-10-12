// Sesión de entrenamiento a medias guardada en el dispositivo y día que toca.
import { useSyncExternalStore } from "react";

// ¿Hay un entrenamiento en curso en pantalla? La navegación inferior se oculta
// mientras tanto: deja sitio a la acción principal y evita salidas accidentales.
let sessionActive = false;
const activeListeners = new Set<() => void>();

export function setSessionActive(value: boolean): void {
  if (sessionActive === value) return;
  sessionActive = value;
  activeListeners.forEach((l) => l());
}

export function useSessionActive(): boolean {
  return useSyncExternalStore(
    (listener) => {
      activeListeners.add(listener);
      return () => {
        activeListeners.delete(listener);
      };
    },
    () => sessionActive,
    () => false
  );
}

const KEY_PREFIX = "cf-workout-session:";

export const sessionStorageKey = (planId: string, day: string) =>
  `${KEY_PREFIX}${planId}:${day}`;

// Pasado este tiempo una sesión a medias ya no se reanuda: sería mezclar el
// entrenamiento de hoy con el de otro día.
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export const isSessionFresh = (savedAt?: number): boolean =>
  typeof savedAt === "number" && Date.now() - savedAt < SESSION_TTL_MS;

export interface ResumableSession {
  planId: string;
  day: string;
  sets: number;
  savedAt: number;
}

/** Sesión a medias más reciente que aún se puede reanudar. Limpia las caducadas. */
export function findResumableSession(): ResumableSession | null {
  if (typeof window === "undefined") return null;
  let best: ResumableSession | null = null;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) keys.push(key);
    }
    for (const key of keys) {
      const saved = JSON.parse(window.localStorage.getItem(key) || "null") as {
        savedAt?: number;
        workoutLogs?: unknown[];
      } | null;
      if (!saved || !isSessionFresh(saved.savedAt)) {
        window.localStorage.removeItem(key);
        continue;
      }
      const sets = saved.workoutLogs?.length ?? 0;
      if (sets === 0) continue;
      // El id del plan es un UUID (sin ":"), así que el día es lo que sigue al último ":".
      const rest = key.slice(KEY_PREFIX.length);
      const cut = rest.lastIndexOf(":");
      const candidate = {
        planId: rest.slice(0, cut),
        day: rest.slice(cut + 1),
        sets,
        savedAt: saved.savedAt as number,
      };
      if (!best || candidate.savedAt > best.savedAt) best = candidate;
    }
  } catch {
    return null;
  }
  return best;
}

interface DayLog {
  plan_id?: string | null;
  plan_day_id?: string | null;
}

/**
 * Día que toca entrenar: el siguiente al último que se entrenó de este plan
 * (los días se repiten en ciclo). `logs` viene del más reciente al más antiguo.
 */
export function suggestNextDay(
  days: string[],
  logs: DayLog[],
  planId: string
): string | null {
  if (days.length === 0) return null;
  const last = logs.find(
    (l) => l.plan_id === planId && !!l.plan_day_id && days.includes(l.plan_day_id)
  );
  if (!last?.plan_day_id) return days[0];
  return days[(days.indexOf(last.plan_day_id) + 1) % days.length];
}
