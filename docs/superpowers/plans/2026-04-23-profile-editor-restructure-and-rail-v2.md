# Profile Editor Restructure + Rail v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the long trainer profile editor from ~3000px to ~2000px by pairing short sections in a 2-column grid, and extend the desktop right rail with a Share card + Activity card so it actually justifies the column width.

**Architecture:** Two parallel tracks. (1) The file-local `Section` helper in `profile-editor-client.tsx` grows an optional `span` prop; the form column grows a `md:grid-cols-2` Tailwind class; 13 short `<Section>` calls get `span="half"`. (2) A new read-only GET route `/api/trainers/me/activity` returns a weekly application count; two new file-local card components render inside the existing sticky `<aside>`. All state, handlers, submit logic, and the existing personal QR feature are untouched.

**Tech Stack:** Next.js 15 App Router · React · TypeScript · Tailwind (`md:` + `col-span-*`) · Prisma (`ContactSubmission`) · NextAuth.

---

## Testing note

The repo has no Jest / Vitest / Playwright harness for client components. Verification per task is `npx tsc --noEmit`, `npx eslint` on the changed files, and — after Task 9 — a manual browser pass at 1440, 1100, 900, and 375px viewport widths. Do not attempt to write unit tests; they'll fail with no runner.

## File structure

| File | Purpose | Change type |
| --- | --- | --- |
| `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` | Editor UI | Modify — `Section` prop, form column classes, section props, new `ShareCard` + `ActivityCard` + `TrainerProfile` slug field, loader extension, aside wiring |
| `src/app/api/trainers/me/profile/route.ts` | Profile loader GET | Modify — include `trainerSlug` in the User select + response |
| `src/app/api/trainers/me/activity/route.ts` | Activity GET | **Create** — returns `{ applicationsThisWeek: number }` |

No other files touched. No new npm dependencies.

---

## Task 1 — Add `span` prop to `Section`

