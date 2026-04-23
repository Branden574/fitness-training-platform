'use client';

import { createContext, useContext, type ReactNode } from 'react';
import {
  useDeviceProfile,
  type DeviceProfile,
} from '@/lib/hooks/useDeviceProfile';

const DeviceProfileContext = createContext<DeviceProfile | null>(null);

export function DeviceProfileProvider({ children }: { children: ReactNode }) {
  const profile = useDeviceProfile();
  return (
    <DeviceProfileContext.Provider value={profile}>
      {children}
    </DeviceProfileContext.Provider>
  );
}

export function useDeviceProfileContext(): DeviceProfile {
  const ctx = useContext(DeviceProfileContext);
  if (!ctx) {
    throw new Error(
      'useDeviceProfileContext must be used inside <DeviceProfileProvider>. ' +
        'Check that the root Providers.tsx wraps children with it.',
    );
  }
  return ctx;
}
