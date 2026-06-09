import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import LanguageProvider from "@/app/providers/LanguageProvider";
import { NavigationLoader } from "@/components/ui/navigation-loader";

// Cuerpo de texto
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
});

// Display / títulos / números (tabular)
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "CreatiFit AI - AI-Powered Fitness Plans",
  description: "Generate personalized workout plans with AI and track your fitness journey",
  viewport: "width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${spaceGrotesk.variable} font-body capacitor-app`}
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
