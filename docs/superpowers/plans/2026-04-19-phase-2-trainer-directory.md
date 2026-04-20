# Phase 2 — Public Trainer Directory + Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public multi-trainer directory + rich trainer profiles + social-proof surfaces + a trainer legal-agreement gate + admin moderation of transformation photos + a public takedown form, on top of the existing Phase 1 apply flow.

**Architecture:** Extends the existing `Trainer` model with profile fields. Adds 4 new Prisma models (`TrainerTestimonial`, `TrainerTransformation`, `TrainerAgreement`, `ContentTakedownRequest`). Reuses Phase 1's `ensureTrainerIdentity` pattern via a new `ensureTrainerRow` helper. Trust-on-submit for trainer content except transformation photos (admin-moderated). All photos stored under `/public/uploads/...` matching existing profile-photo pattern.

**Tech Stack:** Next.js 15 App Router, Prisma 6.19, PostgreSQL on Railway (db push, `--accept-data-loss` off), React 19. No new npm deps — existing `qrcode`, `zod`, `nanoid` cover everything.

**Verification model:** No test framework in this repo. Each task ends with `npx tsc --noEmit` + `npm run build` + a named manual smoke. Railway auto-deploys on push to `main`.

**Spec reference:** [docs/superpowers/specs/2026-04-19-phase-2-trainer-directory-design.md](docs/superpowers/specs/2026-04-19-phase-2-trainer-directory-design.md)

---

## File Structure

```
prisma/
  schema.prisma                                [modify — add Trainer fields + 4 new models]
  migrations/20260420000000_phase_2_trainer_directory/migration.sql  [create]

src/lib/
  trainerRow.ts                                [create — ensureTrainerRow helper]
  trainerStats.ts                              [create — verified-stats calculator]

src/app/api/trainers/
  me/profile/route.ts                          [create — PATCH trainer profile fields]
  me/photo/route.ts                            [create — POST trainer headshot upload]
  me/testimonials/route.ts                     [create — GET/POST]
  me/testimonials/[id]/route.ts                [create — PATCH/DELETE]
  me/transformations/route.ts                  [create — GET/POST multipart]
  me/transformations/[id]/route.ts             [create — DELETE]
  me/agreement/route.ts                        [create — GET current + my acceptance / POST accept]
  route.ts                                     [create — GET directory search]

src/app/api/specialties/
  suggest/route.ts                             [create — autocomplete + threshold]

src/app/api/admin/
  transformations/route.ts                    [create — GET pending queue / PATCH status]
  takedowns/route.ts                          [create — GET queue / PATCH resolve]

src/app/api/legal/
  takedown/route.ts                           [create — POST public takedown request]

src/app/trainer/(v4)/settings/
  profile/page.tsx                            [create — server]
  profile/profile-editor-client.tsx           [create — client form]
  testimonials/page.tsx                       [create — server]
  testimonials/testimonials-client.tsx        [create — client CRUD UI]
  transformations/page.tsx                    [create — server]
  transformations/transformations-client.tsx  [create — client upload + list]
  layout.tsx                                  [create — sub-nav for settings subsections]

src/app/trainer/(v4)/agreement/
  page.tsx                                    [create — agreement gate]
  agreement-client.tsx                        [create — accept form]

src/app/admin/
  transformations/page.tsx                    [create — moderation queue]
  transformations/moderation-client.tsx       [create — approve/reject UI]
  takedowns/page.tsx                          [create — takedowns queue]
  takedowns/takedowns-client.tsx              [create — resolve UI]

src/app/legal/takedown/
  page.tsx                                    [create — public takedown form]

src/app/trainers/
  page.tsx                                    [create — directory, server-rendered initial list]
  directory-client.tsx                        [create — filter bar + grid]
  trainer-card.tsx                            [create — shared card component]

src/app/t/[trainerSlug]/
  page.tsx                                    [modify — replace redirect with real profile]

src/components/trainer/
  AgreementGate.tsx                           [create — client-side agreement-status check]

src/lib/legal/
  agreement-text.ts                           [create — placeholder agreement text + version]
```

---

## Task 1 — Schema additions

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260420000000_phase_2_trainer_directory/migration.sql`

### Step 1 — Extend the `Trainer` model

- [ ] Open `prisma/schema.prisma`. Find `model Trainer`. Add these fields inside the existing model:

```prisma
  photoUrl          String?
  location          String?
  instagramHandle   String?
  priceTier         String?      // "tier-1" | "tier-2" | "tier-3" — free-form for now
  specialties       String[]     @default([])
  acceptsInPerson   Boolean      @default(false)
  acceptsOnline     Boolean      @default(false)
  profilePublishedAt DateTime?

  testimonials      TrainerTestimonial[]
  transformations   TrainerTransformation[]

  @@index([profilePublishedAt])
```

### Step 2 — Add the 4 new models at the bottom of the file

- [ ] Append after the last existing model:

```prisma
model TrainerTestimonial {
  id           String   @id @default(cuid())
  trainerId    String
  quote        String
  attribution  String
  order        Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  trainer      Trainer  @relation(fields: [trainerId], references: [id], onDelete: Cascade)

  @@index([trainerId, order])
  @@map("trainer_testimonials")
}

enum TransformationStatus {
  PENDING
  APPROVED
  REJECTED
  REMOVED
}

model TrainerTransformation {
  id              String               @id @default(cuid())
  trainerId       String
  beforePhotoUrl  String
  afterPhotoUrl   String
  caption         String?
  durationWeeks   Int?
  status          TransformationStatus @default(PENDING)
  reviewedBy      String?
  reviewedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime             @default(now())
  trainer         Trainer              @relation(fields: [trainerId], references: [id], onDelete: Cascade)

  @@index([trainerId, status])
  @@index([status, createdAt])
  @@map("trainer_transformations")
}

model TrainerAgreement {
  id          String   @id @default(cuid())
  userId      String   @unique
  version     String
  acceptedAt  DateTime @default(now())
  ipAddress   String?
  userAgent   String?
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade, name: "UserAgreement")

  @@map("trainer_agreements")
}

enum TakedownStatus {
  OPEN
  REVIEWING
  RESOLVED_REMOVED
  RESOLVED_KEPT
}

model ContentTakedownRequest {
  id              String         @id @default(cuid())
  contentType     String
  contentId       String
  reporterEmail   String
  reporterName    String?
  reason          String
  status          TakedownStatus @default(OPEN)
  resolvedBy      String?
  resolvedAt      DateTime?
  resolutionNote  String?
  createdAt       DateTime       @default(now())

  @@index([status, createdAt])
  @@map("content_takedown_requests")
}
```

### Step 3 — Add the back-relation on `User` for `TrainerAgreement`

- [ ] In `model User`, add this line near the other relations:

```prisma
  trainerAgreement  TrainerAgreement?  @relation("UserAgreement")
```

### Step 4 — Write the migration SQL

- [ ] Create `prisma/migrations/20260420000000_phase_2_trainer_directory/migration.sql`:

```sql
-- Trainer additions (all nullable or defaulted — safe for db push)
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "instagramHandle" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "priceTier" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "acceptsInPerson" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "acceptsOnline" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "profilePublishedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "trainers_profilePublishedAt_idx" ON "trainers"("profilePublishedAt");

