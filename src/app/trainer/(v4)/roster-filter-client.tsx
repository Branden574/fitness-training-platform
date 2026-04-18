'use client';

import { useState, useMemo } from 'react';
import { Filter, Grid2x2 } from 'lucide-react';
import { Btn, type StatusDotKind } from '@/components/ui/mf';
import type { RosterClient } from '@/lib/trainer-data';

type Filter = 'all' | StatusDotKind;

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'ALL' },
  { key: 'active', label: 'ACTIVE' },
  { key: 'behind', label: 'BEHIND' },
  { key: 'new', label: 'NEW' },
  { key: 'paused', label: 'PAUSED' },
];

export default function RosterFilterClient({
  roster,
  children,
}: {
  roster: RosterClient[];
  children: (args: { filtered: RosterClient[] }) => React.ReactNode;
}) {
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: roster.length, active: 0, behind: 0, new: 0, paused: 0 };
    for (const r of roster) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [roster]);

  const filtered = filter === 'all' ? roster : roster.filter((r) => r.status === filter);

  return (
    <>
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 16 }}
      >
        <div className="mf-card flex gap-1" style={{ padding: 4 }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="mf-font-mono"
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: 4,
                  background: active ? 'var(--mf-accent)' : 'transparent',
                  color: active ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {f.label} · {counts[f.key]}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" icon={Filter}>Filters</Btn>
          <Btn variant="ghost" icon={Grid2x2}>View</Btn>
        </div>
      </div>
      {children({ filtered })}
    </>
  );
}
