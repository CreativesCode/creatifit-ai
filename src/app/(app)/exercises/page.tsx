"use client";

import React, { useState } from 'react';
import { ExercisesList } from '@/components/ExercisesList';
import { ExerciseDetailsModal } from '@/components/ExerciseDetailsModal';
import { Exercise } from '@/hooks/useExercisesPagination';

export default function ExercisesPage() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleExerciseSelect = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedExercise(null);
  };

  const handleExerciseAction = (exercise: Exercise) => {
    // Aquí puedes implementar la lógica para agregar el ejercicio a un plan
    // o cualquier otra acción que necesites
    console.log('Ejercicio seleccionado:', exercise);
    
    // Por ahora solo cerramos el modal
    handleCloseModal();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <ExercisesList
          onExerciseSelect={handleExerciseSelect}
          showFilters={true}
          showSearch={true}
        />
      </div>

      <ExerciseDetailsModal
        exercise={selectedExercise}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSelect={handleExerciseAction}
      />
    </div>
  );
}
