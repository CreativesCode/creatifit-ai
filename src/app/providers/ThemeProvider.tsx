"use client";
import { ThemeProvider as NextThemes } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Evitar renderizado del servidor para prevenir hydration mismatch
  if (!mounted) {
    return <div className="min-h-screen bg-bg" />;
  }

  return (
    <NextThemes attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </NextThemes>
  );
}
