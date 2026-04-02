'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, CalendarDays } from 'lucide-react';
import ProgressCharts from '@/components/ProgressCharts';
import DailyProgressView from '@/components/DailyProgressView';

interface ProgressTabProps {
  onLogProgress: () => void;
}

export default function ProgressTab({ onLogProgress }: ProgressTabProps) {
  const [view, setView] = useState<'charts' | 'daily'>('charts');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Progress</h2>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-[#111827] rounded-xl p-1">
            <button
              onClick={() => setView('charts')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'charts'
                  ? 'bg-white dark:bg-[#1a1f2e] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </button>
            <button
              onClick={() => setView('daily')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'daily'
                  ? 'bg-white dark:bg-[#1a1f2e] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Daily Log
            </button>
          </div>

          <button
            onClick={onLogProgress}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <TrendingUp className="h-4 w-4" />
            Log Progress
          </button>
        </div>
      </div>

      {view === 'charts' ? <ProgressCharts /> : <DailyProgressView />}
    </motion.div>
  );
}
