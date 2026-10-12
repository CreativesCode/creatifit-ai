"use client";

// Modo "ahorro de datos": las animaciones de los ejercicios (GIF de 0,2-0,9 MB)
// no se descargan hasta que el usuario toca "Ver animación"; mientras tanto se
// muestra una imagen fija de ~7 KB.
//
// Sin elección del usuario se decide por lo que informa el teléfono: activado
// si pide ahorro de datos o si la conexión es 2G/3G. El ajuste manual manda.

import { useSyncExternalStore } from "react";

const KEY = "cf-data-saver";
type Choice = "on" | "off";

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

const listeners = new Set<() => void>();

function readChoice(): Choice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}

function autoValue(): boolean {
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!conn) return false;
  return conn.saveData === true || /^(slow-2g|2g|3g)$/.test(conn.effectiveType ?? "");
}

function current(): boolean {
  const choice = readChoice();
  return choice ? choice === "on" : autoValue();
}

export function setDataSaver(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* sin almacenamiento: el ajuste dura lo que la pestaña */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // El navegador recalcula el tipo de conexión sobre la marcha: sin elección
  // manual, el valor automático puede cambiar durante la sesión.
  const conn = (navigator as Navigator & { connection?: EventTarget }).connection;
  conn?.addEventListener?.("change", listener);
  return () => {
    listeners.delete(listener);
    conn?.removeEventListener?.("change", listener);
  };
}

export function useDataSaver(): boolean {
  return useSyncExternalStore(subscribe, current, () => false);
}
