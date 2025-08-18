"use client";
import { I18nextProvider } from "react-i18next";
import { useEffect, useState } from "react";
import i18n from "@/lib/i18n";

export default function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Evitar renderizado del servidor para prevenir hydration mismatch
  if (!mounted) {
    return <div className="min-h-screen bg-bg" />;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
