"use client";

// Tier e `is_admin` del propio perfil, compartidos por toda la app.
//
// Antes cada consumidor leía `profiles` por su cuenta y trataba un fallo de red
// como "free" / "no admin": con mala conexión un usuario Pro quedaba como Free
// toda la sesión y el admin real veía "Acceso denegado". Aquí:
//   - se guarda el último valor conocido en el dispositivo y se parte de él;
//   - un fallo de lectura NO degrada: se conserva lo que había;
//   - se relee al volver a primer plano y al recuperar conexión, así un Pro
//     concedido desde /admin llega sin reiniciar la app.
// Solo sirve para la interfaz: el servidor revalida tier y admin en cada acción.

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { supabase } from "@/lib/supabase-config";
import type { PlanTier } from "@/lib/config/plans-config";

export interface ProfileFlags {
  tier: PlanTier;
  isAdmin: boolean;
}

interface FlagsState {
  uid: string | null;
  /** null = todavía no se conoce (ni en el dispositivo ni por red). */
  flags: ProfileFlags | null;
  /** La última lectura falló y no hay ningún valor conocido. */
  failed: boolean;
}

const EMPTY: FlagsState = { uid: null, flags: null, failed: false };
const MIN_REFRESH_MS = 60_000;
const TIERS: PlanTier[] = ["free", "pro_monthly", "pro_annual"];

let state: FlagsState = EMPTY;
let lastReadAt = 0;
let inFlight: Promise<void> | null = null;
let listening = false;
const listeners = new Set<() => void>();

const storageKey = (uid: string) => `cf-profile-flags:${uid}`;

function readStored(uid: string): ProfileFlags | null {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<ProfileFlags>;
    if (!v || !TIERS.includes(v.tier as PlanTier)) return null;
    return { tier: v.tier as PlanTier, isAdmin: v.isAdmin === true };
  } catch {
    return null;
  }
}

function setState(next: FlagsState) {
  state = next;
  listeners.forEach((l) => l());
}

/** Relee el perfil. `force` salta la espera mínima entre lecturas. */
export function refreshProfileFlags(force = false): Promise<void> {
  const uid = state.uid;
  if (!uid) return Promise.resolve();
  if (inFlight) return inFlight;
  if (!force && Date.now() - lastReadAt < MIN_REFRESH_MS) return Promise.resolve();

  inFlight = (async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("tier, is_admin")
        .eq("id", uid)
        .single();
      if (state.uid !== uid) return; // cambió de cuenta mientras tanto
      if (error || !data) {
        // Sin red o sin sesión válida: no es "free", es "no lo sé".
        if (!state.flags) setState({ ...state, failed: true });
        return;
      }
      const tier = TIERS.includes(data.tier as PlanTier) ? (data.tier as PlanTier) : "free";
      const flags: ProfileFlags = { tier, isAdmin: data.is_admin === true };
      lastReadAt = Date.now();
      try {
        localStorage.setItem(storageKey(uid), JSON.stringify(flags));
      } catch {
        /* almacenamiento lleno o bloqueado: seguimos solo en memoria */
      }
      const prev = state.flags;
      if (!prev || prev.tier !== flags.tier || prev.isAdmin !== flags.isAdmin || state.failed) {
        setState({ uid, flags, failed: false });
      }
    } catch {
      if (state.uid === uid && !state.flags) setState({ ...state, failed: true });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function startListening() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refreshProfileFlags();
  });
  window.addEventListener("online", () => void refreshProfileFlags(true));
}

function setProfileUser(uid: string | null) {
  if (state.uid === uid) return;
  lastReadAt = 0;
  setState(uid ? { uid, flags: readStored(uid), failed: false } : EMPTY);
  if (uid) {
    startListening();
    void refreshProfileFlags(true);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useProfileFlags(): FlagsState {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  useEffect(() => {
    setProfileUser(uid);
  }, [uid]);
  const snap = useSyncExternalStore(subscribe, () => state, () => EMPTY);
  // Mientras el efecto no ha fijado el usuario actual, no servir datos de otro.
  return snap.uid === uid ? snap : EMPTY;
}
