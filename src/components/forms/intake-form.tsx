"use client";

import { EQUIPMENT_BY_CATEGORY } from "@/lib/constants/equipment";
import { useAuth } from "@/lib/auth/auth-context";
import { useRevenueCat } from "@/lib/revenuecat/revenuecat-context";
import { canGenerate } from "@/lib/config/plans-config";
import { countAiGenerations } from "@/lib/plans/ai-quota";
import { supabaseClient } from "@/lib/supabase-client";
import { isNetworkError } from "@/lib/local-cache";
import {
  IntakeSchema,
  type GeneratedPlan,
  type Intake,
} from "@/lib/validators/schemas";
import { GeneratingOverlay } from "@/components/ui/generating-overlay";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  Flame,
  Heart,
  HeartPulse,
  Move,
  Repeat,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface IntakeFormProps {
  onPlanGenerated: (planId: string, plan: GeneratedPlan) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
}

const OBJECTIVE_ICONS: Record<string, LucideIcon> = {
  fat_loss: Flame,
  muscle_gain: Dumbbell,
  body_recomposition: Repeat,
  strength: ShieldCheck,
  power: Zap,
  endurance: Activity,
  mobility: Move,
  rehabilitation: HeartPulse,
  sports_performance: Trophy,
  functional_fitness: Target,
  general_health: Heart,
};

const OBJECTIVES = Object.keys(OBJECTIVE_ICONS);
const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const GENDERS = ["male", "female", "other"] as const;

// Restricciones / lesiones que el usuario puede marcar. Se propagan a
// apiData.constraints para que el plan evite esos patrones de movimiento.
const CONSTRAINT_KEYS = ["jumps", "high_impact", "heavy_lifting"] as const;
type ConstraintKey = (typeof CONSTRAINT_KEYS)[number];

const TOTAL_STEPS = 6;

