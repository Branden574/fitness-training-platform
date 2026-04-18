'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';

interface FilterTab {
  key: string;
  label: string;
  count: number;
}

export default function AdminUsersFilterClient({
  currentRole,
  currentQuery,
  filterTabs,
  pendingInvitations,
}: {
  currentRole: string;
  currentQuery: string;
  filterTabs: FilterTab[];
  pendingInvitations: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(currentQuery);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (currentRole) params.set('role', currentRole);
    if (query.trim()) params.set('q', query.trim());
    const qs = params.toString();
    router.push(qs ? `/admin/users?${qs}` : '/admin/users');
  }

  return (
    <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
      <form
        onSubmit={submitSearch}
        style={{ position: 'relative', flex: 1, maxWidth: 380 }}
      >
        <Search
          size={14}
          className="mf-fg-mute"
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
        <input
          className="mf-input"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </form>
      <div className="mf-card flex gap-1" style={{ padding: 4 }}>
        {filterTabs.map((t) => {
          const active = currentRole === t.key;
          const qs = new URLSearchParams();
          if (t.key) qs.set('role', t.key);
          if (query.trim()) qs.set('q', query.trim());
          const href = qs.toString() ? `/admin/users?${qs.toString()}` : '/admin/users';
          return (
            <Link
              key={t.key || 'all'}
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
              {t.label} · {t.count.toLocaleString()}
            </Link>
          );
        })}
      </div>
      {pendingInvitations > 0 && (
        <Link
          href="/admin/legacy"
          className="mf-font-mono mf-fg-dim"
          style={{
            fontSize: 10,
            padding: '6px 10px',
            borderRadius: 4,
            border: '1px dashed var(--mf-hairline-strong)',
            letterSpacing: '0.1em',
          }}
        >
          {pendingInvitations} PENDING INVITES →
        </Link>
      )}
    </div>
  );
}
