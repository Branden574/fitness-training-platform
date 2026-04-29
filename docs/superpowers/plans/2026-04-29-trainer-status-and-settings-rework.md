# Trainer 3-State Status + Settings Page Rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the binary `trainerAcceptingClients` toggle with a three-state status (Accepting / Waitlist / Not Accepting) controlled via a segmented control + explicit Save button, capture "notify me" emails when a trainer is closed, and reorganize the trainer Settings page into three tabs to fix the wasted viewport and excessive scroll.

**Architecture:** Schema gets a new `TrainerClientStatus` enum and a `kind`/`notifiedAt` on `ContactSubmission`. The legacy boolean stays mirrored for rollback safety. A small one-shot backfill script flips today's `false` rows to `WAITLIST`. The trainer-side UI uses an explicit dirty-state Save button. The Settings page becomes a server-rendered shell that picks one of three tab contents from `searchParams.tab`. The apply page renders an email-only capture form when the trainer is `NOT_ACCEPTING`; the resulting `ContactSubmission` rows live in the existing applications inbox. When the trainer transitions out of `NOT_ACCEPTING`, a Resend mailer pings every captured email exactly once via a `notifiedAt` guard.

**Tech Stack:** Next.js 16 App Router · Prisma 6 · Zod · Resend · Tailwind 4 · NextAuth (existing `requireTrainerSession`).

**Spec:** [docs/superpowers/specs/2026-04-29-trainer-status-and-settings-rework-design.md](../specs/2026-04-29-trainer-status-and-settings-rework-design.md)

**Project conventions to honor:**
- Railway deploys main via `prisma db push --skip-generate` (no migrations, no `--accept-data-loss`). Schema changes must be additive only.
- Build-critical packages must live in `dependencies`, not `devDependencies`. We don't add either here, so this is just a hygiene reminder.
- Never run `npm run build` while `npm run dev` is active (Turbopack cache collision).
- This codebase has no test runner. Verification is `npm run lint`, `tsc --noEmit`, and manual browser smoke at `http://localhost:3000` against `npm run dev`.
- Never echo any portion of secret values when describing env vars to the user.

---

## File Structure

**New files:**
- `src/lib/trainerStatus.ts` — `TrainerClientStatus` type + display copy + boolean↔enum helpers.
- `src/lib/email/notifyWhenOpen.ts` — Resend mailer for the "trainer reopened" message.
- `src/app/api/trainers/[slug]/notify-me/route.ts` — public POST endpoint, idempotent.
- `src/app/apply/[trainerSlug]/notify-me-form.tsx` — client component with email input + submit state.
- `src/app/trainer/(v4)/settings/identity-strip.tsx` — server-rendered top-of-page strip (avatar + meta + actions).
- `src/app/trainer/(v4)/settings/sharing-card-client.tsx` — the 7/5 SHARING card (link + code + visibility + 3-state status, QR + downloads). Replaces the existing `sharing-panel-client.tsx`.
- `src/app/trainer/(v4)/settings/notifications-grid.tsx` — 4/8 + 7/5 notifications layout wrapping the existing pieces.
- `src/app/trainer/(v4)/settings/account-list.tsx` — right-column ACCOUNT card with biometric toggle row (rendered as `<div>` not `<button>` to avoid nested-button DOM warning).
- `src/app/trainer/(v4)/settings/referral-performance.tsx` — right-column KPI card (Applications + Accepted from `ContactSubmission`; sparkline of last 12 weeks).
- `src/app/trainer/(v4)/settings/coming-soon-card.tsx` — right-column dashed bullet list.
- `scripts/backfill-trainer-client-status.ts` — one-shot updateMany.

**Modified files:**
- `prisma/schema.prisma` — enums + `User.trainerClientStatus` + `ContactSubmission.kind` + `ContactSubmission.notifiedAt`.
- `src/app/api/trainers/me/route.ts` — accept `clientStatus`, mirror writes, trigger mailer on transition.
- `src/app/api/trainers/search/route.ts` — return `clientStatus`.
- `src/app/trainers/page.tsx` — pass `trainerClientStatus` through to `TrainerCard`.
- `src/app/trainers/trainer-card.tsx` — `StatusPill` adds `not_accepting` variant.
- `src/app/apply/[trainerSlug]/page.tsx` — render the `NOT_ACCEPTING` branch.
- `src/app/apply/apply-generic-client.tsx` — three-state pill.
- `src/app/t/[trainerSlug]/page.tsx` — pass `clientStatus` to the public profile.
- `src/app/trainer/(v4)/settings/page.tsx` — convert to tab shell.
- `src/app/trainer/(v4)/settings/sharing-panel-client.tsx` — replace STATUS toggle with segmented + Save; add 2-col desktop grid.

---

## Task 1: Schema additions

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the `TrainerClientStatus` enum**

Append near the bottom of `prisma/schema.prisma` (the file already has other enums grouped at the end — match existing style).

```prisma
enum TrainerClientStatus {
  ACCEPTING
  WAITLIST
  NOT_ACCEPTING
}

enum ContactSubmissionKind {
  APPLICATION
  NOTIFY_WHEN_OPEN
}
```

- [ ] **Step 2: Add the new field on `User`**

In `model User`, immediately after `trainerAcceptingClients Boolean @default(true)` (around line 96):

```prisma
  trainerClientStatus     TrainerClientStatus @default(ACCEPTING)
```

Keep the existing `trainerAcceptingClients` line — do not delete it.

- [ ] **Step 3: Add fields on `ContactSubmission`**

In `model ContactSubmission` (around line 710), add these two fields just before `createdAt`:

```prisma
  kind            ContactSubmissionKind @default(APPLICATION)
  notifiedAt      DateTime?
```

- [ ] **Step 4: Generate the Prisma client locally**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client …` with no errors. The new types `TrainerClientStatus` and `ContactSubmissionKind` are now exported from `@prisma/client`.

- [ ] **Step 5: Push the schema to your local dev database**

Run: `npx prisma db push --skip-generate`
Expected: `🚀  Your database is now in sync with your Prisma schema.` Adds two enums and three columns; no data loss. Should not prompt for `--accept-data-loss`.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add TrainerClientStatus enum + ContactSubmission.kind/notifiedAt"
```

---

## Task 2: Shared `trainerStatus` library

**Files:**
- Create: `src/lib/trainerStatus.ts`

- [ ] **Step 1: Write the helper module**

