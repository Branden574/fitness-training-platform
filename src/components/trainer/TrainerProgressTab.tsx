'use client';

import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  Activity,
} from 'lucide-react';
import TrainerProgressCharts from '@/components/TrainerProgressCharts';
import DailyProgressView from '@/components/DailyProgressView';

interface ProgressEntry {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  mood?: number;
  energy?: number;
  notes?: string;
}

interface ProgressAnalytics {
  weight: {
    current: number | null;
    starting: number | null;
    average?: number | null;
    change: {
      daily: number | null;
      total: number | null;
      percentage: number | null;
    };
    trend: string;
  };
  bodyFat?: {
    current: number | null;
    starting: number | null;
    average?: number | null;
    change: {
      total: number | null;
    };
  };
  wellness?: {
    averageMood: number | null;
  };
  summary: {
    consistency: {
      streak: number;
      entriesPerWeek: number;
    };
    dateRange: {
      daysCovered: number;
    };
    totalEntries: number;
  };
  avgWeight?: number;
  weightChange?: number;
  totalEntries: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface ClientProgress {
  entries: ProgressEntry[];
  analytics: ProgressAnalytics;
}

interface TrainerProgressTabProps {
  clients: Client[];
  clientsProgress: Record<string, ClientProgress>;
  selectedClientProgress: string | null;
  onSelectClient: (clientId: string | null) => void;
  trainerProgressView: string;
  onViewChange: (view: string) => void;
  onRefreshClient: (clientId: string) => void;
  onViewClientDetails: (clientId: string) => void;
}

export default function TrainerProgressTab({
  clients,
  clientsProgress,
  selectedClientProgress,
  onSelectClient,
  trainerProgressView,
  onViewChange,
  onRefreshClient,
  onViewClientDetails,
}: TrainerProgressTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Client Progress Management</h2>
        <div className="flex items-center gap-3">
          {/* Progress View Toggle */}
          <div className="flex bg-gray-100 dark:bg-[#2a3042] rounded-lg p-1">
            <button
              onClick={() => onViewChange('charts')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                trainerProgressView === 'charts'
                  ? 'bg-white dark:bg-[#1a1f2e] text-indigo-600 shadow-sm'
                  : 'text-gray-900 dark:text-white dark:text-gray-400 hover:text-indigo-600'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => onViewChange('daily')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                trainerProgressView === 'daily'
                  ? 'bg-white dark:bg-[#1a1f2e] text-indigo-600 shadow-sm'
                  : 'text-gray-900 dark:text-white dark:text-gray-400 hover:text-indigo-600'
              }`}
            >
              Daily Progress
            </button>
          </div>

          {/* Client Selector */}
          <select
            value={selectedClientProgress || ''}
            onChange={(e) => onSelectClient(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 dark:border-[#2a3042] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white bg-white dark:bg-[#1a1f2e]"
          >
            <option value="">All Clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content based on selected view */}
      {trainerProgressView === 'charts' ? (
        <>
          {/* Interactive Progress Analytics Charts */}
          <TrainerProgressCharts
            selectedClientId={selectedClientProgress}
            clients={clients}
          />

          {/* Progress Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-[#1a1f2e] dark:to-[#2a3042] rounded-xl p-6 border border-indigo-200 dark:border-[#2a3042]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-indigo-900 dark:text-white">Total Clients Tracking</h3>
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-indigo-900 dark:text-white">
                {Object.keys(clientsProgress).length}
              </p>
              <p className="text-sm text-indigo-600">out of {clients.length} clients</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-[#1a1f2e] dark:to-[#2a3042] rounded-xl p-6 border border-green-200 dark:border-[#2a3042]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-green-900 dark:text-white">Active This Week</h3>
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900 dark:text-white">
                {Object.values(clientsProgress).filter((progress: ClientProgress) =>
                  progress?.analytics?.summary?.consistency?.entriesPerWeek > 0
                ).length}
              </p>
              <p className="text-sm text-green-600">clients logged progress</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-[#1a1f2e] dark:to-[#2a3042] rounded-xl p-6 border border-purple-200 dark:border-[#2a3042]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-900 dark:text-white">Average Progress</h3>
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-900 dark:text-white">
                {Object.values(clientsProgress).length > 0 ?
                  (Object.values(clientsProgress).reduce((acc: number, progress: ClientProgress) =>
                    acc + (progress?.analytics?.weight?.change?.total || 0), 0) /
                    Object.values(clientsProgress).length).toFixed(1) : '0.0'}
              </p>
              <p className="text-sm text-purple-600">lbs weight change</p>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Daily Progress View for Selected Client */}
          <DailyProgressView
            isTrainer={true}
            clientId={selectedClientProgress || undefined}
          />
        </>
      )}

      {/* Client Progress List */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-[#2a3042]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedClientProgress ?
              `${clients.find(c => c.id === selectedClientProgress)?.name} Progress` :
              'All Client Progress'}
          </h3>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-[#2a3042]">
          {(selectedClientProgress ? [selectedClientProgress] : clients.map(c => c.id))
            .filter(clientId => clientsProgress[clientId])
            .map((clientId) => {
              const client = clients.find(c => c.id === clientId);
              const progress = clientsProgress[clientId];

              if (!client || !progress?.analytics) return null;

              return (
                <div key={clientId} className="p-6 hover:bg-gray-50 dark:hover:bg-[#2a3042] transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold text-lg">
                          {client.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{client.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{client.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        progress.analytics.weight.trend === 'decreasing' ? 'bg-green-100 text-green-800' :
                        progress.analytics.weight.trend === 'increasing' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {progress.analytics.weight.trend}
                      </span>
                    </div>
                  </div>

                  {/* Progress Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Current Weight</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {progress.analytics.weight.current || 'N/A'} lbs
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Change</p>
                      <p className={`text-lg font-semibold ${
                        progress.analytics.weight.change.total !== null && progress.analytics.weight.change.total < 0 ? 'text-green-600' :
                        progress.analytics.weight.change.total !== null && progress.analytics.weight.change.total > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'
                      }`}>
                        {progress.analytics.weight.change.total !== null ?
                          `${progress.analytics.weight.change.total > 0 ? '+' : ''}${progress.analytics.weight.change.total}` : 'N/A'} lbs
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Streak</p>
                      <p className="text-lg font-semibold text-purple-600">
                        {progress.analytics.summary.consistency.streak} days
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Entries</p>
                      <p className="text-lg font-semibold text-indigo-600">
                        {progress.analytics.summary.totalEntries}
                      </p>
                    </div>
                  </div>

                  {/* Recent Progress */}
                  {progress.entries && progress.entries.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Recent Entries</h5>
                      <div className="flex space-x-3 overflow-x-auto pb-2">
                        {progress.entries.slice(0, 5).map((entry: ProgressEntry) => (
                          <div key={entry.id} className="flex-shrink-0 bg-gray-50 dark:bg-[#2a3042] rounded-lg p-3 min-w-[120px]">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              {new Date(entry.date).toLocaleDateString()}
                            </p>
                            {entry.weight && (
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {entry.weight} lbs
                              </p>
                            )}
                            {entry.mood && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Mood: {entry.mood}/10
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => onRefreshClient(clientId)}
                      className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={() => onViewClientDetails(clientId)}
                      className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a3042] rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Empty State */}
        {clients.length === 0 && (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Clients Found</h3>
            <p className="text-gray-600 dark:text-gray-400">Add clients to start tracking their progress.</p>
          </div>
        )}

        {/* No Progress Data */}
        {clients.length > 0 && Object.keys(clientsProgress).length === 0 && (
          <div className="p-12 text-center">
            <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Progress Data</h3>
            <p className="text-gray-600 dark:text-gray-400">Your clients haven&apos;t started logging their progress yet.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
