'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  MoreHorizontal,
  MessageSquare,
  Edit,
  Video,
  Calendar,
  Copy,
  Trophy,
} from 'lucide-react';
import { Avatar, Chip, Bar, TrainerMobileTabs } from '@/components/ui/mf';

export interface MobileRecentPR {
  exercise: string;
  weight: number;
  reps: number;
  date: Date;
  delta: number;
}

export interface MobileTodaySession {
  id: string;
  title: string;
  completed: boolean;
  inProgress: boolean;
  minutesElapsed: number;
  progressPct: number;
  exercisesDone: number;
  exercisesTotal: number;
}

export interface ClientDetailMobileProps {
  clientId: string;
  clientName: string | null;
  clientEmail: string;
  clientImage: string | null;
  fullInitials: string;
  fitnessLevel: string | null;
  programWeek: number;
  programTotalWeeks: number;
  weight: number | null;
  adherencePct: number;
  streakDays: number;
  prCount: number;
  programWeeksCompleted: number;
  sevenDayVolume: number[];
  sevenDayVolumeLabels: string[];
  sevenDayVolumeDelta: number | null;
  todaySession: MobileTodaySession | null;
  recentPRs: MobileRecentPR[];
  prsInBlock: number;
}

const TABS = ['OVERVIEW', 'WORKOUTS', 'FOOD', 'PROGRESS', 'NOTES'] as const;
type TabKey = (typeof TABS)[number];

function formatPrDate(d: Date): string {
  const mo = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dy = String(d.getDate()).padStart(2, '0');
  return `${mo} ${dy}`;
}

