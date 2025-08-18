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
import { ExerciseDetails } from "@/components/ui/exercise-details";
import { Input } from "@/components/ui/input";
import {
  Dumbbell,
  Filter,
  Grid3X3,
  Home,
  List,
  Search,
  Target,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface Exercise {
  id: string;
  name: string;
  category: string;
  equipment: string[];
  muscle_groups: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  description: string;
  instructions: string[];
  cues: string[];
  variations?: string[];
}

interface ExerciseFilters {
  search: string;
  category: string;
  equipment: string;
  difficulty: string;
  muscle_group: string;
}

const CATEGORIES = [
  { id: "push", name: "Empuje", icon: Target },
  { id: "pull", name: "Tirón", icon: TrendingUp },
  { id: "squat", name: "Sentadillas", icon: TrendingUp },
  { id: "hinge", name: "Bisagra", icon: TrendingUp },
  { id: "core", name: "Core", icon: TrendingUp },
  { id: "cardio", name: "Cardio", icon: TrendingUp },
];

const EQUIPMENT = [
  { id: "none", name: "Sin Equipamiento", icon: Home },
  { id: "dumbbells", name: "Mancuernas", icon: Dumbbell },
  { id: "barbell", name: "Barra", icon: Dumbbell },
  { id: "resistance_band", name: "Bandas", icon: Dumbbell },
  { id: "kettlebell", name: "Pesa Rusa", icon: Dumbbell },
  { id: "pull-up bar", name: "Barra de Dominadas", icon: Dumbbell },
  { id: "bench", name: "Banco", icon: Dumbbell },
  { id: "chair", name: "Silla", icon: Home },
  { id: "wall", name: "Pared", icon: Home },
];

const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "glutes",
  "abs",
  "calves",
  "hamstrings",
  "core",
  "obliques",
  "forearms",
  "traps",
  "adductors",
];

const DIFFICULTY_LEVELS = [
  {
    id: "beginner",
    name: "Principiante",
    color: "bg-green-100 text-green-800",
  },
  {
    id: "intermediate",
    name: "Intermedio",
    color: "bg-yellow-100 text-yellow-800",
  },
  { id: "advanced", name: "Avanzado", color: "bg-red-100 text-red-800" },
];

