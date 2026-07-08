"use client";
import { ArrowLeft, Dumbbell, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatReps } from "@/lib/plan-display";

// Datos del ejercicio que necesita el detalle. Superset compatible con el tipo
// `ExerciseDetail` de /exercises y con la fila de la tabla `exercises`.
export interface ExerciseDetailData {
  id: string;
  name: string;
  kind?: string;
  equipment?: string;
  gif_url?: string;
  difficulty?: string;
  overview?: string;
  instructions?: string | string[];
  instructions_detailed?: string[];
  primary_muscles?: string;
  muscle_groups_primary?: string[];
  muscle_groups_secondary?: string[];
  tips?: string[];
  benefits?: string[];
  variations?: string[];
}

// Especificaciones del ejercicio DENTRO de un plan concreto (series/reps/…).
// Solo se muestra cuando el detalle se abre desde el detalle de un plan.
export interface ExercisePlanSpec {
  sets: number;
  reps: readonly number[];
  rest_sec: number;
  cues?: string[];
}

interface ExerciseDetailViewProps {
  exercise: ExerciseDetailData;
  onBack: () => void;
  // Favoritos: opcionales. Si no se pasa `onToggleFavorite` el corazón se oculta
  // (p. ej. al abrir el detalle desde un plan, donde no hay gestión de favoritos).
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  planSpec?: ExercisePlanSpec | null;
}

const EXERCISE_IMAGES_BASE_URL = process.env.NEXT_PUBLIC_STATICS_IMAGES;
const imgUrl = (gif?: string) =>
  gif ? `${EXERCISE_IMAGES_BASE_URL}/${gif}` : "/placeholder-exercise.svg";