export default function ClientDetailMobile({
  clientId,
  clientName,
  clientEmail,
  clientImage,
  fullInitials,
  fitnessLevel,
  programWeek,
  programTotalWeeks,
  weight,
  adherencePct,
  streakDays,
  prCount,
  programWeeksCompleted,
  sevenDayVolume,
  sevenDayVolumeLabels,
  sevenDayVolumeDelta,
  todaySession,
  recentPRs,
  prsInBlock,
}: ClientDetailMobileProps) {
  const [tab, setTab] = useState<TabKey>('OVERVIEW');
  const displayName = clientName ?? clientEmail;

  const programMeta = [
    fitnessLevel ? fitnessLevel.toUpperCase() : null,
    programTotalWeeks > 0 ? `WK ${programWeek}/${programTotalWeeks}` : null,
    weight ? `${weight} LB` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const maxVol = Math.max(1, ...sevenDayVolume);

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
        {/* Top bar */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--mf-hairline)',
          }}
        >
          <Link
            href="/trainer"
            className="grid place-items-center rounded"
            style={{ width: 32, height: 32 }}
            aria-label="Back to roster"
          >
            <ChevronLeft size={16} />
          </Link>
          <div style={{ textAlign: 'center' }}>
            <div
              className="mf-font-mono mf-fg-mute"
              style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em' }}
            >
              ATHLETE · {clientId.slice(0, 6).toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                marginTop: 2,
              }}
            >
              {displayName}
            </div>
          </div>
          <button
            type="button"
            className="grid place-items-center rounded"
            style={{ width: 32, height: 32, background: 'transparent', color: 'var(--mf-fg)' }}
            aria-label="More options"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Hero */}
          <div
            style={{
              padding: '16px 16px',
              borderBottom: '1px solid var(--mf-hairline)',
              background:
                'linear-gradient(180deg, var(--mf-surface-2) 0%, var(--mf-bg) 100%)',
            }}
          >
            <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
              <Avatar
                initials={fullInitials}
                image={clientImage}
                alt={clientName ?? clientEmail}
                size={58}
                active
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="mf-font-display"
                  style={{
                    fontSize: 22,
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </div>
                {programMeta && (
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{
                      fontSize: 10,
                      marginTop: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {programMeta}
                  </div>
                )}
                <div className="flex gap-1" style={{ marginTop: 6 }}>
                  <Chip kind={adherencePct >= 85 ? 'ok' : adherencePct >= 70 ? 'warn' : 'bad'}>
                    {adherencePct >= 85 ? 'GREEN' : adherencePct >= 70 ? 'AMBER' : 'RED'} ·{' '}
                    ADH {adherencePct}%
                  </Chip>
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
              }}
            >
              <MiniStat label="ADH" value={`${adherencePct}%`} color="var(--mf-green)" />
              <MiniStat label="STREAK" value={`${streakDays}`} color="var(--mf-accent)" />
              <MiniStat label="VOLUME" value={formatVolume(sevenDayVolume)} />
              <MiniStat label="PRS" value={`${prCount}`} />
            </div>

            {/* Primary CTAs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginTop: 12,
              }}
            >
              <Link
                href="/trainer/messages"
                className="mf-btn mf-btn-primary"
                style={{ height: 40, justifyContent: 'center' }}
              >
                <MessageSquare size={13} />
                MESSAGE
              </Link>
              <Link
                href="/trainer/builder"
                className="mf-btn"
                style={{ height: 40, justifyContent: 'center' }}
              >
                <Edit size={13} />
                EDIT PLAN
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="flex"
            style={{
              padding: '0 12px',
              marginTop: 4,
              borderBottom: '1px solid var(--mf-hairline)',
              background: 'var(--mf-bg)',
            }}
          >
            {TABS.map((t) => {
              const isActive = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="mf-font-mono"
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: isActive ? 'var(--mf-fg)' : 'var(--mf-fg-mute)',
                    position: 'relative',
                    background: 'transparent',
                  }}
                >
                  {t}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 12,
                        right: 12,
                        height: 2,
                        background: 'var(--mf-accent)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div style={{ padding: '12px 12px 88px' }}>
            {/* Today's session */}
            {todaySession ? (
              <div
                className="mf-card-elev"
                style={{
                  overflow: 'hidden',
                  background:
                    'linear-gradient(135deg, rgba(255,77,28,0.12), var(--mf-surface-2))',
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--mf-hairline)',
                  }}
                >
                  <div>
                    <div className="mf-eyebrow">
                      TODAY ·{' '}
                      {todaySession.completed
                        ? 'COMPLETE'
                        : todaySession.inProgress
                          ? 'IN PROGRESS'
                          : 'SCHEDULED'}
                    </div>
                    <div
                      className="mf-font-display"
                      style={{ fontSize: 16, marginTop: 2 }}
                    >
                      {todaySession.title}
                    </div>
                  </div>
                  {todaySession.inProgress ? (
                    <Chip kind="live">
                      ● LIVE {formatMinutes(todaySession.minutesElapsed)}
                    </Chip>
                  ) : todaySession.completed ? (
                    <Chip kind="ok">DONE</Chip>
                  ) : (
                    <Chip>QUEUED</Chip>
                  )}
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <div
                    className="flex justify-between"
                    style={{ fontSize: 11, marginBottom: 8 }}
                  >
                    <span className="mf-fg-dim">
                      {todaySession.exercisesDone} of {todaySession.exercisesTotal} exercises
                    </span>
                    <span className="mf-font-mono mf-accent">
                      {todaySession.progressPct}%
                    </span>
                  </div>
                  <Bar pct={todaySession.progressPct} accent />
                </div>
              </div>
            ) : (
              <div
                className="mf-card"
                style={{
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <div className="mf-eyebrow" style={{ marginBottom: 4 }}>TODAY</div>
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  NO SESSION LOGGED YET
                </div>
              </div>
            )}

            {/* 7-day volume */}
            <div className="mf-card" style={{ padding: 12, marginTop: 12 }}>
              <div
                className="flex items-center justify-between"
                style={{ marginBottom: 8 }}
              >
                <div className="mf-eyebrow">7-DAY VOLUME</div>
                {sevenDayVolumeDelta !== null && (
                  <span
                    className="mf-font-mono"
                    style={{
                      fontSize: 9,
                      color:
                        sevenDayVolumeDelta > 0
                          ? 'var(--mf-green)'
                          : sevenDayVolumeDelta < 0
                            ? 'var(--mf-red)'
                            : 'var(--mf-fg-mute)',
                    }}
                  >
                    {sevenDayVolumeDelta > 0 ? '+' : ''}
                    {sevenDayVolumeDelta}%
                  </span>
                )}
              </div>
              <div
                className="flex items-end gap-1.5"
                style={{ height: 80 }}
              >
                {sevenDayVolume.map((v, i) => {
                  const pct = (v / maxVol) * 100;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center"
                      style={{ flex: 1 }}
                    >
                      <div
                        style={{
                          flex: 1,
                          width: '100%',
                          display: 'flex',
                          alignItems: 'flex-end',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: `${Math.max(v > 0 ? 4 : 0, pct)}%`,
                            background:
                              v === 0 ? 'var(--mf-hairline)' : 'var(--mf-accent)',
                            opacity: v === 0 ? 0.3 : 1,
                            borderTopLeftRadius: 2,
                            borderTopRightRadius: 2,
                          }}
                        />
                      </div>
                      <div
                        className="mf-font-mono mf-fg-mute"
                        style={{ fontSize: 8, marginTop: 4 }}
                      >
                        {sevenDayVolumeLabels[i]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent PRs */}
            <div className="mf-card" style={{ marginTop: 12 }}>
              <div
                className="flex items-center justify-between"
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--mf-hairline)',
                }}
              >
                <div className="mf-eyebrow">RECENT PRS</div>
                <span
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 9 }}
                >
                  {prsInBlock} IN BLOCK
                </span>
              </div>
              {recentPRs.length === 0 && (
                <div
                  className="mf-fg-mute mf-font-mono"
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    fontSize: 11,
                    letterSpacing: '0.1em',
                  }}
                >
                  NO PRS YET
                </div>
              )}
              {recentPRs.map((pr, i) => (
                <div
                  key={`${pr.exercise}-${i}`}
                  className="flex items-center gap-3"
                  style={{
                    padding: '10px 16px',
                    borderBottom:
                      i === recentPRs.length - 1
                        ? 'none'
                        : '1px solid var(--mf-hairline)',
                  }}
                >
                  <div
                    style={{
                      width: 3,
                      height: 20,
                      background: 'var(--mf-accent)',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pr.exercise}
                    </div>
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 9, marginTop: 2 }}
                    >
                      {formatPrDate(pr.date)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      className="mf-font-display mf-tnum"
                      style={{ fontSize: 13, lineHeight: 1 }}
                    >
                      {pr.weight} × {pr.reps}
                    </div>
                    <div
                      className="mf-font-mono"
                      style={{
                        fontSize: 9,
                        marginTop: 2,
                        color:
                          pr.delta > 0 ? 'var(--mf-green)' : 'var(--mf-fg-mute)',
                      }}
                    >
                      {pr.delta > 0 ? `▲ +${pr.delta}` : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginTop: 12,
              }}
            >
              <QuickAction icon={Video} label="FORM CHECK" href="/trainer/messages" />
              <QuickAction icon={Calendar} label="SCHEDULE" href="/trainer/schedule" />
              <QuickAction icon={Copy} label="DUP PROGRAM" href="/trainer/builder" />
              <QuickAction icon={Trophy} label="PRS" href={`/trainer/clients/${clientId}#prs`} />
              <QuickAction
                icon={MessageSquare}
                label="MESSAGE"
                href="/trainer/messages"
              />
              <QuickAction icon={Edit} label="EDIT" href="/trainer/builder" />
            </div>

            <div
              className="mf-font-mono mf-fg-mute"
              style={{
                marginTop: 16,
                textAlign: 'center',
                fontSize: 9,
                letterSpacing: '0.12em',
              }}
            >
              COMPLETED WEEKS · {programWeeksCompleted}
            </div>
          </div>
        </div>

        <TrainerMobileTabs active="roster" />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="mf-card"
      style={{
        padding: '10px 8px',
        textAlign: 'center',
      }}
    >
      <div
        className="mf-font-display mf-tnum"
        style={{
          fontSize: 18,
          lineHeight: 1,
          color: color ?? 'var(--mf-fg)',
        }}
      >
        {value}
      </div>
      <div
        className="mf-font-mono mf-fg-mute"
        style={{
          fontSize: 8,
          textTransform: 'uppercase',
          marginTop: 4,
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="mf-card flex flex-col items-center gap-1.5"
      style={{
        padding: 12,
        color: 'var(--mf-fg)',
      }}
    >
      <Icon size={16} />
      <span
        className="mf-font-mono mf-fg-mute"
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </span>
    </Link>
  );
}

function formatVolume(values: number[]): string {
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return '—';
  if (total >= 1000) return `${(total / 1000).toFixed(1)}K`;
  return `${total}`;
}

function formatMinutes(mins: number): string {
  if (mins <= 0) return '00:00';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:00`;
}
