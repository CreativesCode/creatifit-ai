"use client";
import { PageLoader } from "@/components/ui/loader";
import { WorkoutSession } from "@/components/ui/workout-session";
import { supabaseClient } from "@/lib/supabase-client";
import { ArrowLeft, ChevronRight, Clock, Dumbbell } from "lucide-react";
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

export default function SessionPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selectedDay, setSelectedDay] = useState<PlanDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInWorkout, setIsInWorkout] = useState(false);

  const planId = searchParams.get("planId");
  const dayId = searchParams.get("day");

  useEffect(() => {
    if (!planId) {
      router.replace("/plans");
      return;
    }
    fetchPlan(planId);
  }, [planId, router]);

  const fetchPlan = async (id: string) => {
    try {
      setLoading(true);
      const fetchedPlan = await supabaseClient.getPlanById(id);
      setPlan(fetchedPlan);
      if (dayId && fetchedPlan) {
        const day = fetchedPlan.payload.days.find(
          (d: { day: string }) => d.day === dayId
        );
        if (day) {
          setSelectedDay(day);
          setIsInWorkout(true);
        }
      }
    } catch (err) {
      console.error("Error fetching plan:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const goBackToPlanDetails = () => router.replace(`/plans?id=${planId}`);

  const startWorkout = (day: PlanDay) => {
    setSelectedDay(day);
    setIsInWorkout(true);
  };

  const completeWorkout = () => {
    setIsInWorkout(false);
    setSelectedDay(null);
    router.replace("/workout-history");
  };

  const exitWorkout = () => {
    setIsInWorkout(false);
    setSelectedDay(null);
    goBackToPlanDetails();
  };

  if (loading) {
    return (
      <PageLoader />
    );
  }

  if (error || !plan) {
    return (
      <div className="container mx-auto max-w-xl px-5 py-10 text-center">
        <p className="text-danger mb-4">
          {error ? `Error: ${error}` : t("plans.no_plans.title", "Plan no encontrado")}
        </p>
        <button className="cf-btn cf-btn-ghost" onClick={() => router.replace("/plans")}>
          {t("plans.plan_details.back_to_plans", "Volver a Planes")}
        </button>
      </div>
    );
  }

  // Sesión activa
  if (isInWorkout && selectedDay) {
    return (
      <WorkoutSession
        planDay={selectedDay}
        planId={plan.id}
        onComplete={completeWorkout}
        onExit={exitWorkout}
      />
    );
  }

  // Selección de día
  return (
    <div className="container mx-auto max-w-xl lg:max-w-4xl px-5 lg:px-8 pt-4 lg:pt-8">
      <div className="flex items-center gap-3 pt-1 mb-5">
        <button
          onClick={goBackToPlanDetails}
          className="cf-icon-tile bg-surface-2 border border-border"
          style={{ width: 40, height: 40 }}
          aria-label={t("plans.plan_details.back_to_plans", "Volver")}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="cf-eyebrow">{t("session.title", "Sesión")}</div>
          <div className="cf-h1 text-[22px] mt-1">
            {t("session.select_day", "Selecciona tu día")}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:grid sm:grid-cols-2">
        {plan.payload.days.map((day) => {
          const sets = day.blocks.reduce((total, b) => total + b.sets, 0);
          return (
            <button
              key={day.day}
              onClick={() => startWorkout(day)}
              className="cf-card flex items-center gap-3.5 text-left"
              style={{ padding: "14px 15px", borderRadius: 18 }}
            >
              <div
                className="cf-icon-tile bg-grad-brand text-white font-display font-bold text-[18px]"
                style={{ width: 46, height: 46, borderRadius: 14 }}
              >
                {day.day}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15.5px]">
                  {t("plan.day")} {day.day} · {day.focus}
                </div>
                <div className="flex items-center gap-3 cf-muted text-[12px] font-semibold mt-1">
                  <span className="flex items-center gap-1">
                    <Dumbbell size={13} />
                    {day.blocks.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} />
                    {sets} series
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-faint" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
