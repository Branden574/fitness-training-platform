# Phase 3 Trainer Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the platform from a single-trainer (Brent-only) app into a real multi-trainer SaaS marketplace where (a) any trainer can self-sign-up, (b) the admin can still hand-onboard trainers and override pricing for foundation testers, (c) Martinez/Fitness collects a monthly platform fee from paying trainers via Stripe subscriptions, (d) trainers accept client payments directly via Stripe Connect, and (e) reply-to emails on contact submissions come from each trainer's own address.

**Architecture:** Nullable additive schema columns on the existing `Trainer` + `Invitation` models so Railway `prisma db push --skip-generate` stays safe (no `--accept-data-loss`). All Stripe code is env-gated — free-tier trainers + foundation testers never hit Stripe, so Brent can onboard testers today and Stripe keys can be added later without blocking other work. Admin surface mostly lives on `/admin/users` with a new pricing editor; trainer self-service lives at `/for-trainers/signup` with a billing page at `/trainer/settings/billing`.

**Tech Stack:** Next.js 15 App Router (server actions + route handlers), Prisma on Postgres (Railway), NextAuth credentials provider, Stripe Node SDK + webhooks, Zod validation, Tailwind + `mf-*` design tokens.

**Deployment constraint from memory:** main auto-deploys via Railway's `prisma db push --skip-generate`; no `--accept-data-loss`. Every schema change must be an additive nullable column — never a drop, rename, or new required field.

**Stripe external prerequisites (Branden's todo, doesn't block Stage 1 or 2):**
- Stripe account with Connect enabled (Platform profile)
- `STRIPE_SECRET_KEY` (test then live)
- `STRIPE_WEBHOOK_SECRET` (from webhook endpoint)
- `STRIPE_CONNECT_CLIENT_ID` (for Standard Connect onboarding)
- Three recurring Price IDs (one per tier: STARTER / PRO / CUSTOM)
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_CUSTOM` env vars

**Test approach:** The repo has no automated test framework wired. Verification per task is (a) `npx tsc --noEmit` clean, (b) `npx eslint <changed paths>` clean, (c) manual smoke steps in browser / curl, (d) Stripe CLI `stripe listen` + `stripe trigger` for webhook tasks once keys are wired.

---

## File Structure

New files:
- `src/app/api/admin/trainers/[id]/pricing/route.ts` — admin sets tier + override price
- `src/app/admin/users/trainer-pricing-client.tsx` — inline pricing editor
- `src/app/api/trainers/signup/route.ts` — public trainer self-signup
- `src/app/for-trainers/signup/page.tsx` — public signup landing
- `src/app/for-trainers/signup/signup-form-client.tsx` — signup form
- `src/lib/stripe.ts` — Stripe SDK singleton + env helpers
- `src/lib/subscriptionTiers.ts` — tier → price mapping
- `src/app/api/billing/checkout/route.ts` — create Checkout session
- `src/app/api/billing/portal/route.ts` — billing portal link
- `src/app/api/webhooks/stripe/route.ts` — Stripe webhook handler
- `src/app/api/connect/onboarding-link/route.ts` — Connect onboarding URL
- `src/app/api/connect/account-status/route.ts` — Connect account GET
- `src/app/trainer/(v4)/settings/billing/page.tsx` — trainer billing page
- `src/app/trainer/(v4)/settings/billing/billing-client.tsx` — billing UI

Modified files:
- `prisma/schema.prisma` — Trainer billing fields, Invitation.role, replyFromEmail
- `src/app/api/auth/register/route.ts` — role-aware registration
- `src/app/admin/invitations/new-invitation-client.tsx` — role selector
- `src/app/api/admin/invitations/route.ts` (or wherever invites are POSTed) — accept role
- `src/app/admin/users/page.tsx` — wire pricing chip
- `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` — load existing + `replyFromEmail`
- `src/app/api/trainers/me/profile/route.ts` — `replyFromEmail` + GET handler
- `src/components/ui/mf/PublicTopNav.tsx` — "Become a trainer" link
- `src/lib/email.ts` (if exists, else create) — reply-from routing

---

## Stage 1: Admin-First Foundation

**Why first:** Unblocks foundation-tester onboarding today without Stripe keys. Once this stage ships, you can invite any email as a TRAINER and set their monthly price to $0 from the admin panel.

### Task 1.1: Add billing fields to Trainer schema

**Files:**
- Modify: `prisma/schema.prisma` (Trainer model, around line 170-194)

- [ ] **Step 1: Add the fields to the Trainer model**

In `prisma/schema.prisma`, inside `model Trainer { ... }`, add below `contactPhone String?`:

```prisma
  // Phase 3 — platform subscription billing (Martinez/Fitness charges trainer)
  // Tier is an app-level concept ('FREE' | 'STARTER' | 'PRO' | 'CUSTOM'); the
  // corresponding Stripe price is resolved via env at checkout time so prices
  // can change without a migration. `monthlyPrice` is a nullable admin override
  // for foundation testers / custom deals — when set, UI shows it, and
  // subscriptionStatus=free skips Stripe entirely.
  subscriptionTier       String?  // 'FREE' | 'STARTER' | 'PRO' | 'CUSTOM'
  monthlyPrice           Float?   // dollars, override. null → look up tier default
  subscriptionStatus     String?  // 'free' | 'trialing' | 'active' | 'past_due' | 'canceled'
  stripeCustomerId       String?
  stripeSubscriptionId   String?

  // Phase 3 — Stripe Connect (trainer accepts client payments via the platform)
  stripeConnectAccountId String?
  connectOnboarded       Boolean  @default(false)
  connectChargesEnabled  Boolean  @default(false)
  connectPayoutsEnabled  Boolean  @default(false)

  // Phase 5 — reply-to routing for contact submissions
  replyFromEmail         String?
  replyFromName          String?
