"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseClient } from "@/lib/supabase-client";
import { Calendar, TrendingUp, Weight, XCircle } from "lucide-react";
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
  session_id: string; // ← Agregar session_id
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
        // Agrupar logs por sesión (plan_day_id + fecha)
        const sessionMap = new Map<string, WorkoutSession>();

        logs.forEach((log: WorkoutLog) => {
          // Usar session_id para agrupar (más preciso que plan_day_id + fecha)
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

        // Convertir a array y ordenar por fecha (más reciente primero)
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getExerciseStats = (logs: WorkoutLog[]) => {
    const exerciseMap = new Map<
      string,
      { sets: number; totalReps: number; avgWeight: number }
    >();

    logs.forEach((log) => {
      if (!exerciseMap.has(log.exercise_name)) {
        exerciseMap.set(log.exercise_name, {
          sets: 0,
          totalReps: 0,
          avgWeight: 0,
        });
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted">{t("workout_history.loading")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-muted">
              {t("workout_history.no_workouts.title")}
            </CardTitle>
            <p className="text-muted">
              {t("workout_history.no_workouts.description")}
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={onBack} className="px-8">
              {t("workout_history.back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si hay una sesión seleccionada, mostrar la vista detallada
  if (selectedSession) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-txt">
            {t("workout_history.session_details.title")}
          </h1>
          <Button onClick={onBack} variant="outline" size="sm">
            <XCircle className="w-4 h-4 mr-2" />
            {t("workout_history.session_details.back_to_history")}
          </Button>
        </div>

        {/* Información de la Sesión */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {t("workout_history.session_details.session_date", {
                date: formatDate(selectedSession.date),
              })}
            </CardTitle>
            <p className="text-muted">
              {t("workout_history.session_details.plan_day", {
                day: selectedSession.planDayId,
              })}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {selectedSession.totalSets}
                </div>
                <p className="text-muted">
                  {t("workout_history.session_details.completed_sets")}
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">
                  {selectedSession.totalVolume.toFixed(1)}
                </div>
                <p className="text-muted">
                  {t("workout_history.session_details.total_volume")}
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary">
                  {selectedSession.avgRPE.toFixed(1)}
                </div>
                <p className="text-muted">
                  {t("workout_history.session_details.avg_rpe")}
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-success">
                  {selectedSession.logs.length}
                </div>
                <p className="text-muted">
                  {t("workout_history.session_details.exercises")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalles de Cada Ejercicio */}
        <div className="space-y-6">
          {Array.from(getExerciseStats(selectedSession.logs).entries()).map(
            ([exerciseName, stats]) => (
              <Card key={exerciseName}>
                <CardHeader>
                  <CardTitle className="text-lg">{exerciseName}</CardTitle>
                  <p className="text-muted">
                    {t("workout_history.session_summary.series_reps", {
                      sets: stats.sets,
                      reps: stats.totalReps,
                    })}
                    {stats.avgWeight > 0 &&
                      ` • ${stats.avgWeight.toFixed(1)} kg ${t(
                        "workout_history.session_summary.avg_weight"
                      )}`}
                  </p>
                </CardHeader>
                <CardContent>
                  {/* Detalles de cada set */}
                  <div className="space-y-3">
                    {selectedSession.logs
                      .filter((log) => log.exercise_name === exerciseName)
                      .sort((a, b) => a.set_index - b.set_index)
                      .map((log, index) => (
                        <div
                          key={`${log.id}-${index}`}
                          className="flex items-center justify-between p-3 bg-surface/50 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold">
                              {log.set_index}
                            </span>
                            <div>
                              <p className="font-medium text-txt">
                                {log.actual_reps}{" "}
                                {t("workout_history.session_summary.reps")}
                                {log.target_reps && (
                                  <span className="text-muted ml-2">
                                    (
                                    {t(
                                      "workout_history.session_summary.target"
                                    )}
                                    : {log.target_reps[0]}-{log.target_reps[1]})
                                  </span>
                                )}
                              </p>
                              {log.weight && (
                                <p className="text-sm text-muted">
                                  <Weight className="w-3 h-3 inline mr-1" />
                                  {log.weight}{" "}
                                  {t(
                                    "workout_history.session_summary.weight_unit"
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            {log.rpe && (
                              <div className="text-sm">
                                <span className="text-muted">
                                  {t(
                                    "workout_history.session_summary.rpe_label"
                                  )}
                                  :
                                </span>
                                <span className="ml-2 font-semibold text-accent">
                                  {log.rpe}
                                </span>
                              </div>
                            )}
                            {log.notes && (
                              <div className="text-xs text-muted max-w-xs text-right">
                                {log.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-txt">
          {t("workout_history.title")}
        </h1>
        <Button onClick={onBack} variant="outline" size="sm">
          <XCircle className="w-4 h-4 mr-2" />
          {t("workout_history.back")}
        </Button>
      </div>

      {/* Estadísticas Generales */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t("workout_history.general_summary.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {sessions.length}
              </div>
              <p className="text-muted">
                {t("workout_history.general_summary.completed_sessions")}
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">
                {sessions.reduce((sum, session) => sum + session.totalSets, 0)}
              </div>
              <p className="text-muted">
                {t("workout_history.general_summary.total_sets")}
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary">
                {sessions
                  .reduce((sum, session) => sum + session.totalVolume, 0)
                  .toFixed(1)}
              </div>
              <p className="text-muted">
                {t("workout_history.general_summary.total_volume")}
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-success">
                {(
                  sessions.reduce((sum, session) => sum + session.avgRPE, 0) /
                  sessions.length
                ).toFixed(1)}
              </div>
              <p className="text-muted">
                {t("workout_history.general_summary.avg_rpe")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Sesiones */}
      <div className="space-y-6">
        {sessions.map((session) => (
          <Card
            key={session.id}
            className="border-border/50 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onSessionClick?.(session.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    {t("workout_history.session_details.session_date", {
                      date: formatDate(session.date),
                    })}
                  </CardTitle>
                  <p className="text-muted mt-1">
                    {t("workout_history.session_details.plan_day", {
                      day: session.planDayId,
                    })}
                  </p>
                  <p className="text-sm text-muted mt-1">
                    {t("workout_history.session_summary.session_id")}:{" "}
                    {session.id.substring(0, 8)}...
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-accent">
                    {session.totalSets}{" "}
                    {t("workout_history.session_summary.series")}
                  </div>
                  <p className="text-sm text-muted">
                    {t("workout_history.session_summary.completed")}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Métricas de la Sesión */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <div className="text-lg font-semibold text-primary">
                    {session.totalVolume.toFixed(1)}
                  </div>
                  <p className="text-sm text-muted">
                    {t("workout_history.session_summary.volume")}
                  </p>
                </div>
                <div className="text-center p-3 bg-accent/10 rounded-lg">
                  <div className="text-lg font-semibold text-accent">
                    {session.avgRPE.toFixed(1)}
                  </div>
                  <p className="text-sm text-muted">
                    {t("workout_history.general_summary.avg_rpe")}
                  </p>
                </div>
                <div className="text-center p-3 bg-secondary/10 rounded-lg">
                  <div className="text-lg font-semibold text-secondary">
                    {session.logs.length}
                  </div>
                  <p className="text-sm text-muted">
                    {t("workout_history.session_details.exercises")}
                  </p>
                </div>
              </div>

              {/* Ejercicios de la Sesión */}
              <div>
                <h4 className="font-semibold mb-3 text-txt">
                  {t("workout_history.session_summary.exercises_performed")}
                </h4>
                <div className="space-y-3">
                  {Array.from(getExerciseStats(session.logs).entries()).map(
                    ([exerciseName, stats]) => (
                      <div
                        key={exerciseName}
                        className="flex items-center justify-between p-3 bg-surface/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-txt">{exerciseName}</p>
                          <p className="text-sm text-muted">
                            {t("workout_history.session_summary.series_reps", {
                              sets: stats.sets,
                              reps: stats.totalReps,
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          {stats.avgWeight > 0 && (
                            <p className="text-sm text-muted">
                              <Weight className="w-3 h-3 inline mr-1" />
                              {stats.avgWeight.toFixed(1)}{" "}
                              {t("workout_history.session_summary.weight_unit")}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Indicador de click */}
              <div className="mt-4 text-center">
                <p className="text-xs text-muted">
                  {t("workout_history.session_summary.click_for_details")}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
