'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UserSettings {
  notifications: boolean;
  emailUpdates: boolean;
  theme: 'light' | 'dark' | 'auto';
  units: 'imperial' | 'metric';
}

const STORAGE_KEY = 'user-settings';

const DEFAULT_SETTINGS: UserSettings = {
  notifications: true,
  emailUpdates: true,
  theme: 'light',
  units: 'imperial',
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  const updateSetting = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch {
      // ignore
    }
  }, []);

  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  return { settings, updateSetting, resetSettings, saveSettings, loaded };
}
