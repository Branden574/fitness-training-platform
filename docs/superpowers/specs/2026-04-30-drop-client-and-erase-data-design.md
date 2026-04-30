# Drop Client + Erase Data — Design

**Date:** 2026-04-30
**Status:** DRAFT
**Owner:** Branden Vincent-Walker
**Related code:** `src/app/trainer/(v4)/clients/[id]/`, `src/app/trainer/(v4)/clients/page.tsx`, `src/lib/auth.ts`, `prisma/schema.prisma` (User, ContactSubmission), `src/lib/storage.ts` (R2)

---

## Problem

Trainers need a way to fully offboard a client when the relationship ends — both removing them from the trainer's roster and permanently erasing all of the client's data from RepLab. Today, the only option is `User.isActive = false`, which pauses login but leaves all workout history, messages, photos, and intake records in the DB indefinitely.

This is also a compliance hygiene issue: the longer per-client data sits in the DB, the larger the surface area for any future data-handling commitments (GDPR-style right-to-erasure, trainer-agreement clauses about client data lifecycle, etc.).

## Goals

- Trainers can archive a client from the Client Detail page.
- Archived clients hide from the trainer's roster and can't log in.
- A 30-day grace window allows mistakes to be reversed by the trainer.
- After 30 days, all client data is permanently deleted.
- Trainers can expedite hard-deletion via a "Delete now" action during the grace window.
- Admins can perform any of the above on any client account.
- The trainer's own intellectual property (programs, workout templates) survives the deletion.

## Non-goals

- Client-initiated self-service deletion (right-to-erasure UI). Branden + Brent handle these manually for v1.
- Pre-deletion data export ("download my workout history as ZIP"). Trainer is told in the modal to screenshot/export anything they want to retain.
- Audit log table — we use Railway log lines for the deletion record in v1.
- Multi-trainer clients (a client switching from one trainer to another while keeping their account). Out of scope; if a client switches, they apply fresh and the old account gets archived independently.
- Per-trainer admin override (no "platform admin can override per-trainer settings"). Standard role boundaries apply.

## Schema changes

Three additive nullable columns on `User`:

```prisma
model User {
  // ... existing fields ...
  // Set when the trainer/admin archives the client. Null for active accounts.
  // Hard-delete cron purges accounts where archivedAt < (now - 30d).
  archivedAt          DateTime?
  // FK to the User (TRAINER or ADMIN role) who initiated the archive.
  // Audit-only; no Prisma relation needed for v1.
  archivedByUserId    String?
  // Optional free-text reason captured at archive time.
  archivedReason      String?
}
```

No new enums. No new tables. `isActive: false` already exists and stays in place — `archivedAt` is the *destructive* flag, `isActive: false` is the *paused* flag. Two distinct concepts.

Migration: `prisma db push --skip-generate` (additive only, no `--accept-data-loss`).

## Trainer UI

### Client Detail page (`src/app/trainer/(v4)/clients/[id]/client-detail-desktop.tsx` + mobile)

A new "Danger zone" section at the bottom of the page, visually separated from the rest:

```
─────────────────────────────────────
DANGER ZONE
[Archive client →]    ← red outlined button
```

Clicking opens a modal:

```
ARCHIVE RAYMOND ALLEN

This will:
- Hide them from your roster immediately
- Block their login
- Permanently delete their account and all data in 30 days
- This is reversible during the 30-day window

Reason (optional):  [_______________]

Type RAYMOND ALLEN below to confirm:
[___________________]            [Cancel] [Archive]
```

The Archive button is enabled only when the typed name matches `clientName` (case-insensitive). Reason is optional free-text, capped at 500 chars, stored in `User.archivedReason`.

### Trainer Roster (`src/app/trainer/(v4)/clients/page.tsx`)

Add an **Archived** tab. Tabs become: `All / Active / Paused / Archived`. Filtering:

- **All:** isActive=true OR (isActive=false AND archivedAt=null) — i.e., live + paused
- **Active:** isActive=true AND archivedAt=null
- **Paused:** isActive=false AND archivedAt=null
- **Archived:** archivedAt != null

Each row in Archived shows:

```
RAY ALLEN · archived 2 days ago · purges in 28 days · "switching to another trainer"
[Restore]   [Delete now]
```

- **Restore** — clears `archivedAt` and `archivedByUserId` and `archivedReason`, sets `isActive: true`. Single confirm modal.
- **Delete now** — same name-typing modal as the archive flow but copy reads "PERMANENTLY DELETE NOW. This cannot be undone." Skips the cron window — runs the cron's per-user deletion logic synchronously.

## Client experience during the 30-day window

**Login attempts:** blocked at the credentials check in `src/lib/auth.ts`. Add an `archivedAt` check next to the existing `isActive` check, with a more specific error:

```
"This account has been archived by your trainer. It will be permanently deleted on April 30, 2026.
Contact hello@replabusa.com if this is a mistake."
```

The deletion date is computed from `archivedAt + 30 days` and rendered with the client's locale.

**Existing JWT sessions:** rejected on the next API call. The `requireTrainerSession()` and `requireClientSession()` helpers both re-check `isActive` server-side; we extend them to also reject when `archivedAt` is set. Effect: any client logged in elsewhere on a phone gets bounced to `/auth/signin` on the next interaction within ~30 seconds.

**No email notification on archive.** Two reasons: (1) the archive itself is the trainer's call — emailing guarantees drama if the trainer's just thinking about it, and (2) the 30-day window is a chance for the client to log in, see the message, and reach out if they want to come back. We *do* send a final email at hard-delete time (Section: Hard-delete cron).

