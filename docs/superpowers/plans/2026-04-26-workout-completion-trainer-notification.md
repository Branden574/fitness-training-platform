# Workout Completion → Trainer Notification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a client hits FINISH, the assigned trainer gets a push + bell notification. The client also gets an in-place completion panel with a "Tell your coach" button that deeplinks to `/client/messages` with a prefilled draft.

**Architecture:** Reuse existing `dispatchNotification` plumbing for the auto-notify side effect on `PATCH /api/workout-sessions`. Add a new in-place completion panel inside the active-workout client; the panel's "Tell your coach" button deeplinks via `?draft=` query param, which the messages page reads once and clears. Zero new endpoints, one new enum value (`WORKOUT_COMPLETED`), one new pure helper.

**Tech Stack:** Next.js 16 App Router, Prisma, Zod, React, Tailwind, existing `dispatchNotification` (web-push + FCM + bell), existing `mf` design primitives (`Btn`).

**Note on testing:** This project has no automated test harness today. Each task ends with manual verification steps and a commit. The pure helper introduced in Task 2 is structured so unit tests slot in later if/when a harness lands.

---

## File Structure

**Created:**

- `src/lib/notifications/workoutCompleted.ts` — pure helper that builds the `dispatchNotification` payload from session data.

**Modified:**

- `prisma/schema.prisma` — adds `WORKOUT_COMPLETED` to `NotificationType` enum.
- `src/app/api/workout-sessions/route.ts` — extends Zod schema and `PATCH` handler with the notification side effect.
- `src/app/client/(v4)/workout/[sessionId]/active-workout-client.tsx` — extends PATCH body and adds the completion panel.
- `src/app/client/(v4)/workout/[sessionId]/active-workout-desktop.tsx` — same as above for desktop.
- `src/app/client/(v4)/messages/messages-client.tsx` — reads `?draft=` and seeds composer.
- `src/app/client/(v4)/messages/messages-desktop.tsx` — reads `?draft=` and seeds composer.

---

## Task 1: Add `WORKOUT_COMPLETED` to NotificationType enum

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Open `prisma/schema.prisma` and locate the `enum NotificationType` block.**

The current values, in order:

```prisma
enum NotificationType {
  WORKOUT_ASSIGNED
  WORKOUT_UPDATED
  PR_LOGGED
  PROGRAM_ASSIGNED
  PROGRAM_COMPLETED
  MEAL_PLAN_ASSIGNED
  MEAL_PLAN_ENDED
  MESSAGE_RECEIVED
  TRAINER_FEEDBACK
  PROGRESS_REMINDER
  ...
}
```

- [ ] **Step 2: Add `WORKOUT_COMPLETED` after `WORKOUT_UPDATED`.**

The block becomes:

```prisma
enum NotificationType {
  WORKOUT_ASSIGNED
  WORKOUT_UPDATED
  WORKOUT_COMPLETED
  PR_LOGGED
  PROGRAM_ASSIGNED
  ...
}
```

- [ ] **Step 3: Push the schema change.**

Run: `npx prisma db push --skip-generate`
Expected: "🚀 Your database is now in sync with your Prisma schema." No `--accept-data-loss` is needed because this is purely additive.

- [ ] **Step 4: Regenerate the Prisma client locally.**

Run: `npx prisma generate`
Expected: "✔ Generated Prisma Client" output.

- [ ] **Step 5: Verify TypeScript sees the new value.**

