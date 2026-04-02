'use client';

import { motion } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { Activity, TrendingUp, Calendar, Target, Dumbbell, ChevronRight } from 'lucide-react';
import OptimizedImage from '@/components/OptimizedImage';
import { imagePlaceholders } from '@/lib/imagePlaceholders';

interface StatItem {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  change: string;
}

interface Workout {
  id: string;
  completed?: boolean;
  workout?: {
    id: string;
    title: string;
    description?: string;
    duration?: string;
    difficulty?: string;
  };
}

interface TrainerInfo {
  id: string;
  name: string;
  email: string;
}

interface OverviewTabProps {
  userName: string | null | undefined;
  trainerInfo: TrainerInfo | null;
  stats: StatItem[];
  workouts: Workout[];
  loading: boolean;
  onTabChange: (tab: string) => void;
  onLogProgress: () => void;
  onStartWorkout: (workoutId: string) => void;
}

export default function OverviewTab({
  userName,
  trainerInfo,
  stats,
  workouts,
  loading,
  onTabChange,
  onLogProgress,
  onStartWorkout,
}: OverviewTabProps) {
  const { toast } = useToast();
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-1">
          {greeting}, {userName?.split(' ')[0] || 'there'}!
        </h2>
        <p className="text-indigo-200 text-sm sm:text-base">
          Ready to crush your fitness goals today?
        </p>
        {trainerInfo && (
          <div className="mt-5 p-3.5 bg-white/10 backdrop-blur-sm rounded-xl flex items-center gap-4">
            <div className="flex-shrink-0">
              <OptimizedImage
                src={imagePlaceholders.portrait}
                alt={`${trainerInfo.name} - Personal Trainer`}
                width={52}
                height={52}
                className="w-13 h-13 rounded-full ring-2 ring-white/20"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-indigo-200">Your Trainer:</p>
              <p className="text-base font-semibold truncate">{trainerInfo.name}</p>
              <p className="text-indigo-200 text-xs truncate">{trainerInfo.email}</p>
            </div>
          </div>
        )}
        {!trainerInfo && (
          <div className="mt-5 p-3 bg-red-500/20 rounded-xl">
            <p className="text-sm font-medium">No trainer assigned</p>
            <p className="text-indigo-200 text-xs">Please contact support for trainer assignment.</p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="bg-white dark:bg-[#1a1f2e] rounded-xl p-4 sm:p-5 border border-gray-100 dark:border-[#2a3042] hover:border-gray-200 dark:hover:border-[#353d52] transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
              {stat.value}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.title}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">{stat.change}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Assigned Workouts */}
        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-5 sm:p-6 border border-gray-100 dark:border-[#2a3042]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Assigned Workouts
            </h3>
            <button
              onClick={() => onTabChange('workouts')}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full" />
              </div>
            ) : workouts.length > 0 ? (
              workouts.slice(0, 3).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center p-3.5 bg-gray-50 dark:bg-[#111827] rounded-xl"
                >
                  <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-500/15 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    <Dumbbell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {session.workout?.title || 'Workout'}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {session.workout?.duration || 0} min · {session.workout?.difficulty || 'Normal'}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                    session.completed
                      ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400'
                      : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
                  }`}>
                    {session.completed ? 'Done' : 'Assigned'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                No workouts assigned yet
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-5 sm:p-6 border border-gray-100 dark:border-[#2a3042]">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-5">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                title: 'Start Workout',
                icon: Activity,
                color: 'bg-emerald-500',
                onClick: () => {
                  if (workouts.length > 0) {
                    const nextWorkout = workouts.find((w) => !w.completed);
                    if (nextWorkout?.workout?.id) {
                      onStartWorkout(nextWorkout.workout.id);
                    } else {
                      toast('All workouts completed! Great job!', 'info');
                    }
                  } else {
                    toast('No workouts assigned yet. Contact your trainer to get started!', 'info');
                  }
                },
              },
              {
                title: 'Log Progress',
                icon: TrendingUp,
                color: 'bg-indigo-500',
                onClick: onLogProgress,
              },
              {
                title: 'View Schedule',
                icon: Calendar,
                color: 'bg-violet-500',
                onClick: () => onTabChange('schedule'),
              },
              {
                title: 'View Goals',
                icon: Target,
                color: 'bg-amber-500',
                onClick: () => onTabChange('progress'),
              },
            ].map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className="p-4 bg-gray-50 dark:bg-[#111827] rounded-xl hover:bg-gray-100 dark:hover:bg-[#1e2336] transition-colors text-center group"
              >
                <div className={`w-9 h-9 ${action.color} rounded-lg flex items-center justify-center mx-auto mb-2.5 group-hover:scale-105 transition-transform`}>
                  <action.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {action.title}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
