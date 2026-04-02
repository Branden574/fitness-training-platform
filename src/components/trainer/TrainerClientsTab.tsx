'use client';

import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Plus,
  Clock,
  Activity,
  MoreVertical,
  Eye,
  Dumbbell,
  Settings,
  UserMinus,
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  image?: string;
  lastActivity?: string;
}

interface TrainerClientsTabProps {
  clients: Client[];
  clientSearchTerm: string;
  onSearchChange: (value: string) => void;
  onViewClient: (clientId: string) => void;
  onShowMenu: (clientId: string | null) => void;
  showClientMenu: string | null;
  onRemoveClient: (clientId: string) => void;
  onShowRemoveConfirm: (clientId: string | null) => void;
  showRemoveConfirm: string | null;
  removeAction: string;
  onSetRemoveAction: (action: string) => void;
  onConfirmRemove: () => void;
  onShowAddClient: () => void;
  onShowAssignWorkout: (clientId: string) => void;
  onResetPassword: (clientId: string) => void;
  onShowInvitationCode: () => void;
  loadingClientDetails?: string | null;
}

export default function TrainerClientsTab({
  clients,
  clientSearchTerm,
  onSearchChange,
  onViewClient,
  onShowMenu,
  showClientMenu,
  onRemoveClient,
  onShowRemoveConfirm,
  showRemoveConfirm,
  removeAction,
  onSetRemoveAction,
  onConfirmRemove,
  onShowAddClient,
  onShowAssignWorkout,
  onResetPassword,
  onShowInvitationCode,
  loadingClientDetails,
}: TrainerClientsTabProps) {
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h2>
        <button
          onClick={onShowAddClient}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Add Client
        </button>
      </div>

      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm dark:border dark:border-[#2a3042]">
        <div className="p-6 border-b border-gray-200 dark:border-[#2a3042]">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={clientSearchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#2a3042] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white placeholder-gray-400 dark:bg-[#232839]"
              />
            </div>
            <button className="px-4 py-2 border border-gray-300 dark:border-[#2a3042] rounded-lg hover:bg-gray-50 dark:hover:bg-[#232839] transition-colors">
              <Filter className="w-4 h-4 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-[#2a3042]">
          {clients
            .filter(
              (client) =>
                client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                client.email.toLowerCase().includes(clientSearchTerm.toLowerCase())
            )
            .map((client) => (
              <div key={client.id} className="p-6 hover:bg-gray-50 dark:hover:bg-[#232839] transition-colors relative">
                {/* Loading Overlay */}
                {loadingClientDetails === client.id && (
                  <div className="absolute inset-0 bg-white dark:bg-[#1a1f2e] bg-opacity-90 dark:bg-opacity-90 flex items-center justify-center z-50 rounded-lg">
                    <div className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 border-4 border-indigo-200 dark:border-indigo-800 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Loading client details...</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Please wait</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {client.name.split(' ').map((n) => n[0]).join('')}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{client.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{client.email}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                          <Clock className="w-3 h-3 mr-1" />
                          Joined {new Date(client.createdAt).toLocaleDateString()}
                        </div>
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded-full">
                          {getMembershipDuration(client.createdAt)}
                        </span>
                        {client.lastActivity && (
                          <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                            <Activity className="w-3 h-3 mr-1" />
                            Last active {new Date(client.lastActivity).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Progress</p>
                      <p className="text-xs text-green-600 dark:text-green-400">On track</p>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => onShowMenu(showClientMenu === client.id ? null : client.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a3042] rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {/* Client Actions Menu */}
                      {showClientMenu === client.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#1a1f2e] rounded-lg shadow-xl border border-gray-200 dark:border-[#2a3042] py-2 z-[9999] min-w-[200px]">
                          <button
                            onClick={() => onViewClient(client.id)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#232839] transition-colors flex items-center space-x-2"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Details</span>
                          </button>
                          <button
                            onClick={() => onShowAssignWorkout(client.id)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#232839] transition-colors flex items-center space-x-2"
                          >
                            <Dumbbell className="w-4 h-4" />
                            <span>Assign Workout</span>
                          </button>
                          <button
                            onClick={() => {
                              onResetPassword(client.id);
                              onShowMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center space-x-2"
                          >
                            <Settings className="w-4 h-4" />
                            <span>Reset Password</span>
                          </button>
                          <hr className="my-1 dark:border-[#2a3042]" />
                          <button
                            onClick={() => onShowRemoveConfirm(client.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-2"
                          >
                            <UserMinus className="w-4 h-4" />
                            <span>Remove Client</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </motion.div>
  );
}
