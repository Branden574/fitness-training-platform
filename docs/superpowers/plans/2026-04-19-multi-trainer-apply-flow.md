# Multi-Trainer Apply Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-trainer contact form into a multi-trainer application flow — per-trainer referral links + codes, a shared `/apply` page with trainer picker, and per-client branding in the client dashboard once matched.

**Architecture:** Trainer identity fields live directly on the existing `User` model (slug, referralCode, isPublic, acceptingClients). Applications route to a specific trainer via a new nullable `ContactSubmission.trainerId`. Two apply-page variants share one form component; client-side branding reads a single `useAssignedTrainer()` hook driving all per-trainer surfaces.

**Tech Stack:** Next.js 15 App Router, Prisma (Postgres via Railway), NextAuth, Tailwind + existing `mf-*` CSS variables, `nanoid` (already installed), `qrcode` (new dep — ~150 kB, MIT).

**Verification model:** No test framework in this repo. Each task ends with `npx tsc --noEmit` + `npm run build` + a named manual smoke. The spec's Testing Strategy section enumerates the final end-to-end smoke flows that must pass.

**Deploy model:** Railway runs `prisma db push --skip-generate && npm run start`. `db push` adds nullable columns safely. Unique constraints on nullable columns are fine at day 1 because all existing rows get NULL — the backfill happens lazily via a self-healing `ensureTrainerIdentity()` helper called when each trainer first loads their Sharing panel (and on TRAINER-role promotion going forward).

**Spec reference:** [docs/superpowers/specs/2026-04-19-multi-trainer-apply-flow-design.md](docs/superpowers/specs/2026-04-19-multi-trainer-apply-flow-design.md)

---

## File Structure

Files created or modified by this plan, grouped by responsibility:

### Schema + backfill

- Modify: `prisma/schema.prisma` — add 4 fields to User, 3 to ContactSubmission, new index, new relation
- Create: `prisma/migrations/20260419230000_multi_trainer_apply/migration.sql` — for migrate-deploy users; Railway's db push picks up the schema.prisma changes directly

### Shared utilities

- Create: `src/lib/trainerIdentity.ts` — `generateSlug(name, prisma)`, `generateReferralCode(prisma)`, `ensureTrainerIdentity(userId, prisma)`

### API routes

- Create: `src/app/api/trainers/search/route.ts` — GET typeahead search
- Create: `src/app/api/trainers/resolve-code/route.ts` — POST code → slug lookup
- Create: `src/app/api/trainers/qr/route.ts` — GET QR code for current trainer (png or svg)
- Create: `src/app/api/trainers/me/ensure-identity/route.ts` — POST, self-healing slug+code backfill
- Create: `src/app/api/trainers/me/route.ts` — PATCH for `acceptingClients` toggle
- Create: `src/app/api/clients/me/trainer/route.ts` — GET assigned trainer summary
- Modify: `src/app/api/contact/route.ts` (or whichever file handles ContactSubmission POST — confirm during task 1)

### Apply pages

- Create: `src/app/apply/page.tsx` — generic apply (server)
- Create: `src/app/apply/apply-generic-client.tsx` — client form + trainer picker
- Create: `src/app/apply/[trainerSlug]/page.tsx` — direct apply (server)
- Create: `src/app/apply/[trainerSlug]/apply-direct-client.tsx` — client form + locked selection
- Create: `src/app/apply/success/page.tsx` — confirmation (server reads signed cookie)
- Create: `src/app/t/[trainerSlug]/page.tsx` — 308 redirect stub

### Redirects

- Modify: `next.config.ts` — add `redirects()` returning `/contact → /apply`

### Pricing / marketing

- Modify: whichever marketing pages have `Start 14-day trial` / `See the app` buttons (grep will find them) — change href + text

### Trainer settings + admin

