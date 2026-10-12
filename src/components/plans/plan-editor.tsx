"use client";
import { AlertTriangle, ArrowLeft, Check, Loader2, Plus, Sparkles, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GeneratingOverlay } from "@/components/ui/generating-overlay";
import {
  clearPendingFill,
  readPendingFill,
  runFill,
  type FilledDay,
  type FillRequest,
  type FillTarget,
} from "@/lib/ai/fill-plan";
import { useBackGuard } from "@/lib/back-guard";
import { canGenerate } from "@/lib/config/plans-config";
import { countAiGenerations } from "@/lib/plans/ai-quota";
import { profileFromMeta, profileToMeta, type AiProfile } from "@/lib/plans/ai-profile";
import { useRevenueCat } from "@/lib/revenuecat/revenuecat-context";
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
  relabelDays,
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
import { AiFillSheet, type FillChoice } from "./ai-fill-sheet";
import { AiProfileForm } from "./ai-profile-form";
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
  JSON.stringify({ name: d.name, weeks: d.weeks, days: d.days, profile: d.profile });

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
  const { t, i18n } = useTranslation("common");
  const { isPro, isNative, presentPaywall } = useRevenueCat();
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

  /* ===== Rellenar con IA ===== */
  // Perfil para la IA: el rellenado en este editor o el que ya guarda el plan.
  const savedProfile = useMemo(() => profileFromMeta(plan?.payload?.meta), [plan]);
  const profile = draft.profile ?? savedProfile;
  const [aiStep, setAiStep] = useState<{
    scope: "day" | "plan";
    stage: "profile" | "options";
  } | null>(null);
  const [filling, setFilling] = useState(false);
  const fillingRef = useRef(false);
  const [aiError, setAiError] = useState<string | null>(null);
  // Relleno pedido y aún sin meter en el borrador (se cortó la red o se cerró la app).
  const [pendingFill, setPendingFill] = useState(() => readPendingFill(uid, slot));

  const openFill = (scope: "day" | "plan") => {
    setAiError(null);
    setAiStep({ scope, stage: profile ? "options" : "profile" });
  };

  const applyFill = (filled: FilledDay[], target: FillTarget, scope: "day" | "plan") => {
    const focusOf = (d: FilledDay) => String(d.focus ?? "").slice(0, PLAN_LIMITS.focus);
    setProblem(null);
    setDraft((d) => {
      if (scope === "plan") {
        return {
          ...d,
          days: relabelDays(
            filled.slice(0, PLAN_LIMITS.days.max).map((fd) => ({
              day: "",
              focus: focusOf(fd),
              blocks: fd.blocks.slice(0, PLAN_LIMITS.blocks.max),
            }))
          ),
        };
      }
      const at = Math.min(target.dayIndex, d.days.length - 1);
      return {
        ...d,
        days: d.days.map((current, i) => {
          if (i !== at) return current;
          const kept = target.mode === "replace" ? [] : current.blocks;
          const present = new Set(kept.map((b) => b.exercise_id));
          const fresh = (filled[0]?.blocks ?? [])
            .filter((b) => !present.has(b.exercise_id))
            .slice(0, PLAN_LIMITS.blocks.max - kept.length);
          return {
            ...current,
            focus: current.focus || (filled[0] ? focusOf(filled[0]) : ""),
            blocks: [...kept, ...fresh],
          };
        }),
      };
    });
    // Miniaturas de lo recién añadido (el resultado solo trae ids y nombres).
    const ids = filled.flatMap((fd) => fd.blocks.flatMap((b) => (b.exercise_id ? [b.exercise_id] : [])));
    supabaseClient
      .getExerciseGifs(ids)
      .then((map) => setDraft((d) => ({ ...d, gifs: { ...d.gifs, ...map } })))
      .catch(() => undefined);
  };

  const limitMessage = () =>
    t(
      "paywall.limit_reached",
      "Ya usaste tu plan gratuito. Mejora a Pro desde la app móvil para generar planes ilimitados."
    );

  // `gate`: comprobar el cupo antes de pedirlo. Al recuperar un relleno ya
  // pedido no hace falta: el servidor devuelve el mismo resultado.
  const execFill = async (
    request: FillRequest,
    target: FillTarget,
    withProfile: AiProfile,
    gate: boolean
  ) => {
    if (fillingRef.current) return;
    fillingRef.current = true;
    setAiError(null);
    try {
      if (gate && !isPro) {
        const used = await countAiGenerations();
        if (!canGenerate("free", used)) {
          if (!isNative) {
            setAiError(limitMessage());
            return;
          }
          const purchased = await presentPaywall();
          if (!purchased) return;
        }
      }
      setFilling(true);
      const filled = await runFill({
        uid,
        slot,
        request,
        target,
        profile: withProfile,
        language: i18n.language,
      });
      if (filled.length === 0) throw new Error("GENERATION_FAILED");
      applyFill(filled, target, request.scope);
      // Solo ahora, con el resultado en el borrador, deja de estar pendiente.
      clearPendingFill(uid, slot);
      setPendingFill(null);
      if (request.scope === "plan") setActiveDay(0);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "GENERATION_NETWORK") {
        // Puede haberse generado: se conserva el id para recuperarlo sin gastar otra.
        setPendingFill(readPendingFill(uid, slot));
        setAiError(
          t(
            "plans.ai_fill.error_network",
            "No hay conexión con el servidor. Cuando vuelva, toca «Recuperar»: no se gasta otra generación."
          )
        );
        return;
      }
      clearPendingFill(uid, slot);
      setPendingFill(null);
      if (code === "FREE_LIMIT_REACHED") {
        if (isNative) await presentPaywall();
        else setAiError(limitMessage());
      } else if (code === "PRO_LIMIT_REACHED") {
        setAiError(
          t("plans.ai_fill.error_pro_limit", "Has alcanzado el límite mensual de generaciones.")
        );
      } else if (code === "NOT_ENOUGH_EXERCISES") {
        setAiError(
          t(
            "plans.ai_fill.error_not_enough",
            "Con tu equipo no hay ejercicios suficientes para esas zonas. Prueba con otras zonas o menos ejercicios."
          )
        );
      } else {
        console.error("Error filling with AI:", err);
        setAiError(
          t("plans.ai_fill.error", "No se pudo generar. Inténtalo de nuevo; no se gastó tu generación.")
        );
      }
    } finally {
      fillingRef.current = false;
      setFilling(false);
    }
  };

  const confirmFill = (choice: FillChoice) => {
    const scope = aiStep?.scope ?? "day";
    setAiStep(null);
    if (!profile || !day) return;
    const mode = scope === "day" ? choice.mode : "replace";
    execFill(
      {
        scope,
        days: scope === "plan" ? choice.days : 1,
        blocks: choice.blocks,
        objective: choice.objective,
        zones: choice.zones,
        exclude:
          scope === "day" && mode === "add"
            ? day.blocks.flatMap((b) => (b.exercise_id ? [b.exercise_id] : []))
            : [],
        ...(choice.note.trim() ? { note: choice.note.trim() } : {}),
      },
      { dayIndex, mode },
      profile,
      true
    );
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
    // Perfil para la IA rellenado en este editor: se guarda con el plan.
    if (draft.profile) Object.assign(meta, profileToMeta(draft.profile));
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
    if (saving || filling) return;
    if (dirty) setConfirmExit(true);
    else onClose();
  };

  // Atrás del teléfono: cierra la confirmación, la pide si hay cambios, o sale.
  useBackGuard(true, () => {
    if (saving || filling) return true;
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

      {pendingFill && !filling && (
        <div
          className="cf-card flex items-center gap-2.5 mb-3"
          style={{ padding: "10px 12px", borderRadius: 14 }}
        >
          <Sparkles size={16} className="shrink-0 text-primary" />
          <span className="cf-muted text-[12.5px] flex-1">
            {t("plans.ai_fill.pending", "Quedó un relleno con IA sin terminar.")}
          </span>
          {profile && (
            <button
              className="cf-btn cf-btn-ghost cf-btn-sm"
              onClick={() => execFill(pendingFill.request, pendingFill.target, profile, false)}
            >
              {t("plans.ai_fill.recover", "Recuperar")}
            </button>
          )}
          <button
            className="cf-btn cf-btn-ghost cf-btn-sm"
            onClick={() => {
              clearPendingFill(uid, slot);
              setPendingFill(null);
              setAiError(null);
            }}
          >
            {t("plans.editor.discard", "Descartar")}
          </button>
        </div>
      )}

      {aiError && (
        <div
          className="cf-card flex items-start gap-2.5 mb-3"
          style={{ padding: "12px 14px", borderRadius: 14 }}
          role="alert"
        >
          <AlertTriangle size={17} className="shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
          <span className="flex-1 text-[13px] leading-snug">{aiError}</span>
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
        <button
          type="button"
          className="cf-btn cf-btn-ghost cf-btn-block mt-3.5"
          style={{ gap: 8 }}
          onClick={() => openFill("plan")}
        >
          <Sparkles size={16} />
          {t("plans.ai_fill.cta_plan", "Rellenar todo el plan con IA")}
        </button>
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
          onAiFill={() => openFill("day")}
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

      {aiStep?.stage === "profile" && (
        <AiProfileForm
          onClose={() => setAiStep(null)}
          onSubmit={(next) => {
            setDraft((d) => ({ ...d, profile: next }));
            setAiStep({ scope: aiStep.scope, stage: "options" });
          }}
        />
      )}

      {aiStep?.stage === "options" && profile && day && (
        <AiFillSheet
          scope={aiStep.scope}
          dayLabel={`${t("plan.day")} ${day.day}`}
          dayBlocks={day.blocks.length}
          freeInDay={freeBlocks(day)}
          defaultObjective={profile.objective}
          onClose={() => setAiStep(null)}
          onConfirm={confirmFill}
        />
      )}

      {filling && <GeneratingOverlay title={t("plans.ai_fill.generating", "Generando ejercicios…")} />}

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
