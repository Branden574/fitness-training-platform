# AI Features — Design

**Date:** 2026-04-26
**Status:** Spec — awaiting plan
**Roadmap position:** Spec 3 of 3 (workout-share → chat-attachments → AI features). Spec 1 shipped 2026-04-26 (commits `41df28a..e6115c1`). Spec 2 shipped 2026-04-26 (commits `b881223..0276786`).

## Problem

The platform has accumulated rich per-client data — workout sessions with per-exercise sets/reps/weights/RPE, week-over-week deltas, chat history, completion patterns — but a trainer scrolling their dashboard sees a flat list of "8 of 8 sets done" notifications and no synthesis. AI can do the analytical pattern-matching that turns raw data into coaching insight a trainer can act on, without replacing the trainer's judgment.

This spec ships two AI surfaces that prove the integration end-to-end while delivering immediate trainer value. They share LLM plumbing (Vercel AI Gateway, prompt patterns, observability, cost guardrails) so building together amortizes the integration cost.

## Goals

- AI workout summary lands as an additional 1-2 sentence coach-voice analytical note on the trainer's existing post-FINISH notification, surfacing PRs / regressions / RPE outliers without the trainer reading the workout log.
- AI weekly client digest summarizes a trainer's full roster every Sunday evening into one email + one dashboard widget, sectioned per client, with AI commentary per client.
- LLM provider is swappable via Vercel AI Gateway (default model `anthropic/claude-haiku-4-5`).
- Both surfaces fail-open: AI provider outage = today's exact experience for trainers and clients (factual notification, no widget update). Never on the critical path.
- Zero `--accept-data-loss` migrations on Railway. Two additive schema changes.
- Reuse Spec 1's `dispatchNotification`, Spec 2's `boundedPreview` cap logic, and the existing email pipeline.

## Non-goals (deferred)

- **AI form-check on video** (the marquee feature). Deferred to its own spec because it requires a vision LLM, multi-frame analysis, latency UX, and significant prompt engineering.
- **AI program generation** — schema mapping + edit workflow is a separate undertaking.
- **AI suggested replies for trainer** — moderate value, easy to add later, not on the critical path.
- **AI semantic search across programs/exercises** — embeddings + vector store, deferred until library scales.
- **Body weight / food log signals in the digest (C4/C5)** — defer until weight + food adherence become consistently logged across clients.
- **Configurable cron cadence per trainer** — Sunday 6pm trainer-local is the universal v1 cadence.
- **Push notification for the weekly digest** — push is precious; weekly review doesn't justify it. Email + dashboard widget is enough.
- **Client-facing AI features** — this spec is trainer-only. Client-facing AI gets a separate spec once trainer feedback indicates demand.
- **Streaming AI responses** — both surfaces buffer the full response. The output is short (≤120 chars per call) so streaming offers nothing meaningful.

## Architecture

### Phasing

Two independently-shippable phases that share the AI integration layer:

| Phase | Ships | Effort |
|---|---|---|
| **3A — AI workout summary** | AI Gateway client, `summarizeWorkout` helper, enriched trainer notification, `WorkoutSession.aiSummary` persistence | ~3-4 sittings |
| **3B — AI weekly client digest** | New `WeeklyDigest` table, Sunday-evening cron route, digest email template, dashboard widget | ~4-5 sittings |

Each phase ends with a manual smoke + push to main. 3A is fully usable on its own before 3B begins. 3B reuses 3A's AI client and prompt patterns.

### Schema

Two additive changes. Both nullable / additive — `npx prisma db push --skip-generate` is safe on Railway.

```prisma
model WorkoutSession {
  // existing fields…
  notes          String?
  rating         Int?
  aiSummary      String?     // NEW (3A) — coach-voice 1-2 sentence note, ≤120 chars
  // existing fields…
}

model WeeklyDigest {                                        // NEW (3B)
  id            String   @id @default(cuid())
  trainerId     String
  weekStartIso  String   // "YYYY-MM-DD" of Sunday at 00:00 in trainer-local tz
  payload       Json
  generatedAt   DateTime @default(now())
  trainer       User     @relation("TrainerWeeklyDigest", fields: [trainerId], references: [id], onDelete: Cascade)

  @@unique([trainerId, weekStartIso])
  @@index([trainerId, generatedAt])
  @@map("weekly_digests")
}

model User {
  // existing relations…
  weeklyDigests WeeklyDigest[] @relation("TrainerWeeklyDigest")
}
```

TS-side payload shape (untyped at DB; parsed via Zod on read):

