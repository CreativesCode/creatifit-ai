"use client";

import { StatTile } from "@/components/ui/stat-tile";
import { StreakCard } from "@/components/ui/streak-card";
import { Mark } from "@/components/ui/brand";
import { useAuth } from "@/lib/auth/auth-context";
import { supabaseClient } from "@/lib/supabase-client";
import { planTitle } from "@/lib/plan-display";
import {
  computeStreak,
  todayLocal,
  type StreakInfo,
} from "@/lib/progress/streak";
import {
  Activity,
  ChevronRight,
  ClipboardList,
  Clock,
  Dumbbell,
  Play,
  Plus,
  Scale,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface RecentPlan {
  id: string;
  weeks: number;
  created_at: string;
  // El nombre y los días reales viven en el payload (no hay columnas `name`/`days`).
  payload?: {
    meta?: { objective?: string; name?: string };
    days?: unknown[];
  };
}

interface DashboardStats {
  totalPlans: number;
  totalSessions: number;
  totalExercises: number;
  recentPlans: RecentPlan[];
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation("common");
  const router = useRouter();
  const { user } = useAuth();
  const userInitial = (user?.email?.trim().charAt(0) || "C").toUpperCase();
  const [stats, setStats] = useState<DashboardStats>({
    totalPlans: 0,
    totalSessions: 0,
    totalExercises: 0,
    recentPlans: [],
  });
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState("");
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  useEffect(() => {
    // Fecha en cliente para evitar mismatch de hidratación. Usamos el idioma de la
    // app (i18n), no el del dispositivo, para que la fecha salga en español/inglés
    // según el ajuste de la app.
    setToday(
      new Date().toLocaleDateString(i18n.language, {
        weekday: "long",
        day: "numeric",
        month: "short",
      })
    );
  }, [i18n.language]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [plansData, exercisesData, logs] = await Promise.all([
          supabaseClient.getPlans(),
          supabaseClient.getExercises(1, 1),
          supabaseClient.getLogs(),
        ]);

        // Sesiones completadas = nº de session_id distintos en los logs
        // (mismo criterio que workout-history.tsx).
        const sessionIds = new Set<string>();
        (logs || []).forEach((log: { session_id?: string }) => {
          if (log.session_id) sessionIds.add(log.session_id);
        });

        // Racha viva anclada a hoy (días locales). Mismos logs que ya pedimos.
        setStreak(computeStreak(logs || [], todayLocal()));

        setStats((prev) => ({
          ...prev,
          totalPlans: plansData?.length || 0,
          totalSessions: sessionIds.size,
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

  if (loading) {
    return (
      <div className="container mx-auto max-w-xl lg:max-w-6xl px-4 lg:px-6 pt-4 lg:pt-8">
        {/* header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="bg-surface-2 rounded-xl animate-pulse" style={{ width: 36, height: 36 }} />
            <div>
              <div className="h-3 w-24 bg-surface-2 rounded animate-pulse mb-1.5" />
              <div className="h-5 w-32 bg-surface-2 rounded animate-pulse" />
            </div>
          </div>
          <div className="w-[38px] h-[38px] rounded-full bg-surface-2 animate-pulse" />
        </div>
        {/* hero */}
        <div className="cf-card animate-pulse mb-4" style={{ padding: 18, borderRadius: 24 }}>
          <div className="h-6 w-24 bg-surface-2 rounded-full mb-3" />
          <div className="h-6 w-2/3 bg-surface-2 rounded mb-3" />
          <div className="flex gap-2 mt-4 mb-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-1 bg-surface-2" style={{ height: 46, borderRadius: 12 }} />
            ))}
          </div>
          <div className="h-12 w-full bg-surface-2 rounded-xl" />
        </div>
        {/* stat tiles */}
        <div className="flex gap-2.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="cf-card flex-1 animate-pulse" style={{ padding: 14, borderRadius: 18 }}>
              <div className="h-5 w-5 bg-surface-2 rounded mb-3" />
              <div className="h-6 w-10 bg-surface-2 rounded mb-1.5" />
              <div className="h-3 w-16 bg-surface-2 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activePlan = stats.recentPlans[0];
  const titleOf = (p: RecentPlan) => planTitle(p, t);
  const daysOf = (p: RecentPlan) => p.payload?.days?.length ?? 0;

  return (
    <div className="container mx-auto max-w-xl lg:max-w-6xl px-4 lg:px-6 pt-4 lg:pt-8">
      {/* ---------- Header ---------- */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Mark size={36} />
          <div>
            <div className="cf-muted text-[12.5px] font-semibold capitalize">
              {today}
            </div>
            <div className="cf-h1 text-[24px] mt-px">{t("dashboard.title")}</div>
          </div>
        </div>
        <div
          className="w-[38px] h-[38px] rounded-full bg-grad-brand-soft flex items-center justify-center text-white font-display font-bold text-sm shadow-glow-brand"
          aria-hidden
        >
          {userInitial}
        </div>
      </div>

      {/* ---------- Racha ---------- */}
      {streak && stats.totalSessions > 0 && <StreakCard streak={streak} />}

      <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
        <div className="lg:col-span-2 lg:flex lg:flex-col lg:gap-4">

      {/* ---------- Hero: plan activo / sesión de hoy ---------- */}
      {activePlan ? (
        <div className="cf-card relative overflow-hidden mb-4 lg:mb-0" style={{ padding: 18, borderRadius: 24 }}>
          <div
            className="absolute pointer-events-none"
            style={{
              top: -40,
              right: -30,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(240,70,156,0.35), transparent 70%)",
              filter: "blur(8px)",
            }}
            aria-hidden
          />
          <div className="relative flex justify-between items-start">
            <div>
              <span className="cf-chip cf-chip-brand mb-3">
                <Zap size={12} fill="currentColor" />
                {t("dashboard.recent_plans.title")}
              </span>
              <div className="cf-h2 text-[22px] mt-2.5">{titleOf(activePlan)}</div>
              <div className="flex gap-3.5 mt-2.5 text-txt-2 text-[12.5px] font-semibold">
                <span className="flex items-center gap-1.5">
                  <ClipboardList size={14} />
                  {daysOf(activePlan)} {t("plan.day")}s
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {activePlan.weeks} {t("plan.weeks")}
                </span>
              </div>
            </div>
          </div>

          <button
            className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg mt-4"
            onClick={() => router.push(`/session?planId=${activePlan.id}`)}
          >
            <Play size={17} fill="currentColor" />
            {t("plans.plan_details.start_session")}
          </button>
        </div>
      ) : (
        /* Empty state: sin planes */
        <div className="cf-card relative overflow-hidden mb-4 lg:mb-0" style={{ padding: 22, borderRadius: 24 }}>
          <div className="relative flex flex-col items-center text-center gap-3">
            <div className="cf-icon-tile bg-grad-brand text-white shadow-glow-brand" style={{ width: 56, height: 56 }}>
              <Sparkles size={26} />
            </div>
            <div className="cf-h2 text-[20px]">{t("dashboard.welcome.title")}</div>
            <p className="cf-muted text-[13.5px] leading-relaxed max-w-xs">
              {t("dashboard.welcome.description")}
            </p>
            <button
              className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg mt-1"
              onClick={() => router.push("/onboarding")}
            >
              <Plus size={18} />
              {t("dashboard.welcome.create_first_plan")}
            </button>
          </div>
        </div>
      )}

      {/* ---------- Stat tiles ---------- */}
      <div className="flex gap-2.5 mb-4 lg:mb-0">
        <StatTile
          icon={ClipboardList}
          value={stats.totalPlans}
          label={t("dashboard.stats.plans_created")}
          accent="brand"
        />
        <StatTile
          icon={Activity}
          value={stats.totalSessions}
          label={t("dashboard.stats.sessions_completed")}
          accent="mint"
        />
        <StatTile
          icon={Target}
          value={stats.totalExercises}
          label={t("dashboard.stats.exercises_available")}
          accent="cyan"
        />
      </div>

      {/* ---------- Acceso a progreso corporal ---------- */}
      <button
        onClick={() => router.push("/body")}
        className="cf-card flex items-center gap-3.5 text-left w-full mt-4 lg:mt-0"
        style={{ padding: "13px 15px", borderRadius: 18 }}
      >
        <div className="cf-icon-tile bg-grad-brand text-white shrink-0" style={{ width: 42, height: 42, borderRadius: 12 }}>
          <Scale size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[14.5px]">{t("body.nav", "Mi cuerpo")}</div>
          <div className="cf-muted text-[11.5px] font-semibold mt-0.5">
            {t("body.dashboard_hint", "Peso, medidas y fotos de progreso")}
          </div>
        </div>
        <ChevronRight size={18} className="cf-muted shrink-0" />
      </button>

        </div>{/* /col-span-2 */}

        <div className="mt-4 lg:mt-0">
      {/* ---------- Planes recientes ---------- */}
      {stats.recentPlans.length > 0 && (
        <div className="cf-card lg:h-full" style={{ padding: 16, borderRadius: 20 }}>
          <div className="flex justify-between items-center mb-3.5">
            <span className="cf-h2 text-[15px]">
              {t("dashboard.recent_plans.title")}
            </span>
            <button
              className="cf-chip"
              onClick={() => router.push("/plans")}
            >
              {t("dashboard.recent_plans.view_all_plans")}
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {stats.recentPlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => router.push(`/plans?id=${plan.id}`)}
                className="cf-card-solid flex items-center gap-3 text-left"
                style={{ padding: "11px 13px", borderRadius: 14 }}
              >
                <div className="cf-icon-tile bg-grad-brand text-white" style={{ width: 40, height: 40, borderRadius: 12 }}>
                  <Dumbbell size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[14.5px] truncate">
                    {titleOf(plan)}
                  </div>
                  <div className="cf-muted text-[11.5px] font-semibold mt-0.5">
                    {plan.weeks} {t("plan.weeks")} · {daysOf(plan)} {t("plan.day")}s
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
        </div>{/* /right col */}
      </div>{/* /grid */}
    </div>
  );
}
