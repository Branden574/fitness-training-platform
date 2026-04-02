'use client';

import { motion } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { Camera, Shield, Bell, Palette, Ruler } from 'lucide-react';

interface SettingsTabProps {
  session: {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  } | null;
  theme: string;
  userSettings: {
    notifications: boolean;
    emailUpdates: boolean;
    units: string;
  };
  onUpdateSetting: (key: string, value: string | boolean) => void;
  onResetSettings: () => void;
  onSaveSettings: () => void;
}

export default function SettingsTab({
  session,
  theme,
  userSettings,
  onUpdateSetting,
  onResetSettings,
  onSaveSettings,
}: SettingsTabProps) {
  const { toast } = useToast();
  const userName = session?.user?.name || 'Client';
  const userEmail = session?.user?.email || '';
  const userImage = session?.user?.image;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>

      {/* Profile Section */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-gray-100 dark:border-[#2a3042] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a3042]">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-500" />
            Profile
          </h3>
        </div>
        <div className="p-5 space-y-5">
          {/* Profile Picture */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center ring-2 ring-indigo-500/20 overflow-hidden">
                {userImage ? (
                  <img src={userImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-5 h-5 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast('Image must be under 5MB', 'warning');
                      return;
                    }
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('type', 'profile');
                    try {
                      const response = await fetch('/api/profile', {
                        method: 'PUT',
                        body: formData,
                      });
                      if (response.ok) {
                        toast('Profile picture updated!', 'success');
                        window.location.reload();
                      } else {
                        toast('Failed to upload profile picture', 'error');
                      }
                    } catch {
                      toast('Error uploading profile picture', 'error');
                    }
                  }}
                />
              </label>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Profile Picture</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Click to upload (max 5MB)</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={userName}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-[#2a3042] rounded-xl bg-gray-50 dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
              readOnly
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Contact your trainer to change your display name</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={userEmail}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-[#2a3042] rounded-xl bg-gray-50 dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-gray-100 dark:border-[#2a3042] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a3042]">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-500" />
            Notifications
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <ToggleSetting
            label="Push Notifications"
            description="Receive notifications for workout reminders and updates"
            enabled={userSettings.notifications}
            onChange={(val) => onUpdateSetting('notifications', val)}
          />
          <ToggleSetting
            label="Email Updates"
            description="Receive weekly progress reports and tips"
            enabled={userSettings.emailUpdates}
            onChange={(val) => onUpdateSetting('emailUpdates', val)}
          />
        </div>
      </div>

      {/* Display Section */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-gray-100 dark:border-[#2a3042] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a3042]">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-500" />
            Display
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Theme
            </label>
            <select
              value={theme}
              onChange={(e) => onUpdateSetting('theme', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-[#2a3042] rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Measurement Units
            </label>
            <select
              value={userSettings.units}
              onChange={(e) => onUpdateSetting('units', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-[#2a3042] rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
            >
              <option value="imperial">Imperial (lbs, ft/in)</option>
              <option value="metric">Metric (kg, cm)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-gray-100 dark:border-[#2a3042] p-5">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your profile and data are only visible to your trainer, Brent Martinez. This is a private platform.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onResetSettings}
          className="px-4 py-2.5 border border-gray-200 dark:border-[#2a3042] text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-[#242938] transition-colors text-sm font-medium"
        >
          Reset to Defaults
        </button>
        <button
          onClick={() => {
            onSaveSettings();
            toast('Settings saved successfully!', 'success');
          }}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          Save Changes
        </button>
      </div>
    </motion.div>
  );
}

function ToggleSetting({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
