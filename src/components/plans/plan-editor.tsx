"use client";
import { AlertTriangle, ArrowLeft, Check, Loader2, Plus, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBackGuard } from "@/lib/back-guard";
import { isNetworkError } from "@/lib/local-cache";
import {
  NEW_PLAN_SLOT,
  clearDraft,
  readDraft,
  writeDraft,
  type PlanDraft,
} from "@/lib/plans/plan-draft";
import {
  DEFAULT_BLOCK,
  DEFAULT_WEEKS,
  PLAN_LIMITS,
  addBlocks,
  addDay,
  canAddDay,
  freeBlocks,
  dayLetter,
  moveBlock,
  moveDay,
  removeBlock,
  removeDay,
  saveBlocker,
  setDayFocus,
  updateBlock,
  type EditableDay,
} from "@/lib/plans/plan-structure";
import { planTitle } from "@/lib/plan-display";
import { clearPlanSessions } from "@/lib/session-resume";
import { supabaseClient } from "@/lib/supabase-client";
import { EditablePlanSchema } from "@/lib/validators/schemas";
import { newId } from "@/lib/workout-outbox";
import { Stepper } from "./block-controls";
import { DayEditor } from "./day-editor";
import { ExercisePicker } from "./exercise-picker";

export interface EditorPlan {
  id: string;
  weeks: number;
  created_at: string;
  payload: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    days: any[];
    meta?: Record<string, unknown>;
  };
}

type Problem = "no_days" | "empty_day" | "offline" | "error" | null;

const num = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// Días tal como los maneja el editor: letras por posición y valores dentro de
// los topes (un plan antiguo puede traer cualquier cosa).
function toEditableDays(days: EditorPlan["payload"]["days"]): EditableDay[] {
  const { sets, reps, rest } = PLAN_LIMITS;
  return (days || []).slice(0, PLAN_LIMITS.days.max).map((d, i) => ({
    ...d,
    day: dayLetter(i),
    focus: String(d?.focus ?? "").slice(0, PLAN_LIMITS.focus),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blocks: (d?.blocks || []).slice(0, PLAN_LIMITS.blocks.max).map((b: any) => {
      const lo = num(b?.reps?.[0], reps.min, reps.max, DEFAULT_BLOCK.reps[0]);
      const hi = Math.max(lo, num(b?.reps?.[1], reps.min, reps.max, lo));
      return {
        ...b,
        name: String(b?.name ?? ""),
        sets: num(b?.sets, sets.min, sets.max, DEFAULT_BLOCK.sets),
        reps: [lo, hi] as [number, number],
        rest_sec: num(b?.rest_sec, rest.min, rest.max, DEFAULT_BLOCK.rest_sec),
      };
    }),
  }));
}

function freshDraft(plan: EditorPlan | null): PlanDraft {
  if (!plan) {
    return {
      planId: newId(),
      isNew: true,
      name: "",
      weeks: DEFAULT_WEEKS,
      days: [{ day: "A", focus: "", blocks: [] }],
      gifs: {},
      savedAt: Date.now(),
    };
  }
  return {
    planId: plan.id,
    isNew: false,
    name: String(plan.payload?.meta?.name ?? ""),
    weeks: num(plan.weeks, PLAN_LIMITS.weeks.min, PLAN_LIMITS.weeks.max, DEFAULT_WEEKS),
    days: toEditableDays(plan.payload?.days),
    gifs: {},
    savedAt: Date.now(),
  };
}

const contentOf = (d: PlanDraft) =>
  JSON.stringify({ name: d.name, weeks: d.weeks, days: d.days });

/**
 * Editor de un plan: sirve para uno nuevo (`plan` = null) y para cualquiera ya
 * guardado, hecho a mano o por IA. Trabaja sobre un borrador en el teléfono y
 * guarda todo de una vez.
 */
