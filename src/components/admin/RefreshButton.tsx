'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { RotateCw } from 'lucide-react';
import Btn from '@/components/ui/mf/Btn';

export default function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [spinning, setSpinning] = useState(false);

  const handleClick = () => {
    setSpinning(true);
    startTransition(() => {
      router.refresh();
    });
    setTimeout(() => setSpinning(false), 600);
  };

  const active = spinning || isPending;

  return (
    <>
      <Btn
        icon={() => (
          <RotateCw
            size={14}
            style={{
              animation: active ? 'refresh-spin 0.6s linear infinite' : undefined,
            }}
          />
        )}
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? 'Refreshing…' : 'Refresh'}
      </Btn>
      <style jsx>{`
        @keyframes refresh-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
