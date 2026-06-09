"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabaseClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("common");
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
      title: t("dashboard.quick_actions.create_new_plan.title"),
      description: t("dashboard.quick_actions.create_new_plan.description"),
      icon: "🏋️‍♂️",
      action: () => router.push("/onboarding"),
      color: "bg-primary hover:bg-primary/90",
    },
    {
      title: t("dashboard.quick_actions.view_plans.title"),
      description: t("dashboard.quick_actions.view_plans.description"),
      icon: "📋",
      action: () => router.push("/plans"),
      color: "bg-accent hover:bg-accent/90",
    },
    {
      title: t("dashboard.quick_actions.exercise_library.title"),
      description: t("dashboard.quick_actions.exercise_library.description"),
      icon: "💪",
      action: () => router.push("/exercises"),
      color: "bg-secondary hover:bg-secondary/90",
    },
    {
      title: t("dashboard.quick_actions.workout_history.title"),
      description: t("dashboard.quick_actions.workout_history.description"),
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
            <p className="mt-4 text-muted">{t("dashboard.loading")}</p>
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
            {t("dashboard.title")}
          </h1>
          <p className="text-lg md:text-xl text-muted px-2">
            {t("dashboard.subtitle")}
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          <Card className="p-4 md:p-6 text-center bg-surface border-border">
            <div className="text-2xl md:text-3xl font-bold text-primary mb-2">
              {stats.totalPlans}
            </div>
            <div className="text-sm md:text-base text-muted">
              {t("dashboard.stats.plans_created")}
            </div>
          </Card>
          <Card className="p-4 md:p-6 text-center bg-surface border-border">
            <div className="text-2xl md:text-3xl font-bold text-accent mb-2">
              {stats.totalSessions}
            </div>
            <div className="text-sm md:text-base text-muted">
              {t("dashboard.stats.sessions_completed")}
            </div>
          </Card>
          <Card className="p-4 md:p-6 text-center bg-surface border-border">
            <div className="text-2xl md:text-3xl font-bold text-secondary mb-2">
              {stats.totalExercises}
            </div>
            <div className="text-sm md:text-base text-muted">
              {t("dashboard.stats.exercises_available")}
            </div>
          </Card>
        </div>

        {/* Acciones Rápidas */}
        <div className="mb-8 md:mb-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-txt mb-4 md:mb-6 text-center">
            {t("dashboard.quick_actions.title")}
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
              {t("dashboard.recent_plans.title")}
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
                      {plan.weeks} {t("plan.weeks")}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {plan.days} {t("plan.day")}s
                    </Badge>
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-txt mb-2">
                    {t("plan.title")} {plan.name || plan.id.slice(-8)}
                  </h3>
                  <p className="text-xs md:text-sm text-muted">
                    {t("plans.plan_details.created_on", { date: new Date(plan.created_at).toLocaleDateString() })}
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
                {t("dashboard.recent_plans.view_all_plans")}
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
                {t("dashboard.welcome.title")}
              </h3>
              <p className="text-sm md:text-base text-muted mb-4 md:mb-6 max-w-2xl mx-auto px-2">
                {t("dashboard.welcome.description")}
              </p>
              <Button
                onClick={() => router.push("/onboarding")}
                className="bg-primary hover:bg-primary/90 text-white px-6 md:px-8 py-3 text-base md:text-lg w-full sm:w-auto"
                size="lg"
              >
                {t("dashboard.welcome.create_first_plan")}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
