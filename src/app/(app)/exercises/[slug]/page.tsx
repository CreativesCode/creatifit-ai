"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Exercise } from "@/hooks/useExercisesPagination";
import {
  ArrowLeft,
  Bookmark,
  Dumbbell,
  Heart,
  Lightbulb,
  Play,
  Share2,
  Star,
  Target,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ExerciseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExercise = async () => {
      try {
        setLoading(true);
        // Aquí deberías hacer la llamada a tu API para obtener el ejercicio por slug
        // Por ahora usamos un mock
        const response = await fetch(`/api/exercises/${params.slug}`);
        if (!response.ok) {
          throw new Error("Ejercicio no encontrado");
        }
        const data = await response.json();
        console.log("📥 [FRONTEND] Respuesta de la API:", data);

        if (data.success && data.data) {
          setExercise(data.data);
        } else {
          throw new Error(data.error || "Error en la respuesta de la API");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    if (params.slug) {
      fetchExercise();
    }
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando ejercicio...</p>
        </div>
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Ejercicio no encontrado
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "El ejercicio solicitado no existe"}
          </p>
          <Button onClick={() => router.push("/exercises")}>
            Volver a ejercicios
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con navegación */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/exercises")}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900 truncate">
                {exercise.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                <Bookmark className="w-4 h-4 mr-2" />
                Guardar
              </Button>
              <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda - Imagen y badges */}
          <div className="lg:col-span-1">
            {/* Imagen principal */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="aspect-square bg-gray-100">
                {exercise.gif_url ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_STATICS_IMAGES || ""}${
                      exercise.gif_url
                    }`}
                    alt={exercise.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder-exercise.svg";
                    }}
                  />
                ) : (
                  <img
                    src="/placeholder-exercise.svg"
                    alt={`${exercise.name} - Sin imagen disponible`}
                    className="w-full h-full object-cover opacity-50"
                  />
                )}
              </div>
            </div>

            {/* Badges y información rápida */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-sm">
                  {exercise.category}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {exercise.kind}
                </Badge>
                {exercise.equipment && (
                  <Badge variant="outline" className="text-sm">
                    <Dumbbell className="w-3 h-3 mr-1" />
                    {exercise.equipment}
                  </Badge>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= 4
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">4.0 (128 reviews)</span>
              </div>

              {/* Botón de acción principal */}
              <Button className="w-full" size="lg">
                Agregar a mi rutina
              </Button>
            </div>
          </div>

          {/* Columna derecha - Contenido principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Descripción */}
            {exercise.overview && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Descripción del Ejercicio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {exercise.overview}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Músculos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Músculos Principales */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Músculos Principales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {exercise.muscle_groups_primary &&
                    exercise.muscle_groups_primary.length > 0 ? (
                      exercise.muscle_groups_primary.map((muscle, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-sm"
                        >
                          {muscle}
                        </Badge>
                      ))
                    ) : exercise.primary_muscles ? (
                      exercise.primary_muscles.split(",").map((muscle, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-sm"
                        >
                          {muscle.trim()}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">
                        No especificado
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Músculos Secundarios */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Músculos Secundarios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {exercise.muscle_groups_secondary &&
                    exercise.muscle_groups_secondary.length > 0 ? (
                      exercise.muscle_groups_secondary.map((muscle, idx) => (
                        <Badge key={idx} variant="outline" className="text-sm">
                          {muscle}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">
                        No especificado
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Categorías Múltiples */}
            {exercise.all_categories && exercise.all_categories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Categorías del Ejercicio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {exercise.all_categories.map((category, idx) => (
                      <Badge
                        key={idx}
                        variant={idx === 0 ? "secondary" : "outline"}
                        className="text-sm"
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instrucciones */}
            {exercise.instructions && exercise.instructions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-green-600" />
                    Instrucciones de Ejecución
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {exercise.instructions.map((instruction, idx) => (
                      <li key={idx} className="flex gap-4">
                        <span className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-semibold">
                          {idx + 1}
                        </span>
                        <p className="text-gray-700 leading-relaxed text-base">
                          {instruction}
                        </p>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Consejos */}
            {exercise.tips && exercise.tips.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                    Consejos y Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {exercise.tips.map((tip, idx) => (
                      <div
                        key={idx}
                        className="flex gap-4 p-4 bg-yellow-50 rounded-lg"
                      >
                        <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-gray-700 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Beneficios */}
            {exercise.benefits && exercise.benefits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-600" />
                    Beneficios del Ejercicio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {exercise.benefits.map((benefit, idx) => (
                      <div
                        key={idx}
                        className="flex gap-4 p-4 bg-red-50 rounded-lg"
                      >
                        <Heart className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-gray-700 leading-relaxed">
                          {benefit}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Información técnica */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información Técnica</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">
                      Categoría:
                    </span>
                    <span className="ml-2 text-gray-600">
                      {exercise.category}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Tipo:</span>
                    <span className="ml-2 text-gray-600">{exercise.kind}</span>
                  </div>
                  {exercise.equipment && (
                    <div>
                      <span className="font-medium text-gray-700">
                        Equipamiento:
                      </span>
                      <span className="ml-2 text-gray-600">
                        {exercise.equipment}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">
                      Fecha de creación:
                    </span>
                    <span className="ml-2 text-gray-600">
                      {new Date(exercise.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Última actualización:
                    </span>
                    <span className="ml-2 text-gray-600">
                      {new Date(exercise.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      ID del ejercicio:
                    </span>
                    <span className="ml-2 text-gray-600 font-mono text-xs">
                      {exercise.id}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Datos Meta (si existen) */}
            {exercise.meta && Object.keys(exercise.meta).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Información Adicional
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(exercise.meta).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between items-start"
                      >
                        <span className="font-medium text-gray-700 capitalize">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <span className="text-gray-600 text-right max-w-xs">
                          {typeof value === "string"
                            ? value
                            : JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ejercicios relacionados (placeholder) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Ejercicios Relacionados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Aquí se mostrarían ejercicios similares o que trabajen los
                  mismos músculos.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
