import { notFound } from 'next/navigation';
import {
  StatusDot,
  Avatar,
  Section,
  Scoreboard,
  StatCard,
  Chip,
  Ring,
  MacroRing,
  CalRing,
  Sparkline,
  Bar,
  Btn,
  Toggle,
  BottomTabs,
  DesktopShell,
  Placeholder,
  AthletePh,
  LineChart,
  BarChart,
  Heatmap,
  SrcPill,
} from '@/components/ui/mf';

// Dev-only preview route for the v4 "athletic performance" design system.
// Returns 404 in production so end users never hit it.

export const metadata = { title: 'v4 · Design System' };

const STUBS = [
  ['StatusDot', <StatusDot key="sd" kind="active" />],
  ['Avatar', <Avatar key="av" initials="JR" />],
  ['Chip', <Chip key="ch" kind="live">LIVE</Chip>],
  ['Ring', <Ring key="r" pct={94} />],
  ['Bar', <Bar key="b" pct={72} accent />],
  ['Btn', <Btn key="bt" variant="primary">Primary</Btn>],
  ['Sparkline', <Sparkline key="sp" data={[1, 3, 2, 5, 4, 6]} />],
  ['Placeholder', <Placeholder key="ph" label="IMG" />],
  ['AthletePh', <AthletePh key="ap" label="ATHLETE" h={120} />],
  ['SrcPill', <SrcPill key="src" src="usda" />],
] as const;

export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <div data-mf className="mf-bg mf-fg" style={{ padding: '2rem', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="mf-eyebrow">DESIGN SYSTEM · V4 · PHASE 0 STUBS</div>
        <h1 className="mf-font-display" style={{ fontSize: 56, lineHeight: 0.95, textTransform: 'uppercase' }}>
          Athletic <span className="mf-accent">Performance.</span>
        </h1>
        <p className="mf-fg-dim" style={{ marginTop: 12, maxWidth: 560 }}>
          All 21 primitive stubs render below. Actual visuals land in Phase 1.
          This route 404s in production.
        </p>

        <Section eyebrow="01 / STUB RENDER" title="Every primitive mounts">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
            {STUBS.map(([name, node]) => (
              <div key={name} className="mf-card" style={{ padding: 16 }}>
                <div className="mf-eyebrow" style={{ marginBottom: 8 }}>{name}</div>
                {node}
              </div>
            ))}

            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>Scoreboard</div>
              <Scoreboard label="BENCH" value="230" unit="LB × 1" size={56} accent />
            </div>
            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>StatCard</div>
              <StatCard label="ADHERENCE" value="94" unit="%" delta="+3%" accent />
            </div>
            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>MacroRing</div>
              <MacroRing label="PROTEIN" value={148} target="200G" pct={74} />
            </div>
            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>CalRing</div>
              <CalRing eaten={1842} target={2680} burn={412} />
            </div>
            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>LineChart</div>
              <LineChart data={[185, 195, 205, 215, 225, 230]} />
            </div>
            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>BarChart</div>
              <BarChart data={[8, 9, 10, 11, 12, 14]} />
            </div>
            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>Heatmap</div>
              <Heatmap cells={[[0.4, 0.8, 0.2], [0.9, 0.3, 0.7]]} />
            </div>
            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>BottomTabs</div>
              <BottomTabs active="today" />
            </div>
            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>DesktopShell</div>
              <DesktopShell role="trainer" active="roster" title="Roster" />
            </div>
            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>Section</div>
              <Section eyebrow="EYEBROW" title="TITLE" />
            </div>
          </div>
        </Section>

        <Section eyebrow="02 / TOKENS" title="Color surfaces">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginTop: 16 }}>
            {(['mf-bg', 'mf-s1', 'mf-s2', 'mf-s3'] as const).map((k) => (
              <div key={k} className={`mf-card ${k}`} style={{ height: 72 }} />
            ))}
            <div className="mf-card mf-bg-accent" style={{ height: 72 }} />
          </div>
        </Section>
      </div>
    </div>
  );
}