**Files:**
- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` (the `Section` helper near the bottom)

- [ ] **Step 1: Update the `Section` signature**

Find the existing helper (shipped in an earlier commit; currently takes `id`, `title`, `children` with `scrollMarginTop: 96`):

```tsx
function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="mf-card"
      // scrollMarginTop keeps the section's title visible below the sticky
      // save row when the checklist smooth-scrolls us to this anchor.
      style={{ padding: 16, scrollMarginTop: 96 }}
    >
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
```

Replace with:

```tsx
function Section({
  id,
  title,
  span = 'full',
  children,
}: {
  id?: string;
  title: string;
  span?: 'half' | 'full';
  children: React.ReactNode;
}) {
  // At md:+ the form column is a 2-col grid. Half-width sections pair up;
  // full-width sections (default) span both columns like today. Below md:
  // no col-span classes apply and the grid falls back to single-column,
  // preserving the pre-restructure stacking behavior.
  const colClass = span === 'half' ? 'md:col-span-1' : 'md:col-span-2';
  return (
    <div
      id={id}
      className={`mf-card ${colClass}`}
      style={{ padding: 16, scrollMarginTop: 96 }}
    >
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
```

Both clean. All existing `<Section>` call sites omit `span`, so they get the default `'full'` → `md:col-span-2`. Visual impact in this task alone is zero because the parent container isn't a grid yet.

- [ ] **Step 3: Commit**

```bash
git add "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
git commit -m "refactor(profile-editor): Section accepts span='half' | 'full' prop"
```

---

## Task 2 — Wrap the form column with a 2-col grid

**Files:**
- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` (the form column `<div>` inside the xl outer grid)

The `<aside>` rail was wired in a previous commit (`22157c3`). The current structure is:

```tsx
<div
  className="xl:grid-cols-[minmax(0,720px)_320px]"
  style={{ display: 'grid', gap: 24, alignItems: 'start' }}
>
  <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    {/* all Sections */}
  </div>

  <aside className="hidden xl:block" ...>
    {/* preview + checklist */}
  </aside>
</div>
```

- [ ] **Step 1: Add `md:grid-cols-2` to the form column wrapper**

Find:

```tsx
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
```

Replace with:

```tsx
        <div
          className="md:grid-cols-2"
          style={{ display: 'grid', gap: 16, minWidth: 0 }}
        >
```

Below `md:` (768px) no `grid-template-columns` applies, so the form is an implicit single column exactly as today. At ≥768px the form is a 2-column grid, and each Section's `md:col-span-*` takes effect.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
```

Both clean. At this point the whole form is still visually single-column because every Section is defaulting to `md:col-span-2`; the pairing takes effect only after Task 3.

- [ ] **Step 3: Commit**

```bash
git add "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
git commit -m "refactor(profile-editor): form column becomes 2-col grid at md:+"
```

---

## Task 3 — Assign `span="half"` to the 13 short sections

**Files:**
- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx`

The pairs must be adjacent siblings in the DOM for the 2-col grid to pair them correctly left/right. The current ordering already has them adjacent (verified during spec work). Do not reorder anything.

The 13 sections to mark half-width (in document order):

1. `HEADLINE (one sentence shown under your name)`
2. `LOCATION`
3. `INSTAGRAM`
4. `TIKTOK`
5. `YOUTUBE`
6. `CONTACT PHONE (shown on your apply page)`
7. `REPLY-TO EMAIL (optional)`
8. `REPLY-FROM NAME (optional)`
9. `EXPERIENCE (YEARS)`
10. `CLIENTS TRAINED (lifetime, optional)`
11. `PRICE TIER`
12. `HOURLY RATE (USD)`
13. `SERVICE MODES`

All other sections stay default (full-width). Do NOT touch Photo, Cover, Bio, Specialties, Quick Facts, Pillars, Gallery, Services & Pricing, or Certifications.

- [ ] **Step 1: Add `span="half"` to Headline**

Find:

```tsx
      <Section id="section-headline" title="HEADLINE (one sentence shown under your name)">
```

Replace with:

```tsx
      <Section id="section-headline" span="half" title="HEADLINE (one sentence shown under your name)">
```

- [ ] **Step 2: Location**

Find:

```tsx
      <Section id="section-location" title="LOCATION">
```

Replace with:

```tsx
      <Section id="section-location" span="half" title="LOCATION">
```

- [ ] **Step 3: Instagram**

Find the `<Section>` opening for `INSTAGRAM` (no id, no span today). It looks like:

```tsx
      <Section title="INSTAGRAM">
```

Replace with:

```tsx
      <Section span="half" title="INSTAGRAM">
```

- [ ] **Step 4: TikTok**

Find:

```tsx
      <Section title="TIKTOK">
```

Replace with:

```tsx
      <Section span="half" title="TIKTOK">
```

- [ ] **Step 5: YouTube**

Find:

```tsx
      <Section title="YOUTUBE">
```

Replace with:

```tsx
      <Section span="half" title="YOUTUBE">
```

- [ ] **Step 6: Contact Phone**

Find:

```tsx
      <Section title="CONTACT PHONE (shown on your apply page)">
```

Replace with:

```tsx
      <Section span="half" title="CONTACT PHONE (shown on your apply page)">
```

- [ ] **Step 7: Reply-to Email**

Find:

```tsx
      <Section title="REPLY-TO EMAIL (optional)">
```

Replace with:

```tsx
      <Section span="half" title="REPLY-TO EMAIL (optional)">
```

- [ ] **Step 8: Reply-from Name**

Find:

```tsx
      <Section title="REPLY-FROM NAME (optional)">
```

Replace with:

```tsx
      <Section span="half" title="REPLY-FROM NAME (optional)">
```

- [ ] **Step 9: Experience**

Find:

```tsx
      <Section title="EXPERIENCE (YEARS)">
```

Replace with:

```tsx
      <Section span="half" title="EXPERIENCE (YEARS)">
```

- [ ] **Step 10: Clients Trained**

Find:

```tsx
      <Section title="CLIENTS TRAINED (lifetime, optional)">
```

Replace with:

```tsx
      <Section span="half" title="CLIENTS TRAINED (lifetime, optional)">
```

- [ ] **Step 11: Price Tier**

Find:

```tsx
      <Section title="PRICE TIER">
```

Replace with:

```tsx
      <Section span="half" title="PRICE TIER">
```

- [ ] **Step 12: Hourly Rate**

Find:

```tsx
      <Section title="HOURLY RATE (USD)">
```

Replace with:

```tsx
      <Section span="half" title="HOURLY RATE (USD)">
```

- [ ] **Step 13: Service Modes**

Find:

```tsx
      <Section title="SERVICE MODES">
```

Replace with:

```tsx
      <Section span="half" title="SERVICE MODES">
```

(Service Modes is the lone short section. It sits in a row by itself with an empty grid cell to its right — that's preferable to making it full-width, which would look disproportionately wide for three checkboxes.)

- [ ] **Step 14: Verify titles weren't edited**

```bash
grep -c 'span="half"' "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
```

Expected output: `13`.

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
```

Both clean.

- [ ] **Step 15: Commit**

```bash
git add "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
git commit -m "refactor(profile-editor): pair 13 short sections via span='half'"
```

---

## Task 4 — Create `GET /api/trainers/me/activity`

**Files:**
- Create: `src/app/api/trainers/me/activity/route.ts`

- [ ] **Step 1: Create the file**

Full contents:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/trainers/me/activity
 *
 * Read-only feed for the trainer's profile editor right rail. Returns the
 * number of applications (`ContactSubmission` rows) this trainer received
 * since the start of the current week (Monday 00:00 local). Profile-view
 * tracking does not exist yet — when it does, add it here.
 */

function startOfWeek(d = new Date()): Date {
  const s = new Date(d);
  const day = s.getDay();
  // Monday-indexed week (Sun → -6, Mon → 0, Tue → -1, …)
  const diff = day === 0 ? -6 : 1 - day;
  s.setDate(s.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const applicationsThisWeek = await prisma.contactSubmission.count({
    where: {
      trainerId: session.user.id,
      createdAt: { gte: startOfWeek() },
    },
  });

  return NextResponse.json(
    { applicationsThisWeek },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
```

- [ ] **Step 2: Verify compile**

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint "src/app/api/trainers/me/activity/route.ts"
```

Both clean.

- [ ] **Step 3: Smoke-test (optional, only if dev server is already running)**

If the dev server is up, visit `http://localhost:3000/api/trainers/me/activity` while signed in as a trainer. Expected JSON: `{"applicationsThisWeek":<n>}` where `<n>` is a non-negative integer.

If dev server isn't running, skip. Task 9 handles end-to-end manual verification.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/trainers/me/activity/route.ts"
git commit -m "feat(api): GET /api/trainers/me/activity — weekly application count"
```

---

## Task 5 — Surface `trainerSlug` in the editor's profile state

The Share card needs the trainer's public slug to build the URL `/t/{slug}`. Today `GET /api/trainers/me/profile` does not return it. Add it.

**Files:**
- Modify: `src/app/api/trainers/me/profile/route.ts`
- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` (interface + loader + initial state)

- [ ] **Step 1: Include `trainerSlug` in the GET select**

Open `src/app/api/trainers/me/profile/route.ts`. Find the `prisma.user.findUnique` call inside the GET's `Promise.all`:

```ts
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { trainerIsPublic: true },
    }),
```

Replace with:

```ts
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { trainerIsPublic: true, trainerSlug: true },
    }),
```

- [ ] **Step 2: Include `trainerSlug` in the GET response body**

Still in the same file, find the `NextResponse.json` that merges trainer + user fields:

```ts
  return NextResponse.json(
    {
      ...trainer,
      certifications: (trainer?.certifications as string[] | null) ?? [],
      quickFacts: Array.isArray(trainer?.quickFacts) ? trainer.quickFacts : [],
```

There will be a `trainerIsPublic: user?.trainerIsPublic ?? false,` line somewhere in that object literal. Add a sibling line right after it:

```ts
      trainerIsPublic: user?.trainerIsPublic ?? false,
      trainerSlug: user?.trainerSlug ?? null,
```

(If the `trainerIsPublic` line doesn't look exactly like that — e.g., double-bang vs nullish-coalesce — match the existing style and add `trainerSlug` alongside in the same idiom.)

- [ ] **Step 3: Extend `TrainerProfile` interface**

In `profile-editor-client.tsx`, find the `TrainerProfile` interface (~line 27). Add one field next to `trainerIsPublic`:

```ts
  trainerIsPublic: boolean;
  trainerSlug: string | null;
```

- [ ] **Step 4: Load `trainerSlug` from the fetch response**

In the same file, find the loader `useEffect` (~line 115) that sets profile state from the GET response. It has a big object literal with:

```tsx
            trainerIsPublic: !!data.trainerIsPublic,
```

Add a sibling line right after it:

```tsx
            trainerIsPublic: !!data.trainerIsPublic,
            trainerSlug: data.trainerSlug ?? null,
```

- [ ] **Step 5: Set default in the initial-state fallback**

Same file, find the fallback initial state (~line 163, reached when the profile fetch fails). It has:

```tsx
        trainerIsPublic: false,
```

Add a sibling line right after it:

```tsx
        trainerIsPublic: false,
        trainerSlug: null,
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx" "src/app/api/trainers/me/profile/route.ts"
```

Both clean.

- [ ] **Step 7: Commit**

```bash
git add "src/app/api/trainers/me/profile/route.ts" "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
git commit -m "feat(trainers-me-profile): expose trainerSlug to the editor"
```

---

## Task 6 — Add `ShareCard` component

**Files:**
- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` (append after `PreviewBlock`, which is the current last helper in the file)

The card reads only from the in-memory `profile` state. No new fetches, no QR code.

- [ ] **Step 1: Append `ShareCard` at the end of the file**

Add this block after the existing `PreviewBlock` helper (which was added in commit `6fd2b71` and lives near the bottom of the file):

```tsx
function ShareCard({ profile }: { profile: TrainerProfile }) {
  const [copied, setCopied] = useState(false);

  const publicUrl = (() => {
    if (!profile.trainerSlug) return null;
    // Server render returns '' then hydrates correctly on first client pass.
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/t/${profile.trainerSlug}`;
  })();

  const canShare = profile.trainerIsPublic && publicUrl !== null;

  async function copy() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail in non-secure contexts or older browsers.
      // We don't bother with a fallback — the URL is still visible as text
      // for the user to select manually.
    }
  }

  return (
    <div className="mf-card" style={{ padding: 14 }}>
      <div className="mf-eyebrow" style={{ marginBottom: 10 }}>
        Share your profile
      </div>

      {canShare ? (
        <>
          <div
            className="mf-font-mono"
            style={{
              fontSize: 10,
              lineHeight: 1.4,
              padding: '8px 10px',
              background: 'var(--mf-surface-2)',
              border: '1px solid var(--mf-hairline)',
              borderRadius: 4,
              wordBreak: 'break-all',
              marginBottom: 10,
            }}
          >
            {publicUrl}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="mf-btn focus-ring"
              onClick={copy}
              style={{ flex: 1, height: 32, fontSize: 11 }}
            >
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            <a
              href={publicUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="mf-btn focus-ring"
              style={{
                flex: 1,
                height: 32,
                fontSize: 11,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              View live profile
            </a>
          </div>
        </>
      ) : (
        <div
          className="mf-fg-mute"
          style={{ fontSize: 11, fontStyle: 'italic', lineHeight: 1.4 }}
        >
          Publish your profile to start sharing. Private profiles are hidden
          from the public and the directory.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
```

Both clean except for the expected "ShareCard unused" warning — Task 8 wires it in.

- [ ] **Step 3: Commit**

```bash
git add "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
git commit -m "feat(profile-editor): ShareCard — public URL + copy-link + view-live"
```

---

## Task 7 — Add `ActivityCard` component

**Files:**
- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` (append after `ShareCard`)

- [ ] **Step 1: Append `ActivityCard` at the end of the file**

```tsx
function ActivityCard() {
  const [applicationsThisWeek, setApplicationsThisWeek] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/trainers/me/activity', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setFailed(true);
          return;
        }
        const data = (await res.json()) as { applicationsThisWeek?: number };
        if (!cancelled && typeof data.applicationsThisWeek === 'number') {
          setApplicationsThisWeek(data.applicationsThisWeek);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const countDisplay =
    failed || applicationsThisWeek === null
      ? applicationsThisWeek === null && !failed
        ? '…'
        : '—'
      : String(applicationsThisWeek);

  return (
    <div className="mf-card" style={{ padding: 14 }}>
      <div className="mf-eyebrow" style={{ marginBottom: 10 }}>
        Recent activity
      </div>

      <div
        className="mf-font-display mf-tnum"
        style={{ fontSize: 32, lineHeight: 1, marginBottom: 4 }}
      >
        {countDisplay}
      </div>
      <div
        className="mf-font-mono mf-fg-dim"
        style={{ fontSize: 10, letterSpacing: '0.08em', marginBottom: 12 }}
      >
        APPLICATIONS THIS WEEK
      </div>

      <a
        href="/trainer/messages"
        className="mf-btn focus-ring"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: 32,
          fontSize: 11,
          textDecoration: 'none',
          marginBottom: 10,
        }}
      >
        View inbox
      </a>

      <div
        className="mf-fg-mute"
        style={{
          fontSize: 10,
          fontStyle: 'italic',
          borderTop: '1px solid var(--mf-hairline)',
          paddingTop: 8,
        }}
      >
        Profile views · Coming soon
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
```

Both clean except for the expected "ShareCard unused" + "ActivityCard unused" warnings — Task 8 wires both in.

- [ ] **Step 3: Commit**

```bash
git add "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
git commit -m "feat(profile-editor): ActivityCard — applications-this-week counter"
```

---

## Task 8 — Render the two new cards in the aside

**Files:**
- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` (the `<aside>` block)

- [ ] **Step 1: Append both cards after `CompletionChecklistCard`**

Find the current aside content (shipped in commit `22157c3`):

```tsx
        <aside
          className="hidden xl:block"
          style={{ position: 'sticky', top: 80, alignSelf: 'start' }}
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <ProfilePreviewCard profile={profile} />
            <CompletionChecklistCard profile={profile} />
          </div>
        </aside>
```

Replace with:

```tsx
        <aside
          className="hidden xl:block"
          style={{ position: 'sticky', top: 80, alignSelf: 'start' }}
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <ProfilePreviewCard profile={profile} />
            <CompletionChecklistCard profile={profile} />
            <ShareCard profile={profile} />
            <ActivityCard />
          </div>
        </aside>
```

Order is intentional: Preview → Checklist → Share → Activity (preview first because it's the most visually informative; checklist next because it's the action layer; share + activity are supplementary below).

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
```

Both clean — including no more "ShareCard / ActivityCard unused" warnings.

- [ ] **Step 3: Commit**

```bash
git add "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
git commit -m "feat(profile-editor): render ShareCard + ActivityCard in the rail"
```

---

## Task 9 — Manual verification, push, memory

**Files:** none (only git + memory)

- [ ] **Step 1: Manual browser verification**

Start (or reuse) `npm run dev` and load `/trainer/settings/profile` signed in as a trainer with a published profile. Verify at four viewport widths:

- **1440×900 (desktop):** Four cards visible in the right rail. Form sections paired: Headline↔Location, Instagram↔TikTok, YouTube↔ContactPhone, ReplyToEmail↔ReplyFromName, Experience↔ClientsTrained, PriceTier↔HourlyRate. Service Modes sits alone on a half-width row. Full-width sections span both columns.
- **1100×700 (laptop, below xl:):** Rail is gone. Form still paired (md: breakpoint is 768+).
- **900×700 (tablet):** Same as laptop — paired form, no rail.
- **375×720 (phone):** Single-column form, no rail, visually identical to before the restructure.

Behavior checks on desktop:

- Click **Copy link** → clipboard contains `{origin}/t/{slug}`, button flips to "Copied ✓" for ~2s.
- Click **View live profile** → new tab opens to the public profile.
- Toggle the profile from Public → Private via the existing button in the sticky save row → Share card swaps to the muted "Publish your profile to start sharing" copy.
- ActivityCard shows a number (may be `0`). Click **View inbox** → lands at `/trainer/messages`.
- Edit Headline / Bio / etc. → live preview still updates, checklist still reflects state.
- Click a checklist row → smooth-scroll lands the target section visible below the sticky save row.
- Save the profile → green "Profile saved" banner appears above the form (unchanged from today).

If any of the above fails, diagnose and push a fix commit *before* proceeding.

- [ ] **Step 2: Push**

```bash
git push origin main
```

Watch the Railway build begin.

- [ ] **Step 3: Record in auto-memory**

Create `/Users/brandenvincent-walker/.claude/projects/-Users-brandenvincent-walker-Documents-Documents---Branden-s-M3-MacBook-Projects-Development-Projects-fitness-training-platform/memory/project_profile_editor_v2.md`:

```markdown
---
name: Trainer profile editor · form restructure + rail v2
description: Public profile editor has paired half-width sections (md:+), Share card, and Activity card. Rail has four cards total.
type: project
---

Shipped 2026-04-23 on `main`.

Form:
- `Section` helper takes optional `span?: 'half' | 'full'` (default full).
- Form column wrapper has `md:grid-cols-2` Tailwind class; at ≥768px short Sections pair.
- Paired rows: Headline/Location, Instagram/TikTok, YouTube/Contact Phone, Reply-to Email/Reply-from Name, Experience/Clients Trained, Price Tier/Hourly Rate.
- Service Modes is half-width but unpaired (lone).
- Below 768px the form is a single column exactly as pre-restructure.

Rail (≥1280px only):
- Four cards in order: ProfilePreviewCard, CompletionChecklistCard, ShareCard, ActivityCard.
- ShareCard reads `profile.trainerSlug` + `profile.trainerIsPublic`. `/api/trainers/me/profile` now returns `trainerSlug` in the User select.
- ActivityCard fetches new endpoint `GET /api/trainers/me/activity` which counts `ContactSubmission` rows where `trainerId == session.user.id` and `createdAt >= startOfWeek()`. Profile-views placeholder until tracking is built.

Pitfalls for future sessions:
- Adding a new short Section and wanting it to pair requires giving it `span="half"` AND confirming it sits between two other half-width siblings (or accepting a lone half-row). Do not re-add `<Section title="SERVICE MODES">` without `span="half"` — that would blow the symmetric pair row above it.
- The Activity card's count endpoint is at `/api/trainers/me/activity` — don't confuse with `/api/trainers/me` (PATCH-only) or `/api/trainers/me/profile` (full profile GET/PUT).
- The Share card's `publicUrl` is built from `window.location.origin` — safe inside a `'use client'` component but would need rethinking if this editor ever renders from a shared server-component path.
```

Then append one line to `.../memory/MEMORY.md`:

```markdown
- [Profile editor · form restructure + rail v2](project_profile_editor_v2.md) — paired sections at md:+, Share + Activity cards in rail, new /api/trainers/me/activity endpoint.
```

---

## Rollback

If a regression ships:

```bash
git revert HEAD~8..HEAD    # reverts Tasks 1–8 (memory files live outside git)
git push origin main
```

---

## Spec coverage self-check

| Spec requirement | Task |
| --- | --- |
| `Section` optional `span` prop defaulting to `'full'` | Task 1 |
| Form column `md:grid-cols-2` wrapper | Task 2 |
| 13 short sections marked `span="half"` | Task 3 |
| 6 adjacent pairs + Service Modes lone half | Task 3 |
| Full-width sections unchanged | Task 3 (omission) |
| Below 768px single-column unchanged | Task 1/2 Tailwind gating |
| GET `/api/trainers/me/activity` endpoint | Task 4 |
| Counts `ContactSubmission` rows this week for trainer | Task 4 |
| Requires trainer session | Task 4 |
| Cache-Control: private, no-store | Task 4 |
| `trainerSlug` exposed via profile GET | Task 5 |
| `TrainerProfile` interface + loader updated | Task 5 |
| Share card — public URL + copy + view live | Task 6 |
| Share card — muted state when private/no slug | Task 6 |
| Share card — no QR | Task 6 (omission — spec-compliant) |
| Activity card — applications-this-week counter | Task 7 |
| Activity card — View inbox link to /trainer/messages | Task 7 |
| Activity card — "Views coming soon" placeholder | Task 7 |
| Four cards wired in the aside | Task 8 |
| Preview → Checklist → Share → Activity order | Task 8 |
| Mobile/tablet/laptop regression-free | Task 9 manual pass |
| Personal QR feature untouched | All tasks (no files edited there) |
