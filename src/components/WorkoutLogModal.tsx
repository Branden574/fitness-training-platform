'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  description?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restTime?: number;
  weight?: number;
  exercise?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface Workout {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  difficulty?: string;
  exercises?: Exercise[];
  completed?: boolean;
  workout?: {
    id: string;
    title: string;
    description?: string;
    duration?: string;
    difficulty?: string;
    exercises?: Exercise[];
  };
}

export interface WorkoutLogSubmitData {
  workout: Workout;
  logDate: string;
  logData: { [exerciseId: string]: { weight: number; reps: number; sets: number } };
}

interface WorkoutLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: Workout;
  onSubmit: (data: WorkoutLogSubmitData) => void;
}

const WorkoutLogModal: React.FC<WorkoutLogModalProps> = ({
  isOpen,
  onClose,
  workout,
  onSubmit,
}) => {
  const [workoutLogDate, setWorkoutLogDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [workoutLogData, setWorkoutLogData] = useState<{
    [exerciseId: string]: { weight: number; reps: number; sets: number };
  }>({});

  if (!isOpen) return null;

  const exercises = workout.workout?.exercises || workout.exercises;

  const handleSubmit = () => {
    onSubmit({
      workout,
      logDate: workoutLogDate,
      logData: workoutLogData,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto dark:border-[#2a3042] border">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Log Workout - {workout.workout?.title || workout.title || "Workout"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Date Selection */}
            <div className="bg-gray-50 dark:bg-[#242938] p-4 rounded-xl border border-gray-200 dark:border-[#2a3042]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Workout Date
              </label>
              <input
                type="date"
                value={workoutLogDate}
                onChange={(e) => setWorkoutLogDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-[#2a3042] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-[#1a1f2e]"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Select the date when you performed this workout
              </p>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl">
              <p className="text-sm text-indigo-800 dark:text-indigo-300">
                Log your weights and reps for each exercise. This data
                helps track your progress and allows Brent to see how
                you&apos;re improving over time!
              </p>
            </div>

            {exercises?.length ? (
              exercises.map((exercise, index: number) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-[#2a3042] rounded-xl p-4"
                >
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {exercise.exercise?.name || exercise.name || `Exercise ${index + 1}`}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Target: {exercise.sets} sets &times; {exercise.reps} reps
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Weight (lbs)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={workoutLogData[index]?.weight || ""}
                        onChange={(e) =>
                          setWorkoutLogData((prev) => ({
                            ...prev,
                            [index]: {
                              ...prev[index],
                              weight: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        placeholder="e.g., 135"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a3042] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-[#1a1f2e]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sets Completed
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={workoutLogData[index]?.sets || ""}
                        onChange={(e) =>
                          setWorkoutLogData((prev) => ({
                            ...prev,
                            [index]: {
                              ...prev[index],
                              sets: parseInt(e.target.value) || 0,
                            },
                          }))
                        }
                        placeholder={`Target: ${exercise.sets}`}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a3042] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-[#1a1f2e]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Average Reps
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={workoutLogData[index]?.reps || ""}
                        onChange={(e) =>
                          setWorkoutLogData((prev) => ({
                            ...prev,
                            [index]: {
                              ...prev[index],
                              reps: parseInt(e.target.value) || 0,
                            },
                          }))
                        }
                        placeholder={`Target: ${exercise.reps}`}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a3042] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-[#1a1f2e]"
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                No exercises found in this workout
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-[#2a3042]">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#242938] rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a3042] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Log Workout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutLogModal;