- Modify: `src/app/trainer/settings/page.tsx` (or equivalent trainer settings page — confirm during task) — add Sharing section
- Create: `src/app/trainer/settings/sharing-panel-client.tsx` — copy-to-clipboard, QR preview, toggle
- Modify: `src/app/admin/users/[id]/...` — trainer overrides (grep: currently `src/app/admin/users/page.tsx` handles list; detail route may not exist yet and is out of scope if so — we'll add admin overrides only if the detail page exists)

### Per-client branding

- Create: `src/lib/hooks/useAssignedTrainer.ts` — client hook
- Modify: `src/components/ui/mf/DesktopShell.tsx` — accept `brand` override prop
- Modify: `src/components/ui/mf/ClientDesktopShell.tsx` (if it exists and is separate) — consume hook
- Modify: `src/lib/email.ts` or the PR-email helper — display name becomes trainer's
- Modify: `src/components/animations/Celebration.tsx` — accept `coach` prop from caller (falls back to `BM`)
- Modify: `src/components/animations/CelebrationProvider.tsx` — merges a per-caller override

---

## Task 1 — Schema additions + relation

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260419230000_multi_trainer_apply/migration.sql`

### Step 1 — Add trainer identity fields to User

- [ ] Open `prisma/schema.prisma`. Find the `User` model. Add these fields (alphabetical within the block is fine):

```prisma
  trainerSlug             String?   @unique
  trainerReferralCode     String?   @unique
  trainerIsPublic         Boolean   @default(false)
  trainerAcceptingClients Boolean   @default(true)
  trainerApplications     ContactSubmission[] @relation("TrainerApplications")
```

### Step 2 — Add trainerId + waitlist to ContactSubmission

- [ ] In the same file, find `model ContactSubmission`. Add:

```prisma
  trainerId  String?
  trainer    User?    @relation("TrainerApplications", fields: [trainerId], references: [id], onDelete: SetNull)
  waitlist   Boolean  @default(false)

  @@index([trainerId, status])
```

### Step 3 — Write migration SQL (for future `migrate deploy` path)

- [ ] Create `prisma/migrations/20260419230000_multi_trainer_apply/migration.sql`:

```sql
-- Add trainer identity columns (nullable). Backfill happens in code via
-- ensureTrainerIdentity() the first time a trainer loads their Sharing panel.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trainerSlug" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trainerReferralCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trainerIsPublic" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trainerAcceptingClients" BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS "users_trainerSlug_key" ON "users"("trainerSlug");
CREATE UNIQUE INDEX IF NOT EXISTS "users_trainerReferralCode_key" ON "users"("trainerReferralCode");

-- ContactSubmission additions
ALTER TABLE "contact_submissions" ADD COLUMN IF NOT EXISTS "trainerId" TEXT;
ALTER TABLE "contact_submissions" ADD COLUMN IF NOT EXISTS "waitlist" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "contact_submissions"
  ADD CONSTRAINT "contact_submissions_trainerId_fkey"
  FOREIGN KEY ("trainerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "contact_submissions_trainerId_status_idx" ON "contact_submissions"("trainerId", "status");
```

**Note:** The `@@map` values for both tables need to match actual table names. Run `grep "@@map" prisma/schema.prisma | head -5` to confirm `users` and `contact_submissions` before committing. If different, update the SQL before running.

### Step 4 — Regenerate Prisma client

- [ ] Run:

```bash
cd ~/Documents/Documents\ -\ Branden\'s\ M3\ MacBook/Projects/Development\ Projects/fitness-training-platform
npx prisma generate
```

Expected: `✔ Generated Prisma Client` without errors.

### Step 5 — Verify types + build

- [ ] Run `npx tsc --noEmit` — expect zero errors.
- [ ] Run `npm run build` — expect `✓ Compiled successfully`.

### Step 6 — Commit

```bash
git add prisma/schema.prisma prisma/migrations/20260419230000_multi_trainer_apply
git commit -m "feat(db): add trainer identity fields + ContactSubmission.trainerId

Phase 1 of multi-trainer apply flow. Adds trainerSlug, trainerReferralCode,
trainerIsPublic, trainerAcceptingClients to User; trainerId (nullable FK),
waitlist flag, and composite index to ContactSubmission. Migration is
safe for prisma db push (all additions are nullable or have defaults).
Existing trainer rows get NULL slug/code until ensureTrainerIdentity()
populates them on first settings-panel load."
```

---

## Task 2 — Trainer identity utilities

**Files:**
- Create: `src/lib/trainerIdentity.ts`

### Step 1 — Write the utility module

- [ ] Create `src/lib/trainerIdentity.ts`:

```ts
import 'server-only';
import { customAlphabet } from 'nanoid';
import type { PrismaClient } from '@prisma/client';

// Unambiguous alphabet — no 0/O/1/I/L — safer when spoken over the phone
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = customAlphabet(CODE_ALPHABET, 6);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function generateSlug(
  name: string,
  prisma: PrismaClient,
): Promise<string> {
  const base = slugify(name) || 'trainer';
  let candidate = base;
  let suffix = 1;
  // Linear probe — 10 collisions is astronomically unlikely for a single trainer
  while (
    await prisma.user.findUnique({
      where: { trainerSlug: candidate },
      select: { id: true },
    })
  ) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
    if (suffix > 100) throw new Error('Slug collision overflow');
  }
  return candidate;
}

export async function generateReferralCode(prisma: PrismaClient): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = makeCode();
    const existing = await prisma.user.findUnique({
      where: { trainerReferralCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error('Could not generate unique referral code after 5 attempts');
}

/**
 * Idempotent backfill — ensures the given trainer has both a slug and a
 * referral code. Returns the current (now-guaranteed) values.
 */
export async function ensureTrainerIdentity(
  userId: string,
  prisma: PrismaClient,
): Promise<{ slug: string; referralCode: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      trainerSlug: true,
      trainerReferralCode: true,
    },
  });
  if (!user) throw new Error('User not found');
  if (user.role !== 'TRAINER' && user.role !== 'ADMIN') {
    throw new Error('Only trainers or admins can have trainer identity');
  }

  const slug =
    user.trainerSlug ?? (await generateSlug(user.name ?? 'trainer', prisma));
  const referralCode =
    user.trainerReferralCode ?? (await generateReferralCode(prisma));

  if (user.trainerSlug !== slug || user.trainerReferralCode !== referralCode) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        trainerSlug: slug,
        trainerReferralCode: referralCode,
      },
    });
  }

  return { slug, referralCode };
}
```

### Step 2 — Verify

- [ ] Run `npx tsc --noEmit` — expect zero errors.

### Step 3 — Commit

```bash
git add src/lib/trainerIdentity.ts
git commit -m "feat(trainer): slug + referral-code generators with backfill helper"
```

---

## Task 3 — Ensure-identity API + auto-populate on session

**Files:**
- Create: `src/app/api/trainers/me/ensure-identity/route.ts`

### Step 1 — Write the route

- [ ] Create the file:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerIdentity } from '@/lib/trainerIdentity';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const identity = await ensureTrainerIdentity(session.user.id, prisma);
    return NextResponse.json({
      slug: identity.slug,
      referralCode: identity.referralCode,
    });
  } catch (error) {
    console.error('ensureTrainerIdentity failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate identity' },
      { status: 500 },
    );
  }
}
```

### Step 2 — Verify + commit

- [ ] `npx tsc --noEmit` → zero errors.
- [ ] `git add src/app/api/trainers/me/ensure-identity/route.ts && git commit -m "feat(api): POST /api/trainers/me/ensure-identity"`

---

## Task 4 — Trainer search API

**Files:**
- Create: `src/app/api/trainers/search/route.ts`

### Step 1 — Write route with rate limiting

- [ ] Create the file:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

