import type { Transition, Variants } from 'framer-motion';
import type { AnimationVariant } from '@/lib/hooks/useDeviceProfile';

// ── Timing primitives ──────────────────────────────────────────────────
// Mobile: spring-based, feels native (iOS/Android). Faster total duration.
// Desktop: tween-based ease, more choreographed, longer total duration.
// Reduced: opacity-only linear fade, 120ms — the minimum that still reads
// as "the UI changed" without inducing motion sickness.

const mobileSpring: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
  mass: 0.9,
};

const desktopEase: Transition = {
  type: 'tween',
  ease: [0.22, 1, 0.36, 1], // "easeOutQuint" — decelerates in, settles softly
  duration: 0.6,
};

const reducedFade: Transition = {
  type: 'tween',
  ease: 'linear',
  duration: 0.12,
};

// ── Page-level variants (sign-in form, dashboards) ─────────────────────
// Use on the outermost wrapper. `enter` starts child stagger.
export const pageVariants: Record<AnimationVariant, Variants> = {
  mobile: {
    initial: { opacity: 0, y: 24 },
    enter: {
      opacity: 1,
      y: 0,
      transition: {
        ...mobileSpring,
        when: 'beforeChildren',
        staggerChildren: 0.05,
      },
    },
    exit: { opacity: 0, y: -16, transition: { duration: 0.25, ease: 'easeIn' } },
  },
  desktop: {
    initial: { opacity: 0, y: 32 },
    enter: {
      opacity: 1,
      y: 0,
      transition: {
        ...desktopEase,
        duration: 0.7,
        when: 'beforeChildren',
        staggerChildren: 0.08,
        delayChildren: 0.08,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { ...desktopEase, duration: 0.4 },
    },
  },
  reduced: {
    initial: { opacity: 0 },
    enter: { opacity: 1, transition: reducedFade },
    exit: { opacity: 0, transition: reducedFade },
  },
};

// ── Item-level variants (form fields, dashboard tiles) ─────────────────
// Each child wrapper uses these. Stagger is inherited from the parent's
// `staggerChildren` value — do not declare another stagger here.
export const itemVariants: Record<AnimationVariant, Variants> = {
  mobile: {
    initial: { opacity: 0, y: 12 },
    enter: { opacity: 1, y: 0, transition: mobileSpring },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
  },
  desktop: {
    initial: { opacity: 0, y: 18, scale: 0.985 },
    enter: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { ...desktopEase, duration: 0.55 },
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.99,
      transition: { ...desktopEase, duration: 0.3 },
    },
  },
  reduced: {
    initial: { opacity: 0 },
    enter: { opacity: 1, transition: reducedFade },
    exit: { opacity: 0, transition: reducedFade },
  },
};

// ── Helper: pick a variant set based on the resolved AnimationVariant ──
export function pick<T>(
  set: Record<AnimationVariant, T>,
  variant: AnimationVariant,
): T {
  return set[variant];
}
