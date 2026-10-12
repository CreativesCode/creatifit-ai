import type { EditableDay } from "./plan-structure";

/* Borrador del editor de planes, guardado en el teléfono. Se edita aquí y se
   envía al servidor de una vez al pulsar Guardar: sin conexión no se pierde
   nada. Hay un borrador por plan existente y uno solo para "plan nuevo".
   La clave lleva el usuario, así que no se borra al cerrar sesión (es trabajo
   sin guardar); sí al eliminar la cuenta (ver local-data.ts). */

export const NEW_PLAN_SLOT = "new";
export const DRAFT_PREFIX = "cf-plan-draft:";

export interface PlanDraft {
  planId: string;
  isNew: boolean;
  name: string;
  weeks: number;
  days: EditableDay[];
  // Miniaturas de los ejercicios añadidos (exercise_id -> gif). No se envía.
  gifs: Record<string, string>;
  savedAt: number;
}

const keyFor = (uid: string, slot: string) => `${DRAFT_PREFIX}${uid}:${slot}`;

export function readDraft(uid: string, slot: string): PlanDraft | null {
  if (typeof window === "undefined" || !uid) return null;
  try {
    const raw = window.localStorage.getItem(keyFor(uid, slot));
    const draft = raw ? (JSON.parse(raw) as PlanDraft) : null;
    return draft && Array.isArray(draft.days) && draft.planId ? draft : null;
  } catch {
    return null;
  }
}

/** Devuelve false si no se pudo guardar (almacenamiento lleno o bloqueado). */
export function writeDraft(uid: string, slot: string, draft: PlanDraft): boolean {
  if (typeof window === "undefined" || !uid) return false;
  try {
    window.localStorage.setItem(keyFor(uid, slot), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(uid: string, slot: string): void {
  if (typeof window === "undefined" || !uid) return;
  try {
    window.localStorage.removeItem(keyFor(uid, slot));
  } catch {
    // ignorar
  }
}
