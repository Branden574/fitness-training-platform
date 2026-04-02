'use client';

import React, { useState, useEffect } from 'react';
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
  Activity, 
  Target, 
  Calendar,
  Zap,
  Award,
  BarChart3,
  PieChart
} from 'lucide-react';

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

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Helper function to calculate month-to-month change
  const calculateMonthlyChange = (data: ProgressAnalytics['monthlyStats'], key: keyof ProgressAnalytics['monthlyStats'][0]) => {
    if (!data || data.length < 2) return null;
    const current = data[data.length - 1]?.[key];
    const previous = data[data.length - 2]?.[key];
    if (typeof current !== 'number' || typeof previous !== 'number') return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Get current month stats for display with changes
  const getCurrentMonthStats = () => {
    if (!analytics?.monthlyStats || analytics.monthlyStats.length === 0) return null;
    const currentMonth = analytics.monthlyStats[analytics.monthlyStats.length - 1];
    const volumeChange = calculateMonthlyChange(analytics.monthlyStats, 'totalVolume');
    const strengthChange = calculateMonthlyChange(analytics.monthlyStats, 'strengthGain');
    const workoutChange = calculateMonthlyChange(analytics.monthlyStats, 'totalWorkouts');
    
    return {
      ...currentMonth,
      volumeChange,
      strengthChange,
      workoutChange
    };
  };

  const currentStats = getCurrentMonthStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
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
              <BarChart3 className="w-6 h-6 text-blue-500" />
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
            value: analytics.overallMetrics.totalWorkoutsCompleted,
            icon: Activity,
            color: 'bg-indigo-500',
            change: null
          },
          {
            title: 'Weekly Frequency',
            value: analytics.overallMetrics.averageWorkoutFrequency.toFixed(1),
            icon: Calendar,
            color: 'bg-green-500',
            change: null
          },
          {
            title: 'Strongest Exercise',
            value: analytics.overallMetrics.strongestExercises[0]?.maxWeight || 0,
            suffix: 'lbs',
            icon: Award,
            color: 'bg-purple-500',
            change: null
          },
          {
            title: 'Most Improved',
            value: Math.round(analytics.overallMetrics.mostImprovedExercises[0]?.improvement || 0),
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
      {currentStats && analytics.monthlyStats && analytics.monthlyStats.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
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

      {/* Main Chart Content */}
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
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Monthly Volume Progress
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.monthlyStats}>
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
                <BarChart data={analytics.monthlyStats}>
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
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.keys(analytics.exerciseSpecificTrends).map(exerciseName => (
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
                      onClick={() => setChartType(id as 'volume' | 'weight' | 'strength')}
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

            {selectedExercise && analytics.exerciseSpecificTrends[selectedExercise] && (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart 
                  data={
                    chartType === 'weight' 
                      ? analytics.exerciseSpecificTrends[selectedExercise].weightProgression
                      : chartType === 'volume'
                      ? analytics.exerciseSpecificTrends[selectedExercise].volumeProgression
                      : analytics.exerciseSpecificTrends[selectedExercise].strengthProgression
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
              <ComposedChart data={analytics.monthlyStats}>
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
                {analytics.monthlyStats.some(stat => stat.totalWorkouts > 0) && (
                  <Bar yAxisId="left" dataKey="totalWorkouts" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Workouts" />
                )}
                
                {/* Show daily progress data */}
                {analytics.monthlyStats.some(stat => stat.weight) && (
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
                
                {analytics.monthlyStats.some(stat => stat.bodyFat) && (
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
                
                {analytics.monthlyStats.some(stat => stat.mood) && (
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
                
                {analytics.monthlyStats.some(stat => stat.energy) && (
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
                {analytics.monthlyStats.some(stat => stat.totalVolume > 0) && (
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

      {/* Exercise Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#2a3042]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Strongest Exercises
          </h3>
          <div className="space-y-3">
            {analytics.overallMetrics.strongestExercises.slice(0, 5).map((exercise, index) => (
              <motion.div
                key={exercise.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#111827] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{exercise.name}</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{exercise.maxWeight} lbs</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#2a3042]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Most Improved Exercises
          </h3>
          <div className="space-y-3">
            {analytics.overallMetrics.mostImprovedExercises.slice(0, 5).map((exercise, index) => (
              <motion.div
                key={exercise.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#111827] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{exercise.name}</span>
                </div>
                <span className="text-lg font-bold text-green-600">+{Math.round(exercise.improvement)}%</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProgressCharts;