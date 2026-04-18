'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Play,
  Dumbbell,
  Layers,
  BarChart3,
  MessageSquare,
  Flame,
  CreditCard,
  Check,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, Btn, Chip, LineChart, PublicTopNav } from '@/components/ui/mf';

const BENCH_SERIES = [185, 195, 200, 205, 205, 215, 215, 220, 220, 225, 225, 230];
const WEEK_LABELS = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);

interface Feature {
  n: string;
  t: string;
  d: string;
  icon: LucideIcon;
}

const FEATURES: Feature[] = [
  {
    n: '01',
    t: 'Active Workout, one-handed',
    d: 'Swipe-to-complete sets, pre-filled from last session, RPE picker on the bar. Works with lifting gloves on. Rest timer auto-starts.',
    icon: Dumbbell,
  },
  {
    n: '02',
    t: 'Program Builder',
    d: 'Drag weeks, clone days, swap exercises. Template library with 400+ vetted blocks. Assign to one athlete or a whole roster.',
    icon: Layers,
  },
  {
    n: '03',
    t: 'Scoreboard Analytics',
    d: 'Volume, tonnage, e1RM, PR timeline. Heatmap adherence. See exactly where an athlete is stalling and why.',
    icon: BarChart3,
  },
  {
    n: '04',
    t: 'Coach Messaging',
    d: 'Thread per athlete, video form-checks, voice notes. RPE context surfaces right in the chat — no more "which squat set?"',
    icon: MessageSquare,
  },
  {
    n: '05',
    t: 'Adherence Engine',
    d: "Auto-flags athletes going dark. Suggests loads when they miss sessions. Trainer can sleep on Sunday.",
    icon: Flame,
  },
  {
    n: '06',
    t: 'Billing + Invite Codes',
    d: 'Stripe-backed. Invite by code, tier by plan, dunning handled. One less app.',
    icon: CreditCard,
  },
];

const TESTIMONIALS: Array<{ q: string; by: string; title: string; i: string }> = [
  {
    q: '"I used to coach 12 athletes on three apps and a spreadsheet. Now it\'s one. I got my Sundays back."',
    by: 'Brent Martinez',
    title: 'Head Coach · Atlas 559',
    i: 'BM',
  },
  {
    q: '"The logging is so fast I actually log. That\'s not a thing I can say about the last four apps."',
    by: 'Harper Whitfield',
    title: 'Powerlifting · 275 bench',
    i: 'HW',
  },
  {
    q: '"The first platform that treats data like a first-class citizen. Charts that a strength coach would actually build."',
    by: 'Dr. Priya Ramachandran',
    title: 'S&C PhD · Stanford',
    i: 'PR',
  },
];

const PLANS: Array<{
  n: string;
  p: number | string;
  pts: string[];
  cta: string;
  href: string;
  featured?: boolean;
}> = [
  {
    n: 'Self-led',
    p: 49,
    pts: ['Full active-workout logging', 'Progress analytics', 'Exercise library', 'Community support'],
    cta: 'Start free',
    href: '/contact',
  },
  {
    n: 'Coached',
    p: 249,
    pts: [
      'Everything in Self-led',
      '1:1 coach + programming',
      'Unlimited messaging',
      'Video form-checks',
      'Monthly check-in call',
    ],
    cta: 'Get matched',
    href: '/contact',
    featured: true,
  },
  {
    n: 'Team',
    p: 'Custom',
    pts: [
      'Everything in Coached',
      'Multi-coach roster',
      'White-label branding',
      'SSO + API',
      'Priority support',
    ],
    cta: 'Talk to us',
    href: '/contact',
  },
];

function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center shrink-0"
      style={{ width: size, height: size, background: 'var(--mf-accent)', borderRadius: 4 }}
    >
      <svg
        width={size * 0.57}
        height={size * 0.57}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0A0A0B"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6.5 6.5 17.5 17.5" />
        <path d="m7 13-2 2 3 3 2-2" />
        <path d="m17 11 2-2-3-3-2 2" />
      </svg>
    </div>
  );
}

