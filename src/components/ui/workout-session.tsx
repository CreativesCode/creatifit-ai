"use client";
import { Ring } from "@/components/ui/ring";
import { supabaseClient } from "@/lib/supabase-client";
import {
  Activity,
  Check,
  Clock,
  Dumbbell,
  Flame,
  Pause,
  Play,
  Repeat,
  SkipForward,
  Target,
  Trophy,
  Weight,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

// URL base para las imágenes de ejercicios desde Supabase Storage
const EXERCISE_IMAGES_BASE_URL = process.env.NEXT_PUBLIC_STATICS_IMAGES;

const buildImageUrl = (gifUrl: string) => {
  if (!gifUrl || !EXERCISE_IMAGES_BASE_URL) return null;
  const cleanBase = EXERCISE_IMAGES_BASE_URL.replace(/\/$/, "");
  const cleanFileName = gifUrl.replace(/^\//, "");
  return `${cleanBase}/${cleanFileName}`;
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

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

// Detalle de ejercicio devuelto por getPlanExercises (item de exercises[dayLetter])
interface ExerciseDetail {
  block_index: number;
  gif_url?: string | null;
  equipment?: string | null;
  instructions?: string | null;
  exercise_details?: {
    id?: string;
    name?: string;
    equipment?: string | null;
    category?: string | null;
    primary_muscles?: string[] | null;
    gif_url?: string | null;
  };
}

// Estructura unificada para fetch real y fallback
interface ExercisesWithDetails {
  exercises: Record<string, ExerciseDetail[]>;
}

// Estado persistido de la sesión en localStorage
interface PersistedSession {
  phase: "warmup" | "exercise" | "rest" | "completed";
  timer: number;
  restTotal: number;
  currentExerciseIndex: number;
  currentSetIndex: number;
  isLongRest: boolean;
  workoutLogs: WorkoutLog[];
  sessionId: string;
}

const sessionStorageKey = (planId: string, day: string) =>
  `cf-workout-session:${planId}:${day}`;

/* ====================== SESIÓN · CALENTAMIENTO ====================== */
function WarmupStep({
  warmupTime,
  total,
  isPaused,
  onPauseToggle,
  onSkip,
  onExit,
  t,
}: {
  warmupTime: number;
  total: number;
  isPaused: boolean;
  onComplete: () => void;
  onPauseToggle: () => void;
  onSkip: () => void;
  onExit: () => void;
  t: TFunction;
}) {
  const value = total > 0 ? (warmupTime / total) * 100 : 0;
  return (
    <div className="cf-screen relative flex flex-col" style={{ minHeight: "calc(100dvh - 140px)" }}>
      <div className="container mx-auto max-w-xl px-5 pt-4 flex flex-col flex-1">
        <div className="flex justify-between items-center pt-2 mb-2">
          <span className="cf-chip cf-chip-amber">
            <Flame size={12} fill="currentColor" />
            {t("session.warmup", "Calentamiento")}
          </span>
          <button
            onClick={onExit}
            className="cf-icon-tile bg-surface-2 border border-border"
            style={{ width: 36, height: 36 }}
            aria-label={t("session.exit", "Salir")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 gap-1.5 py-8">
          <Ring value={value} size={228} stroke={16} gradient="amber">
            <div className="cf-num" style={{ fontSize: 56, color: "var(--txt)" }}>
              {formatTime(warmupTime)}
            </div>
            <div className="cf-muted text-[13px] font-semibold mt-0.5">
              {t("session.preparing", "preparando")}
            </div>
          </Ring>
          <div className="cf-h2 text-[19px] mt-6">{t("session.get_ready", "Prepárate para entrenar")}</div>
          <div className="cf-muted text-[13.5px] text-center max-w-[250px] leading-relaxed">
            {t(
              "session.warmup_desc",
              "Activa la musculatura y eleva tu temperatura corporal antes de empezar."
            )}
          </div>
        </div>

        <div className="flex gap-3 pb-6">
          <button className="cf-btn cf-btn-ghost flex-1" onClick={onPauseToggle}>
            {isPaused ? <Play size={17} /> : <Pause size={17} />}
            {isPaused ? t("session.resume", "Continuar") : t("session.pause", "Pausar")}
          </button>
          <button className="cf-btn cf-btn-primary flex-1" onClick={onSkip}>
            {t("session.skip", "Saltar")}
            <SkipForward size={17} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================== SESIÓN · EJERCICIO ====================== */
function ExerciseLogField({
  label,
  value,
  onChange,
  placeholder,
  step,
  min,
  max,
}: {
  label: string;
  value: number | "";
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className="cf-card-solid flex-1" style={{ padding: "11px 12px", borderRadius: 14 }}>
      <div className="cf-muted text-[10.5px] font-semibold mb-1">{label}</div>
      <input
        type="number"
        inputMode="numeric"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="cf-num bg-transparent outline-none w-full"
        style={{ fontSize: 20, color: "var(--txt)" }}
      />
    </div>
  );
}

function ExerciseStep({
  currentExercise,
  currentSetIndex,
  currentLog,
  onCompleteSet,
  onStartRest,
  onLogChange,
  exerciseDetails,
  t,
}: {
  currentExercise: ExerciseBlock;
  currentSetIndex: number;
  currentLog: Partial<WorkoutLog>;
  onCompleteSet: () => void;
  onStartRest: () => void;
  onLogChange: (log: Partial<WorkoutLog>) => void;
  exerciseDetails?: ExerciseDetail;
  t: TFunction;
}) {
  const gif = exerciseDetails?.gif_url ?? exerciseDetails?.exercise_details?.gif_url;
  const img = gif ? buildImageUrl(gif) : null;
  const equipment = exerciseDetails?.equipment ?? exerciseDetails?.exercise_details?.equipment;
  const targets: [React.ElementType, string, string, string][] = [
    [Repeat, `${currentExercise.reps[0]}–${currentExercise.reps[1]}`, t("session.reps", "Reps"), "var(--primary)"],
    [Target, `${currentSetIndex + 1}/${currentExercise.sets}`, t("session.set", "Serie"), "var(--cyan)"],
    [Clock, `${currentExercise.rest_sec}s`, t("session.rest_label", "Descanso"), "var(--mint)"],
  ];
  return (
    <div className="px-5">
      {/* media */}
      <div
        className="cf-eximg flex items-center justify-center mb-4 overflow-hidden"
        style={{ height: "min(42vh, 300px)", borderRadius: 20 }}
      >
        {img ? (
          <img
            src={img}
            alt={currentExercise.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder-exercise.svg";
            }}
          />
        ) : (
          <Dumbbell size={48} color="rgba(255,255,255,0.85)" />
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="cf-h2 text-[21px]">{currentExercise.name}</div>
          {equipment && (
            <div className="cf-muted text-[12.5px] font-semibold mt-0.5">
              {equipment}
            </div>
          )}
        </div>
        <span className="cf-chip cf-chip-brand" style={{ fontSize: 13, padding: "8px 13px" }}>
          {t("session.set", "Serie")} {currentSetIndex + 1} / {currentExercise.sets}
        </span>
      </div>

      {/* targets */}
      <div className="flex gap-2.5 mb-4">
        {targets.map(([Icon, val, lbl, color], i) => (
          <div key={i} className="cf-card flex-1 text-center" style={{ padding: "12px 8px", borderRadius: 16 }}>
            <div className="flex justify-center mb-1.5" style={{ color }}>
              <Icon size={17} />
            </div>
            <div className="cf-num text-[19px]">{val}</div>
            <div className="cf-muted text-[10.5px] mt-px">{lbl}</div>
          </div>
        ))}
      </div>

      {/* log inputs */}
      <div className="flex gap-2.5 mb-3.5">
        <ExerciseLogField
          label={t("session.reps", "Reps")}
          value={currentLog.actualReps ?? ""}
          min="0"
          max="50"
          placeholder="0"
          onChange={(v) => onLogChange({ ...currentLog, actualReps: parseInt(v) || 0 })}
        />
        <ExerciseLogField
          label={t("session.weight_kg", "Peso kg")}
          value={currentLog.weight ?? ""}
          min="0"
          step="0.5"
          placeholder="0"
          onChange={(v) => onLogChange({ ...currentLog, weight: parseFloat(v) || undefined })}
        />
        <ExerciseLogField
          label={t("session.rpe", "RPE")}
          value={currentLog.rpe ?? ""}
          min="1"
          max="10"
          placeholder="8"
          onChange={(v) => onLogChange({ ...currentLog, rpe: parseFloat(v) || undefined })}
        />
      </div>

      {/* cues */}
      {currentExercise.cues && currentExercise.cues.length > 0 && (
        <div className="cf-card mb-3.5" style={{ padding: 14, borderRadius: 16 }}>
          <div className="cf-eyebrow mb-2">{t("session.key_points", "Puntos clave")}</div>
          <ul className="flex flex-col gap-1">
            {currentExercise.cues.map((cue, i) => (
              <li key={i} className="flex items-start text-[13px] cf-txt2">
                <span style={{ color: "var(--primary)", marginRight: 8 }}>•</span>
                {cue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <button className="cf-btn cf-btn-ghost" style={{ flex: "0 0 auto", padding: "15px 18px" }} onClick={onStartRest}>
          <Clock size={18} />
        </button>
        <button
          className="cf-btn cf-btn-mint flex-1"
          onClick={onCompleteSet}
          disabled={!currentLog.actualReps}
          style={{ opacity: currentLog.actualReps ? 1 : 0.5 }}
        >
          <Check size={18} strokeWidth={2.6} />
          {t("session.complete_set", "Completar serie")}
        </button>
      </div>
    </div>
  );
}

/* ====================== SESIÓN · DESCANSO ====================== */
function RestStep({
  restTime,
  total,
  isPaused,
  onPauseToggle,
  onSkip,
  onAdjust,
  isLongRest,
  nextExercise,
  nextExerciseDetails,
  t,
}: {
  restTime: number;
  total: number;
  isPaused: boolean;
  onComplete: () => void;
  onPauseToggle: () => void;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
  isLongRest?: boolean;
  nextExercise?: ExerciseBlock;
  nextExerciseDetails?: ExerciseDetail;
  t: TFunction;
}) {
  const value = total > 0 ? (restTime / total) * 100 : 0;
  const nextGif = nextExerciseDetails?.gif_url ?? nextExerciseDetails?.exercise_details?.gif_url;
  const img = nextGif ? buildImageUrl(nextGif) : null;
  return (
    <div className="cf-screen relative flex flex-col" style={{ minHeight: "calc(100dvh - 140px)" }}>
      <div className="container mx-auto max-w-xl px-5 pt-4 flex flex-col flex-1">
        <div className="flex justify-between items-center pt-2">
          <span className="cf-chip cf-chip-cyan">
            <Clock size={12} />
            {isLongRest
              ? t("session.rest_between_exercises", "Descanso entre ejercicios")
              : t("session.rest_label", "Descanso")}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 py-6" style={{ flex: "0 0 auto", marginTop: 12 }}>
          <Ring value={value} size={216} stroke={15} gradient="cyan">
            <div className="cf-num" style={{ fontSize: 54, color: "var(--txt)" }}>
              {formatTime(restTime)}
            </div>
            <div className="cf-muted text-[13px] font-semibold">{t("session.recover", "recupera")}</div>
          </Ring>
          <div className="flex gap-2.5 mt-5">
            <button className="cf-btn cf-btn-ghost cf-btn-sm" onClick={() => onAdjust(-15)}>−15s</button>
            <button className="cf-btn cf-btn-ghost cf-btn-sm" onClick={() => onAdjust(15)}>+15s</button>
          </div>
        </div>

        {/* next up */}
        {nextExercise && (
          <div className="cf-card flex items-center gap-3.5 mt-1" style={{ padding: 14, borderRadius: 20 }}>
            <div
              className="cf-eximg flex items-center justify-center shrink-0 overflow-hidden"
              style={{ width: 52, height: 52, borderRadius: 14 }}
            >
              {img ? (
                <img src={img} alt={nextExercise.name} className="w-full h-full object-cover" />
              ) : (
                <Dumbbell size={22} color="rgba(255,255,255,0.85)" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="cf-eyebrow text-[10px]">{t("session.up_next", "A continuación")}</div>
              <div className="font-bold text-[15.5px] mt-0.5 truncate">{nextExercise.name}</div>
              <div className="cf-muted text-[12px] font-semibold mt-px">
                {t("session.series_x_reps", "{{sets}} series × {{min}}–{{max}}", {
                  sets: nextExercise.sets,
                  min: nextExercise.reps[0],
                  max: nextExercise.reps[1],
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />
        <div className="flex gap-3 pb-6">
          <button className="cf-btn cf-btn-ghost flex-1" onClick={onPauseToggle}>
            {isPaused ? <Play size={17} /> : <Pause size={17} />}
            {isPaused ? t("session.resume", "Continuar") : t("session.pause", "Pausar")}
          </button>
          <button className="cf-btn cf-btn-cyan flex-1" onClick={onSkip}>
            {t("session.skip_rest", "Saltar descanso")}
            <SkipForward size={17} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================== SESIÓN · RESUMEN ====================== */
function CompletedStep({
  completedSets,
  totalSets,
  workoutLogs,
  onComplete,
  onExit,
  t,
}: {
  completedSets: number;
  totalSets: number;
  workoutLogs: WorkoutLog[];
  planDay: PlanDay;
  onComplete: () => void;
  onExit: () => void;
  t: TFunction;
}) {
  const progress = (completedSets / totalSets) * 100;
  const totalVolume = workoutLogs.reduce((sum, log) => sum + log.actualReps * (log.weight || 0), 0);
  const rpeLogs = workoutLogs.filter((log) => log.rpe);
  const avgRPE = rpeLogs.length
    ? workoutLogs.reduce((sum, log) => sum + (log.rpe || 0), 0) / rpeLogs.length
    : 0;

  const metrics: [React.ElementType, string, string, string][] = [
    [Repeat, `${completedSets}/${totalSets}`, t("session.series", "Series"), "var(--mint)"],
    [Weight, `${totalVolume.toFixed(0)} kg`, t("session.volume", "Volumen"), "var(--cyan)"],
    [Activity, avgRPE ? avgRPE.toFixed(1) : "—", t("session.avg_rpe", "RPE medio"), "var(--primary)"],
    [Flame, `${Math.round(progress)}%`, t("session.progress", "Progreso"), "var(--amber)"],
  ];

  return (
    <div className="container mx-auto max-w-xl px-5 pt-6 pb-6">
      <div className="flex flex-col items-center text-center mb-5">
        <div
          className="rounded-full flex items-center justify-center mb-4"
          style={{ width: 84, height: 84, background: "var(--grad-mint)", boxShadow: "var(--glow-mint)" }}
        >
          <Check size={44} color="#06231A" strokeWidth={3} />
        </div>
        <div className="cf-h1 text-[26px]">{t("session.session_completed", "¡Sesión completada!")}</div>
        <div className="cf-muted text-[13.5px] mt-1.5">
          {t("session.summary_subtitle", "Resumen de tu entrenamiento")}
        </div>
      </div>

      {/* metrics grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {metrics.map(([Icon, val, lbl, color], i) => (
          <div key={i} className="cf-card" style={{ padding: 16, borderRadius: 18 }}>
            <div style={{ color, marginBottom: 9 }}>
              <Icon size={20} fill={Icon === Flame ? "currentColor" : "none"} />
            </div>
            <div className="cf-num text-[25px]">{val}</div>
            <div className="cf-muted text-[11.5px] font-semibold mt-0.5">{lbl}</div>
          </div>
        ))}
      </div>

      {/* motivación */}
      <div
        className="cf-card flex items-center gap-3.5 mb-5"
        style={{ padding: "14px 16px", borderRadius: 18, border: "1px solid rgba(255,178,62,0.35)", background: "rgba(255,178,62,0.08)" }}
      >
        <div className="cf-icon-tile" style={{ background: "var(--grad-amber)", color: "#3A2400" }}>
          <Trophy size={22} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-[14.5px]">{t("session.good_job", "¡Buen trabajo!")}</div>
          <div className="cf-muted text-[12px] font-semibold mt-0.5">
            {t("session.sets_logged", "{{count}} series registradas", { count: workoutLogs.length })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg" onClick={onComplete}>
          {t("session.view_history", "Ver historial")}
        </button>
        <button className="cf-btn cf-btn-ghost cf-btn-block" onClick={onExit}>
          {t("session.exit", "Salir")}
        </button>
      </div>
    </div>
  );
}

/* ====================== STEPPER PRINCIPAL ====================== */
export function WorkoutSession({
  planDay,
  planId,
  onExit,
}: {
  planDay: PlanDay;
  planId: string;
  onComplete: () => void;
  onExit: () => void;
}) {
  const { t } = useTranslation("common");
  const router = useRouter();

  const [phase, setPhase] = useState<"warmup" | "exercise" | "rest" | "completed">("warmup");
  const [timer, setTimer] = useState(15);
  const [restTotal, setRestTotal] = useState(15);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLongRest, setIsLongRest] = useState(false);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [currentLog, setCurrentLog] = useState<Partial<WorkoutLog>>({});
  const [sessionId, setSessionId] = useState<string>("");
  const [exercisesWithDetails, setExercisesWithDetails] = useState<ExercisesWithDetails | null>(null);
  const [, setLoading] = useState(true);
  // Feedback no bloqueante (toast) y confirmación de salida
  const [toast, setToast] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Indica si ya intentamos restaurar el estado persistido (evita re-restaurar)
  const [restored, setRestored] = useState(false);

  const currentExercise = planDay.blocks[currentExerciseIndex];
  const totalSets = planDay.blocks.reduce((total, block) => total + block.sets, 0);
  const completedSets = workoutLogs.filter((log) => log.completed).length;
  const progress = (completedSets / totalSets) * 100;

  // Construir estructura de fallback unificada (misma forma que getPlanExercises)
  const buildFallback = useCallback((): ExercisesWithDetails => {
    const byDay: Record<string, ExerciseDetail[]> = {};
    if (planDay.blocks && planDay.blocks.length > 0) {
      byDay[planDay.day] = planDay.blocks.map((block, index) => ({
        block_index: index,
        gif_url: null,
        equipment: null,
        instructions: null,
      }));
    }
    return { exercises: byDay };
  }, [planDay]);

  // Restaurar estado persistido al montar (si existe para este plan + día)
  useEffect(() => {
    if (restored) return;
    setRestored(true);
    try {
      const raw = window.localStorage.getItem(sessionStorageKey(planId, planDay.day));
      if (raw) {
        const saved = JSON.parse(raw) as PersistedSession;
        setPhase(saved.phase);
        setTimer(saved.timer);
        setRestTotal(saved.restTotal);
        setCurrentExerciseIndex(saved.currentExerciseIndex);
        setCurrentSetIndex(saved.currentSetIndex);
        setIsLongRest(saved.isLongRest);
        setWorkoutLogs(saved.workoutLogs ?? []);
        setSessionId(saved.sessionId);
        setIsPaused(true);
        setToast(t("session.resumed_notice", "Se restauró tu sesión anterior"));
      }
    } catch {
      // estado corrupto: ignorar y empezar limpio
    }
  }, [restored, planId, planDay.day, t]);

  // Persistir estado de la sesión (excepto cuando ya está completada)
  useEffect(() => {
    if (!restored) return;
    if (phase === "completed") return;
    try {
      const payload: PersistedSession = {
        phase,
        timer,
        restTotal,
        currentExerciseIndex,
        currentSetIndex,
        isLongRest,
        workoutLogs,
        sessionId,
      };
      window.localStorage.setItem(
        sessionStorageKey(planId, planDay.day),
        JSON.stringify(payload)
      );
    } catch {
      // cuota llena u otro error: no es crítico
    }
  }, [
    restored,
    phase,
    timer,
    restTotal,
    currentExerciseIndex,
    currentSetIndex,
    isLongRest,
    workoutLogs,
    sessionId,
    planId,
    planDay.day,
  ]);

  const clearPersistedSession = useCallback(() => {
    try {
      window.localStorage.removeItem(sessionStorageKey(planId, planDay.day));
    } catch {
      // ignorar
    }
  }, [planId, planDay.day]);

  // Auto-ocultar el toast tras unos segundos
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  // Obtener ejercicios reales con imágenes desde Supabase
  useEffect(() => {
    const fetchExerciseDetails = async () => {
      if (planId && !exercisesWithDetails) {
        try {
          setLoading(true);
          const exercisesData = await supabaseClient.getPlanExercises(planId);
          if (exercisesData && exercisesData.exercises) {
            setExercisesWithDetails(exercisesData as ExercisesWithDetails);
          } else {
            setExercisesWithDetails(buildFallback());
          }
        } catch {
          setExercisesWithDetails(buildFallback());
        } finally {
          setLoading(false);
        }
      }
    };
    fetchExerciseDetails();
  }, [planId, exercisesWithDetails, buildFallback]);

  // Generar session_id único al iniciar el entrenamiento
  useEffect(() => {
    if (!sessionId) {
      setSessionId(crypto.randomUUID());
    }
  }, [sessionId]);

  // Pre-llenar repeticiones al cambiar de ejercicio/serie
  useEffect(() => {
    if (currentExercise && phase === "exercise") {
      const maxReps = currentExercise.reps[1];
      setCurrentLog((prev) => ({ ...prev, actualReps: maxReps }));
    }
  }, [currentExerciseIndex, currentSetIndex, phase, currentExercise]);

  // Timer único para calentamiento y descanso
  useEffect(() => {
    if ((phase === "warmup" || phase === "rest") && timer > 0 && !isPaused) {
      const interval = setTimeout(() => setTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(interval);
    } else if (timer === 0) {
      if (phase === "warmup") setPhase("exercise");
      else if (phase === "rest") setPhase("exercise");
    }
  }, [timer, phase, isPaused]);

  const handleWarmupComplete = () => {
    setPhase("exercise");
    setIsPaused(false);
  };

  const handleWarmupSkip = () => setTimer(0);

  const handleStartRest = useCallback(() => {
    setTimer(currentExercise.rest_sec);
    setRestTotal(currentExercise.rest_sec);
    setPhase("rest");
    setIsLongRest(false);
    setIsPaused(false);
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

    setWorkoutLogs((prev) => [...prev, newLog]);

    try {
      await supabaseClient.saveLog({
        exercise_name: newLog.exerciseName,
        set_index: newLog.setIndex,
        target_reps: newLog.targetReps,
        actual_reps: newLog.actualReps,
        weight: newLog.weight,
        rpe: newLog.rpe,
        notes: newLog.notes,
        plan_day_id: planDay.day,
        session_id: sessionId,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Guardado fallido: avisar de forma no bloqueante y continuar
      setToast(
        t(
          "session.save_error",
          "No se pudo guardar tu última serie. Puedes continuar; lo reintentaremos."
        )
      );
    }

    setCurrentLog({});

    if (currentSetIndex + 1 < currentExercise.sets) {
      setCurrentSetIndex(currentSetIndex + 1);
      handleStartRest();
    } else {
      if (currentExerciseIndex + 1 < planDay.blocks.length) {
        // Descanso entre ejercicios: partimos del rest_sec del siguiente bloque
        // pero lo acotamos a una transición de 45–60s (la pausa entre series
        // completas no necesita ser tan larga como el descanso intra-serie).
        const nextBlock = planDay.blocks[currentExerciseIndex + 1];
        const rawRest = nextBlock?.rest_sec || currentExercise.rest_sec || 60;
        const betweenExerciseRest = Math.min(60, Math.max(45, rawRest));
        setTimer(betweenExerciseRest);
        setRestTotal(betweenExerciseRest);
        setPhase("rest");
        setIsLongRest(true);
        setIsPaused(false);
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setCurrentSetIndex(0);
      } else {
        clearPersistedSession();
        setPhase("completed");
      }
    }
  };

  const handleSkipRest = () => {
    setPhase("exercise");
    setIsPaused(false);
  };

  const handleRestComplete = () => {
    setPhase("exercise");
    setIsPaused(false);
  };

  const handleAdjustRest = (delta: number) => {
    setTimer((prev) => Math.max(0, prev + delta));
    setRestTotal((prev) => Math.max(1, prev + delta));
  };

  const handleShowHistory = () => {
    clearPersistedSession();
    router.push("/workout-history");
  };

  // Salida del resumen final (sesión ya completada): limpiar y salir
  const handleCompletedExit = () => {
    clearPersistedSession();
    onExit();
  };

  // Botón "X": confirmar si hay progreso, de lo contrario salir directo
  const handleExitRequest = () => {
    if (completedSets > 0) {
      setShowExitConfirm(true);
    } else {
      clearPersistedSession();
      onExit();
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    clearPersistedSession();
    onExit();
  };

  const currentExerciseDetails = exercisesWithDetails?.exercises?.[planDay.day]?.find(
    (ex) => ex.block_index === currentExerciseIndex
  );

  const renderPhase = () => {
    switch (phase) {
      case "warmup":
        return (
          <WarmupStep
            warmupTime={timer}
            total={15}
            isPaused={isPaused}
            onComplete={handleWarmupComplete}
            onPauseToggle={() => setIsPaused(!isPaused)}
            onSkip={handleWarmupSkip}
            onExit={handleExitRequest}
            t={t}
          />
        );

      case "exercise":
        return (
          <div className="container mx-auto max-w-xl pt-4">
            {/* progress header */}
            <div className="px-5">
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-bold text-[15px]">
                  {t("session.day_focus", "{{focus}} · Día {{day}}", {
                    focus: planDay.focus,
                    day: planDay.day,
                  })}
                </span>
                <button
                  onClick={handleExitRequest}
                  className="cf-icon-tile bg-surface-2 border border-border"
                  style={{ width: 36, height: 36 }}
                  aria-label={t("session.exit", "Salir")}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="cf-bar-track flex-1">
                  <div className="cf-bar-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="cf-num text-[12px] text-muted">
                  {completedSets}/{totalSets}
                </span>
              </div>
            </div>

            <ExerciseStep
              currentExercise={currentExercise}
              currentSetIndex={currentSetIndex}
              currentLog={currentLog}
              onCompleteSet={handleCompleteSet}
              onStartRest={handleStartRest}
              onLogChange={setCurrentLog}
              exerciseDetails={currentExerciseDetails}
              t={t}
            />
          </div>
        );

      case "rest": {
        const nextExercise = planDay.blocks[currentExerciseIndex];
        const nextExerciseDetails = exercisesWithDetails?.exercises?.[planDay.day]?.find(
          (ex) => ex.block_index === currentExerciseIndex
        );
        return (
          <RestStep
            restTime={timer}
            total={restTotal}
            isPaused={isPaused}
            onComplete={handleRestComplete}
            onPauseToggle={() => setIsPaused(!isPaused)}
            onSkip={handleSkipRest}
            onAdjust={handleAdjustRest}
            isLongRest={isLongRest}
            nextExercise={nextExercise}
            nextExerciseDetails={nextExerciseDetails}
            t={t}
          />
        );
      }

      case "completed":
        return (
          <CompletedStep
            completedSets={completedSets}
            totalSets={totalSets}
            workoutLogs={workoutLogs}
            planDay={planDay}
            onComplete={handleShowHistory}
            onExit={handleCompletedExit}
            t={t}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {renderPhase()}

      {/* Toast no bloqueante (errores de guardado, restauración, etc.) */}
      {toast && (
        <div
          className="fixed left-1/2 z-50 -translate-x-1/2"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)", maxWidth: "92vw" }}
          role="status"
          aria-live="polite"
        >
          <button
            className="cf-card-solid flex items-center gap-2 text-left"
            onClick={() => setToast(null)}
            style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(255,178,62,0.35)" }}
          >
            <span className="text-[13px] cf-txt2">{toast}</span>
          </button>
        </div>
      )}

      {/* Confirmación de salida cuando hay progreso */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: "rgba(0,0,0,0.6)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="cf-card-solid w-full max-w-sm" style={{ padding: 20, borderRadius: 20 }}>
            <div className="cf-h2 text-[18px] mb-2">
              {t("session.exit_confirm_title", "¿Salir de la sesión?")}
            </div>
            <div className="cf-muted text-[13.5px] leading-relaxed mb-5">
              {t(
                "session.exit_confirm_body",
                "Tienes progreso sin terminar en esta sesión. Si sales ahora, se descartará el estado actual."
              )}
            </div>
            <div className="flex gap-3">
              <button
                className="cf-btn cf-btn-ghost flex-1"
                onClick={() => setShowExitConfirm(false)}
              >
                {t("session.exit_confirm_stay", "Quedarme")}
              </button>
              <button className="cf-btn cf-btn-primary flex-1" onClick={handleConfirmExit}>
                {t("session.exit_confirm_leave", "Salir")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