export default function ExercisesPage() {
  useTranslation("common");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );
  const [filters, setFilters] = useState<ExerciseFilters>({
    search: "",
    category: "",
    equipment: "",
    difficulty: "",
    muscle_group: "",
  });

  // Cargar ejercicios desde la API
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/exercises");

        if (!response.ok) {
          throw new Error("Failed to fetch exercises");
        }

        const data = await response.json();

        if (data.success) {
          setExercises(data.exercises);
          setFilteredExercises(data.exercises);
        } else {
          console.error("Error fetching exercises:", data.error);
        }
      } catch (error) {
        console.error("Error fetching exercises:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let filtered = exercises;

    if (filters.search) {
      filtered = filtered.filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          exercise.description
            .toLowerCase()
            .includes(filters.search.toLowerCase())
      );
    }

    if (filters.category) {
      filtered = filtered.filter(
        (exercise) => exercise.category === filters.category
      );
    }

    if (filters.equipment) {
      filtered = filtered.filter((exercise) =>
        exercise.equipment.includes(filters.equipment)
      );
    }

    if (filters.difficulty) {
      filtered = filtered.filter(
        (exercise) => exercise.difficulty === filters.difficulty
      );
    }

    if (filters.muscle_group) {
      filtered = filtered.filter((exercise) =>
        exercise.muscle_groups.some((muscle) =>
          muscle.toLowerCase().includes(filters.muscle_group.toLowerCase())
        )
      );
    }

    setFilteredExercises(filtered);
  }, [exercises, filters]);

  const clearFilters = () => {
    setFilters({
      search: "",
      category: "",
      equipment: "",
      difficulty: "",
      muscle_group: "",
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    const level = DIFFICULTY_LEVELS.find((d) => d.id === difficulty);
    return level?.color || "bg-gray-100 text-gray-800";
  };

  const handleShowDetails = (exercise: Exercise) => {
    setSelectedExercise(exercise);
  };

  const handleCloseDetails = () => {
    setSelectedExercise(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted">Cargando ejercicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-txt mb-2">
          Biblioteca de Ejercicios
        </h1>
        <p className="text-muted text-lg">
          Explora y descubre ejercicios para tu rutina de entrenamiento
        </p>
      </div>

      {/* Filtros y Búsqueda */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
              <Input
                placeholder="Buscar ejercicios..."
                value={filters.search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="pl-10"
              />
            </div>

            {/* Filtros en Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-txt mb-2">
                  Categoría
                </label>
                <select
                  value={filters.category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFilters((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full p-2 border border-border rounded-lg bg-bg text-txt"
                >
                  <option value="">Todas las categorías</option>
                  {CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Equipamiento */}
              <div>
                <label className="block text-sm font-medium text-txt mb-2">
                  Equipamiento
                </label>
                <select
                  value={filters.equipment}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFilters((prev) => ({
                      ...prev,
                      equipment: e.target.value,
                    }))
                  }
                  className="w-full p-2 border border-border rounded-lg bg-bg text-txt"
                >
                  <option value="">Todo el equipamiento</option>
                  {EQUIPMENT.map((equip) => (
                    <option key={equip.id} value={equip.id}>
                      {equip.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dificultad */}
              <div>
                <label className="block text-sm font-medium text-txt mb-2">
                  Dificultad
                </label>
                <select
                  value={filters.difficulty}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFilters((prev) => ({
                      ...prev,
                      difficulty: e.target.value,
                    }))
                  }
                  className="w-full p-2 border border-border rounded-lg bg-bg text-txt"
                >
                  <option value="">Todas las dificultades</option>
                  {DIFFICULTY_LEVELS.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grupo Muscular */}
              <div>
                <label className="block text-sm font-medium text-txt mb-2">
                  Grupo Muscular
                </label>
                <select
                  value={filters.muscle_group}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFilters((prev) => ({
                      ...prev,
                      muscle_group: e.target.value,
                    }))
                  }
                  className="w-full p-2 border border-border rounded-lg bg-bg text-txt"
                >
                  <option value="">Todos los músculos</option>
                  {MUSCLE_GROUPS.map((muscle) => (
                    <option key={muscle} value={muscle}>
                      {muscle}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-between">
              <Button onClick={clearFilters} variant="outline" size="sm">
                Limpiar Filtros
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">
                  {filteredExercises.length} ejercicios encontrados
                </span>
                <div className="flex border border-border rounded-lg">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-r-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ejercicios */}
      {filteredExercises.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-surface border border-border rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-12 h-12 text-muted" />
          </div>
          <h3 className="text-xl font-semibold text-txt mb-2">
            No se encontraron ejercicios
          </h3>
          <p className="text-muted mb-6">
            Intenta ajustar los filtros o la búsqueda
          </p>
          <Button onClick={clearFilters} variant="outline">
            Limpiar Filtros
          </Button>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }
        >
          {filteredExercises.map((exercise) => (
            <Card
              key={exercise.id}
              className="hover:shadow-soft transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-txt mb-2">
                      {exercise.name}
                    </CardTitle>
                    <CardDescription className="text-muted mb-3">
                      {exercise.description}
                    </CardDescription>
                  </div>
                  <Badge className={getDifficultyColor(exercise.difficulty)}>
                    {
                      DIFFICULTY_LEVELS.find(
                        (d) => d.id === exercise.difficulty
                      )?.name
                    }
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Categoría */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-txt">
                      Categoría:
                    </span>
                    <Badge variant="outline">
                      {CATEGORIES.find((c) => c.id === exercise.category)?.name}
                    </Badge>
                  </div>

                  {/* Equipamiento */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-txt">
                      Equipamiento:
                    </span>
                    <div className="flex gap-1">
                      {exercise.equipment.map((equip) => (
                        <Badge
                          key={equip}
                          variant="secondary"
                          className="text-xs"
                        >
                          {EQUIPMENT.find((e) => e.id === equip)?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Músculos */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-txt">
                      Músculos:
                    </span>
                    <div className="flex gap-1 flex-wrap">
                      {exercise.muscle_groups.map((muscle) => (
                        <Badge
                          key={muscle}
                          variant="outline"
                          className="text-xs"
                        >
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Botón Ver Detalles */}
                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => handleShowDetails(exercise)}
                  >
                    Ver Detalles
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Detalles del Ejercicio */}
      {selectedExercise && (
        <ExerciseDetails
          exercise={selectedExercise}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
}
