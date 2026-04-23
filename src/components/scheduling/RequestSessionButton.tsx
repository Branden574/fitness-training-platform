'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus } from 'lucide-react';
import SessionRequestModal from './SessionRequestModal';

export interface RequestSessionButtonProps {
  coachId: string | null;
  coachName: string | null;
  /** 'compact' → 36px pill, 'full' → normal button with label */
  layout?: 'compact' | 'full';
  /** Extra classes for the trigger button. */
  className?: string;
}

export default function RequestSessionButton({
  coachId,
  coachName,
  layout = 'full',
  className,
}: RequestSessionButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // If the client has no assigned coach, rendering nothing is kinder than a
  // dead button. Trainer roster management lives elsewhere.
  if (!coachId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mf-btn mf-btn-primary ${className ?? ''}`}
        style={
          layout === 'compact'
            ? { height: 36, padding: '0 12px', gap: 6, fontSize: 12 }
            : { gap: 8 }
        }
      >
        <CalendarPlus size={14} />
        Request session
      </button>
      <SessionRequestModal
        mode="client"
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => router.refresh()}
        coachId={coachId}
        coachName={coachName}
      />
    </>
  );
}
