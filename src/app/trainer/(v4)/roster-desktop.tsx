'use client';

import { Plus, ChevronRight, Trophy } from 'lucide-react';
import Link from 'next/link';
import { Avatar, Bar, Btn, DesktopShell, StatCard, StatusDot } from '@/components/ui/mf';
import type { RosterClient } from '@/lib/trainer-data';
import RosterFilterClient from './roster-filter-client';
import InviteAthleteClient from './invite-athlete-client';

export interface RosterStats {
  totalClients: number;
  loggedToday: number;
  avgAdherence: number;
  prsThisWeek: number;
}

export interface RosterDesktopProps {
  roster: RosterClient[];
  stats: RosterStats;
}

export default function RosterDesktop({ roster, stats }: RosterDesktopProps) {
  return (
    <div className="hidden md:block">
      <DesktopShell
        role="trainer"
        active="roster"
        title="Roster"
        breadcrumbs="TRAINER / DASHBOARD"
        brandMeta={`TRAINER · ${roster.length} ATHLETES`}
        headerRight={<InviteAthleteClient />}
        footer={
          <Link href="/trainer/builder" style={{ display: 'block' }}>
            <Btn variant="primary" icon={Plus} className="w-full">
              New program
            </Btn>
          </Link>
        }
      >
        <div style={{ padding: 24, maxWidth: 1400 }}>
          {/* Stat row */}
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}
          >
            <StatCard
              label="ACTIVE ATHLETES"
              value={stats.totalClients}
              delta={stats.totalClients > 0 ? `${stats.totalClients} total` : undefined}
            />
            <StatCard
              label="AVG ADHERENCE"
              value={stats.avgAdherence}
              unit="%"
              accent
            />
            <StatCard
              label="LOGGED TODAY"
              value={`${stats.loggedToday}`}
              unit={`/ ${stats.totalClients}`}
              delta={
                stats.totalClients > 0
                  ? `${Math.round((stats.loggedToday / stats.totalClients) * 100)}%`
                  : undefined
              }
            />
            <StatCard
              label="PRS THIS WEEK"
              value={stats.prsThisWeek}
            />
          </div>

          {/* Filters (client island) + table */}
          <RosterFilterClient roster={roster}>
            {({ filtered }) => (
              <div className="mf-card" style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr 1fr 60px',
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--mf-hairline)',
                  }}
                  className="mf-font-mono mf-fg-mute"
                >
                  {(['ATHLETE', 'STATUS', 'LAST LOG', 'STREAK', 'PROGRAM', 'ADHERENCE', ''] as const).map(
                    (h) => (
                      <div
                        key={h || 'spacer'}
                        style={{
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        {h}
                      </div>
                    ),
                  )}
                </div>
                {filtered.length === 0 && (
                  <div
                    className="mf-fg-mute mf-font-mono"
                    style={{
                      padding: '48px 16px',
                      textAlign: 'center',
                      fontSize: 11,
                      letterSpacing: '0.1em',
                    }}
                  >
                    NO ATHLETES IN THIS FILTER
                  </div>
                )}
                {filtered.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/trainer/clients/${c.id}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr 1fr 60px',
                      padding: '12px 16px',
                      alignItems: 'center',
                      borderBottom:
                        i < filtered.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                      <Avatar
                        initials={c.initials}
                        image={c.image}
                        alt={c.name ?? c.email}
                        size={32}
                        active={c.status === 'active' && c.lastLogLabel === 'Today'}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.name ?? c.email}
                          </span>
                          {c.prBadge && (
                            <Trophy size={12} className="mf-accent" style={{ flexShrink: 0 }} />
                          )}
                          {c.unread > 0 && (
                            <span
                              className="mf-font-mono"
                              style={{
                                fontSize: 9,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'var(--mf-accent)',
                                color: 'var(--mf-accent-ink)',
                              }}
                            >
                              {c.unread}
                            </span>
                          )}
                        </div>
                        <div
                          className="mf-font-mono mf-fg-mute"
                          style={{
                            fontSize: 10,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusDot kind={c.status} />
                      <span
                        className="mf-font-mono mf-fg-dim"
                        style={{
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="mf-fg-dim mf-font-mono mf-tnum" style={{ fontSize: 12 }}>
                      {c.lastLogLabel}
                    </div>
                    <div className="mf-font-display mf-tnum" style={{ fontSize: 18 }}>
                      {c.streak > 0 ? c.streak : <span className="mf-fg-mute" style={{ fontSize: 14 }}>—</span>}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      {c.program ? (
                        <>
                          <div
                            style={{
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.program}
                          </div>
                          <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
                            LAST SESSION
                          </div>
                        </>
                      ) : (
                        <span className="mf-fg-mute">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Bar pct={c.adherence} accent={c.adherence >= 85} />
                      </div>
                      <div
                        className="mf-font-mono mf-tnum"
                        style={{ fontSize: 11, width: 32, textAlign: 'right' }}
                      >
                        {c.adherence}%
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <ChevronRight size={14} className="mf-fg-mute" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </RosterFilterClient>
        </div>
      </DesktopShell>
    </div>
  );
}