```

- [ ] **Step 2: Regenerate Prisma client**

Run: `npx prisma generate`
Expected: "✔ Generated Prisma Client"

- [ ] **Step 3: Typecheck passes**

Run: `npx tsc --noEmit`
Expected: no output (clean)

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add Phase 3 Trainer billing + Connect fields"
```

---

### Task 1.2: Add role field to Invitation model

**Files:**
- Modify: `prisma/schema.prisma` (Invitation model, around line 571)

- [ ] **Step 1: Add role to Invitation**

In `prisma/schema.prisma`, inside `model Invitation { ... }`, add below `phone String?`:

```prisma
  // Role the redeemer will be granted when the code is accepted. Defaults to
  // CLIENT for backward compat (any existing Invitation row without this field
  // still registers as a client). Admin issues TRAINER invites for hand-
  // onboarded coaches + foundation testers.
  role       String           @default("CLIENT")
```

- [ ] **Step 2: Regenerate Prisma client**

Run: `npx prisma generate`
Expected: "✔ Generated Prisma Client"

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): Invitation.role so admin can issue TRAINER invites"
```

---

### Task 1.3: Register route honors invitation.role

**Files:**
- Modify: `src/app/api/auth/register/route.ts:80-90` (the `role: 'CLIENT'` hardcode)

- [ ] **Step 1: Read invitation.role and use it instead of hardcoded CLIENT**

Replace the user creation block in `src/app/api/auth/register/route.ts`:

```typescript
// Normalize legacy rows that predate the role column.
const redeemerRole =
  invitation.role === 'TRAINER' || invitation.role === 'ADMIN'
    ? invitation.role
    : 'CLIENT';

