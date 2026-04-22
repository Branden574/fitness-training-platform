# Scale to 50-100 Trainers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the platform from "works for 1 trainer × 20 clients" to "ready for 50-100 trainers × ~1000-2000 clients" with observability, performance, and durability proportional to that load — without incurring significant monthly cost.

**Architecture:** Seven workstreams across infrastructure hygiene, observability, code quality, security, and database evolution. Each workstream lands as its own commit so anything can be reverted in isolation. Database evolution (dedupe + migration baseline + partial unique indexes) is gated behind an explicit "go" confirmation because it touches prod data.

**Tech Stack:** Next.js 15 App Router, Prisma + Postgres (Railway), Upstash Redis (new), Sentry (new), @upstash/ratelimit (new), Node 20+.

**Deployment constraint from memory:** main auto-deploys via Railway's `prisma db push --skip-generate`; no `--accept-data-loss`. Phase 5 (DB evolution) SWITCHES to `prisma migrate deploy` — that's a one-way door and the whole reason Phase 5 is gated.

**Test approach:** Repo has no automated test framework wired. Verification per task is (a) `npx tsc --noEmit` clean, (b) manual smoke in browser or curl, (c) Prisma query-log inspection for N+1 fixes, (d) explicit prod smoke after each deploy for DB-touching tasks.

**Railway env vars added by this plan (Branden does the clicks, code tolerates missing vars):**
- `DATABASE_URL` — append `?connection_limit=25&pool_timeout=10`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — from Upstash signup
- `SENTRY_DSN` — from Sentry project
- `NEXT_PUBLIC_SENTRY_DSN` — same value (client-safe)

---

## File Structure

### New files
- `src/app/api/health/route.ts` — liveness endpoint for UptimeRobot. No auth, returns 200 + timestamp + git SHA.
- `src/lib/sentry-server.ts` — lazy Sentry init for API routes. No-op if `SENTRY_DSN` unset.
- `src/lib/sentry-client.ts` — client Sentry init. No-op if `NEXT_PUBLIC_SENTRY_DSN` unset.
- `sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts` — required by Sentry Next.js integration.
- `scripts/dedupe-exercises.ts` — one-shot prod script. Merges duplicate `Exercise` rows by lowercased name, remaps all FK references, deletes losers.
- `prisma/migrations/<timestamp>_baseline/migration.sql` — idempotent Postgres snapshot used to bootstrap migrate state.
- `prisma/migrations/<timestamp>_partial_unique_trainer_slug_and_referral/migration.sql` — partial unique indexes.

### Modified files
- `package.json` — add `engines`, add deps (`@upstash/redis`, `@upstash/ratelimit`, `@sentry/nextjs`).
- `next.config.ts` — flip `eslint.ignoreDuringBuilds: false`, wrap with Sentry's `withSentryConfig`.
- `middleware.ts` — emit `x-nonce` header, switch CSP `script-src 'unsafe-inline'` → `script-src 'nonce-<nonce>'`.
- `src/lib/rate-limit.ts` — swap in-memory `Map` for Upstash, fall back to in-memory if env unset.
- `src/lib/trainer-data.ts` — trim `getRoster` select (N+1 fix).
- `src/app/trainer/(v4)/nutrition/page.tsx`, `src/app/trainer/(v4)/messages/page.tsx` — similar trimming if audit finds issues.
- Various files with silenced ESLint errors — 1-2 char fixes each.
- `prisma/schema.prisma` — add `@unique` to `Exercise.name` + uncomment deferred unique constraints, paired with Phase 5 migrations.

### Untouched by this plan
- UI / design tokens
- Upload surfaces (already hardened in the R2 migration)
- NextAuth / session logic
- Capacitor / mobile shell

---

## Execution Phases

**Phase 1 — Infrastructure hygiene (low risk, 15 min)**
- Task 1: Pin Node engines
- Task 2: Health endpoint

**Phase 2 — Observability (medium risk, 45 min)**
- Task 3: Sentry SDK integration (code works without DSN)
- Task 4: Upstash Redis rate-limit backend (code falls back to in-memory)
- Task 5: Branden-owned external signups (Sentry, Upstash, UptimeRobot, DATABASE_URL tweak)

