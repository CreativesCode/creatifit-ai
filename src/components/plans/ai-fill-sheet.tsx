"use client";
import { Check, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FILL_BLOCKS, FILL_DAYS, FILL_NOTE_MAX } from "@/lib/ai/fill-plan";
import { useBackGuard } from "@/lib/back-guard";
import { EXERCISE_CATEGORIES } from "@/lib/constants/exercise-categories";
import { AI_OBJECTIVES } from "@/lib/plans/ai-profile";
import { Stepper } from "./block-controls";

export interface FillChoice {
  objective: string;
  zones: string[];
  blocks: number;
  days: number;
  mode: "add" | "replace";
  note: string;
}

/**
 * Opciones de "Rellenar con IA": objetivo, grupos musculares y cuántos
 * ejercicios, para un día o para el plan entero. Todo estructurado; la nota es
 * opcional y corta.
 */
export function AiFillSheet({
  scope,
  dayLabel,
  dayBlocks,
  freeInDay,
  defaultObjective,
  onClose,
  onConfirm,
}: {
  scope: "day" | "plan";
  dayLabel: string;
  /** Ejercicios que el día ya tiene. */
  dayBlocks: number;
  /** Huecos libres en el día. */
  freeInDay: number;
  defaultObjective: string;
  onClose: () => void;
  onConfirm: (choice: FillChoice) => void;
}) {
  const { t } = useTranslation("common");
  const [objective, setObjective] = useState(defaultObjective);
  const [zones, setZones] = useState<string[]>([]);
  // Con el día lleno solo cabe reemplazar.
  const [mode, setMode] = useState<"add" | "replace">(
    dayBlocks > 0 && freeInDay > 0 ? "add" : "replace"
  );
  const [blocks, setBlocks] = useState<number>(FILL_BLOCKS.default);
  const [days, setDays] = useState<number>(FILL_DAYS.default);
  const [note, setNote] = useState("");

  useBackGuard(true, onClose);

  const adding = scope === "day" && mode === "add" && dayBlocks > 0;
  const maxBlocks = adding ? Math.min(FILL_BLOCKS.max, freeInDay) : FILL_BLOCKS.max;
  const count = Math.min(blocks, maxBlocks);

  const toggleZone = (value: string) =>
    setZones((prev) => (prev.includes(value) ? prev.filter((z) => z !== value) : [...prev, value]));

  const label = "cf-muted text-[12px] font-semibold mb-2";
  const segment = (on: boolean) => ({
    padding: "10px 0",
    borderRadius: 10,
    background: on ? "var(--grad-brand)" : "transparent",
    color: on ? "#fff" : "var(--muted)",
  });

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto border border-border"
        style={{
          background: "var(--surface)",
          padding: 18,
          borderRadius: "22px 22px 0 0",
          paddingBottom: "calc(18px + var(--sab))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            <div className="cf-eyebrow">
              {scope === "day" ? dayLabel : t("plans.ai_fill.whole_plan", "Todo el plan")}
            </div>
            <div className="cf-h2 text-[17px]">{t("plans.ai_fill.title", "Rellenar con IA")}</div>
          </div>
          <button
            onClick={onClose}
            className="cf-icon-tile bg-surface-2 border border-border shrink-0"
            style={{ width: 34, height: 34 }}
            aria-label={t("ui.close", "Cerrar")}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {scope === "day" && dayBlocks > 0 && freeInDay > 0 && (
            <div
              className="flex gap-2"
              style={{ background: "var(--surface-2)", padding: 5, borderRadius: 14 }}
            >
              {(["add", "replace"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className="flex-1 font-semibold text-[13px]"
                  style={segment(mode === m)}
                >
                  {m === "add"
                    ? t("plans.ai_fill.mode_add", "Añadir a lo que hay")
                    : t("plans.ai_fill.mode_replace", "Reemplazar")}
                </button>
              ))}
            </div>
          )}

          {scope === "plan" && (
            <p className="text-[12.5px] font-semibold" style={{ color: "#f59e0b" }}>
              {t(
                "plans.ai_fill.plan_warning",
                "Sustituye todos los días que el plan tiene ahora. Podrás retocarlo antes de guardar."
              )}
            </p>
          )}

          <div>
            <div className={label}>{t("plans.ai_fill.objective", "Objetivo")}</div>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full text-[14.5px] font-semibold outline-none border border-border"
              style={{
                padding: "13px 14px",
                borderRadius: 14,
                background: "var(--surface-2)",
                color: "var(--txt)",
              }}
            >
              {AI_OBJECTIVES.map((o) => (
                <option key={o} value={o} style={{ color: "#111" }}>
                  {t(`onboarding.objective.${o}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className={label}>{t("plans.ai_fill.zones", "Zonas a trabajar")}</div>
            <div className="flex flex-wrap gap-2">
              {EXERCISE_CATEGORIES.map((c) => {
                const on = zones.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleZone(c.value)}
                    aria-pressed={on}
                    className={`cf-chip ${on ? "cf-chip-brand" : ""}`}
                    style={{ padding: "9px 13px", fontSize: 12.5 }}
                  >
                    {on && <Check size={12} strokeWidth={3} />}
                    {String(t(`exercises.categories.${c.value}`, c.fallback))}
                  </button>
                );
              })}
            </div>
            <p className="cf-muted text-[11.5px] mt-1.5">
              {t("plans.ai_fill.zones_hint", "Sin marcar ninguna: cuerpo completo.")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {scope === "plan" && (
              <Stepper
                label={t("plans.ai_fill.days", "Días")}
                value={days}
                min={FILL_DAYS.min}
                max={FILL_DAYS.max}
                onChange={setDays}
              />
            )}
            <Stepper
              label={
                scope === "plan"
                  ? t("plans.ai_fill.blocks_per_day", "Ejercicios por día")
                  : t("plans.ai_fill.blocks", "Ejercicios")
              }
              value={count}
              min={FILL_BLOCKS.min}
              max={maxBlocks}
              onChange={setBlocks}
            />
          </div>

          <div>
            <div className={label}>{t("plans.ai_fill.note", "Nota (opcional)")}</div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={FILL_NOTE_MAX}
              placeholder={t("plans.ai_fill.note_placeholder", "Por ejemplo: sin ejercicios en el suelo")}
              autoComplete="off"
              className="w-full text-[14px] outline-none border border-border"
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                background: "var(--surface-2)",
                color: "var(--txt)",
              }}
            />
          </div>

          <p className="cf-muted text-[12px] text-center">
            {t("plans.ai_fill.cost", "Cada relleno usa una generación de IA.")}
          </p>
          <button
            className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg"
            style={{ gap: 8 }}
            onClick={() =>
              onConfirm({ objective, zones, blocks: count, days, mode: adding ? "add" : "replace", note })
            }
          >
            <Sparkles size={17} />
            {t("plans.ai_fill.confirm", "Generar")}
          </button>
        </div>
      </div>
    </div>
  );
}
