"use client";
import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PLAN_LIMITS, type EditableBlock } from "@/lib/plans/plan-structure";

function Stepper({
  label,
  value,
  suffix = "",
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const button =
    "cf-icon-tile bg-surface-2 border border-border shrink-0 disabled:opacity-40";
  return (
    <div className="min-w-0">
      <div className="cf-muted text-[11px] font-semibold mb-1 truncate">{label}</div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={button}
          style={{ width: 36, height: 36, borderRadius: 11 }}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`${label} −`}
        >
          <Minus size={15} />
        </button>
        <div className="cf-num text-[15px] flex-1 text-center tabular-nums">
          {value}
          {suffix}
        </div>
        <button
          type="button"
          className={button}
          style={{ width: 36, height: 36, borderRadius: 11 }}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
          aria-label={`${label} +`}
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

/** Series, repeticiones (mín–máx) y descanso de un ejercicio del plan. */
export function BlockControls({
  block,
  onChange,
}: {
  block: EditableBlock;
  onChange: (patch: Partial<Pick<EditableBlock, "sets" | "reps" | "rest_sec">>) => void;
}) {
  const { t } = useTranslation("common");
  const { sets, reps, rest } = PLAN_LIMITS;
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mt-3">
      <Stepper
        label={t("plans.editor.sets", "Series")}
        value={block.sets}
        min={sets.min}
        max={sets.max}
        onChange={(v) => onChange({ sets: v })}
      />
      <Stepper
        label={t("plans.editor.rest", "Descanso")}
        value={block.rest_sec}
        suffix="s"
        min={rest.min}
        max={rest.max}
        step={rest.step}
        onChange={(v) => onChange({ rest_sec: v })}
      />
      <Stepper
        label={t("plans.editor.reps_min", "Reps mín.")}
        value={block.reps[0]}
        min={reps.min}
        max={reps.max}
        onChange={(v) => onChange({ reps: [v, block.reps[1]] })}
      />
      <Stepper
        label={t("plans.editor.reps_max", "Reps máx.")}
        value={block.reps[1]}
        min={reps.min}
        max={reps.max}
        onChange={(v) => onChange({ reps: [block.reps[0], v] })}
      />
    </div>
  );
}

export { Stepper };
