import { Plus, Copy, Edit, Eye, Users, Layers, Clock } from 'lucide-react';
import Link from 'next/link';
import { requireTrainerSession } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import { Btn, Chip, DesktopShell } from '@/components/ui/mf';
import type { Difficulty, WorkoutType } from '@prisma/client';

export const dynamic = 'force-dynamic';

function diffKind(d: Difficulty): 'default' | 'ok' | 'warn' {
  if (d === 'ADVANCED') return 'warn';
  if (d === 'INTERMEDIATE') return 'ok';
  return 'default';
}

function typeLabel(t: WorkoutType): string {
  return t.replace(/_/g, ' ');
}

export default async function TrainerBuilderPage() {
  const session = await requireTrainerSession();

  const [workouts, exerciseCount, assignedSessions] = await Promise.all([
    prisma.workout.findMany({
      where: { createdBy: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        exercises: { select: { id: true } },
        sessions: {
          select: { id: true, userId: true, completed: true },
        },
      },
      take: 60,
    }),
    prisma.exercise.count(),
    prisma.workoutSession.count({
      where: { workout: { createdBy: session.user.id } },
    }),
  ]);

  const completedCount = workouts.reduce(
    (s, w) => s + w.sessions.filter((x) => x.completed).length,
    0,
  );

  return (
    <DesktopShell
      role="trainer"
      active="builder"
      title="Program Builder"
      breadcrumbs="PROGRAMS / BUILDER"
      headerRight={
        <>
          <Btn variant="ghost" icon={Eye}>Preview</Btn>
          <Btn variant="primary" icon={Plus}>New workout</Btn>
        </>
      }
    >
      <div style={{ padding: 24, maxWidth: 1400 }}>
        {/* Intro banner */}
        <div
          className="mf-card-elev"
          style={{
            padding: 20,
            marginBottom: 24,
            background: 'linear-gradient(180deg, rgba(255,77,28,0.06), transparent 40%)',
            borderColor: 'var(--mf-accent)',
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                PROGRAM BUILDER
              </div>
              <div
                className="mf-font-display"
                style={{ fontSize: 28, lineHeight: 1, letterSpacing: '-0.01em', textTransform: 'uppercase' }}
              >
                Build once. Assign forever.
              </div>
              <div className="mf-fg-dim" style={{ fontSize: 13, marginTop: 8, maxWidth: 560, lineHeight: 1.5 }}>
                Drag-reorder weeks, clone days, swap exercises. Assign to one athlete or a whole
                roster. Full week-grid editor lands alongside the Program schema — below is your
                current workout template library.
              </div>
            </div>
            <div className="flex gap-4">
              <Stat label="WORKOUTS" value={workouts.length} />
              <div className="mf-vr" />
              <Stat label="EXERCISES" value={exerciseCount} />
              <div className="mf-vr" />
              <Stat label="ASSIGNED" value={assignedSessions} />
              <div className="mf-vr" />
              <Stat label="LOGGED" value={completedCount} accent />
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <div>
            <div className="mf-eyebrow">01 / TEMPLATES</div>
            <div
              className="mf-font-display"
              style={{ fontSize: 20, letterSpacing: '-0.01em', textTransform: 'uppercase' }}
            >
              Your workouts
            </div>
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" icon={Layers}>Import</Btn>
            <Btn variant="primary" icon={Plus}>New workout</Btn>
          </div>
        </div>

        {workouts.length === 0 ? (
          <div
            className="mf-card"
            style={{
              padding: 48,
              textAlign: 'center',
            }}
          >
            <div className="mf-eyebrow" style={{ marginBottom: 8 }}>EMPTY LIBRARY</div>
            <div className="mf-fg-dim" style={{ fontSize: 13, marginBottom: 16 }}>
              You haven&apos;t built any workout templates yet. Start with a push day, pull day,
              or lower-body block.
            </div>
            <Btn variant="primary" icon={Plus}>New workout</Btn>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {workouts.map((w) => {
              const clientCount = new Set(w.sessions.map((s) => s.userId)).size;
              const done = w.sessions.filter((s) => s.completed).length;
              return (
                <div key={w.id} className="mf-card" style={{ padding: 16 }}>
                  <div
                    className="flex items-center justify-between"
                    style={{ marginBottom: 8 }}
                  >
                    <Chip kind={diffKind(w.difficulty)}>{w.difficulty}</Chip>
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10, letterSpacing: '0.1em' }}
                    >
                      {typeLabel(w.type).toUpperCase()}
                    </div>
                  </div>
                  <div
                    className="mf-font-display"
                    style={{
                      fontSize: 18,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.15,
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    {w.title}
                  </div>
                  {w.description && (
                    <div
                      className="mf-fg-dim"
                      style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        marginBottom: 12,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {w.description}
                    </div>
                  )}
                  <div
                    className="flex items-center gap-3 mf-font-mono mf-fg-mute"
                    style={{ fontSize: 10, marginBottom: 12 }}
                  >
                    <span className="flex items-center gap-1">
                      <Layers size={10} /> {w.exercises.length} EX
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> {w.duration} MIN
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={10} /> {clientCount} · {done} LOGGED
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Btn icon={Edit} style={{ flex: 1 }}>
                      Edit
                    </Btn>
                    <Btn variant="ghost" icon={Copy} aria-label="Duplicate" />
                    <Btn variant="primary" icon={Users}>
                      Assign
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Planned feature */}
        <div
          className="mf-card"
          style={{
            padding: 20,
            marginTop: 32,
            borderStyle: 'dashed',
          }}
        >
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
            COMING · 02 / WEEK BUILDER
          </div>
          <div
            className="mf-font-display"
            style={{ fontSize: 18, letterSpacing: '-0.01em', textTransform: 'uppercase', marginBottom: 8 }}
          >
            Drag weeks. Clone days. Swap exercises.
          </div>
          <div className="mf-fg-dim" style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 640 }}>
            Full week-by-week program editor — 3-column layout with template library, 7-day grid,
            and a right-rail day editor. Lands once the{' '}
            <span className="mf-font-mono">Program / ProgramWeek / ProgramDay</span> schema is
            added in a coming phase.
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <Link href="/trainer">
            <Btn variant="ghost">← Back to roster</Btn>
          </Link>
        </div>
      </div>
    </DesktopShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        className="mf-font-display mf-tnum"
        style={{
          fontSize: 28,
          lineHeight: 1,
          color: accent ? 'var(--mf-accent)' : undefined,
        }}
      >
        {value}
      </div>
      <div className="mf-eyebrow" style={{ marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}
