import Link from 'next/link';
import { Search, Plus, Trophy } from 'lucide-react';
import { Avatar, StatusDot, TrainerMobileTabs } from '@/components/ui/mf';
import type { RosterClient } from '@/lib/trainer-data';

export interface RosterMobileStats {
  totalClients: number;
  loggedToday: number;
  avgAdherence: number;
  prsThisWeek: number;
}

export interface RosterMobileProps {
  roster: RosterClient[];
  stats: RosterMobileStats;
}

function adherenceColor(adh: number): string {
  if (adh >= 85) return 'var(--mf-green)';
  if (adh >= 70) return 'var(--mf-amber)';
  if (adh > 0) return 'var(--mf-red)';
  return 'var(--mf-fg-mute)';
}

export default function RosterMobile({ roster, stats }: RosterMobileProps) {
  const behindCount = roster.filter((c) => c.status === 'behind').length;

  return (
    <div
      data-mf
      className="flex justify-center md:hidden mf-bg mf-fg"
      style={{ minHeight: '100vh' }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          borderInline: '1px solid var(--mf-hairline)',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Header + stats strip */}
          <div
            style={{
              padding: '8px 16px',
              borderBottom: '1px solid var(--mf-hairline)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                  }}
                >
                  COACHING
                </div>
                <div
                  className="mf-font-display"
                  style={{
                    fontSize: 22,
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                    marginTop: 2,
                  }}
                >
                  ROSTER
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="grid place-items-center rounded"
                  style={{
                    width: 36,
                    height: 36,
                    background: 'var(--mf-surface-2)',
                  }}
                  aria-label="Search roster"
                >
                  <Search size={14} />
                </button>
                <Link
                  href="/register-with-code"
                  className="grid place-items-center rounded"
                  style={{
                    width: 36,
                    height: 36,
                    background: 'var(--mf-accent)',
                    color: 'var(--mf-accent-ink)',
                  }}
                  aria-label="Invite athlete"
                >
                  <Plus size={14} />
                </Link>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginTop: 12,
              }}
            >
              <div>
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  ATHLETES
                </div>
                <div
                  className="mf-font-display mf-tnum"
                  style={{ fontSize: 20, lineHeight: 1 }}
                >
                  {stats.totalClients}
                </div>
              </div>
              <div>
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  ACTIVE TODAY
                </div>
                <div
                  className="mf-font-display mf-tnum mf-accent"
                  style={{ fontSize: 20, lineHeight: 1 }}
                >
                  {stats.loggedToday}
                </div>
              </div>
              <div>
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  BEHIND
                </div>
                <div
                  className="mf-font-display mf-tnum"
                  style={{ fontSize: 20, lineHeight: 1, color: 'var(--mf-amber)' }}
                >
                  {behindCount}
                </div>
              </div>
            </div>
          </div>

          {/* Roster rows */}
          {roster.length === 0 && (
            <div
              className="mf-fg-mute mf-font-mono"
              style={{
                padding: '48px 16px',
                textAlign: 'center',
                fontSize: 11,
                letterSpacing: '0.1em',
              }}
            >
              NO ATHLETES YET
            </div>
          )}
          {roster.map((c) => {
            const col = adherenceColor(c.adherence);
            return (
              <Link
                key={c.id}
                href={`/trainer/clients/${c.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--mf-hairline)',
                }}
              >
                <Avatar
                  initials={c.initials}
                  size={38}
                  active={c.status === 'active' && c.lastLogLabel === 'Today'}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.name ?? c.email}
                    </span>
                    <StatusDot kind={c.status} />
                    {c.prBadge && (
                      <Trophy size={11} className="mf-accent" style={{ flexShrink: 0 }} />
                    )}
                    {c.unread > 0 && (
                      <span
                        className="mf-font-mono"
                        style={{
                          fontSize: 8,
                          padding: '1px 5px',
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
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.lastLogLabel}
                    {c.program ? ` · ${c.program}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    className="mf-font-display mf-tnum"
                    style={{ fontSize: 16, lineHeight: 1, color: col }}
                  >
                    {c.adherence > 0 ? `${c.adherence}%` : '—'}
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{
                      fontSize: 8,
                      textTransform: 'uppercase',
                      marginTop: 2,
                    }}
                  >
                    ADH
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <TrainerMobileTabs active="roster" />
      </div>
    </div>
  );
}
