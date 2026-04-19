# Martinez Fitness Animations Port — Implementation Plan

> **For agentic workers:** Execute phase-by-phase. Verify build after each phase before moving to the next. Rollback = delete the phase's files and unmount; no DB or config side-effects.

**Goal:** Port the three animation systems from the plain-HTML Martinez Fitness handoff (`src/animations.jsx`) into the Next.js fitness-training-platform app as first-class TSX components, behind a feature flag, without breaking existing pages.

**Architecture:**
- Replace `window.*` globals with React Context + typed hook (`useCelebrate`).
- Replace hand-rolled keyframe injection with framer-motion (already in deps) where it simplifies correctness.
- Gate SSR-sensitive pieces (BootLoader) with a mount-after-hydration guard.
- Single feature flag `NEXT_PUBLIC_ANIMATIONS_V2` lets us ship to preview and flip in prod without reverts.

**Tech Stack:** Next.js 15 (App Router, Turbopack), React 19, TypeScript, framer-motion 12, existing fonts (Oswald via `--font-display`, JetBrains Mono via `--font-mf-mono`).

**Verification model:** No Vitest/Jest configured. "Tests" = `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm run dev` visual smoke. Each phase must pass all four before the next starts.

---

## File Structure

```
src/
  lib/
    featureFlags.ts                         [modify or create — add ANIMATIONS_V2]
  components/
    animations/
      index.ts                              [create — barrel]
      celebrations.ts                       [create — presets data]
      CelebrationIcon.tsx                   [create — SVG icons per preset]
      Confetti.tsx                          [create — absolute-positioned pieces]
      Celebration.tsx                       [create — the hero card overlay]
      CelebrationHost.tsx                   [create — consumer of provider state]
      CelebrationProvider.tsx               [create — context + useCelebrate hook]
      TabTransition.tsx                     [create — framer-motion wrapper]
      BootLoader.tsx                        [create — radial-bar splash]
      BootGate.tsx                          [create — sessionStorage gate + mount]
  components/
    Providers.tsx                           [modify — mount CelebrationProvider + CelebrationHost + BootGate]
```

**Responsibility split rationale:** `celebrations.ts` is pure data; `Celebration.tsx` is pure presentation; `CelebrationProvider` owns state; `CelebrationHost` is the one-time mount point. Split lets the visual component be storybook-able later without touching the provider.

---

## Phase 0 — Feature flag scaffolding

### Task 0.1: Add ANIMATIONS_V2 to feature flags

**Files:**
- Modify: `src/lib/feature-flags.ts` (add export) OR create `src/lib/featureFlags.ts` if existing shape doesn't fit

- [ ] **Step 1: Inspect existing flag util**

Run: read `src/lib/feature-flags.ts` and decide whether it's DB-backed or env-backed. If DB-backed, create a sibling `src/lib/animationFlags.ts` that reads `process.env.NEXT_PUBLIC_ANIMATIONS_V2`.

- [ ] **Step 2: Export helper**

```ts
// src/lib/animationFlags.ts
export const animationsV2Enabled = (): boolean =>
  process.env.NEXT_PUBLIC_ANIMATIONS_V2 === '1';
```

- [ ] **Step 3: Verify build still green**

```bash
npx tsc --noEmit
```

---

## Phase 1 — Celebration system (lowest risk, ships first)

### Task 1.1: Presets data file

**Files:**
- Create: `src/components/animations/celebrations.ts`

Port the `CELEBRATIONS` object from handoff `animations.jsx:183-274` verbatim, typed. Add an `overrides` type so callers can pass dynamic `bigNumber`, `subtitle`, `stats`, `message` at trigger time.

```ts
export type CelebrationKind = 'workout' | 'pr' | 'weight' | 'bodyfat' | 'mood' | 'sleep';

export type CelebrationIconKind = 'trophy' | 'flame' | 'trending' | 'target' | 'star' | 'moon';

export interface CelebrationPreset {
  title: string;
  subtitle: string;
  bigNumber: string;
  bigLabel: string;
  icon: CelebrationIconKind;
  accent: string;
  stats: Array<[string, string]>;
  message: string;
}

export type CelebrationOverrides = Partial<CelebrationPreset>;

export const CELEBRATIONS: Record<CelebrationKind, CelebrationPreset> = {
  // ... full data copied from animations.jsx
};
```

### Task 1.2: CelebrationIcon

**Files:**
- Create: `src/components/animations/CelebrationIcon.tsx`

Port the `CelebrationIcon` switch from `animations.jsx:276-314` as a pure TSX component. Type `kind: CelebrationIconKind`, `color: string`.

### Task 1.3: Confetti

**Files:**
- Create: `src/components/animations/Confetti.tsx`

Port `animations.jsx:317-365`. Convert to TSX. Replace the inline `<style>` block with a `styled-jsx` `<style jsx>` block (Next.js supports styled-jsx out of the box — no new dep). Keep the 20-keyframe class strategy. Cast the custom-prop style via `React.CSSProperties & Record<string, string>`.

### Task 1.4: Celebration card

**Files:**
- Create: `src/components/animations/Celebration.tsx`

