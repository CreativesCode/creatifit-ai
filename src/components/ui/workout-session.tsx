"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Clock,
  Pause,
  Play,
  Repeat,
  SkipForward,
  Target,
  Timer,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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

interface WorkoutLog {
  exerciseName: string;
  setIndex: number;
  targetReps: [number, number];
  actualReps: number;
  weight?: number;
  rpe?: number;
  notes?: string;
  completed: boolean;
}

// Componente para el calentamiento
function WarmupStep({
  warmupTime,
  isPaused,
  onComplete,
  onPauseToggle,
  onSkip,
}: {
  warmupTime: number;
  isPaused: boolean;
  onComplete: () => void;
  onPauseToggle: () => void;
  onSkip: () => void;
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Timer className="w-6 h-6 text-primary" />
            Calentamiento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-6xl font-bold text-primary">
            {formatTime(warmupTime)}
          </div>
          <p className="text-muted">Prepárate para tu entrenamiento</p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={onPauseToggle}
              variant={isPaused ? "default" : "outline"}
              size="lg"
            >
              {isPaused ? (
                <Play className="w-4 h-4" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              {isPaused ? "Continuar" : "Pausar"}
            </Button>
            <Button onClick={onSkip} variant="outline" size="lg">
              <SkipForward className="w-4 h-4" />
              Saltar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para el ejercicio
function ExerciseStep({
  currentExercise,
  currentSetIndex,
  currentLog,
  onCompleteSet,
  onStartRest,
  onLogChange,
}: {
  currentExercise: ExerciseBlock;
  currentSetIndex: number;
  currentLog: Partial<WorkoutLog>;
  onCompleteSet: () => void;
  onStartRest: () => void;
  onLogChange: (log: Partial<WorkoutLog>) => void;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {currentExercise.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Repeat className="w-8 h-8 text-primary" />
              </div>
              <p className="text-2xl font-bold text-txt">
                {currentSetIndex + 1}/{currentExercise.sets}
              </p>
              <p className="text-muted">Serie</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="w-8 h-8 text-accent" />
              </div>
              <p className="text-2xl font-bold text-txt">
                {currentExercise.reps[0]}-{currentExercise.reps[1]}
              </p>
              <p className="text-muted">Repeticiones</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-secondary" />
              </div>
              <p className="text-2xl font-bold text-txt">
                {currentExercise.rest_sec}s
              </p>
              <p className="text-muted">Descanso</p>
            </div>
          </div>

          {/* Puntos clave */}
          {currentExercise.cues && currentExercise.cues.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-accent mb-2">
                Puntos clave:
              </p>
              <ul className="space-y-1">
                {currentExercise.cues.map((cue, index) => (
                  <li
                    key={index}
                    className="flex items-start text-sm text-muted"
                  >
                    <span className="text-accent mr-2">•</span>
                    {cue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Formulario de registro */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-txt mb-2">
                  Repeticiones Completadas
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={currentLog.actualReps || ""}
                  onChange={(e) =>
                    onLogChange({
                      ...currentLog,
                      actualReps: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-txt mb-2">
                  Peso (kg) - Opcional
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={currentLog.weight || ""}
                  onChange={(e) =>
                    onLogChange({
                      ...currentLog,
                      weight: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-txt mb-2">
                  RPE (1-10) - Opcional
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={currentLog.rpe || ""}
                  onChange={(e) =>
                    onLogChange({
                      ...currentLog,
                      rpe: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="8"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-txt mb-2">
                Notas - Opcional
              </label>
              <textarea
                value={currentLog.notes || ""}
                onChange={(e) =>
                  onLogChange({
                    ...currentLog,
                    notes: e.target.value,
                  })
                }
                className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={2}
                placeholder="Cómo te sentiste, técnica, etc."
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 mt-6">
            <Button
              onClick={onCompleteSet}
              disabled={!currentLog.actualReps}
              className="flex-1 bg-success hover:bg-success/90 text-white"
              size="lg"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Completar Serie
            </Button>

            <Button onClick={onStartRest} variant="outline" size="lg">
              <Clock className="w-4 h-4 mr-2" />
              Descanso
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para el descanso
function RestStep({
  restTime,
  isPaused,
  onComplete,
  onPauseToggle,
  onSkip,
  isLongRest,
}: {
  restTime: number;
  isPaused: boolean;
  onComplete: () => void;
  onPauseToggle: () => void;
  onSkip: () => void;
  isLongRest?: boolean;
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const restMessage = isLongRest
    ? "Descansa antes del siguiente ejercicio"
    : "Descansa para la siguiente serie";

  const restIcon = isLongRest ? "🏋️‍♂️" : "💪";

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="w-6 h-6 text-accent" />
            {isLongRest ? "Descanso Entre Ejercicios" : "Descanso"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-4xl mb-2">{restIcon}</div>
          <div className="text-6xl font-bold text-accent">
            {formatTime(restTime)}
          </div>
          <p className="text-muted">{restMessage}</p>
          {isLongRest && (
            <p className="text-sm text-muted-foreground bg-accent/10 p-3 rounded-lg">
              💡 Aprovecha para hidratarte y prepararte mentalmente para el
              siguiente ejercicio
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={onPauseToggle}
              variant={isPaused ? "default" : "outline"}
              size="lg"
            >
              {isPaused ? (
                <Play className="w-4 h-4" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              {isPaused ? "Continuar" : "Pausar"}
            </Button>
            <Button onClick={onSkip} variant="outline" size="lg">
              <SkipForward className="w-4 h-4" />
              Saltar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para completado
function CompletedStep({
  completedSets,
  totalSets,
  workoutLogs,
  planDay,
  onComplete,
  onExit,
}: {
  completedSets: number;
  totalSets: number;
  workoutLogs: WorkoutLog[];
  planDay: PlanDay;
  onComplete: () => void;
  onExit: () => void;
}) {
  const progress = (completedSets / totalSets) * 100;

  // Agrupar logs por ejercicio
  const exerciseStats = workoutLogs.reduce((acc, log) => {
    if (!acc[log.exerciseName]) {
      acc[log.exerciseName] = {
        sets: 0,
        totalReps: 0,
        totalWeight: 0,
        totalRPE: 0,
        notes: [] as string[],
        targetReps: log.targetReps,
      };
    }

    acc[log.exerciseName].sets++;
    acc[log.exerciseName].totalReps += log.actualReps;
    if (log.weight) acc[log.exerciseName].totalWeight += log.weight;
    if (log.rpe) acc[log.exerciseName].totalRPE += log.rpe;
    if (log.notes) acc[log.exerciseName].notes.push(log.notes);

    return acc;
  }, {} as Record<string, any>);

  // Calcular métricas generales
  const totalVolume = workoutLogs.reduce((sum, log) => {
    return sum + log.actualReps * (log.weight || 0);
  }, 0);

  const avgRPE =
    workoutLogs.reduce((sum, log) => sum + (log.rpe || 0), 0) /
    workoutLogs.filter((log) => log.rpe).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-success text-2xl">
            <CheckCircle className="w-8 h-8" />
            ¡Entrenamiento Completado!
          </CardTitle>
          <p className="text-muted">Resumen detallado de tu sesión</p>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Métricas Generales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {completedSets}/{totalSets}
              </div>
              <p className="text-sm text-muted">Series Completadas</p>
            </div>
            <div className="text-center p-4 bg-accent/10 rounded-lg">
              <div className="text-2xl font-bold text-accent">
                {Math.round(progress)}%
              </div>
              <p className="text-sm text-muted">Progreso</p>
            </div>
            <div className="text-center p-4 bg-secondary/10 rounded-lg">
              <div className="text-2xl font-bold text-secondary">
                {totalVolume.toFixed(1)}
              </div>
              <p className="text-sm text-muted">Volumen Total (kg)</p>
            </div>
            <div className="text-center p-4 bg-success/10 rounded-lg">
              <div className="text-2xl font-bold text-success">
                {avgRPE.toFixed(1)}
              </div>
              <p className="text-sm text-muted">RPE Promedio</p>
            </div>
          </div>

          {/* Detalles por Ejercicio */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-txt">
              Detalles por Ejercicio
            </h3>
            <div className="space-y-4">
              {Object.entries(exerciseStats).map(([exerciseName, stats]) => (
                <Card key={exerciseName} className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{exerciseName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-txt">Series</p>
                        <p className="text-muted">{stats.sets}</p>
                      </div>
                      <div>
                        <p className="font-medium text-txt">Reps Totales</p>
                        <p className="text-muted">{stats.totalReps}</p>
                      </div>
                      <div>
                        <p className="font-medium text-txt">Peso Promedio</p>
                        <p className="text-muted">
                          {stats.totalWeight > 0
                            ? (stats.totalWeight / stats.sets).toFixed(1)
                            : "N/A"}{" "}
                          kg
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-txt">RPE Promedio</p>
                        <p className="text-muted">
                          {stats.totalRPE > 0
                            ? (stats.totalRPE / stats.sets).toFixed(1)
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Objetivo vs Real */}
                    <div className="mt-3 p-3 bg-surface/50 rounded-lg">
                      <p className="text-sm text-muted mb-2">
                        Objetivo vs Real:
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {stats.targetReps[0]}-{stats.targetReps[1]} reps
                          objetivo
                        </span>
                        <span className="text-muted">→</span>
                        <span className="text-sm font-medium">
                          {stats.totalReps / stats.sets} reps promedio
                        </span>
                      </div>
                    </div>

                    {/* Notas */}
                    {stats.notes.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-muted mb-2">Notas:</p>
                        <div className="space-y-1">
                          {stats.notes.map((note, index) => (
                            <p
                              key={index}
                              className="text-sm bg-accent/10 p-2 rounded"
                            >
                              "{note}"
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-3 justify-center pt-4">
            <Button onClick={onComplete} className="px-8" size="lg">
              Ver Historial Completo
            </Button>
            <Button
              onClick={() => router.push("/workout-history")}
              variant="outline"
              className="px-8"
              size="lg"
            >
              Ir al Historial
            </Button>
            <Button
              onClick={onExit}
              variant="outline"
              className="px-8"
              size="lg"
            >
              Salir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente principal del stepper
export function WorkoutSession({
  planDay,
  onComplete,
  onExit,
}: {
  planDay: PlanDay;
  onComplete: () => void;
  onExit: () => void;
}) {
  const { t } = useTranslation("common");
  const router = useRouter();

  // Estado principal unificado
  const [phase, setPhase] = useState<
    "warmup" | "exercise" | "rest" | "completed"
  >("warmup");
  const [timer, setTimer] = useState(15); // Timer unificado para calentamiento y descanso
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLongRest, setIsLongRest] = useState(false); // Para distinguir descanso entre ejercicios
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [currentLog, setCurrentLog] = useState<Partial<WorkoutLog>>({});
  const [sessionId, setSessionId] = useState<string>(""); // ID único de la sesión actual

  const currentExercise = planDay.blocks[currentExerciseIndex];
  const totalSets = planDay.blocks.reduce(
    (total, block) => total + block.sets,
    0
  );
  const completedSets = workoutLogs.filter((log) => log.completed).length;
  const progress = (completedSets / totalSets) * 100;

  // Generar session_id único al iniciar el entrenamiento
  useEffect(() => {
    if (phase === "warmup" && !sessionId) {
      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);
      console.log(`🆔 [WORKOUT] New session started with ID: ${newSessionId}`);
    }
  }, [phase, sessionId]);

  // Pre-llenar el campo de repeticiones cuando cambie el ejercicio
  useEffect(() => {
    if (currentExercise && phase === "exercise") {
      const maxReps = currentExercise.reps[1];
      setCurrentLog((prev) => ({
        ...prev,
        actualReps: maxReps,
      }));
    }
  }, [currentExerciseIndex, currentSetIndex, phase, currentExercise]);

  // Timer único para calentamiento Y descanso
  useEffect(() => {
    console.log(
      `⏱️ [WORKOUT] Timer effect - Phase: ${phase}, Timer: ${timer}, Paused: ${isPaused}`
    );

    if ((phase === "warmup" || phase === "rest") && timer > 0 && !isPaused) {
      console.log(`🔄 [WORKOUT] Starting ${phase} timer: ${timer} seconds`);
      const interval = setTimeout(() => {
        console.log(`⏰ [WORKOUT] Timer tick: ${timer} -> ${timer - 1}`);
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(interval);
    } else if (timer === 0) {
      if (phase === "warmup") {
        console.log(`✅ [WORKOUT] Warmup completed, moving to exercise`);
        setPhase("exercise");
      } else if (phase === "rest") {
        console.log(`✅ [WORKOUT] Rest completed, moving to exercise`);
        setPhase("exercise");
      }
    }
  }, [timer, phase, isPaused]);

  const handleWarmupComplete = () => {
    setPhase("exercise");
    setIsPaused(false); // Resetear pausa al pasar al ejercicio
  };

  const handleWarmupSkip = () => {
    setTimer(0);
  };

  const handleStartRest = useCallback(() => {
    console.log(
      `🕐 [WORKOUT] Starting rest for ${currentExercise.rest_sec} seconds`
    );
    setTimer(currentExercise.rest_sec);
    setPhase("rest");
    setIsLongRest(false); // Es descanso normal entre series
    setIsPaused(false); // Resetear pausa para que inicie activo
    console.log(
      `⏱️ [WORKOUT] Rest timer set to: ${currentExercise.rest_sec}, Phase: rest, Paused: false`
    );
  }, [currentExercise.rest_sec]);

  const handleCompleteSet = async () => {
    if (!currentLog.actualReps) return;

    const newLog: WorkoutLog = {
      exerciseName: currentExercise.name,
      setIndex: currentSetIndex + 1,
      targetReps: currentExercise.reps,
      actualReps: currentLog.actualReps,
      weight: currentLog.weight,
      rpe: currentLog.rpe,
      notes: currentLog.notes,
      completed: true,
    };

    // Agregar a logs locales
    setWorkoutLogs((prev) => [...prev, newLog]);

    // Guardar en Supabase
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: newLog.exerciseName,
          setIndex: newLog.setIndex,
          targetReps: newLog.targetReps,
          actualReps: newLog.actualReps,
          weight: newLog.weight,
          rpe: newLog.rpe,
          notes: newLog.notes,
          planDayId: planDay.day,
          sessionId: sessionId, // ← Agregar session_id único
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Error saving log:", error);
    }

    // Resetear formulario
    setCurrentLog({});

    // Verificar si hay más series
    if (currentSetIndex + 1 < currentExercise.sets) {
      console.log(
        `🔄 [WORKOUT] Moving to next set: ${currentSetIndex + 1}/${
          currentExercise.sets
        }`
      );
      setCurrentSetIndex(currentSetIndex + 1);
      handleStartRest();
    } else {
      // Verificar si hay más ejercicios
      if (currentExerciseIndex + 1 < planDay.blocks.length) {
        console.log(
          `🏋️ [WORKOUT] Exercise completed! Starting rest before next exercise`
        );

        // Descanso más largo entre ejercicios (90 segundos)
        const betweenExerciseRest = 90;
        console.log(
          `🕐 [WORKOUT] Starting between-exercise rest for ${betweenExerciseRest} seconds`
        );

        setTimer(betweenExerciseRest);
        setPhase("rest");
        setIsLongRest(true); // Marcar como descanso largo entre ejercicios
        setIsPaused(false); // Resetear pausa para que inicie activo

        // Cambiar al siguiente ejercicio inmediatamente (se ejecutará después del descanso)
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setCurrentSetIndex(0);
      } else {
        // Entrenamiento completado
        console.log(`🎉 [WORKOUT] All exercises completed!`);
        setPhase("completed");
      }
    }
  };

  const handleSkipRest = () => {
    setPhase("exercise");
    setIsPaused(false); // Resetear pausa al saltar descanso
  };

  const handleRestComplete = () => {
    setPhase("exercise");
    setIsPaused(false); // Resetear pausa al completar descanso
  };

  const handleShowHistory = () => {
    // Navegar a la página dedicada del historial
    router.push("/workout-history");
  };

  // Renderizar el paso actual
  switch (phase) {
    case "warmup":
      return (
        <WarmupStep
          warmupTime={timer}
          isPaused={isPaused}
          onComplete={handleWarmupComplete}
          onPauseToggle={() => setIsPaused(!isPaused)}
          onSkip={handleWarmupSkip}
        />
      );

    case "exercise":
      return (
        <div>
          {/* Header con progreso */}
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-txt">
                  {planDay.focus} - Día {planDay.day}
                </h1>
                <Button onClick={onExit} variant="outline" size="sm">
                  <XCircle className="w-4 h-4 mr-2" />
                  Salir
                </Button>
              </div>

              {/* Barra de progreso */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted">
                  <span>
                    Progreso: {completedSets}/{totalSets} series
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            </div>
          </div>

          <ExerciseStep
            currentExercise={currentExercise}
            currentSetIndex={currentSetIndex}
            currentLog={currentLog}
            onCompleteSet={handleCompleteSet}
            onStartRest={handleStartRest}
            onLogChange={setCurrentLog}
          />

          {/* Próximos ejercicios */}
          <div className="container mx-auto px-4 pb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Próximos Ejercicios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {planDay.blocks
                    .slice(currentExerciseIndex + 1)
                    .map((exercise, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-surface/50 rounded-lg border border-border/50"
                      >
                        <div>
                          <h4 className="font-medium text-txt">
                            {exercise.name}
                          </h4>
                          <p className="text-sm text-muted">
                            {exercise.sets} series × {exercise.reps[0]}-
                            {exercise.reps[1]} reps
                          </p>
                        </div>
                        <div className="text-sm text-muted">
                          {exercise.rest_sec}s descanso
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );

    case "rest":
      return (
        <RestStep
          restTime={timer}
          isPaused={isPaused}
          onComplete={handleRestComplete}
          onPauseToggle={() => setIsPaused(!isPaused)}
          onSkip={handleSkipRest}
          isLongRest={isLongRest}
        />
      );

    case "completed":
      return (
        <CompletedStep
          completedSets={completedSets}
          totalSets={totalSets}
          workoutLogs={workoutLogs}
          planDay={planDay}
          onComplete={handleShowHistory}
          onExit={onExit}
        />
      );

    default:
      return null;
  }
}
