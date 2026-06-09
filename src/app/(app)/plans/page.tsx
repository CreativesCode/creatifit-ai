"use client";
import { PageLoader } from "@/components/ui/loader";
import { supabaseClient } from "@/lib/supabase-client";

import {
  ArrowLeft,
  ChevronRight,
  Dumbbell,
  Edit,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface ExerciseBlock {
  name: string;
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
  };
}

export default function PlansPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const planId = searchParams.get("id");

  useEffect(() => {
    if (planId) {
      fetchPlan(planId);
    } else {
      fetchPlans();
      setSelectedPlan(null);
    }
  }, [planId]);

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
    new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const goBackToList = () => {
    router.replace("/plans");
    setSelectedPlan(null);
  };

  // ---------- Loading ----------
  if (loading) {
    return (
      <PageLoader />
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
      <div className="container mx-auto max-w-xl lg:max-w-3xl px-5 lg:px-8 pt-4 lg:pt-8">
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
            className="cf-icon-tile bg-surface-2 border border-border"
            style={{ width: 40, height: 40 }}
            aria-label={t("plans.plan_details.edit")}
          >
            <Edit size={18} />
          </button>
        </div>

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
            <div className="cf-h1 text-[24px] mt-3">
              {t("plans.plan_details.plan_duration", {
                weeks: selectedPlan.weeks,
              })}
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
            {t("session.select_day", "Días de entrenamiento")}
          </span>
          <span className="cf-muted text-[12px] font-semibold">
            {days.map((d) => d.day).join(" → ")}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2">
          {days.map((d, i) => (
            <button
              key={i}
              onClick={() =>
                router.push(`/session?planId=${selectedPlan.id}`)
              }
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

        <div className="mt-5 pb-2">
          <button
            className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg"
            onClick={() => router.replace(`/session?planId=${selectedPlan.id}`)}
          >
            <Play size={17} fill="currentColor" />
            {t("plans.plan_details.start_session")}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Plans list ----------
  const GRADS = ["brand", "cyan", "mint"] as const;
  return (
    <div className="container mx-auto max-w-xl lg:max-w-6xl px-5 lg:px-8 pt-4 lg:pt-8">
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
              <button
                key={plan.id}
                onClick={() => {
                  router.replace(`/plans?id=${plan.id}`);
                  setSelectedPlan(plan);
                }}
                className="cf-card relative overflow-hidden text-left"
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
                    <span className="cf-chip cf-chip-mint">
                      <span
                        className="rounded-full"
                        style={{ width: 6, height: 6, background: "var(--mint)" }}
                      />
                      {t("plans.active", "Activo")}
                    </span>
                  )}
                </div>
                <div className="cf-h2 text-[18px]">
                  {t("plans.plan_details.plan_duration", { weeks: plan.weeks })}
                </div>
                <div className="cf-muted text-[12.5px] font-semibold mt-1.5">
                  {focus
                    ? t("plans.plan_details.focus", { focus })
                    : t("plan.ai_generated", "Generado por IA")}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
