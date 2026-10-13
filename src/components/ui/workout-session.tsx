"use client";
import { Ring } from "@/components/ui/ring";
import { CelebrationOverlay } from "@/components/ui/celebration-overlay";
import {
  detectNewAchievements,
  detectNewPRs,
  type Achievement,
  type LogEntry,
  type NewPR,
} from "@/lib/progress/records";
import { supabaseClient } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import {
  enqueueWorkoutLog,
  flushOutbox,
  newId,
  removeWorkoutLog,
  usePendingWorkoutLogs,
} from "@/lib/workout-outbox";
import { formatReps } from "@/lib/plan-display";
import {
  isSessionFresh,
  sessionStorageKey,
  setSessionActive,
} from "@/lib/session-resume";
import { playRestEndCue } from "@/lib/feedback";
import { ExerciseAnimation, ExerciseThumb } from "@/components/ui/exercise-image";
import {
  Activity,
  Check,
  Clock,
  Dumbbell,
  Flame,
  Info,
  Flag,
  Medal,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  SkipForward,
  TrendingUp,
  Trophy,
  Undo2,
  Weight,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";


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
  // Id de la fila en workout_logs (lo genera el cliente): permite deshacerla.
  id?: string;
  // Posición del ejercicio en el día: a dónde volver al deshacer.
  exerciseIndex?: number;
}

// Fila de workout_logs tal como la devuelve Supabase (snake_case)
interface HistoryLog {
  exercise_name: string;
  session_id: string;
  set_index: number;
  actual_reps: number;
  weight?: number | null;
  rpe?: number | null;
  created_at?: string;
}

// Resultado de la progresión por reglas (determinista, sin IA)
type ProgressionKind =
  | "first" // sin historial previo de este ejercicio
  | "increase_weight" // fue fácil y hay carga → subir kg
  | "increase_reps" // fue fácil sin carga (peso corporal) → más reps
  | "hold" // en el punto justo → mantener y sumar 1 rep
  | "deload"; // demasiado duro → consolidar el peso

interface Progression {
  kind: ProgressionKind;
  last?: { weight?: number; reps: number; rpe?: number };
  suggestedWeight?: number;
  suggestedReps?: number;
}

// Incremento de carga sensato según el peso actual (saltos típicos de mancuerna/disco)
const weightIncrement = (w: number): number => (w >= 40 ? 5 : 2.5);

// Calcula la sugerencia de progresión a partir del historial real del usuario.
// Mira la última sesión previa de ESTE ejercicio y aplica reglas por RPE.
function computeProgression(
  priorLogs: HistoryLog[],
  exerciseName: string,
  repRange: [number, number]
): Progression {
  const [lo, hi] = repRange;
  // priorLogs viene ordenado por created_at desc (getLogs)
  const mine = priorLogs.filter((l) => l.exercise_name === exerciseName);
  if (mine.length === 0) return { kind: "first", suggestedReps: hi };

  // Series de la sesión más reciente de este ejercicio
  const latestSessionId = mine[0].session_id;
  const sessionSets = mine.filter((l) => l.session_id === latestSessionId);

  // Serie de trabajo representativa: la de mayor carga; si no hay cargas, la de menos
  // reps (la más exigente) para no sobreestimar en ejercicios de peso corporal.
  const withWeight = sessionSets.filter(
    (s) => typeof s.weight === "number" && (s.weight as number) > 0
  );
  let last: { weight?: number; reps: number; rpe?: number };
  if (withWeight.length) {
    const top = withWeight.reduce((a, b) =>
      (b.weight as number) > (a.weight as number) ? b : a
    );
    last = {
      weight: top.weight as number,
      reps: top.actual_reps,
      rpe: top.rpe ?? undefined,
    };
  } else {
    const worst = sessionSets.reduce((a, b) =>
      b.actual_reps < a.actual_reps ? b : a
    );
    last = { reps: worst.actual_reps, rpe: worst.rpe ?? undefined };
  }

  const rpe = last.rpe;

  // Sin RPE no podemos juzgar el esfuerzo: mantenemos carga y mostramos el dato.
  if (rpe == null) {
    return { kind: "hold", last, suggestedWeight: last.weight, suggestedReps: hi };
  }

  if (rpe <= 6) {
    if (last.weight != null) {
      return {
        kind: "increase_weight",
        last,
        suggestedWeight: last.weight + weightIncrement(last.weight),
        suggestedReps: lo,
      };
    }
    return { kind: "increase_reps", last, suggestedReps: last.reps + 2 };
  }

  if (rpe >= 9) {
    return {
      kind: "deload",
      last,
      suggestedWeight: last.weight,
      suggestedReps: Math.max(lo, last.reps),
    };
  }

  // RPE 7–8: en el punto justo → mantener carga e intentar sumar 1 rep dentro del rango
  return {
    kind: "hold",
    last,
    suggestedWeight: last.weight,
    suggestedReps: Math.min(last.reps + 1, hi),
  };
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
  // Última vez que se guardó (ms). Sin esto, o caducada, la sesión no se reanuda.
  savedAt?: number;
}


