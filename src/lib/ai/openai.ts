import { GeneratedPlanSchema, type GeneratedPlan } from "../validators/schemas";
import { supabase } from "../supabase-config";
import { newId } from "../workout-outbox";

// Una generación cuesta dinero. Cada intento lleva un requestId: si la respuesta
// se pierde por la red, se reintenta con el MISMO id y el servidor devuelve el
// plan ya generado sin volver a llamar a OpenAI.
const PENDING_KEY = "cf-pending-generation";
const RETRY_WAIT_MS = 5000;
const MAX_ATTEMPTS = 24; // ~2 min esperando a una generación en curso

interface PendingGeneration {
  uid: string;
  requestId: string;
  // Huella del cuestionario: un id pendiente solo se reutiliza para la misma petición.
  fingerprint: string;
}

const fingerprintOf = (intake: unknown) => JSON.stringify(intake);

function readPending(): PendingGeneration | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingGeneration) : null;
  } catch {
    return null;
  }
}

/** Id de la generación para este cuestionario: el pendiente si existe, o uno nuevo. */
export function generationRequestId(uid: string, intake: unknown): string {
  const fingerprint = fingerprintOf(intake);
  const pending = readPending();
  if (pending && pending.uid === uid && pending.fingerprint === fingerprint) {
    return pending.requestId;
  }
  const requestId = newId();
  try {
    window.localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ uid, requestId, fingerprint } satisfies PendingGeneration)
    );
  } catch {
    // sin storage: se pierde solo la recuperación tras cerrar la app
  }
  return requestId;
}

/** Llamar cuando el plan ya está guardado: el id deja de estar pendiente. */
export function clearGenerationRequest(): void {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignorar
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Código de error que devuelve la función en el cuerpo JSON (402, 409, 429...).
async function serverErrorCode(error: unknown): Promise<string | null> {
  try {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
    const payload = ctx?.json ? await ctx.json() : null;
    return payload?.error ?? null;
  } catch {
    return null;
  }
}

// Genera el plan de fitness llamando a la Edge Function `generate-plan`.
//
// La API key de OpenAI vive como secret en el servidor (Supabase Edge Function),
// nunca en el cliente. Esto evita exponerla en el bundle web o en el .apk.
// `onInvalid` libera el id pendiente si el plan recibido no es válido; por
// defecto, el del cuestionario.
export async function generateFitnessPlan(
  intake: Record<string, unknown>,
  requestId: string,
  onInvalid: () => void = clearGenerationRequest
): Promise<GeneratedPlan> {
  let lastWasNetwork = false;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.functions.invoke("generate-plan", {
      body: { ...intake, requestId },
    });

    if (!error) {
      if (!data?.plan) {
        throw new Error("No se recibió un plan válido del servidor.");
      }
      try {
        return GeneratedPlanSchema.parse(data.plan);
      } catch (invalid) {
        // Un plan inválido no debe volver a servirse en el siguiente intento.
        onInvalid();
        throw invalid;
      }
    }

    const code = await serverErrorCode(error);
    // Límites: el llamador decide (paywall / mensaje). No se reintenta.
    if (code === "FREE_LIMIT_REACHED" || code === "PRO_LIMIT_REACHED") {
      throw new Error(code);
    }
    // Relleno: con ese equipo no hay ejercicios suficientes en las zonas pedidas.
    if (code === "NOT_ENOUGH_EXERCISES") {
      throw new Error(code);
    }
    // Sin respuesta del servidor (red caída, timeout) o generación aún en curso:
    // esperar y reintentar con el mismo id. No dispara otra generación.
    lastWasNetwork = code === null && error.name !== "FunctionsHttpError";
    if (lastWasNetwork || code === "GENERATION_IN_PROGRESS") {
      await wait(RETRY_WAIT_MS);
      continue;
    }

    console.error("Error invoking generate-plan function:", error);
    throw new Error("GENERATION_FAILED");
  }
  throw new Error(lastWasNetwork ? "GENERATION_NETWORK" : "GENERATION_FAILED");
}
