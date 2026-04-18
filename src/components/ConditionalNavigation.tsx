'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

const ConditionalNavigation = () => {
  const pathname = usePathname();

  // Pages that bring their own chrome (v4 redesign + dashboards)
  const ownsChrome =
    pathname === '/' ||
    pathname === '/design' ||
    pathname?.startsWith('/auth/') ||
    pathname?.startsWith('/trainer/') ||
    pathname?.startsWith('/client/dashboard') ||
    pathname === '/admin' ||
    pathname?.startsWith('/admin/');

  if (ownsChrome) return null;

  return <Navigation />;
};

export default ConditionalNavigation;
