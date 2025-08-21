"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabaseClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface DashboardStats {
  totalPlans: number;
  totalSessions: number;
  totalExercises: number;
  recentPlans: Array<{
    id: string;
    name: string;
    weeks: number;
    days: number;
    created_at: string;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalPlans: 0,
    totalSessions: 0,
    totalExercises: 0,
    recentPlans: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log("🚀 [DASHBOARD] Starting data fetch...");

        // Obtener estadísticas básicas usando Supabase directo
        const [plansData, exercisesData] = await Promise.all([
          supabaseClient.getPlans(),
          supabaseClient.getExercises(1, 1),
        ]);

        console.log("📊 [DASHBOARD] Fetched data:", {
          plansData,
          exercisesData,
          plansCount: plansData?.length || 0,
          exercisesCount: exercisesData?.count || 0,
        });

        setStats((prev) => ({
          ...prev,
          totalPlans: plansData?.length || 0,
          recentPlans: plansData?.slice(0, 3) || [],
          totalExercises: exercisesData?.count || 0,
        }));
      } catch (error) {
        console.error("💥 [DASHBOARD] Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const quickActions = [
    {
      title: "Crear Nuevo Plan",
      description: "Genera un plan personalizado con IA",
      icon: "🏋️‍♂️",
      action: () => router.push("/onboarding"),
      color: "bg-primary hover:bg-primary/90",
    },
    {
      title: "Ver Mis Planes",
      description: "Revisa tus planes de entrenamiento",
      icon: "📋",
      action: () => router.push("/plans"),
      color: "bg-accent hover:bg-accent/90",
    },
    {
      title: "Biblioteca de Ejercicios",
      description: "Explora ejercicios disponibles",
      icon: "💪",
      action: () => router.push("/exercises"),
      color: "bg-secondary hover:bg-secondary/90",
    },
    {
      title: "Historial de Entrenamientos",
      description: "Revisa tus sesiones completadas",
      icon: "📊",
      action: () => router.push("/workout-history"),
      color: "bg-green-600 hover:bg-green-700",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg via-surface to-bg">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted">Cargando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg via-surface to-bg">
      <div className="container mx-auto px-4 sm:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-txt mb-3 md:mb-4">
            🏋️‍♂️ Dashboard de CreatiFit AI
          </h1>
          <p className="text-lg md:text-xl text-muted px-2">
            Tu centro de control para el fitness personalizado
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          <Card className="p-4 md:p-6 text-center bg-surface border-border">
            <div className="text-2xl md:text-3xl font-bold text-primary mb-2">
              {stats.totalPlans}
            </div>
            <div className="text-sm md:text-base text-muted">
              Planes Creados
            </div>
          </Card>
          <Card className="p-4 md:p-6 text-center bg-surface border-border">
            <div className="text-2xl md:text-3xl font-bold text-accent mb-2">
              {stats.totalSessions}
            </div>
            <div className="text-sm md:text-base text-muted">
              Sesiones Completadas
            </div>
          </Card>
          <Card className="p-4 md:p-6 text-center bg-surface border-border">
            <div className="text-2xl md:text-3xl font-bold text-secondary mb-2">
              {stats.totalExercises}
            </div>
            <div className="text-sm md:text-base text-muted">
              Ejercicios Disponibles
            </div>
          </Card>
        </div>

        {/* Acciones Rápidas */}
        <div className="mb-8 md:mb-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-txt mb-4 md:mb-6 text-center">
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                className="p-4 md:p-6 bg-surface border-border hover:shadow-lg transition-shadow cursor-pointer"
                onClick={action.action}
              >
                <div className="text-center">
                  <div className="text-3xl md:text-4xl mb-3 md:mb-4">
                    {action.icon}
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-txt mb-2">
                    {action.title}
                  </h3>
                  <p className="text-xs md:text-sm text-muted px-1">
                    {action.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Planes Recientes */}
        {stats.recentPlans.length > 0 && (
          <div className="mb-8 md:mb-12">
            <h2 className="text-xl sm:text-2xl font-semibold text-txt mb-4 md:mb-6 text-center">
              Planes Recientes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {stats.recentPlans.map((plan) => (
                <Card
                  key={plan.id}
                  className="p-4 md:p-6 bg-surface border-border hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/plans?id=${plan.id}`)}
                >
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <Badge variant="outline" className="text-xs">
                      {plan.weeks} semanas
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {plan.days} días
                    </Badge>
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-txt mb-2">
                    Plan {plan.name || plan.id.slice(-8)}
                  </h3>
                  <p className="text-xs md:text-sm text-muted">
                    Creado: {new Date(plan.created_at).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
            <div className="text-center mt-4 md:mt-6">
              <Button
                variant="outline"
                onClick={() => router.push("/plans")}
                className="px-6 md:px-8 w-full sm:w-auto"
              >
                Ver Todos los Planes
              </Button>
            </div>
          </div>
        )}

        {/* Mensaje de Bienvenida para Usuarios Nuevos */}
        {stats.totalPlans === 0 && (
          <Card className="p-6 md:p-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <div className="text-center">
              <div className="text-4xl md:text-6xl mb-3 md:mb-4">🎯</div>
              <h3 className="text-xl md:text-2xl font-semibold text-txt mb-3 md:mb-4">
                ¡Bienvenido a CreatiFit AI!
              </h3>
              <p className="text-sm md:text-base text-muted mb-4 md:mb-6 max-w-2xl mx-auto px-2">
                Comienza tu viaje de fitness creando tu primer plan de
                entrenamiento personalizado. Nuestra IA analizará tus objetivos,
                nivel y preferencias para crear el plan perfecto para ti.
              </p>
              <Button
                onClick={() => router.push("/onboarding")}
                className="bg-primary hover:bg-primary/90 text-white px-6 md:px-8 py-3 text-base md:text-lg w-full sm:w-auto"
                size="lg"
              >
                🚀 Crear Mi Primer Plan
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
