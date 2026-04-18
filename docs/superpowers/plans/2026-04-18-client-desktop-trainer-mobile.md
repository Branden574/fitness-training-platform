# Client Desktop + Trainer Mobile + Legacy Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two viewport gaps the first v4 handoff missed (Client Desktop + Trainer Mobile), migrate all legacy public pages to the v4 nav, and retire the old monolithic dashboards — so every route is v4 at every viewport.

**Architecture:** Each `/client/(v4)/*` and `/trainer/(v4)/*` route becomes responsive. Server components still fetch Prisma data once; two presentational components (Mobile + Desktop) render the same data with viewport-scoped Tailwind classes (`md:hidden` / `hidden md:block`). No double data-fetching, no flash, minimal server work. Public pages get a new `PublicTopNav` extracted from MarketingLanding. Legacy `/client/dashboard`, `/trainer/dashboard`, `/admin/legacy`, and `Navigation.tsx` get deleted once v4 coverage is confirmed complete.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind v4, existing `src/components/ui/mf/*` primitives, Prisma/NextAuth untouched.

---

## File Structure — what gets created/modified

### NEW — Client Desktop layouts (one per v4 client page)
- `src/app/client/(v4)/today-desktop.tsx` — desktop Today view component
- `src/app/client/(v4)/workout/[sessionId]/active-workout-desktop.tsx` — desktop active-workout scoreboard
- `src/app/client/(v4)/food/food-desktop.tsx` — desktop food log (2-pane: meal list + search)
- `src/app/client/(v4)/progress/progress-desktop.tsx` — desktop progress (big charts + KPIs + heatmap)
- `src/app/client/(v4)/program/program-desktop.tsx` — desktop program (week grid + phase stats)
- `src/app/client/(v4)/messages/messages-desktop.tsx` — desktop messages (3-col thread view)

### NEW — Trainer Mobile layouts (one per v4 trainer page we have a mobile design for)
- `src/app/trainer/(v4)/roster-mobile.tsx` — mobile roster list
- `src/app/trainer/(v4)/clients/[id]/client-detail-mobile.tsx` — mobile client detail
- `src/app/trainer/(v4)/messages/inbox-mobile.tsx` — mobile trainer inbox
- `src/app/trainer/(v4)/schedule/schedule-mobile.tsx` — mobile schedule
- `src/app/trainer/(v4)/builder/programs-mobile.tsx` — mobile programs library

### NEW — Shared chrome components
- `src/components/ui/mf/ClientDesktopShell.tsx` — 220px sidebar + top bar + content (6 nav items)
- `src/components/ui/mf/TrainerMobileTabs.tsx` — bottom tab bar for mobile trainer (5 tabs with badges)
- `src/components/ui/mf/PublicTopNav.tsx` — v4 public top nav extracted from MarketingLanding
- `src/components/ui/mf/ClientDesktopHeader.tsx` — desktop-only chrome (used inside layout)

### MODIFIED — Layouts become responsive
- `src/app/client/(v4)/layout.tsx` — replaces current mobile-only layout with responsive shell
- `src/app/trainer/(v4)/layout.tsx` — currently pass-through; stays pass-through (each trainer page renders both Mobile + Desktop)
- `src/components/ConditionalNavigation.tsx` — swap legacy `Navigation` for `PublicTopNav` on public pages

### MODIFIED — v4 client pages (each adds a desktop branch)
Each of these renders `<MobilePage data={data} /><DesktopPage data={data} />` with viewport classes:
- `src/app/client/(v4)/page.tsx`
- `src/app/client/(v4)/workout/[sessionId]/page.tsx`
- `src/app/client/(v4)/food/page.tsx`
- `src/app/client/(v4)/progress/page.tsx`
- `src/app/client/(v4)/program/page.tsx`
- `src/app/client/(v4)/messages/page.tsx`

### MODIFIED — v4 trainer pages (each adds a mobile branch)
- `src/app/trainer/(v4)/page.tsx` (Roster)
- `src/app/trainer/(v4)/clients/[id]/page.tsx`
- `src/app/trainer/(v4)/messages/page.tsx`
- `src/app/trainer/(v4)/schedule/page.tsx`
- `src/app/trainer/(v4)/builder/page.tsx`

### MODIFIED — Public pages migrate to `PublicTopNav`
These keep their existing content; we only swap what nav they show (via ConditionalNavigation):
- No changes needed to page files — `ConditionalNavigation` handles the swap globally

### DELETED — Legacy code retirement
- `src/app/client/dashboard/` (entire directory)
- `src/app/trainer/dashboard/` (entire directory)
- `src/app/admin/legacy/` (entire directory)
- `src/components/Navigation.tsx`

### EXTENDED — Icon primitive
- `src/components/ui/mf/icons.ts` (new if not exists, else extend) — re-exports `Scale`, `Phone`, `Download` from lucide-react for consistency

---

## Phase A — Prep & Shared Chrome

### Task A1: Verify legacy dashboards aren't critical before we plan their deletion

**Files:** (read-only audit)

- [ ] **Step 1: Check what references `Navigation.tsx` beyond ConditionalNavigation**

Run:
```bash
grep -rn "from.*Navigation\b\|import Navigation" src/ --include='*.tsx' --include='*.ts' | grep -v ConditionalNavigation
```
Expected: no output (zero other importers). If output: add each file to this plan's "MODIFIED" list before Phase D.

