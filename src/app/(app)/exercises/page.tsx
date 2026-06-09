"use client";
import { CFLoader, PageLoader } from "@/components/ui/loader";
import { supabaseClient } from "@/lib/supabase-client";
import {
  ArrowLeft,
  ChevronRight,
  Dumbbell,
  Heart,
  Search,
  Target,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface Exercise {
  id: string;
  name: string;
  kind: string;
  equipment: string;
  gif_url?: string;
  instructions?: string | string[];
  difficulty?: string;
  created_at?: string;
  primary_muscles?: string;
  category?: string;
  overview?: string;
  tips?: string[];
  benefits?: string[];
  muscle_groups_primary?: string[];
  muscle_groups_secondary?: string[];
  updated_at?: string;
}

interface ExerciseDetail extends Exercise {
  instructions_detailed?: string[];
  variations?: string[];
}

export default function ExercisesPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKind, setSelectedKind] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const exerciseId = searchParams.get("id");
  const EXERCISE_IMAGES_BASE_URL = process.env.NEXT_PUBLIC_STATICS_IMAGES;
  const imgUrl = (gif?: string) =>
    gif ? `${EXERCISE_IMAGES_BASE_URL}/${gif}` : "/placeholder-exercise.svg";

  useEffect(() => {
    if (exerciseId) {
      fetchExercise(exerciseId);
    } else {
      fetchExercises();
      setSelectedExercise(null);
    }
  }, [exerciseId]);

  const fetchExercises = async (page = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const data = await supabaseClient.getExercises(
        page,
        20,
        searchTerm || undefined,
        selectedKind || undefined
      );

      if (data && data.data) {
        if (append) setExercises((prev) => [...prev, ...data.data]);
        else setExercises(data.data || []);
        setHasMore(data.hasMore);
        setCurrentPage(page);
      } else {
        throw new Error("Error en la respuesta de Supabase");
      }
    } catch (err) {
      console.error("Error fetching exercises:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  };

  const fetchExercise = async (id: string) => {
    try {
      setLoading(true);
      const exerciseData = await supabaseClient.getExerciseById(id);
      if (exerciseData) setSelectedExercise(exerciseData);
      else throw new Error("Error en la respuesta de Supabase");
    } catch (err) {
      console.error("Error fetching exercise:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const goBackToList = () => {
    router.replace("/exercises");
    setSelectedExercise(null);
  };

  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    setHasMore(true);
    setExercises([]);
    fetchExercises(1, false);
  }, [searchTerm, selectedKind]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      fetchExercises(currentPage + 1, true);
    }
  }, [hasMore, loadingMore, loading, currentPage]);

  // Re-buscar al cambiar la categoría (omitiendo el primer render)
  const firstKind = useRef(true);
  useEffect(() => {
    if (firstKind.current) {
      firstKind.current = false;
      return;
    }
    if (exerciseId) return;
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKind]);

  const handleScroll = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    if (scrollTop + windowHeight >= documentHeight - 100) loadMore();
  }, [loadingMore, loading, hasMore, loadMore]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const CATS: [string, string][] = [
    ["", t("exercises.filters.all_types")],
    ["strength", t("exercises.filters.strength")],
    ["cardio", t("exercises.filters.cardio")],
    ["flexibility", t("exercises.filters.flexibility")],
    ["balance", t("exercises.filters.balance")],
  ];

  // ---------- Loading ----------
  if (loading) {
    return (
      <PageLoader />
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className="container mx-auto max-w-xl px-5 py-10 text-center">
        <p className="text-danger mb-4">Error: {error}</p>
        <button
          className="cf-btn cf-btn-ghost"
          onClick={() =>
            exerciseId ? fetchExercise(exerciseId) : fetchExercises()
          }
        >
          {t("exercises.retry")}
        </button>
      </div>
    );
  }

  // ---------- Exercise detail ----------
  if (selectedExercise) {
    const ex = selectedExercise;
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
      <div className="container mx-auto max-w-xl lg:max-w-3xl">
        {/* media */}
        <div
          className="cf-eximg flex items-center justify-center relative overflow-hidden"
          style={{ height: "min(56vh, 460px)" }}
        >
          {ex.gif_url ? (
            <img
              src={imgUrl(ex.gif_url)}
              alt={ex.name}
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
              onClick={goBackToList}
              className="cf-icon-tile text-white"
              style={{ width: 40, height: 40, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)" }}
              aria-label={t("exercises.exercise_details.back_to_exercises")}
            >
              <ArrowLeft size={20} />
            </button>
            <button
              className="cf-icon-tile text-white"
              style={{ width: 40, height: 40, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)" }}
              aria-label="Favorito"
            >
              <Heart size={19} />
            </button>
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

  // ---------- Exercise list ----------
  return (
    <div className="container mx-auto max-w-xl lg:max-w-6xl px-5 lg:px-8 pt-4 lg:pt-8">
      <div className="pt-1 mb-4">
        <div className="cf-eyebrow">{t("nav.exercises")}</div>
        <div className="cf-h1 text-[26px] mt-1.5">{t("exercises.title")}</div>
      </div>

      {/* search */}
      <div className="flex gap-2.5 mb-3.5">
        <div
          className="cf-card flex-1 flex items-center gap-2.5"
          style={{ padding: "0 14px", borderRadius: 15 }}
        >
          <Search size={18} className="text-muted shrink-0" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={t("exercises.search.placeholder")}
            className="bg-transparent outline-none w-full text-[14px] py-3"
          />
        </div>
      </div>

      {/* category chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {CATS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setSelectedKind(value)}
            className={`cf-chip shrink-0 ${selectedKind === value ? "cf-chip-brand" : ""}`}
            style={{ padding: "8px 14px", fontSize: 12.5 }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* list */}
      {exercises.length === 0 ? (
        <div className="text-center py-12">
          <div
            className="cf-icon-tile bg-surface-2 border border-border mx-auto mb-4"
            style={{ width: 88, height: 88, borderRadius: 28 }}
          >
            <Target className="w-10 h-10 text-muted" />
          </div>
          <h3 className="cf-h2 text-[18px] mb-2">{t("exercises.no_results.title")}</h3>
          <p className="cf-muted text-sm mb-6">
            {searchTerm || selectedKind
              ? t("exercises.no_results.description")
              : t("exercises.no_results.no_exercises")}
          </p>
          {(searchTerm || selectedKind) && (
            <button
              className="cf-btn cf-btn-ghost"
              onClick={() => {
                setSearchTerm("");
                setSelectedKind("");
                setCurrentPage(1);
                setHasMore(true);
                fetchExercises(1, false);
              }}
            >
              {t("exercises.search.clear_filters")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {exercises.map((exercise, index) => (
              <button
                key={`${exercise.id}-${index}`}
                onClick={() => {
                  router.replace(`/exercises?id=${exercise.id}`);
                  setSelectedExercise(exercise as ExerciseDetail);
                }}
                className="cf-card flex items-center gap-3.5 text-left"
                style={{ padding: 11, borderRadius: 18 }}
              >
                <div
                  className="cf-eximg flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ width: 58, height: 58, borderRadius: 14 }}
                >
                  {exercise.gif_url ? (
                    <img
                      src={imgUrl(exercise.gif_url)}
                      alt={exercise.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder-exercise.svg";
                      }}
                    />
                  ) : (
                    <Dumbbell size={24} color="rgba(255,255,255,0.8)" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15.5px] truncate">{exercise.name}</div>
                  <div className="cf-muted text-[12px] font-semibold mt-0.5 truncate">
                    {exercise.kind || t("exercises.exercise_details.no_type")}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {exercise.equipment && (
                      <span className="cf-chip" style={{ padding: "3px 9px", fontSize: 10.5 }}>
                        {exercise.equipment}
                      </span>
                    )}
                    {exercise.difficulty && (
                      <span className="cf-chip cf-chip-cyan" style={{ padding: "3px 9px", fontSize: 10.5 }}>
                        {exercise.difficulty}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="text-faint shrink-0" />
              </button>
            ))}

            {/* skeletons */}
            {loadingMore &&
              hasMore &&
              [...Array(3)].map((_, index) => (
                <div
                  key={`loading-${index}`}
                  className="cf-card flex items-center gap-3.5 animate-pulse"
                  style={{ padding: 11, borderRadius: 18 }}
                >
                  <div className="bg-surface-2 shrink-0" style={{ width: 58, height: 58, borderRadius: 14 }} />
                  <div className="flex-1">
                    <div className="h-4 bg-surface-2 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-surface-2 rounded w-1/2" />
                  </div>
                </div>
              ))}
          </div>

          {hasMore && (
            <div className="text-center py-6">
              {loadingMore ? (
                <div className="flex justify-center">
                  <CFLoader size={30} />
                </div>
              ) : (
                <div className="cf-muted text-xs">
                  {t("exercises.exercise_details.showing", {
                    count: exercises.length,
                    page: currentPage,
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
