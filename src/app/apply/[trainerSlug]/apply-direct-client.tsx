'use client';

import Link from 'next/link';
import { ApplyForm } from '@/components/apply/ApplyForm';

export default function ApplyDirectClient({
  trainerId,
  trainerName,
  trainerPhone,
  waitlist,
}: {
  trainerId: string;
  trainerName: string;
  trainerPhone: string | null;
  waitlist: boolean;
}) {
  const initials = trainerName
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="mf-card" style={{ padding: 16 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
          APPLYING WITH
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: 'var(--mf-surface-2, #0E0E10)',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--font-mf-mono), monospace',
              fontSize: 12,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1 }}>{trainerName}</div>
          <Link
            href="/apply"
            className="mf-fg-dim"
            style={{ fontSize: 11 }}
          >
            change →
          </Link>
        </div>
      </div>

      <ApplyForm
        selection={{ id: trainerId, name: trainerName }}
        trainerPhone={trainerPhone}
        waitlist={waitlist}
      />
    </div>
  );
}
