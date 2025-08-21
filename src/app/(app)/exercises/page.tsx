"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Dumbbell, Filter, Search, Target } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface Exercise {
  id: string;
  name: string;
  kind: string; // Cambiado de 'category' a 'kind'
  equipment: string;
  gif_url?: string;
  instructions?: string | string[]; // Puede ser string o array
  difficulty?: string;
  created_at?: string; // Opcional
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
  // Campos adicionales que podrían estar disponibles en el futuro
  instructions_detailed?: string[];
  tips?: string[];
  variations?: string[];
  benefits?: string[];
  muscle_groups_primary?: string[];
  muscle_groups_secondary?: string[];
  overview?: string;
  category?: string;
  updated_at?: string;
  difficulty?: string;
}

export default function ExercisesPage() {
  useTranslation("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(true); // Carga inicial/completa
  const [loadingMore, setLoadingMore] = useState(false); // Carga de más ejercicios
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKind, setSelectedKind] = useState<string>("");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const exerciseId = searchParams.get("id");

  // URL base para las imágenes de ejercicios desde Supabase Storage
  const EXERCISE_IMAGES_BASE_URL = process.env.NEXT_PUBLIC_STATICS_IMAGES;

  // Debug: Log de la URL base
  console.log(
    "🔍 [EXERCISES] EXERCISE_IMAGES_BASE_URL:",
    EXERCISE_IMAGES_BASE_URL
  );

  useEffect(() => {
    if (exerciseId) {
      // Si hay un ID en la URL, cargar el ejercicio específico
      fetchExercise(exerciseId);
    } else {
      // Si no hay ID, cargar la lista de ejercicios
      fetchExercises();
      // Limpiar el ejercicio seleccionado cuando volvemos al listado
      setSelectedExercise(null);
    }
  }, [exerciseId]);

  // Debug: Log del estado de ejercicios
  useEffect(() => {
    console.log("🔍 [EXERCISES] Exercises state changed:", {
      count: exercises.length,
      currentPage,
      hasMore,
      loading,
      loadingMore,
    });
  }, [exercises.length, currentPage, hasMore, loading, loadingMore]);

  const fetchExercises = async (page = 1, append = false) => {
    try {
      // Usar loading diferente según si es carga inicial o scroll infinito
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(searchTerm && { search: searchTerm }),
        ...(selectedKind && { kind: selectedKind }),
        ...(selectedEquipment && { equipment: selectedEquipment }),
      });

      const response = await fetch(`/api/exercises/paginated?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch exercises");
      }

      const data = await response.json();
      console.log("📋 [EXERCISES] API Response:", data);

      if (data.success && data.data) {
        if (append) {
          // Agregar nuevos ejercicios a la lista existente
          setExercises((prev) => {
            const newExercises = [...prev, ...data.data.exercises];
            console.log("🔄 [EXERCISES] Appending exercises:", {
              previousCount: prev.length,
              newCount: data.data.exercises.length,
              totalCount: newExercises.length,
            });
            return newExercises;
          });
        } else {
          // Reemplazar toda la lista (nueva búsqueda o filtro)
          setExercises(data.data.exercises || []);
          console.log("🔄 [EXERCISES] Replacing exercises:", {
            newCount: data.data.exercises?.length || 0,
          });
        }

        setHasMore(data.data.pagination.hasNextPage);
        setCurrentPage(page);

        console.log("📊 [EXERCISES] State updated:", {
          page,
          hasMore: data.data.pagination.hasNextPage,
          totalExercises: append
            ? exercises.length + data.data.exercises.length
            : data.data.exercises.length,
        });
      } else {
        throw new Error(data.error || "Error en la respuesta del API");
      }
    } catch (err) {
      console.error("Error fetching exercises:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      // Apagar el loading correspondiente
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const fetchExercise = async (id: string) => {
    try {
      setLoading(true);
      console.log("🔍 [EXERCISES] Fetching exercise with ID:", id);
      const response = await fetch(`/api/exercises/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch exercise");
      }

      const data = await response.json();
      console.log("📥 [EXERCISES] Exercise API response:", data);

      if (data.success && data.data) {
        setSelectedExercise(data.data);
        console.log(
          "✅ [EXERCISES] Exercise set successfully:",
          data.data.name
        );
        console.log(
          "📋 [EXERCISES] Complete exercise data:",
          JSON.stringify(data.data, null, 2)
        );

        // Debug: Log available fields
        const availableFields = Object.keys(data.data);
        console.log("🔍 [EXERCISES] Available fields:", availableFields);

        // Debug: Log specific fields we're looking for
        console.log("🔍 [EXERCISES] Field analysis:", {
          hasInstructions: !!data.data.instructions,
          instructionsType: typeof data.data.instructions,
          hasTips: !!data.data.tips,
          tipsLength: data.data.tips?.length,
          hasBenefits: !!data.data.benefits,
          benefitsLength: data.data.benefits?.length,
          hasOverview: !!data.data.overview,
          hasPrimaryMuscles: !!data.data.muscle_groups_primary,
          hasSecondaryMuscles: !!data.data.muscle_groups_secondary,
          hasPrimaryMusclesString: !!data.data.primary_muscles,
        });
      } else {
        throw new Error(data.error || "Error en la respuesta del API");
      }
    } catch (err) {
      console.error("Error fetching exercise:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const goBackToList = () => {
    // Usar replace para no agregar entradas al historial
    router.replace("/exercises");
    setSelectedExercise(null);
  };

  const handleSearch = useCallback(() => {
    console.log("🔍 [EXERCISES] Starting new search:", {
      searchTerm,
      selectedKind,
      selectedEquipment,
    });
    setCurrentPage(1);
    setHasMore(true);
    setExercises([]); // Limpiar ejercicios existentes antes de nueva búsqueda
    fetchExercises(1, false);
  }, [searchTerm, selectedKind, selectedEquipment]);

  const loadMore = () => {
    if (hasMore && !loadingMore && !loading) {
      const nextPage = currentPage + 1;
      console.log("🔄 [EXERCISES] Loading more exercises:", {
        currentPage,
        nextPage,
        currentExercisesCount: exercises.length,
        hasMore,
      });
      fetchExercises(nextPage, true);
    } else {
      console.log("❌ [EXERCISES] Cannot load more:", {
        hasMore,
        loadingMore,
        loading,
        currentPage,
      });
    }
  };

  // Función para cargar más ejercicios automáticamente
  const handleScroll = useCallback(() => {
    if (loadingMore || loading || !hasMore) {
      console.log("🔄 [EXERCISES] Scroll detected but cannot load:", {
        loadingMore,
        loading,
        hasMore,
        currentExercisesCount: exercises.length,
      });
      return;
    }

    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Si estamos cerca del final de la página (100px antes del final)
    if (scrollTop + windowHeight >= documentHeight - 100) {
      console.log("🔄 [EXERCISES] Near bottom, loading more exercises...");
      console.log("📊 [EXERCISES] Scroll info:", {
        scrollTop,
        windowHeight,
        documentHeight,
        threshold: documentHeight - 100,
        currentPosition: scrollTop + windowHeight,
        currentExercisesCount: exercises.length,
      });
      loadMore();
    }
  }, [loadingMore, loading, hasMore, loadMore, exercises.length]);

  // Agregar event listener para scroll
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted">
            {exerciseId ? "Cargando ejercicio..." : "Cargando ejercicios..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-danger mb-4">Error: {error}</p>
          <Button
            onClick={() =>
              exerciseId ? fetchExercise(exerciseId) : fetchExercises()
            }
            variant="outline"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // Si hay un ejercicio seleccionado, mostrar el detalle
  if (selectedExercise) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-4 text-sm text-muted">
            <button
              onClick={goBackToList}
              className="hover:text-primary transition-colors"
            >
              Ejercicios
            </button>
            <span>→</span>
            <span className="text-primary">Detalles del Ejercicio</span>
          </div>

          <div className="flex items-center justify-between mb-6">
            <Button onClick={goBackToList} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Ejercicios
            </Button>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-txt mb-2">
              {selectedExercise.name}
            </h1>
            <div className="flex items-center justify-center gap-4 text-muted">
              <span>{selectedExercise.kind || "Sin tipo"}</span>
              <span>•</span>
              <span>{selectedExercise.equipment || "Sin equipo"}</span>
              {selectedExercise.difficulty && (
                <>
                  <span>•</span>
                  <span>Dificultad: {selectedExercise.difficulty}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Exercise Details */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Image and Basic Info */}
            <div className="space-y-6">
              {/* Exercise Image */}
              {selectedExercise.gif_url && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  {console.log(
                    "🔍 [EXERCISE DETAIL] Image URL:",
                    `${EXERCISE_IMAGES_BASE_URL}/${selectedExercise.gif_url}`
                  )}
                  <img
                    src={`${EXERCISE_IMAGES_BASE_URL}/${selectedExercise.gif_url}`}
                    alt={selectedExercise.name}
                    className="w-full h-80 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder-exercise.svg";
                    }}
                  />
                </div>
              )}

              {/* Basic Exercise Information Card */}
              <div className="bg-surface border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-txt mb-4 flex items-center gap-2">
                  📊 Datos del Ejercicio
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Nombre completo:</span>
                    <span className="text-txt font-medium">
                      {selectedExercise.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">ID único:</span>
                    <span className="text-txt font-mono text-xs">
                      {selectedExercise.id}
                    </span>
                  </div>
                  {selectedExercise.gif_url && (
                    <div className="flex justify-between">
                      <span className="text-muted">Imagen disponible:</span>
                      <span className="text-green-600">✓ Sí</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Exercise Instructions - Even if basic */}
              <div className="bg-surface border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-txt mb-4 flex items-center gap-2">
                  📝 Instrucciones Básicas
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <span className="text-blue-600 text-lg">1️⃣</span>
                    <p className="text-muted leading-relaxed">
                      Configura el equipamiento necesario:{" "}
                      <strong>
                        {selectedExercise.equipment || "Revisa los requisitos"}
                      </strong>
                    </p>
                  </div>
                  <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <span className="text-blue-600 text-lg">2️⃣</span>
                    <p className="text-muted leading-relaxed">
                      Realiza el ejercicio de{" "}
                      <strong>
                        {selectedExercise.kind || "entrenamiento"}
                      </strong>{" "}
                      manteniendo la forma correcta
                    </p>
                  </div>
                  <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <span className="text-blue-600 text-lg">3️⃣</span>
                    <p className="text-muted leading-relaxed">
                      Enfócate en trabajar los músculos objetivo de manera
                      controlada
                    </p>
                  </div>
                  <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <span className="text-blue-600 text-lg">4️⃣</span>
                    <p className="text-muted leading-relaxed">
                      Mantén una respiración constante durante todo el
                      movimiento
                    </p>
                  </div>
                </div>
              </div>

              {/* General Tips */}
              <div className="bg-surface border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-txt mb-4 flex items-center gap-2">
                  💡 Consejos Generales
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                    <span className="text-yellow-600 text-lg">💡</span>
                    <p className="text-muted leading-relaxed">
                      Comienza con poco peso y enfócate en la técnica correcta
                      antes de incrementar la intensidad
                    </p>
                  </div>
                  <div className="flex gap-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                    <span className="text-yellow-600 text-lg">💡</span>
                    <p className="text-muted leading-relaxed">
                      Mantén el core activado y la postura correcta durante todo
                      el ejercicio
                    </p>
                  </div>
                  <div className="flex gap-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                    <span className="text-yellow-600 text-lg">💡</span>
                    <p className="text-muted leading-relaxed">
                      Si sientes dolor (no confundir con fatiga muscular), detén
                      el ejercicio inmediatamente
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Instructions and Details */}
            <div className="space-y-6">
              {/* Overview/Description */}
              {selectedExercise.overview && selectedExercise.overview.trim() !== "" && (
                <div className="bg-surface border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-txt mb-4 flex items-center gap-2">
                    📋 Descripción General
                  </h3>
                  <p className="text-muted leading-relaxed">
                    {selectedExercise.overview}
                  </p>
                </div>
              )}

              {/* Muscles Worked */}
              {((selectedExercise.muscle_groups_primary &&
                selectedExercise.muscle_groups_primary.length > 0) ||
                (selectedExercise.muscle_groups_secondary &&
                  selectedExercise.muscle_groups_secondary.length > 0) ||
                selectedExercise.primary_muscles) && (
                <div className="bg-surface border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-txt mb-4 flex items-center gap-2">
                    💪 Músculos Trabajados
                  </h3>
                  <div className="space-y-4">
                    {/* Primary Muscles */}
                    {selectedExercise.muscle_groups_primary &&
                      selectedExercise.muscle_groups_primary.length > 0 && (
                        <div>
                          <h4 className="font-medium text-txt mb-2">
                            Músculos Principales:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedExercise.muscle_groups_primary.map(
                              (muscle, index) => (
                                <Badge
                                  key={index}
                                  variant="default"
                                  className="text-xs"
                                >
                                  {muscle}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Secondary Muscles */}
                    {selectedExercise.muscle_groups_secondary &&
                      selectedExercise.muscle_groups_secondary.length > 0 && (
                        <div>
                          <h4 className="font-medium text-txt mb-2">
                            Músculos Secundarios:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedExercise.muscle_groups_secondary.map(
                              (muscle, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {muscle}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Fallback to primary_muscles if arrays are not available */}
                    {(!selectedExercise.muscle_groups_primary ||
                      selectedExercise.muscle_groups_primary.length === 0) &&
                      (!selectedExercise.muscle_groups_secondary ||
                        selectedExercise.muscle_groups_secondary.length ===
                          0) &&
                      selectedExercise.primary_muscles && (
                        <div>
                          <h4 className="font-medium text-txt mb-2">
                            Músculos Principales:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedExercise.primary_muscles
                              .split(",")
                              .map((muscle, index) => (
                                <Badge
                                  key={index}
                                  variant="default"
                                  className="text-xs"
                                >
                                  {muscle.trim()}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Equipment and Category */}
              <div className="bg-surface border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-txt mb-4 flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-primary" />
                  Información del Ejercicio
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Tipo:</span>
                      <Badge variant="outline">
                        {selectedExercise.kind || "No especificado"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Categoría:</span>
                      <Badge variant="outline">
                        {selectedExercise.category || "No especificado"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Equipo:</span>
                      <Badge variant="outline">
                        {selectedExercise.equipment || "Sin equipamiento"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selectedExercise.difficulty && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Dificultad:</span>
                        <Badge variant="secondary">
                          {selectedExercise.difficulty}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Creado:</span>
                      <span className="text-sm text-muted">
                        {selectedExercise.created_at
                          ? new Date(
                              selectedExercise.created_at
                            ).toLocaleDateString()
                          : "No disponible"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Actualizado:</span>
                      <span className="text-sm text-muted">
                        {selectedExercise.updated_at
                          ? new Date(
                              selectedExercise.updated_at
                            ).toLocaleDateString()
                          : "No disponible"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              {selectedExercise.instructions && 
               ((Array.isArray(selectedExercise.instructions) && selectedExercise.instructions.length > 0) ||
                (typeof selectedExercise.instructions === 'string' && selectedExercise.instructions.trim() !== '')) && (
                <div className="bg-surface border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-txt mb-4 flex items-center gap-2">
                    📝 Instrucciones de Ejecución
                  </h3>
                  {Array.isArray(selectedExercise.instructions) ? (
                    <ol className="space-y-3">
                      {selectedExercise.instructions.map(
                        (instruction, index) => (
                          <li key={index} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold">
                              {index + 1}
                            </span>
                            <p className="text-muted leading-relaxed">
                              {instruction}
                            </p>
                          </li>
                        )
                      )}
                    </ol>
                  ) : (
                    <p className="text-muted leading-relaxed">
                      {selectedExercise.instructions}
                    </p>
                  )}
                </div>
              )}

              {/* Detailed Instructions */}
              {selectedExercise.instructions_detailed &&
                selectedExercise.instructions_detailed.length > 0 && (
                  <div className="bg-surface border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-txt mb-4">
                      Instrucciones Detalladas
                    </h3>
                    <ol className="space-y-2">
                      {selectedExercise.instructions_detailed.map(
                        (instruction, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </span>
                            <span className="text-muted">{instruction}</span>
                          </li>
                        )
                      )}
                    </ol>
                  </div>
                )}

              {/* Tips */}
              {selectedExercise.tips && selectedExercise.tips.length > 0 && (
                <div className="bg-surface border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-txt mb-4 flex items-center gap-2">
                    💡 Consejos y Tips
                  </h3>
                  <div className="space-y-3">
                    {selectedExercise.tips.map((tip, index) => (
                      <div
                        key={index}
                        className="flex gap-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400"
                      >
                        <span className="text-yellow-600 text-lg">💡</span>
                        <p className="text-muted leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Benefits */}
              {selectedExercise.benefits &&
                selectedExercise.benefits.length > 0 && (
                  <div className="bg-surface border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-txt mb-4 flex items-center gap-2">
                      ⭐ Beneficios del Ejercicio
                    </h3>
                    <div className="space-y-3">
                      {selectedExercise.benefits.map((benefit, index) => (
                        <div
                          key={index}
                          className="flex gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400"
                        >
                          <span className="text-green-600 text-lg">✅</span>
                          <p className="text-muted leading-relaxed">
                            {benefit}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Variations */}
              {selectedExercise.variations &&
                selectedExercise.variations.length > 0 && (
                  <div className="bg-surface border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-txt mb-4 flex items-center gap-2">
                      🔄 Variaciones del Ejercicio
                    </h3>
                    <div className="space-y-3">
                      {selectedExercise.variations.map((variation, index) => (
                        <div
                          key={index}
                          className="flex gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400"
                        >
                          <span className="text-blue-600 text-lg">🔄</span>
                          <p className="text-muted leading-relaxed">
                            {variation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Data Availability Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  📊 Información Disponible en la Base de Datos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${selectedExercise.overview && selectedExercise.overview.trim() !== "" ? 'bg-green-500' : 'bg-red-400'}`}></span>
                      <span className="text-blue-700">Descripción general</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${selectedExercise.instructions && ((Array.isArray(selectedExercise.instructions) && selectedExercise.instructions.length > 0) || (typeof selectedExercise.instructions === 'string' && selectedExercise.instructions.trim() !== '')) ? 'bg-green-500' : 'bg-red-400'}`}></span>
                      <span className="text-blue-700">Instrucciones específicas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${selectedExercise.tips && selectedExercise.tips.length > 0 ? 'bg-green-500' : 'bg-red-400'}`}></span>
                      <span className="text-blue-700">Consejos específicos</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${selectedExercise.benefits && selectedExercise.benefits.length > 0 ? 'bg-green-500' : 'bg-red-400'}`}></span>
                      <span className="text-blue-700">Beneficios</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${selectedExercise.muscle_groups_primary && selectedExercise.muscle_groups_primary.length > 0 ? 'bg-green-500' : 'bg-red-400'}`}></span>
                      <span className="text-blue-700">Músculos primarios (array)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${selectedExercise.muscle_groups_secondary && selectedExercise.muscle_groups_secondary.length > 0 ? 'bg-green-500' : 'bg-red-400'}`}></span>
                      <span className="text-blue-700">Músculos secundarios (array)</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-blue-800 text-xs">
                    <strong>Nota:</strong> Los campos marcados en rojo están vacíos en la base de datos. 
                    Los campos marcados en verde tienen datos disponibles y se muestran arriba.
                  </p>
                </div>
              </div>

              {/* Exercise ID for reference (only in development/debug) */}
              <div className="bg-muted/10 border border-dashed border-muted rounded-lg p-4">
                <div className="text-xs text-muted text-center space-y-1">
                  <div>
                    <span className="font-medium">ID del ejercicio:</span>
                    <span className="ml-2 font-mono">
                      {selectedExercise.id}
                    </span>
                  </div>
                  {selectedExercise.created_at &&
                    selectedExercise.updated_at && (
                      <div>
                        <span className="font-medium">
                          Última modificación:
                        </span>
                        <span className="ml-2">
                          {new Date(
                            selectedExercise.updated_at
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista de listado de ejercicios
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Target className="w-6 h-6 text-primary" />
          <span className="text-sm text-muted">Ejercicios</span>
        </div>
        <h1 className="text-3xl font-bold text-txt mb-2">
          Biblioteca de Ejercicios
        </h1>
        <p className="text-muted text-lg">
          Explora nuestra colección completa de ejercicios con instrucciones
          detalladas
        </p>
      </div>

      {/* Search and Filters */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
              <Input
                placeholder="Buscar ejercicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>

            {/* Kind Filter */}
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-bg text-txt"
            >
              <option value="">Todos los tipos</option>
              <option value="strength">Fuerza</option>
              <option value="cardio">Cardio</option>
              <option value="flexibility">Flexibilidad</option>
              <option value="balance">Equilibrio</option>
            </select>

            {/* Equipment Filter */}
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-bg text-txt"
            >
              <option value="">Todo el equipo</option>
              <option value="bodyweight">Sin equipo</option>
              <option value="dumbbells">Mancuernas</option>
              <option value="barbell">Barra</option>
              <option value="cable">Cable</option>
              <option value="machine">Máquina</option>
            </select>
          </div>

          <Button onClick={handleSearch} className="w-full md:w-auto">
            <Filter className="w-4 h-4 mr-2" />
            Aplicar Filtros
          </Button>
        </div>
      </div>

      {/* Exercises Grid */}
      {exercises.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-surface border border-border rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-12 h-12 text-muted" />
          </div>
          <h3 className="text-xl font-semibold text-txt mb-2">
            No se encontraron ejercicios
          </h3>
          <p className="text-muted mb-6">
            {searchTerm || selectedKind || selectedEquipment
              ? "Intenta ajustar los filtros de búsqueda"
              : "No hay ejercicios disponibles en este momento"}
          </p>
          {(searchTerm || selectedKind || selectedEquipment) && (
            <Button
              onClick={() => {
                setSearchTerm("");
                setSelectedKind("");
                setSelectedEquipment("");
                setCurrentPage(1);
                setHasMore(true);
                fetchExercises(1, false);
              }}
              variant="outline"
            >
              Limpiar Filtros
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {exercises.map((exercise) => {
              console.log("🔍 [EXERCISE] Exercise data:", exercise);
              console.log(
                "🔍 [EXERCISE] Image URL:",
                `${EXERCISE_IMAGES_BASE_URL}/${exercise.gif_url}`
              );
              return (
                <Card
                  key={exercise.id}
                  className="hover:shadow-soft transition-shadow cursor-pointer"
                  onClick={() => {
                    router.replace(`/exercises?id=${exercise.id}`);
                    setSelectedExercise(exercise as ExerciseDetail);
                  }}
                >
                  <CardHeader>
                    {exercise.gif_url && (
                      <div className="w-full h-48 bg-surface rounded-lg overflow-hidden mb-3">
                        <img
                          src={`${EXERCISE_IMAGES_BASE_URL}/${exercise.gif_url}`}
                          alt={exercise.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder-exercise.svg";
                          }}
                        />
                      </div>
                    )}
                    <CardTitle className="text-lg text-txt line-clamp-2">
                      {exercise.name}
                    </CardTitle>
                    <CardDescription className="text-muted">
                      {exercise.kind || "Sin tipo"} •{" "}
                      {exercise.equipment || "Sin equipo"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Aquí podríamos mostrar información adicional si estuviera disponible */}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Indicador de carga para ejercicios adicionales */}
            {loadingMore && hasMore && (
              <>
                {[...Array(6)].map((_, index) => (
                  <Card key={`loading-${index}`} className="animate-pulse">
                    <CardHeader>
                      <div className="w-full h-48 bg-muted/20 rounded-lg mb-3"></div>
                      <div className="h-6 bg-muted/20 rounded w-3/4"></div>
                      <div className="h-4 bg-muted/20 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="h-4 bg-muted/20 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>

          {/* Indicador de carga automática */}
          {hasMore && (
            <div className="text-center py-8">
              {loadingMore ? (
                <div className="inline-flex items-center space-x-2 text-muted">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Cargando más ejercicios...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-muted">
                    Desplázate hacia abajo para cargar más ejercicios
                    automáticamente
                  </div>
                  <div className="text-xs text-muted">
                    Mostrando {exercises.length} ejercicios • Página{" "}
                    {currentPage}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