Run: `npx tsc --noEmit` (or `npm run build` if tsc isn't wired)
Expected: clean — no errors.

- [ ] **Step 6: Commit.**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add WORKOUT_COMPLETED to NotificationType enum"
```

---

## Task 2: Create `buildWorkoutCompletedNotification` helper

**Files:**

- Create: `src/lib/notifications/workoutCompleted.ts`

- [ ] **Step 1: Create the file with the helper.**

```ts
// src/lib/notifications/workoutCompleted.ts
//
// Pure builder for the WORKOUT_COMPLETED notification payload. Kept separate
// from the route handler so the copy can be tweaked in one place and so a
// unit test can be added later without touching the API surface.

export interface WorkoutCompletedInput {
  clientName: string | null;
  workoutTitle: string | null;
  completedSetCount: number;
  totalSetCount: number;
  durationMs: number;
  clientId: string;
}

export interface WorkoutCompletedPayload {
  title: string;
  body: string;
  actionUrl: string;
}

export function buildWorkoutCompletedNotification(
  input: WorkoutCompletedInput,
): WorkoutCompletedPayload {
  const name = input.clientName?.trim() || 'A client';
  const workout = input.workoutTitle?.trim() || 'a workout';
  const minutes = Math.floor(input.durationMs / 60000);
  const durationLabel = minutes < 1 ? '< 1' : String(minutes);

  return {
    title: name,
    body: `completed ${workout} • ${input.completedSetCount} of ${input.totalSetCount} sets • ${durationLabel} min`,
    actionUrl: `/trainer/clients/${input.clientId}`,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Sanity-check the helper output by reading through the function once.**

Trace the inputs `{ clientName: 'Sarah', workoutTitle: 'Push Day A', completedSetCount: 8, totalSetCount: 8, durationMs: 42 * 60 * 1000, clientId: 'abc' }` mentally and confirm the output is:

```js
{
  title: 'Sarah',
  body: 'completed Push Day A • 8 of 8 sets • 42 min',
  actionUrl: '/trainer/clients/abc',
}
```

- [ ] **Step 4: Commit.**

```bash
git add src/lib/notifications/workoutCompleted.ts
git commit -m "feat(notifications): add buildWorkoutCompletedNotification helper"
```

---

## Task 3: Extend `PATCH /api/workout-sessions` with the notification side effect

**Files:**

- Modify: `src/app/api/workout-sessions/route.ts`

- [ ] **Step 1: Open the PATCH handler.**

The relevant block currently looks like this:

```ts
export async function PATCH(request: NextRequest) {
  // ...auth check...
  const body = await request.json();
  const { id, completed, endTime, notes, rating, caloriesBurned } = body as {
    id?: string;
    completed?: boolean;
    endTime?: string | Date;
    notes?: string | null;
    rating?: number | null;
    caloriesBurned?: number | null;
  };

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const existing = await prisma.workoutSession.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const updated = await prisma.workoutSession.update({
    where: { id },
    data: {
      ...(completed !== undefined ? { completed } : {}),
      ...(endTime !== undefined ? { endTime: endTime ? new Date(endTime) : null } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(rating !== undefined ? { rating } : {}),
      ...(caloriesBurned !== undefined ? { caloriesBurned } : {}),
    },
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 2: Add new imports at the top of the file (if not already present).**

```ts
import { dispatchNotification } from '@/lib/notifications/dispatch';
import { buildWorkoutCompletedNotification } from '@/lib/notifications/workoutCompleted';
```

- [ ] **Step 3: Extend the body destructure to include `completedSetCount` and `totalSetCount`.**

Replace the destructure with:

```ts
const {
  id,
  completed,
  endTime,
  notes,
  rating,
  caloriesBurned,
  completedSetCount,
  totalSetCount,
} = body as {
  id?: string;
  completed?: boolean;
  endTime?: string | Date;
  notes?: string | null;
  rating?: number | null;
  caloriesBurned?: number | null;
  completedSetCount?: number;
  totalSetCount?: number;
};
```

- [ ] **Step 4: Expand the existing-session lookup to fetch the data the notification needs.**

Replace the `findFirst` call with:

```ts
const existing = await prisma.workoutSession.findFirst({
  where: { id, userId: session.user.id },
  select: {
    id: true,
    completed: true,
    endTime: true,
    startTime: true,
    user: { select: { id: true, name: true, trainerId: true } },
    workout: { select: { title: true } },
  },
});
if (!existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
```

- [ ] **Step 5: After the update, add the notification side effect.**

Add this block immediately after `const updated = await prisma.workoutSession.update(...)` and before `return NextResponse.json(updated);`:

```ts
// Auto-notify the trainer the first time a session transitions to completed.
// Idempotent: existing.completed===false AND existing.endTime===null guarantees
// we only fire on the first transition. Network retries or a double-tap of
// FINISH won't re-fire, and a client toggling completed back-and-forth won't
// either because endTime stays set after the first finish.
const trainerId = existing.user?.trainerId ?? null;
const justCompleted =
  existing.completed === false &&
  completed === true &&
  existing.endTime === null;

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

  // Fire-and-forget: dispatchNotification is already fail-open. A broken
  // push subscription must not block the workout-session response.
  void dispatchNotification({
    userId: trainerId,
    type: 'WORKOUT_COMPLETED',
    title: payload.title,
    body: payload.body,
    actionUrl: payload.actionUrl,
    metadata: { sessionId: id, workoutId: updated.workoutId },
  });
}
```

- [ ] **Step 6: Verify TypeScript compiles.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Run the full build to make sure nothing else regressed.**

Run: `npm run build`
Expected: build succeeds, all routes still listed.

- [ ] **Step 8: Commit.**

```bash
git add src/app/api/workout-sessions/route.ts
git commit -m "feat(workout-sessions): notify trainer on first completion transition"
```

---

## Task 4: Add completion panel + extended PATCH body to mobile active-workout client

**Files:**

- Modify: `src/app/client/(v4)/workout/[sessionId]/active-workout-client.tsx`

- [ ] **Step 1: Read the file and locate two spots:**
  1. The PATCH call site (search for `'/api/workout-sessions'` — around line 288).
  2. The post-FINISH branch (search for `// No PR — still celebrate finishing the session.` — around line 318).

Hold these in mind. Step 2 modifies the PATCH body; step 4 replaces the post-FINISH branch.

- [ ] **Step 2: Extend the PATCH body with `completedSetCount` and `totalSetCount`.**

The current call:

```ts
const patch = await fetch('/api/workout-sessions', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: initial.id,
    completed: true,
    endTime: new Date().toISOString(),
  }),
});
```

becomes:

```ts
const completedSetCount = Object.values(logsByExercise).flat().filter((s) => s.done).length;
const totalSetCount = Object.values(logsByExercise).flat().length;

const patch = await fetch('/api/workout-sessions', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: initial.id,
    completed: true,
    endTime: new Date().toISOString(),
    completedSetCount,
    totalSetCount,
  }),
});
```

`logsByExercise` is the existing in-memory state already used elsewhere in the file (e.g., line 252).

- [ ] **Step 3: Add a new `phase` state at the top of the component, near the other `useState` declarations.**

Find the existing `const [finishing, setFinishing] = useState(false);` line (around line 115). Just below it, add:

```ts
const [completedSummary, setCompletedSummary] = useState<{
  workoutTitle: string;
  completedSetCount: number;
  totalSetCount: number;
  durationMs: number;
} | null>(null);
```

- [ ] **Step 4: Replace the post-FINISH non-PR branch.**

Locate this block (around line 318):

```ts
} else {
  // No PR — still celebrate finishing the session.
  celebrate('workout');
  setTimeout(() => router.push('/client'), 2200);
}
```

Replace it with:

```ts
} else {
  // No PR — still celebrate, but instead of auto-redirecting, surface an
  // in-place completion panel so the client can choose to ping their coach.
  // The panel renders below the rest of the workout UI when completedSummary
  // is non-null. Auto-redirect is removed; the panel's "Done" button covers
  // the navigation case.
  celebrate('workout');
  setCompletedSummary({
    workoutTitle: initial.workout?.title ?? 'your workout',
    completedSetCount,
    totalSetCount,
    durationMs: Date.now() - new Date(initial.startTime).getTime(),
  });
}
```

(`completedSetCount` and `totalSetCount` are already in scope from step 2.)

- [ ] **Step 5: Render the completion panel.**

Find the JSX return statement and locate the outer wrapper `<div>` or fragment. Inside, near the top of the rendered output (so the panel appears when active), add:

```tsx
{completedSummary && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--mf-surface-0)',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}
  >
    <div
      className="mf-card"
      style={{
        maxWidth: 420,
        width: '100%',
        padding: 24,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 700 }}>Workout complete</div>
      <div style={{ color: 'var(--mf-fg-mute)' }}>
        {completedSummary.completedSetCount} of {completedSummary.totalSetCount} sets •{' '}
        {Math.max(1, Math.floor(completedSummary.durationMs / 60000))} min
      </div>
      <Btn
        variant="primary"
        onClick={() => {
          const minutes = Math.max(1, Math.floor(completedSummary.durationMs / 60000));
          const draft = `Just finished ${completedSummary.workoutTitle} — ${completedSummary.completedSetCount} of ${completedSummary.totalSetCount} sets in ${minutes} min 💪`;
          router.push(`/client/messages?draft=${encodeURIComponent(draft)}`);
        }}
      >
        Tell your coach
      </Btn>
      <Btn variant="ghost" onClick={() => router.push('/client')}>
        Done
      </Btn>
    </div>
  </div>
)}
```

If `Btn` is not already imported in this file, add it to the existing `@/components/ui/mf` import.

- [ ] **Step 6: Verify TypeScript compiles.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Run the full build.**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit.**

```bash
git add "src/app/client/(v4)/workout/[sessionId]/active-workout-client.tsx"
git commit -m "feat(workout): completion panel with Tell-your-coach deeplink (mobile)"
```

---

## Task 5: Mirror Task 4 in the desktop active-workout client

**Files:**

- Modify: `src/app/client/(v4)/workout/[sessionId]/active-workout-desktop.tsx`

- [ ] **Step 1: Open the desktop file and find the PATCH call site and post-FINISH branch.**

The structure mirrors mobile. Search for `'/api/workout-sessions'` and `celebrate(`.

- [ ] **Step 2: Apply the same three changes from Task 4.**

  1. Extend the PATCH body with `completedSetCount` and `totalSetCount` derived from the local `logsByExercise` (or the desktop file's equivalent state name — read first, mirror).
  2. Add the `completedSummary` state and the corresponding `setCompletedSummary({ ... })` call replacing the auto-redirect in the non-PR branch.
  3. Render the same completion panel JSX. The panel uses fixed positioning, so the same JSX works for desktop. If desktop has a wider design system, increasing `maxWidth` to e.g. `520` is fine but optional.

- [ ] **Step 3: Verify TypeScript compiles.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Run the full build.**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit.**

```bash
git add "src/app/client/(v4)/workout/[sessionId]/active-workout-desktop.tsx"
git commit -m "feat(workout): completion panel with Tell-your-coach deeplink (desktop)"
```

---

## Task 6: Read `?draft=` in mobile messages client

**Files:**

- Modify: `src/app/client/(v4)/messages/messages-client.tsx`

- [ ] **Step 1: Add the imports if not already present.**

At the top of the file, the existing imports include `useState`, `useRef`, `useEffect`, `useCallback` from React. Add `useSearchParams` and `useRouter` from `next/navigation`:

```ts
import { useRouter, useSearchParams } from 'next/navigation';
```

- [ ] **Step 2: Inside the component body, after the existing `useState` declarations, get the router and search params.**

```ts
const router = useRouter();
const searchParams = useSearchParams();
```

- [ ] **Step 3: Add a `useEffect` that reads `?draft=` once on mount.**

Place it near the other effects in the component:

```ts
// One-shot prefill: the workout completion panel and other deeplinks can
// open this page with ?draft=<text>. We seed the composer with that text
// and then clear the query string so it doesn't re-prefill on remount.
const prefillRanRef = useRef(false);
useEffect(() => {
  if (prefillRanRef.current) return;
  prefillRanRef.current = true;
  const value = searchParams?.get('draft');
  if (value) {
    setDraft(value);
    router.replace('/client/messages');
  }
}, [searchParams, router]);
```

If `useRef` isn't already imported, it is — the file imports it on line 3.

- [ ] **Step 4: Verify TypeScript compiles.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Run the full build.**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit.**

```bash
git add "src/app/client/(v4)/messages/messages-client.tsx"
git commit -m "feat(messages): seed composer from ?draft= query param (mobile)"
```

---

## Task 7: Read `?draft=` in desktop messages client

**Files:**

- Modify: `src/app/client/(v4)/messages/messages-desktop.tsx`

- [ ] **Step 1: Apply the same three additions as Task 6.**

  1. Add `useRouter` and `useSearchParams` to the `next/navigation` imports.
  2. Get `router` and `searchParams` inside the component body.
  3. Add the same `useEffect` with `prefillRanRef` guard, calling `setDraft(value)` and `router.replace('/client/messages')`.

The setter is named `setDraft` in this file too (verified during spec discovery).

- [ ] **Step 2: Verify TypeScript compiles.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Run the full build.**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/client/(v4)/messages/messages-desktop.tsx"
git commit -m "feat(messages): seed composer from ?draft= query param (desktop)"
```

---

## Task 8: Manual smoke test + push

**Files:** none modified — this task validates the work.

- [ ] **Step 1: Confirm no dev server is running.**

Run: `pgrep -af "next dev"`
Expected: empty.

- [ ] **Step 2: Start the dev server.**

Run: `npm run dev`
Expected: starts on port 3000.

- [ ] **Step 3: As a client account with an assigned trainer, finish a workout end-to-end.**

  1. Sign in as a test client. Navigate to an active workout.
  2. Complete one or two sets, then hit FINISH.
  3. Verify: the celebrate burst still fires, the auto-redirect to `/client` is gone, and the completion panel appears with stat line and two buttons.

- [ ] **Step 4: Verify the trainer's bell + push.**

In a separate browser session signed in as the assigned trainer:

  1. Verify the bell badge increments within a few seconds.
  2. If the trainer has web-push enabled, verify a push notification fires.
  3. Tap the bell entry / push notification. Verify it lands on `/trainer/clients/{clientId}`.

- [ ] **Step 5: Verify the "Tell your coach" deeplink.**

  1. From the completion panel, tap "Tell your coach".
  2. Verify `/client/messages` opens with the composer prefilled (e.g., `Just finished Push Day A — 4 of 8 sets in 12 min 💪`).
  3. Verify the URL no longer contains `?draft=...` (it should be just `/client/messages`).
  4. Edit the text or send as-is. Verify the trainer receives a chat message normally.

- [ ] **Step 6: Verify idempotency.**

  1. From the workout list, navigate back into the same just-completed session (if the UI permits) or have the client re-PATCH `completed: true` via a manual API call.
  2. Verify no second notification fires for the trainer (the bell does not double-increment, no second push).

- [ ] **Step 7: Verify the no-trainer case.**

  1. Use a client account whose `trainerId` is null (or temporarily clear it via DB).
  2. Finish a workout. Verify FINISH still succeeds, the completion panel still appears, and no errors are logged.

- [ ] **Step 8: Stop the dev server and push.**

Run: `git push`
Expected: pushes commits from Tasks 1–7 to main. Railway picks up the deploy automatically.

- [ ] **Step 9: Update memory.**

Per project convention "Update memory on every push", add a memory entry summarizing what shipped:

Create `~/.claude/projects/.../memory/project_workout_share_shipped.md` with a brief description of the feature, the commits, and any open follow-ups (e.g., photo support arrives with the chat-attachments spec).

Add a one-line entry to `MEMORY.md` pointing at the new file.

---

## Out of scope reminders

The following were explicitly deferred per the spec and must NOT be added in this plan:

- Photo attachment to the prefilled message — comes free with the chat-attachments spec (Spec 2).
- Email to the trainer on completion — bell + push only for v1.
- "Completed today" badge on the trainer dashboard — separate UI work.
- A dedicated `SharedWorkoutSummary` model — rejected during brainstorming.
- Form-check video sharing or AI summary — belong in later specs.
