"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WorkoutSession } from "@/components/ui/workout-session";
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
  useTranslation("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInWorkout, setIsInWorkout] = useState(false);
  const [selectedDay, setSelectedDay] = useState<PlanDay | null>(null);

  const planId = searchParams.get("id");

  useEffect(() => {
    if (planId) {
      // Si hay un ID en la URL, cargar el plan específico
      fetchPlan(planId);
    } else {
      // Si no hay ID, cargar la lista de planes
      fetchPlans();
    }
  }, [planId]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/plans");

      if (!response.ok) {
        throw new Error("Failed to fetch plans");
      }

      const data = await response.json();
      setPlans(data.plans || []);
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
      const response = await fetch(`/api/plans/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch plan");
      }

      const data = await response.json();
      setSelectedPlan(data.plan);
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
    router.push("/plans");
    setSelectedPlan(null);
  };

  const startWorkout = (day: PlanDay) => {
    setSelectedDay(day);
    setIsInWorkout(true);
  };

  const completeWorkout = () => {
    setIsInWorkout(false);
    setSelectedDay(null);
  };

  const exitWorkout = () => {
    setIsInWorkout(false);
    setSelectedDay(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted">Cargando planes...</p>
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
            Reintentar
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
        onComplete={completeWorkout}
        onExit={exitWorkout}
      />
    );
  }

  // Si hay un plan seleccionado, mostrar el detalle
  if (selectedPlan) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Button onClick={goBackToList} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Planes
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <Play className="w-4 h-4 mr-2" />
                Iniciar Sesión
              </Button>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-txt mb-2">
              Plan de {selectedPlan.weeks} semanas
            </h1>
            <p className="text-muted text-lg">
              Creado el {formatDate(selectedPlan.created_at)}
            </p>
          </div>
        </div>

        {/* Plan Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Resumen del Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <p className="text-2xl font-bold text-txt">
                  {selectedPlan.weeks}
                </p>
                <p className="text-muted">Semanas</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-8 h-8 text-accent" />
                </div>
                <p className="text-2xl font-bold text-txt">
                  {selectedPlan.payload.days.length}
                </p>
                <p className="text-muted">Días de entrenamiento</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Target className="w-8 h-8 text-secondary" />
                </div>
                <p className="text-2xl font-bold text-txt">
                  {selectedPlan.payload.days.reduce(
                    (total, day) => total + day.blocks.length,
                    0
                  )}
                </p>
                <p className="text-muted">Ejercicios totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Schedule */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Horario Semanal</CardTitle>
            <CardDescription>
              Repite este ciclo durante {selectedPlan.weeks} semanas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                <div key={day} className="text-center">
                  <div className="text-sm font-medium text-muted mb-1">
                    {day}
                  </div>
                  <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-bold mx-auto">
                    {day === "Lun"
                      ? "A"
                      : day === "Mié"
                      ? "B"
                      : day === "Vie"
                      ? "C"
                      : day === "Dom"
                      ? "D"
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center text-sm text-muted">
              <p>Semana 1-{selectedPlan.weeks}: A → B → C → D (repetir)</p>
            </div>
          </CardContent>
        </Card>

        {/* Training Days - Now in Rows */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-txt text-center mb-6">
            Días de Entrenamiento
          </h2>

          {selectedPlan.payload.days.map((day, dayIndex) => (
            <Card
              key={dayIndex}
              className="border-2 border-border hover:border-primary/50 transition-colors"
            >
              <CardHeader className="bg-surface/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {day.day}
                    </div>
                    <div>
                      <CardTitle className="text-xl text-txt">
                        {day.focus}
                      </CardTitle>
                      <CardDescription>
                        {day.blocks.length} ejercicios •{" "}
                        {day.blocks.reduce(
                          (total, block) => total + block.sets,
                          0
                        )}{" "}
                        series totales
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startWorkout(day)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar Día {day.day}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="space-y-4">
                  {day.blocks.map((block, blockIndex) => (
                    <div
                      key={blockIndex}
                      className="bg-bg/50 rounded-lg p-4 border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-txt text-lg mb-2">
                            {block.name}
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-primary font-bold text-sm">
                                  {block.sets}
                                </span>
                              </div>
                              <span className="text-sm text-muted">Series</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                                <span className="text-accent font-bold text-sm">
                                  {block.reps[0]}-{block.reps[1]}
                                </span>
                              </div>
                              <span className="text-sm text-muted">
                                Repeticiones
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                                <span className="text-secondary font-bold text-sm">
                                  {block.rest_sec}s
                                </span>
                              </div>
                              <span className="text-sm text-muted">
                                Descanso
                              </span>
                            </div>
                          </div>

                          {block.cues && block.cues.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm text-accent font-medium mb-2">
                                Puntos clave:
                              </p>
                              <ul className="space-y-1">
                                {block.cues.map((cue, cueIndex) => (
                                  <li
                                    key={cueIndex}
                                    className="flex items-start text-sm text-muted"
                                  >
                                    <span className="text-accent mr-2">•</span>
                                    {cue}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <Button
            onClick={goBackToList}
            variant="outline"
            className="px-8 py-3 text-lg"
            size="lg"
          >
            Volver a Planes
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white shadow-glow px-8 py-3 text-lg"
            size="lg"
          >
            Iniciar Primera Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-txt mb-2">
          Mis Planes de Entrenamiento
        </h1>
        <p className="text-muted text-lg">
          Gestiona y revisa todos tus planes generados por IA
        </p>
      </div>

      {/* Create New Plan Button */}
      <div className="text-center mb-8">
        <Link href="/dashboard">
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-glow px-8 py-3 text-lg">
            Crear Nuevo Plan
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
            No tienes planes aún
          </h3>
          <p className="text-muted mb-6">
            Crea tu primer plan de entrenamiento personalizado con IA
          </p>
          <Link href="/dashboard">
            <Button className="bg-primary hover:bg-primary/90 text-white">
              Crear Mi Primer Plan
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-soft transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-txt">
                    Plan de {plan.weeks} semanas
                  </CardTitle>
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {plan.weeks}
                  </div>
                </div>
                <CardDescription className="text-muted">
                  Creado el {formatDate(plan.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-muted">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      {plan.payload.days.length} días de entrenamiento
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Duración: {plan.weeks} semanas</span>
                  </div>
                  <div className="flex items-center text-sm text-muted">
                    <Target className="w-4 h-4 mr-2" />
                    <span>Enfoque: {plan.payload.days[0]?.focus}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <Button
                    onClick={() => router.push(`/plans?id=${plan.id}`)}
                    className="w-full"
                    variant="outline"
                  >
                    Ver Detalles
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
