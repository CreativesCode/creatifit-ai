import { AppHeader } from "@/components/ui/app-header";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { SideNav } from "@/components/ui/side-nav";
import { AuthGate } from "@/components/auth/auth-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="relative min-h-screen bg-bg safe-top safe-bottom overflow-hidden">
        {/* Mesh gradient backdrop (fijo, detrás del contenido) */}
        <div className="cf-mesh fixed inset-0" aria-hidden />
        <div className="cf-mesh-3 fixed" aria-hidden />

        <div className="relative z-10 flex min-h-screen">
          {/* Sidebar (tablet/escritorio) */}
          <SideNav />

          {/* Columna de contenido */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header solo en móvil/tablet pequeño */}
            <div className="lg:hidden">
              <AppHeader />
            </div>
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