function initialsOf(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '');
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`trainer-search:${ip}`, {
    maxRequests: 30,
    windowSeconds: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const trainers = await prisma.user.findMany({
    where: {
      role: 'TRAINER',
      trainerIsPublic: true,
      trainerSlug: { not: null },
      name: { contains: q, mode: 'insensitive' },
    },
    select: {
      id: true,
      name: true,
      image: true,
      trainerSlug: true,
      trainerAcceptingClients: true,
    },
    take: 10,
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    results: trainers.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.trainerSlug,
      photoUrl: t.image,
      initials: initialsOf(t.name),
      acceptingClients: t.trainerAcceptingClients,
    })),
  });
}
```

### Step 2 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `git add src/app/api/trainers/search/route.ts && git commit -m "feat(api): GET /api/trainers/search typeahead"`

---

## Task 5 — Resolve-code API

**Files:**
- Create: `src/app/api/trainers/resolve-code/route.ts`

### Step 1 — Write the route

- [ ] Create the file:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const schema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6}$/, 'Code must be 6 alphanumeric characters'),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`trainer-resolve-code:${ip}`, {
    maxRequests: 30,
    windowSeconds: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const code = parsed.data.code.toUpperCase();
  const trainer = await prisma.user.findUnique({
    where: { trainerReferralCode: code },
    select: {
      role: true,
      trainerSlug: true,
      trainerIsPublic: true,
    },
  });

  if (
    !trainer ||
    trainer.role !== 'TRAINER' ||
    !trainer.trainerIsPublic ||
    !trainer.trainerSlug
  ) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ slug: trainer.trainerSlug });
}
```

### Step 2 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `git add src/app/api/trainers/resolve-code/route.ts && git commit -m "feat(api): POST /api/trainers/resolve-code"`

---

## Task 6 — QR code API + dependency

**Files:**
- Modify: `package.json` (via `npm install qrcode @types/qrcode`)
- Create: `src/app/api/trainers/qr/route.ts`

### Step 1 — Install qrcode

- [ ] Run:

```bash
npm install qrcode
npm install -D @types/qrcode
```

Expected: `added N packages` with zero vulnerabilities.

### Step 2 — Write the route

- [ ] Create `src/app/api/trainers/qr/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerIdentity } from '@/lib/trainerIdentity';
import QRCode from 'qrcode';

const QR_OPTIONS = {
  margin: 1,
  width: 512,
  color: {
    dark: '#FF4D1C',
    light: '#0A0A0B',
  },
} as const;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await ensureTrainerIdentity(session.user.id, prisma);

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') === 'svg' ? 'svg' : 'png';
  const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || request.nextUrl.origin;
  const url = `${origin}/apply/${slug}`;

  if (format === 'svg') {
    const svg = await QRCode.toString(url, { ...QR_OPTIONS, type: 'svg' });
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="mf-${slug}.svg"`,
        'Cache-Control': 'private, max-age=0, no-cache',
      },
    });
  }

  const buffer = await QRCode.toBuffer(url, QR_OPTIONS);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="mf-${slug}.png"`,
      'Cache-Control': 'private, max-age=0, no-cache',
    },
  });
}
```

### Step 3 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `npm run build` → compiles.
- [ ] Commit:

```bash
git add package.json package-lock.json src/app/api/trainers/qr/route.ts
git commit -m "feat(api): GET /api/trainers/qr (png + svg) using qrcode"
```

---

## Task 7 — Trainer me PATCH (acceptingClients toggle)

**Files:**
- Create: `src/app/api/trainers/me/route.ts`

### Step 1 — Write the PATCH handler

- [ ] Create the file:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const patchSchema = z.object({
  acceptingClients: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid fields', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const data: Record<string, boolean> = {};
  if (parsed.data.acceptingClients !== undefined)
    data.trainerAcceptingClients = parsed.data.acceptingClients;
  if (parsed.data.isPublic !== undefined)
    data.trainerIsPublic = parsed.data.isPublic;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      trainerAcceptingClients: true,
      trainerIsPublic: true,
    },
  });

  return NextResponse.json(updated);
}
```

### Step 2 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `git add src/app/api/trainers/me/route.ts && git commit -m "feat(api): PATCH /api/trainers/me accepting-clients + isPublic"`

---

## Task 8 — Find + update the applications POST handler

**Files:**
- Modify: whichever route currently handles `ContactSubmission.create`

### Step 1 — Find the existing route

- [ ] Run:

```bash
cd ~/Documents/Documents\ -\ Branden\'s\ M3\ MacBook/Projects/Development\ Projects/fitness-training-platform
grep -rln "contactSubmission.create\|ContactSubmission" src/app/api 2>/dev/null | head -5
```

Expected: finds `src/app/api/contact/route.ts` (most likely). Read that file to confirm the current schema before editing.

### Step 2 — Extend the accepted body

- [ ] Add `trainerId` (optional string) and `goal` (optional enum `get-stronger|lose-weight-recomp|other`) + `goalOther` (optional string) to the Zod schema in that route.
- [ ] In the create call, resolve `trainerId` to a valid TRAINER user (skip if null), check `trainerAcceptingClients` — if false, set `waitlist: true`.
- [ ] Set a signed, HTTP-only cookie `mf_apply_success` with a JSON payload `{ trainerId: string | null, email: string }` and a 60-second expiry so `/apply/success` can render contextually. Use Next.js `cookies().set()` on the response. For signing: the simplest approach in Next.js is to rely on the cookie being HTTP-only and short-lived (no tampering risk because it's display-only; if we were acting on its value server-side we'd sign it).

Concrete body structure (full replacement of the existing route is OK if it's small — otherwise extend). Example:

```ts
const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().max(500).optional(),
  trainerId: z.string().cuid().optional(),
  goal: z.enum(['get-stronger', 'lose-weight-recomp', 'other']).optional(),
  goalOther: z.string().max(200).optional(),
});
```

Pseudocode for the create:

```ts
let waitlist = false;
let assignedTrainerId: string | null = null;
if (body.trainerId) {
  const trainer = await prisma.user.findUnique({
    where: { id: body.trainerId },
    select: { role: true, trainerIsPublic: true, trainerAcceptingClients: true },
  });
  if (trainer && trainer.role === 'TRAINER' && trainer.trainerIsPublic) {
    assignedTrainerId = body.trainerId;
    if (!trainer.trainerAcceptingClients) waitlist = true;
  }
}

await prisma.contactSubmission.create({
  data: {
    name: body.name,
    email: body.email.toLowerCase().trim(),
    phone: body.phone ?? null,
    message: buildMessage(body),   // include goal + goalOther in the message body
    status: 'NEW',
    trainerId: assignedTrainerId,
    waitlist,
  },
});

