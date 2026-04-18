import Link from 'next/link';
import { Users, Layers, ChevronRight } from 'lucide-react';
import { DesktopShell } from '@/components/ui/mf';
import NewProgramClient from './new-program-client';

export interface ProgramsDesktopProgram {
  id: string;
  name: string;
  description: string | null;
  durationWks: number;
  weeks: Array<{ id: string; days: Array<{ exercises: Array<{ id: string }> }> }>;
  assignments: Array<{ id: string; clientId: string }>;
}

export interface ProgramsDesktopProps {
  programs: ProgramsDesktopProgram[];
  exerciseCount: number;
  totalAssignments: number;
  totalExercisesPlanned: number;
}

export default function ProgramsDesktop({
  programs,
  exerciseCount,
  totalAssignments,
  totalExercisesPlanned,
}: ProgramsDesktopProps) {
  return (
    <div className="hidden md:block">
      <DesktopShell
        role="trainer"
        active="builder"
        title="Program Builder"
        breadcrumbs="PROGRAMS / BUILDER"
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
            <div className="flex items-start justify-between" style={{ gap: 24 }}>
              <div>
                <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                  PROGRAM BUILDER · LIVE
                </div>
                <div
                  className="mf-font-display"
                  style={{ fontSize: 28, lineHeight: 1, letterSpacing: '-0.01em', textTransform: 'uppercase' }}
                >
                  Build once. Assign forever.
                </div>
                <div
                  className="mf-fg-dim"
                  style={{ fontSize: 13, marginTop: 8, maxWidth: 560, lineHeight: 1.5 }}
                >
                  Create multi-week programs, stack them with exercises, and assign to athletes.
                  Each assignment drives their mobile Program view and binds workouts to a week +
                  day in their plan.
                </div>
              </div>
              <div className="flex gap-4">
                <Stat label="PROGRAMS" value={programs.length} />
                <div className="mf-vr" />
                <Stat label="EXERCISES" value={exerciseCount} />
                <div className="mf-vr" />
                <Stat label="ACTIVE ASSN." value={totalAssignments} accent />
                <div className="mf-vr" />
                <Stat label="EX PLANNED" value={totalExercisesPlanned} />
              </div>
            </div>
          </div>

          {/* New program + list */}
          <NewProgramClient />

          <div className="flex items-center justify-between" style={{ marginTop: 32, marginBottom: 12 }}>
            <div>
              <div className="mf-eyebrow">01 / YOUR PROGRAMS</div>
              <div
                className="mf-font-display"
                style={{ fontSize: 20, letterSpacing: '-0.01em', textTransform: 'uppercase' }}
              >
                Templates
              </div>
            </div>
          </div>

          {programs.length === 0 ? (
            <div
              className="mf-card"
              style={{ padding: 48, textAlign: 'center' }}
            >
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>EMPTY LIBRARY</div>
              <div className="mf-fg-dim" style={{ fontSize: 13 }}>
                No programs yet. Use the form above to create your first.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {programs.map((p) => {
                const totalExercises = p.weeks.reduce(
                  (s, w) => s + w.days.reduce((ds, d) => ds + d.exercises.length, 0),
                  0,
                );
                const activeClients = new Set(p.assignments.map((a) => a.clientId)).size;
                return (
                  <Link
                    key={p.id}
                    href={`/trainer/builder/${p.id}`}
                    className="mf-card"
                    style={{ padding: 16, display: 'block' }}
                  >
                    <div
                      className="flex items-center justify-between"
                      style={{ marginBottom: 8 }}
                    >
                      <div className="mf-eyebrow">{p.durationWks} WEEKS</div>
                      <ChevronRight size={14} className="mf-fg-mute" />
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
                      {p.name}
                    </div>
                    {p.description && (
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
                        {p.description}
                      </div>
                    )}
                    <div
                      className="flex items-center gap-3 mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10 }}
                    >
                      <span className="flex items-center gap-1">
                        <Layers size={10} /> {p.weeks.length}W · {totalExercises} EX
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={10} /> {activeClients} ACTIVE
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </DesktopShell>
    </div>
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
      <div className="mf-eyebrow" style={{ marginTop: 4 }}>{label}</div>
    </div>
  );
}
