"use client";
import { Button } from "@/components/ui/button";
import { WorkoutSession } from "@/components/ui/workout-session";
import { supabaseClient } from "@/lib/supabase-client";
import { ArrowLeft, Clock, Target } from "lucide-react";
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
  useTranslation("common");
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
      // Si no hay planId, redirigir a planes
      router.replace("/plans");
      return;
    }

    // Cargar el plan
    fetchPlan(planId);
  }, [planId, router]);

  const fetchPlan = async (id: string) => {
    try {
      setLoading(true);
      const fetchedPlan = await supabaseClient.getPlanById(id);
      setPlan(fetchedPlan);

      // Si hay un día específico, seleccionarlo
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const goBackToPlans = () => {
    router.replace("/plans");
  };

  const goBackToPlanDetails = () => {
    router.replace(`/plans?id=${planId}`);
  };

  const startWorkout = (day: PlanDay) => {
    setSelectedDay(day);
    setIsInWorkout(true);
  };

  const completeWorkout = () => {
    setIsInWorkout(false);
    setSelectedDay(null);
    // Redirigir al historial después de completar
    router.replace("/workout-history");
  };

  const exitWorkout = () => {
    setIsInWorkout(false);
    setSelectedDay(null);
    // Volver a los detalles del plan
    goBackToPlanDetails();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted">Cargando plan de entrenamiento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-danger mb-4">Error: {error}</p>
          <Button onClick={() => fetchPlan(planId!)} variant="outline">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-muted mb-4">Plan no encontrado</p>
          <Button onClick={goBackToPlans} variant="outline">
            Volver a Planes
          </Button>
        </div>
      </div>
    );
  }

  // Si está en sesión de entrenamiento, mostrar la sesión
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

  // Vista de selección de día para entrenar
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-4 text-sm text-muted">
          <button
            onClick={goBackToPlans}
            className="hover:text-primary transition-colors"
          >
            Planes
          </button>
          <span>→</span>
          <button
            onClick={goBackToPlanDetails}
            className="hover:text-primary transition-colors"
          >
            Detalles del Plan
          </button>
          <span>→</span>
          <span className="text-primary">Sesión de Entrenamiento</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <Button onClick={goBackToPlanDetails} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Plan
          </Button>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-txt mb-2">
            Selecciona tu día de entrenamiento
          </h1>
          <p className="text-muted text-lg">
            Plan de {plan.weeks} semanas - Creado el{" "}
            {formatDate(plan.created_at)}
          </p>
        </div>
      </div>

      {/* Días disponibles */}
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plan.payload.days.map((day) => (
            <div
              key={day.day}
              className="bg-surface border border-border rounded-lg p-6 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => startWorkout(day)}
            >
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-primary">
                    {day.day}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-txt mb-2">
                  Día {day.day}
                </h3>
                <p className="text-sm text-muted">{day.focus}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center text-muted">
                  <Target className="w-4 h-4 mr-2" />
                  <span>{day.blocks.length} ejercicios</span>
                </div>
                <div className="flex items-center text-muted">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>
                    {day.blocks.reduce((total, block) => total + block.sets, 0)}{" "}
                    series total
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/50">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  onClick={() => startWorkout(day)}
                >
                  Iniciar Día {day.day}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
