'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Apple, Plus } from 'lucide-react';

interface FoodEntry {
  id: string;
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  date: string;
  notes?: string;
}

interface NutritionPlan {
  id: string;
  name: string;
  description?: string;
  dailyCalorieTarget?: number;
  dailyProteinTarget?: number;
  dailyCarbTarget?: number;
  dailyFatTarget?: number;
  startDate?: string;
  endDate?: string;
}

interface NutritionTabProps {
  foodEntries: FoodEntry[];
  nutritionPlans: NutritionPlan[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onLogFood: () => void;
  onEndPlan: (planId: string) => void;
}

export default function NutritionTab({
  foodEntries,
  nutritionPlans,
  selectedDate,
  onDateChange,
  onLogFood,
  onEndPlan,
}: NutritionTabProps) {
  const selectedDateEntries = useMemo(() => {
    return foodEntries.filter((entry) => {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const startOfDay = new Date(year, month - 1, day);
      const endOfDay = new Date(year, month - 1, day + 1);
      const entryDate = new Date(entry.date);
      return entryDate >= startOfDay && entryDate < endOfDay;
    });
  }, [foodEntries, selectedDate]);

  const totals = useMemo(() => {
    return selectedDateEntries.reduce(
      (t, entry) => ({
        calories: t.calories + entry.calories,
        protein: t.protein + entry.protein,
        carbs: t.carbs + entry.carbs,
        fat: t.fat + entry.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [selectedDateEntries]);

  const targets = {
    calories: nutritionPlans[0]?.dailyCalorieTarget || 2000,
    protein: nutritionPlans[0]?.dailyProteinTarget || 150,
    carbs: nutritionPlans[0]?.dailyCarbTarget || 200,
    fat: nutritionPlans[0]?.dailyFatTarget || 70,
  };

  const macroCards = [
    { label: 'Calories', value: totals.calories, target: targets.calories, unit: '', color: 'indigo' },
    { label: 'Protein', value: totals.protein, target: targets.protein, unit: 'g', color: 'emerald' },
    { label: 'Carbs', value: totals.carbs, target: targets.carbs, unit: 'g', color: 'amber' },
    { label: 'Fat', value: totals.fat, target: targets.fat, unit: 'g', color: 'violet' },
  ];

  const colorMap: Record<string, { bg: string; bar: string; text: string }> = {
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/8', bar: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-300' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/8', bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-500/8', bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-500/8', bar: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-300' },
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nutrition</h2>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={onLogFood}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Log Food
          </button>
        </div>
      </div>

      {/* Macro Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {macroCards.map((macro) => {
          const c = colorMap[macro.color];
          const pct = Math.min(100, (macro.value / macro.target) * 100);
          return (
            <div key={macro.label} className={`${c.bg} rounded-xl p-4 border border-transparent`}>
              <p className={`text-xs font-medium ${c.text} mb-1`}>{macro.label}</p>
              <p className={`text-xl font-bold ${c.text}`}>
                {macro.unit ? `${macro.value.toFixed(1)}${macro.unit}` : macro.value}
                <span className="text-sm font-normal opacity-60"> / {macro.target}{macro.unit}</span>
              </p>
              <div className="w-full bg-white/50 dark:bg-white/10 rounded-full h-1.5 mt-2">
                <div
                  className={`${c.bar} h-1.5 rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Food Entries */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-gray-100 dark:border-[#2a3042]">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a3042]">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            Food Log — {formatDate(selectedDate)}
          </h3>
        </div>

        {selectedDateEntries.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Apple className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No entries for this date.</p>
            <button
              onClick={onLogFood}
              className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Log your first meal
            </button>
          </div>
        ) : (
          <div>
            {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const).map((mealType) => {
              const mealEntries = selectedDateEntries.filter((e) => e.mealType === mealType);
              if (mealEntries.length === 0) return null;

              const mealTotal = mealEntries.reduce((t, e) => ({
                calories: t.calories + e.calories,
                protein: t.protein + e.protein,
              }), { calories: 0, protein: 0 });

              return (
                <div key={mealType}>
                  <div className="px-5 py-3 bg-gray-50 dark:bg-[#111827] flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
                      {mealType.toLowerCase()}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {mealTotal.calories} cal · {mealTotal.protein.toFixed(1)}g protein
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-[#242938]">
                    {mealEntries.map((entry) => (
                      <div key={entry.id} className="px-5 py-3 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{entry.foodName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {entry.quantity} {entry.unit}
                            {entry.notes && <span className="italic ml-1">· {entry.notes}</span>}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.calories} cal</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            P:{entry.protein}g · C:{entry.carbs}g · F:{entry.fat}g
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Nutrition Plans */}
      {nutritionPlans.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Your Plans</h3>
          {nutritionPlans.map((plan) => {
            const isActive = plan.endDate ? new Date(plan.endDate) > new Date() : true;
            return (
              <div
                key={plan.id}
                className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-gray-100 dark:border-[#2a3042] p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{plan.name}</h4>
                    {plan.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{plan.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      isActive
                        ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-500/15 text-gray-600 dark:text-gray-400'
                    }`}>
                      {isActive ? 'Active' : 'Ended'}
                    </span>
                    {isActive && (
                      <button
                        onClick={() => onEndPlan(plan.id)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                      >
                        End
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Calories', value: plan.dailyCalorieTarget },
                    { label: 'Protein', value: plan.dailyProteinTarget, unit: 'g' },
                    { label: 'Carbs', value: plan.dailyCarbTarget, unit: 'g' },
                    { label: 'Fat', value: plan.dailyFatTarget, unit: 'g' },
                  ].map((t) => (
                    <div key={t.label} className="bg-gray-50 dark:bg-[#111827] rounded-lg p-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t.label}</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{t.value}{t.unit || ''}</p>
                    </div>
                  ))}
                </div>

                {(plan.startDate || plan.endDate) && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                    {plan.startDate && new Date(plan.startDate).toLocaleDateString()}
                    {plan.endDate && ` — ${new Date(plan.endDate).toLocaleDateString()}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
