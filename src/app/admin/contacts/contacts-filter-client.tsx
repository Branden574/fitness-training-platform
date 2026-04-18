'use client';

import Link from 'next/link';

const FILTERS = ['ALL', 'NEW', 'IN_PROGRESS', 'CONTACTED', 'INVITED', 'COMPLETED'] as const;

export default function ContactsFilterClient({
  currentStatus,
  counts,
}: {
  currentStatus: string;
  counts: Record<string, number>;
}) {
  return (
    <div className="mf-card flex gap-1" style={{ padding: 4, width: 'fit-content' }}>
      {FILTERS.map((f) => {
        const active = (currentStatus || 'ALL') === f;
        const href = f === 'ALL' ? '/admin/contacts' : `/admin/contacts?status=${f}`;
        return (
          <Link
            key={f}
            href={href}
            className="mf-font-mono"
            style={{
              padding: '6px 12px',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              borderRadius: 4,
              background: active ? 'var(--mf-accent)' : 'transparent',
              color: active ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
            }}
          >
            {f.replace('_', ' ')} · {counts[f] ?? 0}
          </Link>
        );
      })}
    </div>
  );
}
