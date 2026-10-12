// Limpieza de lo que la app guarda en el teléfono para una cuenta.
//
// Se usa al cerrar sesión (el siguiente usuario del mismo teléfono no debe ver
// planes, historial ni una sesión a medias de otro) y al eliminar la cuenta.
// No toca preferencias del dispositivo: idioma, tema y ahorro de datos.

const OUTBOX_KEYS = ["cf-workout-outbox", "cf-workout-outbox-deletes"];

function removeMatching(match: (key: string) => boolean) {
  const doomed: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && match(key)) doomed.push(key);
  }
  doomed.forEach((k) => window.localStorage.removeItem(k));
}

/**
 * @param includeOutbox true solo al eliminar la cuenta. Al cerrar sesión las
 *   series que aún no llegaron al servidor se conservan: se enviarán cuando esa
 *   misma cuenta vuelva a entrar (la cola nunca envía bajo otro usuario).
 */
export function clearUserLocalData(uid: string, includeOutbox = false): void {
  if (typeof window === "undefined") return;
  try {
    removeMatching(
      (k) =>
        k.startsWith(`cf-cache:${uid}:`) ||
        k === `cf-profile-flags:${uid}` ||
        // Sesión a medias y generación pendiente: no llevan el usuario en la clave.
        k.startsWith("cf-workout-session:") ||
        k === "cf-pending-generation"
    );
    if (includeOutbox) {
      // Borradores del editor de planes: trabajo sin guardar, igual que la cola.
      removeMatching(
        (k) => k.startsWith(`cf-plan-draft:${uid}:`) || k.startsWith(`cf-pending-fill:${uid}:`)
      );
      for (const key of OUTBOX_KEYS) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const rest = (JSON.parse(raw) as { uid: string }[]).filter((e) => e.uid !== uid);
        window.localStorage.setItem(key, JSON.stringify(rest));
      }
    }
  } catch {
    /* almacenamiento bloqueado o dañado: no impide cerrar sesión */
  }
}
