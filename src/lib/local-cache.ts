"use client";
import { useSyncExternalStore } from "react";

/* Copia local de las lecturas que el usuario necesita sin conexión (planes,
   ejercicios del plan, historial). Estrategia: red primero; si la red falla o
   no hay conexión, se devuelve lo último guardado. Solo para datos propios y de
   lectura: nunca cuotas, compras ni nada que decida el servidor. */

const PREFIX = "cf-cache";

// Usuario dueño de la copia. Lo fija AuthProvider; cada cuenta tiene la suya.
let cacheUserId: string | null = null;
export const setCacheUser = (uid: string | null) => {
  cacheUserId = uid;
};

export const getCacheUser = () => cacheUserId;

const keyFor = (name: string) => `${PREFIX}:${cacheUserId}:${name}`;

export function cacheRead<T>(name: string): T | null {
  if (typeof window === "undefined" || !cacheUserId) return null;
  try {
    const raw = window.localStorage.getItem(keyFor(name));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function cacheWrite(name: string, value: unknown): void {
  if (typeof window === "undefined" || !cacheUserId) return;
  try {
    window.localStorage.setItem(keyFor(name), JSON.stringify(value));
  } catch {
    // cuota llena: seguimos sin copia local de este dato
  }
}

export function cacheRemove(name: string): void {
  if (typeof window === "undefined" || !cacheUserId) return;
  try {
    window.localStorage.removeItem(keyFor(name));
  } catch {
    // ignorar
  }
}

/** Error de lectura sin conexión y sin copia local que mostrar. */
export class OfflineError extends Error {
  constructor() {
    super("offline");
    this.name = "OfflineError";
  }
}

// Fallos de transporte (sin red, timeout, petición abortada), no del servidor.
export function isNetworkError(err: unknown): boolean {
  if (err instanceof OfflineError) return true;
  const e = err as { name?: string; message?: string; status?: number } | null;
  if (!e) return false;
  if (e.name === "AbortError" || e.name === "TypeError") return true;
  return /failed to fetch|networkerror|network request failed|load failed|abort|timed? ?out/i.test(
    e.message ?? ""
  );
}

// ¿Lo que se ve ahora salió de la copia local en vez del servidor?
let servedFromCache = false;
const listeners = new Set<() => void>();
const setServedFromCache = (value: boolean) => {
  if (servedFromCache === value) return;
  servedFromCache = value;
  listeners.forEach((l) => l());
};

export function useServedFromCache(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => servedFromCache,
    () => false
  );
}

/** Red primero; si falla por conexión, devuelve la última copia guardada. */
export async function cached<T>(name: string, fetcher: () => Promise<T>): Promise<T> {
  const online = typeof navigator === "undefined" || navigator.onLine !== false;
  if (online) {
    try {
      const fresh = await fetcher();
      cacheWrite(name, fresh);
      setServedFromCache(false);
      return fresh;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const hit = cacheRead<T>(name);
      if (hit === null) throw err;
      setServedFromCache(true);
      return hit;
    }
  }
  const hit = cacheRead<T>(name);
  if (hit === null) throw new OfflineError();
  setServedFromCache(true);
  return hit;
}
