"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanDisplay } from "@/components/ui/plan-display";
import { supabaseClient } from "@/lib/supabase-client";

import { ArrowLeft, Calendar, Clock, Edit, Play, Target } from "lucide-react";
import Link from "next/link";
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
  // Ya no necesitamos estos estados cuando usamos la ruta /session
  // const [isInWorkout, setIsInWorkout] = useState(false);
  // const [selectedDay, setSelectedDay] = useState<PlanDay | null>(null);

  const planId = searchParams.get("id");

  useEffect(() => {
    if (planId) {
      // Si hay un ID en la URL, cargar el plan específico
      fetchPlan(planId);
    } else {
      // Si no hay ID, cargar la lista de planes
      fetchPlans();
      // Limpiar el plan seleccionado cuando volvemos al listado
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const goBackToList = () => {
    // Usar replace para no agregar entradas al historial
    router.replace("/plans");
    setSelectedPlan(null);
  };

  // Estas funciones ya no son necesarias cuando usamos la ruta /session
  // const startWorkout = (day: PlanDay) => {
  //   setSelectedDay(day);
  //   setIsInWorkout(true);
  // };

  // const completeWorkout = () => {
  //   setIsInWorkout(false);
  //   setSelectedDay(null);
  // };

  // const exitWorkout = () => {
  //   setIsInWorkout(false);
  //   setSelectedDay(null);
  // };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted">
            {planId ? t("plans.loading.plan") : t("plans.loading.plans")}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-danger mb-4">Error: {error}</p>
          <Button
            onClick={planId ? () => fetchPlan(planId!) : fetchPlans}
            variant="outline"
          >
            {t("plans.retry")}
          </Button>
        </div>
      </div>
    );
  }

  // Ya no necesitamos esta lógica cuando usamos la ruta /session
  // if (isInWorkout && selectedDay) {
  //   return (
  //     <WorkoutSession
  //       planDay={selectedDay}
  //       planId={selectedPlan!.id}
  //       onComplete={completeWorkout}
  //       onExit={exitWorkout}
  //     />
  //   );
  // }

  // Si hay un plan seleccionado, mostrar el detalle
  if (selectedPlan) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-4 text-sm text-muted">
            <button
              onClick={goBackToList}
              className="hover:text-primary transition-colors"
            >
              {t("nav.plans")}
            </button>
            <span>→</span>
            <span className="text-primary">
              {t("plans.plan_details.title")}
            </span>
          </div>

          <div className="flex items-center justify-between mb-6">
            <Button onClick={goBackToList} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("plans.plan_details.back_to_plans")}
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                {t("plans.plan_details.edit")}
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={() =>
                  router.replace(`/session?planId=${selectedPlan.id}`)
                }
              >
                <Play className="w-4 h-4 mr-2" />
                {t("plans.plan_details.start_session")}
              </Button>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-txt mb-2">
              {t("plans.plan_details.plan_duration", {
                weeks: selectedPlan.weeks,
              })}
            </h1>
            <p className="text-muted text-lg">
              {t("plans.plan_details.created_on", {
                date: formatDate(selectedPlan.created_at),
              })}
            </p>
          </div>
        </div>

        {/* Usar el componente PlanDisplay que incluye las imágenes */}
        <PlanDisplay
          plan={{
            weeks: selectedPlan.weeks,
            days: selectedPlan.payload.days,
          }}
          planId={selectedPlan.id}
          useRouter={true}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Calendar className="w-6 h-6 text-primary" />
          <span className="text-sm text-muted">{t("nav.plans")}</span>
        </div>
        <h1 className="text-3xl font-bold text-txt mb-2">{t("plans.title")}</h1>
        <p className="text-muted text-lg">{t("plans.subtitle")}</p>
      </div>

      {/* Create New Plan Button */}
      <div className="text-center mb-8">
        <Link href="/dashboard">
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-glow px-8 py-3 text-lg">
            {t("plans.create_new_plan")}
          </Button>
        </Link>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-surface border border-border rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-12 h-12 text-muted" />
          </div>
          <h3 className="text-xl font-semibold text-txt mb-2">
            {t("plans.no_plans.title")}
          </h3>
          <p className="text-muted mb-6">{t("plans.no_plans.description")}</p>
          <Link href="/dashboard">
            <Button className="bg-primary hover:bg-primary/90 text-white">
              {t("plans.no_plans.create_first")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            return (
              <Card
                key={plan.id}
                className="hover:shadow-soft transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-txt">
                      {t("plans.plan_details.plan_duration", {
                        weeks: plan.weeks,
                      })}
                    </CardTitle>
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {plan.weeks}
                    </div>
                  </div>
                  <CardDescription className="text-muted">
                    {t("plans.plan_details.created_on", {
                      date: formatDate(plan.created_at),
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-muted">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>
                        {t("plans.plan_details.training_days", {
                          count: plan.payload.days.length,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-muted">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>
                        {t("plans.plan_details.duration", {
                          weeks: plan.weeks,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-muted">
                      <Target className="w-4 h-4 mr-2" />
                      <span>
                        {t("plans.plan_details.focus", {
                          focus: plan.payload.days[0]?.focus,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border">
                    <Button
                      onClick={() => {
                        // Navegación SPA fluida
                        router.replace(`/plans?id=${plan.id}`);
                        setSelectedPlan(plan); // Establecer el plan inmediatamente
                      }}
                      className="w-full"
                      variant="outline"
                    >
                      {t("plans.plan_details.view_details")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
