import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Play,
  Plus,
  Settings,
  Dumbbell,
  Home,
  Calendar,
  BarChart3,
  MessageSquare,
  User,
  Flame,
  Trophy,
  Target,
  Timer,
  Bell,
  Zap,
  LogOut,
  Shield,
  CreditCard,
  Apple,
  Sun,
  Moon,
  Eye,
  Edit,
  Video,
  Paperclip,
  Send,
  Search,
  Filter,
  Users,
  Layers,
  Grid2x2,
  Check,
  X,
  TrendingUp,
  ChevronRight,
  Heart,
  Star,
  Clock,
  RotateCw,
  type LucideIcon,
} from 'lucide-react';
import {
  StatusDot,
  Avatar,
  Chip,
  Ring,
  Bar,
  Btn,
  StatCard,
  Scoreboard,
  LineChart,
  BarChart,
  Heatmap,
  MacroRing,
  CalRing,
  Placeholder,
  AthletePh,
  SrcPill,
  BottomTabs,
} from '@/components/ui/mf';
import TogglesClient from './toggles-client';

export const metadata = { title: 'v4 · Design System' };

// Demo data mirroring the handoff's MF_DATA
const BENCH_SERIES = [185, 195, 200, 205, 205, 215, 215, 220, 220, 225, 225, 230];
const VOLUME_SERIES = [8420, 9150, 9800, 10240, 11020, 10800, 11400, 12180, 12600, 13100];
const ADHERENCE_SERIES = [88, 89, 90, 91, 92, 93, 94, 94, 94, 94];
const WEEK_LABELS = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);

// Deterministic heatmap so SSR and CSR agree
function genHeatmap(): number[][] {
  const rows = 7;
  const cols = 12;
  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      if (r === 2 || r === 6) {
        row.push(0);
      } else {
        const seed = (r * 37 + c * 91 + 7) % 100;
        row.push(0.3 + (seed / 100) * 0.7);
      }
    }
    grid.push(row);
  }
  return grid;
}

function DSSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div className="flex items-end justify-between" style={{ marginBottom: 20 }}>
        <div>
          <div className="mf-eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>
          <div
            className="mf-font-display"
            style={{ fontSize: 28, letterSpacing: '-0.01em', textTransform: 'uppercase' }}
          >
            {title}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Swatch({
  name,
  token,
  val,
  bg,
  inkLight,
}: {
  name: string;
  token: string;
  val: string;
  bg: string;
  inkLight?: boolean;
}) {
  return (
    <div className="mf-card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          background: bg,
          height: 72,
          display: 'flex',
          alignItems: 'flex-end',
          padding: 10,
          color: inkLight ? '#fff' : '#0A0A0B',
        }}
      >
        <span
          className="mf-font-mono"
          style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}
        >
          {val}
        </span>
      </div>
      <div className="px-3 py-2" style={{ borderTop: '1px solid var(--mf-hairline)' }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{name}</div>
        <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>{token}</div>
      </div>
    </div>
  );
}

const ICONS: Array<[string, LucideIcon]> = [
  ['Dumbbell', Dumbbell], ['Home', Home], ['Calendar', Calendar], ['BarChart3', BarChart3],
  ['MessageSquare', MessageSquare], ['User', User], ['Settings', Settings], ['Play', Play],
  ['Plus', Plus], ['Check', Check], ['X', X], ['ArrowRight', ArrowRight], ['TrendingUp', TrendingUp],
  ['ChevronRight', ChevronRight], ['Search', Search], ['Bell', Bell], ['Flame', Flame],
  ['Trophy', Trophy], ['Target', Target], ['Timer', Timer], ['Zap', Zap], ['LogOut', LogOut],
  ['Moon', Moon], ['Sun', Sun], ['Grid', Grid2x2], ['Shield', Shield], ['CreditCard', CreditCard],
  ['Apple', Apple], ['Send', Send], ['Paperclip', Paperclip], ['Edit', Edit], ['Eye', Eye],
  ['Heart', Heart], ['Video', Video], ['Filter', Filter], ['Users', Users], ['Layers', Layers],
  ['Star', Star], ['Clock', Clock], ['Rotate', RotateCw],
];

