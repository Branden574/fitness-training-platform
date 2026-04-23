'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import SessionRequestModal, {
  type SessionRequestModalClient,
} from '@/components/scheduling/SessionRequestModal';

export interface ScheduleActionsProps {
  clients: SessionRequestModalClient[];
  /** 'button' for the full desktop pill, 'icon' for the 36px mobile square. */
  layout?: 'button' | 'icon';
}

export default function ScheduleActions({
  clients,
  layout = 'button',
}: ScheduleActionsProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (layout === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid place-items-center rounded"
          style={{
            width: 36,
            height: 36,
            background: 'var(--mf-accent)',
            color: 'var(--mf-accent-ink)',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="New session"
        >
          <Plus size={14} />
        </button>
        <SessionRequestModal
          mode="trainer"
          open={open}
          onClose={() => setOpen(false)}
          onCreated={() => router.refresh()}
          clients={clients}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mf-btn mf-btn-primary"
        style={{ gap: 8 }}
      >
        <Plus size={14} />
        New session
      </button>
      <SessionRequestModal
        mode="trainer"
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => router.refresh()}
        clients={clients}
      />
    </>
  );
}
