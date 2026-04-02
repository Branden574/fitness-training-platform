'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  Target,
  Calendar,
  Zap
} from 'lucide-react';

interface MonthlyStats {
  month: string;
  date?: string;
  totalVolume: number;
  averageWeight: number;
  totalWorkouts: number;
  strengthGain: number;
  weight?: number | null;
  bodyFat?: number | null;
  mood?: number | null;
  energy?: number | null;
  muscleMass?: number | null;
  workoutVolume?: number;
  progressEntries?: number;
  averageSleep?: number | null;
}

interface ExerciseSpecificTrends {
  [exerciseName: string]: {
    weightProgression: Array<{ date: string; weight: number }>;
    volumeProgression: Array<{ date: string; volume: number }>;
    strengthProgression: Array<{ date: string; oneRepMax: number }>;
  };
}

interface ExerciseChartsProps {
  monthlyStats: MonthlyStats[];
  exerciseSpecificTrends: ExerciseSpecificTrends;
  selectedExercise: string | null;
  onSelectedExerciseChange: (exercise: string) => void;
  chartType: 'volume' | 'weight' | 'strength';
  onChartTypeChange: (type: 'volume' | 'weight' | 'strength') => void;
  activeView: 'overview' | 'exercise' | 'monthly';
}

const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ExerciseCharts: React.FC<ExerciseChartsProps> = ({
  monthlyStats,
  exerciseSpecificTrends,
  selectedExercise,
  onSelectedExerciseChange,
  chartType,
  onChartTypeChange,
  activeView
}) => {
  return (
    <AnimatePresence mode="wait">
      {activeView === 'overview' && (
        <motion.div
          key="overview"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Monthly Volume Trend */}
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#2a3042]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Monthly Volume Progress
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
                />
                <Tooltip
                  labelFormatter={formatMonth}
                  formatter={(value: number) => [value.toLocaleString(), 'Total Volume']}
                  contentStyle={{
                    backgroundColor: '#1a1f2e',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#e5e7eb'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalVolume"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Strength Gains */}
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#2a3042]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              Monthly Strength Gains
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
                />
                <Tooltip
                  labelFormatter={formatMonth}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Strength Gain']}
                  contentStyle={{
                    backgroundColor: '#1a1f2e',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#e5e7eb'
                  }}
                />
                <Bar
                  dataKey="strengthGain"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {activeView === 'exercise' && (
        <motion.div
          key="exercise"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#2a3042]"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Exercise-Specific Progress
            </h3>

            <div className="flex gap-3">
              <select
                value={selectedExercise || ''}
                onChange={(e) => onSelectedExerciseChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {Object.keys(exerciseSpecificTrends).map(exerciseName => (
                  <option key={exerciseName} value={exerciseName}>
                    {exerciseName}
                  </option>
                ))}
              </select>

              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { id: 'weight', label: 'Weight' },
                  { id: 'volume', label: 'Volume' },
                  { id: 'strength', label: '1RM' }
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => onChartTypeChange(id as 'volume' | 'weight' | 'strength')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      chartType === id
                        ? 'bg-white dark:bg-[#1a1f2e] text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedExercise && exerciseSpecificTrends[selectedExercise] && (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={
                  chartType === 'weight'
                    ? exerciseSpecificTrends[selectedExercise].weightProgression
                    : chartType === 'volume'
                    ? exerciseSpecificTrends[selectedExercise].volumeProgression
                    : exerciseSpecificTrends[selectedExercise].strengthProgression
                }
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
                />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    chartType === 'weight' ? 'Weight (lbs)'
                      : chartType === 'volume' ? 'Volume'
                      : '1RM (lbs)'
                  ]}
                  contentStyle={{
                    backgroundColor: '#1a1f2e',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                    fontWeight: '500'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={chartType === 'weight' ? 'weight' : chartType === 'volume' ? 'volume' : 'oneRepMax'}
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: '#8B5CF6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      )}

      {activeView === 'monthly' && (
        <motion.div
          key="monthly"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#2a3042]"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            Monthly Performance Overview
          </h3>

          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
              />
              <YAxis
                yAxisId="left"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
              />
              <Tooltip
                labelFormatter={formatMonth}
                formatter={(value: number, name: string) => {
                  if (name === 'totalVolume') return [value.toLocaleString(), 'Total Volume'];
                  if (name === 'totalWorkouts') return [value, 'Workouts'];
                  if (name === 'averageWeight') return [`${value.toFixed(1)} lbs`, 'Avg Weight'];
                  if (name === 'weight') return [`${value.toFixed(1)} lbs`, 'Weight'];
                  if (name === 'bodyFat') return [`${value.toFixed(1)}%`, 'Body Fat'];
                  if (name === 'mood') return [`${value.toFixed(1)}/10`, 'Mood'];
                  if (name === 'energy') return [`${value.toFixed(1)}/10`, 'Energy'];
                  return [value, name];
                }}
                contentStyle={{
                  backgroundColor: '#1a1f2e',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#e5e7eb',
                  fontWeight: '500'
                }}
              />

              {/* Show workout data if available */}
              {monthlyStats.some(stat => stat.totalWorkouts > 0) && (
                <Bar yAxisId="left" dataKey="totalWorkouts" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Workouts" />
              )}

              {/* Show daily progress data */}
              {monthlyStats.some(stat => stat.weight) && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="weight"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981' }}
                  name="Weight"
                />
              )}

              {monthlyStats.some(stat => stat.bodyFat) && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="bodyFat"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={{ fill: '#F59E0B' }}
                  name="Body Fat %"
                />
              )}

              {monthlyStats.some(stat => stat.mood) && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="mood"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ fill: '#8B5CF6' }}
                  name="Mood"
                />
              )}

              {monthlyStats.some(stat => stat.energy) && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="energy"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ fill: '#EF4444' }}
                  name="Energy"
                />
              )}

              {/* Show workout volume if available */}
              {monthlyStats.some(stat => stat.totalVolume > 0) && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalVolume"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={{ fill: '#06B6D4' }}
                  name="Volume"
                />
              )}

              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExerciseCharts;