export default function MarketingLanding() {
  const params = useSearchParams();
  const initialTab = params?.get('as') === 'client' ? 'client' : 'trainer';
  const [tab, setTab] = useState<'trainer' | 'client'>(initialTab);

  // Keep tab in sync if URL changes (e.g., nav click while already on /)
  useEffect(() => {
    const asParam = params?.get('as');
    if (asParam === 'client' || asParam === 'trainer') {
      setTab(asParam);
    }
  }, [params]);

  return (
    <div data-mf className="mf-bg mf-fg" style={{ minHeight: '100vh' }}>
      <PublicTopNav />


      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="relative mf-grid-bg">
        <div className="max-w-[1200px] mx-auto px-6 relative" style={{ paddingTop: 80, paddingBottom: 80 }}>
          <div className="grid md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-7">
              <div className="mf-eyebrow flex items-center gap-2" style={{ marginBottom: 20 }}>
                <span
                  className="mf-pulse"
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--mf-accent)',
                    display: 'inline-block',
                  }}
                />
                V4 · NOW LIVE
              </div>
              <h1
                className="mf-font-display"
                style={{
                  fontSize: 'clamp(48px, 8vw, 104px)',
                  lineHeight: 0.92,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Train like
                <br />
                <span className="mf-accent">the data</span>
                <br />
                is watching.
              </h1>
              <p
                className="mf-fg-dim"
                style={{ marginTop: 24, fontSize: 18, lineHeight: 1.6, maxWidth: 520 }}
              >
                Built for serious trainers and the athletes who work with them. Program the
                cycle, log the set, own the progression — all in one platform that actually
                knows the difference between RPE 7 and RPE 9.
              </p>
              <div className="flex flex-wrap items-center gap-3" style={{ marginTop: 32 }}>
                <Link href="/auth/signup">
                  <Btn variant="primary" icon={ArrowRight} style={{ height: 48, padding: '0 24px' }}>
                    Start 14-day trial
                  </Btn>
                </Link>
                <Link href="/auth/signin">
                  <Btn icon={Play} style={{ height: 48, padding: '0 24px' }}>
                    See the app
                  </Btn>
                </Link>
              </div>
              <div className="flex items-center gap-6 mf-fg-mute" style={{ marginTop: 40, fontSize: 12 }}>
                <div>
                  <div className="mf-font-display mf-tnum mf-fg" style={{ fontSize: 28 }}>1,284</div>
                  <div className="mf-eyebrow" style={{ marginTop: 4 }}>Active athletes</div>
                </div>
                <div className="mf-vr" style={{ height: 32 }} />
                <div>
                  <div className="mf-font-display mf-tnum mf-fg" style={{ fontSize: 28 }}>
                    94<span className="mf-fg-mute">%</span>
                  </div>
                  <div className="mf-eyebrow" style={{ marginTop: 4 }}>Avg adherence</div>
                </div>
                <div className="mf-vr" style={{ height: 32 }} />
                <div>
                  <div className="mf-font-display mf-tnum mf-fg" style={{ fontSize: 28 }}>
                    4.9<span className="mf-fg-mute">/5</span>
                  </div>
                  <div className="mf-eyebrow" style={{ marginTop: 4 }}>App store</div>
                </div>
              </div>
            </div>

            {/* Hero preview card */}
            <div className="md:col-span-5 relative">
              <div
                className="mf-card-elev"
                style={{ padding: 20, boxShadow: '0 40px 80px -40px rgba(0,0,0,0.6)' }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                  <div>
                    <div className="mf-eyebrow">Today / Upper Push</div>
                    <div
                      className="mf-font-display"
                      style={{ fontSize: 22, lineHeight: 1.1, marginTop: 2 }}
                    >
                      JORDAN REYES · WK 08
                    </div>
                  </div>
                  <Chip kind="live">LIVE · SET 3/4</Chip>
                </div>
                <div className="flex items-baseline gap-3" style={{ marginBottom: 12 }}>
                  <span
                    className="mf-font-display mf-tnum mf-accent"
                    style={{ fontSize: 82, lineHeight: 0.9 }}
                  >
                    225
                  </span>
                  <div>
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    >
                      Target
                    </div>
                    <div className="mf-font-display" style={{ fontSize: 20 }}>LB × 5</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2" style={{ marginBottom: 16 }}>
                  {[1, 2, 3, 4].map((n) => {
                    const done = n <= 3;
                    return (
                      <div
                        key={n}
                        className="mf-card text-center"
                        style={{
                          padding: 8,
                          borderColor: done ? 'var(--mf-accent)' : undefined,
                          background: done ? 'rgba(255,77,28,0.08)' : undefined,
                          opacity: done ? 1 : 0.5,
                        }}
                      >
                        <div className="mf-eyebrow">SET {n}</div>
                        <div className="mf-font-display mf-tnum" style={{ fontSize: 18 }}>
                          {done ? '225×5' : '—'}
                        </div>
                        <div
                          className="mf-font-mono mf-fg-mute"
                          style={{ fontSize: 9 }}
                        >
                          {n === 1 ? 'RPE 7' : n === 2 ? 'RPE 8' : n === 3 ? 'RPE 8.5' : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <LineChart data={BENCH_SERIES} labels={WEEK_LABELS} h={120} />
                <div
                  className="flex items-center justify-between mf-font-mono mf-fg-mute"
                  style={{ marginTop: 8, fontSize: 11 }}
                >
                  <span>BENCH · 12 WK</span>
                  <span style={{ color: 'var(--mf-green)' }}>▲ +45 LB</span>
                </div>
              </div>

              {/* Floating PR badge */}
              <div
                className="mf-card-elev flex items-center gap-3"
                style={{
                  position: 'absolute',
                  bottom: -24,
                  left: 'clamp(-32px, -4vw, 8px)',
                  padding: 12,
                  boxShadow: '0 20px 40px -20px rgba(0,0,0,0.5)',
                }}
              >
                <div
                  className="grid place-items-center"
                  style={{ width: 36, height: 36, background: 'var(--mf-accent)', borderRadius: 4 }}
                >
                  <Trophy size={18} style={{ color: '#0A0A0B' }} />
                </div>
                <div>
                  <div className="mf-eyebrow">NEW PR</div>
                  <div className="mf-font-display" style={{ fontSize: 15 }}>230 LB × 1 · BENCH</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trusted by strip ───────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--mf-hairline)', borderBottom: '1px solid var(--mf-hairline)', padding: '24px 0' }}>
        <div className="max-w-[1200px] mx-auto px-6 flex flex-wrap items-center justify-between gap-6">
          <div className="mf-eyebrow">TRUSTED BY SERIOUS GYMS</div>
          <div
            className="flex items-center gap-8 flex-wrap mf-font-display mf-fg-mute"
            style={{ fontSize: 18, letterSpacing: '0.08em' }}
          >
            {['RIPFIT PDX', 'BARBELL COOP', 'STRONGHOLD SF', 'NORTHSTAR ATH', 'IRON CRAFT', 'ATLAS 559'].map((g) => (
              <span key={g}>{g}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────── */}
      <div id="platform" className="max-w-[1200px] mx-auto px-6" style={{ paddingTop: 96, paddingBottom: 96 }}>
        <div className="grid md:grid-cols-12 gap-8" style={{ marginBottom: 48 }}>
          <div className="md:col-span-5">
            <div className="mf-eyebrow" style={{ marginBottom: 12 }}>01 / PLATFORM</div>
            <h2
              className="mf-font-display"
              style={{
                fontSize: 56,
                lineHeight: 0.95,
                letterSpacing: '-0.01em',
                textTransform: 'uppercase',
              }}
            >
              Built for
              <br />
              the set that matters.
            </h2>
          </div>
          <div className="md:col-span-6 md:col-start-7 mf-fg-dim" style={{ paddingTop: 12, lineHeight: 1.6 }}>
            We stripped out every wellness-app trope and rebuilt around one idea: the screen
            you stare at between sets should make the next set better. Everything else — the
            program, the progression, the messaging — feeds that moment.
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.n} className="mf-card transition-colors" style={{ padding: 24 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
                  <Icon size={22} className="mf-accent" />
                  <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 11 }}>{f.n}</span>
                </div>
                <div
                  className="mf-font-display"
                  style={{
                    fontSize: 20,
                    letterSpacing: '-0.01em',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                  }}
                >
                  {f.t}
                </div>
                <div className="mf-fg-dim" style={{ fontSize: 14, lineHeight: 1.6 }}>{f.d}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Role split ─────────────────────────────────────── */}
      <div id="role-split" style={{ borderTop: '1px solid var(--mf-hairline)', scrollMarginTop: 80 }}>
        <div className="max-w-[1200px] mx-auto px-6" style={{ paddingTop: 96, paddingBottom: 96 }}>
          <div className="flex items-end justify-between" style={{ marginBottom: 32 }}>
            <div>
              <div className="mf-eyebrow" style={{ marginBottom: 12 }}>02 / ROLE SPLIT</div>
              <h2
                className="mf-font-display"
                style={{
                  fontSize: 48,
                  lineHeight: 0.95,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                }}
              >
                Two apps.
                <br />
                One platform.
              </h2>
            </div>
            <div className="mf-card flex gap-1" style={{ padding: 4 }}>
              {(['trainer', 'client'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="mf-font-mono"
                  style={{
                    padding: '6px 16px',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    borderRadius: 4,
                    background: tab === t ? 'var(--mf-accent)' : 'transparent',
                    color: tab === t ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-6">
              <div
                className="mf-duotone"
                style={{ height: 420, borderRadius: 8, position: 'relative' }}
              >
                <div
                  className="mf-ph-img"
                  style={{ position: 'absolute', inset: 0, borderRadius: 8 }}
                >
                  <span style={{ position: 'relative', zIndex: 2 }}>
                    {tab === 'trainer' ? 'COACH // DESK' : 'ATHLETE // PHONE'}
                  </span>
                </div>
              </div>
            </div>
            <div className="md:col-span-6">
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                {tab === 'trainer' ? 'FOR TRAINERS' : 'FOR CLIENTS'}
              </div>
              <div
                className="mf-font-display"
                style={{
                  fontSize: 32,
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  marginBottom: 24,
                }}
              >
                {tab === 'trainer'
                  ? 'Program ten athletes like one.'
                  : 'Show up. Hit numbers. Repeat.'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(tab === 'trainer'
                  ? [
                      ['Roster at a glance', "See who logged, who PR'd, who's gone dark — all in one view."],
                      ['Templates + variation', 'Pull a template, tweak one exercise, assign. 90 seconds.'],
                      ['Notes that travel', 'Form cues saved on the exercise follow your athlete forever.'],
                      ['One inbox', 'Every athlete thread in one place with logging context inline.'],
                    ]
                  : [
                      ['Today view', 'Your next session, front and center. Start with one tap.'],
                      ['Active logging', 'Swipe, pick RPE, done. No fumbling mid-set.'],
                      ['Progress, honest', 'Real charts. No vanity metrics. You see what your coach sees.'],
                      ['Coach access', 'Message, form-check, adjust — without leaving the app.'],
                    ]
                ).map(([t, d], i) => (
                  <div key={t} className="flex gap-4">
                    <div
                      className="grid place-items-center mf-font-mono mf-fg-dim shrink-0"
                      style={{
                        width: 24,
                        height: 24,
                        border: '1px solid var(--mf-hairline-strong)',
                        borderRadius: 4,
                        fontSize: 10,
                      }}
                    >
                      0{i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{t}</div>
                      <div className="mf-fg-dim" style={{ fontSize: 14 }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/auth/signup" style={{ display: 'inline-block', marginTop: 32 }}>
                <Btn variant="primary" icon={ArrowRight}>
                  Tour the {tab} view
                </Btn>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Testimonials ──────────────────────────────────── */}
      <div className="mf-s1" style={{ borderTop: '1px solid var(--mf-hairline)' }}>
        <div
          className="max-w-[1200px] mx-auto px-6 grid md:grid-cols-3 gap-4"
          style={{ paddingTop: 80, paddingBottom: 80 }}
        >
          {TESTIMONIALS.map((t) => (
            <div key={t.by} className="mf-card" style={{ padding: 24 }}>
              <div
                className="mf-font-display"
                style={{
                  fontSize: 22,
                  lineHeight: 1.1,
                  marginBottom: 24,
                  textTransform: 'uppercase',
                }}
              >
                {t.q}
              </div>
              <div
                className="flex items-center gap-3"
                style={{ borderTop: '1px solid var(--mf-hairline)', paddingTop: 16 }}
              >
                <Avatar initials={t.i} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{t.by}</div>
                  <div className="mf-fg-mute" style={{ fontSize: 12 }}>{t.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pricing ───────────────────────────────────────── */}
      <div id="pricing" className="max-w-[1200px] mx-auto px-6" style={{ paddingTop: 96, paddingBottom: 96, scrollMarginTop: 80 }}>
        <div className="text-center" style={{ marginBottom: 48 }}>
          <div className="mf-eyebrow" style={{ marginBottom: 12 }}>03 / PRICING</div>
          <h2
            className="mf-font-display"
            style={{
              fontSize: 56,
              lineHeight: 0.95,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
            }}
          >
            No tiers for features you need.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((p) => (
            <div
              key={p.n}
              className="mf-card"
              style={{
                padding: 24,
                borderColor: p.featured ? 'var(--mf-accent)' : undefined,
                background: p.featured
                  ? 'linear-gradient(180deg, rgba(255,77,28,0.06), transparent 40%)'
                  : undefined,
              }}
            >
              {p.featured && <Chip kind="live">MOST POPULAR</Chip>}
              <div
                className="mf-font-display"
                style={{ fontSize: 24, marginTop: 12, marginBottom: 4, textTransform: 'uppercase' }}
              >
                {p.n}
              </div>
              <div className="flex items-baseline gap-1" style={{ marginBottom: 24 }}>
                <span
                  className="mf-font-display mf-tnum"
                  style={{ fontSize: 56, lineHeight: 1 }}
                >
                  {typeof p.p === 'number' ? `$${p.p}` : p.p}
                </span>
                {typeof p.p === 'number' && (
                  <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 12 }}>/MO</span>
                )}
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {p.pts.map((pt) => (
                  <li key={pt} className="flex items-start gap-2 mf-fg-dim" style={{ fontSize: 14 }}>
                    <Check size={14} className="mf-accent" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
              <Link href={p.href} style={{ display: 'block' }}>
                <Btn
                  variant={p.featured ? 'primary' : 'default'}
                  className="w-full"
                  style={{ height: 44 }}
                >
                  {p.cta}
                </Btn>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <div className="mf-s1" style={{ borderTop: '1px solid var(--mf-hairline)' }}>
        <div
          className="max-w-[1200px] mx-auto px-6 text-center"
          style={{ paddingTop: 80, paddingBottom: 80 }}
        >
          <h2
            className="mf-font-display"
            style={{
              fontSize: 'clamp(48px, 7vw, 96px)',
              lineHeight: 0.95,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
            }}
          >
            Lift heavier.
            <br />
            <span className="mf-accent">Track everything.</span>
          </h2>
          <div className="flex items-center justify-center gap-3" style={{ marginTop: 32 }}>
            <Link href="/auth/signup">
              <Btn variant="primary" icon={ArrowRight} style={{ height: 48, padding: '0 32px' }}>
                Start 14-day trial
              </Btn>
            </Link>
            <Link href="/auth/signin">
              <Btn style={{ height: 48, padding: '0 32px' }}>See the app</Btn>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--mf-hairline)' }}>
        <div
          className="max-w-[1200px] mx-auto px-6 grid md:grid-cols-4 gap-6 mf-fg-dim"
          style={{ paddingTop: 40, paddingBottom: 40, fontSize: 14 }}
        >
          <div>
            <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
              <BrandMark size={24} />
              <span className="mf-font-display" style={{ fontSize: 16 }}>MARTINEZ/FITNESS</span>
            </div>
            <div className="mf-fg-mute" style={{ fontSize: 12 }}>
              Fresno, CA · Est 2024
              <br />
              martinezfitness559.com
            </div>
          </div>
          <div>
            <div className="mf-eyebrow" style={{ marginBottom: 12 }}>PLATFORM</div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><Link href="/programs">For Trainers</Link></li>
              <li><Link href="/programs">For Athletes</Link></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><Link href="/programs">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <div className="mf-eyebrow" style={{ marginBottom: 12 }}>COMPANY</div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><Link href="/about">About Brent</Link></li>
              <li><Link href="/contact">Careers</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/contact">Press</Link></li>
            </ul>
          </div>
          <div>
            <div className="mf-eyebrow" style={{ marginBottom: 12 }}>LEGAL</div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Terms</li>
              <li>Privacy</li>
              <li>Refunds</li>
              <li>Status</li>
            </ul>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--mf-hairline)' }}>
          <div
            className="max-w-[1200px] mx-auto px-6 flex items-center justify-between mf-font-mono mf-fg-mute"
            style={{
              padding: '16px 24px',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            <div>© 2026 MARTINEZ FITNESS LLC</div>
            <div>V4.2.0 · BUILD 1284</div>
          </div>
        </div>
      </div>
    </div>
  );
}
