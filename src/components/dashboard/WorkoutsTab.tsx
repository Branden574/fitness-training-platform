'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  exercise?: { id: string; name: string };
}

interface Workout {
  id: string;
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

interface ProgressData {
  entries: Array<{ id: string }>;
}

interface WorkoutsTabProps {
  workouts: Workout[];
  loading: boolean;
  progressData: ProgressData | null;
  onLogWorkout: (workout: Workout) => void;
  onViewProgress: () => void;
}

export default function WorkoutsTab({
  workouts,
  loading,
  progressData,
  onLogWorkout,
  onViewProgress,
}: WorkoutsTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;
  const totalPages = Math.ceil(workouts.length / perPage);
  const paginatedWorkouts = workouts.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Assigned Workout Programs
      </h2>

      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-gray-100 dark:border-[#2a3042]">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-7 h-7 border-2 border-gray-300 border-t-indigo-600 rounded-full" />
          </div>
        ) : workouts.length > 0 ? (
          <div>
            {/* Pagination Header */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-[#2a3042]">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {((currentPage - 1) * perPage) + 1}–{Math.min(currentPage * perPage, workouts.length)} of {workouts.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Workout Cards */}
            <div className="divide-y divide-gray-100 dark:divide-[#2a3042]">
              {paginatedWorkouts.map((program) => (
                <div key={program.id} className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {program.workout?.title || 'Workout Program'}
                      </h3>
                      {program.workout?.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {program.workout.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          {program.workout?.duration || 30} min
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {program.workout?.difficulty || 'BEGINNER'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {program.workout?.exercises?.length || 0} exercises
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 self-start flex-shrink-0">
                      Active
                    </span>
                  </div>

                  {/* Exercise Grid */}
                  {program.workout?.exercises && program.workout.exercises.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                      {program.workout.exercises.map((ex, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 bg-gray-50 dark:bg-[#111827] rounded-lg p-3"
                        >
                          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Dumbbell className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {ex.exercise?.name || ex.name || 'Exercise'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {ex.sets} sets × {ex.reps} reps
                              {ex.weight ? ` @ ${ex.weight}lbs` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => onLogWorkout(program)}
                      className="flex-1 bg-indigo-600 text-white py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Log Workout
                    </button>
                    <button
                      onClick={onViewProgress}
                      className="flex-1 bg-gray-100 dark:bg-[#242938] text-gray-700 dark:text-gray-300 py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#2a3042] transition-colors"
                    >
                      View Progress
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 px-5">
            <Dumbbell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
              No workouts assigned yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Contact your trainer to get your first workout!
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
