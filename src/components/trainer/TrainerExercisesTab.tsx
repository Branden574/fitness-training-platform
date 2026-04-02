'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Dumbbell,
} from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  muscleGroups?: string | string[];
  targetMuscle?: string;
  difficulty?: string;
  equipment?: string;
  description?: string;
  category?: string;
  instructions?: string;
}

interface TrainerExercisesTabProps {
  availableExercises: Exercise[];
  exerciseFilter: string;
  onFilterChange: (value: string) => void;
  exerciseSearchTerm: string;
  onSearchChange: (value: string) => void;
  onCreateExercise: () => void;
  onEditExercise: (exercise: Exercise) => void;
  onDeleteExercise: (exerciseId: string) => void;
}

export default function TrainerExercisesTab({
  availableExercises,
  exerciseFilter,
  onFilterChange,
  exerciseSearchTerm,
  onSearchChange,
  onCreateExercise,
  onEditExercise,
  onDeleteExercise,
}: TrainerExercisesTabProps) {
  const [showMenuId, setShowMenuId] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Exercise Management</h2>
        <button
          onClick={onCreateExercise}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Create Exercise
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search exercises..."
              value={exerciseSearchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#2a3042] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-[#1a1f2e]"
            />
          </div>

          <select
            value={exerciseFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-[#2a3042] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-[#1a1f2e]"
          >
            <option value="all">All Muscle Groups</option>
            <option value="chest">Chest</option>
            <option value="back">Back</option>
            <option value="shoulders">Shoulders</option>
            <option value="arms">Arms</option>
            <option value="legs">Legs</option>
            <option value="core">Core</option>
            <option value="cardio">Cardio</option>
          </select>
        </div>
      </div>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableExercises
          .filter(exercise => {
            const exerciseName = exercise.name || '';

            let exerciseMuscle = '';
            if (exercise.muscleGroups) {
              if (Array.isArray(exercise.muscleGroups)) {
                exerciseMuscle = exercise.muscleGroups.join(' ');
              } else if (typeof exercise.muscleGroups === 'string') {
                exerciseMuscle = exercise.muscleGroups;
              }
            } else if (exercise.targetMuscle && typeof exercise.targetMuscle === 'string') {
              exerciseMuscle = exercise.targetMuscle;
            }

            const searchTerm = exerciseSearchTerm.toLowerCase();

            const matchesSearch = exerciseName.toLowerCase().includes(searchTerm) ||
                                exerciseMuscle.toLowerCase().includes(searchTerm);
            const matchesFilter = exerciseFilter === 'all' ||
                                exerciseMuscle.toLowerCase().includes(exerciseFilter.toLowerCase());
            return matchesSearch && matchesFilter;
          })
          .map((exercise) => (
          <div key={exercise.id} className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-[#2a3042] hover:shadow-md transition-shadow flex flex-col h-full max-w-full overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white flex-1 pr-2 overflow-hidden">
                <span className="block truncate">{exercise.name}</span>
              </h3>
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowMenuId(showMenuId === exercise.id ? null : exercise.id)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showMenuId === exercise.id && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#1a1f2e] rounded-lg shadow-xl border border-gray-200 dark:border-[#2a3042] py-2 z-10">
                    <button
                      onClick={() => {
                        onEditExercise(exercise);
                        setShowMenuId(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-400 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit Exercise</span>
                    </button>
                    <button
                      onClick={() => {
                        onDeleteExercise(exercise.id);
                        setShowMenuId(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Exercise</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">Target Muscle:</span>
                <span className="font-medium text-gray-900 dark:text-white dark:text-white text-right truncate ml-2">{exercise.muscleGroups || exercise.targetMuscle || 'Not specified'}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">Difficulty:</span>
                <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                  exercise.difficulty === 'BEGINNER' ? 'bg-green-100 text-green-800' :
                  exercise.difficulty === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {exercise.difficulty}
                </span>
              </div>
              {exercise.equipment && (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">Equipment:</span>
                  <span className="font-medium text-gray-900 dark:text-white dark:text-white text-right truncate ml-2">{exercise.equipment}</span>
                </div>
              )}
              {(exercise.description || exercise.category) && (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">Category:</span>
                  <span className="font-medium text-gray-900 dark:text-white dark:text-white text-right truncate ml-2">{exercise.description || exercise.category}</span>
                </div>
              )}
            </div>

            {exercise.instructions && (
              <div className="mb-4 flex-1 overflow-hidden">
                <p className="text-sm text-gray-700 dark:text-gray-400 overflow-hidden" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}>{exercise.instructions}</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-[#2a3042] mt-auto">
              <button
                onClick={() => onEditExercise(exercise)}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Edit Exercise
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {availableExercises.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Dumbbell className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-2">No exercises yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first exercise to get started</p>
          <button
            onClick={onCreateExercise}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create Your First Exercise
          </button>
        </div>
      )}
    </motion.div>
  );
}
