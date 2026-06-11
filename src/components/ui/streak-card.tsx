"use client";

import type { StreakInfo } from "@/lib/progress/streak";
import { Flame } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface StreakCardProps {
  streak: StreakInfo;
}

export function StreakCard({ streak }: StreakCardProps) {
  const { t, i18n } = useTranslation("common");

  // Iniciales Lun→Dom localizadas según el idioma de la app (no el del dispositivo).
  // 2024-01-01 fue lunes → generamos lun..dom.
  const dayLetters = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2024, 0, 1 + i)).charAt(0).toUpperCase()
    );
  }, [i18n.language]);
  const { current, longest, isActiveToday, atRisk, weekDays } = streak;

  // Índice de "hoy" dentro de la semana Lun→Dom para resaltar el punto.
  const todayIdx = (new Date().getDay() + 6) % 7;

  const headline =
    current > 0
      ? t("dashboard.streak.days", { count: current })
      : t("dashboard.streak.start");

  const sub = atRisk
    ? t("dashboard.streak.at_risk")
    : isActiveToday
      ? t("dashboard.streak.done_today")
      : current > 0
        ? t("dashboard.streak.keep_going")
        : t("dashboard.streak.start_sub");

  return (
    <div
      className="cf-card relative overflow-hidden mb-4"
      style={{ padding: 16, borderRadius: 20 }}
    >
      <div className="flex items-center gap-3.5">
        {/* Llama */}
        <div
          className="cf-icon-tile shrink-0 flex items-center justify-center"
          style={{
            width: 50,
            height: 50,
            borderRadius: 15,
            background: current > 0 ? "var(--grad-amber)" : "var(--surface-2)",
            color: current > 0 ? "#3A2400" : "var(--muted)",
          }}
        >
          <Flame size={26} fill={current > 0 ? "currentColor" : "none"} />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <div className="cf-h2 text-[18px] leading-tight">{headline}</div>
          <div
            className="text-[12px] font-semibold mt-0.5"
            style={{ color: atRisk ? "var(--amber)" : "var(--muted)" }}
          >
            {sub}
          </div>
        </div>

        {/* Mejor racha */}
        {longest > 0 && (
          <div className="text-right shrink-0">
            <div className="cf-num text-[16px]">{longest}</div>
            <div className="cf-muted text-[10px] font-semibold">
              {t("dashboard.streak.best")}
            </div>
          </div>
        )}
      </div>

      {/* Puntos de la semana */}
      <div className="flex justify-between gap-1.5 mt-4">
        {weekDays.map((done, i) => {
          const isToday = i === todayIdx;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className="flex items-center justify-center w-full"
                style={{
                  height: 8,
                  borderRadius: 6,
                  background: done ? "var(--grad-amber)" : "var(--surface-2)",
                  boxShadow: isToday ? "0 0 0 2px var(--amber)" : "none",
                }}
                aria-hidden
              />
              <span
                className="text-[9.5px] font-bold"
                style={{ color: isToday ? "var(--amber)" : "var(--muted)" }}
              >
                {dayLetters[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
