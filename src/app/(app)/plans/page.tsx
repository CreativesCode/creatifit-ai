"use client";
import { supabaseClient } from "@/lib/supabase-client";
import { planTitle, formatReps } from "@/lib/plan-display";
import { useAuth } from "@/lib/auth/auth-context";
import { useRevenueCat } from "@/lib/revenuecat/revenuecat-context";
import { canGenerate } from "@/lib/config/plans-config";
import {
  computeImproveEligibility,
  buildProgressionNotes,
  buildImproveIntake,
  logsForPlan,
} from "@/lib/ai/improve-plan";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Dumbbell,
  Edit,
  Loader2,
  Play,
  Plus,
  Repeat,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface ExerciseBlock {
  name: string;
  exercise_id?: string;
  sets: number;
  reps: [number, number];
  rest_sec: number;
  cues?: string[];
}

interface PlanDay {
  day: string;
  focus: string;
  blocks: ExerciseBlock[];
}

interface Plan {
  id: string;
  weeks: number;
  created_at: string;
  payload: {
    days: PlanDay[];
    meta?: { objective?: string; name?: string };
  };
}

export default function PlansPage() {
  const { t, i18n } = useTranslation("common");
  const router = useRouter();
  const { user } = useAuth();
  const { isPro, isNative, presentPaywall } = useRevenueCat();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Ejercicios del día seleccionado (con gif_url), indexados por exercise_id.
  const [dayGifs, setDayGifs] = useState<Record<string, string>>({});
  // Modo edición (entrada desde el botón "Editar" del plan).
  const [editMode, setEditMode] = useState(false);
  // Estado de la hoja de cambio de ejercicio.
  const [swapTarget, setSwapTarget] = useState<{
    blockIndex: number;
    exerciseId?: string;
    name: string;
  } | null>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [altLoading, setAltLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  // Borrado de plan (modal de confirmación).
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // "Mejorar plan": elegibilidad (según historial) + estado de la generación.
  const [improveEligible, setImproveEligible] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);

  const planId = searchParams.get("id");
  const dayParam = searchParams.get("day");

  // Vista del día en estado local, sincronizada desde la URL. La URL sigue
  // sirviendo para deep-links, pero los botones actualizan PRIMERO el estado:
  // en Capacitor router.replace/push puede no propagar el cambio de query a
  // useSearchParams (mismo workaround que goBackToList en /exercises), y el
  // botón de atrás del día quedaba muerto.
  const [dayView, setDayView] = useState<string | null>(null);
  const [dayEditing, setDayEditing] = useState(false);
  useEffect(() => {
    setDayView(dayParam);
    setDayEditing(!!dayParam && searchParams.get("edit") === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayParam]);

  const EXERCISE_IMAGES_BASE_URL = process.env.NEXT_PUBLIC_STATICS_IMAGES;
  const buildImageUrl = (gif?: string | null) => {
    if (!gif || !EXERCISE_IMAGES_BASE_URL) return "/placeholder-exercise.svg";
    return `${EXERCISE_IMAGES_BASE_URL.replace(/\/$/, "")}/${gif.replace(/^\//, "")}`;
  };

  useEffect(() => {
    if (planId) {
      // Evita el doble fetch: si ya tenemos el plan en memoria (seleccionado al
      // pulsar la tarjeta) y trae el payload con días, lo reutilizamos.
      if (selectedPlan && selectedPlan.id === planId && selectedPlan.payload?.days) {
        setLoading(false);
        return;
      }
      fetchPlan(planId);
    } else {
      fetchPlans();
      setSelectedPlan(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  // Al abrir el detalle de un día, traemos los GIF de sus ejercicios para mostrar
  // las imágenes. El cruce con los bloques del payload se hace por exercise_id.
  useEffect(() => {
    if (!planId || !dayView) {
      setDayGifs({});
      return;
    }
    let cancelled = false;
    supabaseClient
      .getPlanExercises(planId)
      .then((res: any) => {
        if (cancelled) return;
        const list = res?.exercises?.[dayView] || [];
        const map: Record<string, string> = {};
        for (const ex of list) {
          if (ex.exercise_id && ex.gif_url) map[ex.exercise_id] = ex.gif_url;
        }
        setDayGifs(map);
      })
      .catch(() => {
        if (!cancelled) setDayGifs({});
      });
    return () => {
      cancelled = true;
    };
  }, [planId, dayView]);

  // Al abrir el detalle de un plan, evaluamos si hay datos suficientes para
  // "Mejorar plan": ≥1 entrenamiento INICIADO DESDE ESTE PLAN con series
  // registradas. Filtramos los logs por `plan_id` (ver logsForPlan) para que el
  // botón NO aparezca en un plan recién generado ni por entrenar otro plan.
  useEffect(() => {
    if (!planId || !selectedPlan) {
      setImproveEligible(false);
      return;
    }
    let cancelled = false;
    supabaseClient
      .getLogs()
      .then((logs) => {
        if (cancelled) return;
        const scoped = logsForPlan(logs, selectedPlan.id);
        setImproveEligible(computeImproveEligibility(scoped).eligible);
      })
      .catch(() => {
        if (!cancelled) setImproveEligible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId, selectedPlan]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const plansData = await supabaseClient.getPlans();
      setPlans(plansData || []);
    } catch (err) {
      console.error("Error fetching plans:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlan = async (id: string) => {
    try {
      setLoading(true);
      const planData = await supabaseClient.getPlanById(id);
      setSelectedPlan(planData);
    } catch (err) {
      console.error("Error fetching plan:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const goBackToList = () => {
    // Estado primero (ver comentario de dayView); la navegación es best-effort.
    setSelectedPlan(null);
    setDayView(null);
    // Si se entró por deep-link (?id=...) el listado nunca se cargó.
    if (plans.length === 0) fetchPlans();
    try {
      router.replace("/plans");
    } catch {
      /* no-op: el estado ya muestra el listado */
    }
  };

  // Abre la hoja de alternativas para el ejercicio (bloque) indicado.
  const openSwap = async (
    blockIndex: number,
    block: { exercise_id?: string; name: string }
  ) => {
    setSwapTarget({ blockIndex, exerciseId: block.exercise_id, name: block.name });
    setAlternatives([]);
    setSwapError(null);
    if (!block.exercise_id) {
      setSwapError(t("plans.swap.no_alternatives", "No hay alternativas disponibles."));
      return;
    }
    try {
      setAltLoading(true);
      const alts = await supabaseClient.getAlternativeExercises(block.exercise_id);
      setAlternatives(alts || []);
    } catch {
      setSwapError(t("plans.swap.error", "No se pudieron cargar las alternativas."));
    } finally {
      setAltLoading(false);
    }
  };

  const closeSwap = () => {
    setSwapTarget(null);
    setAlternatives([]);
    setSwapError(null);
  };

  // Ejecuta el cambio: persiste y refresca el estado local sin recargar.
  const doSwap = async (alt: {
    id: string;
    name: string;
    gif_url?: string;
  }) => {
    if (!selectedPlan || !dayView || !swapTarget) return;
    try {
      setSwapping(true);
      setSwappingId(alt.id);
      setSwapError(null);
      const payload = await supabaseClient.swapPlanExercise({
        planId: selectedPlan.id,
        currentPayload: selectedPlan.payload,
        dayLetter: dayView,
        blockIndex: swapTarget.blockIndex,
        newExerciseId: alt.id,
        newName: alt.name,
      });
      setSelectedPlan((prev) => (prev ? { ...prev, payload } : prev));
      if (alt.gif_url) {
        setDayGifs((prev) => ({ ...prev, [alt.id]: alt.gif_url as string }));
      }
      closeSwap();
    } catch {
      setSwapError(
        t("plans.swap.save_error", "No se pudo guardar el cambio. Inténtalo de nuevo.")
      );
    } finally {
      setSwapping(false);
      setSwappingId(null);
    }
  };

  // Borra el plan seleccionado y vuelve al listado (quitándolo del estado local
  // para que la lista se refresque sin recargar).
  const confirmDeletePlan = async () => {
    if (!planToDelete) return;
    const id = planToDelete.id;
    try {
      setDeleting(true);
      setDeleteError(null);
      await supabaseClient.deletePlan(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      setPlanToDelete(null);
      // Si estábamos dentro del detalle de este plan, salimos al listado.
      if (selectedPlan?.id === id) {
        setSelectedPlan(null);
        setDayView(null);
        try {
          router.replace("/plans");
        } catch {
          /* no-op: el estado ya muestra el listado */
        }
      }
    } catch (err) {
      console.error("Error deleting plan:", err);
      setDeleteError(t("plans.delete.error", "No se pudo eliminar el plan. Inténtalo de nuevo."));
    } finally {
      setDeleting(false);
    }
  };

  // Genera una PROGRESIÓN del plan actual usando el historial de entrenamientos
  // y la guarda como plan nuevo. Reutiliza la misma Edge Function `generate-plan`
  // (vía notes) y el mismo gating de tier que la creación de un plan.
  const handleImprovePlan = async () => {
    if (!selectedPlan || improving) return;
    setImproveError(null);
    try {
      setImproving(true);

      // 1) Datos reales de entrenamiento DE ESTE PLAN + comprobación de elegibilidad.
      const allLogs = (await supabaseClient.getLogs()) || [];
      const logs = logsForPlan(allLogs, selectedPlan.id);
      const eligibility = computeImproveEligibility(logs);
      if (!eligibility.eligible) {
        setImproveError(
          t(
            "plans.improve.not_enough_data",
            "Aún no hay datos suficientes. Completa al menos un entrenamiento para poder mejorar el plan."
          )
        );
        return;
      }

      // 2) Gating por tier (mejorar = nueva generación con IA). Free = 1 en total.
      if (!isPro) {
        const used = await supabaseClient.countPlans();
        if (!canGenerate("free", used)) {
          if (isNative) {
            const purchased = await presentPaywall();
            if (!purchased) return;
          } else {
            setImproveError(
              t(
                "paywall.limit_reached",
                "Ya usaste tu plan gratuito. Mejora a Pro desde la app móvil para generar planes ilimitados."
              )
            );
            return;
          }
        }
      }

      // 3) Reconstruir el intake desde el meta del plan + notas de progresión.
      const notes = buildProgressionNotes(logs, eligibility);
      const intake = buildImproveIntake(
        selectedPlan.payload?.meta,
        selectedPlan.weeks,
        i18n.language,
        notes
      );

      const { generateFitnessPlan } = await import("@/lib/ai/openai");
      const generatedPlan = await generateFitnessPlan(intake);
      if (!generatedPlan?.days?.length) {
        throw new Error("Plan structure is invalid");
      }

      // 4) Guardar como plan NUEVO (el anterior y el historial se conservan).
      const planId = crypto.randomUUID();
      const meta = selectedPlan.payload?.meta || {};
      const { plan: savedPlan } = await supabaseClient.savePlan({
        id: planId,
        user_id: user?.id ?? null,
        weeks: selectedPlan.weeks,
        version: 1,
        source_hash: planId,
        payload: {
          meta: {
            ...meta,
            name: t("plans.improve.improved_name", "Plan mejorado"),
            improved_from: selectedPlan.id,
            created_at: new Date().toISOString(),
          },
          ...generatedPlan,
        },
      });
      if (!savedPlan) throw new Error("Failed to save improved plan");

      // 5) Navegar al plan nuevo.
      setEditMode(false);
      setDayView(null);
      const improved: Plan = {
        ...savedPlan,
        payload:
          typeof savedPlan.payload === "string"
            ? JSON.parse(savedPlan.payload)
            : savedPlan.payload,
      };
      setPlans((prev) => [improved, ...prev.filter((p) => p.id !== improved.id)]);
      setSelectedPlan(improved);
      try {
        router.push(`/plans?id=${improved.id}`);
      } catch {
        /* no-op: el estado ya muestra el plan nuevo */
      }
    } catch (err) {
      if (err instanceof Error && err.message === "FREE_LIMIT_REACHED") {
        if (isNative) {
          await presentPaywall();
        } else {
          setImproveError(
            t(
              "paywall.limit_reached",
              "Ya usaste tu plan gratuito. Mejora a Pro desde la app móvil para generar planes ilimitados."
            )
          );
        }
        return;
      }
      console.error("Error improving plan:", err);
      setImproveError(
        t("plans.improve.error", "No se pudo mejorar el plan. Inténtalo de nuevo.")
      );
    } finally {
      setImproving(false);
    }
  };

  // Modal de confirmación de borrado (compartido entre el detalle y el listado).
  const deleteModal = planToDelete && (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={() => !deleting && setPlanToDelete(null)}
    >
      <div
        className="cf-card w-full max-w-sm"
        style={{ padding: 22, borderRadius: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="cf-icon-tile mx-auto mb-3"
          style={{
            width: 52,
            height: 52,
            background: "color-mix(in srgb, #ef4444 16%, transparent)",
            color: "#ef4444",
          }}
        >
          <AlertTriangle size={24} />
        </div>
        <div className="cf-h2 text-[19px] text-center">
          {t("plans.delete.confirm_title", "¿Eliminar este plan?")}
        </div>
        <p className="cf-muted text-[13.5px] leading-relaxed text-center mt-2">
          {t(
            "plans.delete.confirm_desc",
            "Se borrará este plan y sus días de entrenamiento. Tu historial de entrenamientos se conserva. Esta acción no se puede deshacer."
          )}
        </p>

        {deleteError && (
          <div
            className="text-[12.5px] font-semibold text-center mt-3"
            style={{ color: "#ef4444" }}
          >
            {deleteError}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-5">
          <button
            className="cf-btn cf-btn-block"
            disabled={deleting}
            onClick={confirmDeletePlan}
            style={{ background: "#ef4444", color: "#fff", gap: 8 }}
          >
            {deleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t("plans.delete.deleting", "Eliminando…")}
              </>
            ) : (
              <>
                <Trash2 size={16} />
                {t("plans.delete.confirm_cta", "Sí, eliminar plan")}
              </>
            )}
          </button>
          <button
            className="cf-btn cf-btn-ghost cf-btn-block"
            disabled={deleting}
            onClick={() => setPlanToDelete(null)}
          >
            {t("common.cancel", "Cancelar")}
          </button>
        </div>
      </div>
    </div>
  );

  // ---------- Loading (skeleton que replica la rejilla de planes) ----------
  if (loading) {
    return (
      <div className="container mx-auto max-w-xl lg:max-w-6xl px-4 lg:px-6 pt-4 lg:pt-8">
        <div className="flex justify-between items-start pt-1 mb-5">
          <div>
            <div className="cf-eyebrow">{t("nav.plans")}</div>
            <div className="cf-h1 text-[26px] mt-1.5">{t("plans.title")}</div>
          </div>
          <div className="cf-icon-tile bg-surface-2 animate-pulse" style={{ width: 44, height: 44 }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="cf-card animate-pulse"
              style={{ padding: 18, borderRadius: 22 }}
            >
              <div className="flex gap-1.5 mb-3.5">
                <div className="h-6 w-16 bg-surface-2 rounded-full" />
                <div className="h-6 w-12 bg-surface-2 rounded-full" />
              </div>
              <div className="h-5 bg-surface-2 rounded w-2/3 mb-2" />
              <div className="h-3.5 bg-surface-2 rounded w-1/2 mb-4" />
              <div className="h-3.5 bg-surface-2 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className="container mx-auto max-w-xl px-5 py-10 text-center">
        <p className="text-danger mb-4">Error: {error}</p>
        <button
          className="cf-btn cf-btn-ghost"
          onClick={planId ? () => fetchPlan(planId!) : fetchPlans}
        >
          {t("plans.retry")}
        </button>
      </div>
    );
  }

  // ---------- Day detail (ejercicios del día seleccionado) ----------
  if (selectedPlan && dayView) {
    const day = (selectedPlan.payload?.days || []).find(
      (d) => d.day === dayView
    );

    if (day) {
      return (
        <div className="container mx-auto max-w-xl lg:max-w-3xl px-4 lg:px-6 pt-4 lg:pt-8 pb-32">
          {/* top bar */}
          <div className="flex items-center gap-3 pt-1 mb-4">
            <button
              onClick={() => {
                // Estado primero: el back debe funcionar aunque la navegación
                // de query falle en Capacitor.
                setDayView(null);
                try {
                  router.replace(`/plans?id=${selectedPlan.id}`);
                } catch {
                  /* no-op */
                }
              }}
              className="cf-icon-tile bg-surface-2 border border-border"
              style={{ width: 40, height: 40 }}
              aria-label={t("plans.plan_details.back_to_plans")}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="cf-eyebrow">
                {t("plan.day")} {day.day}
              </div>
              <div className="cf-h2 text-[16px] truncate">{day.focus}</div>
            </div>
            <button
              onClick={() => setDayEditing((v) => !v)}
              className={
                dayEditing
                  ? "cf-icon-tile bg-grad-brand text-white shadow-glow-brand"
                  : "cf-icon-tile bg-surface-2 border border-border"
              }
              style={{ width: 40, height: 40 }}
              aria-label={t("plans.plan_details.edit")}
            >
              {dayEditing ? <Check size={18} /> : <Edit size={18} />}
            </button>
          </div>

          {dayEditing && (
            <p className="cf-muted text-[12.5px] mb-3 -mt-1">
              {t(
                "plans.swap.hint",
                "Toca «Cambiar ejercicio» para sustituir cualquiera por uno similar."
              )}
            </p>
          )}

          {/* exercise list */}
          <div className="flex flex-col gap-3">
            {(day.blocks || []).map((block, i) => (
              <div
                key={i}
                className="cf-card"
                style={{ padding: 14, borderRadius: 18 }}
              >
                <div className="flex items-start gap-3.5">
                  <img
                    src={buildImageUrl(
                      block.exercise_id ? dayGifs[block.exercise_id] : null
                    )}
                    alt={block.name}
                    loading="lazy"
                    decoding="async"
                    className="rounded-[14px] object-contain bg-white/90 shrink-0"
                    style={{ width: 64, height: 64 }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/placeholder-exercise.svg";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[15px] leading-tight">
                      {block.name}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="cf-chip" style={{ fontSize: 11.5 }}>
                        {block.sets} {t("plan_display.series")}
                      </span>
                      <span className="cf-chip" style={{ fontSize: 11.5 }}>
                        {formatReps(block.reps)} {t("plan_display.reps")}
                      </span>
                      <span className="cf-chip" style={{ fontSize: 11.5 }}>
                        {block.rest_sec}s {t("plan_display.rest")}
                      </span>
                    </div>
                    {block.cues && block.cues.length > 0 && (
                      <ul className="mt-2.5 space-y-1">
                        {block.cues.map((cue, ci) => (
                          <li
                            key={ci}
                            className="cf-muted text-[12px] flex items-start gap-1.5"
                          >
                            <span className="text-accent">•</span>
                            {cue}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                {dayEditing && (
                  <button
                    onClick={() => openSwap(i, block)}
                    className="cf-btn cf-btn-ghost cf-btn-block mt-3"
                    style={{ gap: 8 }}
                  >
                    <Repeat size={15} />
                    {t("plans.swap.change", "Cambiar ejercicio")}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* sticky CTA: empezar este día */}
          <div
            className="fixed left-0 right-0 lg:left-60 bottom-[calc(76px+var(--sab))] lg:bottom-0 z-40 px-5 pt-3 pb-4 lg:pb-6"
            style={{
              background: "linear-gradient(to top, var(--bg) 70%, transparent)",
            }}
          >
            <div className="container mx-auto max-w-xl lg:max-w-3xl px-0">
              <button
                className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg"
                onClick={() =>
                  router.push(
                    `/session?planId=${selectedPlan.id}&day=${day.day}`
                  )
                }
              >
                <Play size={17} fill="currentColor" />
                {t("plan_display.start_day", { day: day.day })}
              </button>
            </div>
          </div>

          {/* hoja de alternativas para cambiar un ejercicio */}
          {swapTarget && (
            <div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
              style={{ background: "rgba(8,8,16,0.6)", backdropFilter: "blur(6px)" }}
              onClick={closeSwap}
            >
              <div
                className="cf-card w-full sm:max-w-md max-h-[80vh] overflow-y-auto"
                style={{
                  padding: 18,
                  borderRadius: "22px 22px 0 0",
                  paddingBottom: "calc(18px + var(--sab))",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="min-w-0">
                    <div className="cf-eyebrow">
                      {t("plans.swap.title", "Cambiar ejercicio")}
                    </div>
                    <div className="cf-h2 text-[16px] truncate">
                      {swapTarget.name}
                    </div>
                  </div>
                  <button
                    onClick={closeSwap}
                    className="cf-icon-tile bg-surface-2 border border-border shrink-0"
                    style={{ width: 34, height: 34 }}
                    aria-label={t("ui.close", "Cerrar")}
                  >
                    <X size={16} />
                  </button>
                </div>

                {swapError && (
                  <p className="text-danger text-[13px] my-3">{swapError}</p>
                )}

                {altLoading && (
                  <div className="py-8 text-center cf-muted text-[13px]">
                    {t("plans.swap.loading", "Buscando alternativas…")}
                  </div>
                )}

                {!altLoading && !swapError && alternatives.length === 0 && (
                  <p className="cf-muted text-[13px] py-6 text-center">
                    {t("plans.swap.no_alternatives", "No hay alternativas disponibles.")}
                  </p>
                )}

                <div className="flex flex-col gap-2 mt-2">
                  {alternatives.map((alt) => (
                    <button
                      key={alt.id}
                      disabled={swapping}
                      onClick={() => doSwap(alt)}
                      className="cf-card-solid flex items-center gap-3 text-left disabled:opacity-60"
                      style={{ padding: "10px 12px", borderRadius: 14 }}
                    >
                      <img
                        src={buildImageUrl(alt.gif_url)}
                        alt={alt.name}
                        loading="lazy"
                        decoding="async"
                        className="rounded-[12px] object-contain bg-white/90 shrink-0"
                        style={{ width: 46, height: 46 }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/placeholder-exercise.svg";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[14px] leading-tight truncate">
                          {alt.name}
                        </div>
                        {alt.equipment && (
                          <div className="cf-muted text-[11.5px] truncate mt-0.5">
                            {alt.equipment}
                          </div>
                        )}
                      </div>
                      {swappingId === alt.id ? (
                        <Loader2 size={16} className="animate-spin text-primary shrink-0" />
                      ) : (
                        <ChevronRight size={16} className="text-faint shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
  }

  // ---------- Plan detail ----------
  if (selectedPlan) {
    const days = selectedPlan.payload?.days || [];
    const totalExercises = days.reduce(
      (acc, d) => acc + (d.blocks?.length || 0),
      0
    );
    const heroStats: [string, string][] = [
      [String(selectedPlan.weeks), t("plan.weeks")],
      [String(days.length), `${t("plan.day")}s`],
      [String(totalExercises), t("nav.exercises")],
    ];

    return (
      <div className="container mx-auto max-w-xl lg:max-w-3xl px-4 lg:px-6 pt-4 lg:pt-8">
        {/* top bar */}
        <div className="flex items-center gap-3 pt-1 mb-4">
          <button
            onClick={goBackToList}
            className="cf-icon-tile bg-surface-2 border border-border"
            style={{ width: 40, height: 40 }}
            aria-label={t("plans.plan_details.back_to_plans")}
          >
            <ArrowLeft size={20} />
          </button>
          <span className="cf-h2 flex-1 text-[16px]">
            {t("plans.plan_details.title")}
          </span>
          <button
            onClick={() => setEditMode((v) => !v)}
            className={
              editMode
                ? "cf-icon-tile bg-grad-brand text-white shadow-glow-brand"
                : "cf-icon-tile bg-surface-2 border border-border"
            }
            style={{ width: 40, height: 40 }}
            aria-label={t("plans.plan_details.edit")}
          >
            {editMode ? <Check size={18} /> : <Edit size={18} />}
          </button>
          <button
            onClick={() => {
              setDeleteError(null);
              setPlanToDelete(selectedPlan);
            }}
            className="cf-icon-tile bg-surface-2 border border-border"
            style={{ width: 40, height: 40, color: "#ef4444" }}
            aria-label={t("plans.delete.action", "Eliminar plan")}
          >
            <Trash2 size={18} />
          </button>
        </div>

        {editMode && (
          <p className="cf-muted text-[12.5px] mb-3 -mt-1">
            {t(
              "plans.swap.edit_hint",
              "Modo edición: abre un día para cambiar sus ejercicios."
            )}
          </p>
        )}

        {/* plan hero */}
        <div
          className="cf-card relative overflow-hidden mb-4"
          style={{ padding: 20, borderRadius: 24 }}
        >
          <div
            className="absolute inset-0 bg-grad-brand"
            style={{ opacity: 0.14 }}
            aria-hidden
          />
          <div className="relative">
            <span className="cf-chip cf-chip-brand">
              <Sparkles size={12} fill="currentColor" />
              {t("plan.ai_generated", "Generado por IA")}
            </span>
            <div className="cf-h1 text-[24px] mt-3">{planTitle(selectedPlan, t)}</div>
            <div className="cf-muted text-[13px] mt-1">
              {t("plans.plan_details.plan_duration", { weeks: selectedPlan.weeks })}
            </div>
            <div className="cf-muted text-[12px] mt-1.5">
              {t("plans.plan_details.created_on", {
                date: formatDate(selectedPlan.created_at),
              })}
            </div>
            <div className="flex gap-[18px] mt-4">
              {heroStats.map((s, i) => (
                <div key={i}>
                  <div className="cf-num text-[21px]">{s[0]}</div>
                  <div className="cf-muted text-[11px] font-semibold">{s[1]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* days */}
        <div className="flex justify-between items-center mb-3">
          <span className="cf-h2 text-[15px]">
            {t("plans.plan_details.training_days", "Días de entrenamiento")}
          </span>
          <span className="cf-muted text-[12px] font-semibold">
            {days.map((d) => d.day).join(" → ")}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2">
          {days.map((d, i) => (
            <button
              key={i}
              onClick={() => {
                // Estado primero (ver dayView); push best-effort para el historial.
                setDayView(d.day);
                setDayEditing(editMode);
                try {
                  router.push(
                    `/plans?id=${selectedPlan.id}&day=${d.day}${
                      editMode ? "&edit=1" : ""
                    }`
                  );
                } catch {
                  /* no-op */
                }
              }}
              className="cf-card flex items-center gap-3.5 text-left"
              style={{ padding: "14px 15px", borderRadius: 18 }}
            >
              <div
                className="cf-icon-tile bg-surface-2 font-display font-bold text-[18px] text-muted"
                style={{ width: 46, height: 46, borderRadius: 14 }}
              >
                {d.day}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15.5px]">
                  {t("plan.day")} {d.day} · {d.focus}
                </div>
                <div className="cf-muted text-[12px] font-semibold mt-0.5">
                  {d.blocks?.length || 0} {t("nav.exercises")}
                </div>
              </div>
              <ChevronRight size={18} className="text-faint" />
            </button>
          ))}
        </div>

        <div className="mt-5 pb-2 flex flex-col gap-2.5">
          <button
            className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg"
            onClick={() => router.push(`/session?planId=${selectedPlan.id}`)}
          >
            <Play size={17} fill="currentColor" />
            {t("plans.plan_details.start_session")}
          </button>

          {/* "Mejorar plan": solo si hay ≥1 entrenamiento terminado con datos. */}
          {improveEligible && (
            <>
              <button
                className="cf-btn cf-btn-ghost cf-btn-block"
                onClick={handleImprovePlan}
                disabled={improving}
                style={{ gap: 8 }}
              >
                {improving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t("plans.improve.improving", "Mejorando tu plan…")}
                  </>
                ) : (
                  <>
                    <TrendingUp size={16} />
                    {t("plans.improve.cta", "Mejorar plan con mi progreso")}
                  </>
                )}
              </button>
              <p className="cf-muted text-[11.5px] text-center px-2">
                {t(
                  "plans.improve.hint",
                  "Genera una versión progresada de este plan según tus entrenamientos."
                )}
              </p>
              {improveError && (
                <p
                  className="text-[12.5px] font-semibold text-center"
                  style={{ color: "#ef4444" }}
                >
                  {improveError}
                </p>
              )}
            </>
          )}
        </div>

        {deleteModal}
      </div>
    );
  }

  // ---------- Plans list ----------
  const GRADS = ["brand", "cyan", "mint"] as const;
  return (
    <div className="container mx-auto max-w-xl lg:max-w-6xl px-4 lg:px-6 pt-4 lg:pt-8">
      {/* header */}
      <div className="flex justify-between items-start pt-1 mb-5">
        <div>
          <div className="cf-eyebrow">{t("nav.plans")}</div>
          <div className="cf-h1 text-[26px] mt-1.5">{t("plans.title")}</div>
        </div>
        <button
          onClick={() => router.push("/onboarding")}
          className="cf-icon-tile bg-grad-brand text-white shadow-glow-brand"
          aria-label={t("plans.create_new_plan")}
        >
          <Plus size={22} strokeWidth={2.4} />
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12">
          <div
            className="cf-icon-tile bg-surface-2 border border-border mx-auto mb-4"
            style={{ width: 88, height: 88, borderRadius: 28 }}
          >
            <Sparkles className="w-10 h-10 text-muted" />
          </div>
          <h3 className="cf-h2 text-[18px] mb-2">{t("plans.no_plans.title")}</h3>
          <p className="cf-muted mb-6 text-sm">
            {t("plans.no_plans.description")}
          </p>
          <button
            className="cf-btn cf-btn-primary"
            onClick={() => router.push("/onboarding")}
          >
            <Plus size={18} />
            {t("plans.no_plans.create_first")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {plans.map((plan, idx) => {
            const focus = plan.payload?.days?.[0]?.focus;
            const grad = GRADS[idx % GRADS.length];
            return (
              // Envoltorio relativo: el botón de borrar es HERMANO del botón de la
              // tarjeta (no anidado, que sería HTML inválido).
              <div key={plan.id} className="relative">
                <button
                  onClick={() => {
                    // Usamos el plan ya cargado y avanzamos con push (jerarquía).
                    setSelectedPlan(plan);
                    router.push(`/plans?id=${plan.id}`);
                  }}
                  className="cf-card relative overflow-hidden text-left w-full"
                  style={{ padding: 18, borderRadius: 22 }}
                >
                  <div className="flex justify-between items-start mb-3.5">
                    <div className="flex gap-1.5">
                      <span className={`cf-chip cf-chip-${grad}`}>
                        {plan.weeks} {t("plan.weeks")}
                      </span>
                      <span className="cf-chip">
                        {plan.payload?.days?.length || 0} {t("plan.day")}s
                      </span>
                    </div>
                    {idx === 0 && (
                      <span className="cf-chip cf-chip-mint" style={{ marginRight: 34 }}>
                        <span
                          className="rounded-full"
                          style={{ width: 6, height: 6, background: "var(--mint)" }}
                        />
                        {t("plans.active", "Activo")}
                      </span>
                    )}
                  </div>
                  <div className="cf-h2 text-[18px]">{planTitle(plan, t)}</div>
                  <div className="cf-muted text-[12.5px] font-semibold mt-1.5">
                    {focus
                      ? t("plans.plan_details.focus", { focus })
                      : t("plans.plan_details.plan_duration", { weeks: plan.weeks })}
                  </div>
                  <div className="flex items-center gap-2 mt-3.5 cf-muted text-[12px] font-semibold">
                    <Dumbbell size={14} />
                    <span>
                      {plan.payload?.days?.reduce(
                        (a, d) => a + (d.blocks?.length || 0),
                        0
                      )}{" "}
                      {t("nav.exercises")}
                    </span>
                    <ChevronRight size={16} className="ml-auto text-faint" />
                  </div>
                </button>
                <button
                  onClick={() => {
                    setDeleteError(null);
                    setPlanToDelete(plan);
                  }}
                  className="cf-icon-tile bg-surface-2 border border-border absolute top-3 right-3"
                  style={{ width: 30, height: 30, color: "#ef4444" }}
                  aria-label={t("plans.delete.action", "Eliminar plan")}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {deleteModal}
    </div>
  );
}
