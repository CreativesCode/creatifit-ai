"use client";

// Overlay de celebración al terminar una sesión: confeti + resumen de PRs y logros
// recién desbloqueados. Coste $0, sin dependencias (confeti en CSS). Se cierra al
// tocar en cualquier sitio o con el botón. La dopamina del "subidón" = retención.

import type { Achievement } from "@/lib/progress/records";
import { Medal, Trophy, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CelebrationOverlayProps {
  prCount: number;
  achievements: Achievement[];
  onDismiss: () => void;
}

// Piezas de confeti precalculadas (determinista: sin Math.random en render para
// evitar saltos). Posición horizontal, retardo, duración y color por índice.
const COLORS = [
  "var(--primary)",
  "var(--amber)",
  "var(--mint)",
  "var(--cyan)",
  "#f0469c",
];
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 7) * 0.18,
  duration: 2.2 + ((i * 13) % 10) / 10,
  color: COLORS[i % COLORS.length],
  size: 7 + (i % 4) * 2,
  rounded: i % 3 === 0,
}));

export function CelebrationOverlay({
  prCount,
  achievements,
  onDismiss,
}: CelebrationOverlayProps) {
  const { t } = useTranslation("common");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(2px)" }}
      role="dialog"
      aria-modal="true"
      onClick={onDismiss}
    >
      {/* Confeti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              top: "-5%",
              left: `${c.left}%`,
              width: c.size,
              height: c.size,
              background: c.color,
              borderRadius: c.rounded ? "50%" : 2,
              animation: `cf-confetti-fall ${c.duration}s linear ${c.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <div
        className="cf-card-solid relative w-full max-w-sm text-center"
        style={{ padding: 24, borderRadius: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 cf-icon-tile bg-surface-2"
          style={{ width: 34, height: 34 }}
          onClick={onDismiss}
          aria-label={t("session.celebration.close", "Cerrar")}
        >
          <X size={18} />
        </button>

        {/* Trofeo */}
        <div
          className="mx-auto flex items-center justify-center mb-4"
          style={{
            width: 84,
            height: 84,
            borderRadius: 26,
            background: "var(--grad-amber)",
            color: "#3A2400",
            boxShadow: "0 0 32px rgba(255,178,62,0.5)",
            animation: "cf-pop 0.5s cubic-bezier(0.2,1.4,0.4,1)",
          }}
        >
          <Trophy size={42} />
        </div>

        <div className="cf-h1 text-[24px]">
          {t("session.celebration.title", "¡Lo lograste!")}
        </div>

        {prCount > 0 && (
          <div className="cf-muted text-[13.5px] font-semibold mt-2">
            🏆 {t("session.celebration.prs", "{{count}} nuevos récords", { count: prCount })}
          </div>
        )}

        {/* Logros desbloqueados */}
        {achievements.length > 0 && (
          <div className="flex flex-col gap-2 mt-4">
            {achievements.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 text-left cf-card"
                style={{ padding: "10px 13px", borderRadius: 14 }}
              >
                <div
                  className="cf-icon-tile shrink-0"
                  style={{ width: 38, height: 38, borderRadius: 12, background: "var(--grad-amber)", color: "#3A2400" }}
                >
                  <Medal size={20} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[13.5px] leading-tight">
                    {t(`progress.ach.${a.id}.title`)}
                  </div>
                  <div className="cf-muted text-[11.5px] mt-0.5">
                    {t(`progress.ach.${a.id}.desc`)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg mt-5"
          onClick={onDismiss}
        >
          {t("session.celebration.cta", "¡Genial!")}
        </button>
      </div>
    </div>
  );
}