```ts
type WeeklyDigestPayload = {
  weekStartIso: string;
  weekEndIso: string;
  generatedAt: string;
  clients: Array<{
    clientId: string;
    clientName: string;
    workoutsCompleted: number;
    workoutsAssigned: number;
    adherencePct: number;        // 0..100
    prsThisWeek: Array<{ exerciseName: string; achievement: string }>;
    regressions: Array<{ exerciseName: string; note: string }>;
    lastLoginAt: string | null;
    lastClientMessageAt: string | null;
    aiNote: string;              // 1-line coach-voice analytical note, ≤120 chars
  }>;
};
```

### AI integration layer (shared by 3A and 3B)

**Provider:** Vercel AI Gateway via `ai-sdk` v6, plain `provider/model` strings (per the platform's current guidance — do NOT default to provider-specific packages).

**Module:** `src/lib/ai/gateway.ts` — single client wrapper with:
- Hard 4-second per-call timeout (`AbortSignal.timeout(4000)`)
- Feature-flag gate via `AI_GATEWAY_ENABLED` env var — when `false`, all calls short-circuit to `null` without network. Lets ops disable AI in seconds without a redeploy.
- Structured-error logging (`console.error` with request context) so failures are diagnosable from Railway logs without a separate observability stack
- Token budget annotation (model + input length + output length) on success for cost auditing

**Default model:** `anthropic/claude-haiku-4-5`. Fast (sub-second typical), cheap (~$0.0005 per workout summary at our prompt size), strong at concise structured output. Swap via env var, no code change.

**Required env vars:**
- `AI_GATEWAY_API_KEY` — set via `vercel env`
- `AI_GATEWAY_ENABLED` — `"true"` / `"false"` toggle (defaults `"false"` if unset to keep AI dark on first deploy)
- `AI_GATEWAY_MODEL` — defaults to `anthropic/claude-haiku-4-5` if unset

**Public API of the helper:**

```ts
export interface AICompletionInput {
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;       // default 200
  timeoutMs?: number;             // default 4000
}

export interface AICompletionResult {
  text: string;
}

/**
 * Returns null when:
 *   - AI_GATEWAY_ENABLED !== "true"
 *   - call times out
 *   - call errors (network, rate limit, malformed response)
 * Returns a result on success. Callers MUST treat null as the no-AI path.
 */
export async function aiComplete(input: AICompletionInput): Promise<AICompletionResult | null>;
```

This is the only AI surface — both `summarizeWorkout` and `summarizeClientWeek` call it. No model selection happens at the call site.

### Phase 3A — workout summary flow

**Trigger:** the same FINISH transition Spec 1 already detects in `PATCH /api/workout-sessions` (when `existing.completed === false && body.completed === true && existing.endTime === null && trainerId !== null`).

**New side effect, parallel with the existing notification dispatch:**

```ts
// inside PATCH handler, after the same gate Spec 1 used:
if (justCompleted && trainerId) {
  // Fire AI summary IN PARALLEL with the trainer-id lookup + notification.
  // Total latency = max(AI call, DB writes), not sum.
  const [aiResult] = await Promise.allSettled([
    summarizeWorkout({ sessionId: id, trainerId, clientName, ... }),
  ]);
  const aiSummary = aiResult.status === 'fulfilled' ? aiResult.value : null;

  // Persist to the WorkoutSession row so the trainer can review later
  if (aiSummary) {
    await prisma.workoutSession.update({
      where: { id },
      data: { aiSummary },
    });
  }

  // Enriched dispatch — same boundedPreview pattern from Spec 2
  const enrichedBody = aiSummary
    ? `${factualBody} · ${aiSummary}`
    : factualBody;
  const boundedBody = enrichedBody.length > 200
    ? `${enrichedBody.slice(0, 200)}…`
    : enrichedBody;

  void dispatchNotification({
    userId: trainerId,
    type: 'WORKOUT_COMPLETED',
    title,
    body: boundedBody,
    actionUrl,
    metadata: { sessionId: id, workoutId: updated.workoutId, aiSummary },
  });
}
```

**`summarizeWorkout` helper** (`src/lib/ai/workoutSummary.ts`):
- Skip-conditions (return `null` immediately, no LLM call):
  - `completedSetCount === 0`
  - `trainerId === null`
  - `durationMs < 60_000` (< 60 seconds — likely a misclick)
- Data fetched per call: full per-exercise log for this session + same-workout-template's previous completed session for the same client (`WorkoutSession` filtered by `userId` + `workoutId` + `completed=true` + `id !== current`, ordered by `createdAt desc`, take 1)
- System prompt:

  > You write a single 1-2 sentence note for a fitness trainer about their client's just-completed workout. Highlight the most actionable pattern (PR, regression, RPE outlier, missed reps). Reference last week if there's a meaningful delta. No emoji, no greetings, no encouragement. Max 120 characters. Coach-shorthand acceptable ("bench progressing on schedule", "RPE 9 with missed final set").

- User prompt: structured per-exercise stats for this session + last session, formatted compactly as plain text
- Output post-processing: trim, slice to 120 chars hard cap, reject if empty

**Persistence:** `WorkoutSession.aiSummary` is updated when AI succeeds. Future trainer-facing surfaces (workout detail view, dashboard, the digest's per-client section) can read it without re-running AI.

### Phase 3B — weekly digest flow

**Cron:** Railway-triggered HTTP endpoint at `src/app/api/cron/weekly-digest/route.ts`. The project deploys to Railway (per project memory `project_deploy_model.md`), not Vercel — there is no `vercel.ts` / Vercel cron config in this codebase. Two options for triggering:

- **Recommended (v1): Railway Cron service.** Add a small Railway service in the same project that runs `curl -X POST $APP_URL/api/cron/weekly-digest -H "Authorization: Bearer $CRON_SECRET"` on schedule `0 23 * * 0` (23:00 UTC every Sunday). Configured in Railway's UI; no in-repo manifest needed. The shared `CRON_SECRET` env var protects the route from public invocation.
- **Alternative: external scheduler.** Same endpoint, called by `cron-job.org` / similar. Same auth header. Use only if Railway Cron service has issues during smoke.

**Route auth:** the endpoint checks `Authorization: Bearer ${process.env.CRON_SECRET}` on every call. Mismatch → 401. Required env var: `CRON_SECRET`.

**Why universal UTC schedule with per-trainer evaluation:** the cron caller is UTC. To respect each trainer's local timezone, the route runs every Sunday at 23:00 UTC and **iterates trainers**, computing each trainer's local Sunday date inline (`User.timezone` IANA string is already on the model per `src/lib/formatTime.ts`). For a trainer whose local Sunday is "ahead" (Asia), the digest arrives Monday-morning local; for a trainer in PST, 4pm local Sunday. v1 accepts this skew — Sunday-evening-ish for US trainers is the sweet spot. Per-trainer cadence is deferred non-goal.

**Per-trainer flow inside the cron:**

```
for each user where role = 'TRAINER':
  weekStartIso = computeSundayLocal(trainer.timezone, now())
  if exists WeeklyDigest where trainerId=user.id and weekStartIso=weekStartIso:
    skip                                 // idempotent across cron retries
  payload = await buildDigestPayload(user.id, weekStartIso)
  if payload.clients.length === 0:
    skip                                 // trainer has no clients
  await prisma.weeklyDigest.create({ trainerId, weekStartIso, payload })
  void sendWeeklyDigestEmail(user, payload)   // fire-and-forget, fail-open
```

**`buildDigestPayload` helper** (`src/lib/digest/buildDigestPayload.ts`):
- Loads the trainer's clients (`User.trainerId === trainerId`)
- For each client, aggregates the week's signals from `WorkoutSession`, `Message`, `User.lastSeenAt`
- Detects PRs by comparing each completed session's max-weight × reps against prior records for the same `Exercise` and same client
- Calls `summarizeClientWeek` (which delegates to `aiComplete`) for the per-client `aiNote`
- Returns the `WeeklyDigestPayload` shape

**`summarizeClientWeek` helper** (`src/lib/ai/weeklyDigest.ts`):
- Same Haiku model, same coach-analytical voice
- System prompt mirrors `summarizeWorkout`'s but framed for a 7-day window:

  > You write a single coach-voice analytical note (≤120 chars) about a client's week of training. Highlight the most actionable pattern: missed sessions, PR streak, regression, engagement drop. No greetings, no encouragement, no emoji. Coach shorthand acceptable.

- User prompt: structured 7-day signal summary (workouts done/assigned, PRs, last login, etc.) — same data the email will display

**Email template** (`src/lib/email/weeklyDigestTemplate.ts`):
- Subject: `Weekly digest · {N} clients · week of {weekStartIso}`
- Body sections per client (from `payload.clients`), with the trainer-dashboard URL deep-linked at the top
- HTML + plain-text versions, same pattern as `sendNewMessageEmail`

**Dashboard widget** (`src/components/trainer/WeeklyDigestWidget.tsx`):
- Server-component, reads `WeeklyDigest` for the current trainer's most recent `weekStartIso`
- Renders the same per-client sections as the email, using `mf-card` primitives
- Empty state: "No digest yet — first one ships next Sunday."

**Trainer dashboard integration:** add `<WeeklyDigestWidget trainerId={...} />` to `src/app/trainer/(v4)/dashboard/page.tsx` above the existing roster section. No layout overhaul.

### Failure modes & error handling

| Failure | Behavior |
|---|---|
| `AI_GATEWAY_ENABLED !== "true"` | All AI calls return `null` immediately. Notifications fire factual-only. Digest cron generates payload with `aiNote = ''` per client. No errors, no surface change. |
| AI call times out (>4s) | `AbortSignal` aborts. Caller receives `null`. Same fall-through as disabled. |
| AI call errors (rate limit, network, malformed) | Caught in `gateway.ts`, logged with request context, returns `null`. Same fall-through. |
| `summarizeWorkout` throws | Caller's `Promise.allSettled` records `'rejected'`. Notification fires factual-only. Logged. `WorkoutSession.aiSummary` stays null. |
| Cron crashes mid-trainer-loop | Vercel retries up to 3 times. The `@@unique([trainerId, weekStartIso])` on `WeeklyDigest` makes per-trainer writes idempotent — already-completed trainers are skipped on retry. |
| Cron crashes before any trainer is processed | No digest emails go out that week. Existing dashboard widgets show last week's payload. Logged for next-day investigation. |
| `WeeklyDigest.payload` shape drift on read | Zod-parsed in the widget reader. On parse failure, widget renders empty state and logs the schema-validation error. Old digests don't break new code. |
| Trainer has no `timezone` set | Defaults to `America/Los_Angeles` for the `weekStartIso` computation. Logged once. |

### Testing strategy

The project has no automated test harness (per Spec 1 + Spec 2 plans). Each phase ends with a manual smoke checklist before push:

**3A smoke:**
- As a client, finish a workout. Verify trainer push body contains a "·"-separated AI line under the factual line.
- Disable AI via `AI_GATEWAY_ENABLED=false`. Repeat. Verify trainer push body is exactly today's factual line — no AI append, no error.
- Force AI timeout (set `AI_GATEWAY_API_KEY` to garbage). Verify same factual fallback.
- Verify `WorkoutSession.aiSummary` is populated when AI succeeds and null when AI is disabled or errors.
- Smoke 0-set FINISH (skip path), <60s FINISH (skip path), no-trainer FINISH (skip path).

**3B smoke:**
- Manually invoke the cron route locally (`curl localhost:3000/api/cron/weekly-digest` with the cron auth header).
- Verify a `WeeklyDigest` row is written for each trainer with at least one client.
- Verify the email arrives with per-client sections matching the dashboard widget.
- Verify the dashboard widget renders for the current week and shows last week's data the following Monday.
- Disable AI globally. Verify the digest still ships (with empty `aiNote` per client) and the widget renders.
- Force the cron to retry mid-loop (simulate by killing the route after one trainer). Verify the second invocation skips the already-processed trainer (idempotent).

Pure helpers (`buildDigestPayload`, `summarizeWorkout`'s data-fetcher) are written so unit tests slot in later if a harness lands. Their pure functions take all data as inputs and return a result without I/O — easy to test once a harness exists.

## Open questions

None blocking. Two known operational follow-ups:

- **Cost ceiling per trainer:** v1 has no hard cap. At Haiku pricing + current volumes (~10 workouts/trainer/week + 1 digest), monthly LLM cost per trainer is ~$0.10. Revisit if rosters scale 10× or if a trainer's clients log 100+ workouts/week.
- **Prompt versioning:** v1 inlines the system prompt. If A/B testing prompts becomes useful, extract to `src/lib/ai/prompts/` with version IDs. Not needed for ship.

## Files touched (preview, plan will enumerate)

**Created:**
- `src/lib/ai/gateway.ts`
- `src/lib/ai/workoutSummary.ts`
- `src/lib/ai/weeklyDigest.ts`
- `src/lib/digest/buildDigestPayload.ts`
- `src/lib/email/weeklyDigestTemplate.ts`
- `src/app/api/cron/weekly-digest/route.ts`
- `src/components/trainer/WeeklyDigestWidget.tsx`

**Modified:**
- `prisma/schema.prisma` — `WorkoutSession.aiSummary`; new `WeeklyDigest` model + `User.weeklyDigests` relation
- `src/app/api/workout-sessions/route.ts` — fire AI summary in parallel with existing notification dispatch (3A)
- `vercel.ts` — register the new cron under `crons` (3B)
- `src/app/trainer/(v4)/dashboard/page.tsx` — render `<WeeklyDigestWidget />` (3B)
- `.env.example` (or wherever envs are documented) — add `AI_GATEWAY_API_KEY`, `AI_GATEWAY_ENABLED`, `AI_GATEWAY_MODEL`
