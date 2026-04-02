'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Award, TrendingUp } from 'lucide-react';

interface OverallMetrics {
  strongestExercises: Array<{ name: string; maxWeight: number }>;
  mostImprovedExercises: Array<{ name: string; improvement: number }>;
}

interface ExerciseLeaderboardProps {
  overallMetrics: OverallMetrics;
}

const ExerciseLeaderboard: React.FC<ExerciseLeaderboardProps> = ({ overallMetrics }) => {
  return (
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
          {overallMetrics.strongestExercises.slice(0, 5).map((exercise, index) => (
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
          {overallMetrics.mostImprovedExercises.slice(0, 5).map((exercise, index) => (
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
  );
};

export default ExerciseLeaderboard;
