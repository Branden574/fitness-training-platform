'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import {
  CELEBRATIONS,
  type CelebrationKind,
  type CelebrationOverrides,
  type CelebrationPreset,
} from './celebrations';
import type { CelebrationCoach } from './Celebration';

interface ActiveCelebration {
  preset: CelebrationPreset;
  coach?: CelebrationCoach;
  id: number;
}

export interface CelebrateOptions extends CelebrationOverrides {
  coach?: CelebrationCoach;
}

interface CelebrationContextValue {
  active: ActiveCelebration | null;
  celebrate: (kind: CelebrationKind, options?: CelebrateOptions) => void;
  dismiss: () => void;
}

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveCelebration | null>(null);

  const celebrate = useCallback(
    (kind: CelebrationKind, options?: CelebrateOptions) => {
      const base = CELEBRATIONS[kind];
      const { coach, ...presetOverrides } = options ?? {};
      setActive({
        preset: { ...base, ...presetOverrides },
        coach,
        id: Date.now(),
      });
    },
    [],
  );

  const dismiss = useCallback(() => setActive(null), []);

  return (
    <CelebrationContext.Provider value={{ active, celebrate, dismiss }}>
      {children}
    </CelebrationContext.Provider>
  );
}

export function useCelebrate() {
  const ctx = useContext(CelebrationContext);
  if (!ctx) {
    throw new Error('useCelebrate must be used inside CelebrationProvider');
  }
  return ctx.celebrate;
}

export function useCelebrationState() {
  const ctx = useContext(CelebrationContext);
  if (!ctx) {
    throw new Error(
      'useCelebrationState must be used inside CelebrationProvider',
    );
  }
  return ctx;
}
