import { AppHeader } from "@/components/ui/app-header";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { AuthGate } from "@/components/auth/auth-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-bg safe-top safe-bottom">
        <AppHeader />
        <main className="flex-1 safe-left safe-right pb-20">{children}</main>
        <BottomNavigation />
      </div>
    </AuthGate>
  );
}
