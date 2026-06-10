"use client";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

export default function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // i18n se inicializa con useSuspense:false, así que no hace falta bloquear el
  // árbol hasta `mounted`. Renderizamos siempre los children (D-PERF-1).
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
