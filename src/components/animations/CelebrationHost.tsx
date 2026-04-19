'use client';

import { Celebration } from './Celebration';
import { useCelebrationState } from './CelebrationProvider';

export function CelebrationHost() {
  const { active, dismiss } = useCelebrationState();
  if (!active) return null;
  return (
    <Celebration
      key={active.id}
      preset={active.preset}
      coach={active.coach}
      onClose={dismiss}
    />
  );
}