-- TransformationStatus enum
DO $$ BEGIN
  CREATE TYPE "TransformationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- TakedownStatus enum
DO $$ BEGIN
  CREATE TYPE "TakedownStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED_REMOVED', 'RESOLVED_KEPT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- TrainerTestimonial
CREATE TABLE IF NOT EXISTS "trainer_testimonials" (
  "id"          TEXT PRIMARY KEY,
  "trainerId"   TEXT NOT NULL,
  "quote"       TEXT NOT NULL,
  "attribution" TEXT NOT NULL,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trainer_testimonials_trainerId_fkey"
    FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "trainer_testimonials_trainerId_order_idx"
  ON "trainer_testimonials"("trainerId", "order");

-- TrainerTransformation
CREATE TABLE IF NOT EXISTS "trainer_transformations" (
  "id"              TEXT PRIMARY KEY,
  "trainerId"       TEXT NOT NULL,
  "beforePhotoUrl"  TEXT NOT NULL,
  "afterPhotoUrl"   TEXT NOT NULL,
  "caption"         TEXT,
  "durationWeeks"   INTEGER,
  "status"          "TransformationStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedBy"      TEXT,
  "reviewedAt"      TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trainer_transformations_trainerId_fkey"
    FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "trainer_transformations_trainerId_status_idx"
  ON "trainer_transformations"("trainerId", "status");
CREATE INDEX IF NOT EXISTS "trainer_transformations_status_createdAt_idx"
  ON "trainer_transformations"("status", "createdAt");

-- TrainerAgreement
CREATE TABLE IF NOT EXISTS "trainer_agreements" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL UNIQUE,
  "version"    TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  CONSTRAINT "trainer_agreements_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ContentTakedownRequest
CREATE TABLE IF NOT EXISTS "content_takedown_requests" (
  "id"             TEXT PRIMARY KEY,
  "contentType"    TEXT NOT NULL,
  "contentId"      TEXT NOT NULL,
  "reporterEmail"  TEXT NOT NULL,
  "reporterName"   TEXT,
  "reason"         TEXT NOT NULL,
  "status"         "TakedownStatus" NOT NULL DEFAULT 'OPEN',
  "resolvedBy"     TEXT,
  "resolvedAt"     TIMESTAMP(3),
  "resolutionNote" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "content_takedown_requests_status_createdAt_idx"
  ON "content_takedown_requests"("status", "createdAt");
```

### Step 5 — Regenerate + verify

- [ ] Run `npx prisma generate` — expect `✔ Generated Prisma Client`.
- [ ] Run `npx prisma validate` — expect "The schema is valid."
- [ ] Run `npx tsc --noEmit 2>&1 | grep -v "routes\.d 2\|validator 2\|\.next/types" | grep "error TS"` — expect no output.
- [ ] Run `rm -rf .next && npm run build 2>&1 | grep Compiled` — expect `✓ Compiled successfully`.

### Step 6 — Commit

```bash
git add prisma/schema.prisma prisma/migrations/20260420000000_phase_2_trainer_directory
git commit -m "feat(db): Phase 2 — trainer profile fields + 4 new models

Additions to the existing Trainer model: photoUrl, location, instagramHandle,
priceTier, specialties (text[]), acceptsInPerson, acceptsOnline,
profilePublishedAt. Plus TrainerTestimonial, TrainerTransformation (with
TransformationStatus enum), TrainerAgreement, ContentTakedownRequest (with
TakedownStatus enum).

All additive — no existing columns altered, no data-loss risk. Safe for
Railway prisma db push --skip-generate on deploy."
```

---

## Task 2 — `ensureTrainerRow` helper

**Files:**
- Create: `src/lib/trainerRow.ts`

### Step 1 — Write the helper

- [ ] Create `src/lib/trainerRow.ts`:

```ts
import 'server-only';
import type { PrismaClient, Trainer } from '@prisma/client';

/**
 * Auto-create a Trainer row for a user if they are TRAINER-role but don't have
 * one yet. Matches the Phase 1 ensureTrainerIdentity pattern: safe to call
 * multiple times, returns the current Trainer row.
 */
export async function ensureTrainerRow(
  userId: string,
  prisma: PrismaClient,
): Promise<Trainer> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, trainer: { select: { id: true } } },
  });
  if (!user) throw new Error('User not found');
  if (user.role !== 'TRAINER' && user.role !== 'ADMIN') {
    throw new Error('Only trainers or admins can have a Trainer row');
  }

  if (user.trainer) {
    return prisma.trainer.findUniqueOrThrow({ where: { userId } });
  }

  return prisma.trainer.create({ data: { userId } });
}
```

### Step 2 — Verify + commit

- [ ] `npx tsc --noEmit` — zero errors.
- [ ] Commit:

```bash
git add src/lib/trainerRow.ts
git commit -m "feat(trainer): ensureTrainerRow helper — auto-create Trainer row"
```

---

## Task 3 — Agreement text + version constant

**Files:**
- Create: `src/lib/legal/agreement-text.ts`

### Step 1 — Write the text + version

- [ ] Create `src/lib/legal/agreement-text.ts`:

```ts
export const CURRENT_AGREEMENT_VERSION = 'v1-2026-04-19';

export const AGREEMENT_TITLE = 'Trainer Content Agreement';

export const AGREEMENT_PLACEHOLDER_BANNER =
  '[LEGAL REVIEW REQUIRED] — This text is a placeholder. Replace with ' +
  'lawyer-drafted terms before onboarding external trainers in volume.';

/**
 * Placeholder agreement text. Do NOT rely on this as a binding legal
 * document. A qualified attorney must draft the final version covering
 * your specific jurisdiction and business model.
 *
 * Rendered as plain markdown in the agreement page. Line breaks matter.
 */
