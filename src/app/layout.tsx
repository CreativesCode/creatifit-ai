import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import LanguageProvider from "@/app/providers/LanguageProvider";
import { NavigationLoader } from "@/components/ui/navigation-loader";

// Las fuentes van en el repo (src/app/fonts, subconjunto latino, fuente
// variable) y no se piden a Google Fonts al compilar: con `next/font/google` el
// build fallaba en cuanto la máquina que compila no llegaba a Google.

// Cuerpo de texto — pesos realmente usados: 400 (base), 500 (font-medium),
// 600 (font-semibold), 700 (font-bold / cf-btn). 800 no se usa (D-PERF-7).
const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-body",
});

// Display / títulos / números — usados: 600 (cf-h2) y 700 (font-bold, cf-h1,
// cf-num). 400/500 no se referencian (D-PERF-7).
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin.woff2",
  weight: "600 700",
  style: "normal",
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "CreatiFit AI - AI-Powered Fitness Plans",
  description: "Generate personalized workout plans with AI and track your fitness journey",
};

// Next 15 exige el viewport en su propio export (no dentro de `metadata`).
// B8 — sin `user-scalable=no` para permitir zoom (accesibilidad). El zoom al
// enfocar inputs ya se mitiga con font-size 16px en globals.css.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      {/* Sin `capacitor-app` en el body: el padding de safe-area lo aplica cada
          shell (.safe-top/.safe-bottom). Tenerlo aquí Y en los shells duplicaba
          el inset y generaba scroll fantasma en todas las páginas. */}
      <body
        className={`${jakarta.variable} ${spaceGrotesk.variable} font-body`}
      >
        <ThemeProvider>
          <LanguageProvider>
            <Providers>
              <NavigationLoader />
              {children}
            </Providers>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