**No client-side "delete my own account" flow** in v1 — separate feature.

## Hard-delete cron

**Trigger:** A new Railway Cron service runs **daily at 2:00 AM UTC** — same off-peak slot as the existing AI weekly-digest cron pattern.

**Endpoint:** `POST /api/cron/hard-delete-archived` — secured with the existing `CRON_SECRET` env var pattern (Bearer token check at the top of the route).

**Logic:**

```ts
1. const cutoff = new Date(Date.now() - 30 * 86400000)
2. Find all User rows where archivedAt != null AND archivedAt < cutoff
3. For each user (in a per-user try/catch):
   a. Send a final notification email to user.email via Resend:
      Subject: "Your RepLab account has been deleted."
      Body: short factual confirmation, no link, no marketing.
   b. Wipe R2 photos under the `users/{userId}/` prefix:
      - List objects with that prefix
      - bucket.deleteObjects on the listed keys
      - Skip if R2 fails — log and continue
   c. prisma.contactSubmission.deleteMany({ where: { email: user.email } })
      — required because trainer relation is SetNull, not Cascade
   d. prisma.user.delete({ where: { id: user.id } }) — cascades:
      WorkoutSession, WorkoutProgress, Appointment, Message,
      ClientProfile, CoachNote, ProgramAssignment, Notification,
      PushSubscription, DevicePushToken, FoodEntry, FavoriteFood,
      MealPlan, NutritionPlan, ProgressEntry, Session, Account.
   e. Log a structured line to stdout (Railway captures this).
4. Return { deletedCount, errorCount, errors: [{ userId, message }] }.
```

**Failure mode:** Each user is processed independently with try/catch. R2 failures don't block DB delete (R2 lifecycle policies could be added later as belt-and-suspenders). DB failures leave the row archived; tomorrow's run retries.

**Idempotency:** Once `prisma.user.delete` succeeds, the row is gone, so the user can't be re-processed. Email send happens *before* delete; if the email fails (Resend down), we still proceed with the delete — the deletion isn't reversible-pending-email, that creates a worse failure mode where Resend hiccups stack archived users indefinitely.

**Same logic in `Delete now`:** The "Delete now" button on the Archived tab calls a thin route `POST /api/trainers/clients/[id]/delete-now` that wraps the same per-user deletion sequence (steps 3a–3e above) for the single user. Authorization: trainer must own the client OR be ADMIN.

## Data scope + edge cases

**Trainer's coaching IP survives.** `Program.createdByUserId` and `Workout.createdByUserId` reference the trainer, not the client — those rows persist. Only `ProgramAssignment` rows linking client↔program cascade away.

**Coach notes about the client DO get deleted.** `CoachNote.clientId` has `onDelete: Cascade`. The Archive modal's body copy mentions this so trainers know to screenshot anything important first.

**Messages cascade fully (both sides).** `Message.senderId` and `Message.receiverId` both reference User with cascade. The trainer loses their copy of every message exchanged.

**Admin override.** Branden in the ADMIN role uses the exact same UI. Server-side guard for the archive route: trainers can only archive clients where `trainerId = session.user.id`; admins can archive any user. Same for "Delete now" and "Restore."

**ContactSubmission quirk.** The trainer FK on ContactSubmission is `SetNull`, not Cascade. The cron explicitly nukes by email (step 3c). The "Delete now" path uses the same explicit deletion.

**Trainer's own account never archived this way.** The Archive UI is gated to clients (`role === 'CLIENT'`). Trainer offboarding is a separate concern — out of scope for v1.

**Self-archive prevention.** A trainer cannot archive themselves through this flow even if they're somehow listed as a client of another trainer (shouldn't happen, but the role check at the route level is belt-and-suspenders).

## Tests

No test runner exists in this codebase. Verification approach per project convention:

- `npm run lint`, `npx tsc --noEmit -p .` — static gates pass.
- Manual end-to-end smoke against `npm run dev`:
  1. Trainer archives a test client. Verify roster hides them, login is blocked, archived tab lists them with countdown.
  2. Trainer restores. Verify archive flags clear, isActive returns to true, login works again.
  3. Trainer "Delete now". Verify user row gone, ContactSubmission rows by email gone, R2 prefix empty.
  4. Cron endpoint hit manually with a fake `now-32-days` archivedAt — verify the user is purged, email sent.
- Cron in prod: confirm Railway service runs nightly and the deletion log shows up in stdout.

## Migration & rollout

1. Schema migration: `prisma db push --skip-generate` against Railway. Three nullable columns. No backfill (existing accounts default to `archivedAt = null`).
2. Ship the trainer UI + auth check + Archive route + Delete-now route + Restore route in one PR / one Railway deploy.
3. Ship the cron route in the same PR. Add a 4th Railway Cron service (same pattern as the existing AI weekly-digest cron) hitting `/api/cron/hard-delete-archived` daily at 2:00 AM UTC. The cron service env requires `CRON_SECRET`.
4. No feature flag — additive UX, gated behind a destructive button that the trainer has to click intentionally.
5. Memory note + updated `MEMORY.md` after push.

## Open questions

- Should `archivedReason` be visible to admins for moderation purposes? Default: **yes** — Branden as ADMIN can see it on the Archived tab. Doesn't surface to other trainers.
- Should the email at hard-delete time include the `archivedReason`? Default: **no** — keeps the email minimal and avoids re-litigating the trainer's reason in the client's inbox.
- Should we soft-delete the `Trainer` row when a TRAINER user archives? Out of scope — feature #2 is client-only. Trainer offboarding is a separate spec.
