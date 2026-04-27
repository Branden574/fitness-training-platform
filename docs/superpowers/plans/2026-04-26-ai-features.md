# AI Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two AI-powered surfaces for trainers — a per-workout coach-voice summary line that appends to the existing FINISH notification, and a Sunday-evening per-trainer email + dashboard widget summarizing every client's week. Both via Vercel AI Gateway with `anthropic/claude-haiku-4-5` and engineered to fail-open so AI outage = today's exact behavior.

**Architecture:** Single `aiComplete` helper wrapping the Vercel AI Gateway with hard timeout + feature flag + structured logging. Two consumers — `summarizeWorkout` (3A, fires in parallel with the existing trainer notification) and `summarizeClientWeek` (3B, called per-client from the Sunday cron). Two additive schema changes (`WorkoutSession.aiSummary` column, `WeeklyDigest` table). Cron fires via Railway Cron service hitting an auth-gated HTTP endpoint.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Zod, `ai` SDK v6, Vercel AI Gateway, Railway (deploy + cron), existing `dispatchNotification` (web-push + FCM + bell), existing `sendNewMessageEmail` pattern in `src/lib/email.ts`.

**Note on testing:** This project has no automated test harness today (per Spec 1 + Spec 2 plans). Each phase ends with a manual smoke checklist and a push to main. Pure helpers (`buildDigestPayload`, `summarizeWorkout`'s data-fetcher) are written so unit tests slot in later if a harness lands.

**Phasing — each phase ships to main on its own:**

- **Phase 3A (Tasks 1–6):** schema + AI Gateway client + `summarizeWorkout` helper + wire into PATCH workout-sessions + smoke + push.
- **Phase 3B (Tasks 7–14):** `WeeklyDigest` schema + per-client helper + payload builder + email template + cron route + dashboard widget + Railway cron config + smoke + push.

---

## File Structure

**Created:**

- `src/lib/ai/gateway.ts` — single `aiComplete(input)` helper. Timeout, feature flag, structured error logging. Sole call surface for AI.
- `src/lib/ai/workoutSummary.ts` — `summarizeWorkout(input)` helper. Skip conditions, system prompt, last-week comparison fetch.
- `src/lib/ai/weeklyDigest.ts` — `summarizeClientWeek(input)` helper. System prompt mirrors workoutSummary's voice but framed for a 7-day window.
- `src/lib/digest/buildDigestPayload.ts` — pure-ish helper that aggregates per-client signals from `WorkoutSession`, `Message`, `User.lastSeenAt`. Returns the full `WeeklyDigestPayload` shape including `aiNote` per client.
- `src/lib/email/weeklyDigestTemplate.ts` — HTML + plain-text email template + `sendWeeklyDigestEmail` sender.
- `src/app/api/cron/weekly-digest/route.ts` — POST route, `CRON_SECRET` auth, iterates trainers, writes `WeeklyDigest` rows + sends emails.
- `src/components/trainer/WeeklyDigestWidget.tsx` — server component that reads the latest `WeeklyDigest` for the current trainer and renders per-client sections.

**Modified:**

- `prisma/schema.prisma` — add `WorkoutSession.aiSummary String?`; add `WeeklyDigest` model + `User.weeklyDigests` relation.
- `src/app/api/workout-sessions/route.ts` — fire `summarizeWorkout` in parallel with the existing notification dispatch; persist result to the row; enrich notification body with the bounded preview pattern from Spec 2.
- `src/app/trainer/(v4)/dashboard/page.tsx` — render `<WeeklyDigestWidget />` above the existing roster section.
- `.env.example` — document `AI_GATEWAY_API_KEY`, `AI_GATEWAY_ENABLED`, `AI_GATEWAY_MODEL`, `CRON_SECRET`.

**External (manual, Branden):**

- Railway env vars: `AI_GATEWAY_API_KEY` (from Vercel AI Gateway dashboard), `AI_GATEWAY_ENABLED=true`, `CRON_SECRET` (random 32 bytes).
- Railway Cron service: configured to `curl -X POST $APP_URL/api/cron/weekly-digest -H "Authorization: Bearer $CRON_SECRET"` on schedule `0 23 * * 0`.

---

## Phase 3A — AI Workout Summary

### Task 1: Schema — add `WorkoutSession.aiSummary`

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Locate the `WorkoutSession` model.**

Find the existing field block. Around the `notes`/`rating` fields, add the new column.

- [ ] **Step 2: Add `aiSummary` between existing fields.**

Where the model has:

```prisma
  notes          String?
  rating         Int?
```

becomes:

```prisma
  notes          String?
  rating         Int?
  aiSummary      String?
```

- [ ] **Step 3: Push the schema change.**

Run: `npx prisma db push --skip-generate`
Expected: `🚀 Your database is now in sync with your Prisma schema.` Additive nullable column — no `--accept-data-loss`.

- [ ] **Step 4: Regenerate Prisma client.**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client`.

- [ ] **Step 5: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean. Do NOT run `npm run build` (Turbopack collision per project memory).

- [ ] **Step 6: Commit.**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add WorkoutSession.aiSummary for AI coach notes"
```

---

### Task 2: Install `ai` SDK + document env vars

**Files:**

- Modify: `package.json`, `package-lock.json` (via npm)
- Modify: `.env.example`

- [ ] **Step 1: Install the AI SDK.**

Run: `npm install ai@latest`
Expected: package installs. `ai` appears in `package.json` dependencies (NOT devDependencies — runtime requirement; project memory `feedback_railway_prod_devdeps.md` says Railway strips devDeps at build).

- [ ] **Step 2: Verify it landed in `dependencies`.**

```bash
grep '"ai":' package.json
```

Expected: a single line under the `"dependencies"` block, not `devDependencies`.

- [ ] **Step 3: Add env entries to `.env.example`.**

Append to the bottom of `.env.example`:

```env
# Vercel AI Gateway — for AI workout summaries + weekly digests (Spec 3)
AI_GATEWAY_API_KEY=
AI_GATEWAY_ENABLED=false
AI_GATEWAY_MODEL=anthropic/claude-haiku-4-5

# Cron auth — Railway Cron service hits POST /api/cron/weekly-digest with this bearer token
CRON_SECRET=
```

- [ ] **Step 4: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit.**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore(deps): install ai SDK + document AI_GATEWAY/CRON_SECRET envs"
```

---

### Task 3: Build `src/lib/ai/gateway.ts`

**Files:**

- Create: `src/lib/ai/gateway.ts`

- [ ] **Step 1: Create the file.**

```ts
// src/lib/ai/gateway.ts
//
// Single AI call surface for the platform. Wraps the Vercel AI Gateway via
// the `ai` SDK with three operational guarantees:
//   1. Hard 4-second timeout — no AI call ever blocks a user-facing path
//      indefinitely.
//   2. Feature-flag gate — AI_GATEWAY_ENABLED !== "true" short-circuits
//      every call to null without a network hop. Lets ops disable AI in
//      seconds without a redeploy.
//   3. Structured logging — failures are recorded with enough context to
//      diagnose from Railway logs alone.
//
// Returns null on disabled / timeout / error. Callers MUST treat null as
// the no-AI fallback path. The caller is responsible for choosing what to
// show or skip when AI is unavailable.

import 'server-only';
import { generateText } from 'ai';

export interface AICompletionInput {
  systemPrompt: string;
  userPrompt: string;
  /** Hard token cap on the model's output. Default 200. */
  maxOutputTokens?: number;
  /** Hard timeout in milliseconds. Default 4000. */
  timeoutMs?: number;
  /** Optional context for log lines — e.g. "summarizeWorkout sessionId=abc". */
  logContext?: string;
}

export interface AICompletionResult {
  text: string;
}

const DEFAULT_MODEL = 'anthropic/claude-haiku-4-5';

function modelString(): string {
  return process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;
}

function isEnabled(): boolean {
  return process.env.AI_GATEWAY_ENABLED === 'true';
}

export async function aiComplete(
  input: AICompletionInput,
): Promise<AICompletionResult | null> {
  if (!isEnabled()) return null;
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error('[ai/gateway] AI_GATEWAY_ENABLED=true but AI_GATEWAY_API_KEY is unset', input.logContext);
    return null;
  }

  const timeoutMs = input.timeoutMs ?? 4000;
  const maxOutputTokens = input.maxOutputTokens ?? 200;

  try {
    const res = await generateText({
      model: modelString(),
      system: input.systemPrompt,
      prompt: input.userPrompt,
      maxOutputTokens,
      abortSignal: AbortSignal.timeout(timeoutMs),
    });
    const text = (res.text ?? '').trim();
    if (!text) {
      console.error('[ai/gateway] empty response', input.logContext);
      return null;
    }
    return { text };
  } catch (err) {
    const name = err instanceof Error ? err.name : 'UnknownError';
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[ai/gateway] failed (${name}): ${message}`,
      input.logContext ?? '',
    );
    return null;
  }
}
```

- [ ] **Step 2: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean. `ai` SDK exports `generateText` and accepts `model: string` + `abortSignal` per the gateway pattern.

- [ ] **Step 3: Commit.**

```bash
git add src/lib/ai/gateway.ts
git commit -m "feat(ai): aiComplete helper — single AI call surface with timeout + feature flag"
```

---

### Task 4: Build `src/lib/ai/workoutSummary.ts`

**Files:**

- Create: `src/lib/ai/workoutSummary.ts`

- [ ] **Step 1: Create the file.**

```ts
// src/lib/ai/workoutSummary.ts
//
// Generates a 1-2 sentence coach-voice analytical note about a just-completed
// workout. Pulls the same workout-template's previous completed session so
// the AI can reference last-week deltas.
//
// Skip conditions (return null without calling AI):
//   - completedSetCount === 0 (no signal)
//   - trainerId === null (no recipient)
//   - durationMs < 60_000 (likely a misclick)

import 'server-only';
import { prisma } from '@/lib/prisma';
import { aiComplete } from './gateway';

export interface SummarizeWorkoutInput {
  sessionId: string;
  workoutId: string | null;
  clientId: string;
  clientName: string | null;
  workoutTitle: string | null;
  completedSetCount: number;
  totalSetCount: number;
  durationMs: number;
  trainerId: string | null;
}

const SYSTEM_PROMPT = `You write a single 1-2 sentence note for a fitness trainer about their client's just-completed workout. Highlight the most actionable pattern (PR, regression, RPE outlier, missed reps). Reference last week if there's a meaningful delta. No emoji, no greetings, no encouragement. Max 120 characters. Coach-shorthand acceptable ("bench progressing on schedule", "RPE 9 with missed final set").`;

interface ExerciseStat {
  name: string;
  sets: Array<{ reps: number | null; weight: number | null; rpe: number | null; done: boolean }>;
}

async function loadCurrentSessionStats(sessionId: string): Promise<ExerciseStat[]> {
  const sets = await prisma.workoutSet.findMany({
    where: { workoutSessionId: sessionId },
    include: { exercise: { select: { name: true } } },
    orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
  });
  const grouped = new Map<string, ExerciseStat>();
  for (const s of sets) {
    const key = s.exerciseId;
    if (!grouped.has(key)) {
      grouped.set(key, { name: s.exercise.name, sets: [] });
    }
    grouped.get(key)!.sets.push({
      reps: s.reps,
      weight: s.weight,
      rpe: s.rpe,
      done: s.completed,
    });
  }
  return Array.from(grouped.values());
}

async function loadPreviousSessionStats(
  workoutId: string,
  clientId: string,
  excludeSessionId: string,
): Promise<ExerciseStat[] | null> {
  const prev = await prisma.workoutSession.findFirst({
    where: {
      workoutId,
      userId: clientId,
      completed: true,
      id: { not: excludeSessionId },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (!prev) return null;
  return loadCurrentSessionStats(prev.id);
}

function formatStats(stats: ExerciseStat[]): string {
  return stats
    .map((e) => {
      const setsLine = e.sets
        .map((s, i) => {
          const r = s.reps != null ? `${s.reps}r` : '?';
          const w = s.weight != null ? `${s.weight}lb` : '';
          const rpe = s.rpe != null ? ` rpe${s.rpe}` : '';
          const done = s.done ? '' : ' [missed]';
          return `set${i + 1} ${r} ${w}${rpe}${done}`.trim();
        })
        .join(', ');
      return `${e.name}: ${setsLine}`;
    })
    .join('\n');
}

export async function summarizeWorkout(
  input: SummarizeWorkoutInput,
): Promise<string | null> {
  if (input.completedSetCount === 0) return null;
  if (!input.trainerId) return null;
  if (input.durationMs < 60_000) return null;
  if (!input.workoutId) return null;

  const [current, previous] = await Promise.all([
    loadCurrentSessionStats(input.sessionId),
    loadPreviousSessionStats(input.workoutId, input.clientId, input.sessionId),
  ]);

  if (current.length === 0) return null;

  const minutes = Math.max(1, Math.round(input.durationMs / 60_000));
  const userPrompt = [
    `Workout: ${input.workoutTitle ?? 'unknown'}`,
    `Client: ${input.clientName ?? 'client'}`,
    `Sets completed: ${input.completedSetCount}/${input.totalSetCount}`,
    `Duration: ${minutes} min`,
    '',
    'TODAY:',
    formatStats(current),
    '',
    previous
      ? `LAST SESSION (same workout):\n${formatStats(previous)}`
      : 'LAST SESSION: none on record',
  ].join('\n');

  const result = await aiComplete({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxOutputTokens: 120,
    timeoutMs: 4000,
    logContext: `summarizeWorkout sessionId=${input.sessionId}`,
  });

  if (!result) return null;
  // Hard cap at 120 chars — model usually obeys but guard anyway
  return result.text.slice(0, 120);
}
```

- [ ] **Step 2: Verify the schema field names match.**

Confirm the project's `WorkoutSet` model has `workoutSessionId`, `setNumber`, `exerciseId`, `reps`, `weight`, `rpe`, `completed`. If a field is named differently (e.g., `done` vs `completed`), update the helper to match.

```bash
grep -A 30 "^model WorkoutSet" prisma/schema.prisma
```

Adjust the `loadCurrentSessionStats` query and the `s.done` field reference accordingly. The output is the same shape; the column names just need to line up with what's in the schema.

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/ai/workoutSummary.ts
git commit -m "feat(ai): summarizeWorkout helper with last-week comparison"
```

---

### Task 5: Wire `summarizeWorkout` into `PATCH /api/workout-sessions`

**Files:**

- Modify: `src/app/api/workout-sessions/route.ts`

- [ ] **Step 1: Add the import.**

At the top of the file, alongside the existing `dispatchNotification` and `buildWorkoutCompletedNotification` imports, add:

```ts
import { summarizeWorkout } from '@/lib/ai/workoutSummary';
```

- [ ] **Step 2: Locate the existing `justCompleted && trainerId` block.**

Search for `justCompleted` — Spec 1's block fires `dispatchNotification` here. The current shape (around line 270 of the route, but use the `git grep` output — line numbers drift):

```ts
if (justCompleted && trainerId) {
  const startMs = existing.startTime?.getTime() ?? Date.now();
  const endMs = endTime ? new Date(endTime).getTime() : Date.now();
  const payload = buildWorkoutCompletedNotification({
    clientName: existing.user?.name ?? null,
    workoutTitle: existing.workout?.title ?? null,
    completedSetCount: completedSetCount ?? 0,
    totalSetCount: totalSetCount ?? 0,
    durationMs: Math.max(0, endMs - startMs),
    clientId: existing.user?.id ?? '',
  });
  void dispatchNotification({ ... });
}
```

- [ ] **Step 3: Add the AI summary call in parallel and persist.**

Replace the block with:

```ts
if (justCompleted && trainerId) {
  const startMs = existing.startTime?.getTime() ?? Date.now();
  const endMs = endTime ? new Date(endTime).getTime() : Date.now();
  const durationMs = Math.max(0, endMs - startMs);
  const payload = buildWorkoutCompletedNotification({
    clientName: existing.user?.name ?? null,
    workoutTitle: existing.workout?.title ?? null,
    completedSetCount: completedSetCount ?? 0,
    totalSetCount: totalSetCount ?? 0,
    durationMs,
    clientId: existing.user?.id ?? '',
  });

  // Phase 3A: AI summary fires in parallel with the dispatch. Hard 4s
  // timeout inside summarizeWorkout means total latency is bounded.
  // Returns null on disabled / skip / error — fall through to factual.
  const aiSummary = await summarizeWorkout({
    sessionId: id,
    workoutId: updated.workoutId ?? null,
    clientId: existing.user?.id ?? '',
    clientName: existing.user?.name ?? null,
    workoutTitle: existing.workout?.title ?? null,
    completedSetCount: completedSetCount ?? 0,
    totalSetCount: totalSetCount ?? 0,
    durationMs,
    trainerId,
  });

  if (aiSummary) {
    // Persist for future surfaces (digest, workout detail view).
    await prisma.workoutSession.update({
      where: { id },
      data: { aiSummary },
    }).catch((err) => {
      console.error('[workout-sessions] failed to persist aiSummary', err);
    });
  }

  // Enrich notification body with AI line, capped to keep under FCM 256B.
  const factualBody = payload.body;
  const enrichedBody = aiSummary ? `${factualBody} · ${aiSummary}` : factualBody;
  const boundedBody = enrichedBody.length > 200
    ? `${enrichedBody.slice(0, 200)}…`
    : enrichedBody;

  void dispatchNotification({
    userId: trainerId,
    type: 'WORKOUT_COMPLETED',
    title: payload.title,
    body: boundedBody,
    actionUrl: payload.actionUrl,
    metadata: { sessionId: id, workoutId: updated.workoutId, aiSummary: aiSummary ?? null },
  });
}
```

(Note: `summarizeWorkout` is `await`-ed serially here, NOT `Promise.all`-parallel. This is intentional — the AI result needs to land before `dispatchNotification` so the body can include it. The 4s hard timeout inside `summarizeWorkout` bounds the worst case. If you want strictly-parallel, the dispatchNotification would need to be deferred until both promises settle, which is what the await provides anyway.)

- [ ] **Step 4: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit.**

```bash
git add src/app/api/workout-sessions/route.ts
git commit -m "feat(workout-sessions): enrich trainer notification with AI summary line (3A)"
```

---

### Task 6: Phase 3A manual smoke + push

**Files:** none modified.

- [ ] **Step 1: Confirm dev server alive (start if not).**

Run: `pgrep -af "next dev"` — start `npm run dev` if empty. Don't run `npm run build` while dev is up.

- [ ] **Step 2: Set Railway env vars (Branden's manual step).**

In the Railway dashboard for this project, set:
- `AI_GATEWAY_API_KEY` — from Vercel AI Gateway dashboard (https://vercel.com/dashboard → AI Gateway → API Keys)
- `AI_GATEWAY_ENABLED=true`
- `AI_GATEWAY_MODEL=anthropic/claude-haiku-4-5` (optional; default is the same)

Locally for the smoke test, copy these into `.env.local` so the dev server can call AI Gateway. Do NOT commit `.env.local`.

- [ ] **Step 3: Smoke happy path.**

Sign in as a test client. Start a workout. Complete 4-8 sets across 2 exercises. Hit FINISH.

In a separate browser session as the trainer:
- Verify the notification body has TWO `·`-separated parts: the factual stats line AND a coach-voice AI line (e.g., "Bench progressing on schedule, no missed reps").
- Verify the bell entry shows the same enriched body.
- Open the workout detail view (or query DB) and confirm `WorkoutSession.aiSummary` is populated.

- [ ] **Step 4: Smoke disabled-AI fallback.**

Set `AI_GATEWAY_ENABLED=false` in `.env.local`, restart dev. Repeat step 3.
- Verify the notification body is exactly today's factual line (NO ` · ` AI append).
- Verify `WorkoutSession.aiSummary` stays null.
- No errors in the dev server logs (clean fall-through).

- [ ] **Step 5: Smoke skip conditions.**

  1. Re-enable AI. Finish a workout with 0 sets completed → notification fires factual-only, no AI line.
  2. Finish a workout in <60 seconds → no AI line.
  3. As a client whose `trainerId` is null → no AI line, no error.

- [ ] **Step 6: Push.**

```bash
git push
```

Railway picks up the deploy. After it finishes, verify in Railway logs that no AI calls fire (because production `AI_GATEWAY_ENABLED` is still `false` until you flip it). Once you flip it via Railway env edit + redeploy, AI starts running.

- [ ] **Step 7: Update memory per project convention.**

Append a new file `project_ai_3a_shipped.md` to memory and a one-line entry to `MEMORY.md`. Capture the model + flag + persistence approach.

---

## Phase 3B — AI Weekly Digest

### Task 7: Schema — add `WeeklyDigest` model + `User.weeklyDigests` relation

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the new model.**

Append AFTER the existing `Notification` model (near line 620 of the schema):

```prisma
model WeeklyDigest {
  id            String   @id @default(cuid())
  trainerId     String
  weekStartIso  String
  payload       Json
  generatedAt   DateTime @default(now())
  trainer       User     @relation("TrainerWeeklyDigest", fields: [trainerId], references: [id], onDelete: Cascade)

  @@unique([trainerId, weekStartIso])
  @@index([trainerId, generatedAt])
  @@map("weekly_digests")
}
```

- [ ] **Step 2: Add the relation field on `User`.**

Find `model User`. In the relations section (alongside `messages`, `notifications`, etc.), add:

```prisma
  weeklyDigests WeeklyDigest[] @relation("TrainerWeeklyDigest")
```

- [ ] **Step 3: Push the schema change.**

Run: `npx prisma db push --skip-generate`
Expected: `🚀 Your database is now in sync with your Prisma schema.` New table — additive, safe.

- [ ] **Step 4: Regenerate.**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client`.

- [ ] **Step 5: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit.**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add WeeklyDigest model + User.weeklyDigests relation"
```

---

### Task 8: Build `src/lib/ai/weeklyDigest.ts`

**Files:**

- Create: `src/lib/ai/weeklyDigest.ts`

- [ ] **Step 1: Create the file.**

```ts
// src/lib/ai/weeklyDigest.ts
//
// Generates a 1-line coach-voice analytical note about a client's full week
// of training. Same Haiku model and same coach voice as summarizeWorkout,
// but the input window is 7 days of signals — not a single session.

import 'server-only';
import { aiComplete } from './gateway';

export interface SummarizeClientWeekInput {
  clientName: string;
  workoutsCompleted: number;
  workoutsAssigned: number;
  prSummaries: string[];          // e.g. ["bench 145x6 (PR vs 135x8)"]
  regressionSummaries: string[];  // e.g. ["squat skipped Wednesday"]
  lastLoginIso: string | null;
  lastClientMessageIso: string | null;
  contextLogId?: string;          // for log lines
}

const SYSTEM_PROMPT = `You write a single coach-voice analytical note (≤120 chars) about a client's week of training. Highlight the most actionable pattern: missed sessions, PR streak, regression, engagement drop. No greetings, no encouragement, no emoji. Coach shorthand acceptable.`;

export async function summarizeClientWeek(
  input: SummarizeClientWeekInput,
): Promise<string> {
  const adherence = input.workoutsAssigned > 0
    ? Math.round((input.workoutsCompleted / input.workoutsAssigned) * 100)
    : null;

  const userPrompt = [
    `Client: ${input.clientName}`,
    `Workouts: ${input.workoutsCompleted} of ${input.workoutsAssigned} (${adherence ?? 'n/a'}% adherence)`,
    input.prSummaries.length > 0
      ? `PRs: ${input.prSummaries.join('; ')}`
      : 'PRs: none',
    input.regressionSummaries.length > 0
      ? `Regressions/misses: ${input.regressionSummaries.join('; ')}`
      : 'Regressions: none',
    `Last login: ${input.lastLoginIso ?? 'never'}`,
    `Last message from client: ${input.lastClientMessageIso ?? 'never'}`,
  ].join('\n');

  const result = await aiComplete({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxOutputTokens: 120,
    timeoutMs: 4000,
    logContext: `summarizeClientWeek ${input.contextLogId ?? input.clientName}`,
  });

  // Empty string is the explicit "no AI note" signal — caller renders empty.
  if (!result) return '';
  return result.text.slice(0, 120);
}
```

- [ ] **Step 2: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add src/lib/ai/weeklyDigest.ts
git commit -m "feat(ai): summarizeClientWeek helper for the digest"
```

---

### Task 9: Build `src/lib/digest/buildDigestPayload.ts`

**Files:**

- Create: `src/lib/digest/buildDigestPayload.ts`

- [ ] **Step 1: Create the file.**

```ts
// src/lib/digest/buildDigestPayload.ts
//
// Aggregates per-client signal data for one trainer's weekly digest. Pure-
// ish: takes a trainerId + weekStart, queries the DB, calls
// summarizeClientWeek per client for the AI note, returns a self-contained
// payload that's persisted to WeeklyDigest.payload and rendered by both
// the email template and the dashboard widget.

import 'server-only';
import { prisma } from '@/lib/prisma';
import { summarizeClientWeek } from '@/lib/ai/weeklyDigest';

export interface DigestClientPR {
  exerciseName: string;
  achievement: string;
}

export interface DigestClientRegression {
  exerciseName: string;
  note: string;
}

export interface DigestClient {
  clientId: string;
  clientName: string;
  workoutsCompleted: number;
  workoutsAssigned: number;
  adherencePct: number;
  prsThisWeek: DigestClientPR[];
  regressions: DigestClientRegression[];
  lastLoginAt: string | null;
  lastClientMessageAt: string | null;
  aiNote: string;
}

export interface WeeklyDigestPayload {
  weekStartIso: string;
  weekEndIso: string;
  generatedAt: string;
  clients: DigestClient[];
}

/** Compute the [start, end] UTC milliseconds for a week starting at weekStartIso (local-tz Sunday 00:00). */
function weekBounds(weekStartIso: string): { startMs: number; endMs: number } {
  const start = new Date(`${weekStartIso}T00:00:00Z`).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return { startMs: start, endMs: end };
}

export async function buildDigestPayload(
  trainerId: string,
  weekStartIso: string,
): Promise<WeeklyDigestPayload> {
  const { startMs, endMs } = weekBounds(weekStartIso);
  const start = new Date(startMs);
  const end = new Date(endMs);

  const clients = await prisma.user.findMany({
    where: { trainerId, role: 'CLIENT' },
    select: {
      id: true,
      name: true,
      lastSeenAt: true,
    },
    orderBy: { name: 'asc' },
  });

  const out: DigestClient[] = [];
  for (const c of clients) {
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: c.id,
        startTime: { gte: start, lt: end },
      },
      select: {
        id: true,
        completed: true,
        endTime: true,
        aiSummary: true,
      },
    });
    const workoutsCompleted = sessions.filter((s) => s.completed).length;
    const workoutsAssigned = sessions.length;
    const adherencePct = workoutsAssigned > 0
      ? Math.round((workoutsCompleted / workoutsAssigned) * 100)
      : 0;

    // PR detection: scan completed sessions for max-weight × reps that beats
    // any prior record for the same exercise + same client. Cheap version
    // for v1: pull all WorkoutSet rows for the week's completed sessions and
    // compare against a single max-weight-per-reps query for prior records.
    const weeklySessionIds = sessions.filter((s) => s.completed).map((s) => s.id);
    const weeklySets = weeklySessionIds.length > 0
      ? await prisma.workoutSet.findMany({
          where: { workoutSessionId: { in: weeklySessionIds }, completed: true },
          include: { exercise: { select: { id: true, name: true } } },
        })
      : [];

    const prs: DigestClientPR[] = [];
    // Group this week's sets by exercise; for each, pick the max-weight set.
    const byExercise = new Map<string, { name: string; max: { reps: number | null; weight: number | null } | null }>();
    for (const s of weeklySets) {
      const key = s.exerciseId;
      const cur = byExercise.get(key) ?? { name: s.exercise.name, max: null };
      const weight = s.weight ?? 0;
      const curWeight = cur.max?.weight ?? -1;
      if (weight > curWeight) {
        cur.max = { reps: s.reps, weight };
      }
      byExercise.set(key, cur);
    }
    for (const [exerciseId, info] of byExercise) {
      if (!info.max) continue;
      // Prior record: max weight ever logged for this client + exercise BEFORE this week's start.
      const prior = await prisma.workoutSet.findFirst({
        where: {
          exerciseId,
          completed: true,
          workoutSession: {
            userId: c.id,
            completed: true,
            startTime: { lt: start },
          },
        },
        orderBy: { weight: 'desc' },
        select: { weight: true, reps: true },
      });
      const priorWeight = prior?.weight ?? 0;
      if ((info.max.weight ?? 0) > priorWeight) {
        prs.push({
          exerciseName: info.name,
          achievement: `${info.max.weight}lb × ${info.max.reps ?? '?'}`,
        });
      }
    }

    // Regressions = sessions assigned but not completed. v1 just lists count;
    // exercise-level regression detection is deferred.
    const regressions: DigestClientRegression[] =
      workoutsAssigned > workoutsCompleted
        ? [{
            exerciseName: 'session',
            note: `${workoutsAssigned - workoutsCompleted} skipped`,
          }]
        : [];

    // Last client → trainer message
    const lastMsg = await prisma.message.findFirst({
      where: { senderId: c.id, receiverId: trainerId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const aiNote = await summarizeClientWeek({
      clientName: c.name ?? 'Client',
      workoutsCompleted,
      workoutsAssigned,
      prSummaries: prs.map((p) => `${p.exerciseName} ${p.achievement}`),
      regressionSummaries: regressions.map((r) => r.note),
      lastLoginIso: c.lastSeenAt ? c.lastSeenAt.toISOString() : null,
      lastClientMessageIso: lastMsg?.createdAt ? lastMsg.createdAt.toISOString() : null,
      contextLogId: `client=${c.id} week=${weekStartIso}`,
    });

    out.push({
      clientId: c.id,
      clientName: c.name ?? 'Client',
      workoutsCompleted,
      workoutsAssigned,
      adherencePct,
      prsThisWeek: prs,
      regressions,
      lastLoginAt: c.lastSeenAt ? c.lastSeenAt.toISOString() : null,
      lastClientMessageAt: lastMsg?.createdAt ? lastMsg.createdAt.toISOString() : null,
      aiNote,
    });
  }

  return {
    weekStartIso,
    weekEndIso: new Date(endMs).toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    clients: out,
  };
}
```

- [ ] **Step 2: Verify schema field names match.**

The implementer's `User` model may have `lastSeenAt` or `lastLoginAt` or another name. Adjust the `select` and the `c.lastSeenAt` references to match. Same for the existence of a `User.role` field — confirm it's an enum or string with `'CLIENT'`/`'TRAINER'`/`'ADMIN'` values.

```bash
grep -A 50 "^model User" prisma/schema.prisma | head -60
```

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/digest/buildDigestPayload.ts
git commit -m "feat(digest): buildDigestPayload aggregates per-client weekly signals"
```

---

### Task 10: Build `src/lib/email/weeklyDigestTemplate.ts`

**Files:**

- Create: `src/lib/email/weeklyDigestTemplate.ts`

- [ ] **Step 1: Create the file.**

```ts
// src/lib/email/weeklyDigestTemplate.ts
//
// Email template + sender for the weekly trainer digest. Mirrors the
// pattern in src/lib/email.ts (transactional, fail-open). The dashboard
// widget renders the same payload — this template is the email mirror.

import 'server-only';
import type { WeeklyDigestPayload } from '@/lib/digest/buildDigestPayload';

export interface SendWeeklyDigestEmailInput {
  toEmail: string;
  toName: string | null;
  payload: WeeklyDigestPayload;
  appUrl: string; // e.g. https://martinezfitness559.com
}

function plainText(input: SendWeeklyDigestEmailInput): string {
  const lines: string[] = [];
  lines.push(`Weekly digest · ${input.payload.clients.length} clients · week of ${input.payload.weekStartIso}`);
  lines.push('');
  lines.push(`Open dashboard: ${input.appUrl}/trainer/dashboard`);
  lines.push('');
  for (const c of input.payload.clients) {
    lines.push(`— ${c.clientName} —`);
    lines.push(`Workouts: ${c.workoutsCompleted}/${c.workoutsAssigned} (${c.adherencePct}%)`);
    if (c.prsThisWeek.length > 0) {
      lines.push(`PRs: ${c.prsThisWeek.map((p) => `${p.exerciseName} ${p.achievement}`).join(', ')}`);
    }
    if (c.regressions.length > 0) {
      lines.push(`Regressions: ${c.regressions.map((r) => r.note).join(', ')}`);
    }
    if (c.aiNote) lines.push(`Coach AI: ${c.aiNote}`);
    lines.push('');
  }
  return lines.join('\n');
}

function htmlBody(input: SendWeeklyDigestEmailInput): string {
  const sections = input.payload.clients
    .map(
      (c) => `
    <div style="margin: 24px 0; padding: 16px; border: 1px solid #2a2a2a; border-radius: 8px; background: #111;">
      <h3 style="margin: 0 0 8px; color: #fff; font-family: sans-serif;">${escapeHtml(c.clientName)}</h3>
      <div style="color: #aaa; font-family: monospace; font-size: 12px; margin-bottom: 8px;">
        ${c.workoutsCompleted}/${c.workoutsAssigned} workouts · ${c.adherencePct}% adherence
      </div>
      ${c.prsThisWeek.length > 0
        ? `<div style="color: #4ade80; font-size: 13px; margin: 4px 0;">PRs: ${c.prsThisWeek.map((p) => `${escapeHtml(p.exerciseName)} ${escapeHtml(p.achievement)}`).join(', ')}</div>`
        : ''}
      ${c.regressions.length > 0
        ? `<div style="color: #f87171; font-size: 13px; margin: 4px 0;">Regressions: ${c.regressions.map((r) => escapeHtml(r.note)).join(', ')}</div>`
        : ''}
      ${c.aiNote
        ? `<div style="color: #d4d4d4; font-style: italic; margin-top: 8px; font-family: sans-serif; font-size: 13px;">${escapeHtml(c.aiNote)}</div>`
        : ''}
    </div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<body style="background: #0a0a0a; color: #fff; font-family: sans-serif; padding: 24px;">
  <h2 style="margin: 0 0 8px;">Weekly digest</h2>
  <div style="color: #aaa; margin-bottom: 24px;">
    ${input.payload.clients.length} clients · week of ${input.payload.weekStartIso}
  </div>
  <a href="${input.appUrl}/trainer/dashboard" style="color: #fb923c; text-decoration: none;">Open dashboard →</a>
  ${sections}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sends the weekly digest email. Fail-open: any error logged but never
 * thrown, mirroring sendNewMessageEmail in src/lib/email.ts.
 */
export async function sendWeeklyDigestEmail(
  input: SendWeeklyDigestEmailInput,
): Promise<void> {
  // Use the same email plumbing as src/lib/email.ts. We import dynamically
  // to avoid loading the SMTP/Resend client at module-init time (the
  // existing email module is already lazy in this project).
  try {
    const { sendRawEmail } = await import('@/lib/email');
    await sendRawEmail({
      toEmail: input.toEmail,
      toName: input.toName,
      subject: `Weekly digest · ${input.payload.clients.length} clients · week of ${input.payload.weekStartIso}`,
      html: htmlBody(input),
      text: plainText(input),
    });
  } catch (err) {
    console.error('[email/weeklyDigest] send failed', err);
  }
}
```

- [ ] **Step 2: Verify `sendRawEmail` exists in `src/lib/email.ts`.**

```bash
grep -n "export.*sendRawEmail\|export.*sendNewMessageEmail" src/lib/email.ts
```

If `sendRawEmail` doesn't exist, the existing module exports `sendNewMessageEmail`. You'll need to factor out a `sendRawEmail({ toEmail, toName, subject, html, text })` helper from the existing send code, or — simpler — add a new sibling export that calls the same underlying transport. Match whatever pattern the existing `sendNewMessageEmail` uses (likely Resend or SMTP via Nodemailer based on the project).

If you have to add `sendRawEmail` to `src/lib/email.ts`, keep this commit focused — write only what's needed for the digest, then commit both files together.

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/email/weeklyDigestTemplate.ts src/lib/email.ts
git commit -m "feat(email): weekly digest template + sendWeeklyDigestEmail"
```

(If `email.ts` wasn't touched, drop it from the `git add` line.)

---

### Task 11: Build `src/app/api/cron/weekly-digest/route.ts`

**Files:**

- Create: `src/app/api/cron/weekly-digest/route.ts`

- [ ] **Step 1: Create the file.**

```ts
// src/app/api/cron/weekly-digest/route.ts
//
// Sunday-evening cron entry. Authenticated via CRON_SECRET bearer token.
// Iterates trainers, computes each trainer's local week-start Sunday,
// builds the digest payload, persists to WeeklyDigest, sends the email.
// Idempotent across retries — @@unique([trainerId, weekStartIso]).

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildDigestPayload } from '@/lib/digest/buildDigestPayload';
import { sendWeeklyDigestEmail } from '@/lib/email/weeklyDigestTemplate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_TZ = 'America/Los_Angeles';

/** Compute the YYYY-MM-DD of the most recent Sunday in the given timezone, relative to `now`. */
function localSundayIso(now: Date, tz: string): string {
  // Use Intl to format the date in the trainer's tz, find weekday, walk back to Sunday.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(now);
  const yearPart = parts.find((p) => p.type === 'year')!.value;
  const monthPart = parts.find((p) => p.type === 'month')!.value;
  const dayPart = parts.find((p) => p.type === 'day')!.value;
  const wkPart = parts.find((p) => p.type === 'weekday')!.value;
  // Map weekday short name → number of days back to Sunday.
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const back = map[wkPart] ?? 0;
  const localDate = new Date(`${yearPart}-${monthPart}-${dayPart}T00:00:00Z`);
  localDate.setUTCDate(localDate.getUTCDate() - back);
  return localDate.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  // Auth via bearer token. CRON_SECRET is set in Railway env.
  const auth = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const trainers = await prisma.user.findMany({
    where: { role: 'TRAINER' },
    select: { id: true, email: true, name: true, timezone: true },
  });

  let processed = 0;
  let skippedExisting = 0;
  let errors = 0;

  for (const t of trainers) {
    try {
      const tz = t.timezone || DEFAULT_TZ;
      const weekStartIso = localSundayIso(now, tz);

      // Idempotency: skip if already generated for this week.
      const existing = await prisma.weeklyDigest.findUnique({
        where: { trainerId_weekStartIso: { trainerId: t.id, weekStartIso } },
        select: { id: true },
      });
      if (existing) {
        skippedExisting++;
        continue;
      }

      const payload = await buildDigestPayload(t.id, weekStartIso);
      if (payload.clients.length === 0) {
        // No clients for this trainer this week — skip persistence and email.
        continue;
      }

      await prisma.weeklyDigest.create({
        data: {
          trainerId: t.id,
          weekStartIso,
          payload: payload as unknown as object, // Prisma Json column accepts any object
        },
      });

      void sendWeeklyDigestEmail({
        toEmail: t.email,
        toName: t.name,
        payload,
        appUrl: process.env.APP_URL ?? 'https://martinezfitness559.com',
      });

      processed++;
    } catch (err) {
      errors++;
      console.error(`[cron/weekly-digest] trainer=${t.id} failed`, err);
      // Continue with next trainer — one trainer's failure must not block the cohort.
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    skippedExisting,
    errors,
    trainerCount: trainers.length,
  });
}
```

- [ ] **Step 2: Verify `User.timezone` exists.**

```bash
grep -E "timezone\s+String" prisma/schema.prisma | head
```

If the field is named differently (e.g., `tz` or absent), update the cron's `t.timezone` reference. If the field doesn't exist at all, hard-code `DEFAULT_TZ` for v1 and note this as a follow-up.

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add src/app/api/cron/weekly-digest/route.ts
git commit -m "feat(cron): weekly-digest route — iterates trainers, idempotent, fail-open"
```

---

### Task 12: Build `src/components/trainer/WeeklyDigestWidget.tsx`

**Files:**

- Create: `src/components/trainer/WeeklyDigestWidget.tsx`

- [ ] **Step 1: Create the file.**

```tsx
// src/components/trainer/WeeklyDigestWidget.tsx
//
// Server component that reads the latest WeeklyDigest for the current
// trainer and renders per-client sections. The same payload that the
// digest email uses — one source of truth, two surfaces.

import { prisma } from '@/lib/prisma';
import type { WeeklyDigestPayload } from '@/lib/digest/buildDigestPayload';

export interface WeeklyDigestWidgetProps {
  trainerId: string;
}

export default async function WeeklyDigestWidget({ trainerId }: WeeklyDigestWidgetProps) {
  const latest = await prisma.weeklyDigest.findFirst({
    where: { trainerId },
    orderBy: { generatedAt: 'desc' },
    select: { payload: true, weekStartIso: true, generatedAt: true },
  });

  if (!latest) {
    return (
      <div
        className="mf-card"
        style={{ padding: 16, marginBottom: 16, color: 'var(--mf-fg-mute)' }}
      >
        <div className="mf-eyebrow">WEEKLY DIGEST</div>
        <div style={{ marginTop: 6, fontSize: 13 }}>
          No digest yet — first one ships next Sunday.
        </div>
      </div>
    );
  }

  const payload = latest.payload as unknown as WeeklyDigestPayload;

  return (
    <div className="mf-card" style={{ padding: 16, marginBottom: 16 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div>
          <div className="mf-eyebrow">WEEKLY DIGEST</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
            Week of {payload.weekStartIso} · {payload.clients.length} clients
          </div>
        </div>
        <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
          GENERATED {new Date(payload.generatedAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {payload.clients.map((c) => (
          <div
            key={c.clientId}
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'var(--mf-surface-2)',
              border: '1px solid var(--mf-hairline)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{c.clientName}</div>
              <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
                {c.workoutsCompleted}/{c.workoutsAssigned} · {c.adherencePct}%
              </div>
            </div>
            {c.prsThisWeek.length > 0 && (
              <div style={{ color: '#4ade80', fontSize: 12, marginTop: 4 }}>
                PRs: {c.prsThisWeek.map((p) => `${p.exerciseName} ${p.achievement}`).join(', ')}
              </div>
            )}
            {c.regressions.length > 0 && (
              <div style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>
                Regressions: {c.regressions.map((r) => r.note).join(', ')}
              </div>
            )}
            {c.aiNote && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontStyle: 'italic',
                  color: 'var(--mf-fg-dim)',
                }}
              >
                {c.aiNote}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add src/components/trainer/WeeklyDigestWidget.tsx
git commit -m "feat(trainer): WeeklyDigestWidget for the dashboard"
```

---

### Task 13: Wire the widget into the trainer dashboard

**Files:**

- Modify: `src/app/trainer/(v4)/dashboard/page.tsx`

- [ ] **Step 1: Read the existing dashboard page.**

```bash
head -80 "src/app/trainer/(v4)/dashboard/page.tsx"
```

Find where the trainer's roster / main content is rendered. The widget goes ABOVE the roster section (or wherever the trainer's eye lands first).

- [ ] **Step 2: Import and render.**

At the top of the file, add:

```tsx
import WeeklyDigestWidget from '@/components/trainer/WeeklyDigestWidget';
```

Inside the JSX, just before the existing first content section (likely the roster or "today's appointments" block), add:

```tsx
<WeeklyDigestWidget trainerId={session.user.id} />
```

(`session.user.id` may be sourced differently — match the existing pattern. Whatever variable holds the current trainer id passes through here.)

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/trainer/(v4)/dashboard/page.tsx"
git commit -m "feat(trainer): render WeeklyDigestWidget on dashboard"
```

---

### Task 14: Phase 3B manual smoke + Railway cron setup + push

**Files:** none modified.

- [ ] **Step 1: Set Railway env vars (Branden).**

In Railway dashboard:
- `CRON_SECRET` — generate with `openssl rand -hex 32`. Set in Railway env.
- `APP_URL` — `https://martinezfitness559.com` (or production URL).
- `AI_GATEWAY_ENABLED=true` (already set in 3A).

Locally, copy `CRON_SECRET` and `APP_URL` to `.env.local` for the smoke test.

- [ ] **Step 2: Local smoke — invoke the cron route directly.**

```bash
curl -X POST "http://localhost:3000/api/cron/weekly-digest" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected: `{"ok":true,"processed":N,"skippedExisting":0,"errors":0,"trainerCount":N}`

- [ ] **Step 3: Verify a `WeeklyDigest` row was written.**

```bash
npx prisma studio
```

Open `WeeklyDigest`. Confirm one row per trainer with non-empty `payload.clients`.

- [ ] **Step 4: Verify the dashboard widget renders.**

Sign in as a trainer. Open `/trainer/dashboard`. Confirm the widget shows above the roster with the per-client sections you saw in the DB.

- [ ] **Step 5: Verify the email arrived.**

Check the trainer's inbox (or whatever sandbox the email pipeline uses locally). Confirm subject = `Weekly digest · N clients · week of YYYY-MM-DD`.

- [ ] **Step 6: Verify idempotency.**

Re-invoke the curl from step 2. Expected: `processed: 0, skippedExisting: N`. No duplicate emails.

- [ ] **Step 7: Verify auth gate.**

```bash
curl -X POST "http://localhost:3000/api/cron/weekly-digest"
# expect: 401 Unauthorized
curl -X POST "http://localhost:3000/api/cron/weekly-digest" -H "Authorization: Bearer wrong"
# expect: 401 Unauthorized
```

- [ ] **Step 8: Verify AI-disabled fallback.**

Set `AI_GATEWAY_ENABLED=false`, restart dev. Re-invoke (after manually deleting the existing WeeklyDigest row for one trainer to bypass idempotency). Confirm the widget renders with `aiNote = ''` per client (just stats, no italic AI line). No errors.

- [ ] **Step 9: Configure Railway Cron service (Branden).**

In Railway dashboard:
1. Add a new service in this project — type "Cron".
2. Schedule: `0 23 * * 0` (23:00 UTC every Sunday).
3. Command: `curl -fsSL -X POST $APP_URL/api/cron/weekly-digest -H "Authorization: Bearer $CRON_SECRET"`
4. Reuse the project's `APP_URL` and `CRON_SECRET` env vars.
5. Save and verify the service shows "scheduled".

- [ ] **Step 10: Push.**

```bash
git push
```

- [ ] **Step 11: Update memory.**

Append `project_ai_3b_shipped.md` and a one-line entry to `MEMORY.md` capturing: phase shipped, commit range, the Railway cron setup specifics so future-you knows where to find them.

---

## Out of scope reminders (do NOT add in this plan)

Per the spec's Non-goals section, these are deferred to later specs:

- AI form-check on video (vision LLM)
- AI program generation
- AI suggested replies for trainer
- AI semantic search
- Body weight / food log signals in the digest
- Configurable cron cadence per trainer
- Push notification for the weekly digest
- Client-facing AI features
- Streaming AI responses
- Cost ceilings per trainer
- Prompt versioning / A/B testing
