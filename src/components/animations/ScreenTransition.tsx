'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { TabTransition } from './TabTransition';

/**
 * Route-aware wrapper that fires TabTransition whenever the pathname changes.
 * Use in Next.js `template.tsx` files inside dashboard route segments so
 * tab/sidebar navigation plays the branded screen-change loader.
 *
 * template.tsx re-mounts on every navigation within its segment, which gives
 * us the right lifecycle for a per-tab loader without manual effect wiring.
 */
export function ScreenTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <TabTransition screenKey={pathname}>{children}</TabTransition>;
}