const user = await prisma.user.create({
  data: {
    email: normalizedEmail,
    password: hashedPassword,
    name,
    role: redeemerRole,
    // TRAINER / ADMIN invites are platform onboarding, not client-under-trainer.
    trainerId: redeemerRole === 'CLIENT' ? invitation.invitedBy : null,
  },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Lint**

Run: `npx eslint src/app/api/auth/register/route.ts`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/register/route.ts
git commit -m "feat(auth): register route honors invitation.role (TRAINER/CLIENT/ADMIN)"
```

---

### Task 1.4: Add role selector to admin invitation dialog

**Files:**
- Modify: `src/app/admin/invitations/new-invitation-client.tsx`
- Modify: the POST handler (find via `grep -rn "invitation" src/app/api/admin/invitations` — likely `src/app/api/admin/invitations/route.ts` or similar)

- [ ] **Step 1: Find the invitation POST route**

Run: `grep -rn "prisma.invitation.create" src/app/api/ | head -5`
Note the file path + line.

- [ ] **Step 2: Update POST route schema**

In the invitation creation route, update the Zod schema to accept optional role:

```typescript
const schema = z.object({
  email: z.string().email(),
  // ...existing fields
  role: z.enum(['CLIENT', 'TRAINER', 'ADMIN']).default('CLIENT'),
});
```

In `prisma.invitation.create({ data: { ... } })`, add `role: parsed.data.role`.

- [ ] **Step 3: Add role selector to dialog**

In `src/app/admin/invitations/new-invitation-client.tsx`, add state + UI:

```typescript
const [role, setRole] = useState<'CLIENT' | 'TRAINER' | 'ADMIN'>('CLIENT');
```

Above the submit button, add a radio group:

```tsx
<div>
  <div className="mf-eyebrow" style={{ marginBottom: 8 }}>ROLE</div>
  <div style={{ display: 'flex', gap: 8 }}>
    {(['CLIENT', 'TRAINER', 'ADMIN'] as const).map((r) => (
      <button
        key={r}
        type="button"
        onClick={() => setRole(r)}
        className="mf-btn"
        style={{
          background: role === r ? 'var(--mf-accent)' : undefined,
          color: role === r ? '#0A0A0B' : undefined,
          flex: 1,
        }}
      >
        {r}
      </button>
    ))}
  </div>
</div>
```

Update the fetch body to include `role`.

- [ ] **Step 4: Manual smoke**

Start dev: `npm run dev`
Log in as admin → `/admin/invitations` → New Invitation → select TRAINER → enter email → submit → verify Invitation row in DB has `role: 'TRAINER'`.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/invitations/new-invitation-client.tsx src/app/api/admin/invitations
git commit -m "feat(admin): invitation dialog role selector (CLIENT/TRAINER/ADMIN)"
```

---

### Task 1.5: Admin pricing API endpoint

**Files:**
- Create: `src/app/api/admin/trainers/[id]/pricing/route.ts`

- [ ] **Step 1: Create the PATCH endpoint**

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';

const schema = z.object({
  tier: z.enum(['FREE', 'STARTER', 'PRO', 'CUSTOM']).nullable().optional(),
  monthlyPrice: z.number().min(0).max(10000).nullable().optional(),
  subscriptionStatus: z
    .enum(['free', 'trialing', 'active', 'past_due', 'canceled'])
    .nullable()
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: userId } = await params;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (target.role !== 'TRAINER') {
    return NextResponse.json(
      { error: 'Target is not a trainer' },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid fields' }, { status: 400 });
  }

  await ensureTrainerRow(userId, prisma);

  const data: Record<string, unknown> = {};
  if (parsed.data.tier !== undefined) data.subscriptionTier = parsed.data.tier;
  if (parsed.data.monthlyPrice !== undefined)
    data.monthlyPrice = parsed.data.monthlyPrice;
  if (parsed.data.subscriptionStatus !== undefined)
    data.subscriptionStatus = parsed.data.subscriptionStatus;
  // FREE tier implies status=free unless admin explicitly overrode.
  if (
    parsed.data.tier === 'FREE' &&
    parsed.data.subscriptionStatus === undefined
  ) {
    data.subscriptionStatus = 'free';
  }

  const updated = await prisma.trainer.update({
    where: { userId },
    data,
    select: {
      subscriptionTier: true,
      monthlyPrice: true,
      subscriptionStatus: true,
    },
  });

  await prisma.adminLog.create({
    data: {
      adminEmail: session.user.email ?? '',
      action: 'TRAINER_PRICING_UPDATE',
      targetUserId: userId,
      targetEmail: target.email,
      details: updated,
    },
  });

  return NextResponse.json(updated, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/trainers/[id]/pricing/route.ts
git commit -m "feat(admin): PATCH pricing endpoint for trainer subscription tier + override"
```

---

### Task 1.6: Admin pricing editor client + wire into /admin/users

**Files:**
- Create: `src/app/admin/users/trainer-pricing-client.tsx`
- Modify: `src/app/admin/users/page.tsx` — add column + include trainer data in query

- [ ] **Step 1: Create the pricing editor component**

```typescript
// src/app/admin/users/trainer-pricing-client.tsx
'use client';

import { useState } from 'react';

type Tier = 'FREE' | 'STARTER' | 'PRO' | 'CUSTOM';

interface Props {
  userId: string;
  initialTier: Tier | null;
  initialPrice: number | null;
  initialStatus: string | null;
}

const TIER_DEFAULT_PRICE: Record<Tier, number | null> = {
  FREE: 0,
  STARTER: 29,
  PRO: 99,
  CUSTOM: null,
};

export default function TrainerPricingClient({
  userId,
  initialTier,
  initialPrice,
  initialStatus,
}: Props) {
  const [tier, setTier] = useState<Tier | null>(initialTier);
  const [price, setPrice] = useState<number | null>(initialPrice);
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (next: { tier?: Tier | null; monthlyPrice?: number | null }) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/trainers/${userId}/pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) return;
      const data = await res.json();
      setTier(data.subscriptionTier);
      setPrice(data.monthlyPrice);
      setStatus(data.subscriptionStatus);
    } finally {
      setSaving(false);
    }
  };

  const displayPrice =
    price != null
      ? `$${price}`
      : tier && TIER_DEFAULT_PRICE[tier] != null
        ? `$${TIER_DEFAULT_PRICE[tier]}`
        : '—';

  const chipColor =
    tier === 'FREE'
      ? 'var(--mf-fg-dim)'
      : status === 'active' || status === 'trialing'
        ? '#86efac'
        : status === 'past_due' || status === 'canceled'
          ? '#fca5a5'
          : 'var(--mf-fg-dim)';

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mf-font-mono"
        style={{
          height: 24,
          padding: '0 8px',
          fontSize: 10,
          letterSpacing: '0.1em',
          borderRadius: 4,
          border: '1px solid var(--mf-hairline)',
          background: 'transparent',
          color: chipColor,
          cursor: 'pointer',
        }}
        title="Click to edit tier + price"
      >
        {tier ?? 'UNSET'} · {displayPrice}
      </button>
    );
  }

  return (
    <div
      className="mf-card"
      style={{
        padding: 8,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
      }}
    >
      <select
        value={tier ?? ''}
        onChange={(e) => {
          const next = (e.target.value || null) as Tier | null;
          setTier(next);
          save({ tier: next });
        }}
        disabled={saving}
        className="mf-input"
        style={{ height: 28, fontSize: 11 }}
      >
        <option value="">UNSET</option>
        <option value="FREE">FREE</option>
        <option value="STARTER">STARTER</option>
        <option value="PRO">PRO</option>
        <option value="CUSTOM">CUSTOM</option>
      </select>
      <input
        type="number"
        min={0}
        max={10000}
        value={price ?? ''}
        placeholder="$/mo"
        onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : null)}
        onBlur={() => save({ monthlyPrice: price })}
        disabled={saving}
        className="mf-input"
        style={{ height: 28, width: 80, fontSize: 11 }}
      />
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="mf-btn mf-btn-ghost"
        style={{ height: 28, padding: '0 8px', fontSize: 11 }}
      >
        done
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add tier/price/status + Trainer include to admin/users query**

In `src/app/admin/users/page.tsx`, update the `users` query's `select`:

```typescript
select: {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  lastLogin: true,
  loginCount: true,
  trainerIsPublic: true,
  trainerSlug: true,
  trainer: {
    select: {
      subscriptionTier: true,
      monthlyPrice: true,
      subscriptionStatus: true,
    },
  },
  _count: { /* unchanged */ },
},
```

- [ ] **Step 3: Add a PRICING column to the table header + cells**

Grid template was `2.5fr 1fr 1.2fr 1.4fr 1fr 110px 60px` after the VISIBILITY column was added. Update to:

```typescript
gridTemplateColumns: '2.5fr 1fr 1.1fr 1.3fr 1fr 110px 140px 60px',
```

in BOTH the header row and each user row. Update the headers array:

```typescript
{['USER', 'ROLE', 'STATUS', 'JOINED', 'ACTIVITY', 'VISIBILITY', 'PRICING', ''].map(...)}
```

Add the pricing cell to each row, right after the VISIBILITY cell:

```tsx
<div>
  {u.role === 'TRAINER' ? (
    <TrainerPricingClient
      userId={u.id}
      initialTier={(u.trainer?.subscriptionTier ?? null) as 'FREE' | 'STARTER' | 'PRO' | 'CUSTOM' | null}
      initialPrice={u.trainer?.monthlyPrice ?? null}
      initialStatus={u.trainer?.subscriptionStatus ?? null}
    />
  ) : (
    <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>—</span>
  )}
</div>
```

