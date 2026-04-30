# Drop Client + Erase Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a trainer-initiated "Archive client" flow with a 30-day grace period and a nightly cron that hard-deletes archived accounts and all associated data (R2 photos, ContactSubmission rows, all cascading child records).

**Architecture:** Three nullable columns on `User` (`archivedAt`, `archivedByUserId`, `archivedReason`). A shared `src/lib/clientArchival.ts` module exposes `archiveClient`, `restoreClient`, and `hardDeleteClient` so the same per-user logic powers the archive route, the restore route, the "Delete now" route, and the nightly cron. Auth helpers (`requireTrainerSession`, `requireClientSession`, NextAuth credentials check) block archived users at session creation. Trainer Client Detail page gets a Danger zone with name-typing confirm; roster gets an Archived tab with Restore + Delete-now actions.

**Tech Stack:** Next.js 16 App Router · Prisma 6 · Zod · Resend · NextAuth · Tailwind 4 · existing `mf-*` design system primitives · existing R2 helper at `src/lib/storage.ts`.

**Spec:** [docs/superpowers/specs/2026-04-30-drop-client-and-erase-data-design.md](../specs/2026-04-30-drop-client-and-erase-data-design.md)

**Project conventions to honor:**

- Railway deploys main via `prisma db push --skip-generate` (no migrations directory, no `--accept-data-loss`). Schema changes must be additive only.
- Build-critical packages must live in `dependencies`, not `devDependencies`. None added here.
- Never run `npm run build` while `npm run dev` is active (Turbopack cache collision).
- This codebase has no test runner. Verification is `npm run lint`, `npx tsc --noEmit -p .`, and manual browser smoke at `http://localhost:3000` against `npm run dev`.
- Never echo any portion of secret values when describing env vars.
- Use existing `mf-*` CSS classes (`mf-card`, `mf-btn`, `mf-input`, `mf-eyebrow`) — don't invent new ones.
- Existing cron pattern: see `src/app/api/cron/weekly-digest/route.ts` — uses `Bearer ${CRON_SECRET}` header check.

---

## File Structure

**New files:**

- `src/lib/clientArchival.ts` — `archiveClient`, `restoreClient`, `hardDeleteClient` helpers. Single source of truth for the per-user archive/delete logic. Used by all four archival routes (archive, restore, delete-now, cron).
- `src/app/api/trainers/clients/[id]/archive/route.ts` — POST. Trainer (or admin) archives one client.
- `src/app/api/trainers/clients/[id]/restore/route.ts` — POST. Trainer (or admin) restores one archived client.
- `src/app/api/trainers/clients/[id]/delete-now/route.ts` — POST. Skip the 30-day window.
- `src/app/api/cron/hard-delete-archived/route.ts` — POST. Nightly batch hard-delete.
- `src/app/trainer/(v4)/clients/[id]/archive-zone-client.tsx` — Client component with the Danger zone button + confirm modal. Embedded by the existing Client Detail page.

**Modified files:**

- `prisma/schema.prisma` — 3 nullable columns on `User`.
- `src/lib/auth.ts` — credentials check rejects users with `archivedAt != null`.
- `src/lib/trainer-data.ts` — `requireTrainerSession` rejects archived; roster query default filter excludes archived; new `getArchivedClients` query for the Archived tab.
- `src/lib/client-data.ts` — `requireClientSession` rejects archived (analogous to trainer side).
- `src/app/trainer/(v4)/clients/[id]/page.tsx` — pass new props (archivedAt, ability flags) to client-detail-desktop / -mobile, render archive-zone-client.
- `src/app/trainer/(v4)/clients/[id]/client-detail-desktop.tsx` — embed `<ArchiveZoneClient/>` at bottom under "Danger zone".
- `src/app/trainer/(v4)/clients/page.tsx` — Archived tab + filter; per-row Restore + Delete-now buttons inside the Archived view.

---

## Task 1: Schema additions

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the 3 nullable columns to `User`**

In `model User` (around line 39), add immediately after `adminNotes String?` (around line 51):

```prisma
  // ---- Client offboarding (2026-04-30) ----
  // Set when the trainer/admin archives the client. Null for active accounts.
  // Hard-delete cron purges accounts where archivedAt < (now - 30 days).
  archivedAt          DateTime?
  // FK to the User (TRAINER or ADMIN role) who initiated the archive.
  // Audit-only; no Prisma relation defined for v1.
  archivedByUserId    String?
  // Optional free-text reason captured at archive time. Capped at 500 chars
  // by the API Zod schema; no DB constraint.
  archivedReason      String?
```

- [ ] **Step 2: Push the schema to Postgres**

