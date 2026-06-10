"use client";
import { ThemeProvider as NextThemes } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // next-themes evita el hydration mismatch (hay suppressHydrationWarning en
  // el <html> de src/app/layout.tsx), por lo que no es necesario bloquear el
  // árbol hasta `mounted`. Renderizamos siempre los children (D-PERF-1).
  return (
    <NextThemes attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </NextThemes>
  );
}