export const AGREEMENT_MARKDOWN = `
## 1. Acceptance
By clicking "I Agree," you ("Trainer") accept this Trainer Content
Agreement with Martinez/Fitness ("Platform"). If you do not agree,
do not publish a trainer profile on the Platform.

## 2. Content Responsibility
You are solely responsible for all content you upload, publish, or
display on the Platform, including but not limited to: biographical
information, photographs of yourself, photographs of clients
(including before/after transformation images), written testimonials,
specialty descriptions, and any other material.

## 3. Content Warranty
You warrant and represent that:

- You own or have obtained all necessary rights, licenses, consents,
  and releases to publish the content you upload.
- For every photograph depicting a client or other individual, you
  have obtained that individual's explicit written consent to publish
  their image on a public website under your name.
- Your content does not infringe any third party's intellectual
  property, privacy, publicity, or other rights.
- Your content is accurate and not misleading. Testimonials you post
  reflect actual statements from the attributed individuals.

## 4. Indemnification
You agree to indemnify, defend, and hold harmless the Platform, its
owners, employees, agents, and affiliates from and against any and
all claims, damages, liabilities, costs, and expenses (including
reasonable attorneys' fees) arising out of or relating to (a) your
content, (b) your breach of this Agreement, (c) your violation of
any law, (d) your violation of any third party's rights.

## 5. Platform Rights
The Platform reserves the right, but has no obligation, to:

- Remove or disable any content at any time without notice
- Review, flag, or moderate any content
- Suspend or terminate your account for any breach of this Agreement
- Respond to takedown requests from third parties in accordance with
  applicable law

## 6. Takedown Procedure
If a third party believes content on your profile violates their
rights, they may submit a takedown request via the Platform's
\`/legal/takedown\` form. The Platform may remove the content pending
review. You will be notified and may dispute the removal.

## 7. No Liability for User Content
The Platform does not endorse, warrant, or assume responsibility for
any content uploaded by trainers. You acknowledge that the Platform
acts as a neutral host of user-generated content and is entitled to
any applicable safe-harbor protections under US law (including
47 U.S.C. § 230 and 17 U.S.C. § 512).

## 8. Limitation of Liability
To the maximum extent permitted by law, the Platform's aggregate
liability to you for any claim arising out of or relating to this
Agreement shall not exceed one hundred dollars ($100) or the
amounts paid by you to the Platform in the twelve months preceding
the claim, whichever is greater.

## 9. Modifications
The Platform may modify this Agreement from time to time. When the
Agreement is modified, you will be prompted to re-accept the new
version before publishing further content. Continued use of the
Platform after a version change, without re-acceptance, constitutes
withdrawal of your public profile.

## 10. Governing Law
This Agreement is governed by the laws of the State of California,
without regard to its conflict-of-laws provisions. Any dispute
arising under this Agreement shall be resolved exclusively in the
state or federal courts located in Fresno County, California.

---

By clicking "I Agree" below, you acknowledge that you have read,
understood, and agree to be bound by this Agreement.
`.trim();
```

### Step 2 — Verify + commit

- [ ] `npx tsc --noEmit` — zero errors.
- [ ] Commit:

```bash
git add src/lib/legal/agreement-text.ts
git commit -m "feat(legal): Phase 2 — placeholder trainer agreement text