Port `animations.jsx:367-526`. Changes from source:
- Remove the dead `setTimeout(() => {}, 5200)` at L372.
- Render `<Confetti>` and the card at the same time (don't gate confetti on `show`).
- Move the three `@keyframes` blocks into `<style jsx>`.
- Accept `preset: CelebrationPreset` prop (already merged with overrides by the host).

### Task 1.5: CelebrationProvider + useCelebrate hook

**Files:**
- Create: `src/components/animations/CelebrationProvider.tsx`

```tsx
'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CelebrationKind, CelebrationOverrides, CelebrationPreset, CELEBRATIONS } from './celebrations';

interface ActiveCelebration { preset: CelebrationPreset; id: number; }
interface CelebrationContextValue {
  active: ActiveCelebration | null;
  celebrate: (kind: CelebrationKind, overrides?: CelebrationOverrides) => void;
  dismiss: () => void;
}

const Ctx = createContext<CelebrationContextValue | null>(null);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveCelebration | null>(null);
  const celebrate = useCallback((kind: CelebrationKind, overrides?: CelebrationOverrides) => {
    const base = CELEBRATIONS[kind];
    setActive({ preset: { ...base, ...overrides }, id: Date.now() });
  }, []);
  const dismiss = useCallback(() => setActive(null), []);
  return <Ctx.Provider value={{ active, celebrate, dismiss }}>{children}</Ctx.Provider>;
}

export function useCelebrate() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCelebrate must be used inside CelebrationProvider');
  return ctx.celebrate;
}

export function useCelebrationState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCelebrationState must be used inside CelebrationProvider');
  return ctx;
}
```

### Task 1.6: CelebrationHost

**Files:**
- Create: `src/components/animations/CelebrationHost.tsx`

```tsx
'use client';
import { Celebration } from './Celebration';
import { useCelebrationState } from './CelebrationProvider';

export function CelebrationHost() {
  const { active, dismiss } = useCelebrationState();
  if (!active) return null;
  return <Celebration key={active.id} preset={active.preset} onClose={dismiss} />;
}
```

### Task 1.7: Barrel export

**Files:**
- Create: `src/components/animations/index.ts`

```ts
export { CelebrationProvider, useCelebrate } from './CelebrationProvider';
export { CelebrationHost } from './CelebrationHost';
export type { CelebrationKind, CelebrationOverrides } from './celebrations';
```

### Task 1.8: Mount in Providers.tsx

**Files:**
- Modify: `src/components/Providers.tsx`

Wrap children with `<CelebrationProvider>` and render `<CelebrationHost />` as a sibling of `{children}` so it layers above all routes.

### Task 1.9: Verify Phase 1

```bash
npm run lint && npx tsc --noEmit && npm run build
```

Expected: all pass. No console errors when dev server starts.

---

## Phase 2 — TabTransition via framer-motion

### Task 2.1: TabTransition component

**Files:**
- Create: `src/components/animations/TabTransition.tsx`

Use framer-motion's `AnimatePresence mode="wait"` keyed on a prop (`keyId: string`). Don't wire globally — export for opt-in use in dashboard tabs.

```tsx
'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode } from 'react';

interface Props { keyId: string; children: ReactNode; }

export function TabTransition({ keyId, children }: Props) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={keyId}
        initial={{ opacity: 0, y: -6, scale: 1.005 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.995 }}
        transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

Add to barrel export.

### Task 2.2: Verify Phase 2

```bash
npm run lint && npx tsc --noEmit && npm run build
```

---

## Phase 3 — BootLoader

### Task 3.1: BootLoader component

**Files:**
- Create: `src/components/animations/BootLoader.tsx`

Port `animations.jsx:7-137`. Convert to TSX. Add `'use client'`. Move keyframes into `<style jsx>`. Respect `prefers-reduced-motion` — if set, call `onDone()` after 100ms without animating.

Accept optional props so copy isn't hard-coded:
```ts
interface Props {
  onDone?: () => void;
  messages?: Array<[number, string, number]>;
}
```

### Task 3.2: BootGate

**Files:**
- Create: `src/components/animations/BootGate.tsx`

```tsx
'use client';
import { useEffect, useState } from 'react';
import { BootLoader } from './BootLoader';
import { animationsV2Enabled } from '@/lib/animationFlags';

const STORAGE_KEY = 'mf.booted';

export function BootGate() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!animationsV2Enabled()) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) !== '1') {
        setShow(true);
      }
    } catch {
      // private mode / storage disabled — skip splash
    }
  }, []);

  if (!mounted || !show) return null;

  return (
    <BootLoader
      onDone={() => {
        try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch {}
        setShow(false);
      }}
    />
  );
}
```

### Task 3.3: Mount BootGate in Providers.tsx

Render `<BootGate />` as the first child inside `ToastProvider` so it overlays everything.

### Task 3.4: Verify Phase 3

```bash
npm run lint && npx tsc --noEmit && npm run build
```

---

## Phase 4 — Final smoke test

### Task 4.1: Dev server visual verification

```bash
NEXT_PUBLIC_ANIMATIONS_V2=1 npm run dev
```

Show the user:
- Terminal output (ready on localhost).
- Compile success for `/`, `/design`, `/about`.

Document trigger site for later: to test celebrations in the dashboard workout-finish flow, import `useCelebrate` and call `celebrate('workout', { bigNumber: '+2,450 LB' })`. Not wiring it in this plan — that's a feature task, not a port task.

---

## Rollback

If anything goes wrong after merge:
1. Unset `NEXT_PUBLIC_ANIMATIONS_V2` — BootLoader and all visible effects go dormant.
2. If the bug is in the provider itself: remove `<CelebrationProvider>` + `<CelebrationHost />` + `<BootGate />` from `Providers.tsx`. Zero other files touched.
