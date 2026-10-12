"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { ConnectionBanner } from "@/components/ui/connection-banner";
import { SideNav } from "@/components/ui/side-nav";
import { AuthGate } from "@/components/auth/auth-gate";
import { startOutboxSync } from "@/lib/workout-outbox";

// Raíces de tab: si el back button se pulsa estando aquí (y sin historial
// propio), permitimos minimizar/salir la app en vez de navegar.
const TAB_ROOTS = ["/dashboard", "/plans", "/exercises", "/session", "/settings"];

/* C-UX-4 — Manejo del botón "Atrás" de Android.
   Solo en la app nativa: carga `@capacitor/app` bajo demanda. En web, o si el
   plugin no está disponible, es un no-op y no rompe nada. */
function useAndroidBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const cap = (window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    let removeFn: (() => void) | null = null;
    let cancelled = false;

    // El plugin se importa de verdad (antes se buscaba en Capacitor.Plugins.App,
    // que no existe si nadie lo importa, y el handler nunca se registraba).
    import("@capacitor/app")
      .then(({ App }) =>
        App.addListener("backButton", ({ canGoBack }) => {
          // Las rutas del export estático acaban en "/" (trailingSlash).
          const isTabRoot = TAB_ROOTS.includes(pathname.replace(/\/$/, ""));
          // Con historial: retroceder (la sesión en curso lo intercepta con su
          // confirmación). En una raíz de tab sin historial: salir de la app.
          if (canGoBack) {
            router.back();
          } else if (isTabRoot) {
            void App.exitApp();
          } else {
            // Sin historial y fuera de una raíz: ir a una raíz segura.
            router.push("/dashboard");
          }
        })
      )
      .then((listener) => {
        if (cancelled) void listener.remove();
        else removeFn = () => void listener.remove();
      })
      .catch(() => {
        /* no-op: plugin no disponible */
      });

    return () => {
      cancelled = true;
      removeFn?.();
    };
  }, [router, pathname]);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useAndroidBackButton();
  // Enviar las series que quedaron guardadas en el dispositivo sin conexión.
  useEffect(() => {
    startOutboxSync();
  }, []);

  return (
    <AuthGate>
      {/* overflow-x-clip (no -hidden): evita scroll horizontal sin crear un
          contenedor de scroll, para no romper el `sticky` del header móvil. */}
      {/* El interior usa flex-1 (no min-h-screen): el padding de safe-top/bottom
          ya cuenta dentro del 100dvh del exterior; sumar otro 100dvh dentro
          provocaba ~(safe areas) de scroll fantasma en TODAS las páginas. */}
      <div className="relative min-h-screen bg-bg safe-top safe-bottom overflow-x-clip flex flex-col">
        {/* Mesh gradient backdrop (fijo, detrás del contenido) */}
        <div className="cf-mesh fixed inset-0" aria-hidden />
        <div className="cf-mesh-3 fixed" aria-hidden />

        <div className="relative z-10 flex flex-1">
          {/* Sidebar (tablet/escritorio) */}
          <SideNav />

          {/* Columna de contenido. En móvil no hay top-bar global: cada pantalla
             trae su propia cabecera (como en el diseño de docs). */}
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 safe-left safe-right pb-24 lg:pb-8">
              <ConnectionBanner />
              {children}
            </main>
            {/* Bottom-nav solo en móvil */}
            <div className="lg:hidden">
              <BottomNavigation />
            </div>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
