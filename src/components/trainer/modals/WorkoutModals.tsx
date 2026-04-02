'use client';

import { Search, X, Trash2 } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

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

interface WorkoutExerciseEntry {
  exerciseId: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  restTime: number;
  notes: string;
  order: number;
}

interface WorkoutFormData {
  title: string;
  description: string;
  duration: number;
  startDate: string;
  endDate: string;
  difficulty: string;
  type: string;
  exercises: WorkoutExerciseEntry[];
}

interface WorkoutTemplate {
  id: string;
  title: string;
  description: string;
  duration?: number;
  startDate?: string;
  endDate?: string;
  difficulty?: string;
  type?: string;
  exercises: Array<{
    id: string;
    exercise: {
      id: string;
      name: string;
      description: string;
      sets: number;
      reps: string;
      weight?: number;
      duration?: number;
      restTime: number;
    };
    order: number;
    sets: number;
    reps: string;
    weight?: number;
    duration?: number;
    restTime: number;
    notes?: string;
  }>;
  sessions: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  createdAt: Date;
  workout?: {
    title: string;
    duration?: number;
    difficulty?: string;
    exercises: Array<{
      exercise: {
        name: string;
      };
    }>;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  startTime?: Date;
  completed?: boolean;
  notes?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastActivity?: string;
  progress?: {
    currentWeight: number;
    goalWeight: number;
    workoutStreak: number;
  };
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface WorkoutModalsProps {
  // Visibility flags
  showCreateWorkout: boolean;
  showEditWorkout: string | null;
  editingWorkout: WorkoutTemplate | null;
  showAssignWorkoutModal: string | null;

  // Data
  workoutFormData: WorkoutFormData;
  clients: Client[];
  availableExercises: AvailableExercise[];
  exerciseSearchTerm: string;

  // Create modal callbacks
  onCloseCreate: () => void;
  onCreateSubmit: (e: React.FormEvent) => void;

  // Edit modal callbacks
  onCloseEdit: () => void;
  onEditSubmit: (e: React.FormEvent) => void;

  // Assign modal callbacks
  onCloseAssign: () => void;
  onAssignToClient: (clientId: string, workoutId: string) => void;

  // Shared form callbacks
  onFormChange: (updates: Partial<WorkoutFormData>) => void;
  onExerciseSearchChange: (term: string) => void;
  onAddExercise: (exercise: AvailableExercise) => void;
  onRemoveExercise: (index: number) => void;
  onUpdateExercise: (index: number, updates: { sets?: number; reps?: number; restTime?: number; notes?: string }) => void;
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const inputClasses =
  'w-full p-2 border border-gray-300 dark:border-[#2a3042] rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white dark:text-white dark:bg-[#1a1f2e]';

const smallInputClasses =
  'w-full p-1 border border-gray-300 dark:border-[#2a3042] rounded text-sm text-gray-900 dark:text-white dark:text-white dark:bg-[#1a1f2e]';

const labelClasses = 'block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-1';

const smallLabelClasses = 'block text-xs font-medium text-gray-900 dark:text-white dark:text-white mb-1';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function WorkoutModals({
  showCreateWorkout,
  showEditWorkout,
  editingWorkout,
  showAssignWorkoutModal,
  workoutFormData,
  clients,
  availableExercises,
  exerciseSearchTerm,
  onCloseCreate,
  onCreateSubmit,
  onCloseEdit,
  onEditSubmit,
  onCloseAssign,
  onAssignToClient,
  onFormChange,
  onExerciseSearchChange,
  onAddExercise,
  onRemoveExercise,
  onUpdateExercise,
}: WorkoutModalsProps) {

  // ── Exercise filtering helper ────────────────────────────────────────────────

  const filterExercises = (exercises: AvailableExercise[], searchTerm: string) => {
    const term = searchTerm.toLowerCase();
    return exercises.filter((exercise) => {
      const name = exercise.name.toLowerCase();

      let muscleText = '';
      if (exercise.muscleGroups) {
        if (Array.isArray(exercise.muscleGroups)) {
          muscleText = (exercise.muscleGroups as unknown as string[]).join(' ').toLowerCase();
        } else if (typeof exercise.muscleGroups === 'string') {
          muscleText = exercise.muscleGroups.toLowerCase();
        }
      } else if (exercise.targetMuscle && typeof exercise.targetMuscle === 'string') {
        muscleText = exercise.targetMuscle.toLowerCase();
      }

      const difficulty = exercise.difficulty?.toLowerCase() || '';

      return name.includes(term) || muscleText.includes(term) || difficulty.includes(term);
    });
  };

  // ── Quick-filter buttons ─────────────────────────────────────────────────────

  const QuickFilterButtons = () => (
    <div className="flex flex-wrap gap-2">
      {['', 'chest', 'back', 'legs', 'arms', 'core'].map((filter) => {
        const label = filter === '' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1);
        const isActive = exerciseSearchTerm === filter;
        return (
          <button
            key={filter}
            type="button"
            onClick={() => onExerciseSearchChange(filter)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-[#2a3042] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#343b50]'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  // ── Selected exercises list (shared by both create & edit) ────────────────────

  const SelectedExercisesList = ({ heading }: { heading: string }) => {
    if (workoutFormData.exercises.length === 0) return null;

    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white dark:text-white">
          {heading} ({workoutFormData.exercises.length})
        </h3>
        <div className="space-y-3">
          {workoutFormData.exercises.map((exercise, index) => {
            const exerciseData = availableExercises.find((ex) => ex.id === exercise.exerciseId);
            return (
              <div key={index} className="border border-gray-200 dark:border-[#2a3042] rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white dark:text-white">{exerciseData?.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{exerciseData?.targetMuscle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveExercise(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={smallLabelClasses}>Sets</label>
                    <input
                      type="number"
                      value={exercise.sets}
                      onChange={(e) => onUpdateExercise(index, { sets: parseInt(e.target.value) || 1 })}
                      className={smallInputClasses}
                      min="1"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className={smallLabelClasses}>Reps</label>
                    <input
                      type="number"
                      value={exercise.reps}
                      onChange={(e) => onUpdateExercise(index, { reps: parseInt(e.target.value) || 1 })}
                      className={smallInputClasses}
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className={smallLabelClasses}>Rest (sec)</label>
                    <input
                      type="number"
                      value={exercise.restTime}
                      onChange={(e) => onUpdateExercise(index, { restTime: parseInt(e.target.value) || 30 })}
                      className={smallInputClasses}
                      min="15"
                      max="300"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className={smallLabelClasses}>Notes (optional)</label>
                  <input
                    type="text"
                    value={exercise.notes}
                    onChange={(e) => onUpdateExercise(index, { notes: e.target.value })}
                    className={smallInputClasses}
                    placeholder="Special instructions or modifications..."
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Basic info form fields (shared by both create & edit) ────────────────────

  const BasicInfoFields = ({ idPrefix }: { idPrefix: string }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor={`${idPrefix}-title`} className={labelClasses}>
          Workout Title *
        </label>
        <input
          type="text"
          id={`${idPrefix}-title`}
          required
          value={workoutFormData.title}
          onChange={(e) => onFormChange({ title: e.target.value })}
          className={inputClasses}
          placeholder="e.g., Upper Body Strength"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-startDate`} className={labelClasses}>
          Program Start Date
        </label>
        <input
          type="date"
          id={`${idPrefix}-startDate`}
          value={workoutFormData.startDate || ''}
          onChange={(e) => onFormChange({ startDate: e.target.value })}
          className={inputClasses}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-endDate`} className={labelClasses}>
          Program End Date
        </label>
        <input
          type="date"
          id={`${idPrefix}-endDate`}
          value={workoutFormData.endDate || ''}
          onChange={(e) => onFormChange({ endDate: e.target.value })}
          className={inputClasses}
          min={workoutFormData.startDate || new Date().toISOString().split('T')[0]}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-duration`} className={labelClasses}>
          Duration (minutes)
        </label>
        <input
          type="number"
          id={`${idPrefix}-duration`}
          required
          min="5"
          max="180"
          value={workoutFormData.duration}
          onChange={(e) => onFormChange({ duration: parseInt(e.target.value) || 60 })}
          className={inputClasses}
          placeholder="60"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-difficulty`} className={labelClasses}>
          Difficulty Level
        </label>
        <select
          id={`${idPrefix}-difficulty`}
          value={workoutFormData.difficulty}
          onChange={(e) => onFormChange({ difficulty: e.target.value as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' })}
          className={inputClasses}
        >
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-type`} className={labelClasses}>
          Workout Type
        </label>
        <select
          id={`${idPrefix}-type`}
          value={workoutFormData.type}
          onChange={(e) => onFormChange({ type: e.target.value as 'STRENGTH' | 'CARDIO' | 'FLEXIBILITY' | 'MIXED' })}
          className={inputClasses}
        >
          <option value="STRENGTH">Strength Training</option>
          <option value="CARDIO">Cardio</option>
          <option value="FLEXIBILITY">Flexibility</option>
          <option value="MIXED">Mixed</option>
        </select>
      </div>
    </div>
  );

  // ── Description field ────────────────────────────────────────────────────────

  const DescriptionField = ({ idPrefix }: { idPrefix: string }) => (
    <div>
      <label htmlFor={`${idPrefix}-description`} className={labelClasses}>
        Description
      </label>
      <textarea
        id={`${idPrefix}-description`}
        value={workoutFormData.description}
        onChange={(e) => onFormChange({ description: e.target.value })}
        className={inputClasses}
        rows={3}
        placeholder="Describe the workout objectives and target muscle groups..."
      />
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKOUT MODAL
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderCreateWorkoutModal = () => {
    if (!showCreateWorkout) return null;

    const filteredExercises = filterExercises(availableExercises, exerciseSearchTerm);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-[#1a1f2e] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b dark:border-[#2a3042]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">Create Workout Template</h2>
            <button
              onClick={onCloseCreate}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <form onSubmit={onCreateSubmit} className="p-6 space-y-6">
              {/* Basic Workout Info */}
              <BasicInfoFields idPrefix="create" />

              {/* Description */}
              <DescriptionField idPrefix="create" />

              {/* Exercise Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white dark:text-white">Add Exercises</h3>

                {/* Exercise Search */}
                <div className="mb-4">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search exercises by name or muscle group..."
                      value={exerciseSearchTerm}
                      onChange={(e) => onExerciseSearchChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#2a3042] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-[#1a1f2e]"
                    />
                  </div>

                  {/* Quick Filter Buttons */}
                  <QuickFilterButtons />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {filteredExercises.map((exercise) => {
                    const isAdded = workoutFormData.exercises.some((ex) => ex.exerciseId === exercise.id);
                    return (
                      <div
                        key={exercise.id}
                        className={`border rounded-lg p-3 ${
                          isAdded
                            ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                            : 'border-gray-200 dark:border-[#2a3042]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white dark:text-white">{exercise.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {exercise.muscleGroups || exercise.targetMuscle || 'Not specified'}
                            </p>
                            <span className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 text-xs rounded-full mt-1">
                              {exercise.difficulty}
                            </span>
                            {isAdded && (
                              <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-xs rounded-full mt-1 ml-2">
                                Added
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onAddExercise(exercise)}
                            disabled={isAdded}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                              isAdded
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            {isAdded ? 'Added' : 'Add'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{exercise.instructions}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Exercises */}
              <SelectedExercisesList heading="Workout Exercises" />

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t dark:border-[#2a3042]">
                <button
                  type="button"
                  onClick={onCloseCreate}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-[#2a3042] rounded-md hover:bg-gray-50 dark:hover:bg-[#2a3042]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // EDIT WORKOUT MODAL
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderEditWorkoutModal = () => {
    if (!showEditWorkout || !editingWorkout) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-[#1a1f2e] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b dark:border-[#2a3042]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">Edit Workout Template</h2>
            <button
              onClick={onCloseEdit}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <form onSubmit={onEditSubmit} className="p-6 space-y-6">
              {/* Basic Workout Info */}
              <BasicInfoFields idPrefix="edit" />

              {/* Description */}
              <DescriptionField idPrefix="edit" />

              {/* Add More Exercises Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white dark:text-white">Add More Exercises</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {availableExercises
                    .filter((exercise) => !workoutFormData.exercises.some((ex) => ex.exerciseId === exercise.id))
                    .map((exercise) => (
                      <div key={exercise.id} className="border border-gray-200 dark:border-[#2a3042] rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white dark:text-white">{exercise.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {exercise.muscleGroups || exercise.targetMuscle || 'Not specified'}
                            </p>
                            <span className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 text-xs rounded-full mt-1">
                              {exercise.difficulty}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onAddExercise(exercise)}
                            className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                          >
                            Add
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{exercise.instructions}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Current Exercises */}
              <SelectedExercisesList heading="Current Exercises" />

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t dark:border-[#2a3042]">
                <button
                  type="button"
                  onClick={onCloseEdit}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-[#2a3042] rounded-md hover:bg-gray-50 dark:hover:bg-[#2a3042]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Update Template
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // ASSIGN WORKOUT MODAL
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderAssignWorkoutModal = () => {
    if (!showAssignWorkoutModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-[#1a1f2e] rounded-lg w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">Assign Workout to Client</h2>
            <button
              onClick={onCloseAssign}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-gray-900 dark:text-white dark:text-white">Select a client to assign this workout template:</p>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {clients.length === 0 ? (
                <p className="text-gray-900 dark:text-white dark:text-white text-center py-4">No clients available. Add clients first.</p>
              ) : (
                clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => onAssignToClient(client.id, showAssignWorkoutModal)}
                    className="w-full text-left p-3 border border-gray-200 dark:border-[#2a3042] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a3042] transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-white dark:text-white">{client.name}</div>
                    <div className="text-sm text-gray-900 dark:text-white dark:text-gray-400">{client.email}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t dark:border-[#2a3042] mt-4">
            <button
              onClick={onCloseAssign}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-[#2a3042] rounded-md hover:bg-gray-50 dark:hover:bg-[#2a3042]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <>
      {renderCreateWorkoutModal()}
      {renderEditWorkoutModal()}
      {renderAssignWorkoutModal()}
    </>
  );
}
