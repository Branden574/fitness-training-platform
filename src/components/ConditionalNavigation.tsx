'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

const ConditionalNavigation = () => {
  const pathname = usePathname();
  
  // Hide main navigation on dashboard pages
  const shouldHideNavigation = pathname?.startsWith('/trainer/') || 
                              pathname?.startsWith('/client/dashboard') || 
                              pathname?.startsWith('/admin/');

  // Only show main navigation on public pages
  if (shouldHideNavigation) {
    return null;
  }

  return <Navigation />;
};

export default ConditionalNavigation;