export function IntakeForm({
  onPlanGenerated,
  isGenerating,
  setIsGenerating,
}: IntakeFormProps) {
  const { t, i18n } = useTranslation("common");
  const { user } = useAuth();
  const { isPro, isNative, presentPaywall } = useRevenueCat();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Intake>>({
    objective: "general_health",
    level: "beginner",
    gender: "other",
    age: 25,
    weightKg: 70,
    heightCm: 170,
    equipment: {},
    constraints: {},
    stepsDay: 8000,
    weeks: 8,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Quien ya generó un plan no vuelve a rellenar todo: el cuestionario parte de
  // las respuestas de su plan más reciente (se guardan en payload.meta). Solo se
  // aplica si todavía no ha tocado nada, y funciona con la copia local sin red.
  const touchedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    supabaseClient
      .getPlans()
      .then((plans) => {
        if (cancelled || touchedRef.current || !Array.isArray(plans)) return;
        // El más reciente que tenga cuestionario: un plan hecho a mano no lo lleva.
        const latest = [...plans]
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
          .find((p) => p?.payload?.meta?.objective);
        const meta = latest?.payload?.meta;
        if (!meta) return;
        setFormData((prev) => ({
          ...prev,
          objective: meta.objective ?? prev.objective,
          level: meta.level ?? prev.level,
          gender: meta.gender ?? prev.gender,
          age: Number(meta.age) || prev.age,
          weightKg: Number(meta.weight_kg) || prev.weightKg,
          heightCm: Number(meta.height_cm) || prev.heightCm,
          stepsDay: Number(meta.steps_day) || prev.stepsDay,
          weeks: Number(latest.weeks) || prev.weeks,
          equipment:
            meta.equipment && typeof meta.equipment === "object" && !Array.isArray(meta.equipment)
              ? meta.equipment
              : prev.equipment,
          constraints:
            meta.constraints && typeof meta.constraints === "object"
              ? meta.constraints
              : prev.constraints,
        }));
      })
      .catch(() => {
        /* sin planes o sin red y sin copia: se queda con los valores por defecto */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (field: keyof Intake, value: Intake[keyof Intake]) => {
    touchedRef.current = true;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const toggleEquipment = (key: string) => {
    touchedRef.current = true;
    setFormData((prev) => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        [key]: !prev.equipment?.[key as keyof typeof prev.equipment],
      },
    }));
  };

  const toggleConstraint = (key: ConstraintKey) => {
    touchedRef.current = true;
    setFormData((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        [key]: !prev.constraints?.[key],
      },
    }));
  };

  const validateMeasures = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.age || formData.age < 16 || formData.age > 80)
      e.age = t("validation.age_range");
    if (!formData.weightKg || formData.weightKg < 30 || formData.weightKg > 200)
      e.weightKg = t("validation.weight_range");
    if (!formData.heightCm || formData.heightCm < 120 || formData.heightCm > 250)
      e.heightCm = t("validation.height_range");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Borrador: si el usuario sale del cuestionario (botón Atrás, cambio de
  // pestaña) y vuelve, encuentra sus respuestas y el paso donde iba.
  const draftKey = `cf-intake-draft:${user?.id ?? ""}`;
  // El borrador no se guarda hasta haber leído el anterior: si no, el primer
  // render lo pisaría con los valores por defecto.
  const [draftRead, setDraftRead] = useState(false);
  useEffect(() => {
    try {
      const draft = JSON.parse(window.sessionStorage.getItem(draftKey) || "null");
      if (draft?.formData) {
        touchedRef.current = true;
        setFormData((prev) => ({ ...prev, ...draft.formData }));
        setStep(Math.min(TOTAL_STEPS - 1, Math.max(0, Number(draft.step) || 0)));
      }
    } catch {
      /* sin borrador */
    }
    setDraftRead(true);
  }, [draftKey]);
  useEffect(() => {
    if (!draftRead || (!touchedRef.current && step === 0)) return;
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify({ formData, step }));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [draftKey, draftRead, formData, step]);

  // Botón Atrás del teléfono: retrocede un paso en vez de sacar al usuario del
  // cuestionario. Cada avance deja una entrada en el historial que el Atrás consume.
  const historyStepsRef = useRef(0);
  useEffect(() => {
    const onPop = () => {
      if (historyStepsRef.current === 0) return;
      historyStepsRef.current--;
      setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const next = () => {
    if (step === 2 && !validateMeasures()) return;
    if (step < TOTAL_STEPS - 1) {
      window.history.pushState(null, "", window.location.href);
      historyStepsRef.current++;
      setStep(step + 1);
    }
  };
  const back = () => {
    if (step === 0) return;
    if (historyStepsRef.current > 0) window.history.back();
    else setStep(step - 1);
  };

  // Cada generación cuesta dinero: un segundo toque mientras se comprueba el
  // límite o se genera no debe lanzar otra. El estado isGenerating llega tarde
  // (tras una petición de red), así que el bloqueo es un ref inmediato.
  const submittingRef = useRef(false);
  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      await submitPlan();
    } finally {
      submittingRef.current = false;
    }
  };

  const submitPlan = async () => {
    if (!validateMeasures()) {
      setStep(2);
      return;
    }

    // Validación Zod del intake completo antes de enviar (E-COD-7). No reemplaza
    // a validateMeasures (que enfoca el paso de medidas); aquí atrapamos cualquier
    // inconsistencia de forma amable sin romper el flujo.
    const intakeCandidate = {
      objective: formData.objective,
      level: formData.level,
      gender: formData.gender,
      age: formData.age,
      weightKg: formData.weightKg,
      heightCm: formData.heightCm,
      weeks: formData.weeks || 8,
      equipment: formData.equipment ?? {},
      constraints: formData.constraints ?? {},
      stepsDay: formData.stepsDay,
    };
    const parsed = IntakeSchema.safeParse(intakeCandidate);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setErrors({
        submit: t(
          "validation.intake_invalid",
          "Revisa tus datos: hay un campo fuera de rango."
        ),
        ...(first?.path?.length
          ? { [String(first.path[0])]: first.message }
          : {}),
      });
      return;
    }

    // GATING POR TIER — el plan Free permite 1 generación; Pro es ilimitado.
    // Pro se determina por el entitlement de RevenueCat. Para el free contamos
    // sus generaciones de IA, no sus planes: los hechos a mano no gastan cupo.
    // (La verdad última se valida en el servidor; esto evita gastar la llamada
    // a OpenAI y guía al usuario al paywall.)
    if (!isPro) {
      const used = await countAiGenerations();
      if (!canGenerate("free", used)) {
        if (isNative) {
          // En la app: mostramos el paywall de RevenueCat. Si compra, seguimos.
          const purchased = await presentPaywall();
          if (!purchased) return; // canceló: no generamos
        } else {
          // En web no hay compras: invitamos a usar la app móvil para mejorar.
          setErrors({
            submit: t(
              "paywall.limit_reached",
              "Ya usaste tu plan gratuito. Mejora a Pro desde la app móvil para generar planes ilimitados."
            ),
          });
          setStep(TOTAL_STEPS - 1);
          return;
        }
      }
    }

    setErrors({});
    setIsGenerating(true);
    try {
      const apiData = {
        weeks: formData.weeks || 8,
        objective: formData.objective,
        level: formData.level,
        gender: formData.gender,
        age: formData.age,
        weightKg: formData.weightKg,
        heightCm: formData.heightCm,
        equipment: formData.equipment,
        stepsDay: formData.stepsDay,
        // Idioma para que la IA escriba el focus y los cues en el idioma del usuario.
        language: i18n.language,
        // Restricciones reales marcadas por el usuario (B-AI-5).
        constraints: {
          jumps: !!formData.constraints?.jumps,
          high_impact: !!formData.constraints?.high_impact,
          heavy_lifting: !!formData.constraints?.heavy_lifting,
        },
      };

      const { generateFitnessPlan, generationRequestId, clearGenerationRequest } =
        await import("@/lib/ai/openai");
      // El id del plan es también el id de la generación: si la red falla y el
      // usuario reintenta con el mismo cuestionario, el servidor devuelve el plan
      // ya generado en vez de cobrar otro.
      const planId = generationRequestId(user?.id ?? "", apiData);
      const generatedPlan = await generateFitnessPlan(apiData, planId);

      if (!generatedPlan || !generatedPlan.days || !Array.isArray(generatedPlan.days)) {
        throw new Error("Plan structure is invalid - missing days array");
      }
      for (let i = 0; i < generatedPlan.days.length; i++) {
        const day = generatedPlan.days[i];
        if (!day.blocks || !Array.isArray(day.blocks)) {
          throw new Error(`Day ${i} is missing blocks array`);
        }
        for (let j = 0; j < day.blocks.length; j++) {
          const block = day.blocks[j];
          if (!block || typeof block.sets !== "number") {
            throw new Error(`Block ${j} in day ${i} has invalid sets property`);
          }
        }
      }

      // Plan y ejercicios se guardan juntos: o queda entero o no queda.
      await supabaseClient.savePlanStructure({
        id: planId,
        weeks: formData.weeks || 8,
        payload: {
          meta: {
            name: `Plan de ${formData.objective} - ${formData.level}`,
            description: `Plan personalizado de ${formData.weeks} semanas para ${formData.objective}`,
            objective: formData.objective,
            level: formData.level,
            gender: formData.gender,
            age: formData.age,
            weight_kg: formData.weightKg,
            height_cm: formData.heightCm,
            equipment: formData.equipment,
            steps_day: formData.stepsDay,
            constraints: apiData.constraints,
            created_at: new Date().toISOString(),
          },
          ...generatedPlan,
        },
      });

      clearGenerationRequest();
      try {
        window.sessionStorage.removeItem(draftKey);
      } catch {
        /* no-op */
      }

      onPlanGenerated(planId, generatedPlan);
    } catch (error) {
      // Backstop del servidor: el usuario free superó su límite (debería haberse
      // frenado antes, pero por si se saltó el gate del cliente lo llevamos al paywall).
      if (error instanceof Error && error.message === "FREE_LIMIT_REACHED") {
        if (isNative) {
          await presentPaywall();
        } else {
          setErrors({
            submit: t(
              "paywall.limit_reached",
              "Ya usaste tu plan gratuito. Mejora a Pro desde la app móvil para generar planes ilimitados."
            ),
          });
        }
        return;
      }
      console.error("💥 [INTAKE FORM] Error generating plan:", error);
      const code = error instanceof Error ? error.message : "";
      setErrors({
        submit:
          code === "GENERATION_NETWORK" || isNetworkError(error)
            ? t(
                "validation.submit_network",
                "No hay conexión estable. Tu plan no se pierde: vuelve a intentarlo y lo recuperamos sin generar otro."
              )
            : code === "PRO_LIMIT_REACHED"
              ? t(
                  "validation.submit_pro_limit",
                  "Has alcanzado el límite mensual de planes generados."
                )
              : t("validation.submit_error"),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const allEquipment = [
    ...EQUIPMENT_BY_CATEGORY.basic,
    ...EQUIPMENT_BY_CATEGORY.resistance,
    ...EQUIPMENT_BY_CATEGORY.weight,
    ...EQUIPMENT_BY_CATEGORY.specialized,
  ];

  const stepEyebrow = [
    t("onboarding.objective.label"),
    t("onboarding.level.label"),
    t("onboarding.personal.age"),
    t("onboarding.equipment.label"),
    t("onboarding.constraints.label", "Restricciones"),
    t("onboarding.weeks.label"),
  ][step];

  return (
    <div className="container mx-auto max-w-xl px-5 pt-2 pb-32">
      {/* progress header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={back}
          disabled={step === 0}
          className="cf-icon-tile bg-surface-2 border border-border"
          style={{ width: 40, height: 40, opacity: step === 0 ? 0.4 : 1 }}
          aria-label="Atrás"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="cf-bar-track">
            <div className="cf-bar-fill" style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>
        <span className="cf-muted text-[12px] font-bold">
          {step + 1}/{TOTAL_STEPS}
        </span>
      </div>

      <span className="cf-chip cf-chip-brand">
        <Sparkles size={12} fill="currentColor" />
        {t("onboarding.title", "Plan con IA")}
      </span>
      <div className="cf-h1 text-[26px] mt-3.5 mb-1.5">{stepEyebrow}</div>

      {/* STEP 0 · Objetivo */}
      {step === 0 && (
        <div className="flex flex-col gap-3 mt-5">
          {OBJECTIVES.map((obj) => {
            const Icon = OBJECTIVE_ICONS[obj];
            const on = formData.objective === obj;
            return (
              <button
                key={obj}
                onClick={() => set("objective", obj)}
                className="cf-card flex items-center gap-3.5 text-left"
                style={{
                  padding: "15px 16px",
                  borderRadius: 18,
                  border: on ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                  boxShadow: on ? "var(--glow-brand)" : "var(--shadow-card)",
                }}
              >
                <div
                  className="cf-icon-tile"
                  style={{
                    background: on ? "var(--grad-brand)" : "var(--surface-2)",
                    color: on ? "#fff" : "var(--muted)",
                  }}
                >
                  <Icon size={21} />
                </div>
                <div className="flex-1 font-bold text-[15px]">
                  {t(`onboarding.objective.${obj}`)}
                </div>
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 22,
                    height: 22,
                    border: on ? "none" : "2px solid var(--border-2)",
                    background: on ? "var(--grad-brand)" : "transparent",
                  }}
                >
                  {on && <Check size={13} color="#fff" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* STEP 1 · Nivel + género */}
      {step === 1 && (
        <div className="flex flex-col gap-4 mt-5">
          <div className="flex flex-col gap-3">
            {LEVELS.map((lvl) => {
              const on = formData.level === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => set("level", lvl)}
                  className="cf-card flex items-center gap-3.5 text-left"
                  style={{
                    padding: "15px 16px",
                    borderRadius: 18,
                    border: on ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                    boxShadow: on ? "var(--glow-brand)" : "var(--shadow-card)",
                  }}
                >
                  <div className="flex-1 font-bold text-[15px]">
                    {t(`onboarding.level.${lvl}`)}
                  </div>
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 22,
                      height: 22,
                      border: on ? "none" : "2px solid var(--border-2)",
                      background: on ? "var(--grad-brand)" : "transparent",
                    }}
                  >
                    {on && <Check size={13} color="#fff" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="cf-muted text-[12px] font-semibold mt-1">
            {t("onboarding.personal.gender")}
          </div>
          <div className="flex gap-2" style={{ background: "var(--surface-2)", padding: 5, borderRadius: 14 }}>
            {GENDERS.map((g) => {
              const on = formData.gender === g;
              return (
                <button
                  key={g}
                  onClick={() => set("gender", g)}
                  className="flex-1 font-semibold text-[13px]"
                  style={{
                    padding: "10px 0",
                    borderRadius: 10,
                    background: on ? "var(--grad-brand)" : "transparent",
                    color: on ? "#fff" : "var(--muted)",
                    boxShadow: on ? "var(--glow-brand)" : "none",
                  }}
                >
                  {t(`onboarding.personal.gender_${g}`)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2 · Medidas */}
      {step === 2 && (
        <div className="flex flex-col gap-3 mt-5">
          {([
            ["age", t("onboarding.personal.age"), "16", "80", "1"],
            ["weightKg", t("onboarding.personal.weight"), "30", "200", "0.1"],
            ["heightCm", t("onboarding.personal.height"), "120", "250", "1"],
          ] as const).map(([field, label, min, max, stepv]) => (
            <div key={field} className="cf-card" style={{ padding: 16, borderRadius: 18 }}>
              <div className="cf-muted text-[12px] font-semibold mb-2">{label}</div>
              <input
                type="number"
                inputMode="decimal"
                value={(formData[field] as number) ?? ""}
                min={min}
                max={max}
                step={stepv}
                onChange={(e) =>
                  set(field, field === "weightKg" ? parseFloat(e.target.value) : parseInt(e.target.value))
                }
                className="cf-num bg-transparent outline-none w-full"
                style={{ fontSize: 28, color: "var(--txt)" }}
              />
              {errors[field] && <p className="text-danger text-xs mt-1">{errors[field]}</p>}
            </div>
          ))}
        </div>
      )}

      {/* STEP 3 · Equipo */}
      {step === 3 && (
        <div className="flex flex-wrap gap-2 mt-5">
          {allEquipment.map(({ key, label }) => {
            const on = !!formData.equipment?.[key as keyof typeof formData.equipment];
            return (
              <button
                key={key}
                onClick={() => toggleEquipment(key)}
                className={`cf-chip ${on ? "cf-chip-brand" : ""}`}
                style={{ padding: "10px 14px", fontSize: 13 }}
              >
                {on && <Check size={13} strokeWidth={3} />}
                {t(`equipment.${key}`, label)}
              </button>
            );
          })}
        </div>
      )}

      {/* STEP 4 · Restricciones / lesiones (B-AI-5) */}
      {step === 4 && (
        <div className="flex flex-col gap-3 mt-5">
          <p className="cf-muted text-[13px] mb-1">
            {t(
              "onboarding.constraints.help",
              "Marca lo que debamos evitar por lesiones o molestias. Lo dejaremos fuera de tu plan."
            )}
          </p>
          {CONSTRAINT_KEYS.map((key) => {
            const on = !!formData.constraints?.[key];
            return (
              <button
                key={key}
                onClick={() => toggleConstraint(key)}
                className="cf-card flex items-center gap-3.5 text-left"
                style={{
                  padding: "15px 16px",
                  borderRadius: 18,
                  border: on
                    ? "1.5px solid var(--primary)"
                    : "1px solid var(--border)",
                  boxShadow: on ? "var(--glow-brand)" : "var(--shadow-card)",
                }}
              >
                <div
                  className="cf-icon-tile"
                  style={{
                    background: on ? "var(--grad-brand)" : "var(--surface-2)",
                    color: on ? "#fff" : "var(--muted)",
                  }}
                >
                  <ShieldAlert size={21} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-[15px]">
                    {t(`onboarding.constraints.${key}`, key)}
                  </div>
                  <div className="cf-muted text-[12px]">
                    {t(`onboarding.constraints.${key}_desc`, "")}
                  </div>
                </div>
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 22,
                    height: 22,
                    border: on ? "none" : "2px solid var(--border-2)",
                    background: on ? "var(--grad-brand)" : "transparent",
                  }}
                >
                  {on && <Check size={13} color="#fff" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* STEP 5 · Duración + pasos */}
      {step === 5 && (
        <div className="flex flex-col gap-4 mt-5">
          <div className="cf-card" style={{ padding: 16, borderRadius: 18 }}>
            <div className="cf-muted text-[12px] font-semibold mb-3">
              {t("onboarding.weeks.label")}
            </div>
            <div className="flex gap-2">
              {[6, 8, 10, 12].map((w) => {
                const on = (formData.weeks || 8) === w;
                return (
                  <button
                    key={w}
                    onClick={() => set("weeks", w)}
                    className="flex-1 cf-num font-bold flex flex-col items-center leading-none"
                    style={{
                      padding: "10px 0",
                      borderRadius: 12,
                      background: on ? "var(--grad-brand)" : "var(--surface-2)",
                      color: on ? "#fff" : "var(--muted)",
                      boxShadow: on ? "var(--glow-brand)" : "none",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{w}</span>
                    <span className="font-semibold" style={{ fontSize: 10, marginTop: 3, opacity: 0.85 }}>
                      {t("onboarding.weeks.unit", "semanas")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cf-card" style={{ padding: 16, borderRadius: 18 }}>
            <div className="cf-muted text-[12px] font-semibold mb-2">
              {t("onboarding.steps.label")}
            </div>
            <input
              type="number"
              inputMode="numeric"
              value={formData.stepsDay ?? ""}
              min="1000"
              max="20000"
              step="1000"
              onChange={(e) => set("stepsDay", parseInt(e.target.value))}
              className="cf-num bg-transparent outline-none w-full"
              style={{ fontSize: 28, color: "var(--txt)" }}
            />
          </div>

          {errors.submit && !isGenerating && (
            <div
              className="cf-card flex flex-col items-center gap-3 text-center"
              style={{
                padding: 18,
                borderRadius: 18,
                border: "1.5px solid var(--danger)",
              }}
            >
              <ShieldAlert size={26} className="text-danger" />
              <p className="text-danger text-sm font-semibold">{errors.submit}</p>
              <button
                className="cf-btn cf-btn-ghost"
                onClick={handleSubmit}
                style={{ gap: 8 }}
              >
                <RotateCcw size={16} />
                {t("onboarding.retry", "Reintentar")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Espera de la generación */}
      {isGenerating && <GeneratingOverlay />}

      {/* sticky CTA — en móvil se eleva por encima del bottom-nav (z-1000, ~64px);
          en escritorio el nav está oculto y se ancla abajo. */}
      <div className="fixed left-0 right-0 lg:left-60 bottom-[calc(76px+var(--sab))] lg:bottom-0 z-40 px-5 pt-3 pb-4 lg:pb-6"
        style={{ background: "linear-gradient(to top, var(--bg) 70%, transparent)" }}>
        <div className="container mx-auto max-w-xl px-0">
          {step < TOTAL_STEPS - 1 ? (
            <button className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg" onClick={next}>
              {t("onboarding.continue", "Continuar")}
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg"
              onClick={handleSubmit}
              disabled={isGenerating}
              style={{ opacity: isGenerating ? 0.7 : 1 }}
            >
              <Sparkles size={18} fill="currentColor" />
              {isGenerating ? t("onboarding.generating") : t("onboarding.submit")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