Run: `npx prisma db push --skip-generate`
Expected: "Your database is now in sync with your Prisma schema." Any "data loss" warning → STOP, re-read additions.

- [ ] **Step 3: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: clean exit (no errors).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add archivedAt + archivedByUserId + archivedReason to User"
```

---

## Task 2: Shared archival lib

**Files:**

- Create: `src/lib/clientArchival.ts`

This file is the single source of truth for the archive/restore/hard-delete operations. Both the user-facing routes and the cron import from here.

- [ ] **Step 1: Find existing R2 helper export**

Run: `grep -n "export" src/lib/storage.ts | head -20`
Note the names of the upload + delete helpers. The plan assumes `deleteR2Prefix(prefix: string): Promise<void>` exists. If only `deleteR2Object(key: string)` exists, you'll need to list-then-delete. If neither exists, add a `deleteR2Prefix` to `storage.ts` and export it (additive).

If `deleteR2Prefix` doesn't exist, paste this minimal helper into `src/lib/storage.ts` (matching the existing import / S3 client style at the top of that file):

```ts
/** Delete every object whose key starts with `prefix`. Used by client offboarding. */
export async function deleteR2Prefix(prefix: string): Promise<void> {
  const r2 = getR2Client(); // or whatever the existing client accessor is
  let token: string | undefined;
  do {
    const list = await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    if (list.Contents && list.Contents.length > 0) {
      await r2.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET,
          Delete: { Objects: list.Contents.map((o) => ({ Key: o.Key! })) },
        }),
      );
    }
    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);
}
```

If you add the helper, commit it separately first:

```bash
git add src/lib/storage.ts
git commit -m "feat(storage): deleteR2Prefix helper for prefix-wide R2 cleanup"
```

- [ ] **Step 2: Find existing Resend helper**

Run: `grep -rn "from 'resend'\|new Resend" src/lib src/app/api 2>/dev/null | head -5`
Note the import pattern. Most likely `import { Resend } from 'resend'` and instantiated per-route via `new Resend(process.env.RESEND_API_KEY!)`.

- [ ] **Step 3: Write `src/lib/clientArchival.ts`**

Create the file with:

```ts
// src/lib/clientArchival.ts
// Single source of truth for the trainer-initiated client offboarding flow.
// Used by /api/trainers/clients/[id]/archive, /restore, /delete-now, and the
// nightly /api/cron/hard-delete-archived.

import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { deleteR2Prefix } from '@/lib/storage';

export const ARCHIVE_GRACE_DAYS = 30;
const ARCHIVE_GRACE_MS = ARCHIVE_GRACE_DAYS * 86400000;

export interface ArchiveInput {
  clientId: string;
  archivedByUserId: string;
  reason?: string | null;
}

/**
 * Soft-archives a client: sets archivedAt + archivedByUserId + archivedReason,
 * sets isActive=false. Reversible via restoreClient() within ARCHIVE_GRACE_DAYS.
 */
export async function archiveClient(input: ArchiveInput): Promise<void> {
  await prisma.user.update({
    where: { id: input.clientId },
    data: {
      archivedAt: new Date(),
      archivedByUserId: input.archivedByUserId,
      archivedReason: input.reason ?? null,
      isActive: false,
    },
  });
}

/**
 * Reverses an archive: clears archive fields, restores isActive=true.
 */
export async function restoreClient(clientId: string): Promise<void> {
  await prisma.user.update({
    where: { id: clientId },
    data: {
      archivedAt: null,
      archivedByUserId: null,
      archivedReason: null,
      isActive: true,
    },
  });
}

/**
 * Compute the `archivedAt` cutoff for cron-driven hard-delete.
 * Returns the timestamp BEFORE which any archivedAt qualifies for purge.
 */
export function hardDeleteCutoff(): Date {
  return new Date(Date.now() - ARCHIVE_GRACE_MS);
}

/**
 * Permanently deletes a single client's account and all data.
 * - Sends a final notification email (best-effort; doesn't block delete)
 * - Wipes R2 objects under users/{userId}/ prefix (best-effort)
 * - Deletes ContactSubmission rows by email (SetNull on trainer FK)
 * - prisma.user.delete cascades through child records
 *
 * Caller is responsible for authorization. The cron loops over a query
 * filtered by hardDeleteCutoff(); the delete-now route loads the user
 * and verifies trainer/admin ownership before calling this.
 */
