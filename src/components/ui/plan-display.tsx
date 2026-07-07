"use client";
import { supabaseClient } from "@/lib/supabase-client";
import { type GeneratedPlan } from "@/lib/validators/schemas";
import { useRouter as useNextRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatReps } from "@/lib/plan-display";
import { Button } from "./button";

interface PlanDisplayProps {
  plan: GeneratedPlan;
  planId: string;
  onStartSession?: (day?: any) => void; // Opcional cuando useRouter es true
  onBackToForm?: () => void; // Opcional cuando useRouter es true
  useRouter?: boolean; // Nueva prop para usar router en lugar de callbacks
}

export function PlanDisplay({
  plan,
  planId,
  onStartSession,
  onBackToForm,
  useRouter = false,
}: PlanDisplayProps) {
  const { t } = useTranslation("common");
  const router = useNextRouter();

  // URL base para las imágenes de ejercicios desde Supabase Storage
  const EXERCISE_IMAGES_BASE_URL = process.env.NEXT_PUBLIC_STATICS_IMAGES;

  // Función helper para construir URLs limpias sin doble slash
  const buildImageUrl = (gifUrl: string) => {
    if (!gifUrl || !EXERCISE_IMAGES_BASE_URL) return null;

    // Limpiar la URL base (remover trailing slash si existe)
    const cleanBase = EXERCISE_IMAGES_BASE_URL.replace(/\/$/, "");
    // Limpiar el nombre del archivo (remover leading slash si existe)
    const cleanFileName = gifUrl.replace(/^\//, "");

    return `${cleanBase}/${cleanFileName}`;
  };

  const [exercisesWithDetails, setExercisesWithDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener ejercicios del plan con detalles (incluyendo GIFs)
  useEffect(() => {
    const fetchPlanExercises = async () => {
      try {
        setLoading(true);
        const exercisesData = await supabaseClient.getPlanExercises(planId);

        if (exercisesData) {
          setExercisesWithDetails(exercisesData);
        } else {
          throw new Error("No exercises found");
        }
      } catch (err) {
        console.error("Error fetching plan exercises:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    if (planId) {
      fetchPlanExercises();
    }
  }, [planId]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-txt mb-2">{t("plan.title")}</h1>
        <p className="text-muted text-lg">
          {plan.weeks} {t("plan.weeks")} • {plan.days.length} {t("plan.day")}s
        </p>
        <div className="mt-4 inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">{t("plan_display.ai_generated")}</span>
        </div>
      </div>

      {/* Plan Overview */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-muted">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>{t("plan_display.loading_exercises")}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2 text-red-500 bg-red-50 px-4 py-2 rounded-lg">
            <span>⚠️ {t("plan_display.error_loading", { error })}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {plan.days.map((day) => (
          <div
            key={day.day}
            className="bg-surface border border-border rounded-2xl p-6 hover:shadow-soft transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {day.day}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-txt">
                    {day.focus}
                  </h3>
                  <p className="text-sm text-muted">
                    {t("plan_display.exercises_count", { count: day.blocks.length })}
                  </p>
                </div>
              </div>

              {/* Botón para iniciar este día específico */}
              <Button
                onClick={
                  useRouter
                    ? () =>
                        router.push(`/session?planId=${planId}&day=${day.day}`)
                    : () => onStartSession?.(day)
                }
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2"
                size="sm"
              >
                {t("plan_display.start_day", { day: day.day })}
              </Button>
            </div>

            <div className="space-y-3">
              {day.blocks.map((block, index) => {
                // Buscar detalles del ejercicio usando block_index y day
                const exerciseDetails = exercisesWithDetails?.exercises?.[
                  day.day
                ]?.find((ex: any) => ex.block_index === index);

                return (
                  <div
                    key={index}
                    className="bg-bg/50 rounded-lg p-4 border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    {/* Layout horizontal del ejercicio */}
                    <div className="flex items-start gap-4">
                      {/* Imagen del ejercicio */}
                      <div className="flex-shrink-0">
                        <img
                          src={
                            buildImageUrl(exerciseDetails?.gif_url) ||
                            "/placeholder-exercise.svg"
                          }
                          alt={block.name}
                          loading="lazy"
                          decoding="async"
                          className="w-16 h-16 rounded-lg object-cover border border-border/50"
                          onError={(e) => {
                            // Fallback a placeholder si falla la imagen
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder-exercise.svg";
                          }}
                        />
                      </div>

                      {/* Información del ejercicio */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-txt text-sm">
                            {block.name}
                          </h4>
                          {exerciseDetails?.equipment && (
                            <span className="text-xs text-muted bg-muted/50 px-2 py-1 rounded">
                              {exerciseDetails.equipment}
                            </span>
                          )}
                          {exerciseDetails?.category && (
                            <span className="text-xs text-accent bg-accent/10 px-2 py-1 rounded">
                              {exerciseDetails.category}
                            </span>
                          )}
                        </div>

                        {/* Métricas del ejercicio en fila horizontal */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-primary font-bold text-xs">
                                {block.sets}
                              </span>
                            </div>
                            <span className="text-xs text-muted">{t("plan_display.series")}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-accent/10 rounded-full flex items-center justify-center">
                              <span className="text-accent font-bold text-xs">
                                {formatReps(block.reps, "-")}
                              </span>
                            </div>
                            <span className="text-xs text-muted">{t("plan_display.reps")}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-secondary/10 rounded-full flex items-center justify-center">
                              <span className="text-secondary font-bold text-xs">
                                {block.rest_sec}s
                              </span>
                            </div>
                            <span className="text-xs text-muted">{t("plan_display.rest")}</span>
                          </div>
                        </div>

                        {/* Cues del ejercicio */}
                        {block.cues && block.cues.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/30">
                            <p className="text-xs text-accent font-medium mb-2">
                              {t("plan_display.key_points")}:
                            </p>
                            <ul className="text-xs text-muted space-y-1">
                              {block.cues.map((cue, cueIndex) => (
                                <li key={cueIndex} className="flex items-start">
                                  <span className="text-accent mr-1">•</span>
                                  {cue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Schedule */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-txt mb-4 text-center">
          {t("plan_display.weekly_schedule")}
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center">
              <div className="text-sm font-medium text-muted mb-1">{day}</div>
              <div className="w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold mx-auto">
                {day === "Mon"
                  ? "A"
                  : day === "Wed"
                  ? "B"
                  : day === "Fri"
                  ? "C"
                  : day === "Sun"
                  ? "D"
                  : "—"}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-sm text-muted">
          <p>{t("plan_display.week_schedule", { weeks: plan.weeks })}</p>
        </div>
      </div>

      {/* Action Buttons - Solo mostrar cuando useRouter es false */}
      {!useRouter && (
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={onStartSession}
            className="bg-primary hover:bg-primary/90 text-white shadow-glow px-8 py-3 text-lg"
            size="lg"
          >
            {t("plan_display.start_first_session")}
          </Button>
          <Button
            onClick={onBackToForm}
            variant="outline"
            className="px-8 py-3 text-lg"
            size="lg"
          >
            {t("plan_display.back_to_plans")}
          </Button>
        </div>
      )}

      {/* Plan ID (solo en desarrollo, oculto al usuario en producción) */}
      {process.env.NODE_ENV !== "production" && (
        <div className="text-center text-xs text-muted">
          {t("plan_display.plan_id", { id: planId })}
        </div>
      )}
    </div>
  );
}
