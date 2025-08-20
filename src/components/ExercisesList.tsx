"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Exercise,
  Filters,
  useExercisesPagination,
} from "@/hooks/useExercisesPagination";
import { Filter, Loader2, RefreshCw, Search, X } from "lucide-react";
import React, { useState } from "react";

interface ExercisesListProps {
  onExerciseSelect?: (exercise: Exercise) => void;
  showFilters?: boolean;
  showSearch?: boolean;
}

export const ExercisesList: React.FC<ExercisesListProps> = ({
  showFilters = true,
  showSearch = true,
}) => {
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [localFilters, setLocalFilters] = useState<Filters>({});

  const {
    exercises,
    pagination,
    loading,
    error,
    hasMore,
    totalExercises,
    currentPage,
    totalPages,
    applyFilters,
    search,
    clearFilters,
    refresh,
    lastExerciseElementRef,
  } = useExercisesPagination({
    initialLimit: 10,
    autoLoad: true,
  });

  // Manejar búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(searchTerm);
  };

  // Aplicar filtros locales
  const handleApplyFilters = () => {
    applyFilters(localFilters);
    setShowFiltersPanel(false);
  };

  // Limpiar todos los filtros
  const handleClearAll = () => {
    setLocalFilters({});
    setSearchTerm("");
    clearFilters();
  };

  // Manejar cambio en filtros locales
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  // Renderizar tarjeta de ejercicio
  const renderExerciseCard = (exercise: Exercise, index: number) => {
    const isLast = index === exercises.length - 1;

    // Construir la URL completa de la imagen
    const imageUrl = exercise.gif_url
      ? `${process.env.NEXT_PUBLIC_STATICS_IMAGES || ""}${exercise.gif_url}`
      : "/placeholder-exercise.svg"; // Imagen por defecto si no hay gif_url

    return (
      <div
        key={exercise.id}
        ref={isLast ? lastExerciseElementRef : null}
        className="w-full"
      >
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <div className="p-4">
            <div className="flex items-start gap-4">
              {/* Imagen del ejercicio */}
              <div className="flex-shrink-0">
                <img
                  src={imageUrl}
                  alt={exercise.name}
                  className="w-24 h-24 object-cover rounded-lg bg-gray-100"
                  onError={(e) => {
                    // Fallback si la imagen falla
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder-exercise.svg";
                  }}
                />
              </div>

              {/* Información del ejercicio */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-gray-900 mb-2 truncate">
                  {exercise.name}
                </h3>

                <div className="flex flex-wrap gap-2 mb-3">
                  {exercise.category && (
                    <Badge variant="secondary" className="text-xs">
                      {exercise.category}
                    </Badge>
                  )}
                  {exercise.kind && (
                    <Badge variant="outline" className="text-xs">
                      {exercise.kind}
                    </Badge>
                  )}
                  {exercise.equipment && (
                    <Badge variant="outline" className="text-xs">
                      {exercise.equipment}
                    </Badge>
                  )}
                </div>

                {exercise.primary_muscles && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Músculos:</span>{" "}
                    {exercise.primary_muscles}
                  </p>
                )}

                {exercise.overview && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {exercise.overview}
                  </p>
                )}
              </div>

              {/* Botón de ver detalles */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Usar router.push para navegación en la misma pestaña
                  window.location.href = `/exercises/${encodeURIComponent(
                    exercise.name
                  )}`;
                }}
                className="flex-shrink-0"
              >
                Ver detalles
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header con estadísticas */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Biblioteca de Ejercicios
            </h2>
            <p className="text-gray-600">
              {totalExercises > 0
                ? `${totalExercises} ejercicios disponibles`
                : "Cargando ejercicios..."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="ml-2">Actualizar</span>
            </Button>
          </div>
        </div>

        {/* Información de paginación */}
        {pagination && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <span>
              Mostrando {exercises.length} de {totalExercises} ejercicios
            </span>
          </div>
        )}
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="mb-6 space-y-4">
        {/* Búsqueda */}
        {showSearch && (
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar ejercicios por nombre, descripción o músculos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={loading}>
              Buscar
            </Button>
          </form>
        )}

        {/* Filtros */}
        {showFilters && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span className="font-medium">Filtros</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              >
                {showFiltersPanel ? "Ocultar" : "Mostrar"}
              </Button>
            </div>

            {showFiltersPanel && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <Input
                    placeholder="Ej: Chest, Back, Legs"
                    value={localFilters.category || ""}
                    onChange={(e) =>
                      handleFilterChange("category", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <Input
                    placeholder="Ej: Strength, Cardio, Flexibility"
                    value={localFilters.kind || ""}
                    onChange={(e) => handleFilterChange("kind", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipamiento
                  </label>
                  <Input
                    placeholder="Ej: Dumbbells, Barbell, Bodyweight"
                    value={localFilters.equipment || ""}
                    onChange={(e) =>
                      handleFilterChange("equipment", e.target.value)
                    }
                  />
                </div>
              </div>
            )}

            {showFiltersPanel && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <Button onClick={handleApplyFilters} disabled={loading}>
                  Aplicar Filtros
                </Button>
                <Button variant="outline" onClick={handleClearAll}>
                  <X className="w-4 h-4 mr-2" />
                  Limpiar Todo
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de ejercicios */}
      <div className="space-y-4">
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600 text-center">Error: {error}</p>
              <div className="flex justify-center mt-3">
                <Button variant="outline" onClick={refresh}>
                  Reintentar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {exercises.length === 0 && !loading && !error && (
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="pt-6">
              <p className="text-gray-600 text-center">
                No se encontraron ejercicios con los filtros aplicados.
              </p>
              <div className="flex justify-center mt-3">
                <Button variant="outline" onClick={handleClearAll}>
                  Limpiar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {exercises.map((exercise, index) =>
          renderExerciseCard(exercise, index)
        )}

        {/* Indicador de carga */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-gray-600">Cargando más ejercicios...</span>
            </div>
          </div>
        )}

        {/* Indicador de fin de lista */}
        {!hasMore && exercises.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Has llegado al final de la lista</p>
            <p className="text-sm">
              Se mostraron todos los {totalExercises} ejercicios
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
