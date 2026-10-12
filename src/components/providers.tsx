"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/auth-context";
import { RevenueCatProvider } from "@/lib/revenuecat/revenuecat-context";

// Teléfono modesto: pocos núcleos o poca memoria. En ellos el desenfoque de fondo
// de tarjetas y barra (backdrop-filter) se recalcula en cada fotograma del scroll
// y lo hace ir a tirones; la clase `cf-lite` lo apaga (ver globals.css).
function isLowEndDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 3;
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (isLowEndDevice()) document.documentElement.classList.add("cf-lite");
  }, []);

  return (
    <AuthProvider>
      <RevenueCatProvider>{children}</RevenueCatProvider>
    </AuthProvider>
  );
}
