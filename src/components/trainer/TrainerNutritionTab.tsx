'use client';

import { motion } from 'framer-motion';
import {
  Plus,
  MoreVertical,
  Trash2,
} from 'lucide-react';

interface NutritionPlan {
  id: string;
  name: string;
  description?: string;
  dailyCalorieTarget?: number;
  dailyProteinTarget?: number;
  dailyCarbTarget?: number;
  dailyFatTarget?: number;
  assignedClientsCount?: number;
}

interface TrainerNutritionTabProps {
  nutritionPlans: NutritionPlan[];
  clients: { id: string; name: string }[];
  onCreatePlan: () => void;
  onEditPlan: (plan: NutritionPlan) => void;
  onDeletePlan: (planId: string) => void;
  onAssignPlan: (planId: string) => void;
}

export default function TrainerNutritionTab({
  nutritionPlans,
  clients,
  onCreatePlan,
  onEditPlan,
  onDeletePlan,
  onAssignPlan,
}: TrainerNutritionTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nutrition Plans</h2>
        <button
          onClick={onCreatePlan}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Create Plan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {nutritionPlans.map((plan) => (
          <div key={plan.id} className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-[#2a3042]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{plan.description}</p>
              </div>
              <span className="bg-indigo-100 text-indigo-800 px-2 py-1 text-xs rounded-full">
                {plan.assignedClientsCount || 0} clients
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-[#2a3042] p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Daily Calories</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{plan.dailyCalorieTarget || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#2a3042] p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Protein</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{plan.dailyProteinTarget || 'N/A'}g</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#2a3042] p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Carbs</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{plan.dailyCarbTarget || 'N/A'}g</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#2a3042] p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Fat</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{plan.dailyFatTarget || 'N/A'}g</p>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onAssignPlan(plan.id)}
                className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-green-700 transition-colors"
              >
                Assign to Client
              </button>
              <button
                onClick={() => onEditPlan(plan)}
                className="p-2 text-gray-400 hover:text-indigo-600 border border-gray-200 dark:border-[#2a3042] rounded-lg"
                title="Edit Plan"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeletePlan(plan.id)}
                className="p-2 text-gray-400 hover:text-red-600 border border-gray-200 dark:border-[#2a3042] rounded-lg"
                title="Delete Plan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