// Topes de lo que se puede registrar en una serie (evita valores imposibles por error de tecleo)
const MAX_REPS = 200;
const MAX_WEIGHT_KG = 500;

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
// Convierte lo tecleado en número; vacío o no numérico → undefined.
const parseNumericText = (text: string): number | undefined => {
  if (text === "") return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
};

function ExerciseLogField({
  label,
  value,
  onChange,
  placeholder,
  decimal,
  info,
}: {
  label: string;
  value: number | "";
  onChange: (v: string) => void;
  placeholder?: string;
  // Permite decimales (peso). La coma se acepta y se normaliza a punto.
  decimal?: boolean;
  info?: string;
}) {
  const [showInfo, setShowInfo] = useState(false);
  // Texto propio del campo: un input controlado por número no deja escribir "62,".
  const [text, setText] = useState(value === "" ? "" : String(value));
  useEffect(() => {
    setText((prev) =>
      parseNumericText(prev) === (value === "" ? undefined : value)
        ? prev
        : value === ""
          ? ""
          : String(value)
    );
  }, [value]);

  const handleChange = (raw: string) => {
    let clean = raw.replace(",", ".").replace(decimal ? /[^0-9.]/g : /[^0-9]/g, "");
    const dot = clean.indexOf(".");
    if (dot !== -1) {
      clean = clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, "");
    }
    setText(clean);
    onChange(clean);
  };

  return (
    <div className="cf-card-solid flex-1 relative" style={{ padding: "11px 12px", borderRadius: 14 }}>
      <div className="cf-muted text-[10.5px] font-semibold mb-1 flex items-center gap-1">
        <span>{label}</span>
        {info && (
          <button
            type="button"
            onClick={() => setShowInfo((s) => !s)}
            aria-label={info}
            aria-expanded={showInfo}
            className="inline-flex items-center justify-center shrink-0"
            // Icono pequeño, zona táctil de 36 px (el margen negativo no mueve el diseño).
            style={{ width: 36, height: 36, margin: "-11px -8px -11px -10px", color: "var(--muted)" }}
          >
            <Info size={13} />
          </button>
        )}
      </div>
      <input
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        pattern={decimal ? "[0-9]*[.,]?[0-9]*" : "[0-9]*"}
        autoComplete="off"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        placeholder={placeholder}
        className="cf-num bg-transparent outline-none w-full"
        style={{
          fontSize: 20,
          color: "var(--txt)",
          borderBottom: "1.5px solid var(--border-2)",
          paddingBottom: 2,
        }}
      />
      {info && showInfo && (
        <div
          className="cf-card-solid"
          onClick={() => setShowInfo(false)}
          style={{
            // Se abre hacia arriba y a lo ancho: hacia abajo tapaba "Completar serie".
            position: "absolute",
            bottom: "100%",
            right: 0,
            width: "min(270px, 78vw)",
            marginBottom: 6,
            background: "var(--surface)",
            padding: "10px 12px",
            borderRadius: 12,
            zIndex: 30,
            fontSize: 12,
            lineHeight: 1.45,
            color: "var(--txt-2)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
          }}
        >
          {info}
        </div>
      )}
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
  progression,
  t,
}: {
  currentExercise: ExerciseBlock;
  currentSetIndex: number;
  currentLog: Partial<WorkoutLog>;
  onCompleteSet: () => void;
  onStartRest: () => void;
  onLogChange: (log: Partial<WorkoutLog>) => void;
  exerciseDetails?: ExerciseDetail;
  progression?: Progression | null;
  t: TFunction;
}) {
  const gif = exerciseDetails?.gif_url ?? exerciseDetails?.exercise_details?.gif_url;
  const equipment = exerciseDetails?.equipment ?? exerciseDetails?.exercise_details?.equipment;
  const targets: [React.ElementType, string, string, string][] = [
    [Repeat, formatReps(currentExercise.reps), t("session.reps", "Reps"), "var(--primary)"],
    [Clock, `${currentExercise.rest_sec}s`, t("session.rest_label", "Descanso"), "var(--mint)"],
  ];

  // Pista de progresión por reglas (solo si hay historial previo del ejercicio)
  const showProg = !!progression && progression.kind !== "first" && !!progression.last;
  let progRecommendation = "";
  let progLastSummary = "";
  if (showProg && progression?.last) {
    const last = progression.last;
    const parts: string[] = [];
    if (last.weight != null) parts.push(`${last.weight} kg`);
    parts.push(`${last.reps} ${t("session.reps_short", "reps")}`);
    progLastSummary =
      parts.join(" × ") + (last.rpe != null ? ` · RPE ${last.rpe}` : "");
    switch (progression.kind) {
      case "increase_weight":
        progRecommendation = t(
          "session.prog_increase_weight",
          "Te tocó suave — sube a {{weight}} kg",
          { weight: progression.suggestedWeight }
        );
        break;
      case "increase_reps":
        progRecommendation = t(
          "session.prog_increase_reps",
          "Te tocó suave — intenta {{reps}} reps",
          { reps: progression.suggestedReps }
        );
        break;
      case "deload":
        progRecommendation = t(
          "session.prog_deload",
          "Fue muy duro — consolida este peso"
        );
        break;
      case "hold":
      default:
        progRecommendation = t(
          "session.prog_hold",
          "En el punto justo — repite e intenta sumar 1 rep"
        );
        break;
    }
  }

  return (
    <div className="px-5">
      {/* media */}
      <div
        className="cf-eximg flex items-center justify-center mb-4 overflow-hidden"
        style={{ height: "min(26vh, 210px)", borderRadius: 20 }}
      >
        {gif ? (
          <ExerciseAnimation gif={gif} alt={currentExercise.name} />
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

      {/* objetivo de la serie, en una línea: deja los campos a la vista sin scroll */}
      <div className="flex items-center gap-4 mb-3.5 text-[13px] font-semibold cf-txt2">
        {targets.map(([Icon, val, lbl, color], i) => (
          <span key={i} className="flex items-center gap-1.5">
            <Icon size={15} style={{ color }} />
            <span className="cf-num">{val}</span>
            <span className="cf-muted text-[11.5px]">{lbl}</span>
          </span>
        ))}
      </div>

      {/* log inputs */}
      <div className="flex gap-2.5 mb-3.5">
        <ExerciseLogField
          label={t("session.reps", "Reps")}
          value={currentLog.actualReps ?? ""}
          placeholder="0"
          onChange={(v) => {
            const n = parseNumericText(v);
            onLogChange({
              ...currentLog,
              actualReps: n === undefined ? undefined : Math.min(MAX_REPS, n),
            });
          }}
        />
        <ExerciseLogField
          label={t("session.weight_kg", "Peso kg")}
          value={currentLog.weight ?? ""}
          decimal
          placeholder="0"
          onChange={(v) => {
            const n = parseNumericText(v);
            onLogChange({
              ...currentLog,
              weight: n ? Math.min(MAX_WEIGHT_KG, n) : undefined,
            });
          }}
        />
        <ExerciseLogField
          label={t("session.rpe", "RPE")}
          info={t(
            "session.rpe_info",
            "Esfuerzo percibido (1–10): qué tan dura sentiste la serie. 10 = al fallo, no podías una rep más; 8 = te quedaban ~2."
          )}
          value={currentLog.rpe ?? ""}
          placeholder="8"
          onChange={(v) => {
            // La columna rpe es INTEGER con CHECK 1–10: fuera de eso falla la serie entera.
            const n = parseNumericText(v);
            onLogChange({
              ...currentLog,
              rpe: n ? Math.min(10, Math.max(1, Math.round(n))) : undefined,
            });
          }}
        />
      </div>

      {/* progresión por reglas (bajo los campos: no debe empujarlos fuera de pantalla) */}
      {showProg && (
        <div
          className="cf-card mb-3.5 flex items-start gap-2.5"
          style={{ padding: "11px 13px", borderRadius: 14 }}
        >
          <span style={{ color: "var(--mint)", marginTop: 1 }} className="shrink-0">
            <TrendingUp size={16} />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-bold cf-txt2">{progRecommendation}</div>
            <div className="cf-muted text-[11.5px] mt-0.5">
              {t("session.prog_last_label", "La vez pasada")}: {progLastSummary}
            </div>
          </div>
        </div>
      )}

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

      {/* Acción principal siempre a la vista, sobre la navegación inferior */}
      <div
        className="sticky z-20 flex gap-3 mt-2 -mx-5 px-5 pt-3 pb-2 bottom-[calc(env(safe-area-inset-bottom,0px)+10px)]"
        style={{ background: "linear-gradient(to top, var(--bg) 70%, transparent)" }}
      >
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
  onExit,
  onUndo,
  isLongRest,
  nextExercise,
  nextExerciseDetails,
  t,
}: {
  onExit: () => void;
  // Deshacer la serie recién registrada (undefined = nada que deshacer).
  onUndo?: () => void;
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
          {/* Con la navegación oculta, el descanso también necesita su salida */}
          <button
            onClick={onExit}
            className="cf-icon-tile bg-surface-2 border border-border"
            style={{ width: 44, height: 44 }}
            aria-label={t("session.exit", "Salir")}
          >
            <X size={18} />
          </button>
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
              {nextGif ? (
                <ExerciseThumb gif={nextGif} alt={nextExercise.name} className="w-full h-full object-cover" />
              ) : (
                <Dumbbell size={22} color="rgba(255,255,255,0.85)" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="cf-eyebrow text-[10px]">{t("session.up_next", "A continuación")}</div>
              <div className="font-bold text-[15.5px] mt-0.5 truncate">{nextExercise.name}</div>
              <div className="cf-muted text-[12px] font-semibold mt-px">
                {t("session.series_x_reps", "{{sets}} series × {{reps}}", {
                  sets: nextExercise.sets,
                  reps: formatReps(nextExercise.reps),
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />
        {/* El error se suele ver justo aquí, nada más completar la serie */}
        {onUndo && (
          <button
            className="cf-muted flex items-center justify-center gap-1.5 text-[13px] font-semibold mx-auto mb-2"
            style={{ minHeight: 44, padding: "0 14px" }}
            onClick={onUndo}
          >
            <Undo2 size={15} />
            {t("session.undo_last_set", "Corregir la serie anterior")}
          </button>
        )}
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
  newPRs,
  newAchievements,
  pendingSync,
  onComplete,
  onExit,
  t,
}: {
  completedSets: number;
  totalSets: number;
  workoutLogs: WorkoutLog[];
  newPRs: NewPR[];
  newAchievements: Achievement[];
  pendingSync: number;
  planDay: PlanDay;
  onComplete: () => void;
  onExit: () => void;
  t: TFunction;
}) {
  const progress = (completedSets / totalSets) * 100;
  const fmtKg = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));
  const prLine = (pr: NewPR): string => {
    switch (pr.type) {
      case "weight":
        return t("progress.pr_line_weight", "{{exercise}} · {{value}} kg", {
          exercise: pr.exerciseName,
          value: fmtKg(pr.value),
        });
      case "e1rm":
        return t("progress.pr_line_1rm", "{{exercise}} · 1RM {{value}} kg", {
          exercise: pr.exerciseName,
          value: Math.round(pr.value),
        });
      case "reps":
      default:
        return t("progress.pr_line_reps", "{{exercise}} · {{value}} reps", {
          exercise: pr.exerciseName,
          value: pr.value,
        });
    }
  };
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
        <div className="cf-h1 text-[26px]">{completedSets >= totalSets
            ? t("session.session_completed", "¡Sesión completada!")
            : t("session.session_ended", "Sesión terminada")}</div>
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

      {/* nuevos récords */}
      {newPRs.length > 0 && (
        <div
          className="cf-card mb-4"
          style={{
            padding: "14px 16px",
            borderRadius: 18,
            border: "1px solid rgba(124,108,255,0.4)",
            background: "rgba(124,108,255,0.1)",
          }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <Trophy size={18} style={{ color: "var(--primary)" }} />
            <div className="font-bold text-[14.5px]">
              {t("progress.new_prs_title", "¡Nuevos récords!")}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {newPRs.map((pr, i) => (
              <div
                key={`${pr.exerciseName}-${i}`}
                className="flex items-center gap-2 text-[13px] font-semibold cf-txt2"
              >
                <span>🏆</span>
                {prLine(pr)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* logros desbloqueados */}
      {newAchievements.length > 0 && (
        <div
          className="cf-card mb-4"
          style={{
            padding: "14px 16px",
            borderRadius: 18,
            border: "1px solid rgba(255,178,62,0.4)",
            background: "rgba(255,178,62,0.1)",
          }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <Medal size={18} style={{ color: "var(--amber)" }} />
            <div className="font-bold text-[14.5px]">
              {t("session.new_achievements_title", "¡Logros desbloqueados!")}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {newAchievements.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 text-[13px] font-semibold cf-txt2"
              >
                <span>🏅</span>
                {t(`progress.ach.${a.id}.title`)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* series aún sin sincronizar */}
      {pendingSync > 0 && (
        <div
          className="cf-card flex items-center gap-3 mb-4"
          style={{ padding: "13px 16px", borderRadius: 18, border: "1px solid var(--border-2)" }}
        >
          <Clock size={18} className="shrink-0" style={{ color: "var(--amber)" }} />
          <div className="flex-1 text-[12.5px] cf-txt2 leading-snug">
            {t(
              "session.pending_sync_detail",
              "{{count}} series guardadas en el teléfono. Se enviarán solas cuando haya conexión.",
              { count: pendingSync }
            )}
          </div>
          <button
            className="cf-btn cf-btn-ghost shrink-0"
            style={{ padding: "8px 12px", fontSize: 12.5 }}
            onClick={() => void flushOutbox()}
          >
            {t("session.pending_sync_retry", "Reintentar")}
          </button>
        </div>
      )}

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
  // Historial de sesiones previas (para la progresión por reglas, sin IA)
  const [history, setHistory] = useState<HistoryLog[] | null>(null);
  const [, setLoading] = useState(true);
  // Feedback no bloqueante (toast) y confirmación de salida
  const [toast, setToast] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Hoja de acciones secundarias del ejercicio (corregir, saltar, terminar)
  const [showActions, setShowActions] = useState(false);
  // Destino al que el usuario intentó navegar (link del menú). null = salir vía onExit.
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  // Indica si ya intentamos restaurar el estado persistido (evita re-restaurar)
  const [restored, setRestored] = useState(false);
  const { user } = useAuth();
  // Series guardadas en el dispositivo que el servidor aún no confirmó
  const pendingSync = usePendingWorkoutLogs();
  const lastCompletedSetRef = useRef<string | null>(null);

  const currentExercise = planDay.blocks[currentExerciseIndex];
  const totalSets = planDay.blocks.reduce((total, block) => total + block.sets, 0);
  const completedSets = workoutLogs.filter((log) => log.completed).length;
  // Solo se puede deshacer una serie cuya fila conocemos (sesiones antiguas
  // restauradas no guardaban el id).
  const lastLog = workoutLogs[workoutLogs.length - 1];
  const canUndo = !!lastLog?.id;
  const progress = (completedSets / totalSets) * 100;
  // Sesión en curso (no en el resumen final): activa los guards de navegación.
  const isSessionActive = phase !== "completed";

  // Sugerencia de progresión para el ejercicio actual a partir del historial real.
  // Excluye la sesión en curso para no apoyarse en lo recién hecho.
  const progression = useMemo<Progression | null>(() => {
    if (!history || !currentExercise) return null;
    const prior = history.filter((l) => l.session_id !== sessionId);
    return computeProgression(prior, currentExercise.name, currentExercise.reps);
  }, [history, currentExercise, sessionId]);

  // Entradas de la sesión en curso normalizadas (forma de LogEntry), reutilizadas
  // tanto para PRs como para logros recién desbloqueados.
  const sessionEntries = useMemo<LogEntry[]>(
    () =>
      workoutLogs.map((l) => ({
        exercise_name: l.exerciseName,
        session_id: sessionId,
        actual_reps: l.actualReps,
        weight: l.weight,
        rpe: l.rpe,
        // `timestamp` ausente: hoy. detectNewAchievements solo compara conteos.
      })),
    [workoutLogs, sessionId]
  );

  // Récords batidos en esta sesión (se calcula al llegar al resumen final).
  const newPRs = useMemo<NewPR[]>(() => {
    if (phase !== "completed" || !history) return [];
    const prior = history.filter((l) => l.session_id !== sessionId);
    return detectNewPRs(prior, sessionEntries);
  }, [phase, history, sessionId, sessionEntries]);

  // Logros desbloqueados con esta sesión (sesiones totales, tonelaje, racha…).
  const newAchievements = useMemo<Achievement[]>(() => {
    if (phase !== "completed" || !history) return [];
    const prior = history.filter((l) => l.session_id !== sessionId);
    return detectNewAchievements(prior, [...prior, ...sessionEntries]);
  }, [phase, history, sessionId, sessionEntries]);

  // Overlay de celebración: se muestra una vez al entrar al resumen si hay algo
  // que celebrar (PR o logro nuevo). El usuario lo cierra para ver el resumen.
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  useEffect(() => {
    if (phase !== "completed" || celebrated) return;
    if (newPRs.length > 0 || newAchievements.length > 0) {
      setShowCelebration(true);
    }
    setCelebrated(true);
  }, [phase, celebrated, newPRs.length, newAchievements.length]);

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
      const saved = raw ? (JSON.parse(raw) as PersistedSession) : null;
      // Una sesión de hace más de unas horas no se reanuda: empezaría el
      // entrenamiento de hoy mezclado con series de otro día.
      if (saved && isSessionFresh(saved.savedAt)) {
        setPhase(saved.phase);
        setTimer(saved.timer);
        setRestTotal(saved.restTotal);
        setCurrentExerciseIndex(saved.currentExerciseIndex);
        setCurrentSetIndex(saved.currentSetIndex);
        setIsLongRest(saved.isLongRest);
        setWorkoutLogs(saved.workoutLogs ?? []);
        // Conservar el session_id: uno nuevo partiría el entrenamiento en dos sesiones.
        setSessionId(saved.sessionId || newId());
        setIsPaused(true);
        setToast(t("session.resumed_notice", "Se restauró tu sesión anterior"));
        return;
      }
    } catch {
      // estado corrupto: ignorar y empezar limpio
    }
    setSessionId(newId());
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
        savedAt: Date.now(),
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

  // Guard 1 · Interceptar clics en enlaces de navegación (menú inferior/lateral)
  // mientras la sesión está activa: en vez de navegar, pedimos confirmación.
  useEffect(() => {
    if (!isSessionActive) return;
    const onClickCapture = (e: MouseEvent) => {
      // respetar click con modificadores (abrir en pestaña nueva) y botón no primario
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || href.startsWith("#") || target === "_blank") return;
      // misma ruta (p. ej. /session): no es salir, dejar pasar
      const dest = href.split("?")[0].replace(/\/$/, "");
      if (dest === window.location.pathname.replace(/\/$/, "")) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingNav(href);
      setShowExitConfirm(true);
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [isSessionActive]);

  // Ocultar la navegación inferior mientras dura el entrenamiento.
  useEffect(() => {
    setSessionActive(isSessionActive);
    return () => setSessionActive(false);
  }, [isSessionActive]);

  // Guard 2 · Botón atrás del navegador / hardware: atrapar con un estado centinela
  // y mostrar la confirmación en lugar de abandonar la sesión.
  // Las entradas centinela se cuentan para poder retirarlas al salir: si se quedan
  // en el historial, el siguiente "atrás" devuelve al usuario a /session y arranca
  // otra sesión sola.
  const sentinelCountRef = useRef(0);
  const leavingRef = useRef(false);
  useEffect(() => {
    if (!isSessionActive) return;
    window.history.pushState(null, "", window.location.href);
    sentinelCountRef.current++;
    const onPop = () => {
      if (leavingRef.current) return;
      // volver a fijar el centinela para mantener al usuario en la sesión
      window.history.pushState(null, "", window.location.href);
      sentinelCountRef.current++;
      setPendingNav(null); // atrás → salir vía onExit (a detalles del plan)
      setShowExitConfirm(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isSessionActive]);

  // Guard 3 · Refresco/cierre de pestaña: prompt nativo del navegador.
  useEffect(() => {
    if (!isSessionActive) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isSessionActive]);

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

  // Traer el historial de logs una vez para calcular la progresión por reglas.
  // Degrada de forma elegante: si falla o está vacío, no se muestra sugerencia.
  useEffect(() => {
    let active = true;
    supabaseClient
      .getLogs()
      .then((logs) => {
        if (active) setHistory((logs as HistoryLog[]) ?? []);
      })
      .catch(() => {
        if (active) setHistory([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // Pre-llenar repeticiones (máximo del rango) y peso (sugerido por la progresión)
  // al cambiar de ejercicio/serie. Usa ?? para no pisar lo que el usuario ya escribió.
  useEffect(() => {
    if (currentExercise && phase === "exercise") {
      const maxReps = currentExercise.reps[1];
      setCurrentLog((prev) => ({
        ...prev,
        actualReps: prev.actualReps ?? maxReps,
        weight: prev.weight ?? progression?.suggestedWeight,
      }));
    }
  }, [currentExerciseIndex, currentSetIndex, phase, currentExercise, progression]);

  // Timer único para calentamiento y descanso
  // Evita que el aviso de fin de descanso suene dos veces para el mismo descanso
  // (re-render / StrictMode). Se rearma cada vez que empieza un descanso nuevo.
  const restCueFiredRef = useRef(false);

  // La cuenta atrás se deriva de la hora de fin, no de restar 1 por tick: con la
  // pantalla apagada o la app en segundo plano el WebView congela los timers, y al
  // volver el contador debe reflejar el tiempo real transcurrido.
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  useEffect(() => {
    const timed = phase === "warmup" || phase === "rest";
    if (!timed || isPaused) {
      if (timerEndsAt !== null) setTimerEndsAt(null);
      return;
    }
    if (timerEndsAt === null) {
      setTimerEndsAt(Date.now() + timer * 1000);
      return;
    }
    const sync = () =>
      setTimer(Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000)));
    const id = setInterval(sync, 500);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [phase, isPaused, timerEndsAt, timer]);

  // Mantener la pantalla encendida durante el entrenamiento: los descansos duran
  // más que el apagado automático del teléfono.
  useEffect(() => {
    if (!isSessionActive || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) void sentinel.release();
        else lock = sentinel;
      } catch {
        // sin permiso o batería baja: seguimos sin bloqueo
      }
    };
    // El sistema libera el bloqueo al ocultar la app; se vuelve a pedir al regresar.
    document.addEventListener("visibilitychange", acquire);
    void acquire();
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release().catch(() => undefined);
    };
  }, [isSessionActive]);

  useEffect(() => {
    if (timer === 0) {
      if (phase === "warmup") setPhase("exercise");
      else if (phase === "rest") {
        // Solo al agotarse el descanso de forma natural (no al saltar/ajustar):
        // señal háptica + sonora para volver al ejercicio sin mirar la pantalla.
        if (!restCueFiredRef.current) {
          restCueFiredRef.current = true;
          playRestEndCue();
        }
        setPhase("exercise");
      }
    }
  }, [timer, phase, isPaused]);

  const handleWarmupComplete = () => {
    setPhase("exercise");
    setIsPaused(false);
  };

  const handleWarmupSkip = () => {
    setTimerEndsAt(null);
    setTimer(0);
  };

  const handleStartRest = useCallback(() => {
    restCueFiredRef.current = false;
    setTimer(currentExercise.rest_sec);
    setRestTotal(currentExercise.rest_sec);
    setPhase("rest");
    setIsLongRest(false);
    setIsPaused(false);
  }, [currentExercise.rest_sec]);

  const handleCompleteSet = () => {
    if (!currentLog.actualReps || !sessionId || !user) return;
    // Un segundo toque sobre la misma serie no debe registrarla dos veces.
    const setKey = `${currentExerciseIndex}:${currentSetIndex}`;
    if (lastCompletedSetRef.current === setKey) return;
    lastCompletedSetRef.current = setKey;

    const rowId = newId();
    const newLog: WorkoutLog = {
      id: rowId,
      exerciseIndex: currentExerciseIndex,
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

    // La serie queda en el dispositivo y se envía en segundo plano: la sesión
    // avanza sin esperar a la red y nada se pierde si no hay conexión.
    enqueueWorkoutLog(user.id, {
      id: rowId,
      exercise_name: newLog.exerciseName,
      set_index: newLog.setIndex,
      target_reps: newLog.targetReps,
      actual_reps: newLog.actualReps,
      weight: newLog.weight,
      rpe: newLog.rpe,
      notes: newLog.notes,
      plan_day_id: planDay.day,
      // Plan desde el que se inició este entrenamiento. Permite atribuir el log
      // al plan con precisión (ver "Mejorar plan" en plans/page.tsx).
      plan_id: planId,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
    });

    const sameExercise = currentSetIndex + 1 < currentExercise.sets;
    // Dentro del mismo ejercicio se arrastran peso y RPE: lo habitual es repetirlos.
    setCurrentLog(sameExercise ? { weight: newLog.weight, rpe: newLog.rpe } : {});

    if (sameExercise) {
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
        restCueFiredRef.current = false;
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

  // Deshace la última serie: la borra (del teléfono y del servidor) y vuelve a
  // ella con sus valores para corregirla y completarla de nuevo.
  const handleUndoLastSet = () => {
    setShowActions(false);
    if (!lastLog?.id || !user) return;
    removeWorkoutLog(user.id, lastLog.id);
    setWorkoutLogs((prev) => prev.filter((l) => l.id !== lastLog.id));
    const idx =
      lastLog.exerciseIndex ??
      planDay.blocks.findIndex((b) => b.name === lastLog.exerciseName);
    if (idx >= 0) {
      setCurrentExerciseIndex(idx);
      setCurrentSetIndex(Math.max(0, lastLog.setIndex - 1));
    }
    setCurrentLog({
      actualReps: lastLog.actualReps,
      weight: lastLog.weight,
      rpe: lastLog.rpe,
      notes: lastLog.notes,
    });
    lastCompletedSetRef.current = null;
    setPhase("exercise");
    setIsPaused(false);
    setToast(
      t("session.undo_done", "Serie eliminada. Corrígela y complétala de nuevo.")
    );
  };

  // Termina el entrenamiento con lo hecho hasta ahora (las series ya están
  // guardadas): muestra el resumen en vez de descartar la sesión.
  const handleFinishHere = () => {
    setShowActions(false);
    setShowExitConfirm(false);
    setPendingNav(null);
    clearPersistedSession();
    if (completedSets === 0) {
      leaveSession(onExit);
      return;
    }
    setPhase("completed");
  };

  // Pasa al siguiente ejercicio sin registrar las series que faltan de este.
  const handleSkipExercise = () => {
    setShowActions(false);
    setCurrentLog({});
    lastCompletedSetRef.current = null;
    if (currentExerciseIndex + 1 < planDay.blocks.length) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSetIndex(0);
      setPhase("exercise");
      setIsPaused(false);
    } else {
      handleFinishHere();
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
    // Rearmar la hora de fin a partir del tiempo ajustado.
    setTimerEndsAt(null);
    setTimer((prev) => Math.max(0, prev + delta));
    setRestTotal((prev) => Math.max(1, prev + delta));
  };

  // Retira del historial las entradas centinela y después navega.
  const leaveSession = (go: () => void) => {
    leavingRef.current = true;
    const sentinels = sentinelCountRef.current;
    sentinelCountRef.current = 0;
    if (sentinels === 0) {
      go();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener("popstate", finish);
      go();
    };
    window.addEventListener("popstate", finish);
    // Respaldo por si el navegador no emite popstate.
    setTimeout(finish, 400);
    window.history.go(-sentinels);
  };

  const handleShowHistory = () => {
    clearPersistedSession();
    leaveSession(() => router.replace("/workout-history"));
  };

  // Salida del resumen final (sesión ya completada): limpiar y salir
  const handleCompletedExit = () => {
    clearPersistedSession();
    leaveSession(onExit);
  };

  // Botón "X": confirmar si hay progreso, de lo contrario salir directo
  const handleExitRequest = () => {
    if (completedSets > 0) {
      setShowExitConfirm(true);
    } else {
      clearPersistedSession();
      leaveSession(onExit);
    }
  };

  // "Pausar y salir": la sesión queda guardada en el teléfono y se retoma desde
  // el inicio ("Continuar · Día X"). Las series hechas ya están registradas.
  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    const dest = pendingNav;
    setPendingNav(null);
    if (dest) {
      // Salida hacia un enlace del menú: navegar al destino solicitado.
      leaveSession(() => router.replace(dest));
    } else {
      // Botón X o atrás: salir por el flujo normal (detalles del plan).
      leaveSession(onExit);
    }
  };

  // Cancelar la salida y permanecer en la sesión.
  const handleCancelExit = () => {
    setShowExitConfirm(false);
    setPendingNav(null);
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
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowActions(true)}
                    className="cf-icon-tile bg-surface-2 border border-border"
                    style={{ width: 40, height: 40 }}
                    aria-label={t("session.more_actions", "Más opciones")}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  <button
                    onClick={handleExitRequest}
                    className="cf-icon-tile bg-surface-2 border border-border"
                    style={{ width: 40, height: 40 }}
                    aria-label={t("session.exit", "Salir")}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="cf-bar-track flex-1">
                  <div className="cf-bar-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="cf-num text-[12px] text-muted">
                  {completedSets}/{totalSets}
                </span>
              </div>
              {pendingSync > 0 && (
                <div className="cf-muted text-[11.5px] font-semibold flex items-center gap-1.5 -mt-2 mb-3">
                  <Clock size={12} />
                  {t("session.pending_sync", "{{count}} series por sincronizar", {
                    count: pendingSync,
                  })}
                </div>
              )}
            </div>

            <ExerciseStep
              currentExercise={currentExercise}
              currentSetIndex={currentSetIndex}
              currentLog={currentLog}
              onCompleteSet={handleCompleteSet}
              onStartRest={handleStartRest}
              onLogChange={setCurrentLog}
              exerciseDetails={currentExerciseDetails}
              progression={progression}
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
            onExit={handleExitRequest}
            onUndo={canUndo ? handleUndoLastSet : undefined}
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
            newPRs={newPRs}
            newAchievements={newAchievements}
            pendingSync={pendingSync}
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

      {/* Celebración (confeti) al completar la sesión */}
      {showCelebration && (
        <CelebrationOverlay
          prCount={newPRs.length}
          achievements={newAchievements}
          onDismiss={() => setShowCelebration(false)}
        />
      )}

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

      {/* Acciones secundarias del ejercicio */}
      {showActions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          role="dialog"
          aria-modal="true"
          onClick={() => setShowActions(false)}
        >
          <div
            className="cf-card-solid w-full max-w-xl flex flex-col gap-2.5"
            style={{
              // Fondo opaco: en oscuro .cf-card-solid es translúcido y se leía el fondo.
              background: "var(--surface)",
              padding: "16px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)",
              borderRadius: "22px 22px 0 0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {canUndo && (
              <button className="cf-btn cf-btn-ghost cf-btn-block" onClick={handleUndoLastSet}>
                <Undo2 size={17} />
                {t("session.undo_last_set", "Corregir la serie anterior")}
              </button>
            )}
            <button className="cf-btn cf-btn-ghost cf-btn-block" onClick={handleSkipExercise}>
              <SkipForward size={17} />
              {t("session.skip_exercise", "Saltar este ejercicio")}
            </button>
            {completedSets > 0 && (
              <button className="cf-btn cf-btn-ghost cf-btn-block" onClick={handleFinishHere}>
                <Flag size={17} />
                {t("session.finish_here", "Terminar aquí")}
              </button>
            )}
            <button className="cf-btn cf-btn-block cf-muted" onClick={() => setShowActions(false)}>
              {t("session.actions_cancel", "Cancelar")}
            </button>
          </div>
        </div>
      )}

      {/* Salida con progreso: terminar con lo hecho, pausar o quedarse */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: "rgba(0,0,0,0.6)" }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="cf-card-solid w-full max-w-sm"
            style={{ padding: 20, borderRadius: 20, background: "var(--surface)" }}
          >
            <div className="cf-h2 text-[18px] mb-2">
              {t("session.exit_confirm_title", "¿Salir de la sesión?")}
            </div>
            <div className="cf-muted text-[13.5px] leading-relaxed mb-5">
              {t(
                "session.exit_confirm_body",
                "Tus series ya están guardadas. Puedes terminar con lo hecho o pausar y seguir más tarde."
              )}
            </div>
            <div className="flex flex-col gap-2.5">
              <button className="cf-btn cf-btn-primary cf-btn-block" onClick={handleFinishHere}>
                <Flag size={17} />
                {t("session.finish_here", "Terminar aquí")}
              </button>
              <button className="cf-btn cf-btn-ghost cf-btn-block" onClick={handleConfirmExit}>
                <Pause size={17} />
                {t("session.exit_confirm_leave", "Pausar y salir")}
              </button>
              <button className="cf-btn cf-btn-block cf-muted" onClick={handleCancelExit}>
                {t("session.exit_confirm_stay", "Seguir entrenando")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