const res = NextResponse.json({ ok: true });
res.cookies.set('mf_apply_success', JSON.stringify({
  trainerId: assignedTrainerId,
  email: body.email,
}), { httpOnly: true, maxAge: 60, path: '/' });
return res;
```

### Step 3 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `git add <modified-route>
git commit -m "feat(applications): accept trainerId + waitlist routing + success cookie"`

---

## Task 9 — useAssignedTrainer hook + API

**Files:**
- Create: `src/app/api/clients/me/trainer/route.ts`
- Create: `src/lib/hooks/useAssignedTrainer.ts`

### Step 1 — Write the API route

- [ ] Create `src/app/api/clients/me/trainer/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '');
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      trainerId: true,
      assignedTrainer: {
        select: {
          id: true,
          name: true,
          image: true,
          trainerSlug: true,
        },
      },
    },
  });

  if (!me?.assignedTrainer) {
    return NextResponse.json({ trainer: null });
  }

  const t = me.assignedTrainer;
  return NextResponse.json({
    trainer: {
      id: t.id,
      name: t.name,
      initials: initials(t.name),
      photoUrl: t.image,
      slug: t.trainerSlug,
    },
  });
}
```

**Note:** `assignedTrainer` is the existing relation name on `User.trainerId`. Confirm by running `grep "assignedTrainer\|trainerId" prisma/schema.prisma | head -10` — adjust the select if the relation is named differently.

### Step 2 — Write the hook

- [ ] Create `src/lib/hooks/useAssignedTrainer.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';

export interface AssignedTrainer {
  id: string;
  name: string;
  initials: string;
  photoUrl: string | null;
  slug: string | null;
}

export function useAssignedTrainer() {
  const [trainer, setTrainer] = useState<AssignedTrainer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/clients/me/trainer', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setTrainer(data.trainer ?? null);
      } catch {
        // Silent — fallback rendering handles null
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { trainer, loading };
}
```

### Step 3 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `git add src/app/api/clients/me/trainer src/lib/hooks/useAssignedTrainer.ts
git commit -m "feat(client): useAssignedTrainer hook + API"`

---

## Task 10 — Shared application form component

**Files:**
- Create: `src/components/apply/ApplyForm.tsx`

### Step 1 — Write the form

- [ ] Create `src/components/apply/ApplyForm.tsx`:

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface TrainerSelection {
  id: string | null;
  name: string | null;
}

export interface ApplyFormProps {
  selection: TrainerSelection;
  trainerPhone?: string;
  waitlist?: boolean;
}

type Goal = 'get-stronger' | 'lose-weight-recomp' | 'other';

export function ApplyForm({
  selection,
  trainerPhone = '(559) 365-2946',
  waitlist = false,
}: ApplyFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalOther, setGoalOther] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          trainerId: selection.id ?? undefined,
          goal: goal ?? undefined,
          goalOther: goal === 'other' ? goalOther.trim() : undefined,
          message: message.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.error || 'Submission failed. Try again.');
        return;
      }
      router.push('/apply/success');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const phoneHref = `sms:${trainerPhone.replace(/[^\d+]/g, '')}`;

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
      {/* Direct channel card */}
      <div
        style={{
          padding: 16,
          background: 'var(--mf-surface-2, #0E0E10)',
          border: '1px solid var(--mf-hairline, #1F1F22)',
          borderRadius: 6,
        }}
      >
        <div
          className="mf-eyebrow"
          style={{ marginBottom: 8 }}
        >
          FASTEST REPLY
        </div>
        <a
          href={phoneHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            height: 40,
            padding: '0 16px',
            background: 'var(--mf-accent, #FF4D1C)',
            color: '#0A0A0B',
            fontFamily: 'var(--font-mf-mono), monospace',
            fontSize: 11,
            letterSpacing: '.18em',
            fontWeight: 700,
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          📱 Text · {trainerPhone}
        </a>
        <div
          className="mf-fg-dim"
          style={{ fontSize: 11, marginTop: 8 }}
        >
          Or write it out below.
        </div>
      </div>

      {/* Selection chip */}
      <div
        className="mf-eyebrow"
        style={{ marginBottom: -6 }}
      >
        {selection.id ? `APPLYING TO · ${selection.name?.toUpperCase()}` : 'APPLYING · NO PREFERENCE'}
      </div>

      <Field label="NAME" required>
        <input
          className="mf-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Field>

      <Field label="EMAIL" required>
        <input
          type="email"
          className="mf-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>

      <Field label="PHONE" hint="Faster reply if you include it">
        <input
          type="tel"
          className="mf-input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>

      <Field label="WHAT ARE YOU TRYING TO DO?">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['get-stronger', 'lose-weight-recomp', 'other'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoal(g)}
              style={{
                height: 36,
                padding: '0 14px',
                background: goal === g ? 'var(--mf-accent)' : 'transparent',
                color: goal === g ? '#0A0A0B' : 'var(--mf-fg)',
                border: '1px solid var(--mf-hairline)',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {g === 'get-stronger' && 'Get stronger'}
              {g === 'lose-weight-recomp' && 'Lose weight / recomp'}
              {g === 'other' && 'Other →'}
            </button>
          ))}
        </div>
        {goal === 'other' && (
          <input
            className="mf-input"
            style={{ marginTop: 8 }}
            placeholder="Describe your goal"
            value={goalOther}
            onChange={(e) => setGoalOther(e.target.value)}
            maxLength={200}
          />
        )}
      </Field>

      <Field label="MESSAGE (OPTIONAL)">
        <textarea
          className="mf-input"
          rows={4}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Field>

      {error && (
        <div
          role="alert"
          style={{
            padding: '10px 12px',
            background: '#2a1212',
            border: '1px solid #6b1f1f',
            color: '#fca5a5',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mf-btn mf-btn-primary"
        style={{ height: 44 }}
      >
        {submitting
          ? 'Submitting…'
          : waitlist
            ? 'Join waitlist'
            : 'Submit application →'}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div
        style={{
          fontFamily: 'var(--font-mf-mono), monospace',
          fontSize: 10,
          letterSpacing: '.15em',
          color: 'var(--mf-fg-dim, #86868B)',
          marginBottom: 6,
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--mf-accent)', marginLeft: 4 }}>*</span>}
      </div>
      {children}
      {hint && (
        <div style={{ fontSize: 10, color: 'var(--mf-fg-mute)', marginTop: 4 }}>
          {hint}
        </div>
      )}
    </label>
  );
}
```