- [ ] **Step 4: Import it**

Add to `src/app/admin/users/page.tsx`:

```typescript
import TrainerPricingClient from './trainer-pricing-client';
```

- [ ] **Step 5: Typecheck + lint**

```bash
npx tsc --noEmit
npx eslint src/app/admin/users src/app/api/admin/trainers/[id]/pricing
```
Expected: clean

- [ ] **Step 6: Manual smoke**

`npm run dev` → log in as admin → `/admin/users` → filter TRAINER → Brent's row should show `UNSET · —` chip → click → set tier=FREE, price=0 → badge updates to `FREE · $0`.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/users src/app/api/admin/trainers
git commit -m "feat(admin): inline tier + price editor on /admin/users trainer rows"
```

---

## Stage 2: Public Trainer Signup

**Why next:** Once admin can onboard by invite, the reverse flow (self-serve) is a small-surface addition that reuses most of the register plumbing. Trainers land on `/for-trainers/signup`, fill a form, get an account with `subscriptionStatus: 'trialing'` (14-day) or `'free'` if admin sets later.

### Task 2.1: Public trainer signup API

**Files:**
- Create: `src/app/api/trainers/signup/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { ensureTrainerIdentity } from '@/lib/trainerIdentity';

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  password: z.string().min(10).max(200),
  agreesToTerms: z.literal(true),
});

