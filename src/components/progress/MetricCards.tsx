'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Activity,
  Calendar,
  Award
} from 'lucide-react';

interface OverallMetrics {
  totalWorkoutsCompleted: number;
  averageWorkoutFrequency: number;
  strongestExercises: Array<{ name: string; maxWeight: number }>;
  mostImprovedExercises: Array<{ name: string; improvement: number }>;
}

interface MonthlyStats {
  month: string;
  totalVolume: number;
  totalWorkouts: number;
  strengthGain: number;
  [key: string]: unknown;
}

interface MetricCardsProps {
  overallMetrics: OverallMetrics;
  monthlyStats: MonthlyStats[];
  loading: boolean;
}

const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const calculateMonthlyChange = (data: MonthlyStats[], key: string) => {
  if (!data || data.length < 2) return null;
  const current = data[data.length - 1]?.[key];
  const previous = data[data.length - 2]?.[key];
  if (typeof current !== 'number' || typeof previous !== 'number') return null;
  return ((current - previous) / previous * 100).toFixed(1);
};

const MetricCards: React.FC<MetricCardsProps> = ({ overallMetrics, monthlyStats, loading }) => {
  if (loading) return null;

  const currentStats = monthlyStats && monthlyStats.length > 0
    ? (() => {
        const currentMonth = monthlyStats[monthlyStats.length - 1];
        const volumeChange = calculateMonthlyChange(monthlyStats, 'totalVolume');
        const strengthChange = calculateMonthlyChange(monthlyStats, 'strengthGain');
        const workoutChange = calculateMonthlyChange(monthlyStats, 'totalWorkouts');
        return { ...currentMonth, volumeChange, strengthChange, workoutChange };
      })()
    : null;

  return (
    <>
      {/* Key Metrics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            title: 'Total Workouts',
            value: overallMetrics.totalWorkoutsCompleted,
            icon: Activity,
            color: 'bg-indigo-500',
            change: null
          },
          {
            title: 'Weekly Frequency',
            value: overallMetrics.averageWorkoutFrequency.toFixed(1),
            icon: Calendar,
            color: 'bg-green-500',
            change: null
          },
          {
            title: 'Strongest Exercise',
            value: overallMetrics.strongestExercises[0]?.maxWeight || 0,
            suffix: 'lbs',
            icon: Award,
            color: 'bg-purple-500',
            change: null
          },
          {
            title: 'Most Improved',
            value: Math.round(overallMetrics.mostImprovedExercises[0]?.improvement || 0),
            suffix: '%',
            icon: TrendingUp,
            color: 'bg-orange-500',
            change: null
          }
        ].map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#2a3042]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {metric.value}{metric.suffix}
                </p>
              </div>
              <div className={`${metric.color} p-3 rounded-lg`}>
                <metric.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Monthly Progress Summary */}
      {currentStats && monthlyStats && monthlyStats.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-indigo-50 to-indigo-50 rounded-xl p-6 border border-indigo-100"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            {formatMonth(currentStats.month)} Progress Summary
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {currentStats.totalVolume?.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-gray-600">Total Volume</p>
              {currentStats.volumeChange && (
                <p className={`text-xs font-medium mt-1 ${
                  parseFloat(currentStats.volumeChange) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {parseFloat(currentStats.volumeChange) >= 0 ? '+' : ''}{currentStats.volumeChange}% from last month
                </p>
              )}
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {currentStats.totalWorkouts}
              </p>
              <p className="text-sm text-gray-600">Workouts Completed</p>
              {currentStats.workoutChange && (
                <p className={`text-xs font-medium mt-1 ${
                  parseFloat(currentStats.workoutChange) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {parseFloat(currentStats.workoutChange) >= 0 ? '+' : ''}{currentStats.workoutChange}% from last month
                </p>
              )}
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {currentStats.strengthGain?.toFixed(1) || '0.0'}%
              </p>
              <p className="text-sm text-gray-600">Strength Gain</p>
              {currentStats.strengthChange && (
                <p className={`text-xs font-medium mt-1 ${
                  parseFloat(currentStats.strengthChange) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {parseFloat(currentStats.strengthChange) >= 0 ? '+' : ''}{currentStats.strengthChange}% from last month
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default MetricCards;