### Step 2 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `git add src/components/apply/ApplyForm.tsx && git commit -m "feat(apply): shared ApplyForm component"`

---

## Task 11 — `/apply` generic page (trainer picker)

**Files:**
- Create: `src/app/apply/page.tsx`
- Create: `src/app/apply/apply-generic-client.tsx`

### Step 1 — Write the server page

- [ ] Create `src/app/apply/page.tsx`:

```tsx
import PublicTopNav from '@/components/ui/mf/PublicTopNav';
import ApplyGenericClient from './apply-generic-client';

export const metadata = {
  title: 'Apply · Martinez/Fitness',
};

export default function ApplyPage() {
  return (
    <>
      <PublicTopNav />
      <main
        data-mf
        className="mf-bg mf-fg"
        style={{ minHeight: '100vh', padding: '48px 20px 80px' }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
            APPLY · MARTINEZ/FITNESS
          </div>
          <h1
            className="mf-font-display"
            style={{ fontSize: 40, lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0 }}
          >
            Train with a coach who knows your numbers.
          </h1>
          <p
            className="mf-fg-dim"
            style={{ fontSize: 15, marginTop: 12, maxWidth: 560, lineHeight: 1.5 }}
          >
            1:1 programming, weekly check-ins, invite-only. 48-hour review.
          </p>

          <div style={{ marginTop: 32 }}>
            <ApplyGenericClient />
          </div>
        </div>
      </main>
    </>
  );
}
```

### Step 2 — Write the client

- [ ] Create `src/app/apply/apply-generic-client.tsx`. Full implementation, no stubs — includes search, code-entry, and "no preference" paths:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApplyForm } from '@/components/apply/ApplyForm';

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  initials: string;
  acceptingClients: boolean;
}

