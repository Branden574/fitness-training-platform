'use client';

import { useCallback, useEffect, useState } from 'react';
import { animationsV2Enabled } from '@/lib/animationFlags';
import { BootLoader } from './BootLoader';

const STORAGE_KEY = 'mf.booted';

export function BootGate() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!animationsV2Enabled()) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) !== '1') {
        setShow(true);
      }
    } catch {
      // private mode or storage disabled — skip splash silently
    }
  }, []);

  const handleDone = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setShow(false);
  }, []);

  if (!mounted || !show) return null;
  return <BootLoader onDone={handleDone} />;
}