```ts
// src/lib/trainerStatus.ts
import type { TrainerClientStatus } from '@prisma/client';

export type TrainerStatus = TrainerClientStatus; // 'ACCEPTING' | 'WAITLIST' | 'NOT_ACCEPTING'

export const TRAINER_STATUSES: readonly TrainerStatus[] = [
  'ACCEPTING',
  'WAITLIST',
  'NOT_ACCEPTING',
] as const;

export const TRAINER_STATUS_LABELS: Record<TrainerStatus, string> = {
  ACCEPTING: 'Accepting',
  WAITLIST: 'Waitlist',
  NOT_ACCEPTING: 'Not accepting',
};

export const TRAINER_STATUS_DESCRIPTIONS: Record<TrainerStatus, string> = {
  ACCEPTING:
    'Your apply link shows the normal sign-up form.',
  WAITLIST:
    'Your apply link still works, but framed as joining your waitlist.',
  NOT_ACCEPTING:
    "Your apply form is hidden. Visitors can leave their email and we'll ping them when you flip back to Accepting or Waitlist.",
};

/** True if the apply page should render an apply-style form. */
export function statusShowsApplyForm(s: TrainerStatus): boolean {
  return s === 'ACCEPTING' || s === 'WAITLIST';
}

/** Mirror value for the legacy `trainerAcceptingClients` boolean. */
export function statusToLegacyBoolean(s: TrainerStatus): boolean {
  return s === 'ACCEPTING';
}

/** Backfill mapping from the legacy boolean. */
export function statusFromLegacyBoolean(b: boolean): TrainerStatus {
  return b ? 'ACCEPTING' : 'WAITLIST';
}

export function isTrainerStatus(v: unknown): v is TrainerStatus {
  return v === 'ACCEPTING' || v === 'WAITLIST' || v === 'NOT_ACCEPTING';
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors related to this file. (Existing pre-existing errors in the repo are not your concern; verify the file compiles by running `npx tsc --noEmit src/lib/trainerStatus.ts` if the full project check is noisy — but prefer the full check.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/trainerStatus.ts
git commit -m "feat(lib): trainerStatus helpers + label/description maps"
```

---

## Task 3: One-shot backfill script

**Files:**
- Create: `scripts/backfill-trainer-client-status.ts`

- [ ] **Step 1: Write the script**

```ts
// scripts/backfill-trainer-client-status.ts
//
// One-shot, idempotent. Maps existing `trainerAcceptingClients=false` rows to
// trainerClientStatus=WAITLIST so that today's externally-visible behavior
// (the directory pill rendered "waitlist" for `false`) is preserved.
//
// Run locally with prod DATABASE_URL set:
//   npx tsx scripts/backfill-trainer-client-status.ts
//
// Safe to run multiple times: only updates rows where status is still the
// default ACCEPTING but the legacy boolean is false.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      trainerAcceptingClients: false,
      trainerClientStatus: 'ACCEPTING',
    },
    data: {
      trainerClientStatus: 'WAITLIST',
    },
  });

  console.log(`Backfilled ${result.count} trainer(s) → WAITLIST.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Run it locally against your dev DB**

Run: `npx tsx scripts/backfill-trainer-client-status.ts`
Expected output: `Backfilled N trainer(s) → WAITLIST.` where N is the count of dev trainers who currently have `trainerAcceptingClients=false`. Likely 0 or a small number depending on your dev seed.

- [ ] **Step 3: Run it a second time to confirm idempotency**

Run: `npx tsx scripts/backfill-trainer-client-status.ts`
Expected: `Backfilled 0 trainer(s) → WAITLIST.`

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-trainer-client-status.ts
git commit -m "feat(scripts): one-shot backfill for trainerClientStatus"
```

---

## Task 4: PATCH `/api/trainers/me` accepts `clientStatus` + mirrors writes

**Files:**
- Modify: `src/app/api/trainers/me/route.ts`

- [ ] **Step 1: Read the current file**

Open `src/app/api/trainers/me/route.ts` and locate the existing Zod schema (around line 8 — `acceptingClients: z.boolean().optional()`) and the PATCH handler that writes `data.trainerAcceptingClients`.

- [ ] **Step 2: Extend the Zod schema and the write path**

Replace the existing schema block and the PATCH `data` assembly with:

```ts
import { z } from 'zod';
import { TRAINER_STATUSES, statusToLegacyBoolean } from '@/lib/trainerStatus';
import { sendNotifyWhenOpenForTrainer } from '@/lib/email/notifyWhenOpen';

const PatchSchema = z.object({
  // Legacy boolean — kept for one release; new clients should send clientStatus.
  acceptingClients: z.boolean().optional(),
  clientStatus: z.enum(TRAINER_STATUSES as unknown as [string, ...string[]]).optional(),
  isPublic: z.boolean().optional(), // existing — leave whatever shape was already here
});
```

(If the existing schema has additional fields like `isPublic`, preserve them — only the two status-related lines are new.)

- [ ] **Step 3: Build the update payload + capture prior status for transition detection**

In the PATCH handler, replace the existing `if (parsed.data.acceptingClients !== undefined) data.trainerAcceptingClients = ...` block with:

```ts
// Capture prior status before update so we can detect NOT_ACCEPTING → other.
const prior = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { trainerClientStatus: true },
});
const prevStatus = prior?.trainerClientStatus ?? 'ACCEPTING';

const data: Record<string, unknown> = {};

if (parsed.data.clientStatus !== undefined) {
  const next = parsed.data.clientStatus as 'ACCEPTING' | 'WAITLIST' | 'NOT_ACCEPTING';
  data.trainerClientStatus = next;
  data.trainerAcceptingClients = statusToLegacyBoolean(next);
} else if (parsed.data.acceptingClients !== undefined) {
  // Legacy callers — derive a status from the boolean.
  data.trainerAcceptingClients = parsed.data.acceptingClients;
  data.trainerClientStatus = parsed.data.acceptingClients ? 'ACCEPTING' : 'WAITLIST';
}

// Preserve existing handling for other fields like isPublic.
if (parsed.data.isPublic !== undefined) data.trainerIsPublic = parsed.data.isPublic;
```

- [ ] **Step 4: After the update, fire the mailer if we transitioned out of NOT_ACCEPTING**

Immediately after the existing `prisma.user.update({...})` call:

```ts
const nextStatus =
  (data.trainerClientStatus as 'ACCEPTING' | 'WAITLIST' | 'NOT_ACCEPTING' | undefined) ??
  prevStatus;

