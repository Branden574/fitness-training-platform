import { Suspense } from 'react';
import MarketingLanding from '@/components/marketing/v4/MarketingLanding';

export default function Home() {
  return (
    <Suspense fallback={<div className="mf-bg" style={{ minHeight: '100vh' }} />}>
      <MarketingLanding />
    </Suspense>
  );
}
