import type { ReactNode } from 'react';
import { ScreenTransition } from '@/components/animations/ScreenTransition';

// Plays the branded tab-switch loader on every route change inside /trainer/*.
export default function TrainerTemplate({ children }: { children: ReactNode }) {
  return <ScreenTransition>{children}</ScreenTransition>;
}
