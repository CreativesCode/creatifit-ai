"use client";

import { PageLoader } from "@/components/ui/loader";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Protege las rutas de la app: si no hay sesión, redirige a /login.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (loading || !session) {
    return <PageLoader full />;
  }

  return <>{children}</>;
}
