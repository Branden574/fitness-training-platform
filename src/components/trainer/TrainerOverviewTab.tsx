'use client';

import { motion } from 'framer-motion';
import { Users, TrendingUp, Dumbbell, Bell, Clock } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  image?: string;
}

interface Stats {
  totalClients: number;
  activeClients: number;
  newSubmissions: number;
  totalWorkouts: number;
  pendingAppointments: number;
}

interface TrainerOverviewTabProps {
  clients: Client[];
  stats: Stats;
  loading: boolean;
  onTabChange: (tab: string) => void;
  onViewClient: (clientId: string) => void;
}

export default function TrainerOverviewTab({
  clients,
  stats,
  loading,
  onTabChange,
  onViewClient,
}: TrainerOverviewTabProps) {
  const getMembershipDuration = (joinDate: string): string => {
    const now = new Date();
    const joined = new Date(joinDate);
    const diffTime = Math.abs(now.getTime() - joined.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Joined today';
    if (diffDays === 1) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''}`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 shadow-sm dark:border dark:border-[#2a3042]">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 shadow-sm dark:border dark:border-[#2a3042]">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 shadow-sm dark:border dark:border-[#2a3042]">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Dumbbell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Workout Templates</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalWorkouts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 shadow-sm dark:border dark:border-[#2a3042]">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Bell className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New Inquiries</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.newSubmissions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 shadow-sm dark:border dark:border-[#2a3042]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {clients.slice(0, 3).map((client) => (
            <div key={client.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#232839] rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center overflow-hidden">
                  {client.image ? (
                    <img src={client.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-medium text-sm">
                      {client.name.split(' ').map((n: string) => n[0]).join('')}
                    </span>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{client.name}</p>
                  <div className="flex items-center space-x-3 mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Joined {new Date(client.createdAt).toLocaleDateString()}
                    </p>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded-full">
                      {getMembershipDuration(client.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">Active</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