const TYPE_SCALE: Array<[string, number, string, string, 'display' | 'sans' | 'mono']> = [
  ['Display 56', 56, 'Upper / Push', 'Oswald 600', 'display'],
  ['Display 32', 32, "Today's Session", 'Oswald 600', 'display'],
  ['H1 24', 24, 'Jordan Reyes', 'Geist 600', 'sans'],
  ['Body 14', 14, 'Keep pause tempo on row. Focus on scap retraction.', 'Geist 400', 'sans'],
  ['Small 12', 12, 'RPE 8 · 225 × 5 · 3 of 4', 'Geist 500', 'sans'],
  ['Mono 10', 10, 'WK 08 / 12 · 14,280 LB', 'JetBrains Mono 500', 'mono'],
];

const SPACING: Array<[string, string]> = [
  ['4', '0.25rem'], ['8', '0.5rem'], ['12', '0.75rem'], ['16', '1rem'],
  ['24', '1.5rem'], ['32', '2rem'], ['48', '3rem'], ['64', '4rem'],
];

const RADII: Array<[string, string]> = [
  ['0', '0'],
  ['4', 'sm'],
  ['6', 'md · default'],
  ['8', 'lg · cards'],
];

const HAIRLINES: Array<[string, string]> = [
  ['var(--mf-hairline)', 'Subtle'],
  ['var(--mf-hairline-strong)', 'Strong'],
  ['var(--mf-accent)', 'Accent'],
];

const NOTES: Array<[string, string]> = [
  ['WHY THIS PALETTE', 'Near-black base (#0A0A0B) gives depth without looking "dashboard grey." Electric orange stays reserved for primary CTAs, active logging, and PRs. Semantic colors appear only on status chips — never as backgrounds.'],
  ['WHY THIS TYPE', 'Oswald is the scoreboard face — condensed, high x-height, built for numbers at scale. Geist for body — neo-grotesque precision without Inter ubiquity. JetBrains Mono for metadata. Three faces, clear roles.'],
  ['WHY SHARP EDGES', '6px default radius, 4px on small elements. Thin hairlines over drop shadows. Soft cards read as "wellness." Crisp cards read as "equipment." We want the latter.'],
  ['WHY MOTION IS TAUT', '80–200ms transitions. No spring overshoots, no confetti. Set completion pulses once. Rest timer counts down hard. If an interaction takes >300ms to feel done, we cut it.'],
];

