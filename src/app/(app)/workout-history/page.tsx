"use client";
import { WorkoutHistory } from "@/components/ui/workout-history";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

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

export default function WorkoutHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails(sessionId);
    }
  }, [sessionId]);

  const fetchSessionDetails = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/logs?sessionId=${id}`);
      const data = await response.json();

      if (data.success && data.logs.length > 0) {
        // Agrupar logs por sesión
        const logs = data.logs;
        const session: WorkoutSession = {
          id: id,
          planDayId: logs[0].plan_day_id,
          date: logs[0].timestamp.split("T")[0],
          logs: logs,
          totalSets: logs.length,
          totalVolume: logs.reduce((sum: number, log: WorkoutLog) => sum + (log.actual_reps * (log.weight || 0)), 0),
          avgRPE: logs.reduce((sum: number, log: WorkoutLog) => sum + (log.rpe || 0), 0) / logs.filter((log: WorkoutLog) => log.rpe).length || 0,
        };
        setSelectedSession(session);
      }
    } catch (error) {
      console.error("Error fetching session details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (sessionId) {
      // Si estamos en detalles de sesión, volver al historial
      router.replace("/workout-history");
      setSelectedSession(null);
    } else {
      // Si estamos en el historial, volver a planes
      router.push("/plans");
    }
  };

  const handleSessionClick = (sessionId: string) => {
    router.replace(`/workout-history?id=${sessionId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted">Cargando detalles de la sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <WorkoutHistory 
      onBack={handleBack}
      selectedSession={selectedSession}
      onSessionClick={handleSessionClick}
    />
  );
}
