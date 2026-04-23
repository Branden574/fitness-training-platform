'use client';

import { useSyncExternalStore } from 'react';

export type FormFactor = 'mobile' | 'tablet' | 'desktop';
export type MotionPreference = 'full' | 'reduced';
export type PerformanceTier = 'high' | 'low';
export type AnimationVariant = 'mobile' | 'desktop' | 'reduced';

export interface DeviceProfile {
  formFactor: FormFactor;
  motionPreference: MotionPreference;
  performanceTier: PerformanceTier;
  animationVariant: AnimationVariant;
  /** False on the server and on the first client render; true after hydration. */
  isHydrated: boolean;
}

// SSR-safe default. Client and server agree on this for the first paint, which
// means no hydration mismatch and no flash-of-wrong-variant. Server renders
// desktop variant; client swaps to the real one after the first effect pass.
const SERVER_PROFILE: DeviceProfile = {
  formFactor: 'desktop',
  motionPreference: 'full',
  performanceTier: 'high',
  animationVariant: 'desktop',
  isHydrated: false,
};

// Memoize the snapshot across re-renders so useSyncExternalStore sees
// referential stability when nothing actually changed.
let cachedSignature = '';
let cachedProfile: DeviceProfile | null = null;

interface NavigatorMemory {
  hardwareConcurrency?: number;
  deviceMemory?: number;
}

function computeSnapshot(): DeviceProfile {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return SERVER_PROFILE;
  }
  const mq = (q: string): boolean => window.matchMedia(q).matches;
  const isMobile = mq('(max-width: 767px)');
  const isTablet = mq('(min-width: 768px) and (max-width: 1023px)');
  const formFactor: FormFactor = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  const reduced = mq('(prefers-reduced-motion: reduce)');
  const motionPreference: MotionPreference = reduced ? 'reduced' : 'full';

  // Performance tier heuristic:
  // - `navigator.deviceMemory` is only exposed by Chromium and rounds to
  //   0.25, 0.5, 1, 2, 4, 8. Undefined elsewhere — treat as "high".
  // - `navigator.hardwareConcurrency` is broadly supported.
  // A device is "low" when either ≤4 — low-end phones feel janky under
  // spring/stagger choreography and get a reduced variant.
  const nav = typeof navigator !== 'undefined' ? (navigator as NavigatorMemory) : null;
  const cores = nav?.hardwareConcurrency ?? 8;
  const memory = nav?.deviceMemory ?? 8;
  const performanceTier: PerformanceTier = cores <= 4 || memory <= 4 ? 'low' : 'high';

  // Variant resolution priority: user's reduced-motion preference beats every-
  // thing (it's an accessibility promise). Then low-end phones get the same
  // minimal treatment. Then pick mobile vs desktop by form factor — tablet
  // defaults to desktop since most tablet users expect web-style motion.
  const animationVariant: AnimationVariant =
    motionPreference === 'reduced'
      ? 'reduced'
      : performanceTier === 'low'
        ? 'reduced'
        : formFactor === 'mobile'
          ? 'mobile'
          : 'desktop';

  const signature = `${formFactor}|${motionPreference}|${performanceTier}|${animationVariant}`;
  if (signature === cachedSignature && cachedProfile) return cachedProfile;
  cachedSignature = signature;
  cachedProfile = {
    formFactor,
    motionPreference,
    performanceTier,
    animationVariant,
    isHydrated: true,
  };
  return cachedProfile;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const queries = [
    '(max-width: 767px)',
    '(min-width: 768px) and (max-width: 1023px)',
    '(prefers-reduced-motion: reduce)',
  ];
  const mqls = queries.map((q) => window.matchMedia(q));
  mqls.forEach((m) => {
    if (typeof m.addEventListener === 'function') {
      m.addEventListener('change', callback);
    } else {
      // Legacy Safari fallback — addListener is the old API
      (m as MediaQueryList & { addListener: (cb: () => void) => void }).addListener(callback);
    }
  });
  return () => {
    mqls.forEach((m) => {
      if (typeof m.removeEventListener === 'function') {
        m.removeEventListener('change', callback);
      } else {
        (m as MediaQueryList & { removeListener: (cb: () => void) => void }).removeListener(
          callback,
        );
      }
    });
  };
}

function getServerSnapshot(): DeviceProfile {
  return SERVER_PROFILE;
}

export function useDeviceProfile(): DeviceProfile {
  return useSyncExternalStore(subscribe, computeSnapshot, getServerSnapshot);
}
