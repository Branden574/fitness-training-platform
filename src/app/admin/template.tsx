import type { ReactNode } from 'react';
import { ScreenTransition } from '@/components/animations/ScreenTransition';

// Plays the branded tab-switch loader on every route change inside /admin/*.
// template.tsx re-mounts per-navigation, which is the lifecycle the
// TabTransition state machine expects.
export default function AdminTemplate({ children }: { children: ReactNode }) {
  return <ScreenTransition>{children}</ScreenTransition>;
}
