"use client";
import { useEffect, useRef } from "react";

/* Atrás del teléfono para vistas que se abren sin cambiar de ruta (editor,
   hojas a pantalla completa). Mientras la vista está activa hay una entrada
   centinela en el historial: Atrás la consume y llama a `onBack` en vez de
   sacar al usuario de la página. Las vistas se apilan: solo responde la de
   arriba. */

interface Guard {
  onBack: { current: () => boolean | void };
  armed: boolean;
}

const stack: Guard[] = [];
// Retrocesos provocados por nosotros al retirar un centinela: no son del usuario.
let suppress = 0;
let listening = false;

function onPop() {
  if (suppress > 0) {
    suppress--;
    return;
  }
  const top = stack[stack.length - 1];
  if (!top || !top.armed) return;
  top.armed = false;
  // `true` = la vista sigue abierta (p. ej. pide confirmación): se repone el centinela.
  if (top.onBack.current() === true && stack.includes(top)) {
    window.history.pushState(null, "", window.location.href);
    top.armed = true;
  }
}

/**
 * Navega después de cerrar una vista protegida. Al cerrarla se retira su
 * centinela con un retroceso que el navegador aplica más tarde: navegar antes
 * de que termine haría que ese retroceso deshiciera la navegación.
 */
export function afterBackGuards(go: () => void): void {
  let waited = 0;
  const check = () => {
    if (suppress > 0 && waited < 600) {
      waited += 40;
      setTimeout(check, 40);
    } else {
      go();
    }
  };
  // Margen para que React desmonte la vista y pida el retroceso.
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
    const guard: Guard = { onBack: ref, armed: true };
    window.history.pushState(null, "", window.location.href);
    stack.push(guard);
    return () => {
      const at = stack.indexOf(guard);
      if (at >= 0) stack.splice(at, 1);
      // Cerrada desde la pantalla: su centinela sigue en el historial y se retira.
      if (guard.armed) {
        guard.armed = false;
        suppress++;
        window.history.back();
      }
    };
  }, [active]);
}
