'use client';

import { motion } from 'framer-motion';
import { useToast } from '@/components/Toast';

interface UserSettings {
  notifications: boolean;
  emailUpdates: boolean;
  autoApproval: boolean;
  units: string;
}

interface Session {
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

interface TrainerSettingsTabProps {
  session: Session | null;
  theme: string;
  userSettings: UserSettings;
  onUpdateSetting: (key: string, value: string | boolean) => void;
  onResetSettings: () => void;
  onSaveSettings: () => void;
}

export default function TrainerSettingsTab({
  session,
  theme,
  userSettings,
  onUpdateSetting,
  onResetSettings,
  onSaveSettings,
}: TrainerSettingsTabProps) {
  const { toast } = useToast();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Trainer Settings
        </h2>

        <div className="space-y-8">
          {/* Profile Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Profile Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                  Trainer Name
                </label>
                <input
                  type="text"
                  value={session?.user?.name || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a3042] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-[#1a1f2e]"
                  readOnly
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Contact admin to change your trainer name</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a3042] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-[#1a1f2e]"
                  readOnly
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Contact admin to change your email address</p>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                    Client Notifications
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications for client activities and updates</p>
                </div>
                <button
                  onClick={() => onUpdateSetting('notifications', !userSettings.notifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    userSettings.notifications ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      userSettings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                    Email Updates
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive daily summary reports and system updates</p>
                </div>
                <button
                  onClick={() => onUpdateSetting('emailUpdates', !userSettings.emailUpdates)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    userSettings.emailUpdates ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      userSettings.emailUpdates ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                    Auto-Approve Appointments
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Automatically approve client appointment requests</p>
                </div>
                <button
                  onClick={() => onUpdateSetting('autoApproval', !userSettings.autoApproval)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    userSettings.autoApproval ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      userSettings.autoApproval ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Display & Units
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                  Measurement Units
                </label>
                <select
                  value={userSettings.units}
                  onChange={(e) => onUpdateSetting('units', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a3042] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-[#1a1f2e]"
                >
                  <option value="imperial">Imperial (lbs, ft/in)</option>
                  <option value="metric">Metric (kg, cm)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                  Theme
                </label>
                <select
                  value={theme}
                  onChange={(e) => onUpdateSetting('theme', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a3042] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-[#1a1f2e]"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-6 border-t dark:border-[#2a3042]">
            <button
              onClick={onResetSettings}
              className="px-4 py-2 border border-gray-300 dark:border-[#2a3042] text-gray-700 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a3042] transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={() => {
                onSaveSettings();
                toast('Settings saved successfully!', 'success');
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
