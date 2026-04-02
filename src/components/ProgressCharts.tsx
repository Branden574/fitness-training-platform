'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Target,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';

import MetricCards from './progress/MetricCards';
import ExerciseCharts from './progress/ExerciseCharts';
import ExerciseLeaderboard from './progress/ExerciseLeaderboard';

interface ProgressAnalytics {
  exerciseProgress: Array<{
    date: string;
    exerciseName: string;
    weight: number;
    sets: number;
    reps: number;
    volume: number;
    oneRepMax: number;
  }>;
  monthlyStats: Array<{
    month: string;
    date?: string;
    totalVolume: number;
    averageWeight: number;
    totalWorkouts: number;
    strengthGain: number;
    // Daily progress metrics
    weight?: number | null;
    bodyFat?: number | null;
    mood?: number | null;
    energy?: number | null;
    muscleMass?: number | null;
    workoutVolume?: number;
    progressEntries?: number;
    averageSleep?: number | null;
  }>;
  exerciseSpecificTrends: {
    [exerciseName: string]: {
      weightProgression: Array<{ date: string; weight: number }>;
      volumeProgression: Array<{ date: string; volume: number }>;
      strengthProgression: Array<{ date: string; oneRepMax: number }>;
    };
  };
  overallMetrics: {
    totalWorkoutsCompleted: number;
    averageWorkoutFrequency: number;
    strongestExercises: Array<{ name: string; maxWeight: number }>;
    mostImprovedExercises: Array<{ name: string; improvement: number }>;
  };
}

interface ProgressChartsProps {
  isTrainer?: boolean;
  clientId?: string;
}

const ProgressCharts: React.FC<ProgressChartsProps> = ({ isTrainer = false, clientId }) => {
  const [analytics, setAnalytics] = useState<ProgressAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('6months');
  const [chartType, setChartType] = useState<'volume' | 'weight' | 'strength'>('volume');
  const [activeView, setActiveView] = useState<'overview' | 'exercise' | 'monthly'>('overview');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timeRange,
        ...(clientId && { clientId })
      });

      const response = await fetch(`/api/progress-analytics?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);

        // Auto-select first exercise if available, otherwise default to monthly view for daily progress
        if (data.exerciseSpecificTrends && Object.keys(data.exerciseSpecificTrends).length > 0) {
          setSelectedExercise(Object.keys(data.exerciseSpecificTrends)[0]);
        } else if (data.monthlyStats && data.monthlyStats.length > 0) {
          // If no exercise data but has monthly stats, switch to monthly view
          setActiveView('monthly');
        }
      } else {
        console.error('Failed to fetch analytics:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!analytics || (analytics.exerciseProgress.length === 0 && (!analytics.monthlyStats || analytics.monthlyStats.length === 0))) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12 bg-gray-50 dark:bg-[#111827] rounded-xl"
      >
        <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Progress Data Yet</h3>
        <p className="text-gray-600 mb-4">Start logging your daily progress or complete workouts to see charts!</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.reload()}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Refresh Data
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#2a3042]"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-500" />
              {isTrainer ? 'Client Progress Analytics' : 'Your Progress Analytics'}
            </h2>
            <p className="text-gray-600 mt-1">
              Comprehensive workout performance tracking and insights
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last Year</option>
            </select>

            {/* View Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { id: 'overview', label: 'Overview', icon: PieChart },
                { id: 'exercise', label: 'Exercise', icon: Target },
                { id: 'monthly', label: 'Monthly', icon: Calendar }
              ].map(({ id, label, icon: Icon }) => (
                <motion.button
                  key={id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveView(id as 'overview' | 'exercise' | 'monthly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                    activeView === id
                      ? 'bg-white dark:bg-[#1a1f2e] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics Cards + Monthly Summary */}
      <MetricCards
        overallMetrics={analytics.overallMetrics}
        monthlyStats={analytics.monthlyStats}
        loading={loading}
      />

      {/* Main Chart Content */}
      <ExerciseCharts
        monthlyStats={analytics.monthlyStats}
        exerciseSpecificTrends={analytics.exerciseSpecificTrends}
        selectedExercise={selectedExercise}
        onSelectedExerciseChange={setSelectedExercise}
        chartType={chartType}
        onChartTypeChange={setChartType}
        activeView={activeView}
      />

      {/* Exercise Leaderboard */}
      <ExerciseLeaderboard overallMetrics={analytics.overallMetrics} />
    </div>
  );
};

export default ProgressCharts;
