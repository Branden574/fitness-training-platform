'use client';

import { useEffect, useState } from 'react';

export interface AssignedTrainer {
  name: string;
  initials: string;
  photoUrl: string | null;
  slug: string | null;
  /**
   * Whether the trainer has opted into the public directory. Gates whether
   * the sidebar chip should link to /t/[slug] — private trainer pages 404
   * and we don't want to send clients into a dead-end.
   */
  isPublic: boolean;
}

export function useAssignedTrainer() {
  const [trainer, setTrainer] = useState<AssignedTrainer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/clients/me/trainer', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setTrainer(data.trainer ?? null);
      } catch {
        // Silent — fallback rendering handles null
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { trainer, loading };
}