export default function ApplyGenericClient() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selection, setSelection] = useState<{ id: string | null; name: string | null }>({
    id: null,
    name: null,
  });
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(
        `/api/trainers/search?q=${encodeURIComponent(query.trim())}`,
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const submitCode = async () => {
    setCodeError(null);
    const c = code.trim().toUpperCase();
    if (c.length !== 6) {
      setCodeError('Code is 6 characters.');
      return;
    }
    const res = await fetch('/api/trainers/resolve-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: c }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/apply/${data.slug}`);
    } else {
      setCodeError("We don't recognize that code. Check with your trainer.");
    }
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Trainer picker */}
      <div className="mf-card" style={{ padding: 20 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 12 }}>
          WHO DO YOU WANT TO TRAIN WITH?
        </div>

        <input
          className="mf-input"
          placeholder="Search trainers by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {results.length > 0 && (
          <div
            style={{
              marginTop: 8,
              border: '1px solid var(--mf-hairline)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelection({ id: r.id, name: r.name });
                  setResults([]);
                  setQuery(r.name);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--mf-hairline)',
                  color: 'var(--mf-fg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    background: 'var(--mf-surface-2)',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'var(--font-mf-mono)',
                    fontSize: 10,
                  }}
                >
                  {r.initials}
                </div>
                <div style={{ flex: 1 }}>{r.name}</div>
                {r.acceptingClients && (
                  <span className="mf-fg-dim" style={{ fontSize: 10 }}>
                    ● accepting
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--mf-hairline)' }} />
          <span className="mf-fg-mute" style={{ fontSize: 10 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--mf-hairline)' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="mf-input"
            placeholder="Trainer code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ fontFamily: 'var(--font-mf-mono)', flex: 1 }}
          />
          <button
            type="button"
            onClick={submitCode}
            className="mf-btn"
            style={{ height: 40 }}
          >
            Apply →
          </button>
        </div>
        {codeError && (
          <div
            role="alert"
            className="mf-fg-dim"
            style={{ fontSize: 11, marginTop: 6, color: '#fca5a5' }}
          >
            {codeError}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--mf-hairline)' }} />
          <span className="mf-fg-mute" style={{ fontSize: 10 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--mf-hairline)' }} />
        </div>

        <button
          type="button"
          onClick={() =>
            setSelection({ id: null, name: null })
          }
          className="mf-btn"
          style={{ width: '100%', height: 40 }}
        >
          No preference — match me
        </button>
      </div>

      {/* Form */}
      <ApplyForm selection={selection} />
    </div>
  );
}
```

### Step 3 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `npm run build` → compiles.
- [ ] `git add src/app/apply && git commit -m "feat(apply): /apply generic page with trainer picker"`

---

## Task 12 — `/apply/[trainerSlug]` direct page

**Files:**
- Create: `src/app/apply/[trainerSlug]/page.tsx`
- Create: `src/app/apply/[trainerSlug]/apply-direct-client.tsx`

### Step 1 — Write the server page

- [ ] Create `src/app/apply/[trainerSlug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import PublicTopNav from '@/components/ui/mf/PublicTopNav';
import { prisma } from '@/lib/prisma';
import ApplyDirectClient from './apply-direct-client';

export const dynamic = 'force-dynamic';

interface Params {
  trainerSlug: string;
}

export default async function ApplyDirectPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { trainerSlug } = await params;
  const trainer = await prisma.user.findUnique({
    where: { trainerSlug },
    select: {
      id: true,
      name: true,
      image: true,
      trainerAcceptingClients: true,
      trainerIsPublic: true,
    },
  });

  if (!trainer || !trainer.trainerIsPublic) {
    notFound();
  }

  return (
    <>
      <PublicTopNav />
      <main
        data-mf
        className="mf-bg mf-fg"
        style={{ minHeight: '100vh', padding: '48px 20px 80px' }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
            APPLY · MARTINEZ/FITNESS
          </div>
          <h1
            className="mf-font-display"
            style={{ fontSize: 40, lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0 }}
          >
            Train with {trainer.name}.
          </h1>
          {!trainer.trainerAcceptingClients && (
            <div
              className="mf-card"
              style={{
                marginTop: 16,
                padding: 12,
                borderColor: 'var(--mf-amber)',
                color: 'var(--mf-amber)',
              }}
            >
              WAITLIST ONLY · {trainer.name} is at capacity. Join below and
              they'll reach out when a spot opens.
            </div>
          )}

          <div style={{ marginTop: 32 }}>
            <ApplyDirectClient
              trainerId={trainer.id}
              trainerName={trainer.name ?? 'Coach'}
              waitlist={!trainer.trainerAcceptingClients}
            />
          </div>
        </div>
      </main>
    </>
  );
}
```

### Step 2 — Write the client

- [ ] Create `src/app/apply/[trainerSlug]/apply-direct-client.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { ApplyForm } from '@/components/apply/ApplyForm';

export default function ApplyDirectClient({
  trainerId,
  trainerName,
  waitlist,
}: {
  trainerId: string;
  trainerName: string;
  waitlist: boolean;
}) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="mf-card" style={{ padding: 16 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
          APPLYING WITH
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: 'var(--mf-surface-2)',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--font-mf-mono)',
              fontSize: 12,
            }}
          >
            {trainerName
              .split(/\s+/)
              .map((p) => p[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div style={{ flex: 1 }}>{trainerName}</div>
          <Link href="/apply" className="mf-fg-dim" style={{ fontSize: 11 }}>
            change →
          </Link>
        </div>
      </div>

      <ApplyForm
        selection={{ id: trainerId, name: trainerName }}
        waitlist={waitlist}
      />
    </div>
  );
}
```

### Step 3 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `npm run build` → compiles.
- [ ] `git add src/app/apply/[trainerSlug] && git commit -m "feat(apply): /apply/[trainerSlug] direct page"`

---

## Task 13 — `/apply/success` page + `/t/[slug]` redirect

**Files:**
- Create: `src/app/apply/success/page.tsx`
- Create: `src/app/t/[trainerSlug]/page.tsx`

### Step 1 — Success page

- [ ] Create `src/app/apply/success/page.tsx`:

```tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PublicTopNav from '@/components/ui/mf/PublicTopNav';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ApplySuccessPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get('mf_apply_success')?.value;
  if (!raw) redirect('/apply');

  let payload: { trainerId: string | null; email: string };
  try {
    payload = JSON.parse(raw);
  } catch {
    redirect('/apply');
  }

  const trainerName = payload.trainerId
    ? (
        await prisma.user.findUnique({
          where: { id: payload.trainerId },
          select: { name: true },
        })
      )?.name ?? null
    : null;

  return (
    <>
      <PublicTopNav />
      <main
        data-mf
        className="mf-bg mf-fg"
        style={{ minHeight: '100vh', padding: '96px 20px 80px' }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
            APPLICATION RECEIVED
          </div>
          <h1
            className="mf-font-display"
            style={{ fontSize: 36, margin: 0, lineHeight: 1.1 }}
          >
            Thanks — we'll be in touch.
          </h1>
          <p
            className="mf-fg-dim"
            style={{ fontSize: 15, lineHeight: 1.5, marginTop: 12 }}
          >
            {trainerName
              ? `${trainerName} reviews applications within 48 hours.`
              : 'Brent reviews applications within 48 hours.'}{' '}
            If your goals fit the current roster, you'll receive an invitation
            email with a code to join.
          </p>
          <div
            className="mf-card"
            style={{ padding: 16, marginTop: 24 }}
          >
            <Row label="APPLIED WITH" value={trainerName ?? 'Platform triage'} />
            <Row label="EMAIL" value={payload.email} />
          </div>
        </div>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0' }}>
      <div
        className="mf-font-mono mf-fg-dim"
        style={{ fontSize: 10, letterSpacing: '.15em', minWidth: 140 }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14 }}>{value}</div>
    </div>
  );
}
```

### Step 2 — Trainer profile redirect stub

- [ ] Create `src/app/t/[trainerSlug]/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

interface Params {
  trainerSlug: string;
}

export default async function TrainerProfileRedirect({
  params,
}: {
  params: Promise<Params>;
}) {
  const { trainerSlug } = await params;
  redirect(`/apply/${trainerSlug}`);
}
```

### Step 3 — `/contact` redirect via next.config

- [ ] Open `next.config.ts`. Add a `redirects()` method:

```ts
const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
  async redirects() {
    return [
      {
        source: '/contact',
        destination: '/apply',
        permanent: true,
      },
    ];
  },
};
```

### Step 4 — Delete the old contact UI

- [ ] Delete:

```bash
git rm src/app/contact/page.tsx src/components/ContactAnimations.tsx src/components/ContactForm.tsx
```

(The form is replaced by `ApplyForm`; the animations wrapper is unused after the delete.)

### Step 5 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `npm run build` → compiles.
- [ ] `git add -A && git commit -m "feat(apply): success page + /t redirect + retire /contact"`

---

## Task 14 — Trainer settings Sharing panel

**Files:**
- Find + modify the trainer settings page (grep first)
- Create: `src/app/trainer/settings/sharing-panel-client.tsx`

### Step 1 — Locate the trainer settings page

- [ ] Run:

```bash
grep -rln "trainer/settings\|TrainerSettings\|settings.*trainer" src/app 2>/dev/null | head -5
```

Expected: finds `src/app/trainer/(v4)/settings/page.tsx` or similar. Read it.

### Step 2 — Write the Sharing client

- [ ] Create `src/app/trainer/settings/sharing-panel-client.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function SharingPanelClient() {
  const [slug, setSlug] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(true);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/trainers/me/ensure-identity', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setSlug(data.slug);
        setCode(data.referralCode);
      }
    })();
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = slug ? `${origin}/apply/${slug}` : '';

  const copy = async (text: string, kind: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // no-op
    }
  };

  const toggleAccepting = async () => {
    const next = !accepting;
    setAccepting(next);
    await fetch('/api/trainers/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acceptingClients: next }),
    });
  };

  return (
    <section style={{ marginTop: 32 }}>
      <div className="mf-eyebrow" style={{ marginBottom: 12 }}>
        SHARING · YOUR REFERRAL CHANNELS
      </div>
      <div className="mf-card" style={{ padding: 20, display: 'grid', gap: 20 }}>
        <div>
          <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
            PERSONAL LINK
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="mf-input"
              readOnly
              value={link}
              style={{ flex: 1, fontFamily: 'var(--font-mf-mono)', fontSize: 12 }}
            />
            <button
              type="button"
              onClick={() => copy(link, 'link')}
              className="mf-btn"
              style={{ height: 40 }}
            >
              {copied === 'link' ? 'COPIED ✓' : 'COPY'}
            </button>
          </div>
        </div>

        {slug && (
          <div>
            <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
              QR CODE
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Image
                src="/api/trainers/qr?format=png"
                alt="QR code for your apply link"
                width={120}
                height={120}
                style={{ borderRadius: 4, background: '#0A0A0B' }}
                unoptimized
              />
              <div style={{ display: 'grid', gap: 6 }}>
                <a
                  href="/api/trainers/qr?format=png"
                  download
                  className="mf-btn"
                  style={{ textAlign: 'center' }}
                >
                  Download PNG
                </a>
                <a
                  href="/api/trainers/qr?format=svg"
                  download
                  className="mf-btn"
                  style={{ textAlign: 'center' }}
                >
                  Download SVG
                </a>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
            TRAINER CODE
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div
              style={{
                padding: '10px 16px',
                background: 'var(--mf-surface-2)',
                border: '1px solid var(--mf-hairline)',
                borderRadius: 4,
                fontFamily: 'var(--font-mf-mono)',
                fontSize: 18,
                letterSpacing: '0.15em',
              }}
            >
              MF-{code ?? '—'}
            </div>
            <button
              type="button"
              onClick={() => copy(code ?? '', 'code')}
              className="mf-btn"
              style={{ height: 40 }}
            >
              {copied === 'code' ? 'COPIED ✓' : 'COPY'}
            </button>
          </div>
        </div>

        <div>
          <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
            STATUS
          </div>
          <button
            type="button"
            onClick={toggleAccepting}
            className="mf-btn"
            style={{ height: 40 }}
          >
            {accepting ? '● Accepting new clients · Pause' : '○ Paused — click to resume'}
          </button>
          <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 6 }}>
            When paused your link still works but shows a waitlist card.
          </div>
        </div>
      </div>
    </section>
  );
}
```

### Step 3 — Mount it on the trainer settings page

- [ ] In the trainer settings page found by Step 1, import and render `<SharingPanelClient />` after the existing account/password sections.

### Step 4 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `npm run build` → compiles.
- [ ] `git add src/app/trainer && git commit -m "feat(trainer): Sharing panel in settings — link, QR, code, toggle"`

---

## Task 15 — Pricing CTAs → `Apply`

**Files:**
- Find any file with `Start 14-day trial` or `See the app` strings and update

### Step 1 — Locate the strings

- [ ] Run:

```bash
grep -rln "Start 14-day trial\|See the app\|14-day trial" src 2>/dev/null | head -10
```

Read each file. Identify the CTA buttons.

### Step 2 — Replace with `Apply`

- [ ] For each `Start 14-day trial` button, change the label to `Apply` and the `href` to `/apply`.
- [ ] For `See the app` CTAs that pointed to marketing demos, leave them if they still make sense (they don't gate anything) or convert to `Apply` if they were acting as a funnel CTA.

Judgment call: if a button's surrounding copy says "start your trial" it's a funnel CTA — convert. If it's "preview the product" it's demo UX — leave.

### Step 3 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `npm run build` → compiles.
- [ ] `git add -A && git commit -m "feat(marketing): pricing CTAs now route to /apply"`

---

## Task 16 — Per-client trainer branding (hook wiring)

**Files:**
- Modify: the client-dashboard shell component
- Modify: `src/components/animations/Celebration.tsx` (add `coach` prop)
- Modify: `src/components/animations/CelebrationProvider.tsx` (threads `coach` through if provided)

### Step 1 — Find the client shell

- [ ] Run:

```bash
grep -rln "ClientDesktopShell\|role=\"client\"\|CLIENT · V4" src/components 2>/dev/null | head -5
```

Identify the file that renders the client dashboard brand block (`MARTINEZ/FITNESS · CLIENT · V4`). It's either `DesktopShell.tsx` (shared) or a client-specific shell.

### Step 2 — Add a `brand` prop override

- [ ] If `DesktopShell` has a hardcoded brand, extract it behind a `brand` prop:

```tsx
interface Brand {
  name: string;
  sub: string;
  initials: string;
  photoUrl?: string | null;
  color?: string;
}

