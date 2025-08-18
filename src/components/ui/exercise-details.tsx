"use client";
import { Dumbbell, Play, Target, TrendingUp, X } from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

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

interface ExerciseDetailsProps {
  exercise: Exercise;
  onClose: () => void;
}

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

const CATEGORIES = [
  {
    id: "push",
    name: "Empuje",
    icon: Target,
    color: "bg-blue-100 text-blue-800",
  },
  {
    id: "pull",
    name: "Tirón",
    icon: TrendingUp,
    color: "bg-purple-100 text-purple-800",
  },
  {
    id: "squat",
    name: "Sentadillas",
    icon: TrendingUp,
    color: "bg-orange-100 text-orange-800",
  },
  {
    id: "hinge",
    name: "Bisagra",
    icon: TrendingUp,
    color: "bg-red-100 text-red-800",
  },
  {
    id: "core",
    name: "Core",
    icon: TrendingUp,
    color: "bg-green-100 text-green-800",
  },
  {
    id: "cardio",
    name: "Cardio",
    icon: TrendingUp,
    color: "bg-pink-100 text-pink-800",
  },
];

export function ExerciseDetails({ exercise, onClose }: ExerciseDetailsProps) {
  const getDifficultyColor = (difficulty: string) => {
    const level = DIFFICULTY_LEVELS.find((d) => d.id === difficulty);
    return level?.color || "bg-gray-100 text-gray-800";
  };

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find((c) => c.id === categoryId);
  };

  const categoryInfo = getCategoryInfo(exercise.category);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-txt">{exercise.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getDifficultyColor(exercise.difficulty)}>
                  {
                    DIFFICULTY_LEVELS.find((d) => d.id === exercise.difficulty)
                      ?.name
                  }
                </Badge>
                {categoryInfo && (
                  <Badge className={categoryInfo.color}>
                    {categoryInfo.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted hover:text-txt"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                Descripción
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted leading-relaxed">
                {exercise.description}
              </p>
            </CardContent>
          </Card>

          {/* Equipment & Muscles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Equipment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-primary" />
                  Equipamiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {exercise.equipment.length > 0 ? (
                    exercise.equipment.map((equip) => (
                      <Badge key={equip} variant="secondary">
                        {equip === "none" ? "Sin equipamiento" : equip}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted">
                      Sin equipamiento específico
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Muscle Groups */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Músculos Objetivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {exercise.muscle_groups.map((muscle) => (
                    <Badge key={muscle} variant="outline">
                      {muscle}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                Instrucciones de Ejecución
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2">
                {exercise.instructions.map((instruction, index) => (
                  <li key={index} className="text-muted leading-relaxed">
                    {instruction}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Cues */}
          {exercise.cues && exercise.cues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Puntos Clave
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {exercise.cues.map((cue, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted leading-relaxed">{cue}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Variations */}
          {exercise.variations && exercise.variations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Variaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {exercise.variations.map((variation, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted leading-relaxed">{variation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