export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const heatmap = genHeatmap();

  return (
    <div data-mf className="mf-bg mf-fg" style={{ minHeight: '100vh' }}>
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>DESIGN SYSTEM · V4</div>
          <div
            className="mf-font-display"
            style={{
              fontSize: 64,
              lineHeight: 0.95,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
            }}
          >
            Athletic<br />
            <span className="mf-accent">performance.</span>
          </div>
          <p className="mf-fg-dim" style={{ marginTop: 16, maxWidth: 560, lineHeight: 1.6 }}>
            The visual system for RepLab. Dark by default, scoreboard-first typography,
            one acidic accent. Every component below is used in production screens.
          </p>
        </div>

        {/* 01 / COLOR */}
        <DSSection eyebrow="01 / COLOR" title="Tokens">
          <div className="mf-eyebrow" style={{ marginBottom: 12 }}>SURFACES</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 8,
              marginBottom: 24,
            }}
          >
            <Swatch name="Base"       token="--mf-bg"          val="var(--mf-bg)"          bg="var(--mf-bg)"          inkLight />
            <Swatch name="Surface 1"  token="--mf-surface-1"   val="var(--mf-surface-1)"   bg="var(--mf-surface-1)"   inkLight />
            <Swatch name="Surface 2"  token="--mf-surface-2"   val="var(--mf-surface-2)"   bg="var(--mf-surface-2)"   inkLight />
            <Swatch name="Surface 3"  token="--mf-surface-3"   val="var(--mf-surface-3)"   bg="var(--mf-surface-3)"   inkLight />
            <Swatch name="Hairline"   token="--mf-hairline"    val="var(--mf-hairline)"    bg="var(--mf-hairline)"    inkLight />
            <Swatch name="Foreground" token="--mf-fg"          val="var(--mf-fg)"          bg="var(--mf-fg)" />
          </div>

          <div className="mf-eyebrow" style={{ marginBottom: 12 }}>ACCENT + SEMANTIC</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            <Swatch name="Accent"      token="--mf-accent"   val="#FF4D1C" bg="var(--mf-accent)" />
            <Swatch name="Green · OK"  token="--mf-green"    val="#2BD985" bg="var(--mf-green)" />
            <Swatch name="Amber · Warn" token="--mf-amber"   val="#F5B544" bg="var(--mf-amber)" />
            <Swatch name="Red · Error" token="--mf-red"      val="#FF4D5E" bg="var(--mf-red)" />
            <Swatch name="Blue · Info" token="--mf-blue"     val="#4D9EFF" bg="var(--mf-blue)" />
            <Swatch name="FG Mute"     token="--mf-fg-mute"  val="#6E6E76" bg="var(--mf-fg-mute)" inkLight />
          </div>
        </DSSection>

        {/* 02 / TYPE */}
        <DSSection eyebrow="02 / TYPE" title="Scale">
          <div
            className="mf-card"
            style={{
              padding: 24,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 16,
              alignItems: 'baseline',
            }}
          >
            <div>
              <div
                className="mf-font-display"
                style={{
                  fontSize: 96,
                  lineHeight: 0.9,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                }}
              >
                225 LB
              </div>
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 10, marginTop: 8 }}
              >
                DISPLAY 96 · OSWALD 600 · SCOREBOARD
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mf-eyebrow">PRIMARY / NUMERIC</div>
              <div
                className="mf-font-mono mf-fg-dim"
                style={{ fontSize: 12, marginTop: 4 }}
              >
                OSWALD 300–700
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              marginTop: 8,
            }}
          >
            {TYPE_SCALE.map(([label, size, sample, meta, kind]) => (
              <div key={label} className="mf-card" style={{ padding: 16 }}>
                <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                  {label.toUpperCase()} · {meta.toUpperCase()}
                </div>
                <div
                  className={
                    kind === 'display' ? 'mf-font-display' :
                    kind === 'mono'    ? 'mf-font-mono' : ''
                  }
                  style={{
                    fontSize: size,
                    lineHeight: 1.1,
                    letterSpacing: kind === 'display' ? '-0.01em' : 'normal',
                  }}
                >
                  {sample}
                </div>
              </div>
            ))}
          </div>
        </DSSection>

        {/* 03 / SPACING & RADIUS */}
        <DSSection eyebrow="03 / SPACING & RADIUS" title="Grid">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div className="mf-card" style={{ padding: 24 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 16 }}>SPACING · 4PX BASE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SPACING.map(([p, r]) => (
                  <div key={p} className="flex items-center gap-3">
                    <div
                      className="mf-font-mono mf-fg-mute mf-tnum"
                      style={{ fontSize: 11, width: 32 }}
                    >
                      {p}
                    </div>
                    <div
                      style={{
                        height: 12,
                        width: `${parseInt(p, 10) * 2}px`,
                        background: 'var(--mf-accent)',
                        borderRadius: 2,
                      }}
                    />
                    <div className="mf-font-mono mf-fg-dim" style={{ fontSize: 10 }}>
                      {r}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mf-card" style={{ padding: 24 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 16 }}>RADIUS · SHARP</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {RADII.map(([r, n]) => (
                  <div key={r} style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        background: 'var(--mf-accent)',
                        height: 56,
                        borderRadius: `${r}px`,
                        marginBottom: 6,
                      }}
                    />
                    <div className="mf-font-mono" style={{ fontSize: 11 }}>{r}px</div>
                    <div className="mf-fg-mute" style={{ fontSize: 10 }}>{n}</div>
                  </div>
                ))}
              </div>

              <div className="mf-eyebrow" style={{ marginTop: 24, marginBottom: 12 }}>HAIRLINES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {HAIRLINES.map(([c, n]) => (
                  <div key={n} className="flex items-center gap-3">
                    <div style={{ height: 1, flex: 1, background: c }} />
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10, width: 64 }}
                    >
                      {n.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DSSection>

        {/* 04 / COMPONENTS */}
        <DSSection eyebrow="04 / COMPONENTS" title="Core">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div className="mf-card" style={{ padding: 20 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 12 }}>BUTTONS</div>
              <div className="flex flex-wrap gap-2" style={{ marginBottom: 12 }}>
                <Btn variant="primary" icon={ArrowRight}>Primary</Btn>
                <Btn>Secondary</Btn>
                <Btn variant="ghost">Ghost</Btn>
                <Btn variant="primary" disabled>Disabled</Btn>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn variant="primary" icon={Play}>Start session</Btn>
                <Btn icon={Plus}>Add</Btn>
                <Btn variant="ghost" icon={Settings} aria-label="Settings" />
              </div>
            </div>

            <div className="mf-card" style={{ padding: 20 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 12 }}>CHIPS + STATUS</div>
              <div className="flex flex-wrap gap-2" style={{ marginBottom: 12 }}>
                <Chip>DEFAULT</Chip>
                <Chip kind="live">LIVE</Chip>
                <Chip kind="ok">ADHERENCE 94%</Chip>
                <Chip kind="warn">RPE 9</Chip>
                <Chip kind="bad">PAYMENT FAILED</Chip>
              </div>
              <div className="flex items-center gap-4">
                {(['active', 'behind', 'new', 'paused'] as const).map((k) => (
                  <div key={k} className="flex items-center gap-2">
                    <StatusDot kind={k} />
                    <span
                      className="mf-font-mono mf-fg-dim"
                      style={{
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {k}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mf-card" style={{ padding: 20 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 12 }}>INPUTS</div>
              <input className="mf-input" placeholder="Placeholder" style={{ marginBottom: 8 }} />
              <input
                className="mf-input"
                defaultValue="With value"
                style={{ marginBottom: 12 }}
              />
              <TogglesClient />
            </div>

            <div className="mf-card" style={{ padding: 20 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 12 }}>IDENTITY + PROGRESS</div>
              <div className="flex items-center gap-4" style={{ marginBottom: 16 }}>
                <Avatar initials="JR" />
                <Avatar initials="BM" active />
                <Avatar initials="PR" size={40} />
                <Avatar initials="HW" size={56} />
              </div>
              <div className="flex items-center gap-4">
                <Ring pct={94} />
                <Ring pct={62} />
                <Ring pct={18} />
                <div style={{ flex: 1 }}>
                  <Bar pct={72} accent />
                </div>
              </div>
            </div>

            <div className="mf-card" style={{ padding: 20 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 12 }}>STAT CARDS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                <StatCard
                  label="BENCH 1RM"
                  value="230"
                  unit="LB"
                  delta="+5"
                  accent
                  sparkData={BENCH_SERIES}
                />
                <StatCard
                  label="ADHERENCE"
                  value="94"
                  unit="%"
                  delta="+3%"
                  sparkData={ADHERENCE_SERIES}
                />
              </div>
            </div>

            <div className="mf-card" style={{ padding: 20 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 12 }}>SCOREBOARD NUMERIC</div>
              <div className="flex items-baseline gap-4">
                <Scoreboard label="BENCH" value="230" unit="LB × 1" delta="+5 LB" accent size={64} />
                <Scoreboard label="VOLUME" value="14.2K" unit="LB" delta="▲ 6%" size={48} />
                <Scoreboard label="STREAK" value="21" unit="DAYS" size={48} />
              </div>
            </div>
          </div>
        </DSSection>

        {/* 05 / DATA VIZ */}
        <DSSection eyebrow="05 / DATA VIZ" title="Charts">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div className="mf-card" style={{ padding: 20 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>LINE · ACCENT</div>
              <LineChart data={BENCH_SERIES} labels={WEEK_LABELS} />
            </div>
            <div className="mf-card" style={{ padding: 20 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>BAR · VOLUME</div>
              <BarChart
                data={VOLUME_SERIES}
                labels={Array.from({ length: 10 }, (_, i) => `W${i + 1}`)}
                accent
              />
            </div>
            <div className="mf-card" style={{ padding: 20 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>HEATMAP · ADHERENCE</div>
              <Heatmap cells={heatmap} />
            </div>
            <div className="mf-card" style={{ padding: 20 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>PR BADGE + RING</div>
              <div className="flex items-center gap-6">
                <div style={{ textAlign: 'center' }}>
                  <Ring pct={94} size={96} stroke={6} />
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 10, marginTop: 8 }}
                  >
                    ADHERENCE
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                    <Chip kind="live">NEW PR</Chip>
                  </div>
                  <div
                    className="mf-font-display mf-tnum mf-accent"
                    style={{ fontSize: 40, lineHeight: 1 }}
                  >
                    230
                  </div>
                  <div className="mf-font-display" style={{ fontSize: 14, marginTop: 4 }}>
                    LB × 1 · BENCH
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 10, marginTop: 4 }}
                  >
                    ▲ +5 LB · 04.11
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DSSection>

        {/* 06 / NUTRITION */}
        <DSSection eyebrow="06 / NUTRITION" title="Food primitives">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div className="mf-card" style={{ padding: 20 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 12 }}>CAL RING · DAILY</div>
              <CalRing eaten={1842} target={2680} burn={412} />
            </div>
            <div className="mf-card" style={{ padding: 20 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 12 }}>MACRO RINGS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <MacroRing pct={74} color="#FF4D1C" label="PROTEIN" value={148} target="200G" />
                <MacroRing pct={68} color="#4D9EFF" label="CARBS"   value={198} target="290G" />
                <MacroRing pct={69} color="#F5B544" label="FAT"     value={54}  target="78G" />
              </div>
            </div>
          </div>
          <div className="mf-card" style={{ padding: 20 }}>
            <div className="mf-eyebrow" style={{ marginBottom: 12 }}>FOOD SOURCE PILLS</div>
            <div className="flex flex-wrap gap-3 items-center">
              <SrcPill src="usda" />
              <SrcPill src="local" />
              <SrcPill src="community" barcode="850006249121" />
              <SrcPill src="openfoodfacts" barcode="857777004058" />
              <SrcPill src="custom" />
            </div>
          </div>
        </DSSection>

        {/* 07 / PLACEHOLDERS */}
        <DSSection eyebrow="07 / IMAGERY" title="Placeholders">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>GRIDDED IMG</div>
              <Placeholder label="HERO 16/9" />
            </div>
            <div>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>DUOTONE ATHLETE</div>
              <AthletePh label="HEAVY // FOCUSED" h={180} />
            </div>
            <div>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>SQUARE</div>
              <Placeholder label="AVATAR" aspect="1/1" />
            </div>
          </div>
        </DSSection>

        {/* 08 / ICONOGRAPHY */}
        <DSSection eyebrow="08 / ICONOGRAPHY" title="Lucide · 1.75 stroke">
          <div
            className="mf-card"
            style={{
              padding: 24,
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: 16,
            }}
          >
            {ICONS.map(([name, Ic]) => (
              <div key={name} className="flex flex-col items-center gap-1.5">
                <div
                  className="mf-card grid place-items-center"
                  style={{ width: 40, height: 40 }}
                >
                  <Ic size={18} />
                </div>
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{
                    fontSize: 9,
                    textAlign: 'center',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </DSSection>

        {/* 09 / MOBILE CHROME */}
        <DSSection eyebrow="09 / MOBILE CHROME" title="Bottom tabs">
          <div className="mf-card" style={{ padding: 0, overflow: 'hidden', maxWidth: 390 }}>
            <BottomTabs active="today" />
          </div>
          <div
            className="mf-font-mono mf-fg-mute"
            style={{ fontSize: 10, marginTop: 8, letterSpacing: '0.1em' }}
          >
            ACTIVE STATE = ACCENT · 6 TABS · SAFE-AREA PADDING
          </div>
        </DSSection>

        {/* 10 / NOTES */}
        <DSSection eyebrow="10 / NOTES" title="Rationale">
          <div
            className="mf-card"
            style={{
              padding: 24,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 24,
              lineHeight: 1.6,
            }}
          >
            {NOTES.map(([title, body]) => (
              <div key={title}>
                <div
                  className="mf-font-mono mf-fg"
                  style={{
                    fontSize: 12,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {title}
                </div>
                <p className="mf-fg-dim" style={{ fontSize: 14 }}>{body}</p>
              </div>
            ))}
          </div>
        </DSSection>
      </div>
    </div>
  );
}
