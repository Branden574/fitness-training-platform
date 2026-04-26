# Workout Completion → Trainer Notification — Design

**Date:** 2026-04-26
**Status:** Spec — awaiting plan
**Roadmap position:** Spec 1 of 3 (workout-share → chat-attachments → AI features). Each successor gets its own spec.

## Problem

When a client completes a workout, the trainer has no way of knowing without checking the dashboard manually. The user surfaced this as "hitting share doesn't send to the trainer" — but the active-workout client has no Share button today; the existing button is FINISH, and FINISH does not notify anyone.

Two things are needed:
1. **Trainer is told a workout was completed** — automatic, never missed.
2. **Client can volunteer a quick message about it** — optional, one tap from the celebration screen.

## Goals

- Trainer gets a push + in-app bell notification the moment a client hits FINISH.
- Client can optionally send a chat message about the workout via a "Tell your coach" button on the celebration screen.
- Zero new schema models. No new database tables.
- Notification path uses existing `dispatchNotification` (same plumbing as chat messages).
- No regressions to existing FINISH behavior.

## Non-goals (deferred)

- Photo attachment on the "Tell your coach" prefilled message — arrives for free when the chat-attachments spec lands. Photos require chat upload plumbing that does not yet exist.
- Email to the trainer on completion. Bell + push is enough for v1; email is reserved for chat messages per existing project convention.
- A "completed today" badge on the trainer dashboard. Separate UI scope.
- A dedicated `SharedWorkoutSummary` model or shared-workout card in chat. Rejected because it duplicates work the chat-attachments spec will provide.
- Form-check video sharing or AI-summarized completions. Belong in later specs.

## Architecture

Two paths, both plug into existing infrastructure:

### Auto-notify path (server-driven)

Extends `PATCH /api/workout-sessions` with a side effect.

**Trigger:** the moment `completed` flips from `false → true` on a `WorkoutSession` whose `userId` has a non-null `trainerId`.

**Payload:**
- `userId`: the trainer's id (recipient)
- `type`: new `WORKOUT_COMPLETED` enum value on `NotificationType`
- `title`: client display name (`session.user.name`)
- `body`: `"completed {workoutTitle} • {completedSetCount} of {totalSetCount} sets • {durationMin} min"`
- `actionUrl`: `/trainer/clients/{clientId}`

**Idempotency:** the handler reads `existing.completed` and `existing.endTime` before the update. Notification only fires when:
- `existing.completed === false`, AND
- `body.completed === true`, AND
- `existing.endTime === null` (the session has never been finished before)

A double-tap of FINISH or a network retry will not produce duplicate notifications. A client toggling `completed: false` then `completed: true` again will not re-fire because `endTime` is already set.

**Failure isolation:** the call is `void dispatchNotification(...)` (fire-and-forget). The dispatcher is fail-open per the chat-message precedent in `src/app/api/messages/route.ts`. A broken push subscription, missing FCM token, or notification persistence failure is logged but never propagates to the workout-session response.

### Tell-your-coach path (client-driven)

Pure client-side — zero new server endpoints.

**Trigger:** client taps "Tell your coach" button on the celebration screen that already renders after a successful FINISH.

**Mechanism:**
1. Client builds the prefilled draft text:
   `"Just finished {workoutTitle} — {completedSetCount} of {totalSetCount} sets in {durationMin} min 💪"`
2. `router.push('/client/messages?draft=' + encodeURIComponent(draft))`
3. The messages page reads `searchParams.get('draft')` once on mount via `useEffect`, seeds the composer state, then calls `router.replace('/client/messages')` to clear the query string so the prefill doesn't re-trigger on remount or back-navigation.
4. User edits or sends as-is. The trainer receives a regular chat message — threading is identical to any other message and uses the same in-app-bell + push + email pipeline `POST /api/messages` already runs.

## Components

### New

- **`src/lib/notifications/workoutCompleted.ts`** — small pure helper. Signature:
  ```ts
  buildWorkoutCompletedNotification({
    clientName,
    workoutTitle,
    completedSetCount,
    totalSetCount,
    durationMs,
    clientId,
  }): { title: string; body: string; actionUrl: string }
  ```
  Keeps the PATCH handler readable and centralizes the copy for future tweaks. Pure function — easy to unit-test if a harness is added later.

### Modified

- **`prisma/schema.prisma`** — add `WORKOUT_COMPLETED` to `NotificationType` enum. Schema push via `prisma db push --skip-generate` per Railway deploy memory note. Additive change — no risk of data loss.
- **`src/app/api/workout-sessions/route.ts`** — extend the existing `PATCH` handler:
  - Before update: include `completed`, `endTime`, `userId` in the `findFirst` select. Also include `user: { select: { trainerId: true, name: true } }` and `workout: { select: { title: true } }`.
  - **Set counts come from the PATCH body, not a server query.** The active-workout client already knows `completedSetCount` and `totalSetCount` from its in-memory log state. Extend the PATCH request body and Zod schema to accept these two optional numeric fields, the same way `notes`, `rating`, and `caloriesBurned` are already passed. This avoids an extra `prisma.workoutProgress` query on the hot path.
  - Compute `durationMs = endTime.getTime() - startTime.getTime()`. Floor to minutes; if `< 1`, render as `"< 1"`.
  - Call `void dispatchNotification(...)` with the helper output.
