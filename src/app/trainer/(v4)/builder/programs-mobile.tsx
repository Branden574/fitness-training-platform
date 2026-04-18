import Link from 'next/link';
import { Plus, Layers, ChevronRight, Dumbbell } from 'lucide-react';
import { TrainerMobileTabs } from '@/components/ui/mf';

export interface ProgramsMobileProgram {
  id: string;
  name: string;
  durationWks: number;
  weekCount: number;
  totalExercises: number;
  activeClients: number;
}

export interface ProgramsMobileProps {
  programs: ProgramsMobileProgram[];
  exerciseCount: number;
}

export default function ProgramsMobile({ programs, exerciseCount }: ProgramsMobileProps) {
  const featured = programs[0] ?? null;
  const others = featured ? programs.slice(1) : [];
  const activeAssignmentTotal = programs.reduce((s, p) => s + p.activeClients, 0);

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
          {/* Header */}
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
                  PROGRAMS · {activeAssignmentTotal} ACTIVE
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
                  LIBRARY
                </div>
              </div>
              <Link
                href="/trainer/builder"
                className="grid place-items-center rounded"
                style={{
                  width: 36,
                  height: 36,
                  background: 'var(--mf-accent)',
                  color: 'var(--mf-accent-ink)',
                }}
                aria-label="New program"
              >
                <Plus size={14} />
              </Link>
            </div>
          </div>

          <div style={{ padding: '12px 12px 80px' }}>
            {/* Featured / most recent */}
            {featured && (
              <Link
                href={`/trainer/builder/${featured.id}`}
                className="mf-card-elev"
                style={{
                  display: 'block',
                  overflow: 'hidden',
                  marginBottom: 12,
                }}
              >
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{
                    aspectRatio: '16 / 7',
                    background: 'var(--mf-surface-3)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  MOST RECENT · TEMPLATE
                </div>
                <div style={{ padding: 12 }}>
                  <div className="flex items-start justify-between" style={{ gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="mf-font-display"
                        style={{
                          fontSize: 17,
                          letterSpacing: '-0.01em',
                          lineHeight: 1.15,
                          textTransform: 'uppercase',
                        }}
                      >
                        {featured.name}
                      </div>
                      <div
                        className="mf-font-mono mf-fg-mute"
                        style={{ fontSize: 10, marginTop: 4, letterSpacing: '0.1em' }}
                      >
                        {featured.durationWks}-WEEK · {featured.activeClients} ATHLETE
                        {featured.activeClients === 1 ? '' : 'S'} ENROLLED
                      </div>
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
                    <FeaturedStat label="EX" value={featured.totalExercises} />
                    <FeaturedStat label="WK" value={featured.weekCount} />
                    <FeaturedStat label="ACTIVE" value={featured.activeClients} />
                  </div>
                </div>
              </Link>
            )}

            {/* Other programs */}
            <div
              className="mf-font-mono mf-fg-mute"
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                padding: '0 4px',
                marginBottom: 8,
              }}
            >
              YOUR PROGRAMS
            </div>

            {programs.length === 0 && (
              <div
                className="mf-card mf-fg-mute mf-font-mono"
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                }}
              >
                NO PROGRAMS YET
              </div>
            )}

            {others.map((p) => (
              <Link
                key={p.id}
                href={`/trainer/builder/${p.id}`}
                className="mf-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <div
                  className="grid place-items-center rounded"
                  style={{
                    width: 40,
                    height: 40,
                    background: 'var(--mf-surface-3)',
                    flexShrink: 0,
                  }}
                >
                  <Layers size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 9, marginTop: 2, letterSpacing: '0.1em' }}
                  >
                    {p.durationWks}-WK · {p.totalExercises} EX
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    className="mf-font-display mf-tnum"
                    style={{ fontSize: 14, lineHeight: 1 }}
                  >
                    {p.activeClients}
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{
                      fontSize: 8,
                      textTransform: 'uppercase',
                      marginTop: 2,
                    }}
                  >
                    ATHLETES
                  </div>
                </div>
                <ChevronRight size={14} className="mf-fg-mute" />
              </Link>
            ))}

            {/* Exercise lib entry */}
            <Link
              href="/trainer/exercises"
              className="mf-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                marginTop: 16,
              }}
            >
              <div
                className="grid place-items-center rounded"
                style={{
                  width: 40,
                  height: 40,
                  background: 'var(--mf-accent)',
                  color: 'var(--mf-accent-ink)',
                  flexShrink: 0,
                }}
              >
                <Dumbbell size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Exercise Library</div>
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 9, letterSpacing: '0.1em', marginTop: 2 }}
                >
                  {exerciseCount} EXERCISES · VIDEO CUES
                </div>
              </div>
              <ChevronRight size={14} className="mf-fg-mute" />
            </Link>
          </div>
        </div>

        <TrainerMobileTabs active="program" />
      </div>
    </div>
  );
}

function FeaturedStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        className="mf-font-display mf-tnum"
        style={{ fontSize: 14, lineHeight: 1 }}
      >
        {value}
      </div>
      <div
        className="mf-font-mono mf-fg-mute"
        style={{
          fontSize: 8,
          textTransform: 'uppercase',
          marginTop: 4,
          letterSpacing: '0.14em',
        }}
      >
        {label}
      </div>
    </div>
  );
}