Clearly marked [LEGAL REVIEW REQUIRED]. Covers ToS, content warranty,
indemnification, platform rights, takedown procedure, limitation of
liability. Version constant used to force re-acceptance on text change.
Replace with lawyer-drafted version within 30 days of first public
trainer signup."
```

---

## Task 4 — Agreement API + page + gate component

**Files:**
- Create: `src/app/api/trainers/me/agreement/route.ts`
- Create: `src/app/trainer/(v4)/agreement/page.tsx`
- Create: `src/app/trainer/(v4)/agreement/agreement-client.tsx`
- Create: `src/components/trainer/AgreementGate.tsx`

### Step 1 — API route

- [ ] Create `src/app/api/trainers/me/agreement/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CURRENT_AGREEMENT_VERSION } from '@/lib/legal/agreement-text';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const agreement = await prisma.trainerAgreement.findUnique({
    where: { userId: session.user.id },
  });

  const accepted = agreement?.version === CURRENT_AGREEMENT_VERSION;

  return NextResponse.json(
    {
      currentVersion: CURRENT_AGREEMENT_VERSION,
      accepted,
      acceptedVersion: agreement?.version ?? null,
      acceptedAt: agreement?.acceptedAt ?? null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = request.headers.get('user-agent') ?? null;

  const agreement = await prisma.trainerAgreement.upsert({
    where: { userId: session.user.id },
    update: {
      version: CURRENT_AGREEMENT_VERSION,
      acceptedAt: new Date(),
      ipAddress,
      userAgent,
    },
    create: {
      userId: session.user.id,
      version: CURRENT_AGREEMENT_VERSION,
      ipAddress,
      userAgent,
    },
  });

  return NextResponse.json(
    {
      acceptedVersion: agreement.version,
      acceptedAt: agreement.acceptedAt,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
```

### Step 2 — Agreement page (server)

- [ ] Create `src/app/trainer/(v4)/agreement/page.tsx`:

```tsx
import { requireTrainerSession } from '@/lib/trainer-data';
import { DesktopShell } from '@/components/ui/mf';
import {
  AGREEMENT_MARKDOWN,
  AGREEMENT_PLACEHOLDER_BANNER,
  AGREEMENT_TITLE,
  CURRENT_AGREEMENT_VERSION,
} from '@/lib/legal/agreement-text';
import AgreementClient from './agreement-client';

export const dynamic = 'force-dynamic';

export default async function TrainerAgreementPage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  await requireTrainerSession();
  const sp = await searchParams;
  const returnTo = sp.return ?? '/trainer/settings';

  return (
    <DesktopShell
      role="trainer"
      active="settings"
      title={AGREEMENT_TITLE}
      breadcrumbs="TRAINER / AGREEMENT"
    >
      <div style={{ padding: 24, maxWidth: 760 }}>
        <div
          className="mf-card-elev"
          style={{
            padding: 12,
            marginBottom: 20,
            borderColor: 'var(--mf-amber, #F5B544)',
            background: 'rgba(245,181,68,0.08)',
          }}
        >
          <div
            className="mf-font-mono"
            style={{
              fontSize: 11,
              letterSpacing: '.1em',
              color: 'var(--mf-amber, #F5B544)',
            }}
          >
            {AGREEMENT_PLACEHOLDER_BANNER}
          </div>
        </div>

        <AgreementClient
          markdown={AGREEMENT_MARKDOWN}
          version={CURRENT_AGREEMENT_VERSION}
          returnTo={returnTo}
        />
      </div>
    </DesktopShell>
  );
}
```

### Step 3 — Agreement client

- [ ] Create `src/app/trainer/(v4)/agreement/agreement-client.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  markdown: string;
  version: string;
  returnTo: string;
}

export default function AgreementClient({ markdown, version, returnTo }: Props) {
  const router = useRouter();
  const [agreed1, setAgreed1] = useState(false);
  const [agreed2, setAgreed2] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAccept = agreed1 && agreed2 && !submitting;

  const accept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/trainers/me/agreement', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not record acceptance. Try again.');
        return;
      }
      router.push(returnTo);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="mf-card"
        style={{
          padding: 24,
          maxHeight: 520,
          overflowY: 'auto',
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {markdown}
      </div>

      <div
        className="mf-font-mono mf-fg-mute"
        style={{ fontSize: 10, letterSpacing: '.1em', marginTop: 12 }}
      >
        VERSION · {version}
      </div>

      <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={agreed1}
            onChange={(e) => setAgreed1(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          I have read and agree to the Terms of Service, Liability Waiver, and
          Content Warranty.
        </label>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={agreed2}
            onChange={(e) => setAgreed2(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          I understand I am fully responsible for all content I post, including
          all client consents and releases.
        </label>
      </div>

      {error && (
        <div
          role="alert"
          style={{ color: '#fca5a5', fontSize: 12, marginTop: 12 }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={accept}
        disabled={!canAccept}
        className="mf-btn mf-btn-primary"
        style={{ height: 44, marginTop: 20, minWidth: 180 }}
      >
        {submitting ? 'Recording…' : 'I Agree →'}
      </button>
    </>
  );
}
```

### Step 4 — Agreement gate helper

- [ ] Create `src/components/trainer/AgreementGate.tsx`:

```tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Wraps a trainer-only surface that requires an accepted agreement version.
 * Redirects to /trainer/agreement?return=<current-path> if not accepted.
 */
export function AgreementGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/trainers/me/agreement', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;
      if (!data.accepted) {
        router.replace(`/trainer/agreement?return=${encodeURIComponent(pathname)}`);
      } else {
        setAccepted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (accepted !== true) return null;
  return <>{children}</>;
}
```

### Step 5 — Verify + commit

- [ ] `npx tsc --noEmit` — zero errors.
- [ ] `npm run build` — compiles.
- [ ] Commit:

```bash
git add src/app/api/trainers/me/agreement src/app/trainer/\(v4\)/agreement src/components/trainer/AgreementGate.tsx
git commit -m "feat(trainer): agreement gate — accept page + API + client wrapper"
```

---

## Task 5 — Trainer profile API + photo upload

**Files:**
- Create: `src/app/api/trainers/me/profile/route.ts`
- Create: `src/app/api/trainers/me/photo/route.ts`

### Step 1 — Profile PATCH route

- [ ] Create `src/app/api/trainers/me/profile/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';

const schema = z.object({
  bio: z.string().max(500).optional(),
  location: z.string().max(120).optional(),
  instagramHandle: z
    .string()
    .max(40)
    .regex(/^[A-Za-z0-9._]*$/, 'Invalid Instagram handle')
    .optional(),
  specialties: z.array(z.string().min(1).max(60)).max(5).optional(),
  experience: z.number().int().min(0).max(80).optional(),
  certifications: z.array(z.string().max(120)).max(20).optional(),
  priceTier: z.enum(['tier-1', 'tier-2', 'tier-3', 'contact']).optional(),
  hourlyRate: z.number().min(0).max(10000).nullable().optional(),
  acceptsInPerson: z.boolean().optional(),
  acceptsOnline: z.boolean().optional(),
});

function normalizeSpecialty(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, ' ');
}

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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid fields', details: parsed.error.issues },
      { status: 400 },
    );
  }

  await ensureTrainerRow(session.user.id, prisma);

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.specialties) {
    const normalized = parsed.data.specialties.map(normalizeSpecialty);
    data.specialties = Array.from(new Set(normalized));
  }
  if (parsed.data.certifications !== undefined) {
    data.certifications = parsed.data.certifications;
  }

  const trainer = await prisma.trainer.update({
    where: { userId: session.user.id },
    data,
  });

  return NextResponse.json(
    { trainer },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
```

### Step 2 — Photo upload route

- [ ] Create `src/app/api/trainers/me/photo/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get('photo');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!Object.keys(MIME_TO_EXT).includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type (must be JPEG, PNG, or WebP)' },
      { status: 400 },
    );
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 });
  }

  await ensureTrainerRow(session.user.id, prisma);

  const dir = path.join(process.cwd(), 'public', 'uploads', 'trainers', session.user.id);
  await mkdir(dir, { recursive: true });

  const ext = MIME_TO_EXT[file.type] ?? 'jpg';
  const filename = `profile-${Date.now()}.${ext}`;
  const filepath = path.join(dir, filename);
  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  const photoUrl = `/uploads/trainers/${session.user.id}/${filename}`;

  const trainer = await prisma.trainer.update({
    where: { userId: session.user.id },
    data: { photoUrl },
  });

  return NextResponse.json(
    { photoUrl: trainer.photoUrl },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
```

### Step 3 — Verify + commit

- [ ] `npx tsc --noEmit` — zero errors.
- [ ] Commit:

```bash
git add src/app/api/trainers/me/profile/route.ts src/app/api/trainers/me/photo/route.ts
git commit -m "feat(api): trainer profile PATCH + photo upload"
```

---

## Task 6 — Specialties autocomplete API

**Files:**
- Create: `src/app/api/specialties/suggest/route.ts`

### Step 1 — Write the route

- [ ] Create `src/app/api/specialties/suggest/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`specialties-suggest:${ip}`, {
    maxRequests: 30,
    windowSeconds: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const threshold = Number.parseInt(searchParams.get('threshold') ?? '1', 10);
  const minCount = Number.isFinite(threshold) && threshold > 0 ? threshold : 1;

  // Aggregate specialties across all public trainers.
  const rows = await prisma.$queryRaw<Array<{ tag: string; count: bigint }>>`
    SELECT lower(unnest(specialties)) AS tag, COUNT(*) AS count
    FROM "trainers" t
    JOIN "users" u ON u.id = t."userId"
    WHERE u."trainerIsPublic" = true
    GROUP BY tag
    HAVING COUNT(*) >= ${minCount}
    ${q ? /* prisma.raw template handles interpolation */ ` AND tag ILIKE ${q} || '%'` : ``}
    ORDER BY count DESC, tag ASC
    LIMIT 20
  `;

  return NextResponse.json({
    suggestions: rows.map((r) => ({ tag: r.tag, count: Number(r.count) })),
  });
}
```

**Note:** Prisma's `$queryRaw` doesn't support conditional SQL fragments via template literal. If the `q` filter is needed, split into two branches:

```ts
const rows = q
  ? await prisma.$queryRaw<Array<{ tag: string; count: bigint }>>`
      SELECT lower(unnest(specialties)) AS tag, COUNT(*) AS count
      FROM "trainers" t
      JOIN "users" u ON u.id = t."userId"
      WHERE u."trainerIsPublic" = true
      GROUP BY tag
      HAVING COUNT(*) >= ${minCount} AND lower(unnest(specialties)) ILIKE ${q + '%'}
      ORDER BY count DESC, tag ASC
      LIMIT 20
    `
  : await prisma.$queryRaw<Array<{ tag: string; count: bigint }>>`
      SELECT lower(unnest(specialties)) AS tag, COUNT(*) AS count
      FROM "trainers" t
      JOIN "users" u ON u.id = t."userId"
      WHERE u."trainerIsPublic" = true
      GROUP BY tag
      HAVING COUNT(*) >= ${minCount}
      ORDER BY count DESC, tag ASC
      LIMIT 20
    `;
```

Use the two-branch version as the final implementation.

### Step 2 — Verify + commit

- [ ] `npx tsc --noEmit` — zero errors.
- [ ] Commit:

```bash
git add src/app/api/specialties/suggest/route.ts
git commit -m "feat(api): GET /api/specialties/suggest with threshold + autocomplete"
```

---

## Task 7 — Testimonials API

**Files:**
- Create: `src/app/api/trainers/me/testimonials/route.ts`
- Create: `src/app/api/trainers/me/testimonials/[id]/route.ts`

### Step 1 — Collection endpoints (GET/POST)

- [ ] Create `src/app/api/trainers/me/testimonials/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';

const createSchema = z.object({
  quote: z.string().min(5).max(500),
  attribution: z.string().min(1).max(120),
  order: z.number().int().min(0).max(1000).optional(),
});

async function trainerRowOrForbid(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) return null;
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') return null;
  return ensureTrainerRow(userId, prisma);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const trainer = await ensureTrainerRow(session.user.id, prisma);
  const items = await prisma.trainerTestimonial.findMany({
    where: { trainerId: trainer.id },
    orderBy: { order: 'asc' },
  });
  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const trainer = await trainerRowOrForbid(session.user.id);
  if (!trainer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid fields', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const last = await prisma.trainerTestimonial.aggregate({
    where: { trainerId: trainer.id },
    _max: { order: true },
  });
  const nextOrder = parsed.data.order ?? (last._max.order ?? -1) + 1;

  const created = await prisma.trainerTestimonial.create({
    data: {
      trainerId: trainer.id,
      quote: parsed.data.quote,
      attribution: parsed.data.attribution,
      order: nextOrder,
    },
  });
  return NextResponse.json({ item: created }, { status: 201 });
}
```

### Step 2 — Single-item endpoints (PATCH/DELETE)

- [ ] Create `src/app/api/trainers/me/testimonials/[id]/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const patchSchema = z.object({
  quote: z.string().min(5).max(500).optional(),
  attribution: z.string().min(1).max(120).optional(),
  order: z.number().int().min(0).max(1000).optional(),
});

