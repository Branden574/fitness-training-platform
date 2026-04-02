'use client';

import { X } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface NutritionFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  clientId: string;
  assignToClient: boolean;
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  dailyCarbTarget: number;
  dailyFatTarget: number;
}

interface NutritionPlan {
  id: string;
  name?: string;
  title?: string;
  description: string;
  startDate?: string;
  endDate?: string;
  totalCalories?: number;
  dailyCalorieTarget?: number;
  dailyProteinTarget?: number;
  dailyCarbTarget?: number;
  dailyFatTarget?: number;
  isActive?: boolean;
  assignedUsers?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  assignedClientsCount?: number;
  isTemplate?: boolean;
}

interface NutritionModalsProps {
  // State
  showCreateNutrition: boolean;
  showAssignNutrition: string | null;
  showEditNutrition: string | null;
  editingNutrition: NutritionPlan | null;
  showDeleteNutritionConfirm: string | null;
  nutritionFormData: NutritionFormData;
  clients: Client[];

  // Callbacks
  onCloseCreateNutrition: () => void;
  onCloseAssignNutrition: () => void;
  onCloseEditNutrition: () => void;
  onCloseDeleteNutritionConfirm: () => void;
  onNutritionFormDataChange: (data: NutritionFormData) => void;
  onCreateNutritionSubmit: (e: React.FormEvent) => void;
  onUpdateNutritionSubmit: (e: React.FormEvent) => void;
  onAssignNutritionToClient: (clientId: string, planId: string) => void;
  onDeleteNutritionPlan: (planId: string) => void;
}

export default function NutritionModals({
  showCreateNutrition,
  showAssignNutrition,
  showEditNutrition,
  editingNutrition,
  showDeleteNutritionConfirm,
  nutritionFormData,
  clients,
  onCloseCreateNutrition,
  onCloseAssignNutrition,
  onCloseEditNutrition,
  onCloseDeleteNutritionConfirm,
  onNutritionFormDataChange,
  onCreateNutritionSubmit,
  onUpdateNutritionSubmit,
  onAssignNutritionToClient,
  onDeleteNutritionPlan,
}: NutritionModalsProps) {
  return (
    <>
      {/* Create Nutrition Plan Modal */}
      {showCreateNutrition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Create Nutrition Plan</h3>
              <button
                onClick={onCloseCreateNutrition}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onCreateNutritionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Plan Name</label>
                <input
                  type="text"
                  value={nutritionFormData.name}
                  onChange={(e) => onNutritionFormDataChange({...nutritionFormData, name: e.target.value})}
                  placeholder="e.g., Weight Loss Plan"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700 placeholder-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Description</label>
                <textarea
                  value={nutritionFormData.description}
                  onChange={(e) => onNutritionFormDataChange({...nutritionFormData, description: e.target.value})}
                  placeholder="Describe the nutrition plan goals and approach..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700 placeholder-gray-400"
                  required
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={nutritionFormData.startDate}
                    onChange={(e) => onNutritionFormDataChange({...nutritionFormData, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">End Date</label>
                  <input
                    type="date"
                    value={nutritionFormData.endDate}
                    onChange={(e) => onNutritionFormDataChange({...nutritionFormData, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700"
                  />
                </div>
              </div>

              {/* Client Assignment */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="assignToClient"
                    checked={nutritionFormData.assignToClient}
                    onChange={(e) => onNutritionFormDataChange({...nutritionFormData, assignToClient: e.target.checked})}
                    className="rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500"
                  />
                  <label htmlFor="assignToClient" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                    Assign to a client immediately
                  </label>
                </div>

                {nutritionFormData.assignToClient && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Select Client</label>
                    <select
                      value={nutritionFormData.clientId}
                      onChange={(e) => onNutritionFormDataChange({...nutritionFormData, clientId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700"
                      required={nutritionFormData.assignToClient}
                    >
                      <option value="">Choose a client...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} ({client.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!nutritionFormData.assignToClient && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    You can assign this plan to clients later from the nutrition plans list.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Daily Calories</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyCalorieTarget}
                    onChange={(e) => onNutritionFormDataChange({...nutritionFormData, dailyCalorieTarget: parseInt(e.target.value) || 0})}
                    placeholder="1800"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700 placeholder-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyProteinTarget}
                    onChange={(e) => onNutritionFormDataChange({...nutritionFormData, dailyProteinTarget: parseInt(e.target.value) || 0})}
                    placeholder="120"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700 placeholder-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyCarbTarget}
                    onChange={(e) => onNutritionFormDataChange({...nutritionFormData, dailyCarbTarget: parseInt(e.target.value) || 0})}
                    placeholder="150"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700 placeholder-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Fat (g)</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyFatTarget}
                    onChange={(e) => onNutritionFormDataChange({...nutritionFormData, dailyFatTarget: parseInt(e.target.value) || 0})}
                    placeholder="60"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700 placeholder-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onCloseCreateNutrition}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Nutrition Plan Modal */}
      {showAssignNutrition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Assign Nutrition Plan</h3>
              <button
                onClick={onCloseAssignNutrition}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">Select a client to assign this nutrition plan to:</p>

              <div className="space-y-2">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => onAssignNutritionToClient(client.id, showAssignNutrition)}
                    className="w-full text-left p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{client.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{client.email}</div>
                  </button>
                ))}
              </div>

              {clients.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No clients available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Nutrition Plan Modal */}
      {showEditNutrition && editingNutrition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Nutrition Plan</h3>
              <button
                onClick={onCloseEditNutrition}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onUpdateNutritionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Plan Name</label>
                <input
                  type="text"
                  value={nutritionFormData.name}
                  onChange={(e) => onNutritionFormDataChange({...nutritionFormData, name: e.target.value})}
                  placeholder="e.g., Weight Loss Plan"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700 placeholder-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Description</label>
                <textarea
                  value={nutritionFormData.description}
                  onChange={(e) => onNutritionFormDataChange({...nutritionFormData, description: e.target.value})}
                  placeholder="Describe the nutrition plan goals and approach..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700 placeholder-gray-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Daily Calories</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyCalorieTarget}
                    onChange={(e) => onNutritionFormDataChange({...nutritionFormData, dailyCalorieTarget: parseInt(e.target.value) || 0})}
                    placeholder="1800"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700 placeholder-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyProteinTarget}
                    onChange={(e) => onNutritionFormDataChange({...nutritionFormData, dailyProteinTarget: parseInt(e.target.value) || 0})}
                    placeholder="120"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700 placeholder-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyCarbTarget}
                    onChange={(e) => onNutritionFormDataChange({...nutritionFormData, dailyCarbTarget: parseInt(e.target.value) || 0})}
                    placeholder="150"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700 placeholder-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Fat (g)</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyFatTarget}
                    onChange={(e) => onNutritionFormDataChange({...nutritionFormData, dailyFatTarget: parseInt(e.target.value) || 0})}
                    placeholder="60"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700 placeholder-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onCloseEditNutrition}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Update Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Nutrition Plan Confirmation Modal */}
      {showDeleteNutritionConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Delete Nutrition Plan</h3>
              <button
                onClick={onCloseDeleteNutritionConfirm}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete this nutrition plan? This action cannot be undone.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={onCloseDeleteNutritionConfirm}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteNutritionPlan(showDeleteNutritionConfirm);
                    onCloseDeleteNutritionConfirm();
                  }}
                  className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