**Phase 3 — Code quality (30 min)**
- Task 6: ESLint clean sweep + flip flag

**Phase 4 — Perceived performance (1-2 hr)**
- Task 7: N+1 query audit + fixes

**Phase 5 — Security (30 min)**
- Task 8: CSP nonce

**Phase 6 — Database evolution (HIGH RISK, 3-4 hr, gated)**
- Task 9: Migration history baseline
- Task 10: Exercise dedupe script + prod run
- Task 11: Partial unique indexes + Exercise unique

---

## Task 1: Pin Node engines to >=20

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add engines field**

Add to `package.json` top-level (between `"version"` and `"scripts"` is conventional):

```json
"engines": {
  "node": ">=20.0.0"
}
```

- [ ] **Step 2: Verify Railway picks it up next deploy**

Railway's Nixpacks reads `engines.node`. On the next deploy, logs should show Node 20.x at boot (check with `node --version` if possible via `railway run`, else trust the absence of the `buffer.File is experimental` warning).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: pin Node engines >=20 to avoid Node 18 File-global issues"
```

---

## Task 2: Health endpoint for UptimeRobot

**Files:**
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1: Write route**

```ts
import { NextResponse } from 'next/server';

// Unauthenticated liveness probe. UptimeRobot (and any load balancer)
// can hit this every 60s to verify the Railway container is up + the
// DB is reachable. Deliberately does NOT call any auth helper so that
// a session-layer regression doesn't take down monitoring.
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      at: new Date().toISOString(),
      commit: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'unknown',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

export const dynamic = 'force-dynamic';
```

- [ ] **Step 2: Smoke test locally**

Run: `curl -s http://localhost:3000/api/health | jq .`
Expected: `{ "ok": true, "at": "...", "commit": "..." }`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/health/route.ts
git commit -m "feat: add /api/health for UptimeRobot liveness probes"
```

---

## Task 3: Sentry SDK integration (code-side only)

**Files:**
- Modify: `package.json` — add `@sentry/nextjs`
- Create: `sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts`
- Modify: `next.config.ts` — wrap with `withSentryConfig`
- Create: `instrumentation.ts` (at repo root) — Next.js hook for Sentry init

- [ ] **Step 1: Install**

```bash
npm install --save @sentry/nextjs
```

- [ ] **Step 2: Create `sentry.server.config.ts`**

```ts
import * as Sentry from '@sentry/nextjs';

// Sentry server-side init. No-op when SENTRY_DSN is unset — so local
// dev + Railway before Branden signs up stay silent. Sample rate is
// tight (0.1) to stay inside Sentry's free tier at 50-100 trainers.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.RAILWAY_GIT_COMMIT_SHA,
    // Skip noisy endpoints
    ignoreTransactions: ['/api/health', '/api/notifications/stream'],
  });
}
```

- [ ] **Step 3: Create `sentry.client.config.ts`**

```ts
import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.05,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    environment: process.env.NODE_ENV ?? 'development',
  });
}
```

- [ ] **Step 4: Create `sentry.edge.config.ts`**

```ts
import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
```

- [ ] **Step 5: Create `instrumentation.ts` at repo root**

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = async (
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string },
) => {
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(err, request, context);
};
```

- [ ] **Step 6: Wrap `next.config.ts` with `withSentryConfig`**

Read current `next.config.ts`, wrap the default export:

```ts
import { withSentryConfig } from '@sentry/nextjs';

// ... existing config ...

export default withSentryConfig(nextConfig, {
  silent: true,
  org: 'martinez-fitness',
  project: 'fitness-training-platform',
  // Skip source-map upload until SENTRY_AUTH_TOKEN is set
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
});
```

- [ ] **Step 7: Typecheck + build smoke**

```bash
npx tsc --noEmit
npm run lint
```