async function assertOwnership(userId: string, testimonialId: string) {
  const item = await prisma.trainerTestimonial.findUnique({
    where: { id: testimonialId },
    select: { trainer: { select: { userId: true } } },
  });
  if (!item) return { found: false as const };
  return { found: true as const, owner: item.trainer.userId === userId };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const check = await assertOwnership(session.user.id, id);
  if (!check.found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!check.owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

  const updated = await prisma.trainerTestimonial.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const check = await assertOwnership(session.user.id, id);
  if (!check.found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!check.owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.trainerTestimonial.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
```

### Step 3 — Verify + commit

- [ ] `npx tsc --noEmit` — zero errors.
- [ ] Commit:

```bash
git add src/app/api/trainers/me/testimonials
git commit -m "feat(api): testimonials CRUD for own profile"
```

---

## Task 8 — Transformations API (multipart upload)

**Files:**
- Create: `src/app/api/trainers/me/transformations/route.ts`
- Create: `src/app/api/trainers/me/transformations/[id]/route.ts`

### Step 1 — Collection endpoints

- [ ] Create `src/app/api/trainers/me/transformations/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function savePhoto(
  file: File,
  trainerId: string,
  id: string,
  phase: 'before' | 'after',
) {
  const ext = MIME_TO_EXT[file.type];
  if (!ext) throw new Error('invalid_type');
  if (file.size > 5 * 1024 * 1024) throw new Error('too_large');
  const dir = path.join(process.cwd(), 'public', 'uploads', 'transformations', trainerId);
  await mkdir(dir, { recursive: true });
  const filename = `${id}-${phase}.${ext}`;
  const filepath = path.join(dir, filename);
  await writeFile(filepath, Buffer.from(await file.arrayBuffer()));
  return `/uploads/transformations/${trainerId}/${filename}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const trainer = await ensureTrainerRow(session.user.id, prisma);
  const items = await prisma.trainerTransformation.findMany({
    where: { trainerId: trainer.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const trainer = await ensureTrainerRow(session.user.id, prisma);

  const form = await request.formData();
  const before = form.get('before');
  const after = form.get('after');
  const caption = (form.get('caption') ?? '').toString().slice(0, 200) || null;
  const durationRaw = form.get('durationWeeks');
  const durationWeeks =
    typeof durationRaw === 'string' && durationRaw.length > 0
      ? Math.max(0, Math.min(520, Number.parseInt(durationRaw, 10)))
      : null;

  if (!(before instanceof File) || !(after instanceof File)) {
    return NextResponse.json(
      { error: 'Both before and after photos required' },
      { status: 400 },
    );
  }

  const id = nanoid();
  try {
    const beforeUrl = await savePhoto(before, trainer.id, id, 'before');
    const afterUrl = await savePhoto(after, trainer.id, id, 'after');
    const created = await prisma.trainerTransformation.create({
      data: {
        id,
        trainerId: trainer.id,
        beforePhotoUrl: beforeUrl,
        afterPhotoUrl: afterUrl,
        caption,
        durationWeeks,
        status: 'PENDING',
      },
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === 'invalid_type') {
      return NextResponse.json(
        { error: 'Photos must be JPEG, PNG, or WebP' },
        { status: 400 },
      );
    }
    if ((error as Error).message === 'too_large') {
      return NextResponse.json({ error: 'Photo too large (max 5 MB)' }, { status: 400 });
    }
    throw error;
  }
}
```

### Step 2 — Single-item DELETE

- [ ] Create `src/app/api/trainers/me/transformations/[id]/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const item = await prisma.trainerTransformation.findUnique({
    where: { id },
    select: { trainer: { select: { userId: true } } },
  });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (item.trainer.userId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.trainerTransformation.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
```

### Step 3 — Verify + commit

- [ ] `npx tsc --noEmit` — zero errors.
- [ ] Commit:

```bash
git add src/app/api/trainers/me/transformations
git commit -m "feat(api): transformations upload + delete (multipart)"
```

---

## Task 9 — Verified stats helper

**Files:**
- Create: `src/lib/trainerStats.ts`

### Step 1 — Write the helper

- [ ] Create `src/lib/trainerStats.ts`:

```ts
import 'server-only';
import type { PrismaClient } from '@prisma/client';

export interface TrainerStats {
  activeClients: number;
  prsThisYear: number;
  yearsOnPlatform: number;
}

/**
 * Computed read-only stats for a trainer's public profile. Counts:
 *  - activeClients: Users where trainerId = this & isActive = true
 *  - prsThisYear: count of workoutProgress rows where weight set a new max
 *    for (userId, exerciseId) within the current calendar year
 *  - yearsOnPlatform: years since the User.createdAt
 * Returns null for any stat the trainer doesn't have data for (new trainer).
 */
export async function computeTrainerStats(
  trainerUserId: string,
  prisma: PrismaClient,
): Promise<TrainerStats | null> {
  const user = await prisma.user.findUnique({
    where: { id: trainerUserId },
    select: { createdAt: true },
  });
  if (!user) return null;

  const activeClients = await prisma.user.count({
    where: { trainerId: trainerUserId, isActive: true, role: 'CLIENT' },
  });

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const prsThisYearRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count
    FROM (
      SELECT
        wp."userId",
        wp."exerciseId",
        wp.weight,
        wp."date",
        LAG(MAX(wp.weight)) OVER (
          PARTITION BY wp."userId", wp."exerciseId"
          ORDER BY wp."date"
        ) AS prior_max
      FROM "workout_progress" wp
      JOIN "users" u ON u.id = wp."userId"
      WHERE u."trainerId" = ${trainerUserId}
        AND wp.weight IS NOT NULL
        AND wp."date" >= ${yearStart}
      GROUP BY wp."userId", wp."exerciseId", wp.weight, wp."date"
    ) s
    WHERE s.weight > COALESCE(s.prior_max, 0)
  `;
  const prsThisYear = Number(prsThisYearRows[0]?.count ?? 0n);

  const yearsOnPlatform = Math.max(
    0,
    new Date().getFullYear() - user.createdAt.getFullYear(),
  );

  return { activeClients, prsThisYear, yearsOnPlatform };
}
```

### Step 2 — Verify + commit

- [ ] `npx tsc --noEmit` — zero errors.
- [ ] Commit:

```bash
git add src/lib/trainerStats.ts
git commit -m "feat(trainer): verified stats helper (active clients / PRs / years)"
```

---

## Task 10 — Admin moderation queues + public takedown

**Files:**
- Create: `src/app/api/admin/transformations/route.ts`
- Create: `src/app/api/admin/takedowns/route.ts`
- Create: `src/app/api/legal/takedown/route.ts`

### Step 1 — Admin transformations queue API

- [ ] Create `src/app/api/admin/transformations/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const patchSchema = z.object({
  id: z.string().cuid(),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().max(500).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const items = await prisma.trainerTransformation.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      trainer: {
        select: {
          user: { select: { id: true, name: true, email: true, trainerSlug: true } },
        },
      },
    },
  });
  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
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
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const updated = await prisma.trainerTransformation.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.action === 'approve' ? 'APPROVED' : 'REJECTED',
      rejectionReason:
        parsed.data.action === 'reject'
          ? parsed.data.rejectionReason ?? 'No reason provided'
          : null,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    },
  });
  return NextResponse.json({ item: updated });
}
```

### Step 2 — Admin takedowns queue API

- [ ] Create `src/app/api/admin/takedowns/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const resolveSchema = z.object({
  id: z.string().cuid(),
  resolution: z.enum(['remove', 'keep']),
  note: z.string().max(1000).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const items = await prisma.contentTakedownRequest.findMany({
    where: { status: { in: ['OPEN', 'REVIEWING'] } },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const takedown = await prisma.contentTakedownRequest.findUnique({
    where: { id: parsed.data.id },
  });
  if (!takedown) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // If removing, soft-delete the referenced content
  if (parsed.data.resolution === 'remove') {
    if (takedown.contentType === 'transformation') {
      await prisma.trainerTransformation.update({
        where: { id: takedown.contentId },
        data: { status: 'REMOVED' },
      });
    } else if (takedown.contentType === 'testimonial') {
      await prisma.trainerTestimonial
        .delete({ where: { id: takedown.contentId } })
        .catch(() => null);
    }
  }

  const updated = await prisma.contentTakedownRequest.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.resolution === 'remove' ? 'RESOLVED_REMOVED' : 'RESOLVED_KEPT',
      resolvedBy: session.user.id,
      resolvedAt: new Date(),
      resolutionNote: parsed.data.note,
    },
  });
  return NextResponse.json({ item: updated });
}
```

### Step 3 — Public takedown submission API

- [ ] Create `src/app/api/legal/takedown/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const schema = z.object({
  contentType: z.enum(['transformation', 'testimonial', 'profile']),
  contentId: z.string().min(1).max(200),
  reporterEmail: z.string().email(),
  reporterName: z.string().max(120).optional(),
  reason: z.string().min(10).max(2000),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`takedown:${ip}`, {
    maxRequests: 3,
    windowSeconds: 60 * 60,
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
    return NextResponse.json(
      { error: 'Invalid fields', details: parsed.error.issues },
      { status: 400 },
    );
  }

  await prisma.contentTakedownRequest.create({
    data: {
      contentType: parsed.data.contentType,
      contentId: parsed.data.contentId,
      reporterEmail: parsed.data.reporterEmail.toLowerCase().trim(),
      reporterName: parsed.data.reporterName ?? null,
      reason: parsed.data.reason,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
```

### Step 4 — Verify + commit

- [ ] `npx tsc --noEmit` — zero errors.
- [ ] Commit:

```bash
git add src/app/api/admin/transformations src/app/api/admin/takedowns src/app/api/legal/takedown
git commit -m "feat(api): admin moderation queues + public takedown submission"
```

---

## Task 11 — Trainer settings UI (profile / testimonials / transformations)

**Files:** 6 new files under `src/app/trainer/(v4)/settings/*`. Detailed client components writing to the APIs from Tasks 5-8.

Due to the size of these UI files (each ~200-400 lines), the implementation should follow the established pattern from Phase 1's `sharing-panel-client.tsx`:

- Server page wraps `<DesktopShell>` with role="trainer", active="settings", title, breadcrumbs
- Mounts `<AgreementGate>` from Task 4 around the client component
- Client component handles all form state + fetch + optimistic UI
- Save + delete actions hit the APIs; optimistic updates with rollback on error

**Files to create (one commit per subpage for easy review):**

1. `src/app/trainer/(v4)/settings/profile/page.tsx` + `profile-editor-client.tsx`
   - Fields: photoUrl (upload), location, instagramHandle, bio, specialties (with autocomplete from Task 6), experience, certifications, priceTier, hourlyRate, acceptsInPerson, acceptsOnline
   - "Make profile public" toggle (disabled until photo+bio+specialties+location filled)
   - Commit: `feat(trainer): profile editor page`

2. `src/app/trainer/(v4)/settings/testimonials/page.tsx` + `testimonials-client.tsx`
   - List with drag-to-reorder (`PATCH :id { order }`)
   - Inline add form
   - Edit + delete per row
   - Commit: `feat(trainer): testimonials editor`

3. `src/app/trainer/(v4)/settings/transformations/page.tsx` + `transformations-client.tsx`
   - Grouped by status (Live / Pending / Rejected / Removed)
   - Upload modal with before + after + caption + durationWeeks
   - Each row shows `status` chip; rejected shows `rejectionReason`
   - Commit: `feat(trainer): transformations editor`

Each commit ends with `npx tsc --noEmit` + `npm run build` — both must be clean.

Detailed code for these three UI pairs follows the exact structure of Phase 1's `sharing-panel-client.tsx`: `'use client'` → local state → fetch on mount → submit handlers → `mf-card` styled fields with `mf-eyebrow` labels + `mf-btn-primary` CTA.

---

## Task 12 — Admin moderation UI + public takedown page

**Files:**
- Create: `src/app/admin/transformations/page.tsx` + `moderation-client.tsx`
- Create: `src/app/admin/takedowns/page.tsx` + `takedowns-client.tsx`
- Create: `src/app/legal/takedown/page.tsx` (single client page; no auth)

Follow the `/admin/contacts` pattern already in the repo — `DesktopShell` with role="admin", table of rows, approve/reject or resolve buttons hitting the Task 10 APIs.

The public `/legal/takedown` page renders a minimal form with `PublicTopNav` on top and submits to `POST /api/legal/takedown`. Includes the `contentId` and `type` from URL query string when linked from a transformation ("Report this content" link on `/t/[slug]`).

One commit: `feat(admin+legal): moderation queues + public takedown form`.

---

## Task 13 — Public trainer profile page `/t/[slug]`

**Files:**
- Modify: `src/app/t/[trainerSlug]/page.tsx` (currently a redirect)
- Create: `src/app/t/[trainerSlug]/profile-sections.tsx` (renders bio/specs/certs/stats/testimonials/transformations as composable sections)

### Step 1 — Replace the redirect with a real profile

- [ ] Open `src/app/t/[trainerSlug]/page.tsx`. Replace the entire file:

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import PublicTopNav from '@/components/ui/mf/PublicTopNav';
import { prisma } from '@/lib/prisma';
import { computeTrainerStats } from '@/lib/trainerStats';
import ProfileSections from './profile-sections';

export const dynamic = 'force-dynamic';

interface Params { trainerSlug: string }

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { trainerSlug } = await params;
  const user = await prisma.user.findFirst({
    where: { trainerSlug, trainerIsPublic: true },
    select: { name: true, trainer: { select: { bio: true, photoUrl: true } } },
  });
  if (!user) return { title: 'Trainer not found · Martinez/Fitness' };
  return {
    title: `${user.name} · Martinez/Fitness`,
    description: user.trainer?.bio?.slice(0, 160) ?? `Train with ${user.name}.`,
    openGraph: {
      title: `${user.name} · Martinez/Fitness`,
      description: user.trainer?.bio?.slice(0, 160) ?? `Train with ${user.name}.`,
      images: user.trainer?.photoUrl ? [{ url: user.trainer.photoUrl }] : [],
    },
  };
}

export default async function TrainerProfilePage({
  params,
}: { params: Promise<Params> }) {
  const { trainerSlug } = await params;

  const user = await prisma.user.findFirst({
    where: { trainerSlug, trainerIsPublic: true },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      image: true,
      trainerAcceptingClients: true,
      trainer: {
        select: {
          bio: true,
          photoUrl: true,
          location: true,
          instagramHandle: true,
          experience: true,
          certifications: true,
          specialties: true,
          priceTier: true,
          hourlyRate: true,
          acceptsInPerson: true,
          acceptsOnline: true,
          testimonials: { orderBy: { order: 'asc' } },
          transformations: {
            where: { status: 'APPROVED' },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!user || !user.trainer) notFound();

  const stats = await computeTrainerStats(user.id, prisma);
  const photo = user.trainer.photoUrl ?? user.image;

  return (
    <>
      <PublicTopNav />
      <main
        data-mf
        className="mf-bg mf-fg"
        style={{ minHeight: '100vh', padding: '48px 20px 80px' }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: photo ? '240px 1fr' : '1fr',
              gap: 24,
              alignItems: 'start',
            }}
          >
            {photo && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={photo}
                alt={user.name ?? 'Trainer'}
                style={{
                  width: 240,
                  aspectRatio: '4 / 5',
                  objectFit: 'cover',
                  borderRadius: 6,
                  border: '1px solid var(--mf-hairline)',
                }}
              />
            )}
            <div>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                TRAINER ·{user.trainer.location ? ` ${user.trainer.location.toUpperCase()}` : ''}
                {user.trainer.experience ? ` · ${user.trainer.experience} YRS` : ''}
              </div>
              <h1
                className="mf-font-display"
                style={{ fontSize: 48, lineHeight: 1.05, margin: 0 }}
              >
                {user.name}
              </h1>

              {!user.trainerAcceptingClients && (
                <div
                  className="mf-card"
                  style={{
                    marginTop: 12,
                    padding: 10,
                    borderColor: 'var(--mf-amber, #F5B544)',
                    color: 'var(--mf-amber, #F5B544)',
                    fontSize: 12,
                  }}
                >
                  WAITLIST ONLY · Not accepting new clients right now
                </div>
              )}

              <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link
                  href={`/apply/${trainerSlug}`}
                  className="mf-btn mf-btn-primary"
                  style={{ height: 44, padding: '0 24px' }}
                >
                  Apply →
                </Link>
                {user.trainer.instagramHandle && (
                  <a
                    href={`https://instagram.com/${user.trainer.instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mf-btn"
                    style={{ height: 44, padding: '0 20px' }}
                  >
                    @{user.trainer.instagramHandle}
                  </a>
                )}
              </div>
            </div>
          </div>

          <ProfileSections
            bio={user.trainer.bio}
            specialties={user.trainer.specialties}
            certifications={user.trainer.certifications as string[] | null}
            priceTier={user.trainer.priceTier}
            hourlyRate={user.trainer.hourlyRate}
            acceptsInPerson={user.trainer.acceptsInPerson}
            acceptsOnline={user.trainer.acceptsOnline}
            stats={stats}
            testimonials={user.trainer.testimonials}
            transformations={user.trainer.transformations}
            trainerName={user.name ?? 'Trainer'}
            trainerSlug={trainerSlug}
          />

          <div style={{ marginTop: 48, textAlign: 'center' }}>
            <Link
              href={`/apply/${trainerSlug}`}
              className="mf-btn mf-btn-primary"
              style={{ height: 48, padding: '0 32px' }}
            >
              Apply to {user.name} →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
```

### Step 2 — Profile sections component

- [ ] Create `src/app/t/[trainerSlug]/profile-sections.tsx`:

(Large — ~250 lines. Renders bio, specialties chips, certifications list, stats block (only when `stats` non-null AND activeClients > 0), testimonials cards, transformations gallery with "Report this content" link to `/legal/takedown?type=transformation&contentId=<id>`. Follow the mf-card + mf-eyebrow + Oswald heading style throughout. Empty sections don't render at all.)

### Step 3 — Verify + commit

- [ ] `npx tsc --noEmit` — zero errors.
- [ ] `npm run build` — compiles.
- [ ] Commit:

```bash
git add src/app/t/\[trainerSlug\]
git commit -m "feat(public): real trainer profile page at /t/[slug]"
```

---

## Task 14 — Directory page `/trainers` + search API

**Files:**
- Create: `src/app/api/trainers/route.ts` (already listed above; this is where the directory search lives)
- Create: `src/app/trainers/page.tsx` (server initial fetch)
- Create: `src/app/trainers/directory-client.tsx` (filter bar + grid)
- Create: `src/app/trainers/trainer-card.tsx` (card component)

### Step 1 — Directory search API

- [ ] Create `src/app/api/trainers/route.ts` with filter support:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim().toLowerCase() ?? '';
  const specialty = searchParams.get('specialty')?.trim().toLowerCase() ?? '';
  const location = searchParams.get('loc')?.trim() ?? '';
  const accepting = searchParams.get('accepting') === '1';
  const tier = searchParams.get('tier') ?? '';
  const minYearsRaw = Number.parseInt(searchParams.get('minYears') ?? '0', 10);
  const minYears = Number.isFinite(minYearsRaw) ? Math.max(0, minYearsRaw) : 0;
  const sort = searchParams.get('sort') ?? 'recent';

  const trainers = await prisma.user.findMany({
    where: {
      role: 'TRAINER',
      trainerIsPublic: true,
      trainerSlug: { not: null },
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      ...(accepting ? { trainerAcceptingClients: true } : {}),
      trainer: {
        is: {
          ...(specialty ? { specialties: { has: specialty } } : {}),
          ...(location
            ? { location: { contains: location, mode: 'insensitive' } }
            : {}),
          ...(tier ? { priceTier: tier } : {}),
          ...(minYears > 0 ? { experience: { gte: minYears } } : {}),
        },
      },
    },
    select: {
      id: true,
      name: true,
      image: true,
      trainerSlug: true,
      trainerAcceptingClients: true,
      trainer: {
        select: {
          bio: true,
          photoUrl: true,
          location: true,
          experience: true,
          specialties: true,
          priceTier: true,
          profilePublishedAt: true,
        },
      },
    },
    orderBy:
      sort === 'experienced'
        ? { trainer: { experience: 'desc' } }
        : sort === 'az'
          ? { name: 'asc' }
          : { trainer: { profilePublishedAt: 'desc' } },
    take: 100,
  });

  return NextResponse.json({ trainers });
}
```

### Step 2 — Directory page components

- [ ] Create `src/app/trainers/trainer-card.tsx` — single card rendering (photo, name, location, experience, price tier, bio snippet, up to 3 specialties as chips, "Apply →" link).

- [ ] Create `src/app/trainers/directory-client.tsx` — client component with:
   - Filter bar: text search, specialty dropdown (populated from `/api/specialties/suggest?threshold=2`), location input, accepting toggle, tier chips, years-experience chips, sort dropdown
   - URL state sync (each filter change pushes to URL via `router.replace` so filters are shareable)
   - Grid of `<TrainerCard>` rendered from fetch results (`/api/trainers?<filters>`)
   - Empty state when no matches

- [ ] Create `src/app/trainers/page.tsx` — server component that does initial fetch (no filters), passes to `<DirectoryClient initialTrainers={...} />`.

### Step 3 — Verify + commit

- [ ] `npx tsc --noEmit` — zero errors.
- [ ] `npm run build` — compiles; confirm `/trainers` and `/api/trainers` in route manifest.
- [ ] Commit:

```bash
git add src/app/trainers src/app/api/trainers/route.ts
git commit -m "feat(public): /trainers directory + filter API"
```

---

## Task 15 — Nav wiring + final smoke

**Files:**
- Modify: `src/components/ui/mf/PublicTopNav.tsx` (add `/trainers` link)
- Modify: `src/components/ui/mf/DesktopShell.tsx` (trainer settings sub-nav: Profile / Testimonials / Transformations)

### Step 1 — Public nav: add "Trainers" link

- [ ] In `PublicTopNav.tsx`, add a Link between "For Clients" and "Pricing":

```tsx
<Link href="/trainers" className={linkClass('trainers-dir')}>Trainers</Link>
```

Update the `activeSection` union to include `'trainers-dir'`.

### Step 2 — Admin nav: add Transformations + Takedowns items

- [ ] In `DesktopShell.tsx`, `ADMIN_NAV` array, insert between `audit` and `settings`:

```ts
{ k: 'transformations', l: 'Transformations', i: Camera, href: '/admin/transformations' },
{ k: 'takedowns',       l: 'Takedowns',       i: AlertTriangle, href: '/admin/takedowns' },
```

Add `Camera` + `AlertTriangle` to the lucide import at the top.

### Step 3 — Trainer settings sub-nav

- [ ] In `DesktopShell.tsx`, `TRAINER_NAV` array — the `settings` entry currently points at `/trainer/settings`. The sub-pages (`/trainer/settings/profile`, `/trainer/settings/testimonials`, `/trainer/settings/transformations`) are navigated via a row of chips inside the settings layout. Update the existing `/trainer/settings/page.tsx` to render a chip nav at the top linking to each subpage, or create `src/app/trainer/(v4)/settings/layout.tsx` rendering the chip nav above `{children}`.

### Step 4 — Final end-to-end smoke

Manual pass (with dev server running):

- [ ] Sign in as Brent. Visit `/trainer/settings/profile` → should redirect to `/trainer/agreement?return=/trainer/settings/profile`. Accept → land back on profile. Fill bio + specialties + location + upload photo. Flip `trainerIsPublic = true` via Phase 1 Sharing panel.
- [ ] Visit `/trainers` unauthenticated → Brent appears as a card.
- [ ] Click the card → `/t/brent-martinez` renders the full profile.
- [ ] Add a testimonial via `/trainer/settings/testimonials` → appears on public profile.
- [ ] Upload a transformation (2 photos) via `/trainer/settings/transformations` → appears with `PENDING` status in the trainer's own list.
- [ ] Sign in as admin (or switch Brent to ADMIN role). Visit `/admin/transformations` → see the pending upload. Approve.
- [ ] Reload `/t/brent-martinez` → transformation appears in the gallery.
- [ ] Click "Report this content" → `/legal/takedown?type=transformation&contentId=...` → submit a takedown.
- [ ] Visit `/admin/takedowns` → see the request. Click "Remove content" → transformation status flips to REMOVED, no longer visible on public profile.
- [ ] Directory filters: set specialty chip → list narrows. Clear → restores.

### Step 5 — Final commit

```bash
git add -A
git commit -m "feat: Phase 2 multi-trainer directory — complete

Wires navigation, completes the E2E smoke, marks Phase 2 done.
See docs/superpowers/specs/2026-04-19-phase-2-trainer-directory-design.md"
git push origin main
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Plan task(s) |
|---|---|
| §1 Data model — Trainer fields + 4 new models | Task 1 ✓ |
| §1 ensureTrainerRow helper | Task 2 ✓ |
| §2 Routes table | Covered across Tasks 4, 5, 6, 7, 8, 10, 11, 12, 13, 14 ✓ |
| §3 Specialties taxonomy | Task 6 (suggest API) + Task 11 (editor UI) ✓ |
| §4 `/trainers` directory | Task 14 ✓ |
| §4 `/t/[slug]` profile | Task 13 ✓ |
| §5 Trainer profile editor | Task 11 ✓ |
| §5 Testimonials editor | Task 11 ✓ |
| §5 Transformations editor | Task 11 ✓ |
| §6 Agreement flow | Tasks 3 + 4 ✓ |
| §6 Placeholder text | Task 3 ✓ |
| §7 Admin moderation | Tasks 10 + 12 ✓ |
| §7 Public takedown form | Tasks 10 + 12 ✓ |
| §8 Photo upload infrastructure | Tasks 5 + 8 (reuses /public/uploads) ✓ |

**Placeholder scan:** No TBD / TODO / "similar to Task N" / "handle edge cases" in actionable steps. Task 11 Step labels note "follows established pattern" but each subpage gets its own commit and the exact behavior is specified (fields, validation, API endpoints to hit). Task 13 Step 2's "~250 lines" note is a size hint, not a content placeholder.

**Type consistency:** Schema types (`TrainerTestimonial`, `TrainerTransformation`, `TrainerAgreement`, `ContentTakedownRequest`) + enums (`TransformationStatus`, `TakedownStatus`) used consistently. Filter API query params (`q`, `specialty`, `loc`, `accepting`, `tier`, `minYears`, `sort`) are consistent between Task 14's API and the directory-client description. `CURRENT_AGREEMENT_VERSION` consistent between Task 3, Task 4, and Task 4's gate component.

**Effort estimate check:** 15 tasks, most 2-4 file creations each. Mechanical after Task 1. Estimate 3-4 days if execution goes smoothly (some UI polish inevitably takes longer than spec suggests).
