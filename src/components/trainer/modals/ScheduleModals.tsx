'use client';

import { X } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface AvailableExercise {
  id: string;
  name: string;
  description: string;
  sets: number;
  reps: string;
  weight?: number;
  duration?: number;
  restTime: number;
  muscleGroups?: string;
  targetMuscle?: string;
  difficulty?: string;
  instructions?: string;
  equipment?: string;
  category?: string;
}

interface ScheduleFormData {
  clientId: string;
  title: string;
  type: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  description: string;
  notes: string;
}

interface ExerciseFormData {
  name: string;
  targetMuscle: string;
  difficulty: string;
  instructions: string;
  equipment: string;
  category: string;
}

interface ScheduleModalsProps {
  // Schedule Session
  showScheduleSession: boolean;
  scheduleFormData: ScheduleFormData;
  clients: Client[];
  onCloseScheduleSession: () => void;
  onScheduleFormChange: (data: ScheduleFormData) => void;
  onScheduleSessionSubmit: (e: React.FormEvent) => void;

  // Create Exercise
  showCreateExercise: boolean;
  exerciseFormData: ExerciseFormData;
  onCloseCreateExercise: () => void;
  onExerciseFormChange: (data: ExerciseFormData) => void;
  onCreateExerciseSubmit: (e: React.FormEvent) => void;

  // Edit Exercise
  showEditExercise: string | null;
  editingExercise: AvailableExercise | null;
  onCloseEditExercise: () => void;
  onUpdateExerciseSubmit: (e: React.FormEvent) => void;

  // Delete Exercise Confirm
  showDeleteExerciseConfirm: string | null;
  onCloseDeleteExerciseConfirm: () => void;
  onDeleteExercise: (id: string) => void;
}

