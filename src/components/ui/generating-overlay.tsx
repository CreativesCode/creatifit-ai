"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CFLoader } from "@/components/ui/loader";

// Pantalla de espera de una generación con IA (10-20 s con buena red, más con
// mala). Dice qué está pasando y cuánto falta más o menos; si se alarga, avisa
// de que la conexión va lenta y de que el resultado no se pierde ni se cobra
// dos veces (la petición es idempotente y se reintenta sola).
const EXPECTED_SECONDS = 18;

export function GeneratingOverlay({ title }: { title?: string }) {
  const { t } = useTranslation("common");
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  const slow = seconds > 30;
  const step =
    seconds < 4
      ? t("onboarding.generating_step_1", "Leyendo tus respuestas…")
      : seconds < 10
        ? t("onboarding.generating_step_2", "Eligiendo ejercicios para tu equipo…")
        : t("onboarding.generating_step_3", "Armando tus días de entrenamiento…");
  // Avanza rápido al principio y se frena cerca del final: nunca llega al 100 %
  // hasta que el plan está de verdad.
  const progress = Math.min(95, Math.round((1 - Math.exp(-seconds / (EXPECTED_SECONDS / 2.2))) * 100));

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 px-8 text-center"
      style={{ background: "var(--bg)" }}
      role="status"
      aria-live="polite"
    >
      <CFLoader size={96} />
      <div className="cf-h1 text-[22px]">
        {title ?? t("onboarding.generating_title", "Generando tu plan…")}
      </div>
      <p className="cf-txt2 text-[14.5px] font-semibold" style={{ minHeight: 22 }}>
        {step}
      </p>
      <div className="cf-bar-track w-full max-w-xs">
        <div className="cf-bar-fill" style={{ width: `${progress}%`, transition: "width 0.5s linear" }} />
      </div>
      <p className="cf-muted text-[13px] max-w-xs leading-relaxed">
        {slow
          ? t(
              "onboarding.generating_slow",
              "La conexión va lenta. Seguimos intentándolo: tu plan no se pierde ni cuenta dos veces."
            )
          : t(
              "onboarding.generating_hint",
              "Suele tardar entre 10 y 20 segundos. No cierres la app."
            )}
      </p>
    </div>
  );
}
