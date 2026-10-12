import type { AiProfile } from "@/lib/plans/ai-profile";
import { newId } from "@/lib/workout-outbox";
import { generateFitnessPlan } from "./openai";

/* "Rellenar con IA" del editor de planes: pide a generate-plan (modo "fill")
   uno o varios días con los ejercicios de las zonas elegidas.

   Cada relleno es una generación de pago. Su id se guarda en el teléfono por
   plan y solo se libera cuando el resultado ya está en el borrador: si la
   respuesta se pierde o la app se cierra, repetir la misma petición con ese id
   devuelve lo ya generado sin gastar otra. Va en una clave propia para no
   pisar el id pendiente del cuestionario (`cf-pending-generation`). */

export interface FillRequest {
  scope: "day" | "plan";
  days: number;
  blocks: number;
  objective: string;
  zones: string[];
  exclude: string[];
  note?: string;
}

export interface FillTarget {
  dayIndex: number;
  mode: "add" | "replace";
}

export interface PendingFill {
  requestId: string;
  request: FillRequest;
  target: FillTarget;
}

export const FILL_NOTE_MAX = 200;
export const FILL_BLOCKS = { min: 1, max: 8, default: 5 };
export const FILL_DAYS = { min: 2, max: 7, default: 3 };

const keyFor = (uid: string, slot: string) => `cf-pending-fill:${uid}:${slot}`;

export function readPendingFill(uid: string, slot: string): PendingFill | null {
  try {
    const raw = window.localStorage.getItem(keyFor(uid, slot));
    const pending = raw ? (JSON.parse(raw) as PendingFill) : null;
    return pending?.requestId && pending.request ? pending : null;
  } catch {
    return null;
  }
}

export function clearPendingFill(uid: string, slot: string): void {
  try {
    window.localStorage.removeItem(keyFor(uid, slot));
  } catch {
    // ignorar
  }
}

export interface FilledDay {
  focus: string;
  blocks: {
    name: string;
    exercise_id?: string;
    sets: number;
    reps: [number, number];
    rest_sec: number;
    cues?: string[];
  }[];
}

/**
 * Lanza (o recupera) un relleno. Devuelve los días generados; quien llama debe
 * meterlos en el borrador y después llamar a `clearPendingFill`.
 * Errores: FREE_LIMIT_REACHED, PRO_LIMIT_REACHED, NOT_ENOUGH_EXERCISES,
 * GENERATION_NETWORK, GENERATION_FAILED.
 */
export async function runFill(params: {
  uid: string;
  slot: string;
  request: FillRequest;
  target: FillTarget;
  profile: AiProfile;
  language: string;
}): Promise<FilledDay[]> {
  const { uid, slot, request, target, profile, language } = params;
  const pending = readPendingFill(uid, slot);
  const same = pending && JSON.stringify(pending.request) === JSON.stringify(request);
  const requestId = same ? pending.requestId : newId();
  try {
    window.localStorage.setItem(
      keyFor(uid, slot),
      JSON.stringify({ requestId, request, target } satisfies PendingFill)
    );
  } catch {
    // sin storage: se pierde solo la recuperación tras cerrar la app
  }

  const plan = await generateFitnessPlan(
    {
      mode: "fill",
      ...request,
      level: profile.level,
      gender: profile.gender,
      age: profile.age,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      equipment: profile.equipment,
      constraints: profile.constraints,
      language,
    },
    requestId,
    // Un resultado inválido no debe volver a servirse en el siguiente intento.
    () => clearPendingFill(uid, slot)
  );
  return (plan.days ?? []) as FilledDay[];
}