export default function ScheduleModals({
  showScheduleSession,
  scheduleFormData,
  clients,
  onCloseScheduleSession,
  onScheduleFormChange,
  onScheduleSessionSubmit,
  showCreateExercise,
  exerciseFormData,
  onCloseCreateExercise,
  onExerciseFormChange,
  onCreateExerciseSubmit,
  showEditExercise,
  editingExercise,
  onCloseEditExercise,
  onUpdateExerciseSubmit,
  showDeleteExerciseConfirm,
  onCloseDeleteExerciseConfirm,
  onDeleteExercise,
}: ScheduleModalsProps) {
  return (
    <>
      {/* Schedule Session Modal */}
      {showScheduleSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-[#2a3042]">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Schedule New Session</h2>
                <button
                  onClick={onCloseScheduleSession}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={onScheduleSessionSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Client *
                  </label>
                  <select
                    name="clientId"
                    value={scheduleFormData.clientId}
                    onChange={(e) => onScheduleFormChange({ ...scheduleFormData, clientId: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Session Type *
                  </label>
                  <select
                    name="type"
                    value={scheduleFormData.type}
                    onChange={(e) => onScheduleFormChange({ ...scheduleFormData, type: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="TRAINING_SESSION">Personal Training</option>
                    <option value="CHECK_IN">Progress Check-in</option>
                    <option value="NUTRITION_CONSULTATION">Nutrition Consultation</option>
                    <option value="ASSESSMENT">Fitness Assessment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                  Session Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={scheduleFormData.title}
                  onChange={(e) => onScheduleFormChange({ ...scheduleFormData, title: e.target.value })}
                  required
                  placeholder="e.g., Upper Body Strength Training"
                  className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={scheduleFormData.date}
                    onChange={(e) => onScheduleFormChange({ ...scheduleFormData, date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={scheduleFormData.time}
                    onChange={(e) => onScheduleFormChange({ ...scheduleFormData, time: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Duration (minutes)
                  </label>
                  <select
                    name="duration"
                    value={scheduleFormData.duration}
                    onChange={(e) => onScheduleFormChange({ ...scheduleFormData, duration: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                  Location (optional)
                </label>
                <input
                  type="text"
                  name="location"
                  value={scheduleFormData.location}
                  onChange={(e) => onScheduleFormChange({ ...scheduleFormData, location: e.target.value })}
                  placeholder="e.g., Main Gym, Studio A, Client's Home"
                  className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                  Session Description
                </label>
                <textarea
                  name="description"
                  value={scheduleFormData.description}
                  onChange={(e) => onScheduleFormChange({ ...scheduleFormData, description: e.target.value })}
                  rows={3}
                  placeholder="What will you work on in this session?"
                  className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                  Notes (optional)
                </label>
                <textarea
                  name="notes"
                  value={scheduleFormData.notes}
                  onChange={(e) => onScheduleFormChange({ ...scheduleFormData, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes or special instructions"
                  className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                ></textarea>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onCloseScheduleSession}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-white bg-gray-100 dark:bg-[#2a3042] rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Schedule Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Exercise Modal */}
      {showCreateExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-[#2a3042]">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">Create New Exercise</h2>
                <button
                  onClick={onCloseCreateExercise}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={onCreateExerciseSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Exercise Name *
                  </label>
                  <input
                    type="text"
                    value={exerciseFormData.name}
                    onChange={(e) => onExerciseFormChange({ ...exerciseFormData, name: e.target.value })}
                    required
                    placeholder="e.g., Push-ups, Bench Press"
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Target Muscle *
                  </label>
                  <select
                    value={exerciseFormData.targetMuscle}
                    onChange={(e) => onExerciseFormChange({ ...exerciseFormData, targetMuscle: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="">Select target muscle</option>
                    <option value="Chest">Chest</option>
                    <option value="Back">Back</option>
                    <option value="Shoulders">Shoulders</option>
                    <option value="Arms">Arms</option>
                    <option value="Biceps">Biceps</option>
                    <option value="Triceps">Triceps</option>
                    <option value="Legs">Legs</option>
                    <option value="Quadriceps">Quadriceps</option>
                    <option value="Hamstrings">Hamstrings</option>
                    <option value="Glutes">Glutes</option>
                    <option value="Calves">Calves</option>
                    <option value="Core">Core</option>
                    <option value="Abs">Abs</option>
                    <option value="Cardio">Cardio</option>
                    <option value="Full Body">Full Body</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={exerciseFormData.difficulty}
                    onChange={(e) => onExerciseFormChange({ ...exerciseFormData, difficulty: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Equipment
                  </label>
                  <select
                    value={exerciseFormData.equipment}
                    onChange={(e) => onExerciseFormChange({ ...exerciseFormData, equipment: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="BODYWEIGHT">Bodyweight</option>
                    <option value="DUMBBELLS">Dumbbells</option>
                    <option value="BARBELL">Barbell</option>
                    <option value="RESISTANCE_BANDS">Resistance Bands</option>
                    <option value="CABLE_MACHINE">Cable Machine</option>
                    <option value="CARDIO_MACHINE">Cardio Machine</option>
                    <option value="KETTLEBELL">Kettlebell</option>
                    <option value="MEDICINE_BALL">Medicine Ball</option>
                    <option value="SUSPENSION_TRAINER">Suspension Trainer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Category
                  </label>
                  <select
                    value={exerciseFormData.category}
                    onChange={(e) => onExerciseFormChange({ ...exerciseFormData, category: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="STRENGTH">Strength Training</option>
                    <option value="CARDIO">Cardio</option>
                    <option value="FLEXIBILITY">Flexibility</option>
                    <option value="BALANCE">Balance</option>
                    <option value="PLYOMETRIC">Plyometric</option>
                    <option value="CORE">Core</option>
                    <option value="REHABILITATION">Rehabilitation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                  Instructions
                </label>
                <textarea
                  value={exerciseFormData.instructions}
                  onChange={(e) => onExerciseFormChange({ ...exerciseFormData, instructions: e.target.value })}
                  rows={5}
                  placeholder="Provide detailed instructions on how to perform this exercise..."
                  className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onCloseCreateExercise}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-white bg-gray-100 dark:bg-[#2a3042] rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Create Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Exercise Modal */}
      {showEditExercise && editingExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-[#2a3042]">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">Edit Exercise</h2>
                <button
                  onClick={onCloseEditExercise}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={onUpdateExerciseSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Exercise Name *
                  </label>
                  <input
                    type="text"
                    value={exerciseFormData.name}
                    onChange={(e) => onExerciseFormChange({ ...exerciseFormData, name: e.target.value })}
                    required
                    placeholder="e.g., Push-ups, Bench Press"
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Target Muscle *
                  </label>
                  <select
                    value={exerciseFormData.targetMuscle}
                    onChange={(e) => onExerciseFormChange({ ...exerciseFormData, targetMuscle: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="">Select target muscle</option>
                    <option value="Chest">Chest</option>
                    <option value="Back">Back</option>
                    <option value="Shoulders">Shoulders</option>
                    <option value="Arms">Arms</option>
                    <option value="Biceps">Biceps</option>
                    <option value="Triceps">Triceps</option>
                    <option value="Legs">Legs</option>
                    <option value="Quadriceps">Quadriceps</option>
                    <option value="Hamstrings">Hamstrings</option>
                    <option value="Glutes">Glutes</option>
                    <option value="Calves">Calves</option>
                    <option value="Core">Core</option>
                    <option value="Abs">Abs</option>
                    <option value="Cardio">Cardio</option>
                    <option value="Full Body">Full Body</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={exerciseFormData.difficulty}
                    onChange={(e) => onExerciseFormChange({ ...exerciseFormData, difficulty: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Equipment
                  </label>
                  <select
                    value={exerciseFormData.equipment}
                    onChange={(e) => onExerciseFormChange({ ...exerciseFormData, equipment: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="BODYWEIGHT">Bodyweight</option>
                    <option value="DUMBBELLS">Dumbbells</option>
                    <option value="BARBELL">Barbell</option>
                    <option value="RESISTANCE_BANDS">Resistance Bands</option>
                    <option value="CABLE_MACHINE">Cable Machine</option>
                    <option value="CARDIO_MACHINE">Cardio Machine</option>
                    <option value="KETTLEBELL">Kettlebell</option>
                    <option value="MEDICINE_BALL">Medicine Ball</option>
                    <option value="SUSPENSION_TRAINER">Suspension Trainer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                    Category
                  </label>
                  <select
                    value={exerciseFormData.category}
                    onChange={(e) => onExerciseFormChange({ ...exerciseFormData, category: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="STRENGTH">Strength Training</option>
                    <option value="CARDIO">Cardio</option>
                    <option value="FLEXIBILITY">Flexibility</option>
                    <option value="BALANCE">Balance</option>
                    <option value="PLYOMETRIC">Plyometric</option>
                    <option value="CORE">Core</option>
                    <option value="REHABILITATION">Rehabilitation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                  Instructions
                </label>
                <textarea
                  value={exerciseFormData.instructions}
                  onChange={(e) => onExerciseFormChange({ ...exerciseFormData, instructions: e.target.value })}
                  rows={5}
                  placeholder="Provide detailed instructions on how to perform this exercise..."
                  className="w-full p-2 border border-gray-300 dark:border-[#2a3042] dark:bg-[#1a1f2e] dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onCloseEditExercise}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-white bg-gray-100 dark:bg-[#2a3042] rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Update Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Exercise Confirmation Modal */}
      {showDeleteExerciseConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white">Delete Exercise</h3>
              <button
                onClick={onCloseDeleteExerciseConfirm}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Are you sure you want to delete this exercise? This action cannot be undone and may affect existing workout templates that use this exercise.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={onCloseDeleteExerciseConfirm}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-white bg-gray-100 dark:bg-[#2a3042] rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteExercise(showDeleteExerciseConfirm);
                    onCloseDeleteExerciseConfirm();
                  }}
                  className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Exercise
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