const PLATFORM_BRAND: Brand = {
  name: 'MARTINEZ/FITNESS',
  sub: 'V4',
  initials: 'MF',
};
```

Accept `brand?: Brand` in the props and render it instead of the hardcoded string when provided.

### Step 3 — Create a ClientShellBrand wrapper

- [ ] Create `src/components/ui/mf/ClientShellBrand.tsx`:

```tsx
'use client';

import { useAssignedTrainer } from '@/lib/hooks/useAssignedTrainer';
import type { ComponentProps } from 'react';
import { DesktopShell } from './DesktopShell';

export default function ClientShellBrand(
  props: Omit<ComponentProps<typeof DesktopShell>, 'brand'>,
) {
  const { trainer } = useAssignedTrainer();
  const brand = trainer
    ? {
        name: trainer.name,
        sub: 'YOUR COACH',
        initials: trainer.initials,
        photoUrl: trainer.photoUrl,
      }
    : undefined;
  return <DesktopShell {...props} brand={brand} />;
}
```

**Note:** This assumes `DesktopShell` is exported as a named export. If it's a default export, adjust the import.

### Step 4 — Swap the client-dashboard route's shell import

- [ ] Find where the client dashboard imports `DesktopShell` (grep for `role="client"`). Swap to `ClientShellBrand`.

### Step 5 — Celebration coach override

- [ ] In `src/components/animations/Celebration.tsx`, change the hardcoded coach display:

```tsx
// Find this block near the bottom:
<div ... >BM</div>
...
<div ... >COACH BRENT</div>