- **`src/app/client/(v4)/workout/[sessionId]/active-workout-client.tsx`** — locate the existing post-FINISH celebration UI (per `// No PR — still celebrate finishing the session.` near line 318). Add a new `<Btn>` "Tell your coach" inside the celebration screen as a primary action; placement is implementation-time per the existing layout. On click, build the draft and `router.push`. Pass `workoutTitle`, `completedSetCount`, `totalSetCount`, `endTime` from existing component state. Idempotent — pressing the button twice is fine.
- **`src/app/client/(v4)/workout/[sessionId]/active-workout-desktop.tsx`** — apply the same button addition. Desktop and mobile celebration screens are siblings in this codebase per existing v4 pattern.
- **`src/app/client/(v4)/messages/messages-client.tsx`** — on mount, `useEffect` reads `searchParams.get('draft')`. If present, set the composer state to that string and `router.replace('/client/messages')` to strip the query.
- **`src/app/client/(v4)/messages/messages-desktop.tsx`** — same `?draft=` handling if the desktop messages surface has its own composer state. Verify during implementation; may share state with mobile.

## Data flow

```
Client taps FINISH
  ↓
active-workout-client.tsx → PATCH /api/workout-sessions { id, completed: true, endTime, ... }
  ↓
[handler reads existing session + user.trainerId + workout.title]
  ↓
prisma.workoutSession.update(...)
  ↓
[if existing.completed === false && body.completed === true && existing.endTime === null && trainerId]
  ↓
void dispatchNotification({
  userId: trainerId,
  type: 'WORKOUT_COMPLETED',
  ...buildWorkoutCompletedNotification(...)
})
  ↓
[fail-open: bell row written, web-push fired, native FCM fired]
  ↓
Trainer's iOS/web receives push → taps → /trainer/clients/{clientId}

────────────────────────────────────────────────

Celebration screen renders
  ↓
Client taps "Tell your coach"
  ↓
active-workout-client.tsx builds draft string
  ↓
router.push('/client/messages?draft=' + encodeURIComponent(draft))
  ↓
messages-client.tsx onMount: reads ?draft, seeds composer, router.replace clears URL
  ↓
Client edits or sends
  ↓
POST /api/messages (existing path) → trainer receives normal chat message
```

## Error handling and edge cases

| Case | Behavior |
|---|---|
| Client has no `trainerId` (free signup, awaiting assignment) | Skip notify silently. No error. |
| Trainer's web-push subscription is broken | `dispatchNotification` logs and continues. Workout-session response is unaffected. |
| Trainer has no native push token | Web-push still fires. Bell row still written. |
| Notification persistence fails (DB transient) | Logged; workout-session response succeeds. |
| FINISH double-tapped | Second PATCH sees `existing.completed === true`, skips notify. |
| Client toggles `completed: false` then `completed: true` again | Skipped because `existing.endTime` is non-null after the first finish. |
| `endTime - startTime` is negative or zero (clock skew, fast tester) | Render as `"< 1"` minute. |
| Workout title contains characters that break URL encoding | `encodeURIComponent` handles all cases. |
| Prefilled draft is very long (long workout titles) | URLs in browsers handle several thousand chars. Acceptable. |
| User navigates back from messages with prefilled draft | Composer state was already set; URL is already cleared by `router.replace`. No re-prefill. |
| Client opens `/client/messages?draft=foo` directly (URL share, manual paste) | Composer prefills with that text. Acceptable; this is the same surface the celebration button uses. |

## Testing approach

This project has no automated test harness today. Verification is manual smoke:

1. Complete a real workout end-to-end. Verify the trainer's bell badge increments and a web-push notification fires within a few seconds.
2. Tap the trainer's notification → lands on `/trainer/clients/[id]`.
3. iOS Capacitor build: same flow, verify FCM native push arrives on a backgrounded device.
4. Hit FINISH twice in rapid succession (network throttle helps): only one notification arrives.
5. From the celebration screen, tap "Tell your coach" → messages composer is seeded with the workout summary text. Edit, send. Trainer receives a normal chat message with the email + bell + push that chat already triggers. The URL `?draft=` query param is gone after the prefill.
6. Test a client with no assigned trainer: FINISH succeeds, no error in logs, no notification anywhere. (Use a test account or temporarily clear `trainerId`.)

If a test harness lands later, `buildWorkoutCompletedNotification` is a pure function and would get unit tests; the PATCH handler would get an integration test asserting the dispatch call.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Notification spam if a client retries FINISH due to flaky network | Idempotency check on `existing.completed` + `existing.endTime`. |
| Notification body becomes stale or wrong if workout title changes after completion | Title is captured at notification time. The bell row stores the body string verbatim. |
| Future schema change to `WorkoutSession` breaks the PATCH select | Notification side effect is wrapped in try/catch; the catch logs and returns the successful update. |
| `dispatchNotification` blocks the response if it ever stops being fail-open | Wrapped in `void`. Even an unhandled rejection floats up to the runtime, not the client. |

## Success criteria

- Trainer receives a bell + push notification within a few seconds of every client FINISH.
- Tapping the notification lands the trainer on the relevant client's detail page.
- The "Tell your coach" button on the celebration screen reliably opens chat with the prefilled summary, and the URL query param is cleared after one read.
- No regressions to FINISH performance or correctness — workout completion still records `completed`, `endTime`, sets, and rating identically to today.
- Build passes clean. No new ESLint or TypeScript errors.

## Out of scope for follow-up specs

- **Chat attachments spec** — will add image/PDF/video/voice support. Once shipped, the "Tell your coach" prefill can include a thumbnail or photo. No changes needed to the workout-share spec to absorb that.
- **AI features spec** — could add an AI-generated summary line to the auto-notify body, but only after the AI feature spec lands and only if the latency cost is acceptable.
