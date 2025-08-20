"use client";

import React from 'react';
import { Exercise } from '@/hooks/useExercisesPagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Play, Target, Lightbulb, Heart, Dumbbell } from 'lucide-react';

interface ExerciseDetailsModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (exercise: Exercise) => void;
}

export const ExerciseDetailsModal: React.FC<ExerciseDetailsModalProps> = ({
  exercise,
  isOpen,
  onClose,
  onSelect
}) => {
  if (!isOpen || !exercise) return null;

  const handleSelect = () => {
    onSelect?.(exercise);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              {exercise.name}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Imagen y badges principales */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Imagen */}
            <div className="lg:w-1/3">
              <div className="rounded-lg overflow-hidden bg-gray-100">
                {exercise.gif_url ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_STATICS_IMAGES || ''}${exercise.gif_url}`}
                    alt={exercise.name}
                    className="w-full h-auto object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder-exercise.svg";
                    }}
                  />
                ) : (
                  <img
                    src="/placeholder-exercise.svg"
                    alt={`${exercise.name} - Sin imagen disponible`}
                    className="w-full h-auto object-cover opacity-50"
                  />
                )}
              </div>
            </div>

            {/* Información principal */}
            <div className="lg:w-2/3 space-y-4">
              {/* Badges */}
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

              {/* Descripción */}
              {exercise.overview && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Descripción
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {exercise.overview}
                  </p>
                </div>
              )}

              {/* Músculos */}
              {exercise.primary_muscles && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Músculos Principales
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {exercise.primary_muscles.split(',').map((muscle, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        {muscle.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Músculos secundarios */}
              {exercise.muscle_groups_secondary && exercise.muscle_groups_secondary.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Músculos Secundarios
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {exercise.muscle_groups_secondary.map((muscle, idx) => (
                      <Badge key={idx} variant="outline" className="text-sm">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

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
                <ol className="space-y-3">
                  {exercise.instructions.map((instruction, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-semibold">
                        {idx + 1}
                      </span>
                      <p className="text-gray-700 leading-relaxed">
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
                <div className="grid gap-3">
                  {exercise.tips.map((tip, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-yellow-50 rounded-lg">
                      <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-700 leading-relaxed">
                        {tip}
                      </p>
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
                <div className="grid gap-3">
                  {exercise.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-red-50 rounded-lg">
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

          {/* Información adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Adicional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Categoría:</span>
                  <span className="ml-2 text-gray-600">{exercise.category}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Tipo:</span>
                  <span className="ml-2 text-gray-600">{exercise.kind}</span>
                </div>
                {exercise.equipment && (
                  <div>
                    <span className="font-medium text-gray-700">Equipamiento:</span>
                    <span className="ml-2 text-gray-600">{exercise.equipment}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Fecha de creación:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(exercise.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer con botones */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            ID: {exercise.id}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {onSelect && (
              <Button onClick={handleSelect}>
                Seleccionar Ejercicio
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