Expected: clean. (Don't run `npm run build` — see memory on Turbopack dev/build cache collision.)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json sentry.*.config.ts instrumentation.ts next.config.ts
git commit -m "feat(observability): wire Sentry (no-op until SENTRY_DSN is set)"
```

---

## Task 4: Upstash Redis rate-limit backend

**Files:**
- Modify: `package.json` — add `@upstash/redis`, `@upstash/ratelimit`
- Modify: `src/lib/rate-limit.ts` — swap the underlying store

- [ ] **Step 1: Install**

```bash
npm install --save @upstash/redis @upstash/ratelimit
```

- [ ] **Step 2: Rewrite `src/lib/rate-limit.ts`**

Replace the entire file with:

```ts
/**
 * Rate limiter with an Upstash Redis backend when configured, and a
 * process-local `Map` fallback otherwise.
 *
 * Why two backends:
 * - Local dev has no reason to spin up Redis — the Map is fine.
 * - Railway before Branden wires Upstash keeps working.
 * - Production (2+ replicas, Railway container recycles during
 *   deploys) MUST use Upstash so limits actually hold across
 *   instances and across cold starts.
 *
 * Call sites (`checkRateLimit`, `rateLimitResponse`, `getClientIp`)
 * stay identical — swapping backends is a config change, never a
 * code change at call sites.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

interface RateLimitOptions {
  maxRequests: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

// --- Upstash backend (used when UPSTASH_REDIS_REST_URL is set) ---

let upstashClient: Redis | null = null;
const limiterCache = new Map<string, Ratelimit>();

function upstashAvailable(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRedis(): Redis {
  if (!upstashClient) {
    upstashClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return upstashClient;
}

function getLimiter(opts: RateLimitOptions): Ratelimit {
  const key = `${opts.maxRequests}:${opts.windowSeconds}`;
  const cached = limiterCache.get(key);
  if (cached) return cached;
  const limiter = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(
      opts.maxRequests,
      `${opts.windowSeconds} s`,
    ),
    prefix: 'mf:rl',
    analytics: false,
  });
  limiterCache.set(key, limiter);
  return limiter;
}

// --- In-memory fallback ---

interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const memoryStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memoryStore) {
    if (now > v.resetTime) memoryStore.delete(k);
  }
}, 5 * 60 * 1000);

function checkMemory(
  identifier: string,
  opts: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(identifier);
  if (!entry || now > entry.resetTime) {
    memoryStore.set(identifier, {
      count: 1,
      resetTime: now + opts.windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: opts.maxRequests - 1,
      resetIn: opts.windowSeconds,
    };
  }
  if (entry.count >= opts.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }
  entry.count++;
  return {
    allowed: true,
    remaining: opts.maxRequests - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

// --- Public API (shape unchanged from the prior implementation) ---

export async function checkRateLimitAsync(
  identifier: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  if (upstashAvailable()) {
    const limiter = getLimiter(options);
    const res = await limiter.limit(identifier);
    return {
      allowed: res.success,
      remaining: res.remaining,
      resetIn: Math.max(0, Math.ceil((res.reset - Date.now()) / 1000)),
    };
  }
  return checkMemory(identifier, options);
}

/**
 * Sync variant — kept for call sites that can't go async cheaply.
 * Uses the in-memory fallback regardless. New code should prefer
 * checkRateLimitAsync so the distributed limit actually applies.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions,
): RateLimitResult {
  return checkMemory(identifier, options);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export function rateLimitResponse(resetIn: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(resetIn),
      },
    },
  );
}
```

- [ ] **Step 3: Upgrade `src/lib/uploadGuard.ts` to async**

Replace the body of `guardUpload` to `await checkRateLimitAsync`:

```ts
import 'server-only';
import { NextResponse } from 'next/server';
import { checkRateLimitAsync } from './rate-limit';

export interface UploadGuardOptions {
  scope: string;
  userId: string;
  maxBodyBytes: number;
  maxRequests?: number;
  windowSeconds?: number;
}

export async function guardUpload(
  request: Request,
  opts: UploadGuardOptions,
): Promise<Response | null> {
  const rl = await checkRateLimitAsync(
    `upload:${opts.scope}:${opts.userId}`,
    {
      maxRequests: opts.maxRequests ?? 20,
      windowSeconds: opts.windowSeconds ?? 60,
    },
  );
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many uploads. Please slow down and try again soon.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.resetIn),
        },
      },
    );
  }

  const header = request.headers.get('content-length');
  if (header) {
    const len = Number(header);
    if (Number.isFinite(len) && len > opts.maxBodyBytes) {
      return NextResponse.json(
        { error: 'Request too large.' },
        { status: 413 },
      );
    }
  }

  return null;
}
```

- [ ] **Step 4: Update all 5 upload route `guardUpload` call sites to `await`**

In each of these files, change `const blocked = guardUpload(...)` → `const blocked = await guardUpload(...)`:
- `src/app/api/progress/photos/route.ts`
- `src/app/api/profile/photo/route.ts`
- `src/app/api/trainers/me/photo/route.ts`
- `src/app/api/trainers/me/transformations/route.ts`
- `src/app/api/exercises/upload-image/route.ts`

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/rate-limit.ts src/lib/uploadGuard.ts src/app/api/**/route.ts
git commit -m "feat(rate-limit): Upstash Redis backend with in-memory fallback"
```

---

## Task 5: Branden-owned external signups

This task is a Branden checklist — no code. Completion verified by observing env vars populated in Railway.

- [ ] **Step 1: Upstash Redis**

Go to upstash.com → sign up (free tier: 10K commands/day, 256 MB). Create database:
- Name: `martinez-fitness-rl`
- Region: pick one close to Railway's region (usually `us-east-1`)
- TLS: enabled
- Eviction: `noeviction`

Copy `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` into Railway Variables.

- [ ] **Step 2: Sentry**

Go to sentry.io → sign up (free tier: 5K errors/month, sufficient for early scale). Create project:
- Platform: Next.js
- Name: `fitness-training-platform`

Copy the DSN into Railway as both `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`.

- [ ] **Step 3: UptimeRobot**

Go to uptimerobot.com → sign up (free tier: 50 monitors, 5-min interval). Create monitor:
- Type: HTTPS
- URL: `https://martinezfitness559.com/api/health`
- Interval: 5 minutes
- Alert contacts: Branden's email

- [ ] **Step 4: Postgres connection pool**

In Railway → fitness-training-platform service → Variables → edit `DATABASE_URL`. Append query string if none present, or merge if present:

```
?connection_limit=25&pool_timeout=10
```

Example: `postgres://user:pass@host:5432/railway` → `postgres://user:pass@host:5432/railway?connection_limit=25&pool_timeout=10`.

- [ ] **Step 5: Confirm deploys pick up new vars**

Trigger a redeploy (any empty commit works) and verify logs don't say `[storage] Missing env vars` or similar, and `/api/health` still returns 200.

---

## Task 6: ESLint clean sweep + flip flag

**Files:**
- Modify: `next.config.ts`
- Modify: various component/route files with silenced errors

- [ ] **Step 1: Run lint and capture the list**

```bash
npm run lint 2>&1 | tee /tmp/lint-errors.txt
```

- [ ] **Step 2: Fix each error in place**

Typical patterns and fixes:
- `react/no-unescaped-entities` — replace `'` → `&apos;`, `"` → `&quot;`.
- `@typescript-eslint/no-explicit-any` — replace `any` with the actual type or `unknown` if genuinely dynamic.
- `@typescript-eslint/no-unused-vars` — prefix unused fn params with `_` or delete.
- `react-hooks/exhaustive-deps` — add the dep, or document why it's omitted with `// eslint-disable-next-line` + reason.

- [ ] **Step 3: Flip the flag in `next.config.ts`**

Change:

```ts
eslint: {
  ignoreDuringBuilds: true,
},
```

to:

```ts
eslint: {
  ignoreDuringBuilds: false,
},
```

- [ ] **Step 4: Re-run lint until clean**

```bash
npm run lint
```

Expected: `✔ No ESLint warnings or errors`.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(lint): fix all ESLint errors and enable in build"
```

---

## Task 7: N+1 query audit and fixes

**Files (audit):**
- `src/lib/trainer-data.ts` — `getRoster`, `getTrainerRosterStats`
- `src/app/trainer/(v4)/nutrition/page.tsx`
- `src/app/trainer/(v4)/messages/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/trainer/(v4)/clients/[id]/page.tsx`

- [ ] **Step 1: Enable Prisma query logging locally**

In `src/lib/prisma.ts`, confirm logging is on in dev (most repos do this). If not, add:

```ts
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});
```

- [ ] **Step 2: Smoke-load each audit page locally with realistic data**

Seed ~20 fake clients via a quick admin script or by hand. Hit each page, count queries in the Node console. Anything over ~10 per page load is suspect.

- [ ] **Step 3: Fix `getRoster` if needed**

Current shape uses `include: { workoutSessions: { take: 60 } }`. Already bounded — fine. Confirm `sentMessages` has a `take` or `count`-only pattern. If fan-out happens, rewrite to a single `groupBy` + `findMany` for display rows.

- [ ] **Step 4: Fix `TrainerNutritionPage` if needed**

Look for per-client nested `mealPlans` + `foodEntries` fetches. Already constrained with date bounds — confirm `take` on `foodEntries` (likely unbounded today, could load all-time if a client has lots of entries). Add `take: 100` + `orderBy: { createdAt: 'desc' }` if missing.

- [ ] **Step 5: Fix trainer `messages/page.tsx` if needed**

Rail fetch already does `take: 1` for last message. Good. Confirm there's no per-client fan-out elsewhere.

- [ ] **Step 6: Fix admin overview**

The at-risk clients query pulls `workoutSessions` per user — confirm `take: 1, orderBy: { startTime: 'desc' }`. Already bounded if so.

- [ ] **Step 7: Document findings**

Only apply edits where an actual N+1 is found. Don't refactor for aesthetics — keep the diff minimal.

- [ ] **Step 8: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "perf: tighten query bounds on trainer+admin pages for roster scale"
```

