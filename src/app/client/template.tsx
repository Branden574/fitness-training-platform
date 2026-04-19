import type { ReactNode } from 'react';
import { ScreenTransition } from '@/components/animations/ScreenTransition';

// Plays the branded tab-switch loader on every route change inside /client/*.
export default function ClientTemplate({ children }: { children: ReactNode }) {
  return <ScreenTransition>{children}</ScreenTransition>;
}
