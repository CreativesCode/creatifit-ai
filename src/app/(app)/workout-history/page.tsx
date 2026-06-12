"use client";
import { WorkoutHistory } from "@/components/ui/workout-history";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase-client";

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
    // Evita el doble fetch cuando handleSessionClick ya pidió esta sesión
    // (estado primero, navegación best-effort — ver handleSessionClick).
    if (sessionId && selectedSession?.id !== sessionId && !loading) {
      fetchSessionDetails(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const fetchSessionDetails = async (id: string) => {
    try {
      setLoading(true);
      const logs = await supabaseClient.getLogs(id);

      if (logs && logs.length > 0) {
        // Agrupar logs por sesión
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
    if (sessionId || selectedSession) {
      // Detalle de sesión → historial. Estado PRIMERO: en Capacitor la
      // navegación de query puede fallar/no propagarse (mismo workaround que
      // en /exercises) y el botón quedaba muerto.
      setSelectedSession(null);
      try {
        router.replace("/workout-history");
      } catch {
        /* no-op: el estado ya muestra el historial */
      }
    } else {
      // Historial → planes
      router.push("/plans");
    }
  };

  const handleSessionClick = (id: string) => {
    // Estado primero; push (jerarquía) best-effort para historial/deep-link.
    fetchSessionDetails(id);
    try {
      router.push(`/workout-history?id=${id}`);
    } catch {
      /* no-op */
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-xl lg:max-w-3xl px-4 lg:px-6 pt-4 lg:pt-8">
        <div className="flex items-center gap-3 pt-1 mb-4">
          <div className="cf-icon-tile bg-surface-2 animate-pulse" style={{ width: 40, height: 40 }} />
          <div>
            <div className="h-3 w-20 bg-surface-2 rounded animate-pulse mb-1.5" />
            <div className="h-5 w-40 bg-surface-2 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2.5 mb-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="cf-card flex-1 animate-pulse" style={{ padding: "14px 13px", borderRadius: 18 }}>
              <div className="h-5 w-5 bg-surface-2 rounded mb-2" />
              <div className="h-6 w-12 bg-surface-2 rounded mb-1.5" />
              <div className="h-3 w-16 bg-surface-2 rounded" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="cf-card animate-pulse" style={{ padding: 16, borderRadius: 18 }}>
              <div className="h-4 w-1/2 bg-surface-2 rounded mb-2" />
              <div className="h-3 w-1/3 bg-surface-2 rounded" />
            </div>
          ))}
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
