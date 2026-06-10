"use client";
import { StatTile } from "@/components/ui/stat-tile";
import { supabaseClient } from "@/lib/supabase-client";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Dumbbell,
  Repeat,
  TrendingUp,
  Weight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface WorkoutLog {
  id: string;
  exercise_name: string;
  set_index: number;
  target_reps: [number, number];
  actual_reps: number;
  weight?: number;
  rpe?: number;
  notes?: string;
  plan_day_id: string;
  session_id: string;
  timestamp: string;
}

interface WorkoutSession {
  id: string;
  planDayId: string;
  date: string;
  logs: WorkoutLog[];
  totalSets: number;
  totalVolume: number;
  avgRPE: number;
}

interface WorkoutHistoryProps {
  onBack: () => void;
  selectedSession?: WorkoutSession | null;
  onSessionClick?: (sessionId: string) => void;
}

export function WorkoutHistory({
  onBack,
  selectedSession,
  onSessionClick,
}: WorkoutHistoryProps) {
  const { t } = useTranslation("common");
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkoutHistory();
  }, []);

  const fetchWorkoutHistory = async () => {
    try {
      const logs = await supabaseClient.getLogs();
      if (logs) {
        const sessionMap = new Map<string, WorkoutSession>();
        logs.forEach((log: WorkoutLog) => {
          const sessionKey = log.session_id;
          if (!sessionMap.has(sessionKey)) {
            sessionMap.set(sessionKey, {
              id: sessionKey,
              planDayId: log.plan_day_id,
              date: log.timestamp.split("T")[0],
              logs: [],
              totalSets: 0,
              totalVolume: 0,
              avgRPE: 0,
            });
          }
          const session = sessionMap.get(sessionKey)!;
          session.logs.push(log);
          session.totalSets++;
          session.totalVolume += log.actual_reps * (log.weight || 0);
          if (log.rpe) {
            const currentTotal = session.avgRPE * (session.logs.length - 1);
            session.avgRPE = (currentTotal + log.rpe) / session.logs.length;
          }
        });
        const sessionsArray = Array.from(sessionMap.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setSessions(sessionsArray);
      }
    } catch (error) {
      console.error("Error fetching workout history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatShort = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });

  const getExerciseStats = (logs: WorkoutLog[]) => {
    const exerciseMap = new Map<
      string,
      { sets: number; totalReps: number; avgWeight: number }
    >();
    logs.forEach((log) => {
      if (!exerciseMap.has(log.exercise_name)) {
        exerciseMap.set(log.exercise_name, { sets: 0, totalReps: 0, avgWeight: 0 });
      }
      const stats = exerciseMap.get(log.exercise_name)!;
      stats.sets++;
      stats.totalReps += log.actual_reps;
      if (log.weight) {
        stats.avgWeight =
          (stats.avgWeight * (stats.sets - 1) + log.weight) / stats.sets;
      }
    });
    return exerciseMap;
  };

  // ---------- Loading (skeleton que replica el historial) ----------
  if (loading) {
    return (
      <div className="container mx-auto max-w-xl lg:max-w-6xl px-4 lg:px-6 pt-4 lg:pt-8">
        <div className="pt-1 mb-4">
          <div className="cf-eyebrow">{t("nav.workoutHistory", "Progreso")}</div>
          <div className="cf-h1 text-[26px] mt-1.5">{t("workout_history.title")}</div>
        </div>
        {/* volume chart */}
        <div className="cf-card mb-3.5 animate-pulse" style={{ padding: 18, borderRadius: 22 }}>
          <div className="h-3 w-24 bg-surface-2 rounded mb-2" />
          <div className="h-7 w-20 bg-surface-2 rounded mb-4" />
          <div className="flex items-end gap-1.5" style={{ height: 70 }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${30 + ((i * 37) % 60)}%`,
                  minHeight: 8,
                  borderRadius: 6,
                  background: "var(--surface-2)",
                }}
              />
            ))}
          </div>
        </div>
        {/* summary tiles */}
        <div className="flex gap-2.5 mb-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="cf-card flex-1 animate-pulse" style={{ padding: 14, borderRadius: 18 }}>
              <div className="h-5 w-5 bg-surface-2 rounded mb-3" />
              <div className="h-6 w-10 bg-surface-2 rounded mb-1.5" />
              <div className="h-3 w-16 bg-surface-2 rounded" />
            </div>
          ))}
        </div>
        {/* session list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="cf-card flex items-center gap-3.5 animate-pulse"
              style={{ padding: "13px 15px", borderRadius: 16 }}
            >
              <div className="bg-surface-2 shrink-0" style={{ width: 46, height: 46, borderRadius: 13 }} />
              <div className="flex-1">
                <div className="h-4 bg-surface-2 rounded w-3/4 mb-2" />
                <div className="h-3 bg-surface-2 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Empty ----------
  if (sessions.length === 0) {
    return (
      <div className="container mx-auto max-w-xl px-5 pt-4">
        <div className="text-center py-16">
          <div
            className="cf-icon-tile bg-surface-2 border border-border mx-auto mb-4"
            style={{ width: 88, height: 88, borderRadius: 28 }}
          >
            <TrendingUp className="w-10 h-10 text-muted" />
          </div>
          <h3 className="cf-h2 text-[18px] mb-2">
            {t("workout_history.no_workouts.title")}
          </h3>
          <p className="cf-muted text-sm mb-6">
            {t("workout_history.no_workouts.description")}
          </p>
          <button className="cf-btn cf-btn-ghost" onClick={onBack}>
            {t("workout_history.back")}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Session detail ----------
  if (selectedSession) {
    const metrics: [React.ElementType, string, string, string][] = [
      [Repeat, String(selectedSession.totalSets), t("workout_history.session_details.completed_sets"), "var(--mint)"],
      [Weight, selectedSession.totalVolume.toFixed(0), t("workout_history.session_details.total_volume"), "var(--cyan)"],
      [Activity, selectedSession.avgRPE ? selectedSession.avgRPE.toFixed(1) : "—", t("workout_history.session_details.avg_rpe"), "var(--primary)"],
    ];
    return (
      <div className="container mx-auto max-w-xl lg:max-w-3xl px-4 lg:px-6 pt-4 lg:pt-8">
        <div className="flex items-center gap-3 pt-1 mb-4">
          <button
            onClick={onBack}
            className="cf-icon-tile bg-surface-2 border border-border"
            style={{ width: 40, height: 40 }}
            aria-label={t("workout_history.session_details.back_to_history")}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="cf-eyebrow">{t("workout_history.title")}</div>
            <div className="cf-h1 text-[20px] mt-1 capitalize">
              {formatDate(selectedSession.date)}
            </div>
          </div>
        </div>

        {/* metrics */}
        <div className="flex gap-2.5 mb-4">
          {metrics.map(([Icon, val, lbl, color], i) => (
            <div key={i} className="cf-card flex-1" style={{ padding: "14px 13px", borderRadius: 18 }}>
              <div style={{ color, marginBottom: 9 }}>
                <Icon size={19} />
              </div>
              <div className="cf-num text-[22px]">{val}</div>
              <div className="cf-muted text-[11px] font-semibold mt-0.5">{lbl}</div>
            </div>
          ))}
        </div>

        {/* per-exercise */}
        <div className="flex flex-col gap-3">
          {Array.from(getExerciseStats(selectedSession.logs).entries()).map(
            ([exerciseName, stats]) => (
              <div key={exerciseName} className="cf-card" style={{ padding: 16, borderRadius: 18 }}>
                <div className="font-bold text-[15px]">{exerciseName}</div>
                <div className="cf-muted text-[12px] font-semibold mt-1">
                  {t("workout_history.session_summary.series_reps", {
                    sets: stats.sets,
                    reps: stats.totalReps,
                  })}
                  {stats.avgWeight > 0 &&
                    ` · ${stats.avgWeight.toFixed(1)} kg`}
                </div>
                <div className="flex flex-col gap-2 mt-3">
                  {selectedSession.logs
                    .filter((log) => log.exercise_name === exerciseName)
                    .sort((a, b) => a.set_index - b.set_index)
                    .map((log, index) => (
                      <div
                        key={`${log.id}-${index}`}
                        className="cf-card-solid flex items-center justify-between"
                        style={{ padding: "10px 12px", borderRadius: 12 }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="cf-num text-white flex items-center justify-center"
                            style={{ width: 26, height: 26, borderRadius: 8, background: "var(--grad-brand)", fontSize: 12 }}
                          >
                            {log.set_index}
                          </span>
                          <span className="font-semibold text-[13.5px]">
                            {log.actual_reps} {t("workout_history.session_summary.reps")}
                            {log.weight ? ` · ${log.weight} kg` : ""}
                          </span>
                        </div>
                        {log.rpe ? (
                          <span className="cf-chip cf-chip-brand">RPE {log.rpe}</span>
                        ) : null}
                      </div>
                    ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  // ---------- History list ----------
  const recent = sessions.slice(0, 8).slice().reverse(); // antiguo → reciente
  const maxVol = Math.max(...recent.map((s) => s.totalVolume), 1);
  const totalSets = sessions.reduce((sum, s) => sum + s.totalSets, 0);
  const rpeSessions = sessions.filter((s) => s.avgRPE);
  const globalAvgRPE = rpeSessions.length
    ? rpeSessions.reduce((sum, s) => sum + s.avgRPE, 0) / rpeSessions.length
    : 0;
  const totalVolume = sessions.reduce((sum, s) => sum + s.totalVolume, 0);

  return (
    <div className="container mx-auto max-w-xl lg:max-w-6xl px-4 lg:px-6 pt-4 lg:pt-8">
      <div className="pt-1 mb-4">
        <div className="cf-eyebrow">{t("nav.workoutHistory", "Progreso")}</div>
        <div className="cf-h1 text-[26px] mt-1.5">{t("workout_history.title")}</div>
      </div>

      {/* volume chart */}
      <div className="cf-card mb-3.5" style={{ padding: 18, borderRadius: 22 }}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="cf-muted text-[12px] font-semibold">
              {t("workout_history.session_summary.volume", "Volumen")} · {recent.length}
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="cf-num text-[27px]">{(totalVolume / 1000).toFixed(1)}</span>
              <span className="cf-num text-[14px] text-muted">t</span>
            </div>
          </div>
        </div>
        <div className="flex items-end gap-1.5" style={{ height: 70 }}>
          {recent.map((s, i) => (
            <div
              key={s.id}
              style={{
                flex: 1,
                height: `${Math.max((s.totalVolume / maxVol) * 100, 8)}%`,
                minHeight: 8,
                borderRadius: 6,
                background: i === recent.length - 1 ? "var(--grad-brand)" : "var(--ring-track)",
              }}
            />
          ))}
        </div>
      </div>

      {/* summary tiles */}
      <div className="flex gap-2.5 mb-4">
        <StatTile icon={CheckCircle2} value={sessions.length} label={t("workout_history.general_summary.completed_sessions", "Sesiones")} accent="mint" />
        <StatTile icon={Repeat} value={totalSets} label={t("workout_history.general_summary.total_sets", "Series")} accent="brand" />
        <StatTile icon={Activity} value={globalAvgRPE ? globalAvgRPE.toFixed(1) : "—"} label={t("workout_history.general_summary.avg_rpe", "RPE medio")} accent="cyan" />
      </div>

      {/* session list */}
      <div className="cf-h2 text-[15px] mb-3">
        {t("workout_history.session_summary.exercises_performed", "Sesiones recientes")}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSessionClick?.(session.id)}
            className="cf-card flex items-center gap-3.5 text-left"
            style={{ padding: "13px 15px", borderRadius: 16 }}
          >
            <div
              className="cf-icon-tile bg-surface-2 border border-border shrink-0"
              style={{ width: 46, height: 46, borderRadius: 13 }}
            >
              <Dumbbell size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[14.5px] truncate">
                {t("plan.day", "Día")} {session.planDayId}
              </div>
              <div className="cf-muted text-[11.5px] font-semibold mt-0.5">
                {formatShort(session.date)} · {session.totalSets} series ·{" "}
                {session.totalVolume.toFixed(0)} kg
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="cf-num text-[15px]">
                {session.avgRPE ? session.avgRPE.toFixed(1) : "—"}
              </div>
              <div className="cf-muted text-[10px]">RPE</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