export async function POST(request: NextRequest) {
  // 5 signups per hour per IP.
  const ip = getClientIp(request);
  const rl = checkRateLimit(`trainer-signup:${ip}`, {
    maxRequests: 5,
    windowSeconds: 3600,
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
    return NextResponse.json({ error: 'Invalid fields' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    // Generic message so we don't leak account existence. Legit users can
    // sign in at /auth/signin.
    return NextResponse.json(
      { error: 'That email is not available. Try signing in instead.' },
      { status: 409 },
    );
  }

  const hashed = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      password: hashed,
      role: 'TRAINER',
      isActive: true,
      trainer: {
        create: {
          subscriptionTier: 'STARTER',
          subscriptionStatus: 'trialing',
          experience: 0,
        },
      },
    },
    select: { id: true, email: true },
  });

  // Auto-generate slug + referral code so search + sharing work immediately.
  await ensureTrainerIdentity(user.id, prisma);

  return NextResponse.json(
    { id: user.id, email: user.email },
    { status: 201 },
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trainers/signup/route.ts
git commit -m "feat(auth): public trainer self-signup endpoint (14-day STARTER trial)"
```

---

### Task 2.2: Public signup page + form

**Files:**
- Create: `src/app/for-trainers/signup/page.tsx`
- Create: `src/app/for-trainers/signup/signup-form-client.tsx`

- [ ] **Step 1: Create the page**

```typescript
// src/app/for-trainers/signup/page.tsx
import SignupFormClient from './signup-form-client';

export const metadata = {
  title: 'Become a trainer · Martinez/Fitness',
};

export default function TrainerSignupPage() {
  return (
    <main
      data-mf
      className="mf-bg mf-fg"
      style={{ minHeight: '100vh', padding: '48px 20px 80px' }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
          TRAINER · NEW ACCOUNT
        </div>
        <h1
          className="mf-font-display"
          style={{ fontSize: 40, lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0 }}
        >
          List your practice. Get clients.
        </h1>
        <p className="mf-fg-dim" style={{ fontSize: 15, marginTop: 12, lineHeight: 1.5 }}>
          14-day trial. No card required. Set your rates, publish your profile,
          and accept client applications directly.
        </p>
        <div style={{ marginTop: 32 }}>
          <SignupFormClient />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create the form client**

```typescript
// src/app/for-trainers/signup/signup-form-client.tsx
'use client';

import { useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignupFormClient() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }
    if (!agree) {
      setError('Please agree to the platform terms.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/trainers/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          agreesToTerms: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Signup failed. Try again.');
        return;
      }
      // Auto-sign-in so they land in /trainer logged in.
      const signinRes = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (signinRes?.ok) {
        router.push('/trainer');
        router.refresh();
      } else {
        // Fallback: send to signin.
        router.push('/auth/signin');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
      <Field label="FULL NAME" required>
        <input
          className="mf-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={120}
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
      <Field label="PASSWORD" required hint="At least 10 characters.">
        <input
          type="password"
          className="mf-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={10}
          required
        />
      </Field>
      <label style={{ display: 'flex', gap: 8, fontSize: 12, alignItems: 'flex-start' }}>
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span className="mf-fg-dim">
          I agree to the Martinez/Fitness trainer terms + privacy policy, and
          understand I&apos;m responsible for the accuracy of client-facing
          claims on my profile.
        </span>
      </label>
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
        {submitting ? 'Creating account…' : 'Start 14-day trial →'}
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
          color: 'var(--mf-fg-dim)',
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

- [ ] **Step 3: Add "Become a trainer" link to PublicTopNav**

In `src/components/ui/mf/PublicTopNav.tsx`, inside the `<nav>` block that has "For Trainers / For Clients / Trainers / Pricing", add:

```tsx
<Link href="/for-trainers/signup" className={linkClass(null)}>Become a trainer</Link>
```

- [ ] **Step 4: Typecheck + lint**

```bash
npx tsc --noEmit
npx eslint src/app/for-trainers src/app/api/trainers/signup
```
Expected: clean

- [ ] **Step 5: Manual smoke**

Open incognito → `/for-trainers/signup` → fill form → submit → should land in `/trainer` logged in with trainer role. Verify in `/admin/users` as admin that the new row is TRAINER with tier=STARTER, status=trialing.

- [ ] **Step 6: Commit**

```bash
git add src/app/for-trainers src/app/api/trainers/signup src/components/ui/mf/PublicTopNav.tsx
git commit -m "feat(trainer): public /for-trainers/signup page + STARTER trial"
```

---

## Stage 3: Stripe Subscription (Platform Fees)

**Why:** Trainers pay Martinez/Fitness monthly. Env-gated — if `STRIPE_SECRET_KEY` isn't set, checkout buttons show "contact admin" and free tier is the default.

### Task 3.1: Install Stripe SDK + env helpers

**Files:**
- Modify: `package.json`
- Create: `src/lib/stripe.ts`
- Create: `src/lib/subscriptionTiers.ts`
- Modify: `.env.example`

- [ ] **Step 1: Install**

```bash
npm install stripe
```

- [ ] **Step 2: Create Stripe singleton**

```typescript
// src/lib/stripe.ts
import 'server-only';
import Stripe from 'stripe';

let cached: Stripe | null = null;

/** Returns null when STRIPE_SECRET_KEY is unset — callers must handle. */
export function getStripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cached = new Stripe(key, { apiVersion: '2025-09-30.clover' });
  return cached;
}

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
```

- [ ] **Step 3: Create tier config**

```typescript
// src/lib/subscriptionTiers.ts
export type Tier = 'FREE' | 'STARTER' | 'PRO' | 'CUSTOM';

export interface TierConfig {
  label: string;
  monthlyPriceDefault: number;
  stripePriceEnv: string | null;
  description: string;
}

export const TIERS: Record<Tier, TierConfig> = {
  FREE: {
    label: 'Foundation',
    monthlyPriceDefault: 0,
    stripePriceEnv: null,
    description: 'Invite-only. Admin-granted. No Stripe subscription.',
  },
  STARTER: {
    label: 'Starter',
    monthlyPriceDefault: 29,
    stripePriceEnv: 'STRIPE_PRICE_STARTER',
    description: 'Up to 20 active clients. Public directory listing.',
  },
  PRO: {
    label: 'Pro',
    monthlyPriceDefault: 99,
    stripePriceEnv: 'STRIPE_PRICE_PRO',
    description: 'Unlimited clients. Priority directory placement.',
  },
  CUSTOM: {
    label: 'Custom',
    monthlyPriceDefault: 0,
    stripePriceEnv: 'STRIPE_PRICE_CUSTOM',
    description: 'Enterprise / multi-location. Contact for pricing.',
  },
};

export function resolveStripePriceId(tier: Tier): string | null {
  const envKey = TIERS[tier].stripePriceEnv;
  if (!envKey) return null;
  return process.env[envKey] ?? null;
}
```

- [ ] **Step 4: Update .env.example**

Add:
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_CUSTOM=
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/stripe.ts src/lib/subscriptionTiers.ts .env.example
git commit -m "chore(billing): stripe SDK + tier config + env scaffolding"
```

---

### Task 3.2: Checkout session endpoint

**Files:**
- Create: `src/app/api/billing/checkout/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripe, stripeEnabled } from '@/lib/stripe';
import { resolveStripePriceId, type Tier } from '@/lib/subscriptionTiers';

const schema = z.object({
  tier: z.enum(['STARTER', 'PRO', 'CUSTOM']),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!stripeEnabled()) {
    return NextResponse.json(
      { error: 'Billing is not yet configured. Contact admin.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const priceId = resolveStripePriceId(parsed.data.tier as Tier);
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price for ${parsed.data.tier} is not configured.` },
      { status: 503 },
    );
  }

  const stripe = getStripe()!;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, trainer: { select: { stripeCustomerId: true } } },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  let customerId = user.trainer?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await prisma.trainer.update({
      where: { userId: session.user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const origin =
    request.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/trainer/settings/billing?checkout=success`,
    cancel_url: `${origin}/trainer/settings/billing?checkout=cancel`,
    metadata: { userId: session.user.id, tier: parsed.data.tier },
    subscription_data: {
      metadata: { userId: session.user.id, tier: parsed.data.tier },
    },
  });

  return NextResponse.json({ url: checkout.url });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/app/api/billing/checkout/route.ts
git commit -m "feat(billing): POST /api/billing/checkout creates Stripe Checkout session"
```

---

### Task 3.3: Webhook handler

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Create the webhook handler**

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

// Stripe webhooks need raw body. Next.js App Router: use request.text().
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret missing' }, { status: 503 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('Stripe webhook signature check failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.userId;
        if (userId && s.subscription) {
          await prisma.trainer.update({
            where: { userId },
            data: {
              stripeSubscriptionId: s.subscription as string,
              subscriptionStatus: 'active',
              subscriptionTier: s.metadata?.tier ?? null,
            },
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await prisma.trainer.update({
            where: { userId },
            data: {
              stripeSubscriptionId: sub.id,
              subscriptionStatus: mapStripeStatus(sub.status),
            },
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await prisma.trainer.update({
            where: { userId },
            data: { subscriptionStatus: 'canceled' },
          });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const userId =
          inv.subscription_details?.metadata?.userId ??
          (typeof inv.subscription === 'string' ? null : inv.subscription?.metadata?.userId ?? null);
        if (userId) {
          await prisma.trainer.update({
            where: { userId },
            data: { subscriptionStatus: 'past_due' },
          });
        }
        break;
      }
      case 'account.updated': {
        const acct = event.data.object as Stripe.Account;
        const userId = acct.metadata?.userId;
        if (userId) {
          await prisma.trainer.update({
            where: { userId },
            data: {
              connectOnboarded: !!acct.details_submitted,
              connectChargesEnabled: !!acct.charges_enabled,
              connectPayoutsEnabled: !!acct.payouts_enabled,
            },
          });
        }
        break;
      }
      default:
        // Non-matched events are acknowledged but not acted on.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error', event.type, err);
    // Return 500 so Stripe retries.
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

function mapStripeStatus(s: Stripe.Subscription.Status):
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled' {
  switch (s) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    default:
      return 'canceled';
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat(billing): Stripe webhook handler for subscription + Connect events"
```

---

### Task 3.4: Trainer billing page

**Files:**
- Create: `src/app/trainer/(v4)/settings/billing/page.tsx`
- Create: `src/app/trainer/(v4)/settings/billing/billing-client.tsx`

- [ ] **Step 1: Create the server page**

```typescript
// src/app/trainer/(v4)/settings/billing/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DesktopShell } from '@/components/ui/mf';
import BillingClient from './billing-client';

export const dynamic = 'force-dynamic';

export default async function TrainerBillingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/signin');
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    redirect('/');
  }

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: {
      subscriptionTier: true,
      monthlyPrice: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeConnectAccountId: true,
      connectOnboarded: true,
      connectChargesEnabled: true,
      connectPayoutsEnabled: true,
    },
  });

  return (
    <DesktopShell role="trainer" active="settings" title="Billing" breadcrumbs="SETTINGS / BILLING">
      <div style={{ padding: 24, maxWidth: 800 }}>
        <BillingClient
          initial={{
            tier: (trainer?.subscriptionTier ?? null) as 'FREE' | 'STARTER' | 'PRO' | 'CUSTOM' | null,
            status: trainer?.subscriptionStatus ?? null,
            monthlyPrice: trainer?.monthlyPrice ?? null,
            connectOnboarded: trainer?.connectOnboarded ?? false,
            connectChargesEnabled: trainer?.connectChargesEnabled ?? false,
            connectPayoutsEnabled: trainer?.connectPayoutsEnabled ?? false,
          }}
        />
      </div>
    </DesktopShell>
  );
}
```

- [ ] **Step 2: Create the billing client**

```typescript
// src/app/trainer/(v4)/settings/billing/billing-client.tsx
'use client';

import { useState } from 'react';

type Tier = 'FREE' | 'STARTER' | 'PRO' | 'CUSTOM';

interface Props {
  initial: {
    tier: Tier | null;
    status: string | null;
    monthlyPrice: number | null;
    connectOnboarded: boolean;
    connectChargesEnabled: boolean;
    connectPayoutsEnabled: boolean;
  };
}

const TIER_LABELS: Record<Exclude<Tier, 'FREE' | 'CUSTOM'>, { label: string; price: number; desc: string }> = {
  STARTER: { label: 'Starter', price: 29, desc: 'Up to 20 active clients' },
  PRO: { label: 'Pro', price: 99, desc: 'Unlimited clients + priority listing' },
};

export default function BillingClient({ initial }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upgrade = async (tier: 'STARTER' | 'PRO') => {
    setError(null);
    setBusy(tier);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Checkout unavailable');
        return;
      }
      if (data.url) window.location.href = data.url;
    } finally {
      setBusy(null);
    }
  };

  const openConnect = async () => {
    setError(null);
    setBusy('connect');
    try {
      const res = await fetch('/api/connect/onboarding-link', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Connect onboarding unavailable');
        return;
      }
      if (data.url) window.location.href = data.url;
    } finally {
      setBusy(null);
    }
  };

  const isFree = initial.tier === 'FREE' || initial.status === 'free';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
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

      <section className="mf-card" style={{ padding: 20 }}>
        <div className="mf-eyebrow">PLATFORM SUBSCRIPTION</div>
        <div
          className="mf-font-display"
          style={{ fontSize: 24, marginTop: 8 }}
        >
          {isFree
            ? 'Foundation — free'
            : initial.tier
              ? `${initial.tier[0]}${initial.tier.slice(1).toLowerCase()} plan`
              : 'No plan yet'}
        </div>
        <div className="mf-fg-dim" style={{ fontSize: 13, marginTop: 4 }}>
          Status: {initial.status ?? 'unset'}
          {initial.monthlyPrice != null ? ` · $${initial.monthlyPrice}/mo` : ''}
        </div>

        {isFree ? (
          <div
            className="mf-fg-dim"
            style={{ fontSize: 12, marginTop: 12 }}
          >
            You&apos;re on a foundation account — no platform fee. Thanks for
            being an early supporter.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            {(['STARTER', 'PRO'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => upgrade(tier)}
                disabled={busy === tier}
                className="mf-btn mf-btn-primary"
                style={{ height: 44, justifyContent: 'space-between' }}
              >
                <span>{busy === tier ? 'Opening checkout…' : `Upgrade to ${TIER_LABELS[tier].label}`}</span>
                <span className="mf-font-mono" style={{ fontSize: 11 }}>
                  ${TIER_LABELS[tier].price}/mo
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mf-card" style={{ padding: 20 }}>
        <div className="mf-eyebrow">STRIPE CONNECT · CLIENT PAYMENTS</div>
        <div style={{ fontSize: 13, marginTop: 8 }} className="mf-fg-dim">
          Connect your Stripe account so clients can pay you through the
          platform. Payouts go directly to your bank.
        </div>
        <div className="mf-font-mono" style={{ fontSize: 11, marginTop: 8, letterSpacing: '0.1em' }}>
          {initial.connectOnboarded
            ? initial.connectChargesEnabled && initial.connectPayoutsEnabled
              ? '● CONNECTED · LIVE'
              : '◐ CONNECTED · PENDING VERIFICATION'
            : '○ NOT CONNECTED'}
        </div>
        <button
          type="button"
          onClick={openConnect}
          disabled={busy === 'connect'}
          className="mf-btn"
          style={{ height: 40, marginTop: 12 }}
        >
          {busy === 'connect'
            ? 'Opening Stripe…'
            : initial.connectOnboarded
              ? 'Manage Stripe account'
              : 'Connect Stripe account'}
        </button>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Add Billing link to trainer settings sidebar**

In `src/app/trainer/(v4)/settings/page.tsx` (or wherever settings subpages are listed), add a Billing row.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add 'src/app/trainer/(v4)/settings/billing'
git commit -m "feat(trainer): /trainer/settings/billing page (subscription + Connect)"
```

---

## Stage 4: Stripe Connect (Client Payouts)

### Task 4.1: Connect onboarding link endpoint

**Files:**
- Create: `src/app/api/connect/onboarding-link/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripe, stripeEnabled } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!stripeEnabled()) {
    return NextResponse.json(
      { error: 'Stripe is not configured yet.' },
      { status: 503 },
    );
  }

  const stripe = getStripe()!;
  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  let accountId = trainer?.stripeConnectAccountId ?? null;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'standard',
      metadata: { userId: session.user.id },
    });
    accountId = account.id;
    await prisma.trainer.update({
      where: { userId: session.user.id },
      data: { stripeConnectAccountId: accountId },
    });
  }

  const origin =
    request.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/trainer/settings/billing?connect=refresh`,
    return_url: `${origin}/trainer/settings/billing?connect=return`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: link.url });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/app/api/connect/onboarding-link/route.ts
git commit -m "feat(billing): POST /api/connect/onboarding-link for Stripe Connect onboarding"
```

---

### Task 4.2: Webhook handler already covers `account.updated`

Task 3.3 already wrote the `account.updated` case that syncs `connectOnboarded`, `connectChargesEnabled`, `connectPayoutsEnabled`. No new code — just verify coverage.

- [ ] **Step 1: Re-read Task 3.3 webhook switch to confirm `account.updated` is handled.**

No commit.

---

## Stage 5: Per-Trainer Reply Email

### Task 5.1: Schema already added in Task 1.1

`replyFromEmail` + `replyFromName` were already added in Task 1.1's schema block. No schema work needed here.

---

### Task 5.2: Add inputs to profile editor

**Files:**
- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx`
- Modify: `src/app/api/trainers/me/profile/route.ts` (Zod schema)

- [ ] **Step 1: Add to TrainerProfile interface**

```typescript
replyFromEmail: string | null;
replyFromName: string | null;
```

- [ ] **Step 2: Add to initial state**

```typescript
replyFromEmail: null,
replyFromName: null,
```

- [ ] **Step 3: Add UI sections**

After the CONTACT PHONE section:

```tsx
<Section title="REPLY-TO EMAIL (optional)">
  <input
    type="email"
    className="mf-input"
    placeholder="coach@yourdomain.com"
    value={profile.replyFromEmail ?? ''}
    onChange={(e) => update('replyFromEmail', e.target.value)}
    maxLength={200}
  />
  <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 6 }}>
    When applicants fill your /apply form, your notification email will have
    Reply-To set to this address so clicking Reply sends to you directly.
    Leave blank to use your account email.
  </div>