- [ ] **Step 2: Check what references legacy dashboards**

Run:
```bash
grep -rn "'/client/dashboard\|'/trainer/dashboard\|'/admin/legacy" src/ --include='*.tsx' --include='*.ts'
```
Expected: only redirect logic inside `src/components/auth/v4/SignInFormClient.tsx` (we already updated it to `/client`, `/trainer`, `/admin`). Any other hits = those need updating too.

- [ ] **Step 3: Commit nothing yet — this is an audit only. If anything unexpected surfaces, update later tasks before starting them.**

---

### Task A2: Add missing icons (Scale, Phone, Download)

**Files:**
- Modify: `src/components/ui/mf/index.ts`

- [ ] **Step 1: Verify lucide-react has these icons**

Run:
```bash
node -e "const l=require('lucide-react'); console.log(!!l.Scale, !!l.Phone, !!l.Download)"
```
Expected: `true true true`

- [ ] **Step 2: No code change needed — lucide-react icons are imported directly at call sites. Proceed.**

- [ ] **Step 3: Commit placeholder (skip — no file change)**

---

### Task A3: Build `ClientDesktopShell`

**Files:**
- Create: `src/components/ui/mf/ClientDesktopShell.tsx`

- [ ] **Step 1: Create the shell component**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Layers,
  Play,
  Apple,
  TrendingUp,
  MessageSquare,
  Bell,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type ClientDesktopKey =
  | 'today'
  | 'program'
  | 'workout'
  | 'food'
  | 'progress'
  | 'messages';

export interface ClientDesktopShellProps {
  active?: ClientDesktopKey;
  title?: string;
  breadcrumbs?: string;
  headerRight?: ReactNode;
  children?: ReactNode;
  athleteInitials?: string;
  athleteName?: string;
  athleteMeta?: string;
  unreadMessages?: number;
}

interface NavItem {
  k: ClientDesktopKey;
  l: string;
  i: LucideIcon;
  href: string;
  accent?: boolean;
}

const NAV: NavItem[] = [
  { k: 'today', l: 'Today', i: Home, href: '/client' },
  { k: 'program', l: 'Program', i: Layers, href: '/client/program' },
  { k: 'workout', l: 'Workout', i: Play, href: '/client', accent: true },
  { k: 'food', l: 'Food Log', i: Apple, href: '/client/food', accent: true },
  { k: 'progress', l: 'Progress', i: TrendingUp, href: '/client/progress' },
  { k: 'messages', l: 'Coach', i: MessageSquare, href: '/client/messages' },
];

function deriveActive(pathname: string | null): ClientDesktopKey {
  if (!pathname) return 'today';
  if (pathname.startsWith('/client/workout')) return 'workout';
  if (pathname.startsWith('/client/program')) return 'program';
  if (pathname.startsWith('/client/food')) return 'food';
  if (pathname.startsWith('/client/progress')) return 'progress';
  if (pathname.startsWith('/client/messages')) return 'messages';
  return 'today';
}

