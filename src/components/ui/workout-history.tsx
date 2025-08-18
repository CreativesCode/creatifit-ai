"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Weight, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

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

export function WorkoutHistory({ onBack }: { onBack: () => void }) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkoutHistory();
  }, []);

  const fetchWorkoutHistory = async () => {
    try {
      const response = await fetch("/api/logs");
      const data = await response.json();

      if (data.success) {
        // Agrupar logs por sesión (plan_day_id + fecha)
        const sessionMap = new Map<string, WorkoutSession>();

        data.logs.forEach((log: WorkoutLog) => {
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
            <p className="text-muted">
              Cargando historial de entrenamientos...
            </p>
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
              No hay entrenamientos registrados
            </CardTitle>
            <p className="text-muted">
              Completa tu primer entrenamiento para ver el historial aquí
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={onBack} className="px-8">
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-txt">
          Historial de Entrenamientos
        </h1>
        <Button onClick={onBack} variant="outline" size="sm">
          <XCircle className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Estadísticas Generales */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Resumen General
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {sessions.length}
              </div>
              <p className="text-muted">Sesiones Completadas</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">
                {sessions.reduce((sum, session) => sum + session.totalSets, 0)}
              </div>
              <p className="text-muted">Total de Series</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary">
                {sessions
                  .reduce((sum, session) => sum + session.totalVolume, 0)
                  .toFixed(1)}
              </div>
              <p className="text-muted">Volumen Total (kg)</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-success">
                {(
                  sessions.reduce((sum, session) => sum + session.avgRPE, 0) /
                  sessions.length
                ).toFixed(1)}
              </div>
              <p className="text-muted">RPE Promedio</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Sesiones */}
      <div className="space-y-6">
        {sessions.map((session) => (
          <Card key={session.id} className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Día {session.planDayId}
                  </CardTitle>
                  <p className="text-muted mt-1">{formatDate(session.date)}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-accent">
                    {session.totalSets} series
                  </div>
                  <p className="text-sm text-muted">completadas</p>
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
                  <p className="text-sm text-muted">Volumen (kg)</p>
                </div>
                <div className="text-center p-3 bg-accent/10 rounded-lg">
                  <div className="text-lg font-semibold text-accent">
                    {session.avgRPE.toFixed(1)}
                  </div>
                  <p className="text-sm text-muted">RPE Promedio</p>
                </div>
                <div className="text-center p-3 bg-secondary/10 rounded-lg">
                  <div className="text-lg font-semibold text-secondary">
                    {session.logs.length}
                  </div>
                  <p className="text-sm text-muted">Ejercicios</p>
                </div>
              </div>

              {/* Ejercicios de la Sesión */}
              <div>
                <h4 className="font-semibold mb-3 text-txt">
                  Ejercicios Realizados
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
                            {stats.sets} series × {stats.totalReps} reps totales
                          </p>
                        </div>
                        <div className="text-right">
                          {stats.avgWeight > 0 && (
                            <p className="text-sm text-muted">
                              <Weight className="w-3 h-3 inline mr-1" />
                              {stats.avgWeight.toFixed(1)} kg
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