</Section>
<Section title="REPLY-FROM NAME">
  <input
    className="mf-input"
    placeholder="Coach John · Example Fitness"
    value={profile.replyFromName ?? ''}
    onChange={(e) => update('replyFromName', e.target.value)}
    maxLength={120}
  />
</Section>
```

- [ ] **Step 4: Include in PATCH body**

Add to the save() body:

```typescript
replyFromEmail: profile.replyFromEmail ?? null,
replyFromName: profile.replyFromName ?? null,
```

- [ ] **Step 5: Extend Zod schema in the profile API route**

```typescript
replyFromEmail: z.string().email().max(200).optional().nullable(),
replyFromName: z.string().max(120).optional().nullable(),
```

Handle `null` → null mapping in the data builder.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 7: Commit**

```bash
git add 'src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx' src/app/api/trainers/me/profile/route.ts
git commit -m "feat(trainer): replyFromEmail + replyFromName in profile editor"
```

---

### Task 5.3: Apply form notification respects replyFromEmail

**Files:**
- Modify: wherever contact submissions trigger email notifications (find via `grep -rn "resend\|sendgrid\|nodemailer\|send-invite-email" src/app/api/contact`)

- [ ] **Step 1: Find the notification send**

Run: `grep -rn "contactSubmission.create\|send.*email\|nodemailer\|resend" src/app/api/contact src/lib 2>&1 | head -20`

Currently the apply form submission in `src/app/api/contact/route.ts` doesn't appear to send an email (verify — if true, note this task becomes "add email notification with Reply-To" rather than "modify existing").

- [ ] **Step 2: If no send exists, note Task 5.3 becomes out-of-scope for this plan**

Split into a followup: "feat(email): apply-form notifications with per-trainer Reply-To". Leave the fields wired in schema + editor so the followup has data to work with.

- [ ] **Step 3: Commit (empty if no changes)**

Skip commit if nothing changed.

---

## Bonus: Share link goes to profile, not raw apply form

**Why:** Branden asked: "will it be so that way when a client looking for a
trainer comes across their page their link will take them directly to the
trainer profile to apply?" Today the Sharing panel emits `/apply/{slug}` so
clients never see the trainer's bio, testimonials, or transformation photos
before applying. Flipping the primary share link to `/t/{slug}` (which
already has a prominent Apply button) means clients land on the rich profile
first and only hit the apply form when they're ready.

### Task B0.1: Sharing panel emits /t/{slug} as the primary link

**Files:**
- Modify: `src/app/trainer/(v4)/settings/sharing-panel-client.tsx:28`

- [ ] **Step 1: Swap the link target**

Change:
```typescript
const link = slug ? `${origin}/apply/${slug}` : '';
```
to:
```typescript
// Primary share link points at the profile so clients see bio + testimonials
// + transformations before applying. /apply/{slug} stays as the secondary
// "direct to form" link below the primary copy button.
const link = slug ? `${origin}/t/${slug}` : '';
const applyLink = slug ? `${origin}/apply/${slug}` : '';
```

- [ ] **Step 2: Render a second compact row for the apply-direct link**

Right below the existing primary link row, add a de-emphasized apply-direct row using the existing copy pattern. Label: "Direct apply link (skip profile)".

- [ ] **Step 3: Verify /t/{slug} page has a clear Apply CTA**

Run: `grep -n "Apply\|/apply/" src/app/t/\[trainerSlug\]/page.tsx src/app/t/\[trainerSlug\]/profile-sections.tsx 2>&1 | head -10`
If the profile page already has an Apply button, no extra work. If not, add one to the hero.

- [ ] **Step 4: Commit**

```bash
git add 'src/app/trainer/(v4)/settings/sharing-panel-client.tsx'
git commit -m "feat(trainer): share link points to /t/{slug} profile (with apply CTA), not raw form"
```

---

## Bonus: Profile Editor Loads Existing Data

### Task B.1: Fetch profile on mount

**Files:**
- Modify: `src/app/api/trainers/me/profile/route.ts` — add GET handler
- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` — replace stubbed useEffect