export async function hardDeleteClient(clientId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return;

  // 1. Final notification email (best-effort)
  try {
    await sendFinalDeletionEmail(user.email, user.name);
  } catch (err) {
    console.error('hardDeleteClient: email failed for', user.id, err);
  }

  // 2. Wipe R2 photos under users/{userId}/ prefix (best-effort)
  try {
    await deleteR2Prefix(`users/${user.id}/`);
  } catch (err) {
    console.error('hardDeleteClient: R2 wipe failed for', user.id, err);
  }

  // 3. Delete ContactSubmission rows by email — trainer FK is SetNull, not Cascade
  await prisma.contactSubmission.deleteMany({
    where: { email: user.email },
  });

  // 4. Delete the user — cascades through WorkoutSession, WorkoutProgress,
  //    Appointment, Message, ClientProfile, CoachNote, ProgramAssignment,
  //    Notification, PushSubscription, DevicePushToken, FoodEntry,
  //    FavoriteFood, MealPlan, NutritionPlan, ProgressEntry, Session, Account.
  await prisma.user.delete({ where: { id: user.id } });

  console.log(`[hardDeleteClient] Deleted user ${user.id} (${user.email})`);
}

async function sendFinalDeletionEmail(
  email: string,
  name: string | null,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return; // no-op in environments without Resend
  const resend = new Resend(process.env.RESEND_API_KEY);
  const display = name ?? 'there';
  await resend.emails.send({
    from: 'RepLab <noreply@replabusa.com>',
    to: email,
    subject: 'Your RepLab account has been deleted',
    text: `Hi ${display},\n\nYour RepLab account has been permanently deleted along with all associated workout history, messages, and uploaded photos.\n\nIf you'd like to come back, you'll need to apply to a trainer fresh at https://replabusa.com/apply.\n\n— RepLab`,
  });
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: clean.

- [ ] **Step 5: Lint**

Run: `npm run lint -- src/lib/clientArchival.ts`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/clientArchival.ts
git commit -m "feat(archival): shared archive/restore/hardDelete helpers for client offboarding"
```

---

## Task 3: Auth gate for archived clients

**Files:**

- Modify: `src/lib/auth.ts`
- Modify: `src/lib/trainer-data.ts`
- Modify: `src/lib/client-data.ts`

The credentials check + session helpers must reject any user with `archivedAt != null`. Without this, archived clients can still log in during the grace window.

- [ ] **Step 1: Block credentials login for archived users**

In `src/lib/auth.ts`, find the existing `if (!user.isActive)` check (around line 60). Add an archive check immediately after it:

```ts
if (!user.isActive) {
  throw new Error('AccountInactive'); // or whatever existing throw is
}
if (user.archivedAt) {
  // Blocked but with a more specific message so the client knows the
  // window. Caller (the signin form) renders this through the standard
  // error path.
  const purgeAt = new Date(user.archivedAt.getTime() + 30 * 86400000);
  throw new Error(
    `AccountArchived:${purgeAt.toISOString()}`,
  );
}
```

(Match the style of the existing throw above — look at how `AccountInactive` is currently thrown and mirror it. Keep the actual error string format consistent with how the signin client currently parses errors.)

- [ ] **Step 2: Verify the user.findUnique select pulls archivedAt**

In the same `src/lib/auth.ts`, find the `prisma.user.findUnique` (or `findFirst`) call that loads the user during credentials authorize. Ensure the `select` includes `archivedAt: true` (and `isActive: true` if not already). If `select` is omitted entirely (returning the full row), no change needed.

- [ ] **Step 3: Reject archived users in `requireTrainerSession`**

In `src/lib/trainer-data.ts` (around line 8), find the body of `requireTrainerSession`. After the existing role/active checks, add:

```ts
// Belt-and-suspenders: existing JWT sessions for archived users get
// rejected on the next API call (login is already blocked at credentials).
if (sessionUser.archivedAt) {
  redirect('/auth/signin');
}
```

If `sessionUser` doesn't carry `archivedAt`, you'll need to widen the session callback in `src/lib/auth.ts` to copy `user.archivedAt` into the JWT/session. If that's a multi-touch change, instead do a fresh DB read inside `requireTrainerSession`:

```ts
const fresh = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { archivedAt: true },
});
if (fresh?.archivedAt) redirect('/auth/signin');
```

(The DB-fresh path is one extra query per request; acceptable for v1 — matches the security-over-perf default.)

- [ ] **Step 4: Reject archived users in `requireClientSession`**

In `src/lib/client-data.ts`, find the analogous `requireClientSession` helper and add the same check. Same shape as Step 3.

- [ ] **Step 5: Typecheck + lint**

```bash
npx tsc --noEmit -p .
npm run lint -- src/lib/auth.ts src/lib/trainer-data.ts src/lib/client-data.ts
```
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/lib/trainer-data.ts src/lib/client-data.ts
git commit -m "feat(auth): block archived users at login + session re-check"
```

