"use client";
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase-config";

/* Cola local de series registradas.
   Cada serie se guarda primero en el dispositivo y se envía a workout_logs en
   segundo plano. El id se genera en el cliente y el envío es un upsert que
   ignora duplicados, así que reintentar nunca crea filas repetidas. Una serie
   solo sale de la cola cuando el servidor la confirma. */

export interface OutboxRow {
  id: string;
  exercise_name: string;
  set_index: number;
  target_reps: [number, number];
  actual_reps: number;
  weight?: number;
  rpe?: number;
  notes?: string;
  plan_day_id: string;
  plan_id: string;
  session_id: string;
  timestamp: string;
}

interface OutboxEntry {
  // Usuario que registró la serie: nunca se envía bajo otra cuenta.
  uid: string;
  row: OutboxRow;
}

const STORAGE_KEY = "cf-workout-outbox";
const SEND_TIMEOUT_MS = 12000;
const RETRY_MIN_MS = 5000;
const RETRY_MAX_MS = 60000;

export const newId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // WebViews antiguos sin crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

const read = (): OutboxEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as OutboxEntry[]) : [];
  } catch {
    return [];
  }
};

const listeners = new Set<() => void>();
let pendingCount = 0;

const write = (entries: OutboxEntry[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // cuota llena: la serie sigue en memoria del intento en curso
  }
  pendingCount = entries.length;
  listeners.forEach((l) => l());
};

const currentUserId = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
};

const send = async (rows: OutboxRow[]): Promise<boolean> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const { error } = await supabase
      .from("workout_logs")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
      .abortSignal(controller.signal);
    return !error;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

let flushing: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = RETRY_MIN_MS;

const scheduleRetry = () => {
  if (retryTimer || typeof window === "undefined") return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushOutbox();
  }, retryDelay);
  retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
};

/** Intenta enviar todas las series pendientes del usuario actual. */
export function flushOutbox(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const uid = await currentUserId();
    if (!uid) return;
    const mine = read().filter((e) => e.uid === uid);
    if (mine.length === 0) return;

    const sent = new Set<string>();
    if (await send(mine.map((e) => e.row))) {
      mine.forEach((e) => sent.add(e.row.id));
    } else if (mine.length > 1) {
      // Si el lote falla, una fila inválida no debe retener a las demás.
      for (const e of mine) {
        if (await send([e.row])) sent.add(e.row.id);
      }
    }

    // Releer: pueden haberse encolado series nuevas durante el envío.
    const remaining = read().filter((e) => !sent.has(e.row.id));
    write(remaining);
    if (remaining.some((e) => e.uid === uid)) {
      scheduleRetry();
    } else {
      retryDelay = RETRY_MIN_MS;
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Guarda una serie en el dispositivo y lanza su envío sin esperar a la red.
    Es síncrona a propósito: la serie queda escrita antes de que la UI avance. */
export function enqueueWorkoutLog(uid: string, row: OutboxRow): void {
  write([...read(), { uid, row }]);
  retryDelay = RETRY_MIN_MS;
  void flushOutbox();
}

let started = false;

/** Reintenta al recuperar la red, al volver a primer plano y al abrir la app. */
export function startOutboxSync(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  pendingCount = read().length;
  listeners.forEach((l) => l());
  const kick = () => {
    retryDelay = RETRY_MIN_MS;
    void flushOutbox();
  };
  window.addEventListener("online", kick);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") kick();
  });
  kick();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Número de series guardadas en el dispositivo que aún no confirmó el servidor. */
export function usePendingWorkoutLogs(): number {
  return useSyncExternalStore(
    subscribe,
    () => pendingCount,
    () => 0
  );
}