- [ ] **Step 1: Add GET to the profile API**

In `src/app/api/trainers/me/profile/route.ts`:

```typescript
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await ensureTrainerRow(session.user.id, prisma);
  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: {
      photoUrl: true,
      location: true,
      instagramHandle: true,
      contactPhone: true,
      bio: true,
      specialties: true,
      experience: true,
      certifications: true,
      priceTier: true,
      hourlyRate: true,
      acceptsInPerson: true,
      acceptsOnline: true,
      replyFromEmail: true,
      replyFromName: true,
    },
  });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { trainerIsPublic: true },
  });
  return NextResponse.json(
    {
      ...trainer,
      certifications:
        (trainer?.certifications as string[] | null) ?? [],
      trainerIsPublic: user?.trainerIsPublic ?? false,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
```

- [ ] **Step 2: Rewrite the editor's load useEffect**

Replace the stubbed useEffect in `profile-editor-client.tsx` with:

```typescript
useEffect(() => {
  (async () => {
    try {
      const res = await fetch('/api/trainers/me/profile', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile({
        photoUrl: data.photoUrl ?? null,
        location: data.location ?? null,
        instagramHandle: data.instagramHandle ?? null,
        contactPhone: data.contactPhone ?? null,
        bio: data.bio ?? null,
        specialties: (data.specialties ?? []) as string[],
        experience: data.experience ?? 0,
        certifications: (data.certifications ?? []) as string[],
        priceTier: data.priceTier ?? null,
        hourlyRate: data.hourlyRate ?? null,
        acceptsInPerson: !!data.acceptsInPerson,
        acceptsOnline: !!data.acceptsOnline,
        trainerIsPublic: !!data.trainerIsPublic,
        replyFromEmail: data.replyFromEmail ?? null,
        replyFromName: data.replyFromName ?? null,
      });
    } catch {
      // Fall back to empty editor — saving will still work.
      setProfile({
        photoUrl: null,
        location: null,
        instagramHandle: null,
        contactPhone: null,
        bio: null,
        specialties: [],
        experience: 0,
        certifications: [],
        priceTier: null,
        hourlyRate: null,
        acceptsInPerson: false,
        acceptsOnline: false,
        trainerIsPublic: false,
        replyFromEmail: null,
        replyFromName: null,
      });
    } finally {
      setLoading(false);
    }
  })();
}, []);
```