---

## Task 4: Archive / Restore / Delete-now API routes

**Files:**

- Create: `src/app/api/trainers/clients/[id]/archive/route.ts`
- Create: `src/app/api/trainers/clients/[id]/restore/route.ts`
- Create: `src/app/api/trainers/clients/[id]/delete-now/route.ts`

Three thin routes that authorize then delegate to `clientArchival.ts` helpers.

- [ ] **Step 1: Write the archive route**

Create `src/app/api/trainers/clients/[id]/archive/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { archiveClient } from '@/lib/clientArchival';

const bodySchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;

  // Authorization: trainer must own this client; admin can archive any client.
  const target = await prisma.user.findFirst({
    where:
      session.user.role === 'ADMIN'
        ? { id, role: 'CLIENT' }
        : { id, role: 'CLIENT', trainerId: session.user.id },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  await archiveClient({
    clientId: id,
    archivedByUserId: session.user.id,
    reason: parsed.data.reason ?? null,
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Write the restore route**

Create `src/app/api/trainers/clients/[id]/restore/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { restoreClient } from '@/lib/clientArchival';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;

  // Same auth model as archive: trainer-owned or admin.
  const target = await prisma.user.findFirst({
    where:
      session.user.role === 'ADMIN'
        ? { id, role: 'CLIENT' }
        : { id, role: 'CLIENT', trainerId: session.user.id },
    select: { id: true, archivedAt: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  if (!target.archivedAt) {
    return NextResponse.json(
      { error: 'Client is not archived' },
      { status: 409 },
    );
  }

  await restoreClient(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Write the delete-now route**

Create `src/app/api/trainers/clients/[id]/delete-now/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hardDeleteClient } from '@/lib/clientArchival';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;

  // Same auth model as archive. Only allowed when the client is already
  // archived — "Delete now" is the expedite-the-cron action, not a one-step
  // delete-without-archiving.
  const target = await prisma.user.findFirst({
    where:
      session.user.role === 'ADMIN'
        ? { id, role: 'CLIENT' }
        : { id, role: 'CLIENT', trainerId: session.user.id },
    select: { id: true, archivedAt: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  if (!target.archivedAt) {
    return NextResponse.json(
      { error: 'Client must be archived first' },
      { status: 409 },
    );
  }

  await hardDeleteClient(id);
  return NextResponse.json({ ok: true, deleted: id });
}
```

- [ ] **Step 4: Typecheck + lint**

```bash
npx tsc --noEmit -p .
npm run lint -- src/app/api/trainers/clients/
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/api/trainers/clients/'
git commit -m "feat(api): archive + restore + delete-now routes for client offboarding"
```

---

## Task 5: Client Detail "Danger zone" UI

**Files:**

- Create: `src/app/trainer/(v4)/clients/[id]/archive-zone-client.tsx`
- Modify: `src/app/trainer/(v4)/clients/[id]/page.tsx`
- Modify: `src/app/trainer/(v4)/clients/[id]/client-detail-desktop.tsx`

- [ ] **Step 1: Write the archive-zone client component**

Create `src/app/trainer/(v4)/clients/[id]/archive-zone-client.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ArchiveZoneClientProps {
  clientId: string;
  clientName: string;
  archivedAt: string | null; // ISO string when archived; null otherwise
}

export default function ArchiveZoneClient({
  clientId,
  clientName,
  archivedAt,
}: ArchiveZoneClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typedName.trim().toLowerCase() === clientName.trim().toLowerCase();

  if (archivedAt) {
    // Already archived — render a status line instead of the button. Restore
    // / Delete now actions live on the Roster's Archived tab in v1.
    const purgeAt = new Date(new Date(archivedAt).getTime() + 30 * 86400000);
    return (
      <div
        className="mf-card"
        style={{
          padding: 16,
          marginTop: 24,
          borderColor: 'var(--mf-red, #b91c1c)',
        }}
      >
        <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
          ARCHIVED
        </div>
        <div className="mf-fg-dim" style={{ fontSize: 13, lineHeight: 1.5 }}>
          This client is scheduled for permanent deletion on{' '}
          {purgeAt.toLocaleDateString()}. Restore or delete-now from your
          Roster &rarr; Archived tab.
        </div>
      </div>
    );
  }

  async function submit() {
    if (!matches) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/trainers/clients/${clientId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Archive failed.');
        setSubmitting(false);
        return;
      }
      router.push('/trainer/clients?archived=1');
      router.refresh();
    } catch {
      setError('Network error. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
        DANGER ZONE
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mf-btn"
        style={{
          height: 40,
          padding: '0 16px',
          color: 'var(--mf-red, #ef4444)',
          borderColor: 'var(--mf-red, #ef4444)',
          background: 'transparent',
        }}
      >
        Archive client →
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50,
          }}
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="mf-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: 24,
              maxWidth: 480,
              width: '90vw',
              background: 'var(--mf-surface-1, #161618)',
            }}
          >
            <div
              className="mf-font-display"
              style={{ fontSize: 22, marginBottom: 12, letterSpacing: '-0.01em' }}
            >
              Archive {clientName}?
            </div>
            <div
              className="mf-fg-dim"
              style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}
            >
              This will:
              <ul style={{ marginTop: 8, marginLeft: 20, listStyle: 'disc' }}>
                <li>Hide them from your roster immediately</li>
                <li>Block their login</li>
                <li>Permanently delete their account and all data in 30 days</li>
                <li>Reversible during the 30-day window from your Archived tab</li>
              </ul>
              <div style={{ marginTop: 12 }}>
                Coach notes about this client and the entire message thread
                will be deleted at purge time. Screenshot anything you need
                to keep first.
              </div>
            </div>

            <label className="block" style={{ marginBottom: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
                REASON (OPTIONAL)
              </div>
              <input
                type="text"
                className="mf-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="e.g. Client moved to in-person training"
              />
            </label>

            <label className="block" style={{ marginBottom: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
                TYPE <span className="mf-fg">{clientName.toUpperCase()}</span> TO CONFIRM
              </div>
              <input
                type="text"
                className="mf-input"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                autoFocus
              />
            </label>

            {error && (
              <div
                role="alert"
                style={{
                  padding: '8px 12px',
                  background: '#2a1212',
                  border: '1px solid #6b1f1f',
                  color: '#fca5a5',
                  borderRadius: 4,
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="mf-btn"
                style={{ height: 36, padding: '0 14px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!matches || submitting}
                className="mf-btn"
                style={{
                  height: 36,
                  padding: '0 14px',
                  background: 'var(--mf-red, #ef4444)',
                  color: '#0A0A0B',
                  borderColor: 'var(--mf-red, #ef4444)',
                  fontWeight: 600,
                }}
              >
                {submitting ? 'Archiving…' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Pass `archivedAt` from the page server component**

In `src/app/trainer/(v4)/clients/[id]/page.tsx`, find the `prisma.user.findFirst` call. Add `archivedAt: true` to its `include` (or extend the explicit `select` if there is one — currently there's an `include: { clientProfile: true }`, so just rely on default field selection which already includes `archivedAt`). Verify `client.archivedAt` is now available downstream.

Then update the props passed to `<ClientDetailDesktop>`:

```tsx
<ClientDetailDesktop
  /* ... existing props ... */
  archivedAt={client.archivedAt ? client.archivedAt.toISOString() : null}
/>
```

(Also pass to `<ClientDetailMobile>` — see Step 3 for placement; mobile gets the same `archivedAt` prop but doesn't render the modal, just the read-only status banner.)

- [ ] **Step 3: Embed `<ArchiveZoneClient>` in the desktop component**

In `src/app/trainer/(v4)/clients/[id]/client-detail-desktop.tsx`:

a) Add to the import block at the top:

```tsx
import ArchiveZoneClient from './archive-zone-client';
```

b) Add `archivedAt: string | null;` to the `ClientDetailDesktopProps` interface near the existing `clientName`, `clientEmail` fields.

c) Destructure `archivedAt` from the props.

d) Just before the existing closing `</DesktopShell>` tag (or at the bottom of the page content, after the existing 3-column grid), add:

```tsx
          <ArchiveZoneClient
            clientId={clientId}
            clientName={clientName ?? clientEmail}
            archivedAt={archivedAt}
          />
```

For mobile (`client-detail-mobile.tsx`), do the same — pass `archivedAt` as a prop and render `<ArchiveZoneClient>` at the bottom of the mobile layout. The component's modal is responsive enough to work on mobile width.

- [ ] **Step 4: Typecheck + lint**

```bash
npx tsc --noEmit -p .
npm run lint -- 'src/app/trainer/(v4)/clients/[id]/'
```
Expected: clean.

- [ ] **Step 5: Manual smoke**

`npm run dev` → visit a client's detail page. Verify:

- "Danger zone" appears at the bottom with the red Archive button.
- Click → modal opens.
- Type a wrong name → Archive button disabled.
- Type the matching name → button enables.
- Click Archive → toast/redirect, client disappears from your roster.
- Re-visit the client URL directly — you should see the "ARCHIVED" status banner instead of the button.

- [ ] **Step 6: Commit**

```bash
git add 'src/app/trainer/(v4)/clients/[id]/'
git commit -m "feat(client-detail): danger zone with archive confirm modal"
```

---

## Task 6: Roster Archived tab

**Files:**

- Modify: `src/app/trainer/(v4)/clients/page.tsx`
- Modify: `src/lib/trainer-data.ts`

The roster currently filters to `isActive: true` clients. Need to expose the archived set on a separate tab and provide Restore + Delete-now actions per row.

- [ ] **Step 1: Read existing roster page and helper**

Run `cat src/app/trainer/(v4)/clients/page.tsx` and `cat src/lib/trainer-data.ts` to understand how the roster is wired today. The page calls a helper from `trainer-data.ts` to fetch clients; replicate that pattern for archived clients.

- [ ] **Step 2: Add a `getArchivedClients` query in `trainer-data.ts`**

Append (after the existing `getRosterClients` or similar):

```ts
export interface ArchivedClient {
  id: string;
  name: string | null;
  email: string;
  archivedAt: Date;
  archivedReason: string | null;
}

export async function getArchivedClients(trainerId: string): Promise<ArchivedClient[]> {
  return prisma.user.findMany({
    where: {
      role: 'CLIENT',
      trainerId,
      archivedAt: { not: null },
    },
    orderBy: { archivedAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      archivedAt: true,
      archivedReason: true,
    },
  }) as Promise<ArchivedClient[]>;
}
```

(If the existing roster query is admin-aware, add the same admin-can-see-all branch here. Match the existing pattern.)

- [ ] **Step 3: Verify default roster query excludes archived**

In `trainer-data.ts`, find the existing query that builds the default roster. It likely has `isActive: true` already. Add `archivedAt: null` to the same `where` clause so archived-but-not-yet-purged accounts don't leak into the default Active view.

- [ ] **Step 4: Add Archived tab + filter to the roster page**

In `src/app/trainer/(v4)/clients/page.tsx`, the existing tabs are likely `All / Active / Paused` (or similar). Add an "Archived" tab. The tab's content is a separate list that calls `getArchivedClients()` server-side. Each row renders:

```tsx
<div className="mf-card" style={{ padding: 12, marginBottom: 8 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <div className="mf-fg" style={{ fontSize: 14, fontWeight: 600 }}>
        {client.name ?? client.email}
      </div>
      <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 4 }}>
        Archived {relativeTime(client.archivedAt)} ·
        Purges in {daysUntilPurge(client.archivedAt)} days
        {client.archivedReason ? (
          <>
            {' · '}
            <span style={{ fontStyle: 'italic' }}>"{client.archivedReason}"</span>
          </>
        ) : null}
      </div>
    </div>
    <ArchivedRowActions clientId={client.id} clientName={client.name ?? client.email} />
  </div>
</div>
```

Where `daysUntilPurge` is a small inline helper:

```ts
function daysUntilPurge(archivedAt: Date): number {
  const ms = archivedAt.getTime() + 30 * 86400000 - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}
```

And `<ArchivedRowActions>` is a small client-component embedded in the same file (or its own file `archived-row-actions-client.tsx`):

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ArchivedRowActions({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'restore' | 'delete' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');

  async function restore() {
    setBusy('restore');
    await fetch(`/api/trainers/clients/${clientId}/restore`, { method: 'POST' });
    router.refresh();
  }
  async function deleteNow() {
    if (typed.trim().toLowerCase() !== clientName.trim().toLowerCase()) return;
    setBusy('delete');
    await fetch(`/api/trainers/clients/${clientId}/delete-now`, { method: 'POST' });
    router.refresh();
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        type="button"
        onClick={restore}
        disabled={busy !== null}
        className="mf-btn"
        style={{ height: 32, padding: '0 12px', fontSize: 12 }}
      >
        {busy === 'restore' ? 'Restoring…' : 'Restore'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={busy !== null}
        className="mf-btn"
        style={{
          height: 32,
          padding: '0 12px',
          fontSize: 12,
          color: 'var(--mf-red, #ef4444)',
          borderColor: 'var(--mf-red, #ef4444)',
        }}
      >
        Delete now
      </button>
      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50,
          }}
          onClick={() => busy === null && setConfirming(false)}
        >
          <div
            className="mf-card"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: 24, maxWidth: 440, width: '90vw' }}
          >
            <div className="mf-font-display" style={{ fontSize: 18, marginBottom: 12 }}>
              Permanently delete {clientName}?
            </div>
            <div className="mf-fg-dim" style={{ fontSize: 12, marginBottom: 12 }}>
              This cannot be undone. Type <span className="mf-fg">{clientName.toUpperCase()}</span> to confirm.
            </div>
            <input
              type="text"
              className="mf-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              style={{ marginBottom: 12 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy !== null}
                className="mf-btn"
                style={{ height: 32, padding: '0 12px', fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteNow}
                disabled={
                  typed.trim().toLowerCase() !== clientName.trim().toLowerCase() ||
                  busy !== null
                }
                className="mf-btn"
                style={{
                  height: 32,
                  padding: '0 12px',
                  fontSize: 12,
                  background: 'var(--mf-red, #ef4444)',
                  color: '#0A0A0B',
                  borderColor: 'var(--mf-red, #ef4444)',
                }}
              >
                {busy === 'delete' ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

Use `relativeTime` from wherever the project already imports it (the applications client uses it; check that file's imports).

- [ ] **Step 5: Typecheck + lint**

```bash
npx tsc --noEmit -p .
npm run lint -- 'src/app/trainer/(v4)/clients/' src/lib/trainer-data.ts
```
Expected: clean.

- [ ] **Step 6: Manual smoke**

Visit `/trainer/clients`. Confirm:

- "Archived" tab exists.
- After archiving a test client (Task 5), they appear in this tab with a countdown.
- Click Restore → row disappears from Archived; client returns to Active.
- Re-archive the test client. Click Delete now → name-typing modal → confirm → row disappears, user is gone from the DB (verify via `npx prisma studio`).

- [ ] **Step 7: Commit**

```bash
git add 'src/app/trainer/(v4)/clients/' src/lib/trainer-data.ts
git commit -m "feat(roster): archived tab with restore + delete-now actions"
```

---

## Task 7: Hard-delete cron route

**Files:**

- Create: `src/app/api/cron/hard-delete-archived/route.ts`

- [ ] **Step 1: Write the cron route**

Create `src/app/api/cron/hard-delete-archived/route.ts`:

```ts
// Nightly cron: hard-delete every archived account whose grace window has
// expired. Authenticated via CRON_SECRET bearer token (same pattern as the
// existing weekly-digest cron at src/app/api/cron/weekly-digest/route.ts).

import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hardDeleteClient, hardDeleteCutoff } from '@/lib/clientArchival';

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = hardDeleteCutoff();
  const candidates = await prisma.user.findMany({
    where: {
      archivedAt: { not: null, lt: cutoff },
    },
    select: { id: true },
  });

  let deletedCount = 0;
  const errors: Array<{ userId: string; message: string }> = [];

  for (const c of candidates) {
    try {
      await hardDeleteClient(c.id);
      deletedCount += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ userId: c.id, message });
      console.error(`[hard-delete-archived] failed for ${c.id}:`, err);
    }
  }

  return NextResponse.json({
    deletedCount,
    errorCount: errors.length,
    errors,
    cutoffIso: cutoff.toISOString(),
  });
}
```

- [ ] **Step 2: Typecheck + lint**

```bash
npx tsc --noEmit -p .
npm run lint -- src/app/api/cron/hard-delete-archived/
```
Expected: clean.

- [ ] **Step 3: Local smoke (optional but valuable)**

Manually exercise the route by inserting a test row whose `archivedAt` is older than 30 days, then calling:

```bash
curl -X POST http://localhost:3000/api/cron/hard-delete-archived \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

