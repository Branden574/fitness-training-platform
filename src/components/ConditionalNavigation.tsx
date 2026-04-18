'use client';

import { usePathname } from 'next/navigation';
import PublicTopNav from '@/components/ui/mf/PublicTopNav';

const ConditionalNavigation = () => {
  const pathname = usePathname();

  const ownsChrome =
    pathname === '/' ||
    pathname === '/design' ||
    pathname?.startsWith('/auth/') ||
    pathname === '/client' ||
    pathname?.startsWith('/client/') ||
    pathname === '/trainer' ||
    pathname?.startsWith('/trainer/') ||
    pathname === '/admin' ||
    pathname?.startsWith('/admin/');

  if (ownsChrome) return null;

  return <PublicTopNav />;
};

export default ConditionalNavigation;