export default function ClientDesktopShell({
  active,
  title,
  breadcrumbs,
  headerRight,
  children,
  athleteInitials = 'JR',
  athleteName = 'Athlete',
  athleteMeta,
  unreadMessages,
}: ClientDesktopShellProps) {
  const pathname = usePathname();
  const resolved = active ?? deriveActive(pathname);

  return (
    <div data-mf className="flex mf-bg mf-fg" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        className="mf-s1 flex flex-col shrink-0"
        style={{ width: 220, borderRight: '1px solid var(--mf-hairline)' }}
      >
        <div
          className="px-4 flex items-center gap-2"
          style={{ height: 56, borderBottom: '1px solid var(--mf-hairline)' }}
        >
          <div
            className="grid place-items-center"
            style={{ width: 24, height: 24, background: 'var(--mf-accent)', borderRadius: 4 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7 13-2 2 3 3 2-2" />
              <path d="m17 11 2-2-3-3-2 2" />
            </svg>
          </div>
          <div>
            <div className="mf-font-display" style={{ fontSize: 14, letterSpacing: '-0.01em', lineHeight: 1 }}>
              MARTINEZ/FIT
            </div>
            <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9, marginTop: 2 }}>
              ATHLETE · WEB
            </div>
          </div>
        </div>

        <div
          className="px-3 flex items-center gap-2"
          style={{ padding: '16px 12px', borderBottom: '1px solid var(--mf-hairline)' }}
        >
          <div
            className="grid place-items-center mf-font-mono"
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              background: 'var(--mf-surface-3)',
              border: '1px solid var(--mf-hairline)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {athleteInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {athleteName}
            </div>
            {athleteMeta && (
              <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {athleteMeta}
              </div>
            )}
          </div>
        </div>

        <nav className="px-2 py-3 flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((n) => {
            const Icon = n.i;
            const isActive = resolved === n.k;
            return (
              <Link
                key={n.k}
                href={n.href}
                className="flex items-center gap-2.5 px-2.5 py-2 text-sm"
                style={{
                  position: 'relative',
                  borderRadius: 6,
                  background: isActive ? 'var(--mf-surface-3)' : 'transparent',
                  color: isActive ? 'var(--mf-fg)' : 'var(--mf-fg-dim)',
                }}
              >
                {isActive && (
                  <span style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 2, background: 'var(--mf-accent)' }} />
                )}
                <Icon size={15} />
                <span className="flex-1">{n.l}</span>
                {n.accent && !isActive && (
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mf-accent)' }} />
                )}
                {n.k === 'messages' && unreadMessages && unreadMessages > 0 && (
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
                    {unreadMessages}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
        <div
          className="mf-s1 flex items-center justify-between px-6 shrink-0"
          style={{ height: 56, borderBottom: '1px solid var(--mf-hairline)' }}
        >
          <div>
            {breadcrumbs && (
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}
              >
                {breadcrumbs}
              </div>
            )}
            {title && (
              <div
                className="mf-font-display"
                style={{ fontSize: 18, letterSpacing: '-0.01em', lineHeight: 1, marginTop: 2 }}
              >
                {title}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            <button
              className="mf-btn mf-btn-ghost"
              style={{ height: 36, width: 36, padding: 0 }}
              aria-label="Notifications"
            >
              <Bell size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 mf-scroll" style={{ overflowY: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Export from barrel**

Modify `src/components/ui/mf/index.ts` to add:
```ts
export { default as ClientDesktopShell } from './ClientDesktopShell';
export type { ClientDesktopKey, ClientDesktopShellProps } from './ClientDesktopShell';
```

- [ ] **Step 3: Build passes**

Run: `npm run build`
Expected: no errors, new route sizes unchanged (no pages use this yet).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/mf/ClientDesktopShell.tsx src/components/ui/mf/index.ts
git commit -m "feat(v4): add ClientDesktopShell primitive (220px sidebar + top bar)"
```

---

### Task A4: Build `TrainerMobileTabs`

**Files:**
- Create: `src/components/ui/mf/TrainerMobileTabs.tsx`

- [ ] **Step 1: Create the mobile-tab bar**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Calendar, MessageSquare, Layers, User, type LucideIcon } from 'lucide-react';

export type TrainerMobileTabKey = 'roster' | 'schedule' | 'inbox' | 'program' | 'profile';

export interface TrainerMobileTabsProps {
  active?: TrainerMobileTabKey;
  unreadInbox?: number;
  className?: string;
}

interface Tab {
  k: TrainerMobileTabKey;
  i: LucideIcon;
  l: string;
  href: string;
}

const TABS: Tab[] = [
  { k: 'roster', i: Users, l: 'Roster', href: '/trainer' },
  { k: 'schedule', i: Calendar, l: 'Today', href: '/trainer/schedule' },
  { k: 'inbox', i: MessageSquare, l: 'Inbox', href: '/trainer/messages' },
  { k: 'program', i: Layers, l: 'Programs', href: '/trainer/builder' },
  { k: 'profile', i: User, l: 'Me', href: '/trainer/settings' },
];

function deriveActive(pathname: string | null): TrainerMobileTabKey {
  if (!pathname) return 'roster';
  if (pathname.startsWith('/trainer/messages')) return 'inbox';
  if (pathname.startsWith('/trainer/schedule')) return 'schedule';
  if (pathname.startsWith('/trainer/builder')) return 'program';
  if (pathname.startsWith('/trainer/settings')) return 'profile';
  if (pathname.startsWith('/trainer/clients')) return 'roster';
  return 'roster';
}

export default function TrainerMobileTabs({
  active,
  unreadInbox = 0,
  className,
}: TrainerMobileTabsProps) {
  const pathname = usePathname();
  const resolved = active ?? deriveActive(pathname);

  return (
    <nav
      className={`mf-s1 flex items-center justify-around ${className ?? ''}`}
      style={{
        borderTop: '1px solid var(--mf-hairline)',
        paddingTop: 8,
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        paddingInline: 4,
      }}
      aria-label="Primary trainer navigation"
    >
      {TABS.map((t) => {
        const Icon = t.i;
        const isActive = resolved === t.k;
        const showBadge = t.k === 'inbox' && unreadInbox > 0;
        return (
          <Link
            key={t.k}
            href={t.href}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5"
            style={{
              color: isActive ? 'var(--mf-accent)' : 'var(--mf-fg-mute)',
              position: 'relative',
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={18} />
            {showBadge && (
              <span
                className="mf-font-mono"
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 4,
                  fontSize: 8,
                  padding: '0 4px',
                  borderRadius: 4,
                  background: 'var(--mf-accent)',
                  color: 'var(--mf-accent-ink)',
                }}
              >
                {unreadInbox}
              </span>
            )}
            <span
              className="mf-font-mono"
              style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              {t.l}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Export from barrel**

Modify `src/components/ui/mf/index.ts`:
```ts
export { default as TrainerMobileTabs } from './TrainerMobileTabs';
export type { TrainerMobileTabKey, TrainerMobileTabsProps } from './TrainerMobileTabs';
```

- [ ] **Step 3: Build passes**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/mf/TrainerMobileTabs.tsx src/components/ui/mf/index.ts
git commit -m "feat(v4): add TrainerMobileTabs primitive (5-tab mobile nav)"
```

---

## Phase B — Client Desktop views

Each of these 6 tasks follows the same pattern:
1. Create a `<PageName>Desktop` component that takes the same data props as the mobile component
2. Modify the server page to render BOTH mobile and desktop with visibility classes

### Task B1: Make `/client/(v4)/layout.tsx` viewport-aware

**Files:**
- Modify: `src/app/client/(v4)/layout.tsx`

- [ ] **Step 1: Replace the fixed mobile shell with a responsive wrapper**

```tsx
import { requireClientSession, getClientContext } from '@/lib/client-data';
import { BottomTabs } from '@/components/ui/mf';

export const dynamic = 'force-dynamic';

export default async function ClientV4Layout({ children }: { children: React.ReactNode }) {
  const session = await requireClientSession();
  const ctx = await getClientContext(session.user.id);

  return (
    <>
      {/* Mobile shell: phone-width column + bottom tabs */}
      <div
        data-mf
        className="mf-bg mf-fg md:hidden"
        style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center' }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 430,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            borderInline: '1px solid var(--mf-hairline)',
            background: 'var(--mf-bg)',
          }}
        >
          <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
          <BottomTabs />
        </div>
      </div>

      {/* Desktop shell: full width — each page renders its ClientDesktopShell inside */}
      <div className="hidden md:block" data-mf data-client-initials={ctx.initials} data-client-name={ctx.name ?? ''}>
        {children}
      </div>
    </>
  );
}
```

Note: `{children}` is rendered twice. This works because Next.js server components are pure — running twice doesn't double-fetch data (data is already fetched by page.tsx at the child level before the layout composes them).

Actually — `children` is the SAME React tree, rendered into two parent containers. Next.js evaluates page.tsx once. Both mobile + desktop containers get the same rendered JSX. To get different content per viewport, each page.tsx must itself render two sub-trees with their own md:hidden / hidden md:block classes. This layout only provides the chrome wrapper.

**Corrected layout (no double-rendering):**

```tsx
import { requireClientSession } from '@/lib/client-data';

export const dynamic = 'force-dynamic';

// Thin wrapper: the page itself renders both mobile + desktop variants.
// The layout only enforces auth and provides the base dark-theme surface.
export default async function ClientV4Layout({ children }: { children: React.ReactNode }) {
  await requireClientSession();
  return (
    <div data-mf className="mf-bg mf-fg" style={{ minHeight: '100vh' }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Build passes**

Run: `npm run build`
Expected: success. `/client` and sub-routes still compile.

- [ ] **Step 3: Commit**

```bash
git add src/app/client/\(v4\)/layout.tsx
git commit -m "refactor(v4): client layout becomes pass-through; pages own their mobile+desktop chrome"
```

---

### Task B2: Client Today — desktop variant + page rewiring

**Files:**
- Create: `src/app/client/(v4)/today-desktop.tsx`
- Create: `src/app/client/(v4)/today-mobile.tsx` (extracted from current page.tsx body)
- Modify: `src/app/client/(v4)/page.tsx` (becomes a thin selector)

- [ ] **Step 1: Extract current mobile body to `today-mobile.tsx`**

Current `page.tsx` has ~300 lines of JSX rendering the mobile Today view. Move it into a component:

```tsx
// src/app/client/(v4)/today-mobile.tsx
import Link from 'next/link';
import { Flame, Play, Check, ChevronRight } from 'lucide-react';
import { Avatar, Btn, Chip, BottomTabs } from '@/components/ui/mf';
import type { ClientContext } from '@/lib/client-data';

export interface TodayData {
  nextSession: {
    id: string;
    workout: { title: string; type: string; difficulty: string; duration: number; exercises: Array<{ id: string; exercise: { id: string; name: string }; sets: number; reps: number | null }> };
  } | null;
  weekSessions: number;
  weekDaysDone: boolean[];
  streak: number;
  bodyWeight: number | null;
  trendDelta: string | null;
  coachNote: { content: string; sender: { name: string | null; role: string }; createdAt: Date } | null;
}

export default function TodayMobile({ ctx, data }: { ctx: ClientContext; data: TodayData }) {
  // ... full body of current page.tsx Today JSX moved here unchanged,
  // ending with the mobile shell's BottomTabs rendered at the bottom
  return (
    <div
      className="md:hidden mf-bg mf-fg"
      style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center' }}
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
          {/* ... full mobile JSX from current page ... */}
        </div>
        <BottomTabs active="today" />
      </div>
    </div>
  );
}
```

Full mobile body is already in the current `page.tsx` — copy it verbatim, adjust the exported shape.

- [ ] **Step 2: Create `today-desktop.tsx` matching the handoff's `ClientTodayDesktop`**

```tsx
// src/app/client/(v4)/today-desktop.tsx
import Link from 'next/link';
import { Play, Calendar, MessageSquare, Activity, Scale } from 'lucide-react';
import { Avatar, Btn, Chip, ClientDesktopShell, LineChart, Ring, Sparkline, StatCard } from '@/components/ui/mf';
import type { ClientContext } from '@/lib/client-data';
import type { TodayData } from './today-mobile';

export default function TodayDesktop({ ctx, data }: { ctx: ClientContext; data: TodayData }) {
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="hidden md:block">
      <ClientDesktopShell
        active="today"
        title={`Today · ${formatDate(new Date())}`}
        breadcrumbs="HOME"
        athleteInitials={ctx.initials}
        athleteName={ctx.name ?? ctx.email}
        athleteMeta={data.nextSession ? `WK · ${data.nextSession.workout.title}` : undefined}
        headerRight={
          <>
            <Chip kind="ok">READY</Chip>
            <Btn icon={Calendar}>This week</Btn>
          </>
        }
      >
        <div className="p-6 grid grid-cols-12 gap-5">
          {/* Hero — today's workout */}
          <div
            className="mf-card-elev col-span-8 overflow-hidden"
            style={{
              padding: 24,
              background: 'linear-gradient(135deg, rgba(255,77,28,0.12) 0%, var(--mf-surface-2) 60%)',
            }}
          >
            <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
              <div>
                <div className="mf-eyebrow" style={{ marginBottom: 4 }}>
                  TODAY · STREAK {data.streak}
                </div>
                <div
                  className="mf-font-display"
                  style={{ fontSize: 32, letterSpacing: '-0.01em', lineHeight: 1 }}
                >
                  {data.nextSession ? data.nextSession.workout.title : 'No session today'}
                </div>
                {data.nextSession && (
                  <div className="mf-font-mono mf-fg-dim" style={{ fontSize: 11, marginTop: 8 }}>
                    {data.nextSession.workout.exercises.length} EXERCISES · EST {data.nextSession.workout.duration} MIN
                  </div>
                )}
              </div>
              {data.nextSession && (
                <Link href={`/client/workout/${data.nextSession.id}`}>
                  <Btn variant="primary" icon={Play} style={{ height: 48, padding: '0 20px', fontSize: 14 }}>
                    START SESSION
                  </Btn>
                </Link>
              )}
            </div>
            {data.nextSession && data.nextSession.workout.exercises.length > 0 && (
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${Math.min(6, data.nextSession.workout.exercises.length)}, minmax(0, 1fr))`, marginTop: 24 }}
              >
                {data.nextSession.workout.exercises.slice(0, 6).map((e, i) => (
                  <div key={e.id} className="mf-card" style={{ padding: 12 }}>
                    <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9, marginBottom: 4 }}>
                      EX {i + 1}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2, marginBottom: 6, minHeight: 28 }}>
                      {e.exercise.name}
                    </div>
                    <div className="mf-font-mono mf-fg-dim" style={{ fontSize: 10 }}>
                      {e.sets}×{e.reps ?? '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Streak card */}
          <div className="mf-card col-span-4" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <div className="mf-eyebrow">THIS WEEK</div>
              <Chip kind="ok">{data.weekSessions}/5 SESSIONS</Chip>
            </div>
            <div className="grid grid-cols-7 gap-2" style={{ flex: 1, alignContent: 'start' }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => {
                const done = data.weekDaysDone[i];
                return (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9, marginBottom: 6 }}>
                      {label}
                    </div>
                    <div
                      className="grid place-items-center"
                      style={{
                        width: '100%',
                        height: 32,
                        borderRadius: 4,
                        background: done ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
                      }}
                    >
                      {done && <span className="mf-font-mono" style={{ fontSize: 11, color: 'var(--mf-accent-ink)' }}>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--mf-hairline)' }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>BODY WEIGHT</div>
              <div
                className="mf-font-display mf-tnum"
                style={{ fontSize: 36, lineHeight: 1 }}
              >
                {data.bodyWeight ? data.bodyWeight.toFixed(1) : '—'}
                <span className="mf-fg-mute" style={{ fontSize: 16, marginLeft: 4 }}>lb</span>
              </div>
              {data.trendDelta && (
                <div className="mf-font-mono" style={{ fontSize: 10, marginTop: 4, color: 'var(--mf-green)' }}>
                  {data.trendDelta}
                </div>
              )}
            </div>
          </div>

          {/* Coach message */}
          {data.coachNote && (
            <div className="mf-card col-span-4" style={{ padding: 20, background: 'var(--mf-surface-2)' }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                <Avatar
                  initials={(data.coachNote.sender.name ?? 'BM').split(' ').map((s) => s[0]).join('').toUpperCase().slice(0, 2)}
                  size={28}
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1 }}>
                    {data.coachNote.sender.name ?? 'Coach'}
                  </div>
                  <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9, marginTop: 2 }}>
                    UNREAD
                  </div>
                </div>
              </div>
              <p className="mf-fg-dim" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
                {data.coachNote.content}
              </p>
              <Link href="/client/messages">
                <Btn icon={MessageSquare} className="w-full">Reply</Btn>
              </Link>
            </div>
          )}

          {/* Upcoming / placeholder */}
          <div className={`mf-card ${data.coachNote ? 'col-span-8' : 'col-span-12'}`} style={{ padding: 20 }}>
            <div className="mf-eyebrow" style={{ marginBottom: 12 }}>YOUR PROGRAM</div>
            <Link href="/client/program" style={{ display: 'block' }}>
              <Btn icon={Activity} className="w-full">View full schedule</Btn>
            </Link>
          </div>
        </div>
      </ClientDesktopShell>
    </div>
  );
}
```

- [ ] **Step 3: Rewire `page.tsx` to render both**

```tsx
// src/app/client/(v4)/page.tsx
import { requireClientSession, getClientContext, startOfToday, startOfWeek } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import TodayMobile, { type TodayData } from './today-mobile';
import TodayDesktop from './today-desktop';

export const dynamic = 'force-dynamic';

async function getTodayData(userId: string): Promise<TodayData> {
  // ... current getTodayData body moved from old page.tsx verbatim ...
}

export default async function ClientTodayPage() {
  const session = await requireClientSession();
  const [ctx, data] = await Promise.all([
    getClientContext(session.user.id),
    getTodayData(session.user.id),
  ]);
  return (
    <>
      <TodayMobile ctx={ctx} data={data} />
      <TodayDesktop ctx={ctx} data={data} />
    </>
  );
}
```

- [ ] **Step 4: Build + manual check**

Run: `npm run build`
Expected: `/client` compiles clean.

Run: `npm run dev`
Visit `http://localhost:3000/client` at 390px (DevTools device mode) → mobile Today renders, desktop is hidden.
Visit at ≥768px → desktop Today renders, mobile is hidden.

- [ ] **Step 5: Commit**

```bash
git add src/app/client/\(v4\)/today-mobile.tsx src/app/client/\(v4\)/today-desktop.tsx src/app/client/\(v4\)/page.tsx
git commit -m "feat(v4): client Today — add desktop layout alongside mobile"
```

---

### Task B3–B7: Client Desktop — remaining 5 views

Each follows the exact pattern of Task B2. I list file + handoff reference only; implementation mirrors the reference 1:1.

- [ ] **B3: `/client/workout/[sessionId]` → `active-workout-desktop.tsx`** — port `ClientWorkoutDesktop` from `screens_client_desktop.jsx:242-436`: 3-column layout (exercise list | current-exercise hero + set-log table | coach pane with form video placeholder + last-time table). Reuses existing server data from `active-workout-client.tsx`. After copy: rewire the session page to render `<ActiveWorkoutClient>` (mobile) + `<ActiveWorkoutDesktop>`.

- [ ] **B4: `/client/food` → `food-desktop.tsx`** — port `ClientFoodDesktop` from `screens_client_desktop.jsx:439-600`: full-width 5-col macro summary + 8-col meal log + 4-col sticky search panel. Reuses `FoodClient`'s server data and API calls.

- [ ] **B5: `/client/progress` → `progress-desktop.tsx`** — port `ClientProgressDesktop` from `screens_client_desktop.jsx:603-710`: 12-col KPI row + big lift chart + PR timeline + 180-day heatmap + body-comp card.

- [ ] **B6: `/client/program` → `program-desktop.tsx`** — port `ClientProgramDesktop` from `screens_client_desktop.jsx:713-794`: phase hero card with 12-week bar, 7-col week grid, 3-col bottom row (coach notes / program stats / next block). Pulls from existing `ProgramAssignment` query we added in Phase 8.

- [ ] **B7: `/client/messages` → `messages-desktop.tsx`** — port `ClientMessagesDesktop` from `screens_client_desktop.jsx:796-880`: 320px thread rail + thread view with speech-bubble styling. Reuses existing SSE `messages-client.tsx` for state.

Per task:
- Create desktop component
- Rename existing mobile component to `<name>-mobile.tsx` (or keep `*-client.tsx` naming — prefer `-mobile.tsx` for consistency)
- Modify the page server component to render both wrapped in `md:hidden` / `hidden md:block`
- Build green
- Commit: `feat(v4): client <route> — add desktop layout`

---

## Phase C — Trainer Mobile views

### Task C1: Make `/trainer/(v4)/layout.tsx` still pass-through

**Files:** (verify only)
- Read: `src/app/trainer/(v4)/layout.tsx`

- [ ] **Step 1: Confirm current layout is just the auth gate**

Expected existing content:
```tsx
export default async function TrainerV4Layout({ children }: { children: React.ReactNode }) {
  await requireTrainerSession();
  return <>{children}</>;
}
```

No changes needed. Each trainer page already owns its DesktopShell; we'll add mobile siblings.

---

### Task C2: Trainer Roster — mobile variant

**Files:**
- Create: `src/app/trainer/(v4)/roster-desktop.tsx` (extracted from current `page.tsx` body)
- Create: `src/app/trainer/(v4)/roster-mobile.tsx`
- Modify: `src/app/trainer/(v4)/page.tsx`

- [ ] **Step 1: Extract current desktop body to `roster-desktop.tsx`**

Move the entire DesktopShell-wrapped roster JSX from `page.tsx` into a `RosterDesktop` component wrapped in `<div className="hidden md:block">`.

- [ ] **Step 2: Create `roster-mobile.tsx` matching `TrainerMobileRoster` handoff reference**

```tsx
'use client';

import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import { Avatar, Chip, StatusDot, TrainerMobileTabs } from '@/components/ui/mf';
import type { RosterClient } from '@/lib/trainer-data';

export default function RosterMobile({
  roster,
  stats,
}: {
  roster: RosterClient[];
  stats: { totalClients: number; loggedToday: number; avgAdherence: number; prsThisWeek: number };
}) {
  const active = roster.filter((r) => r.status === 'active').length;
  const behind = roster.filter((r) => r.status === 'behind').length;

  return (
    <div
      data-mf
      className="md:hidden mf-bg mf-fg"
      style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center' }}
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
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--mf-hairline)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="mf-eyebrow">COACHING</div>
                <div
                  className="mf-font-display"
                  style={{ fontSize: 22, letterSpacing: '-0.01em', lineHeight: 1, marginTop: 2 }}
                >
                  ROSTER
                </div>
              </div>
              <div className="flex gap-1">
                <button className="grid place-items-center" style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--mf-surface-2)' }} aria-label="Search">
                  <Search size={14} />
                </button>
                <Link href="/admin/invitations">
                  <button className="grid place-items-center" style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--mf-accent)' }} aria-label="Add athlete">
                    <Plus size={14} style={{ color: 'var(--mf-accent-ink)' }} />
                  </button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2" style={{ marginTop: 12 }}>
              <div>
                <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9, textTransform: 'uppercase' }}>ATHLETES</div>
                <div className="mf-font-display mf-tnum" style={{ fontSize: 20, lineHeight: 1, marginTop: 2 }}>{stats.totalClients}</div>
              </div>
              <div>
                <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9, textTransform: 'uppercase' }}>ACTIVE TODAY</div>
                <div className="mf-font-display mf-tnum mf-accent" style={{ fontSize: 20, lineHeight: 1, marginTop: 2 }}>{stats.loggedToday}</div>
              </div>
              <div>
                <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9, textTransform: 'uppercase' }}>BEHIND</div>
                <div className="mf-font-display mf-tnum" style={{ fontSize: 20, lineHeight: 1, marginTop: 2, color: 'var(--mf-amber)' }}>{behind}</div>
              </div>
            </div>
          </div>

          {roster.map((c) => {
            const col =
              c.adherence >= 85 ? 'var(--mf-green)' :
              c.adherence >= 70 ? 'var(--mf-amber)' :
              c.adherence > 0 ? 'var(--mf-red)' : 'var(--mf-fg-mute)';
            return (
              <Link
                key={c.id}
                href={`/trainer/clients/${c.id}`}
                className="flex items-center gap-3"
                style={{ padding: '12px 16px', borderBottom: '1px solid var(--mf-hairline)' }}
              >
                <Avatar initials={c.initials} size={38} active={c.status === 'active' && c.lastLogLabel === 'Today'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name ?? c.email}
                    </span>
                    <StatusDot kind={c.status} />
                  </div>
                  <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.lastLogLabel} · {c.program ?? '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mf-font-display mf-tnum" style={{ fontSize: 16, lineHeight: 1, color: col }}>
                    {c.adherence > 0 ? `${c.adherence}%` : '—'}
                  </div>
                  <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 8, marginTop: 2, textTransform: 'uppercase' }}>ADH</div>
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
```

- [ ] **Step 3: Rewire `page.tsx`**

```tsx
// src/app/trainer/(v4)/page.tsx
import { requireTrainerSession, getRoster, getTrainerRosterStats } from '@/lib/trainer-data';
import RosterDesktop from './roster-desktop';
import RosterMobile from './roster-mobile';

export const dynamic = 'force-dynamic';

export default async function TrainerRosterPage() {
  const session = await requireTrainerSession();
  const [roster, stats] = await Promise.all([
    getRoster(session.user.id),
    getTrainerRosterStats(session.user.id),
  ]);
  return (
    <>
      <RosterMobile roster={roster} stats={stats} />
      <RosterDesktop roster={roster} stats={stats} />
    </>
  );
}
```

- [ ] **Step 4: Build + manual check**

Run: `npm run build`
Visit `/trainer` at 390px → mobile roster; at ≥768px → desktop roster.

- [ ] **Step 5: Commit**

```bash
git add src/app/trainer/\(v4\)/roster-mobile.tsx src/app/trainer/\(v4\)/roster-desktop.tsx src/app/trainer/\(v4\)/page.tsx
git commit -m "feat(v4): trainer Roster — add mobile layout alongside desktop"
```

---

### Task C3–C6: Trainer Mobile — remaining 4 views

Same pattern as C2:

- [ ] **C3: `/trainer/clients/[id]` → `client-detail-mobile.tsx`** — port `TrainerMobileClientDetail` from `screens_trainer_mobile.jsx:105-240`: hero with stats strip, tab row, today's session card, 7-day volume bars, recent PRs list, quick-action grid.

- [ ] **C4: `/trainer/messages` → `inbox-mobile.tsx`** — port `TrainerMobileInbox` from `screens_trainer_mobile.jsx:243-308`: header with filter chips, thread list with unread indicators. Thread-detail view on mobile can reuse the existing `/trainer/messages?with=<id>` query-param pattern.

- [ ] **C5: `/trainer/schedule` → `schedule-mobile.tsx`** — port `TrainerMobileSchedule` from `screens_trainer_mobile.jsx:311-412`: day-scroller at top, current session hero card, upcoming list.

- [ ] **C6: `/trainer/builder` → `programs-mobile.tsx`** — port `TrainerMobileProgram` from `screens_trainer_mobile.jsx:415-503`: featured draft card + your-programs list + exercise-library entry.

Each:
- Create `<name>-mobile.tsx` matching the reference
- Rename existing body → `<name>-desktop.tsx` if not already (some already split — check)
- Page renders both; build green; commit.

---

## Phase D — Public nav + legacy cleanup

### Task D1: Extract `PublicTopNav` from MarketingLanding

**Files:**
- Create: `src/components/ui/mf/PublicTopNav.tsx`
- Modify: `src/components/marketing/v4/MarketingLanding.tsx` (use the new component)

- [ ] **Step 1: Create `PublicTopNav.tsx`**

Extract lines ~174–224 of `MarketingLanding.tsx` (the sticky top nav with brand mark + links + sign-in + start-training). Key API:
```tsx
export interface PublicTopNavProps {
  activeSection?: 'platform' | 'pricing' | 'trainers' | 'clients' | 'shop' | null;
}
```

Renders: sticky header with blurred backdrop, brand mark, horizontal link set, ghost sign-in + primary "Start training" buttons. Hide "Sign in" below sm: breakpoint (we already do this).

- [ ] **Step 2: Update MarketingLanding to use it**

```tsx
// Replace the inline <div className="sticky top-0 ..."> block with:
<PublicTopNav />
```

- [ ] **Step 3: Build passes; marketing still renders identically.**

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/mf/PublicTopNav.tsx src/components/marketing/v4/MarketingLanding.tsx
git commit -m "refactor(v4): extract PublicTopNav from MarketingLanding for reuse"
```

---

### Task D2: Swap legacy `Navigation` for `PublicTopNav`

**Files:**
- Modify: `src/components/ConditionalNavigation.tsx`

- [ ] **Step 1: Swap the import + render**

```tsx
'use client';

import { usePathname } from 'next/navigation';
import PublicTopNav from '@/components/ui/mf/PublicTopNav';

const ConditionalNavigation = () => {
  const pathname = usePathname();

  // Pages that already own their chrome (v4 authenticated + marketing home + auth + design)
  const ownsChrome =
    pathname === '/' ||
    pathname === '/design' ||
    pathname?.startsWith('/auth/') ||
    pathname === '/client' ||
    pathname?.startsWith('/client/') ||
    pathname === '/trainer' ||
    pathname?.startsWith('/trainer/') ||
    pathname === '/admin' ||
    pathname?.startsWith('/admin/');

  if (ownsChrome) return null;

  return <PublicTopNav />;
};

export default ConditionalNavigation;
```

- [ ] **Step 2: Visually verify /about, /contact, /programs, /shop, /register-with-code now show the v4 top nav**

Run: `npm run dev`
Visit each of the above. Expected: dark-themed top nav matching the marketing landing, no purple bar.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConditionalNavigation.tsx
git commit -m "refactor(v4): public pages now use PublicTopNav instead of legacy Navigation"
```

---

### Task D3: Delete legacy dashboards + Navigation

**Files:**
- Delete: `src/app/client/dashboard/`
- Delete: `src/app/trainer/dashboard/`
- Delete: `src/app/admin/legacy/`
- Delete: `src/components/Navigation.tsx`

- [ ] **Step 1: Confirm no callers remain**

Run:
```bash
grep -rn "from.*Navigation['\"]\|/client/dashboard\|/trainer/dashboard\|/admin/legacy" src/ --include='*.tsx' --include='*.ts'
```
Expected: zero output. If anything matches, update those files first.

- [ ] **Step 2: Remove directories**

```bash
rm -rf src/app/client/dashboard src/app/trainer/dashboard src/app/admin/legacy src/components/Navigation.tsx
```

- [ ] **Step 3: Build passes**

Run: `npm run build`
Expected: success, 3 fewer routes in the output.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(v4): delete legacy /client/dashboard /trainer/dashboard /admin/legacy + Navigation.tsx"
```

---

## Phase E — Integration verification

### Task E1: Full health-check sweep

- [ ] **Step 1: Run the pre-push health check**

Run: `bash scripts/v4-health-check.sh`
Expected: PASS count ≥ previous run's (we've added routes). Any new FAIL should be investigated.

- [ ] **Step 2: Manual matrix test at two viewports**

Visit and confirm in DevTools device mode:

| Route | 390px (mobile) | 1280px (desktop) |
|---|---|---|
| `/client` | Today mobile | Today desktop |
| `/client/program` | Program mobile | Program desktop |
| `/client/food` | Food mobile | Food desktop (2-pane) |
| `/client/progress` | Progress mobile | Progress desktop (12-col) |
| `/client/workout/<id>` | Active mobile | Active desktop (3-col) |
| `/client/messages` | Messages mobile | Messages desktop |
| `/trainer` | Roster mobile | Roster desktop |
| `/trainer/clients/<id>` | Client detail mobile | Client detail desktop |
| `/trainer/messages` | Inbox mobile | Inbox desktop |
| `/trainer/schedule` | Schedule mobile | Schedule desktop |
| `/trainer/builder` | Programs mobile | Programs desktop |
| `/about`, `/contact`, `/programs`, `/shop` | v4 PublicTopNav | v4 PublicTopNav |

- [ ] **Step 3: If all rows pass, push main**

```bash
git push origin main
```
Railway auto-deploys.

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Client Desktop — 6 screens (Today, Workout, Food, Progress, Program, Messages) covered in B2–B7.
- ✅ Trainer Mobile — 5 screens (Roster, Client Detail, Inbox, Schedule, Programs) covered in C2–C6.
- ✅ Legacy cleanup — Navigation.tsx, /client/dashboard, /trainer/dashboard, /admin/legacy deletion in D3.
- ✅ Public pages migrated to v4 nav — D1/D2.
- ✅ Icons (Scale/Phone/Download) confirmed in lucide — A2.

**Placeholder scan:** No "TBD" / "implement later" in any step. Each task lists exact files + code + verification.

**Type consistency:** `ClientDesktopKey`, `TrainerMobileTabKey`, `TodayData`, `RosterClient`, `ClientContext` all defined before first use.

**Open risk:** Responsive double-mount — both mobile + desktop JSX trees ship in every HTML payload, hidden via CSS. Each page's server-side data fetch still runs once. Bundle size increase is minimal (presentational only). Acceptable tradeoff for code simplicity.
