"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { AuthScreen } from "./auth-screen";

// Protege las rutas de la app: si no hay sesión, muestra la pantalla de login.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center safe-top safe-bottom">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}