if (prevStatus === 'NOT_ACCEPTING' && nextStatus !== 'NOT_ACCEPTING') {
  // Fire-and-forget; failures are logged inside the helper and never break the PATCH.
  void sendNotifyWhenOpenForTrainer(session.user.id);
}
```

- [ ] **Step 5: Update the GET response shape**

In the GET handler, ensure the trainer object returns `trainerClientStatus` (and keep `trainerAcceptingClients` for now). Around the existing `trainerAcceptingClients: true` line in the `select`, add:

```ts
  trainerClientStatus: true,
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 new errors. (`sendNotifyWhenOpenForTrainer` will not exist yet — comment out the import + the `void sendNotifyWhenOpenForTrainer(...)` call until Task 6, OR do Tasks 5 + 6 before running this check. To stay strictly TDD, add a temporary stub in `src/lib/email/notifyWhenOpen.ts` here that we'll fill in at Task 6 — see Step 7.)

- [ ] **Step 7: Add a minimal stub for the mailer to keep this commit standalone**

Create `src/lib/email/notifyWhenOpen.ts` with just the signature so this task compiles:

```ts
// src/lib/email/notifyWhenOpen.ts
// Real implementation lands in Task 6.
export async function sendNotifyWhenOpenForTrainer(_trainerId: string): Promise<void> {
  /* stub — replaced in Task 6 */
}
```

- [ ] **Step 8: Re-run type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/trainers/me/route.ts src/lib/email/notifyWhenOpen.ts`
Expected: 0 new errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/trainers/me/route.ts src/lib/email/notifyWhenOpen.ts
git commit -m "feat(api): trainers/me accepts clientStatus + mirrors legacy boolean"
```

---

## Task 5: Public `POST /api/trainers/[slug]/notify-me`

**Files:**
- Create: `src/app/api/trainers/[slug]/notify-me/route.ts`

- [ ] **Step 1: Write the route**

```ts
// src/app/api/trainers/[slug]/notify-me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email().max(254),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const trainer = await prisma.user.findFirst({
    where: { trainerSlug: slug, role: 'TRAINER' },
    select: {
      id: true,
      trainerClientStatus: true,
      trainerIsPublic: true,
    },
  });
  if (!trainer) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (trainer.trainerClientStatus !== 'NOT_ACCEPTING') {
    // The trainer is already accepting in some form; clients should use the
    // normal apply flow. Return 409 so the UI can surface a "they reopened"
    // message and reload.
    return NextResponse.json(
      { error: 'Trainer is currently accepting' },
      { status: 409 },
    );
  }

  // Idempotency: if there's already an open NOTIFY_WHEN_OPEN row for
  // this (trainer, email), return ok without creating a duplicate.
  const existing = await prisma.contactSubmission.findFirst({
    where: {
      trainerId: trainer.id,
      email,
      kind: 'NOTIFY_WHEN_OPEN',
      notifiedAt: null,
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  await prisma.contactSubmission.create({
    data: {
      trainerId: trainer.id,
      email,
      // ContactSubmission.name and .message are required (non-nullable) in
      // the schema; fill defaults rather than relaxing the schema.
      name: email,
      message: '(notify me when reopen)',
      kind: 'NOTIFY_WHEN_OPEN',
      status: 'NEW',
    },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/trainers/[slug]/notify-me/route.ts`
Expected: 0 errors.

- [ ] **Step 3: Smoke test against dev**

With `npm run dev` running, take a trainer with `trainerSlug=branden-test` whose status you set to `NOT_ACCEPTING` directly via Prisma Studio (`npx prisma studio`) for testing.

Run:
```bash
curl -X POST http://localhost:3000/api/trainers/branden-test/notify-me \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com"}'
```
Expected: `{"ok":true}` and a row in `ContactSubmission` with `kind=NOTIFY_WHEN_OPEN`. Run again — expect `{"ok":true,"deduped":true}`.

- [ ] **Step 4: Commit**

```bash
git add 'src/app/api/trainers/[slug]/notify-me/route.ts'
git commit -m "feat(api): public POST /trainers/[slug]/notify-me with idempotency"
```

---

## Task 6: Mailer for "trainer reopened"

**Files:**
- Modify: `src/lib/email/notifyWhenOpen.ts` (replacing the stub from Task 4)

- [ ] **Step 1: Inspect how Resend is wired in the codebase**

Run: `grep -rln "from 'resend'\|from \"resend\"" src/lib`
Expected: at least one existing helper (likely `src/lib/email.ts` or similar) that constructs a `Resend` client. Reuse whatever pattern exists there for consistency. If none exists, the helper below uses `RESEND_API_KEY` directly.

- [ ] **Step 2: Replace the stub with the real implementation**

```ts
// src/lib/email/notifyWhenOpen.ts
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM ?? 'RepLab <noreply@replabusa.com>';
const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://replabusa.com';

/**
 * Sends a one-shot "your trainer reopened" email to every ContactSubmission
 * row for this trainer where kind=NOTIFY_WHEN_OPEN and notifiedAt is null.
 * Marks each row's notifiedAt so we never re-send. Failures are logged but
 * never thrown — callers fire-and-forget.
 */
export async function sendNotifyWhenOpenForTrainer(trainerId: string): Promise<void> {
  try {
    const trainer = await prisma.user.findUnique({
      where: { id: trainerId },
      select: { name: true, trainerSlug: true },
    });
    if (!trainer || !trainer.trainerSlug) return;

    const rows = await prisma.contactSubmission.findMany({
      where: {
        trainerId,
        kind: 'NOTIFY_WHEN_OPEN',
        notifiedAt: null,
      },
      select: { id: true, email: true },
    });
    if (rows.length === 0) return;

    const trainerName = trainer.name ?? 'Your trainer';
    const applyUrl = `${APP_BASE_URL}/apply/${trainer.trainerSlug}`;

    for (const row of rows) {
      try {
        if (resend) {
          await resend.emails.send({
            from: FROM,
            to: row.email,
            subject: `${trainerName} just reopened on RepLab`,
            text:
              `${trainerName} is taking new clients again on RepLab.\n\n` +
              `Apply here: ${applyUrl}\n\n` +
              `— RepLab`,
          });
        } else {
          console.warn(
            '[notifyWhenOpen] RESEND_API_KEY missing; would have emailed',
            row.email,
          );
        }
        await prisma.contactSubmission.update({
          where: { id: row.id },
          data: { notifiedAt: new Date() },
        });
      } catch (err) {
        console.error('[notifyWhenOpen] send failed for row', row.id, err);
        // Do NOT mark notifiedAt on failure — we want to retry on next
        // status transition.
      }
    }
  } catch (err) {
    console.error('[notifyWhenOpen] outer failure', err);
  }
}
```

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/lib/email/notifyWhenOpen.ts`
Expected: 0 errors.

- [ ] **Step 4: Smoke test the mailer path locally**

Steps:
1. Set the trainer's status to `NOT_ACCEPTING` via Prisma Studio.
2. Hit `POST /api/trainers/<slug>/notify-me` with a real email you control.
3. Set `RESEND_API_KEY` in `.env.local` (if not already set) so a real email is dispatched. If you don't want to send a real email, leave it unset — the helper logs and still marks `notifiedAt`.
4. Trigger the transition by `PATCH`ing `/api/trainers/me` with `{ "clientStatus": "ACCEPTING" }` while signed in as that trainer.
5. Confirm the row's `notifiedAt` is now set in the DB.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/notifyWhenOpen.ts
git commit -m "feat(email): notifyWhenOpen mailer with notifiedAt idempotency"
```

---

## Task 7: Rebuild the SHARING card to match the Claude-Design 7/5 split (with 3-state Status + Save)

**Files:**
- Create: `src/app/trainer/(v4)/settings/sharing-card-client.tsx`
- Delete (after Task 8 is wired): `src/app/trainer/(v4)/settings/sharing-panel-client.tsx`

**Reference:** `screens_trainer_settings.jsx` from the Claude-Design bundle, lines 134–242 (the SHARING SCard with the 7/5 grid). Use the existing `mf-card`, `mf-eyebrow`, `mf-input`, `mf-btn`, `mf-fg-mute`, `mf-fg-dim`, `mf-hairline` tokens — every primitive in the design has an `mf-*` equivalent in this codebase.

- [ ] **Step 1: Create the new client component**

```tsx
// src/app/trainer/(v4)/settings/sharing-card-client.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  TRAINER_STATUSES,
  TRAINER_STATUS_LABELS,
  type TrainerStatus,
} from '@/lib/trainerStatus';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function SharingCardClient({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [slug, setSlug] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  const [isPublic, setIsPublic] = useState(false);
  const [savedStatus, setSavedStatus] = useState<TrainerStatus>('ACCEPTING');
  const [pendingStatus, setPendingStatus] = useState<TrainerStatus>('ACCEPTING');
  const [statusSave, setStatusSave] = useState<SaveState>('idle');

  useEffect(() => {
    (async () => {
      const [identityRes, meRes] = await Promise.all([
        fetch('/api/trainers/me/ensure-identity', { method: 'POST' }),
        fetch('/api/trainers/me'),
      ]);
      if (identityRes.ok) {
        const data = await identityRes.json();
        setSlug(data.slug);
        setCode(data.referralCode);
      }
      if (meRes.ok) {
        const me = await meRes.json();
        const s: TrainerStatus =
          me.trainerClientStatus ??
          (me.trainerAcceptingClients ? 'ACCEPTING' : 'WAITLIST');
        setSavedStatus(s);
        setPendingStatus(s);
        setIsPublic(Boolean(me.trainerIsPublic));
      }
      setBootstrapped(true);
    })();
    // No deps mutated inside the effect — keep deps empty.
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = slug ? `${origin}/apply/${slug}` : '';

  const copy = async (text: string, kind: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* no-op */
    }
  };

  const togglePublic = async (next: boolean) => {
    setIsPublic(next);
    await fetch('/api/trainers/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: next }),
    });
  };

  const dirty = pendingStatus !== savedStatus;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const saveStatus = async () => {
    if (!dirty) return;
    setStatusSave('saving');
    try {
      const res = await fetch('/api/trainers/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientStatus: pendingStatus }),
      });
      if (!res.ok) throw new Error('save failed');
      setSavedStatus(pendingStatus);
      setStatusSave('saved');
      setTimeout(() => setStatusSave('idle'), 2000);
    } catch {
      setStatusSave('error');
    }
  };

  return (
    <section>
      <div className="mf-eyebrow" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span>SHARING</span>
        <span className="mf-fg-mute" style={{ fontFamily: 'var(--font-mf-mono), monospace', fontSize: 10 }}>
          YOUR REFERRAL CHANNELS
        </span>
      </div>

      <div className="mf-card" style={{ padding: 0 }}>
        <div className="mf-sharing-grid">
          {/* LEFT 7/12: link + code + visibility/status row */}
          <div className="mf-sharing-left" style={{ padding: 20, borderRight: '1px solid var(--mf-hairline, #1F1F22)' }}>
            <div className="mf-eyebrow" style={{ marginBottom: 8 }}>PERSONAL LINK</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input
                className="mf-input"
                readOnly
                value={bootstrapped ? link : 'Generating…'}
                style={{ flex: 1, fontFamily: 'var(--font-mf-mono), monospace', fontSize: 12, height: 36 }}
              />
              <button
                type="button"
                onClick={() => copy(link, 'link')}
                disabled={!link}
                className="mf-btn"
                style={{ height: 36 }}
              >
                {copied === 'link' ? 'COPIED ✓' : 'COPY'}
              </button>
            </div>
            <div className="mf-fg-mute" style={{ fontSize: 11, marginBottom: 20 }}>
              Add to Instagram bio, TikTok, business cards.
            </div>

            <div className="mf-eyebrow" style={{ marginBottom: 8 }}>TRAINER CODE</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <div
                style={{
                  padding: '8px 16px',
                  background: 'var(--mf-surface-2, #0E0E10)',
                  border: '1px solid var(--mf-hairline-strong, #2E2E33)',
                  borderRadius: 4,
                  fontFamily: 'var(--font-mf-mono), monospace',
                  fontSize: 18,
                  letterSpacing: '0.18em',
                }}
              >
                {code ?? 'MF-—'}
              </div>
              <button
                type="button"
                onClick={() => copy(code ?? '', 'code')}
                disabled={!code}
                className="mf-btn"
                style={{ height: 36 }}
              >
                {copied === 'code' ? 'COPIED ✓' : 'COPY'}
              </button>
            </div>
            <div className="mf-fg-mute" style={{ fontSize: 11, marginBottom: 20 }}>
              Share over the phone or in conversation. Clients enter at /apply.
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                paddingTop: 16,
                borderTop: '1px solid var(--mf-hairline, #1F1F22)',
              }}
            >
              {/* Visibility — 2-segment, auto-save */}
              <div>
                <div className="mf-eyebrow" style={{ marginBottom: 8 }}>VISIBILITY</div>
                <Segmented
                  options={[
                    { value: 'private', label: 'Private' },
                    { value: 'public', label: 'Public' },
                  ]}
                  value={isPublic ? 'public' : 'private'}
                  onChange={(v) => togglePublic(v === 'public')}
                />
              </div>
              {/* Status — 3-segment, dirty-state + Save */}
              <div>
                <div className="mf-eyebrow" style={{ marginBottom: 8 }}>STATUS</div>
                <Segmented
                  options={TRAINER_STATUSES.map((s) => ({
                    value: s,
                    label: TRAINER_STATUS_LABELS[s],
                  }))}
                  value={pendingStatus}
                  onChange={(v) => setPendingStatus(v as TrainerStatus)}
                />
              </div>
            </div>

            {dirty && (
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  onClick={saveStatus}
                  disabled={statusSave === 'saving'}
                  className="mf-btn"
                  style={{
                    height: 32,
                    background: 'var(--mf-accent, #FF4D1C)',
                    color: 'var(--mf-accent-ink, #0A0A0B)',
                    borderColor: 'var(--mf-accent, #FF4D1C)',
                    fontWeight: 600,
                  }}
                >
                  {statusSave === 'saving'
                    ? 'SAVING…'
                    : statusSave === 'error'
                    ? 'TRY AGAIN'
                    : 'SAVE STATUS'}
                </button>
                <span className="mf-fg-mute" style={{ fontSize: 11 }}>
                  Unsaved change to status.
                </span>
              </div>
            )}
          </div>

          {/* RIGHT 5/12: QR */}
          <div className="mf-sharing-right" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
            <div className="mf-eyebrow" style={{ marginBottom: 8 }}>QR CODE</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/api/trainers/qr?format=png"
                alt="QR code for your apply link"
                width={128}
                height={128}
                style={{ borderRadius: 4, background: '#0A0A0B', flexShrink: 0 }}
              />
              <div style={{ display: 'grid', gap: 8, flex: 1 }}>
                <a href="/api/trainers/qr?format=png" download className="mf-btn" style={{ height: 36, justifyContent: 'flex-start' }}>
                  Download PNG
                </a>
                <a href="/api/trainers/qr?format=svg" download className="mf-btn" style={{ height: 36, justifyContent: 'flex-start' }}>
                  Download SVG
                </a>
              </div>
            </div>
            <div className="mf-fg-mute" style={{ fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>
              Scans deep-link to your apply page — works in Instagram Stories, gym posters, business cards.
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mf-sharing-grid {
          display: grid;
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .mf-sharing-grid {
            grid-template-columns: 7fr 5fr;
          }
        }
        @media (max-width: 1023px) {
          .mf-sharing-left {
            border-right: none !important;
            border-bottom: 1px solid var(--mf-hairline, #1F1F22);
          }
        }
      `}</style>
    </section>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      style={{
        display: 'flex',
        padding: 2,
        background: 'var(--mf-surface-2, #0E0E10)',
        border: '1px solid var(--mf-hairline-strong, #2E2E33)',
        borderRadius: 4,
        gap: 0,
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: 11,
              fontFamily: 'var(--font-mf-mono), monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: active ? 'var(--mf-accent, #FF4D1C)' : 'transparent',
              color: active ? 'var(--mf-accent-ink, #0A0A0B)' : 'var(--mf-fg-dim, #888)',
              fontWeight: active ? 600 : 500,
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

The `Segmented` helper is local to this file because it's only used here twice (visibility, status). If a third call site appears later, lift it into `src/components/ui/mf/`.

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint 'src/app/trainer/(v4)/settings/sharing-card-client.tsx'`
Expected: 0 new errors.

- [ ] **Step 3: Commit (component standalone — page wiring lands in Task 8)**

```bash
git add 'src/app/trainer/(v4)/settings/sharing-card-client.tsx'
git commit -m "feat(trainer-settings): SHARING card with 7/5 split + 3-state status save"
```

---

## Task 8: Build the right-column server components (Account list + Referral KPIs + Coming soon)

**Files:**
- Create: `src/app/trainer/(v4)/settings/account-list.tsx`
- Create: `src/app/trainer/(v4)/settings/referral-performance.tsx`
- Create: `src/app/trainer/(v4)/settings/coming-soon-card.tsx`

- [ ] **Step 1: Account list (right-column ACCOUNT card)**

```tsx
// src/app/trainer/(v4)/settings/account-list.tsx
import Link from 'next/link';
import { ChevronRight, Lock, User, MessageSquare, TrendingUp, Shield } from 'lucide-react';
import BiometricToggle from '@/components/auth/BiometricToggle';

type StaticRow = {
  href: string;
  label: string;
  sub: string;
  Icon: typeof Lock;
};

const ROWS: StaticRow[] = [
  { href: '/auth/change-password',           label: 'Change password',         sub: 'Last changed in account settings', Icon: Lock },
  { href: '/trainer/settings/profile',       label: 'Edit public profile',     sub: 'Photo, bio, specialties, rates',   Icon: User },
  { href: '/trainer/settings/testimonials',  label: 'Manage testimonials',     sub: 'Published + pending entries',      Icon: MessageSquare },
  { href: '/trainer/settings/transformations', label: 'Manage transformations', sub: 'Client before / afters',          Icon: TrendingUp },
];

export function AccountList() {
  return (
    <section>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>ACCOUNT</div>
      <div className="mf-card" style={{ padding: '4px 16px' }}>
        {ROWS.map((row, i) => {
          const Icon = row.Icon;
          return (
            <Link
              key={row.href}
              href={row.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid var(--mf-hairline, #1F1F22)',
                textDecoration: 'none',
                color: 'var(--mf-fg, #fff)',
              }}
            >
              <Icon size={14} className="mf-fg-mute" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, lineHeight: 1.2 }}>{row.label}</div>
                <div className="mf-fg-mute" style={{ fontSize: 11, marginTop: 2 }}>{row.sub}</div>
              </div>
              <ChevronRight size={13} className="mf-fg-mute" style={{ flexShrink: 0 }} />
            </Link>
          );
        })}
        {/* Biometric — render as <div>, not <button>, because the inline Toggle inside
            BiometricToggle is itself a button. Avoid nested-button DOM warning. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 0',
          }}
        >
          <Shield size={14} className="mf-fg-mute" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, lineHeight: 1.2 }}>Biometric sign-in</div>
            <div className="mf-fg-mute" style={{ fontSize: 11, marginTop: 2 }}>
              Face ID / Touch ID where supported
            </div>
          </div>
          <BiometricToggle />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Referral performance card (Applications + Accepted only in v1)**

```tsx
// src/app/trainer/(v4)/settings/referral-performance.tsx
import { prisma } from '@/lib/prisma';
import { Sparkline } from '@/components/ui/mf';

async function loadKpis(trainerId: string) {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [apps, accepted, weekly] = await Promise.all([
    prisma.contactSubmission.count({
      where: {
        trainerId,
        kind: 'APPLICATION',
        createdAt: { gte: since30 },
      },
    }),
    prisma.contactSubmission.count({
      where: {
        trainerId,
        kind: 'APPLICATION',
        status: 'CONVERTED',
        createdAt: { gte: since30 },
      },
    }),
    prisma.contactSubmission.findMany({
      where: { trainerId, kind: 'APPLICATION' },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Bucket by week — last 12 weeks.
  const buckets = new Array(12).fill(0);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const row of weekly) {
    const ageWeeks = Math.floor((now - row.createdAt.getTime()) / weekMs);
    if (ageWeeks >= 0 && ageWeeks < 12) buckets[11 - ageWeeks] += 1;
  }
  return { apps, accepted, weekly: buckets };
}

export async function ReferralPerformance({ trainerId }: { trainerId: string }) {
  const { apps, accepted, weekly } = await loadKpis(trainerId);
  const acceptedPct = apps > 0 ? Math.round((accepted / apps) * 100) : 0;

  return (
    <section>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>REFERRAL PERFORMANCE</div>
      <div className="mf-card" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
          <div>
            <div className="mf-fg-mute" style={{ fontFamily: 'var(--font-mf-mono), monospace', fontSize: 9, marginBottom: 2 }}>
              APPLICATIONS · 30D
            </div>
            <div style={{ fontFamily: 'var(--font-mf-display), sans-serif', fontSize: 22, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {apps}
            </div>
          </div>
          <div>
            <div className="mf-fg-mute" style={{ fontFamily: 'var(--font-mf-mono), monospace', fontSize: 9, marginBottom: 2 }}>
              ACCEPTED · 30D
            </div>
            <div style={{ fontFamily: 'var(--font-mf-display), sans-serif', fontSize: 22, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {accepted}
            </div>
            <div className="mf-fg-mute" style={{ fontFamily: 'var(--font-mf-mono), monospace', fontSize: 10, marginTop: 4 }}>
              {acceptedPct}% of apps
            </div>
          </div>
        </div>
        {weekly.some((n) => n > 0) && (
          <div style={{ paddingTop: 12, marginTop: 12, borderTop: '1px solid var(--mf-hairline, #1F1F22)' }}>
            <Sparkline data={weekly} />
          </div>
        )}
      </div>
    </section>
  );
}
```

(If `Sparkline`'s prop signature differs from `{ data: number[] }`, adjust the call site to match it. Inspect `src/components/ui/mf/Sparkline.tsx` first.)

If `ContactSubmission.status` does not have a `CONVERTED` value in this codebase, replace the `status: 'CONVERTED'` filter with whatever value the schema actually uses for "accepted" (look at the `ContactStatus` enum). If no such state exists, drop the Accepted KPI entirely and keep only Applications — do **not** invent fake data.

- [ ] **Step 3: Coming-soon card**

```tsx
// src/app/trainer/(v4)/settings/coming-soon-card.tsx
const ITEMS = [
  'Default session times',
  'Availability windows',
  'Auto-reply templates',
  'Public directory listing v2',
];

export function ComingSoonCard() {
  return (
    <section>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>COMING IN PHASE 2</div>
      <div className="mf-card" style={{ padding: 16, borderStyle: 'dashed' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
          {ITEMS.map((label) => (
            <li
              key={label}
              className="mf-fg-dim"
              style={{ display: 'flex', gap: 8, fontSize: 12 }}
            >
              <span className="mf-fg-mute" style={{ fontFamily: 'var(--font-mf-mono), monospace', fontSize: 10, marginTop: 2 }}>·</span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint 'src/app/trainer/(v4)/settings/account-list.tsx' 'src/app/trainer/(v4)/settings/referral-performance.tsx' 'src/app/trainer/(v4)/settings/coming-soon-card.tsx'`
Expected: 0 new errors.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/trainer/(v4)/settings/account-list.tsx' 'src/app/trainer/(v4)/settings/referral-performance.tsx' 'src/app/trainer/(v4)/settings/coming-soon-card.tsx'
git commit -m "feat(trainer-settings): right-column blocks (account, referral KPIs, phase-2 card)"
```

---

## Task 9: Identity strip + dashboard `page.tsx` assembly

**Files:**
- Create: `src/app/trainer/(v4)/settings/identity-strip.tsx`
- Modify: `src/app/trainer/(v4)/settings/page.tsx`
- Delete: `src/app/trainer/(v4)/settings/sharing-panel-client.tsx` (superseded by `sharing-card-client.tsx` from Task 7)

- [ ] **Step 1: Identity strip (server component)**

```tsx
// src/app/trainer/(v4)/settings/identity-strip.tsx
import Link from 'next/link';
import { Avatar } from '@/components/ui/mf';
import type { TrainerClientStatus } from '@prisma/client';
import { TRAINER_STATUS_LABELS } from '@/lib/trainerStatus';

export function IdentityStrip({
  name,
  email,
  code,
  status,
  isPublic,
}: {
  name: string;
  email: string;
  code: string | null;
  status: TrainerClientStatus;
  isPublic: boolean;
}) {
  const statusDot =
    status === 'ACCEPTING'    ? 'var(--mf-green, #2BD985)' :
    status === 'WAITLIST'     ? 'var(--mf-amber, #F5B544)' :
                                'var(--mf-fg-mute, #6E6E76)';

  const initials =
    (name || email)
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '—';

  return (
    <div
      className="mf-card"
      style={{
        padding: 20,
        marginBottom: 20,
        display: 'flex',
        gap: 20,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Avatar initials={initials} size={56} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-mf-display), sans-serif',
            fontSize: 22,
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          {name || 'Unnamed trainer'}
        </div>
        <div
          className="mf-fg-mute"
          style={{
            fontFamily: 'var(--font-mf-mono), monospace',
            fontSize: 11,
            marginTop: 6,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span>{email}</span>
          {code && (
            <>
              <span>·</span>
              <span>MF-{code}</span>
            </>
          )}
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: 999,
                background: statusDot,
              }}
            />
            {TRAINER_STATUS_LABELS[status].toUpperCase()}
          </span>
          <span>·</span>
          <span>{isPublic ? 'PUBLIC LISTING' : 'PRIVATE — DIRECT LINK'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href="/trainer/settings/profile" className="mf-btn" style={{ height: 36 }}>
          Edit profile
        </Link>
        <Link href="/auth/change-password" className="mf-btn" style={{ height: 36 }}>
          Change password
        </Link>
        <Link href="/api/auth/signout" className="mf-btn" style={{ height: 36 }}>
          Sign out
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the page as the dashboard shell**

Replace the entire body of `src/app/trainer/(v4)/settings/page.tsx`:

```tsx
import { requireTrainerSession } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import { DesktopShell } from '@/components/ui/mf';
import { IdentityStrip } from './identity-strip';
import SharingCardClient from './sharing-card-client';
import NotificationPreferences from '@/components/notifications/NotificationPreferences';
import { AccountList } from './account-list';
import { ReferralPerformance } from './referral-performance';
import { ComingSoonCard } from './coming-soon-card';

export const dynamic = 'force-dynamic';

export default async function TrainerSettingsPage() {
  const session = await requireTrainerSession();

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      trainerReferralCode: true,
      trainerClientStatus: true,
      trainerIsPublic: true,
    },
  });

  return (
    <DesktopShell
      role="trainer"
      active="settings"
      title="Settings"
      breadcrumbs="TRAINER / SETTINGS"
    >
      <div style={{ padding: 24, maxWidth: 1320, margin: '0 auto' }}>
        <IdentityStrip
          name={me?.name ?? ''}
          email={me?.email ?? session.user.email ?? ''}
          code={me?.trainerReferralCode ?? null}
          status={me?.trainerClientStatus ?? 'ACCEPTING'}
          isPublic={Boolean(me?.trainerIsPublic)}
        />

        <div className="mf-settings-grid" style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr' }}>
          {/* LEFT 8/12: Sharing + Notifications */}
          <div style={{ display: 'grid', gap: 20 }}>
            <SharingCardClient />
            <section>
              <div className="mf-eyebrow" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span>NOTIFICATION PREFERENCES</span>
                <span className="mf-fg-mute" style={{ fontFamily: 'var(--font-mf-mono), monospace', fontSize: 10 }}>
                  CHANGES SAVE AUTOMATICALLY
                </span>
              </div>
              <NotificationPreferences />
            </section>
          </div>

          {/* RIGHT 4/12: Account + Referral KPIs + Coming soon */}
          <div style={{ display: 'grid', gap: 20 }}>
            <AccountList />
            <ReferralPerformance trainerId={session.user.id} />
            <ComingSoonCard />
          </div>
        </div>

        {/* Inline media-query: 8/4 grid at ≥1024px */}
        <style>{`
          @media (min-width: 1024px) {
            .mf-settings-grid {
              grid-template-columns: 8fr 4fr !important;
              align-items: start;
            }
          }
        `}</style>
      </div>
    </DesktopShell>
  );
}
```

- [ ] **Step 3: Delete the old `sharing-panel-client.tsx`**

```bash
git rm 'src/app/trainer/(v4)/settings/sharing-panel-client.tsx'
```

If anything else still imports it, search and replace:

```bash
grep -rn "sharing-panel-client" src 2>/dev/null
```

Update any straggler imports to point at `./sharing-card-client`.

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint 'src/app/trainer/(v4)/settings'`
Expected: 0 new errors.

- [ ] **Step 5: Manual browser smoke (full dashboard)**

With `npm run dev` running at `http://localhost:3000`:

- Visit `/trainer/settings` at viewport ≥1280px:
  - Identity strip renders with avatar, name, email · code · status dot · visibility chip, and the three action buttons stacked to the right.
  - Below it: 8/4 grid. Left has SHARING (7/5 split: link/code/visibility/status segs on left, QR on right) then NOTIFICATIONS. Right has ACCOUNT list (with Biometric toggle row, no console warnings about nested buttons), REFERRAL PERFORMANCE, COMING IN PHASE 2.
  - Page fits a 1080p monitor with at most one screen of scroll for the notifications grid.
- Resize to 800px wide:
  - Grid collapses to a single column. Identity strip's actions wrap below.
- Click STATUS → Waitlist → SAVE STATUS button appears, page header / card region shows "Unsaved change to status." → click SAVE → button disappears, value persists across refresh.
- Click VISIBILITY → Public → setting persists immediately (no save button).
- Open DevTools console — no nested-button warnings (the Biometric row is a `<div>` per Step 1).

- [ ] **Step 6: Commit**

```bash
git add 'src/app/trainer/(v4)/settings/identity-strip.tsx' 'src/app/trainer/(v4)/settings/page.tsx'
git commit -m "feat(trainer-settings): 12-col dashboard layout with identity strip"
```

---

## Task 10: Apply page renders the `NOT_ACCEPTING` branch

**Files:**
- Create: `src/app/apply/[trainerSlug]/notify-me-form.tsx`
- Modify: `src/app/apply/[trainerSlug]/page.tsx`

- [ ] **Step 1: Build the notify-me client form**

```tsx
// src/app/apply/[trainerSlug]/notify-me-form.tsx
'use client';

import { useState } from 'react';

export default function NotifyMeForm({
  slug,
  trainerName,
}: {
  slug: string;
  trainerName: string;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error' | 'reopened'>(
    'idle',
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState('submitting');
    try {
      const res = await fetch(`/api/trainers/${slug}/notify-me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 409) {
        setState('reopened');
        return;
      }
      if (!res.ok) {
        setState('error');
        return;
      }
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div
        className="mf-card"
        style={{ padding: 24, textAlign: 'center', borderStyle: 'dashed' }}
      >
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>NOTIFY LIST</div>
        <div style={{ fontSize: 14 }}>
          Got it — we&apos;ll email you the moment {trainerName} reopens.
        </div>
      </div>
    );
  }

  if (state === 'reopened') {
    return (
      <div
        className="mf-card"
        style={{ padding: 24, textAlign: 'center', borderStyle: 'dashed' }}
      >
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>GOOD NEWS</div>
        <div style={{ fontSize: 14, marginBottom: 12 }}>
          {trainerName} just reopened. Refresh to apply.
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mf-btn"
          style={{ height: 40 }}
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mf-card"
      style={{ padding: 24, display: 'grid', gap: 12 }}
    >
      <div className="mf-eyebrow">NOT TAKING NEW CLIENTS RIGHT NOW</div>
      <div style={{ fontSize: 14, lineHeight: 1.5 }}>
        {trainerName} isn&apos;t taking new clients right now. Drop your email and we&apos;ll
        let you know the moment they reopen.
      </div>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="mf-input"
        style={{ height: 40 }}
      />
      <button
        type="submit"
        disabled={state === 'submitting'}
        className="mf-btn"
        style={{ height: 40 }}
      >
        {state === 'submitting' ? 'SENDING…' : 'Notify me'}
      </button>
      {state === 'error' && (
        <div role="alert" style={{ fontSize: 12, color: '#fca5a5' }}>
          Something went wrong. Try again in a moment.
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Modify the apply page to branch on status**

In `src/app/apply/[trainerSlug]/page.tsx`:

a. Update the `select` block (around line 28) to also fetch `trainerClientStatus`:

```ts
trainerClientStatus: true,
```
(Keep the existing `trainerAcceptingClients: true` line.)

b. Replace the existing `{!trainer.trainerAcceptingClients && (...)}` banner block (around line 63) and the form rendering with status-aware branching:

```tsx
import NotifyMeForm from './notify-me-form';
import { statusShowsApplyForm } from '@/lib/trainerStatus';

// inside the JSX where the apply form / waitlist banner currently render:
{trainer.trainerClientStatus === 'NOT_ACCEPTING' ? (
  <NotifyMeForm
    slug={trainer.trainerSlug ?? ''}
    trainerName={trainer.name ?? 'This trainer'}
  />
) : (
  <>
    {trainer.trainerClientStatus === 'WAITLIST' && (
      // existing waitlist banner — keep its JSX exactly as-is
      ...
    )}
    {/* existing <ApplyForm ... waitlist={trainer.trainerClientStatus === 'WAITLIST'} /> */}
  </>
)}
```

(Replace the boolean `!trainer.trainerAcceptingClients` references with the enum check `trainer.trainerClientStatus === 'WAITLIST'` for the existing waitlist UI, and the form's `waitlist` prop becomes `trainer.trainerClientStatus === 'WAITLIST'`. The helper `statusShowsApplyForm()` is imported but not strictly required here — keep it imported for clarity if you reuse it elsewhere.)

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint 'src/app/apply/[trainerSlug]'`
Expected: 0 new errors.

- [ ] **Step 4: Manual browser smoke for all three states**

Set the test trainer's `trainerClientStatus` via Prisma Studio:
- `ACCEPTING` → `/apply/<slug>` shows the normal apply form, no banner.
- `WAITLIST` → form renders with the existing waitlist banner.
- `NOT_ACCEPTING` → apply form is hidden; the email-only NotifyMeForm renders. Submit a test email → "Got it — we'll email you…" Submit again with the same email → still success (deduped server-side).

- [ ] **Step 5: Commit**

```bash
git add 'src/app/apply/[trainerSlug]/page.tsx' 'src/app/apply/[trainerSlug]/notify-me-form.tsx'
git commit -m "feat(apply): render NOT_ACCEPTING email-capture branch"
```

---

## Task 11: 3-state pill on the multi-trainer apply page

**Files:**
- Modify: `src/app/apply/apply-generic-client.tsx`
- Modify: `src/app/api/trainers/search/route.ts`

- [ ] **Step 1: Have search return `clientStatus`**

In `src/app/api/trainers/search/route.ts`:

a. In the `select` block (around line 38), add:

```ts
trainerClientStatus: true,
```

b. In the response shape (around line 52), replace `acceptingClients: t.trainerAcceptingClients` with:

```ts
clientStatus: t.trainerClientStatus,
acceptingClients: t.trainerAcceptingClients, // legacy — remove in a follow-up release
```

- [ ] **Step 2: Update the apply-generic client to render a 3-state pill**

In `src/app/apply/apply-generic-client.tsx`:

a. Update the trainer row type (around line 13):

```ts
type TrainerRow = {
  id: string;
  name: string;
  initials: string;
  acceptingClients: boolean;          // legacy, kept for fallback
  clientStatus?: 'ACCEPTING' | 'WAITLIST' | 'NOT_ACCEPTING';
};
```

b. Replace the existing `{r.acceptingClients && (...)}` block (around line 153):

```tsx
{(() => {
  const status: 'ACCEPTING' | 'WAITLIST' | 'NOT_ACCEPTING' =
    r.clientStatus ?? (r.acceptingClients ? 'ACCEPTING' : 'WAITLIST');
  const text =
    status === 'ACCEPTING'
      ? '● accepting'
      : status === 'WAITLIST'
      ? '· waitlist'
      : '· closed';
  return (
    <span className="mf-fg-dim" style={{ fontSize: 10 }}>
      {text}
    </span>
  );
})()}
```

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/app/apply src/app/api/trainers/search`
Expected: 0 new errors.

- [ ] **Step 4: Browser smoke**

Visit `/apply` on a multi-trainer account and confirm each row shows the right pill matching the trainer's status.

- [ ] **Step 5: Commit**

```bash
git add src/app/apply/apply-generic-client.tsx src/app/api/trainers/search/route.ts
git commit -m "feat(apply): 3-state pill on multi-trainer apply landing"
```

---

## Task 12: Trainer card `StatusPill` adds `not_accepting` variant

**Files:**
- Modify: `src/app/trainers/trainer-card.tsx`
- Modify: `src/app/trainers/page.tsx`

- [ ] **Step 1: Extend the prop type and add the new variant style**

In `src/app/trainers/trainer-card.tsx`:

a. Update the trainer prop type (around line 13). Replace `trainerAcceptingClients: boolean` with:

```ts
trainerClientStatus: 'ACCEPTING' | 'WAITLIST' | 'NOT_ACCEPTING';
```

b. Find the `StatusPill` component (or inline `<StatusPill kind={...} />` consumer at line 80). Replace:

```tsx
<StatusPill kind={trainer.trainerAcceptingClients ? 'accepting' : 'waitlist'} />
```

with:

```tsx
<StatusPill
  kind={
    trainer.trainerClientStatus === 'ACCEPTING'
      ? 'accepting'
      : trainer.trainerClientStatus === 'WAITLIST'
      ? 'waitlist'
      : 'not_accepting'
  }
/>
```

c. Find the `StatusPill` definition (same file). Extend its `kind` union and add a third style branch:

```tsx
type PillKind = 'accepting' | 'waitlist' | 'not_accepting';

function StatusPill({ kind }: { kind: PillKind }) {
  const config: Record<PillKind, { label: string; bg: string; fg: string }> = {
    accepting:    { label: 'Accepting',     bg: 'rgba(34,197,94,0.12)', fg: '#86efac' },
    waitlist:     { label: 'Waitlist',      bg: 'rgba(234,179,8,0.12)', fg: '#fde68a' },
    not_accepting:{ label: 'Not accepting', bg: 'rgba(255,255,255,0.06)', fg: '#9aa0a6' },
  };
  const c = config[kind];
  return (
    <span
      style={{
        fontSize: 11,
        padding: '4px 10px',
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
      }}
    >
      {c.label}
    </span>
  );
}
```

(If the existing pill already has different styling tokens, preserve those tokens — only the union and the new variant entry are required.)

- [ ] **Step 2: Pass `trainerClientStatus` from the page**

In `src/app/trainers/page.tsx`:

a. Around line 38 in the `select`, add:

```ts
trainerClientStatus: true,
```

b. Wherever `<TrainerCard trainer={...}>` is constructed, ensure the object now includes `trainerClientStatus`. Remove the legacy `trainerAcceptingClients` from the rendered prop (the data fetch can keep it).

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/app/trainers`
Expected: 0 new errors.

- [ ] **Step 4: Browser smoke**

Visit `/trainers`. Each trainer card shows the right pill matching their `trainerClientStatus` — including the new dim "Not accepting" pill. NOT_ACCEPTING trainers remain visible in the directory.

- [ ] **Step 5: Commit**

```bash
git add src/app/trainers/trainer-card.tsx src/app/trainers/page.tsx
git commit -m "feat(directory): StatusPill adds not_accepting variant"
```

---

## Task 13: Public profile passes `clientStatus` through

**Files:**
- Modify: `src/app/t/[trainerSlug]/page.tsx`

- [ ] **Step 1: Fetch + pass status**

a. Around line 103, in the trainer `select`, add:

```ts
trainerClientStatus: true,
```

b. Around line 169, in the object passed to the profile renderer, replace `accepting: user.trainerAcceptingClients` with:

```ts
accepting: user.trainerClientStatus === 'ACCEPTING',
clientStatus: user.trainerClientStatus,
```

(Keep `accepting` for any consumer that still depends on the boolean shape; new code reads `clientStatus`.)

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint 'src/app/t/[trainerSlug]'`
Expected: 0 new errors.

- [ ] **Step 3: Browser smoke**

Visit `/t/<slug>` for trainers in each of the three states. Visual changes are minimal here (the existing renderer's "accepting" badge still works); the structural change is that `clientStatus` is now available downstream.

- [ ] **Step 4: Commit**

```bash
git add 'src/app/t/[trainerSlug]/page.tsx'
git commit -m "feat(profile): pass clientStatus through to public trainer profile"
```

---

## Task 14: Final verification + lint + build

**Files:** none

- [ ] **Step 1: Stop the dev server**

If `npm run dev` is running, kill it. Per project memory, never run `npm run build` while dev is active (Turbopack cache collision).

- [ ] **Step 2: Lint clean**

Run: `npm run lint`
Expected: 0 new warnings or errors (you may have pre-existing warnings; only fail on ones you introduced).

- [ ] **Step 3: Type-check clean**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: build completes; no errors. If it fails for reasons unrelated to your changes, investigate before continuing.

- [ ] **Step 5: Restart dev and run end-to-end smoke against all three states**

Start `npm run dev`. As a trainer:
- `/trainer/settings` opens on the Account tab. Tabs switch via clicks; URL updates; refresh persists.
- Sharing & status tab uses 2 columns at ≥1024px; collapses below.
- STATUS segmented control: pick each of the three states, hit SAVE, refresh — value persists.
- Visit your own `/apply/<slug>`:
  - ACCEPTING → form, no banner
  - WAITLIST → form + waitlist banner
  - NOT_ACCEPTING → form hidden; NotifyMeForm captures an email; second submit dedupes server-side.
- Flip from NOT_ACCEPTING → ACCEPTING. Confirm the captured `ContactSubmission` row got `notifiedAt` set in the DB.
- `/trainers` directory shows the right pill for each state, including "Not accepting" trainers.

- [ ] **Step 6: Final commit if you have any verification cleanup**

```bash
git status
# If anything is uncommitted (e.g. small lint fixes), commit it.
```

- [ ] **Step 7: Push to main when verification is green**

```bash
git push origin main
```

After the push, Railway will auto-run `prisma db push --skip-generate`. The new enums and columns are additive, so this should succeed without `--accept-data-loss`.

- [ ] **Step 8: Run the backfill script against production**

After Railway has applied the schema, run the backfill locally with the prod `DATABASE_URL` exported in your shell:

```bash
DATABASE_URL="<prod-db-url>" npx tsx scripts/backfill-trainer-client-status.ts
```

Expected: `Backfilled N trainer(s) → WAITLIST.` followed by `Backfilled 0` on a re-run.

- [ ] **Step 9: Update memory**

Per project memory convention "Update memory on every push," append a new memory file `project_trainer_status_3state_shipped.md` summarizing what landed and add an index entry to `MEMORY.md`.

---

## Spec ↔ plan coverage check

| Spec section | Implemented in |
| --- | --- |
| Schema: `TrainerClientStatus` enum + new fields | Task 1 |
| `trainerStatus` lib (labels, helpers) | Task 2 |
| Backfill `false → WAITLIST` | Task 3 |
| `PATCH /api/trainers/me` accepts `clientStatus`, mirrors boolean, fires mailer | Task 4 |
| Public `POST /api/trainers/[slug]/notify-me` (idempotent) | Task 5 |
| Notify-when-open mailer with `notifiedAt` guard | Task 6 |
| SHARING card 7/5 split + 3-state Status with Save button | Task 7 |
| Right column blocks (Account / Referral KPIs / Coming-soon) | Task 8 |
| Identity strip + 12-col dashboard `page.tsx` | Task 9 |
| Apply page renders `NOT_ACCEPTING` email-capture branch | Task 10 |
| 3-state pill on multi-trainer apply + search API returns `clientStatus` | Task 11 |
| `StatusPill` `not_accepting` variant + directory inclusion | Task 12 |
| Public profile passes `clientStatus` through | Task 13 |
| Verification + push + prod backfill | Task 14 |
