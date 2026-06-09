"use client";

import { AuthScreen } from "@/components/auth/auth-screen";
import { PageLoader } from "@/components/ui/loader";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  // Si ya hay sesión, no mostrar login: ir al dashboard.
  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [session, loading, router]);

  if (loading || session) {
    return <PageLoader full />;
  }

  return <AuthScreen />;
}
