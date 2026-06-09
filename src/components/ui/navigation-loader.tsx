"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CFLoader } from "./loader";

/* Overlay global: muestra el loader en cada navegación/transición.
   Se activa al iniciar una navegación (click en un enlace interno) y se
   oculta cuando la nueva ruta monta (cambia el pathname) o por seguridad
   tras un breve tiempo. Solo el loader — sin texto ni card. */
export function NavigationLoader() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  // Ocultar cuando la nueva ruta ya montó.
  useEffect(() => {
    setShow(false);
  }, [pathname]);

  // Seguridad: nunca dejar el loader colgado.
  useEffect(() => {
    if (!show) return;
    const id = setTimeout(() => setShow(false), 1500);
    return () => clearTimeout(id);
  }, [show]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.target === "_blank") return;
      try {
        const url = new URL(a.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        const here = window.location.pathname + window.location.search;
        if (url.pathname + url.search === here) return;
        setShow(true);
      } catch {
        /* ignore */
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-bg/70 backdrop-blur-sm">
      <CFLoader size={84} />
    </div>
  );
}