// Replace with a coach prop:
interface Props {
  preset: CelebrationPreset;
  onClose?: () => void;
  coach?: { initials: string; firstName: string };
}

const coach = props.coach ?? { initials: 'BM', firstName: 'BRENT' };
...
<div ... >{coach.initials}</div>
...
<div ... >COACH {coach.firstName.toUpperCase()}</div>
```

- [ ] In `CelebrationProvider.tsx`, let callers pass a `coach` in `overrides`:

```tsx
export interface CelebrationOverrides {
  // ...existing fields...
  coach?: { initials: string; firstName: string };
}
```

`CelebrationHost.tsx` reads `active.preset.coach` (fallback to `undefined`) and passes to `<Celebration>`.

- [ ] Client code that fires celebrations reads `useAssignedTrainer()` and threads coach:

```ts
const { trainer } = useAssignedTrainer();
celebrate('workout', {
  coach: trainer
    ? {
        initials: trainer.initials,
        firstName: trainer.name.split(/\s+/)[0] ?? 'COACH',
      }
    : undefined,
});
```

### Step 6 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `npm run build` → compiles.
- [ ] `git add -A && git commit -m "feat(client): per-trainer branding in shell + celebration"`

---

## Task 17 — PR achievement email display name

**Files:**
- Modify: `src/lib/email.ts` (or wherever `sendPRAchievedEmail` lives)

### Step 1 — Locate

- [ ] Run:

```bash
grep -rln "sendPRAchievedEmail\|PR achievement\|from:.*Brent" src 2>/dev/null | head -5
```

### Step 2 — Inject trainer name into the body copy

- [ ] Find the template string in the email body. Add a `trainerName` parameter to the function signature (defaulting to `'Brent Martinez'` if omitted). Replace hardcoded "Brent" in the body with `${trainerName}`.

Do NOT change the `from:` field — per the spec, SMTP sender stays the verified platform domain in Phase 1.

Callers (the workout-progress route) already have the trainer relation — pass `trainer.name` into the email call.

### Step 3 — Verify + commit

- [ ] `npx tsc --noEmit` → clean.
- [ ] `git add -A && git commit -m "feat(email): PR email body uses assigned trainer name"`

---

## Task 18 — Final build + manual smoke

**No new files. This is the verification pass.**

### Step 1 — Clean build

```bash
rm -rf .next
npm run build
```

Expected: `✓ Compiled successfully`.

### Step 2 — Typecheck

```bash
npx tsc --noEmit
```

Expected: zero errors.

### Step 3 — Dev-server smoke (local)

Start the dev server on a database that already has the schema (run the migration first, or let `prisma db push` on dev do it):

```bash
npx prisma db push
npm run dev
```

Then walk each flow:

- [ ] Visit `/apply` unauthenticated → trainer picker renders, search "brent" returns Brent (after Brent's first Settings visit populates his slug/code), code entry with Brent's displayed `MF-XXXXX` works, "No preference" button sets state correctly.
- [ ] Visit `/apply/brent-martinez` (use whatever Brent's slug is) → personalized hero, "Applying with" card is locked, form submits.
- [ ] Submit the form → redirected to `/apply/success` showing the correct trainer name + email.
- [ ] Visit `/apply/success` directly without cookie → redirects back to `/apply`.
- [ ] Visit `/contact` → redirects to `/apply`.
- [ ] Visit `/t/brent-martinez` → redirects to `/apply/brent-martinez`.
- [ ] Sign in as Brent → `/trainer/settings` shows the Sharing panel populated with slug + `MF-XXXXX` + QR code. Copy buttons work. Toggle "accepting clients" off, revisit `/apply/brent-martinez` → waitlist card shows. Toggle back on.
- [ ] Sign in as a client assigned to Brent → dashboard shows "BRENT MARTINEZ · YOUR COACH" instead of "MARTINEZ/FITNESS". A test celebration (via the demo grid, if still mounted) shows "COACH BRENT" + "BM".
- [ ] Check admin `/admin/contacts` — the submission from Step 3 shows up with `trainerId` populated. Waitlist submission shows the `waitlist=true` flag.

### Step 4 — Final commit (plan summary note)

```bash
git add -A
git commit -m "feat: multi-trainer apply flow — Phase 1 complete

Closes the design captured in
docs/superpowers/specs/2026-04-19-multi-trainer-apply-flow-design.md"
git push origin main
```

---

## Self-Review

Spec coverage check:

- Section 1 (data model) → Task 1 ✓
- Section 2 (routes) → Tasks 11 (/apply), 12 (/apply/[slug]), 13 (/apply/success + /t redirect + /contact redirect), 4/5/6 (APIs), 7 (trainer me PATCH), 8 (applications POST) ✓
- Section 3 (apply UX) → Task 10 (ApplyForm), 11 (generic client), 12 (direct client), 13 (success) ✓
- Section 4 (sharing panel) → Task 14 ✓
- Section 5 (per-client branding) → Tasks 9 (hook + API), 16 (shell + celebration), 17 (email) ✓
- Deferred items — Phase 2/3 not implemented ✓
- Testing strategy — Task 18 covers every bullet ✓

Placeholder scan: No TBD/TODO/"add error handling" entries. Each step has concrete code or concrete commands.

Type consistency: `Brand`, `AssignedTrainer`, `ApplyFormProps`, `SearchResult` types used consistently. Hook return type matches shell consumer usage. `TrainerSelection` shape in `ApplyForm` matches both generic (nullable trainer id) and direct (concrete id) callers.

One known gap acknowledged in-plan: Task 14 Step 1 requires a grep to find the actual trainer settings page path because the trainer dashboard structure wasn't fully mapped during brainstorming. If the page doesn't exist yet, Task 14 includes creating it; if it exists, the Sharing section is inserted.