(`CRON_SECRET` is in `.env`. Don't echo or paste its value.)

Expected: `{ deletedCount: 1, errorCount: 0, errors: [], cutoffIso: "..." }`.

If you don't have a stale archive row to test against, this step can be skipped — Task 8's production setup will exercise it nightly.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/hard-delete-archived/
git commit -m "feat(cron): nightly hard-delete of archived clients"
```

---

## Task 8: Push, configure Railway Cron, update memory

**Files:**

- (Branden-action) Railway dashboard: add new Cron service hitting `/api/cron/hard-delete-archived` daily at 2:00 AM UTC.
- Modify: `~/.claude/projects/.../memory/MEMORY.md`
- Create: `~/.claude/projects/.../memory/project_drop_client_and_erase_data_shipped.md`

- [ ] **Step 1: Push to main**

Run:

```bash
git push
```

Watch the push complete cleanly. Railway auto-deploys main; build takes ~5–8 min.

- [ ] **Step 2: Production smoke**

Once Railway is green:

1. Visit `https://replabusa.com/trainer/clients/{some-test-id}` → confirm Danger zone renders.
2. Archive the test client → confirm they appear in `/trainer/clients?tab=archived` with the countdown.
3. Restore → confirm they return to Active.

- [ ] **Step 3: Configure the Railway Cron service**

In the Railway dashboard:

1. Add a new Cron service (or extend an existing cron-runner project) with:
   - Schedule: `0 2 * * *` (daily at 02:00 UTC)
   - Command: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" $RAILWAY_APP_URL/api/cron/hard-delete-archived`
2. Ensure the cron service has `CRON_SECRET` and `RAILWAY_APP_URL` (or hardcode the prod URL `https://replabusa.com`) in its env.
3. Match whatever pattern the existing weekly-digest cron uses — see Railway settings for `weekly-digest`.

This step is Branden-action; I cannot configure Railway services from here. Confirm via the Railway logs that the first run executes cleanly within 24 hours of merge.

- [ ] **Step 4: Write the memory note**

Create `~/.claude/projects/-Users-brandenvincent-walker-Documents-Documents---Branden-s-M3-MacBook-Projects-Development-Projects-fitness-training-platform/memory/project_drop_client_and_erase_data_shipped.md`:

```markdown
---
name: Drop client + erase data shipped (2026-04-30)
description: Trainer-initiated client offboarding with 30-day grace + nightly hard-delete cron. Schema +3 nullable cols on User. Shared archival lib at src/lib/clientArchival.ts.
type: project
---

User gained `archivedAt`, `archivedByUserId`, `archivedReason` (all nullable). `src/lib/clientArchival.ts` exposes `archiveClient`, `restoreClient`, `hardDeleteClient`, and `hardDeleteCutoff` — single source of truth used by 3 trainer routes (archive / restore / delete-now under `/api/trainers/clients/[id]/`) and the cron at `/api/cron/hard-delete-archived`.

Trainer Client Detail page has a Danger zone with a name-typing confirm modal. Archived clients render a status banner instead of the button. Trainer Roster has an Archived tab with Restore + Delete-now actions per row.

Auth gate: `src/lib/auth.ts` (credentials login), `src/lib/trainer-data.ts:requireTrainerSession`, and `src/lib/client-data.ts:requireClientSession` all reject `archivedAt != null`. JWT sessions for archived users get bounced on next API call.

Cron: nightly at 2:00 AM UTC (Railway cron service hitting `/api/cron/hard-delete-archived` with `Bearer ${CRON_SECRET}`). Iterates archivedAt < (now - 30 days), calls `hardDeleteClient` per user. Each iteration:
1. Sends final notification email via Resend (best-effort)
2. Wipes R2 photos under `users/{userId}/` prefix (best-effort)
3. Deletes ContactSubmission rows by email (SetNull on trainer FK doesn't cascade)
4. `prisma.user.delete` cascades through child records

Trainer's coaching IP (Programs, Workouts they authored) survives — only the assignment links cascade. Coach notes about the archived client + the entire message thread are deleted by design.

Spec: docs/superpowers/specs/2026-04-30-drop-client-and-erase-data-design.md
Plan: docs/superpowers/plans/2026-04-30-drop-client-and-erase-data.md
```

- [ ] **Step 5: Append a one-liner pointer to MEMORY.md**

Add to the bottom of `~/.claude/projects/.../memory/MEMORY.md`:

```markdown
- [Drop client + erase data shipped 2026-04-30](project_drop_client_and_erase_data_shipped.md) — trainer-initiated archive with 30-day grace window + nightly cron hard-delete. User +3 nullable cols. Shared archival lib at src/lib/clientArchival.ts.
```

- [ ] **Step 6: Done**

No further commit needed — memory files live outside the repo. Feature shipped end-to-end.

---

## Self-Review Notes

- All 7 spec sections (schema, trainer UI, client experience, cron, data scope, edge cases, migration) have a corresponding task.
- Three new schema columns (`archivedAt`, `archivedByUserId`, `archivedReason`) appear in Task 1 and are referenced consistently in Tasks 2, 3, 4, 5, 6, 7.
- `src/lib/clientArchival.ts` exports (`archiveClient`, `restoreClient`, `hardDeleteClient`, `hardDeleteCutoff`, `ARCHIVE_GRACE_DAYS`) all match across Tasks 2, 4, 7.
- Auth gate in Task 3 covers both login (auth.ts) and live sessions (requireTrainerSession + requireClientSession).
- "Delete now" route (Task 4) and cron (Task 7) both reuse `hardDeleteClient` — single source of truth.
- Railway Cron service setup is gated as Branden-action in Task 8 with explicit instructions.
- No TBD/TODO/placeholder content. Each code step shows exact code.
- Frequent commits — every task ends with one (Task 1 has one, Task 2 has one or two depending on the storage helper branch, etc.).