---

## Task 8: CSP nonce

**Files:**
- Modify: `middleware.ts`
- Possibly modify: `src/app/layout.tsx` or wherever `<Script>` components live (rare — most inline scripts are Next's own).

- [ ] **Step 1: Read current `middleware.ts`**

Find the CSP header block. Should contain `script-src 'self' 'unsafe-inline' ...`.

- [ ] **Step 2: Generate nonce per request**

Replace the CSP assembly with nonce-based:

```ts
// In middleware.ts, inside the main handler:
const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
const csp = [
  "default-src 'self'",
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`,
  // The 'unsafe-inline' stays as a fallback for browsers that ignore
  // 'strict-dynamic'. 'nonce-<n>' + 'strict-dynamic' is the real policy.
  // ... rest of directives (style-src, img-src, connect-src, etc.)
].join('; ');

const response = NextResponse.next({
  request: { headers: new Headers({ ...Object.fromEntries(request.headers), 'x-nonce': nonce }) },
});
response.headers.set('Content-Security-Policy', csp);
```

- [ ] **Step 3: Verify Next.js picks up the nonce automatically**

Next.js 15 reads `x-nonce` from request headers and applies it to its own inline scripts. No layout.tsx changes required unless you render custom `<Script>` components — then pass `nonce={headers().get('x-nonce')}` explicitly.

- [ ] **Step 4: Smoke test**

Load any page in browser → DevTools → Network → response headers. Confirm `Content-Security-Policy` contains `nonce-<random>` and that no console CSP-violation errors appear.

- [ ] **Step 5: Commit**

```bash
git add middleware.ts
git commit -m "security: nonce-based CSP replacing script-src 'unsafe-inline'"
```

---

## Task 9: Migration history baseline (Phase 5 gate)

**⚠️ DO NOT START Phase 5 without explicit confirmation from the user. This phase changes how Railway deploys schema and is a one-way door.**

**Files:**
- Create: `prisma/migrations/0_baseline/migration.sql`
- Create: `prisma/migrations/migration_lock.toml`
- Modify: Railway build command (Branden does this in Railway UI)

- [ ] **Step 1: Generate the baseline SQL from current prod schema**

```bash
# Pull current schema from prod into a single SQL file
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_baseline/migration.sql
```

- [ ] **Step 2: Create migration_lock.toml**

```toml
# Please do not edit this file manually
# It should be added in your version-control system (e.g., Git)
provider = "postgresql"
```

- [ ] **Step 3: Mark as applied on prod**

```bash
# This ONLY marks it applied — doesn't run the SQL. Prod already has all this.
railway run npx prisma migrate resolve --applied 0_baseline
```

(Requires Railway CLI — see earlier session context on installing.)

- [ ] **Step 4: Switch Railway build command**

Currently: `prisma db push --skip-generate && npm run build`
New: `prisma migrate deploy && npm run build`

Branden updates this in Railway → Settings → Build Command.

- [ ] **Step 5: Verify next deploy runs `migrate deploy` cleanly**

Watch Railway logs — should see `No pending migrations to apply.`

- [ ] **Step 6: Commit**

```bash
git add prisma/migrations/
git commit -m "chore(db): baseline migration history; switch Railway to migrate deploy"
```

---

## Task 10: Exercise dedupe script + prod run

**Files:**
- Create: `scripts/dedupe-exercises.ts`

- [ ] **Step 1: Write the script**

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all names that have more than one row. Lowercased compare
  // because "Bench Press" and "bench press" are semantically the same.
  const dupes = await prisma.$queryRaw<Array<{ name_lc: string; count: bigint }>>`
    SELECT LOWER(name) as name_lc, COUNT(*) as count
    FROM "Exercise"
    GROUP BY LOWER(name)
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;

  console.log(`Found ${dupes.length} duplicate exercise names`);
  if (dupes.length === 0) return;

  for (const { name_lc } of dupes) {
    // All rows with this lowercased name, oldest first — the oldest
    // is the "survivor", everyone else gets merged into it.
    const rows = await prisma.exercise.findMany({
      where: {
        name: { equals: name_lc, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, createdAt: true },
    });

    const [survivor, ...losers] = rows;
    if (!survivor || losers.length === 0) continue;

    const loserIds = losers.map((r) => r.id);

    console.log(
      `  ${name_lc}: keeping ${survivor.id} (${survivor.createdAt.toISOString()}), merging ${loserIds.length} losers`,
    );

    // Remap every FK before delete, in a single transaction so we
    // never leave orphaned references.
    await prisma.$transaction([
      prisma.workoutExercise.updateMany({
        where: { exerciseId: { in: loserIds } },
        data: { exerciseId: survivor.id },
      }),
      prisma.workoutProgress.updateMany({
        where: { exerciseId: { in: loserIds } },
        data: { exerciseId: survivor.id },
      }),
      prisma.programDayExercise.updateMany({
        where: { exerciseId: { in: loserIds } },
        data: { exerciseId: survivor.id },
      }),
      prisma.exercise.deleteMany({
        where: { id: { in: loserIds } },
      }),
    ]);
  }

  console.log('Dedupe complete.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 2: Backup prod DB first**

In Railway → Postgres → Backups → trigger manual backup and verify it appears in the list before proceeding.

- [ ] **Step 3: Dry-run locally against a prod snapshot**

If you have a local dump, run `npx tsx scripts/dedupe-exercises.ts` on it first. Inspect the count and survivor IDs.

- [ ] **Step 4: Run on prod**

```bash
railway run npx tsx scripts/dedupe-exercises.ts
```

Expected: logs one line per duplicate name, "Dedupe complete." at the end.

- [ ] **Step 5: Verify no FK orphans**

```bash
railway run npx prisma db execute --file - <<EOF
SELECT COUNT(*) FROM "WorkoutExercise" we LEFT JOIN "Exercise" e ON we."exerciseId" = e.id WHERE e.id IS NULL;
SELECT COUNT(*) FROM "WorkoutProgress" wp LEFT JOIN "Exercise" e ON wp."exerciseId" = e.id WHERE e.id IS NULL;
SELECT COUNT(*) FROM "ProgramDayExercise" pde LEFT JOIN "Exercise" e ON pde."exerciseId" = e.id WHERE e.id IS NULL;
EOF
```

Expected: all 0.

- [ ] **Step 6: Commit the script**

```bash
git add scripts/dedupe-exercises.ts
git commit -m "chore(db): add exercise dedupe script (one-shot prod run completed)"
```

---

## Task 11: Partial unique indexes + Exercise.name @unique

**Files:**
- Create: `prisma/migrations/<ts>_partial_unique_trainer_slug_and_referral/migration.sql`
- Modify: `prisma/schema.prisma` — add `@unique` on `Exercise.name`, confirm the trainerSlug + trainerReferralCode are also unique'd

- [ ] **Step 1: Write the migration**

```bash
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_partial_unique_trainer_slug_and_referral
cat > prisma/migrations/$(date +%Y%m%d%H%M%S)_partial_unique_trainer_slug_and_referral/migration.sql <<'SQL'
-- Partial unique indexes so concurrent trainer onboarding can't
-- create two rows with the same slug or referral code. NULL values
-- are ignored (most User rows are CLIENTs with no slug).
CREATE UNIQUE INDEX IF NOT EXISTS "User_trainerSlug_unique"
  ON "User" ("trainerSlug") WHERE "trainerSlug" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_trainerReferralCode_unique"
  ON "User" ("trainerReferralCode") WHERE "trainerReferralCode" IS NOT NULL;

-- Exercise.name: now that dedupe has run, safe to enforce uniqueness.
-- CITEXT (case-insensitive text) isn't installed; normalize with lower()
-- in a functional unique index.
CREATE UNIQUE INDEX IF NOT EXISTS "Exercise_name_lower_unique"
  ON "Exercise" (LOWER("name"));
SQL
```

- [ ] **Step 2: Apply locally first against a prod snapshot**

```bash
railway run npx prisma migrate deploy  # against staging if you have one
```

- [ ] **Step 3: Deploy to prod**

Push to main. Railway's `prisma migrate deploy` (set in Task 9) picks it up.

- [ ] **Step 4: Verify indexes exist**

```bash
railway run npx prisma db execute --file - <<EOF
SELECT indexname FROM pg_indexes WHERE tablename IN ('User', 'Exercise') AND indexname LIKE '%unique%';
EOF
```

Expected: three rows — `User_trainerSlug_unique`, `User_trainerReferralCode_unique`, `Exercise_name_lower_unique`.

- [ ] **Step 5: Remove the code-level retry loops**

In `src/lib/trainerIdentity.ts`, the `findFirst` + retry pattern for slug/referral collision can now be simplified — trust the unique constraint and catch the `P2002` error instead. Optional, can stay as-is.

- [ ] **Step 6: Commit**

```bash
git add prisma/migrations/
git commit -m "chore(db): partial unique indexes on trainerSlug, trainerReferralCode, Exercise.name"
```

---

## Self-Review

**Spec coverage:**
- ✅ Postgres connection pool tuning — Task 5 (env var)
- ✅ Node engines pin — Task 1
- ✅ ESLint clean — Task 6
- ✅ Sentry wired — Tasks 3, 5
- ✅ UptimeRobot — Tasks 2, 5
- ✅ Upstash Redis rate limiter — Tasks 4, 5
- ✅ CSP nonce — Task 8
- ✅ N+1 query audit — Task 7
- ✅ Exercise dedupe — Task 10
- ✅ Migration baseline — Task 9
- ✅ Partial unique indexes — Task 11

**Placeholder scan:** No TBD / TODO / "add appropriate X" placeholders. Each code step shows the actual code.

**Type consistency:** `checkRateLimit` stays sync for back-compat; new `checkRateLimitAsync` is the Upstash-aware variant. `guardUpload` becomes async — all 5 call sites updated. `safeImageUrl` unchanged.

**Risk order:** Phase 1-4 are green for autonomous execution. Phase 5 requires explicit go-ahead from the user before starting because it changes Railway's deploy command and touches prod data.
