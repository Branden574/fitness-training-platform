'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Dumbbell, Calendar, Clock, MoreVertical, Edit, Trash2 } from 'lucide-react';

interface WorkoutExercise {
  exercise: { name: string };
}

interface WorkoutTemplate {
  id: string;
  title: string;
  description?: string;
  difficulty?: string;
  duration?: number;
  exercises?: WorkoutExercise[];
}

interface AssignedWorkout {
  id: string;
  completed: boolean;
  startTime?: string;
  notes?: string;
  user?: { name: string };
  workout?: WorkoutTemplate;
}

interface TrainerWorkoutsTabProps {
  workoutTemplates: WorkoutTemplate[];
  assignedWorkouts: AssignedWorkout[];
  onCreateWorkout: () => void;
  onEditWorkout: (workout: WorkoutTemplate) => void;
  onDeleteWorkout: (workoutId: string) => void;
  onAssignWorkout: (workoutId: string) => void;
  onRemoveAssignment: (sessionId: string) => void;
}

export default function TrainerWorkoutsTab({
  workoutTemplates,
  assignedWorkouts,
  onCreateWorkout,
  onEditWorkout,
  onDeleteWorkout,
  onAssignWorkout,
  onRemoveAssignment,
}: TrainerWorkoutsTabProps) {
  const [showClientMenu, setShowClientMenu] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Workout Templates</h2>
        <button
          onClick={onCreateWorkout}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workoutTemplates.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <Dumbbell className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No workout templates yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first workout template to get started</p>
            <button
              onClick={onCreateWorkout}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Create Your First Template
            </button>
          </div>
        ) : (
          workoutTemplates.map((workout) => (
            <div key={workout.id} className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-[#2a3042] hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{workout.title}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  workout.difficulty === 'BEGINNER' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  workout.difficulty === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {workout.difficulty}
                </span>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{workout.description || 'No description provided'}</p>

              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span>{workout.difficulty || 'No difficulty set'}</span>
                <span>{workout.exercises?.length || 0} exercises</span>
              </div>

              {workout.exercises && workout.exercises.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Exercises:</p>
                  <div className="flex flex-wrap gap-1">
                    {workout.exercises.slice(0, 3).map((ex: WorkoutExercise, idx: number) => (
                      <span key={idx} className="text-xs bg-gray-100 dark:bg-[#2a3042] text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                        {ex.exercise?.name || 'Unknown'}
                      </span>
                    ))}
                    {workout.exercises.length > 3 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">+{workout.exercises.length - 3} more</span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => onAssignWorkout(workout.id)}
                  className="flex-1 bg-indigo-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                >
                  Assign to Client
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowClientMenu(showClientMenu === workout.id ? null : workout.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-[#2a3042] rounded-lg"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {showClientMenu === workout.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1a1f2e] rounded-lg shadow-lg border border-gray-200 dark:border-[#2a3042] z-10">
                      <button
                        onClick={() => {
                          onEditWorkout(workout);
                          setShowClientMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a3042]"
                      >
                        <Edit className="w-4 h-4 mr-3" />
                        Edit Template
                      </button>
                      <button
                        onClick={() => {
                          onDeleteWorkout(workout.id);
                          setShowClientMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4 mr-3" />
                        Delete Template
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assigned Workouts Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Assigned Workouts</h2>

        {assignedWorkouts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-[#1a1f2e] rounded-lg">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <Calendar className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No workouts assigned yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Assigned workouts will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignedWorkouts.map((session) => (
              <div key={session.id} className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-[#2a3042] rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{session.workout?.title || 'Unknown Workout'}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Assigned to: {session.user?.name || 'Unknown User'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Scheduled: {session.startTime ? new Date(session.startTime).toLocaleDateString() : 'Not scheduled'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      session.completed
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {session.completed ? 'Completed' : 'Pending'}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm('Remove this workout assignment?')) {
                          onRemoveAssignment(session.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {session.workout?.duration || 0} min
                  </span>
                  <span className="flex items-center">
                    <Dumbbell className="w-4 h-4 mr-1" />
                    {session.workout?.exercises?.length || 0} exercises
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    session.workout?.difficulty === 'BEGINNER' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    session.workout?.difficulty === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {session.workout?.difficulty || 'Unknown'}
                  </span>
                </div>

                {session.notes && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-[#2a3042] rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{session.notes}</p>
                  </div>
                )}

                {session.workout?.exercises && session.workout.exercises.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">Exercises:</p>
                    <div className="flex flex-wrap gap-2">
                      {session.workout?.exercises?.slice(0, 4).map((ex: WorkoutExercise, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 text-xs rounded-full">
                          {ex.exercise.name}
                        </span>
                      ))}
                      {session.workout && session.workout.exercises && session.workout.exercises.length > 4 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-[#2a3042] text-gray-600 dark:text-gray-400 text-xs rounded-full">
                          +{session.workout.exercises.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
