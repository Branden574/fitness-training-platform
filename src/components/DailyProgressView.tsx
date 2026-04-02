'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Weight,
  Zap,
  Moon,
  Heart,
  Activity,
  Eye,
  EyeOff,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ProgressEntry {
  id: string;
  date: string; // ISO date string
  weight?: number | null;
  bodyFat?: number | null;
  muscleMass?: number | null;
  mood?: number | null;
  energy?: number | null;
  sleep?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DailyProgressViewProps {
  isTrainer?: boolean;
  clientId?: string;
}

const DailyProgressView: React.FC<DailyProgressViewProps> = ({ isTrainer = false, clientId }) => {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['weight', 'bodyFat', 'mood', 'energy']);
  const [timeRange, setTimeRange] = useState('30days');
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;

  const fetchProgressEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timeRange,
        includeAnalytics: 'false',
        ...(clientId && { clientId })
      });
      
      const response = await fetch(`/api/progress?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Sort entries by date descending (newest first)
        const sortedEntries = data.entries.sort((a: ProgressEntry, b: ProgressEntry) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setEntries(sortedEntries);
      } else {
        console.error('Failed to fetch progress entries');
      }
    } catch (error) {
      console.error('Error fetching progress entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgressEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, clientId]);

  const formatDate = (dateStr: string) => {
    // Parse the stored date and display it as the user's local date
    const date = new Date(dateStr);
    
    // Extract the intended date components to avoid timezone shifts
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth();
    const utcDay = date.getUTCDate();
    
    // Create a new date object with the intended date in local timezone
    const localDate = new Date(utcYear, utcMonth, utcDay);
    const formatted = localDate.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    return formatted;
  };

  const formatSimpleDate = (dateStr: string) => {
    // Parse the stored date and display it as the user's local date
    const date = new Date(dateStr);
    // Extract the intended date components to avoid timezone shifts
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth();
    const utcDay = date.getUTCDate();
    
    // Create a new date object with the intended date in local timezone
    const localDate = new Date(utcYear, utcMonth, utcDay);
    
    return localDate.toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric'
    });
  };

  const metricColors: Record<string, { active: string; inactive: string }> = {
    blue: { active: 'bg-blue-100 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/20', inactive: 'bg-gray-100 dark:bg-[#242938] hover:bg-gray-200 dark:hover:bg-[#2a3042]' },
    orange: { active: 'bg-orange-100 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/20', inactive: 'bg-gray-100 dark:bg-[#242938] hover:bg-gray-200 dark:hover:bg-[#2a3042]' },
    green: { active: 'bg-green-100 dark:bg-green-500/15 border border-green-200 dark:border-green-500/20', inactive: 'bg-gray-100 dark:bg-[#242938] hover:bg-gray-200 dark:hover:bg-[#2a3042]' },
    pink: { active: 'bg-pink-100 dark:bg-pink-500/15 border border-pink-200 dark:border-pink-500/20', inactive: 'bg-gray-100 dark:bg-[#242938] hover:bg-gray-200 dark:hover:bg-[#2a3042]' },
    yellow: { active: 'bg-yellow-100 dark:bg-yellow-500/15 border border-yellow-200 dark:border-yellow-500/20', inactive: 'bg-gray-100 dark:bg-[#242938] hover:bg-gray-200 dark:hover:bg-[#2a3042]' },
    purple: { active: 'bg-purple-100 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/20', inactive: 'bg-gray-100 dark:bg-[#242938] hover:bg-gray-200 dark:hover:bg-[#2a3042]' },
  };

  const metricOptions = [
    { id: 'weight', label: 'Weight', icon: Weight, unit: 'lbs', color: 'blue' },
    { id: 'bodyFat', label: 'Body Fat', icon: TrendingDown, unit: '%', color: 'orange' },
    { id: 'muscleMass', label: 'Muscle Mass', icon: Activity, unit: 'lbs', color: 'green' },
    { id: 'mood', label: 'Mood', icon: Heart, unit: '/10', color: 'pink' },
    { id: 'energy', label: 'Energy', icon: Zap, unit: '/10', color: 'yellow' },
    { id: 'sleep', label: 'Sleep', icon: Moon, unit: 'hrs', color: 'purple' }
  ];

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const getTrendColor = (current: number, previous: number, metricId: string) => {
    if (current === previous) return 'text-gray-900 dark:text-white';
    
    // For mood, energy, and sleep, higher is better
    // For body fat, lower is better
    // For weight and muscle mass, trend depends on goals
    const isImprovement = metricId === 'bodyFat' 
      ? current < previous 
      : current > previous;
    
    return isImprovement ? 'text-green-500' : 'text-red-500';
  };

  const getTrendIcon = (current: number, previous: number, metricId: string) => {
    if (current === previous) return null;
    
    const isImprovement = metricId === 'bodyFat' 
      ? current < previous 
      : current > previous;
    
    return isImprovement ? TrendingUp : TrendingDown;
  };

  const calculateTrend = (entries: ProgressEntry[], metricId: string, currentIndex: number) => {
    if (currentIndex >= entries.length - 1) return null;
    
    const current = entries[currentIndex][metricId as keyof ProgressEntry] as number | null;
    const previous = entries[currentIndex + 1][metricId as keyof ProgressEntry] as number | null;
    
    if (!current || !previous) return null;
    
    return { current, previous };
  };

  // Pagination
  const totalPages = Math.ceil(entries.length / entriesPerPage);
  const paginatedEntries = entries.slice(
    (currentPage - 1) * entriesPerPage, 
    currentPage * entriesPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-500" />
              {isTrainer ? 'Client Daily Progress' : 'Your Daily Progress'}
            </h2>
            <p className="text-gray-900 dark:text-white mt-1">
              Track daily measurements and wellness metrics
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Refresh Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchProgressEntries}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
            
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="6months">Last 6 Months</option>
            </select>
          </div>
        </div>

        {/* Metric Filters */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Show Metrics:
          </h3>
          <div className="flex flex-wrap gap-2">
            {metricOptions.map(metric => (
              <motion.button
                key={metric.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleMetric(metric.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors text-gray-900 dark:text-white ${
                  selectedMetrics.includes(metric.id)
                    ? metricColors[metric.color]?.active || ''
                    : metricColors[metric.color]?.inactive || ''
                }`}
              >
                <metric.icon className="w-4 h-4" />
                {metric.label}
                {selectedMetrics.includes(metric.id) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Progress Entries */}
      {entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-gray-50 dark:bg-[#111827] rounded-xl"
        >
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Progress Entries Yet</h3>
          <p className="text-gray-900 dark:text-white">Start logging your daily progress to see your journey!</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm border border-gray-200 dark:border-[#2a3042] overflow-hidden"
        >
          {/* Table Header */}
          <div className="bg-gray-50 dark:bg-[#111827] px-6 py-4 border-b border-gray-200 dark:border-[#2a3042]">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-900 dark:text-white">
              <div className="col-span-2">Date</div>
              {selectedMetrics.map(metricId => {
                const metric = metricOptions.find(m => m.id === metricId);
                return (
                  <div key={metricId} className="col-span-2 flex items-center gap-1">
                    {metric?.icon && <metric.icon className="w-4 h-4" />}
                    {metric?.label}
                  </div>
                );
              })}
              <div className="col-span-2">Notes</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            <AnimatePresence>
              {paginatedEntries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-[#242938] transition-colors"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Date */}
                    <div className="col-span-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(entry.date)}
                      </div>
                      <div className="text-xs text-gray-900 dark:text-white">
                        {formatSimpleDate(entry.date)}
                      </div>
                    </div>

                    {/* Metrics */}
                    {selectedMetrics.map(metricId => {
                      const metric = metricOptions.find(m => m.id === metricId);
                      const value = entry[metricId as keyof ProgressEntry] as number | null;
                      const trend = calculateTrend(entries, metricId, entries.findIndex(e => e.id === entry.id));
                      const TrendIcon = trend ? getTrendIcon(trend.current, trend.previous, metricId) : null;
                      
                      return (
                        <div key={metricId} className="col-span-2">
                          {value !== null ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {value}{metric?.unit}
                              </span>
                              {TrendIcon && (
                                <TrendIcon 
                                  className={`w-3 h-3 ${getTrendColor(trend!.current, trend!.previous, metricId)}`}
                                />
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-900 dark:text-white">-</span>
                          )}
                        </div>
                      );
                    })}

                    {/* Notes */}
                    <div className="col-span-2">
                      {entry.notes ? (
                        <span className="text-sm text-gray-900 dark:text-white truncate">
                          {entry.notes}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-white">-</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 dark:bg-[#111827] px-6 py-4 border-t border-gray-200 dark:border-[#2a3042]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-900 dark:text-white">
                  Showing {(currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, entries.length)} of {entries.length} entries
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 bg-white text-gray-900 dark:text-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          currentPage === page
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-900 dark:text-white hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 bg-white text-gray-900 dark:text-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default DailyProgressView;