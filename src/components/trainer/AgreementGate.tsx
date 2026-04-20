'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Wraps a trainer-only surface that requires an accepted agreement version.
 * Redirects to /trainer/agreement?return=<current-path> if not accepted.
 */
export function AgreementGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/trainers/me/agreement', {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (!data.accepted) {
          router.replace(
            `/trainer/agreement?return=${encodeURIComponent(pathname)}`,
          );
        } else {
          setAccepted(true);
        }
      } catch {
        // If the check fails, fall through — don't block the UI on transient errors.
        if (!cancelled) setAccepted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (accepted !== true) return null;
  return <>{children}</>;
}