export function ExerciseDetailView({
  exercise: ex,
  onBack,
  isFavorite = false,
  onToggleFavorite,
  planSpec,
}: ExerciseDetailViewProps) {
  const { t } = useTranslation("common");

  const instructions = Array.isArray(ex.instructions)
    ? ex.instructions
    : ex.instructions
      ? [ex.instructions]
      : ex.instructions_detailed || [];
  const primary =
    ex.muscle_groups_primary && ex.muscle_groups_primary.length > 0
      ? ex.muscle_groups_primary
      : ex.primary_muscles
        ? ex.primary_muscles.split(",").map((m) => m.trim())
        : [];
  const secondary = ex.muscle_groups_secondary || [];

  return (
    <div className="cf-bleed-x max-w-xl lg:max-w-3xl">
      {/* media */}
      <div
        className="cf-eximg flex items-center justify-center relative overflow-hidden"
        style={{ height: "min(56vh, 460px)" }}
      >
        {ex.gif_url ? (
          <img
            src={imgUrl(ex.gif_url)}
            alt={ex.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder-exercise.svg";
            }}
          />
        ) : (
          <Dumbbell size={64} color="rgba(255,255,255,0.85)" />
        )}
        <div className="absolute top-2 left-5 right-5 flex justify-between">
          <button
            onClick={onBack}
            className="cf-icon-tile text-white"
            style={{ width: 40, height: 40, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)" }}
            aria-label={t("exercises.exercise_details.back_to_exercises")}
          >
            <ArrowLeft size={20} />
          </button>
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className="cf-icon-tile"
              style={{
                width: 40,
                height: 40,
                background: "rgba(0,0,0,0.3)",
                backdropFilter: "blur(8px)",
                color: isFavorite ? "var(--danger, #ef4444)" : "#fff",
              }}
              aria-label={t("exercises.favorite", "Favorito")}
              aria-pressed={isFavorite}
            >
              <Heart size={19} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </div>

      {/* sheet */}
      <div
        className="relative px-5 pt-5 pb-10"
        style={{ marginTop: -22, background: "var(--bg)", borderRadius: "24px 24px 0 0" }}
      >
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {ex.kind && <span className="cf-chip cf-chip-brand">{ex.kind}</span>}
          {ex.difficulty && <span className="cf-chip cf-chip-cyan">{ex.difficulty}</span>}
          {ex.equipment && <span className="cf-chip">{ex.equipment}</span>}
        </div>

        <div className="cf-h1 text-[25px]">{ex.name}</div>
        {ex.overview && ex.overview.trim() !== "" && (
          <p className="cf-muted text-[13.5px] mt-1.5 leading-relaxed">
            {ex.overview}
          </p>
        )}

        {/* especificaciones dentro de este plan (series / reps / descanso / cues) */}
        {planSpec && (
          <div className="cf-card mt-4" style={{ padding: 16, borderRadius: 18 }}>
            <div className="cf-eyebrow mb-3">
              {t("plans.plan_details.in_this_plan", "En este plan")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="cf-chip cf-chip-brand">
                {planSpec.sets} {t("plan_display.series")}
              </span>
              <span className="cf-chip cf-chip-cyan">
                {formatReps(planSpec.reps)} {t("plan_display.reps")}
              </span>
              <span className="cf-chip">
                {planSpec.rest_sec}s {t("plan_display.rest")}
              </span>
            </div>
            {planSpec.cues && planSpec.cues.length > 0 && (
              <ul className="mt-3 space-y-1">
                {planSpec.cues.map((cue, i) => (
                  <li
                    key={i}
                    className="cf-muted text-[12px] flex items-start gap-1.5"
                  >
                    <span className="text-accent">•</span>
                    {cue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* muscles */}
        {(primary.length > 0 || secondary.length > 0) && (
          <div className="cf-card mt-4" style={{ padding: 16, borderRadius: 18 }}>
            <div className="cf-eyebrow mb-3">
              {t("exercises.exercise_details.muscles_worked")}
            </div>
            {primary.length > 0 && (
              <>
                <div className="cf-muted text-[12px] font-semibold mb-2">
                  {t("exercises.exercise_details.primary_muscles")}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {primary.map((m, i) => (
                    <span key={i} className="cf-chip cf-chip-brand">{m}</span>
                  ))}
                </div>
              </>
            )}
            {secondary.length > 0 && (
              <>
                <div className="cf-muted text-[12px] font-semibold mb-2">
                  {t("exercises.exercise_details.secondary_muscles")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {secondary.map((m, i) => (
                    <span key={i} className="cf-chip">{m}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* execution */}
        {instructions.length > 0 && (
          <>
            <div className="cf-h2 text-[15px] mt-5 mb-3">
              {t("exercises.exercise_details.execution_instructions")}
            </div>
            <div className="flex flex-col gap-3">
              {instructions.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div
                    className="cf-num shrink-0 flex items-center justify-center bg-surface-2 border border-border"
                    style={{ width: 26, height: 26, borderRadius: 9, fontSize: 13, color: "var(--primary)" }}
                  >
                    {i + 1}
                  </div>
                  <div className="cf-txt2 text-[13.5px] leading-relaxed pt-0.5">{step}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* tips */}
        {ex.tips && ex.tips.length > 0 && (
          <div className="cf-card mt-5" style={{ padding: 16, borderRadius: 18 }}>
            <div className="cf-eyebrow mb-3">{t("exercises.exercise_details.tips")}</div>
            <ul className="flex flex-col gap-2">
              {ex.tips.map((tip, i) => (
                <li key={i} className="flex items-start text-[13px] cf-txt2">
                  <span style={{ color: "var(--amber)", marginRight: 8 }}>•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* benefits */}
        {ex.benefits && ex.benefits.length > 0 && (
          <div className="cf-card mt-3.5" style={{ padding: 16, borderRadius: 18 }}>
            <div className="cf-eyebrow mb-3">{t("exercises.exercise_details.benefits")}</div>
            <ul className="flex flex-col gap-2">
              {ex.benefits.map((b, i) => (
                <li key={i} className="flex items-start text-[13px] cf-txt2">
                  <span style={{ color: "var(--mint)", marginRight: 8 }}>•</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* variations */}
        {ex.variations && ex.variations.length > 0 && (
          <div className="cf-card mt-3.5" style={{ padding: 16, borderRadius: 18 }}>
            <div className="cf-eyebrow mb-3">{t("exercises.exercise_details.variations")}</div>
            <ul className="flex flex-col gap-2">
              {ex.variations.map((v, i) => (
                <li key={i} className="flex items-start text-[13px] cf-txt2">
                  <span style={{ color: "var(--cyan)", marginRight: 8 }}>•</span>
                  {v}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