export function PlanEditor({
  uid,
  plan,
  onClose,
  onSaved,
}: {
  uid: string;
  plan: EditorPlan | null;
  onClose: () => void;
  onSaved: (plan: EditorPlan) => void;
}) {
  const { t } = useTranslation("common");
  const slot = plan ? plan.id : NEW_PLAN_SLOT;

  // Punto de partida: lo guardado en el servidor (o un plan vacío).
  const base = useMemo(() => freshDraft(plan), [plan]);
  const baseContent = useMemo(() => contentOf(base), [base]);

  // Si quedó un borrador de este plan sin guardar, se retoma.
  const [initial] = useState(() => {
    const stored = readDraft(uid, slot);
    return stored && (stored.isNew ? !plan : stored.planId === plan?.id)
      ? { draft: stored, restored: true }
      : { draft: base, restored: false };
  });
  const [restored, setRestored] = useState(initial.restored);
  const [draft, setDraft] = useState<PlanDraft>(initial.draft);
  const [activeDay, setActiveDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [storageFull, setStorageFull] = useState(false);
  // Tras guardar o descartar ya no hay que volver a escribir el borrador.
  const doneRef = useRef(false);

  const dirty = contentOf(draft) !== baseContent;
  const isManual = draft.isNew || plan?.payload?.meta?.source === "manual";
  const day = draft.days[Math.min(activeDay, draft.days.length - 1)];
  const dayIndex = Math.min(activeDay, draft.days.length - 1);

  // El borrador se guarda en el teléfono a cada cambio.
  useEffect(() => {
    if (doneRef.current) return;
    if (!dirty) {
      clearDraft(uid, slot);
      return;
    }
    setStorageFull(!writeDraft(uid, slot, { ...draft, savedAt: Date.now() }));
  }, [draft, dirty, uid, slot]);

  // Miniaturas de los ejercicios que el plan ya tenía.
  const [serverGifs, setServerGifs] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!plan) return;
    let cancelled = false;
    supabaseClient
      .getPlanExercises(plan.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const list of Object.values(res?.exercises ?? {})) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const ex of list as any[]) {
            if (ex.exercise_id && ex.gif_url) map[ex.exercise_id] = ex.gif_url;
          }
        }
        setServerGifs(map);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [plan]);
  const gifs = useMemo(() => ({ ...serverGifs, ...draft.gifs }), [serverGifs, draft.gifs]);

  const change = (days: EditableDay[]) => {
    setProblem(null);
    setDraft((d) => ({ ...d, days }));
  };

  const save = async () => {
    if (saving) return;
    setConfirmExit(false);
    const blocker = saveBlocker(draft.days);
    if (blocker) {
      setProblem(blocker);
      const empty = draft.days.findIndex((d) => d.blocks.length === 0);
      if (empty >= 0) setActiveDay(empty);
      return;
    }
    const parsed = EditablePlanSchema.safeParse({ weeks: draft.weeks, days: draft.days });
    if (!parsed.success) {
      setProblem("error");
      return;
    }

    const meta: Record<string, unknown> = { ...(plan?.payload?.meta ?? {}) };
    if (draft.isNew) {
      meta.source = "manual";
      meta.created_at = new Date().toISOString();
    }
    if (isManual) {
      meta.name =
        draft.name.trim().slice(0, PLAN_LIMITS.name) ||
        t("plans.editor.default_name", "Mi plan");
    }
    const payload = { ...(plan?.payload ?? {}), meta, weeks: draft.weeks, days: draft.days };

    setSaving(true);
    setProblem(null);
    try {
      const saved = await supabaseClient.savePlanStructure({
        id: draft.planId,
        weeks: draft.weeks,
        payload,
      });
      doneRef.current = true;
      clearDraft(uid, slot);
      // Las letras y posiciones pudieron cambiar: una sesión a medias ya no cuadra.
      clearPlanSessions(draft.planId);
      onSaved({
        id: draft.planId,
        weeks: draft.weeks,
        created_at: plan?.created_at ?? new Date().toISOString(),
        payload: saved ?? payload,
      });
    } catch (err) {
      console.error("Error saving plan:", err);
      const offline =
        isNetworkError(err) || (typeof navigator !== "undefined" && navigator.onLine === false);
      setProblem(offline ? "offline" : "error");
    } finally {
      setSaving(false);
    }
  };

  // Si el guardado falló por conexión, se reintenta solo al recuperarla.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (problem !== "offline") return;
    const retry = () => saveRef.current();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [problem]);

  const discard = () => {
    doneRef.current = true;
    clearDraft(uid, slot);
    onClose();
  };

  const discardRestored = () => {
    clearDraft(uid, slot);
    setRestored(false);
    setProblem(null);
    setActiveDay(0);
    setDraft(plan ? base : freshDraft(null));
  };

  const requestClose = () => {
    if (saving) return;
    if (dirty) setConfirmExit(true);
    else onClose();
  };

  // Atrás del teléfono: cierra la confirmación, la pide si hay cambios, o sale.
  useBackGuard(true, () => {
    if (saving) return true;
    if (confirmExit) {
      setConfirmExit(false);
      return true;
    }
    if (dirty) {
      setConfirmExit(true);
      return true;
    }
    onClose();
  });

  const title = draft.isNew
    ? t("plans.editor.title_new", "Nuevo plan")
    : t("plans.editor.title_edit", "Editar plan");

  return (
    <div className="container mx-auto max-w-xl lg:max-w-3xl px-4 lg:px-6 pt-4 lg:pt-8 pb-10">
      {/* top bar */}
      <div className="flex items-center gap-3 pt-1 mb-4">
        <button
          onClick={requestClose}
          className="cf-icon-tile bg-surface-2 border border-border"
          style={{ width: 40, height: 40 }}
          aria-label={t("plans.plan_details.back_to_plans")}
        >
          <ArrowLeft size={20} />
        </button>
        <span className="cf-h2 flex-1 text-[16px] truncate">{title}</span>
        <button
          className="cf-btn cf-btn-primary cf-btn-sm"
          style={{ gap: 6 }}
          disabled={saving || (!dirty && !draft.isNew)}
          onClick={save}
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {saving ? t("plans.editor.saving", "Guardando…") : t("plans.editor.save", "Guardar")}
        </button>
      </div>

      {restored && dirty && (
        <div
          className="cf-card flex items-center gap-3 mb-3"
          style={{ padding: "10px 12px", borderRadius: 14 }}
        >
          <span className="cf-muted text-[12.5px] flex-1">
            {t("plans.editor.restored", "Recuperamos cambios que no llegaste a guardar.")}
          </span>
          <button className="cf-btn cf-btn-ghost cf-btn-sm" onClick={discardRestored}>
            {t("plans.editor.discard", "Descartar")}
          </button>
        </div>
      )}

      {/* estado del guardado: arriba, junto al botón Guardar */}
      {(problem || storageFull) && (
        <div
          className="cf-card flex items-start gap-2.5 mb-3"
          style={{ padding: "12px 14px", borderRadius: 14 }}
          role="alert"
        >
          {problem === "offline" ? (
            <WifiOff size={17} className="shrink-0 mt-0.5 text-muted" />
          ) : (
            <AlertTriangle size={17} className="shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
          )}
          <div className="flex-1 text-[13px] leading-snug">
            {problem === "empty_day" &&
              t(
                "plans.editor.problem_empty_day",
                "Cada día necesita al menos un ejercicio. Añade alguno a este día o quítalo."
              )}
            {problem === "no_days" &&
              t("plans.editor.problem_no_days", "El plan necesita al menos un día.")}
            {problem === "offline" &&
              t(
                "plans.editor.problem_offline",
                "Sin conexión: no se pudo guardar. Tus cambios siguen en este teléfono y se guardarán al volver la conexión."
              )}
            {problem === "error" &&
              t("plans.editor.problem_error", "No se pudo guardar el plan. Inténtalo de nuevo.")}
            {!problem &&
              storageFull &&
              t(
                "plans.editor.problem_storage",
                "No queda espacio en el teléfono para conservar el borrador. Guarda antes de salir."
              )}
            {(problem === "offline" || problem === "error") && (
              <button
                className="cf-btn cf-btn-ghost cf-btn-sm mt-2"
                disabled={saving}
                onClick={save}
              >
                {t("plans.retry", "Reintentar")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* nombre y duración */}
      <div className="cf-card mb-4" style={{ padding: 14, borderRadius: 18 }}>
        {isManual ? (
          <>
            <label className="cf-muted text-[11px] font-semibold" htmlFor="cf-plan-name">
              {t("plans.editor.plan_name", "Nombre del plan")}
            </label>
            <input
              id="cf-plan-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              maxLength={PLAN_LIMITS.name}
              placeholder={t("plans.editor.plan_name_placeholder", "Por ejemplo: Mi rutina de casa")}
              autoComplete="off"
              className="bg-transparent outline-none w-full text-[17px] font-bold py-1.5 border-b border-border"
            />
          </>
        ) : (
          <div className="cf-h2 text-[17px]">{plan ? planTitle(plan, t) : ""}</div>
        )}
        <div className="mt-3" style={{ maxWidth: 190 }}>
          <Stepper
            label={t("plans.editor.weeks", "Semanas")}
            value={draft.weeks}
            min={PLAN_LIMITS.weeks.min}
            max={PLAN_LIMITS.weeks.max}
            onChange={(weeks) => setDraft((d) => ({ ...d, weeks }))}
          />
        </div>
      </div>

      {/* días */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {draft.days.map((d, i) => (
          <button
            key={i}
            onClick={() => setActiveDay(i)}
            className={`cf-chip shrink-0 ${i === dayIndex ? "cf-chip-brand" : ""}`}
            style={{ padding: "9px 15px", fontSize: 13, gap: 6 }}
            aria-pressed={i === dayIndex}
          >
            {t("plan.day")} {d.day}
            {d.blocks.length === 0 && (
              <span
                className="rounded-full"
                style={{ width: 6, height: 6, background: "#ef4444" }}
                aria-label={t("plans.editor.empty_day_short", "sin ejercicios")}
              />
            )}
          </button>
        ))}
        {canAddDay(draft.days) && (
          <button
            onClick={() => {
              change(addDay(draft.days));
              setActiveDay(draft.days.length);
            }}
            className="cf-chip shrink-0"
            style={{ padding: "9px 13px", fontSize: 13, gap: 5 }}
          >
            <Plus size={14} />
            {t("plans.editor.add_day", "Día")}
          </button>
        )}
      </div>

      {day && (
        <DayEditor
          day={day}
          dayIndex={dayIndex}
          dayCount={draft.days.length}
          gifs={gifs}
          onFocusChange={(focus) => change(setDayFocus(draft.days, dayIndex, focus))}
          onMoveDay={(to) => {
            change(moveDay(draft.days, dayIndex, to));
            setActiveDay(to);
          }}
          onRemoveDay={() => {
            change(removeDay(draft.days, dayIndex));
            setActiveDay(Math.max(0, dayIndex - 1));
          }}
          onRemoveBlock={(i) => change(removeBlock(draft.days, dayIndex, i))}
          onMoveBlock={(from, to) => change(moveBlock(draft.days, dayIndex, from, to))}
          onUpdateBlock={(i, patch) => change(updateBlock(draft.days, dayIndex, i, patch))}
          onAddExercises={() => setPickerOpen(true)}
        />
      )}

      {pickerOpen && day && (
        <ExercisePicker
          presentIds={day.blocks.flatMap((b) => (b.exercise_id ? [b.exercise_id] : []))}
          maxSelectable={freeBlocks(day)}
          onClose={() => setPickerOpen(false)}
          onConfirm={(picked) => {
            setPickerOpen(false);
            setProblem(null);
            setDraft((d) => ({
              ...d,
              days: addBlocks(d.days, dayIndex, picked),
              gifs: {
                ...d.gifs,
                ...Object.fromEntries(
                  picked.flatMap((p) => (p.gif_url ? [[p.id, p.gif_url]] : []))
                ),
              },
            }));
          }}
        />
      )}

      {/* salir con cambios sin guardar */}
      {confirmExit && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setConfirmExit(false)}
        >
          <div
            className="cf-card w-full max-w-sm"
            style={{ padding: 22, borderRadius: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cf-h2 text-[18px] text-center">
              {t("plans.editor.exit_title", "Tienes cambios sin guardar")}
            </div>
            <p className="cf-muted text-[13.5px] leading-relaxed text-center mt-2">
              {t(
                "plans.editor.exit_desc",
                "Si sales ahora, los cambios se quedan en este teléfono y podrás seguir después."
              )}
            </p>
            <div className="flex flex-col gap-2 mt-5">
              <button className="cf-btn cf-btn-primary cf-btn-block" onClick={save}>
                {t("plans.editor.save", "Guardar")}
              </button>
              <button className="cf-btn cf-btn-ghost cf-btn-block" onClick={onClose}>
                {t("plans.editor.exit_keep", "Salir y seguir después")}
              </button>
              <button
                className="cf-btn cf-btn-ghost cf-btn-block"
                style={{ color: "#ef4444" }}
                onClick={discard}
              >
                {t("plans.editor.exit_discard", "Descartar cambios")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
