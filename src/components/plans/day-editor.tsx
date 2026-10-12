"use client";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExerciseThumb } from "@/components/ui/exercise-image";
import {
  PLAN_LIMITS,
  freeBlocks,
  type EditableBlock,
  type EditableDay,
} from "@/lib/plans/plan-structure";
import { BlockControls } from "./block-controls";

const tile = "cf-icon-tile bg-surface-2 border border-border shrink-0 disabled:opacity-40";
const tileSize = { width: 36, height: 36, borderRadius: 11 };

/** Contenido de un día del plan en el editor: nombre, orden y ejercicios. */
export function DayEditor({
  day,
  dayIndex,
  dayCount,
  gifs,
  onFocusChange,
  onMoveDay,
  onRemoveDay,
  onRemoveBlock,
  onMoveBlock,
  onUpdateBlock,
  onAddExercises,
}: {
  day: EditableDay;
  dayIndex: number;
  dayCount: number;
  gifs: Record<string, string>;
  onFocusChange: (focus: string) => void;
  onMoveDay: (to: number) => void;
  onRemoveDay: () => void;
  onRemoveBlock: (blockIndex: number) => void;
  onMoveBlock: (from: number, to: number) => void;
  onUpdateBlock: (
    blockIndex: number,
    patch: Partial<Pick<EditableBlock, "sets" | "reps" | "rest_sec">>
  ) => void;
  onAddExercises?: () => void;
}) {
  const { t } = useTranslation("common");
  // Quitar un día con ejercicios pide un segundo toque.
  const [confirmRemove, setConfirmRemove] = useState(false);
  useEffect(() => setConfirmRemove(false), [dayIndex]);

  const removeDay = () => {
    if (day.blocks.length > 0 && !confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    setConfirmRemove(false);
    onRemoveDay();
  };

  const free = freeBlocks(day);

  return (
    <div>
      {/* nombre y orden del día */}
      <div className="cf-card mb-3" style={{ padding: 14, borderRadius: 18 }}>
        <label className="cf-muted text-[11px] font-semibold" htmlFor="cf-day-focus">
          {t("plans.editor.day_name", "Nombre del día")}
        </label>
        <input
          id="cf-day-focus"
          value={day.focus}
          onChange={(e) => onFocusChange(e.target.value)}
          maxLength={PLAN_LIMITS.focus}
          placeholder={t("plans.editor.day_name_placeholder", "Por ejemplo: Pecho y core")}
          autoComplete="off"
          className="bg-transparent outline-none w-full text-[15px] font-bold py-1.5 border-b border-border"
        />
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            className={tile}
            style={tileSize}
            disabled={dayIndex === 0}
            onClick={() => onMoveDay(dayIndex - 1)}
            aria-label={t("plans.editor.move_day_earlier", "Mover el día antes")}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            className={tile}
            style={tileSize}
            disabled={dayIndex === dayCount - 1}
            onClick={() => onMoveDay(dayIndex + 1)}
            aria-label={t("plans.editor.move_day_later", "Mover el día después")}
          >
            <ArrowRight size={16} />
          </button>
          <span className="cf-muted text-[12px] font-semibold flex-1">
            {t("plans.editor.day_position", "Día {{n}} de {{total}}", {
              n: dayIndex + 1,
              total: dayCount,
            })}
          </span>
          {dayCount > 1 && (
            <button
              type="button"
              className="cf-btn cf-btn-ghost cf-btn-sm"
              style={{ gap: 6, color: "#ef4444" }}
              onClick={removeDay}
            >
              <Trash2 size={14} />
              {confirmRemove
                ? t("plans.editor.remove_day_confirm", "¿Quitar con sus ejercicios?")
                : t("plans.editor.remove_day", "Quitar día")}
            </button>
          )}
        </div>
      </div>

      {/* ejercicios */}
      {day.blocks.length === 0 && (
        <p className="cf-muted text-[13px] text-center py-5">
          {t("plans.editor.empty_day", "Este día aún no tiene ejercicios.")}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {day.blocks.map((block, i) => (
          <div
            key={`${block.exercise_id ?? block.name}-${i}`}
            className="cf-card"
            style={{ padding: 14, borderRadius: 18 }}
          >
            <div className="flex items-center gap-3">
              <ExerciseThumb
                gif={block.exercise_id ? gifs[block.exercise_id] : null}
                alt={block.name}
                className="rounded-[12px] object-contain bg-white/90 shrink-0"
                style={{ width: 46, height: 46 }}
              />
              <div className="flex-1 min-w-0 font-bold text-[14.5px] leading-tight">
                {block.name}
              </div>
            </div>
            <BlockControls block={block} onChange={(patch) => onUpdateBlock(i, patch)} />
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                className={tile}
                style={tileSize}
                disabled={i === 0}
                onClick={() => onMoveBlock(i, i - 1)}
                aria-label={t("plans.editor.move_up", "Subir")}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                className={tile}
                style={tileSize}
                disabled={i === day.blocks.length - 1}
                onClick={() => onMoveBlock(i, i + 1)}
                aria-label={t("plans.editor.move_down", "Bajar")}
              >
                <ArrowDown size={16} />
              </button>
              <span className="flex-1" />
              <button
                type="button"
                className="cf-btn cf-btn-ghost cf-btn-sm"
                style={{ gap: 6, color: "#ef4444" }}
                onClick={() => onRemoveBlock(i)}
              >
                <Trash2 size={14} />
                {t("plans.editor.remove_exercise", "Quitar")}
              </button>
            </div>
          </div>
        ))}
      </div>

      {onAddExercises && (
        <button
          type="button"
          className="cf-btn cf-btn-ghost cf-btn-block mt-3"
          style={{ gap: 8 }}
          disabled={free === 0}
          onClick={onAddExercises}
        >
          <Plus size={17} />
          {free === 0
            ? t("plans.editor.day_full", "Día completo ({{max}} ejercicios)", {
                max: PLAN_LIMITS.blocks.max,
              })
            : t("plans.editor.add_exercise", "Añadir ejercicios")}
        </button>
      )}
    </div>
  );
}
