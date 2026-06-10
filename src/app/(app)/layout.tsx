"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { SideNav } from "@/components/ui/side-nav";
import { AuthGate } from "@/components/auth/auth-gate";

// Raíces de tab: si el back button se pulsa estando aquí (y sin historial
// propio), permitimos minimizar/salir la app en vez de navegar.
const TAB_ROOTS = ["/dashboard", "/plans", "/exercises", "/session", "/settings"];

/* C-UX-4 — Manejo del botón "Atrás" de Android.
   Implementación defensiva: usa el objeto global `Capacitor.Plugins.App` con
   carga/guard en runtime. Si `@capacitor/app` no está disponible (build web o
   plugin ausente), es un no-op y no rompe nada. */
function useAndroidBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Acceso defensivo al plugin App vía el global de Capacitor.
    const cap = (window as unknown as {
      Capacitor?: {
        isNativePlatform?: () => boolean;
        Plugins?: {
          App?: {
            addListener?: (
              ev: string,
              cb: (data: { canGoBack?: boolean }) => void
            ) => Promise<{ remove: () => void }> | { remove: () => void };
            exitApp?: () => void;
          };
        };
      };
    }).Capacitor;

    if (!cap?.isNativePlatform?.()) return;
    const appPlugin = cap.Plugins?.App;
    if (!appPlugin?.addListener) return;

    let removeFn: (() => void) | null = null;
    let cancelled = false;

    const handler = (data: { canGoBack?: boolean }) => {
      // Hay historial si Capacitor lo reporta o si el history del WebView > 1.
      const isTabRoot = TAB_ROOTS.includes(pathname);
      const canGoBack =
        data?.canGoBack ??
        (typeof window !== "undefined" && window.history.length > 1);

      // Con historial: retroceder. En una raíz de tab sin historial: salir.
      if (canGoBack) {
        router.back();
      } else if (isTabRoot) {
        appPlugin.exitApp?.();
      } else {
        // Sin historial y fuera de una raíz: ir a una raíz segura.
        router.push("/dashboard");
      }
    };

    try {
      const res = appPlugin.addListener("backButton", handler);
      Promise.resolve(res)
        .then((listener) => {
          if (cancelled) {
            listener?.remove?.();
          } else {
            removeFn = () => listener?.remove?.();
          }
        })
        .catch(() => {
          /* no-op: plugin no disponible */
        });
    } catch {
      /* no-op */
    }

    return () => {
      cancelled = true;
      removeFn?.();
    };
  }, [router, pathname]);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useAndroidBackButton();

  return (
    <AuthGate>
      {/* overflow-x-clip (no -hidden): evita scroll horizontal sin crear un
          contenedor de scroll, para no romper el `sticky` del header móvil. */}
      <div className="relative min-h-screen bg-bg safe-top safe-bottom overflow-x-clip">
        {/* Mesh gradient backdrop (fijo, detrás del contenido) */}
        <div className="cf-mesh fixed inset-0" aria-hidden />
        <div className="cf-mesh-3 fixed" aria-hidden />

        <div className="relative z-10 flex min-h-screen">
          {/* Sidebar (tablet/escritorio) */}
          <SideNav />

          {/* Columna de contenido. En móvil no hay top-bar global: cada pantalla
             trae su propia cabecera (como en el diseño de docs). */}
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 safe-left safe-right pb-24 lg:pb-8">
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
