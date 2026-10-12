"use client";
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase-config";

/* Cola local de series registradas.
   Cada serie se guarda primero en el dispositivo y se envía a workout_logs en
   segundo plano. El id se genera en el cliente y el envío es un upsert que
   ignora duplicados, así que reintentar nunca crea filas repetidas. Una serie
   solo sale de la cola cuando el servidor la confirma.
   Deshacer una serie sigue el mismo camino: se apunta su id en una lista de
   borrados y se elimina del servidor cuando haya conexión. */

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
const DELETES_KEY = "cf-workout-outbox-deletes";
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

interface DeleteEntry {
  uid: string;
  id: string;
}

const readDeletes = (): DeleteEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DELETES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as DeleteEntry[]) : [];
  } catch {
    return [];
  }
};

const listeners = new Set<() => void>();
let pendingCount = 0;

const notify = () => {
  pendingCount = read().length + readDeletes().length;
  listeners.forEach((l) => l());
};

const write = (entries: OutboxEntry[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // cuota llena: la serie sigue en memoria del intento en curso
  }
  notify();
};

const writeDeletes = (entries: DeleteEntry[]) => {
  try {
    window.localStorage.setItem(DELETES_KEY, JSON.stringify(entries));
  } catch {
    // cuota llena: el borrado se reintentará la próxima vez que se deshaga algo
  }
  notify();
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

const sendDeletes = async (ids: string[]): Promise<boolean> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    // Borrar una fila que no existe no es un error: reintentar es seguro.
    const { error } = await supabase
      .from("workout_logs")
      .delete()
      .in("id", ids)
      .abortSignal(controller.signal);
    return !error;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

/** Series de este usuario que siguen en el teléfono sin confirmar por el servidor. */
export const pendingWorkoutRows = (uid: string): OutboxRow[] =>
  read()
    .filter((e) => e.uid === uid)
    .map((e) => e.row);

/** Ids de series borradas por este usuario cuyo borrado aún no llegó al servidor. */
export const pendingWorkoutDeletes = (uid: string): string[] =>
  readDeletes()
    .filter((d) => d.uid === uid)
    .map((d) => d.id);

/** Avisa cada vez que cambia la cola (serie encolada, enviada o borrada). */
export const subscribeOutbox = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
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

    const sent = new Set<string>();
    if (mine.length === 0) {
      // nada que enviar; puede haber borrados pendientes
    } else if (await send(mine.map((e) => e.row))) {
      mine.forEach((e) => sent.add(e.row.id));
    } else if (mine.length > 1) {
      // Si el lote falla, una fila inválida no debe retener a las demás.
      for (const e of mine) {
        if (await send([e.row])) sent.add(e.row.id);
      }
    }

    // Releer: pueden haberse encolado series nuevas durante el envío.
    const remaining = read().filter((e) => !sent.has(e.row.id));
    if (sent.size > 0) write(remaining);

    // Los borrados van DESPUÉS de los envíos: si la serie deshecha estaba
    // viajando en este mismo intento, primero llega y luego se elimina.
    const doomed = readDeletes().filter((d) => d.uid === uid);
    let deletesLeft = false;
    if (doomed.length > 0) {
      if (await sendDeletes(doomed.map((d) => d.id))) {
        const gone = new Set(doomed.map((d) => d.id));
        writeDeletes(readDeletes().filter((d) => !gone.has(d.id)));
      } else {
        deletesLeft = true;
      }
    }

    if (deletesLeft || remaining.some((e) => e.uid === uid)) {
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

/** Deshace una serie: la saca de la cola y la borra del servidor si ya llegó. */
export function removeWorkoutLog(uid: string, id: string): void {
  write(read().filter((e) => e.row.id !== id));
  // Siempre se apunta el borrado: la serie pudo enviarse ya, o estar viajando.
  writeDeletes([...readDeletes().filter((d) => d.id !== id), { uid, id }]);
  retryDelay = RETRY_MIN_MS;
  // Si hay un envío en curso, el borrado se procesa en él o en el siguiente.
  void flushOutbox().then(() => flushOutbox());
}

let started = false;

/** Reintenta al recuperar la red, al volver a primer plano y al abrir la app. */
export function startOutboxSync(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  notify();
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
