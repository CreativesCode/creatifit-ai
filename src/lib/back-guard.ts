"use client";
import { useEffect, useRef } from "react";

/* Atrás del teléfono para vistas que se abren sin cambiar de ruta (editor,
   hojas a pantalla completa). Mientras la vista está activa hay una entrada
   centinela en el historial: Atrás la consume y llama a `onBack` en vez de
   sacar al usuario de la página. Las vistas se apilan: solo responde la de
   arriba.

   Retirar un centinela es un retroceso que el navegador aplica más tarde y
   cuyo destino queda fijado al pedirlo. Si entre medias se añade otro
   centinela, el retroceso lo deja atrás y el siguiente Atrás saca de la
   página. Por eso:
   - un centinela que queda libre no se retira al momento: si otra vista se
     abre en el mismo instante (cerrar una hoja y abrir el editor), lo hereda;
   - mientras hay un retroceso en curso no se añade ninguno: espera a que acabe. */

interface Guard {
  onBack: { current: () => boolean | void };
  armed: boolean;
}

const stack: Guard[] = [];
// Centinelas en el historial que ya no son de ninguna vista.
let orphans = 0;
// Retrocesos pedidos por nosotros que aún no han terminado.
let inFlight = 0;
// Vistas que esperan a que termine un retroceso para poner su centinela.
const waiting: Guard[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let stuckTimer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

const pushSentinel = () => window.history.pushState(null, "", window.location.href);

function settle() {
  inFlight = 0;
  if (stuckTimer) clearTimeout(stuckTimer);
  stuckTimer = null;
  for (const guard of waiting.splice(0)) {
    if (!stack.includes(guard)) continue;
    pushSentinel();
    guard.armed = true;
  }
}

function flushOrphans() {
  flushTimer = null;
  if (orphans === 0 || inFlight > 0) return;
  const count = orphans;
  orphans = 0;
  inFlight = 1;
  // Por si el navegador no avisa del retroceso.
  stuckTimer = setTimeout(settle, 600);
  window.history.go(-count);
}

function arm(guard: Guard) {
  if (orphans > 0) {
    orphans--;
    guard.armed = true;
  } else if (inFlight > 0) {
    waiting.push(guard);
  } else {
    pushSentinel();
    guard.armed = true;
  }
}

function release(guard: Guard) {
  const at = stack.indexOf(guard);
  if (at >= 0) stack.splice(at, 1);
  const queued = waiting.indexOf(guard);
  if (queued >= 0) waiting.splice(queued, 1);
  // Cerrada desde la pantalla: su centinela sigue en el historial.
  if (guard.armed) {
    guard.armed = false;
    orphans++;
    if (!flushTimer) flushTimer = setTimeout(flushOrphans, 0);
  }
}

function onPop() {
  if (inFlight > 0) {
    settle();
    return;
  }
  // Atrás del usuario antes de retirar un centinela libre: ya lo consumió él.
  if (orphans > 0) {
    orphans--;
    return;
  }
  const top = stack[stack.length - 1];
  if (!top || !top.armed) return;
  top.armed = false;
  // `true` = la vista sigue abierta (p. ej. pide confirmación): se repone el centinela.
  if (top.onBack.current() === true && stack.includes(top)) arm(top);
}

/**
 * Navega después de cerrar una vista protegida: espera a que su centinela
 * esté retirado, para que ese retroceso no deshaga la navegación.
 */
export function afterBackGuards(go: () => void): void {
  let waited = 0;
  const check = () => {
    if ((orphans > 0 || inFlight > 0) && waited < 1000) {
      waited += 40;
      setTimeout(check, 40);
    } else {
      go();
    }
  };
  // Margen para que React desmonte la vista y libere su centinela.
  setTimeout(check, 60);
}

/**
 * @param active la vista está abierta.
 * @param onBack se llama con Atrás; debe cerrar la vista, o devolver `true`
 *   para mantenerla abierta.
 */
export function useBackGuard(active: boolean, onBack: () => boolean | void): void {
  const ref = useRef(onBack);
  ref.current = onBack;

  useEffect(() => {
    if (!active) return;
    if (!listening) {
      window.addEventListener("popstate", onPop);
      listening = true;
    }
    const guard: Guard = { onBack: ref, armed: false };
    stack.push(guard);
    arm(guard);
    return () => release(guard);
  }, [active]);
}