- [ ] **Step 3: Manual smoke**

`npm run dev` → log in as trainer → `/trainer/settings/profile` → fields should populate from previously-saved data (not empty).

- [ ] **Step 4: Commit**

```bash
git add 'src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx' src/app/api/trainers/me/profile/route.ts
git commit -m "fix(trainer): profile editor loads saved data on mount (was always empty)"
```

---

## Deployment Checklist

After Stage 1 ships:
- [ ] Push → Railway auto-deploy → `prisma db push --skip-generate` applies the additive columns
- [ ] Admin can visit /admin/users → invite a TRAINER → set price to $0 → foundation tester unblocked

After Stage 2 ships:
- [ ] `/for-trainers/signup` is live
- [ ] "Become a trainer" link visible in public nav

Before Stage 3 can activate live billing (Branden's external todo):
- [ ] Stripe account created, Connect enabled
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO` set in Railway
- [ ] Webhook endpoint registered at `https://martinezfitness559.com/api/webhooks/stripe` with events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`, `account.updated`
- [ ] Test mode: run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and `stripe trigger checkout.session.completed` to verify DB updates

Before Stage 4:
- [ ] `STRIPE_CONNECT_CLIENT_ID` set
- [ ] Platform profile configured in Stripe Dashboard

---

## Scope Notes / Known Follow-Ups

- **Email notifications on apply.** Task 5.3 is deferred if no notification send currently exists. Followup plan required.
- **Role transitions.** If an existing CLIENT should become a TRAINER (rare), no UI supports it yet. Admin has direct DB access.
- **Subscription UI trimming.** Admin pricing editor is intentionally terse — if trainers see a "downgrade" option later, that's Stripe Billing Portal territory (1-line addition: `/api/billing/portal/route.ts` returns `stripe.billingPortal.sessions.create(...)`).
- **Per-trainer domain email delivery** (the bigger scope of Stage 5) requires SPF/DKIM + verified sender on the email provider side. Out of scope for this plan; `replyFromEmail` provides the 80% solution via Reply-To header instead.
