# Trainer Status (3-state) + Settings Page Rework — Design

**Date:** 2026-04-29
**Status:** Spec — awaiting plan

## Problem

Two adjacent issues on the trainer Settings page:

1. **The "accepting clients" control is a single boolean.** Today the trainer has one toggle: Accepting (on) vs. Paused (off). The off state is rendered to clients as "waitlist" in the directory and on the apply page. There is no way for a trainer to be **completely closed** while still capturing interest — and there is no clear separation between "accepting now," "accepting onto a waitlist," and "fully closed."
2. **The Settings page wastes ~50% of horizontal viewport and forces a 4-screen scroll.** Account, Sharing, QR, Trainer Code, Visibility, Status, Notification Preferences, By-Type, Quiet Hours, This Device, and Coming all stack in a single ~600px column. The right half of the desktop viewport is empty.

## Goals

- Replace the binary `trainerAcceptingClients` toggle with a 3-state status: **Accepting**, **Waitlist**, **Not Accepting**.
- Trainer changes status via a segmented control + explicit Save button (not auto-save), so a misclick does not flip their public state.
- Public-facing apply page renders the right surface for each state, including an email-only "notify me when you reopen" capture for **Not Accepting**.
- Captured notify-me emails land in the existing trainer applications inbox tagged as a new kind, and are auto-emailed when the trainer reopens.
- Reorganize the Settings page into three top-level tabs (**Account · Sharing & status · Notifications**) so each fits ~one screen and uses the full viewport on desktop.

## Non-goals (deferred)

- A dedicated "Notify list" management dashboard view. Captures land in the existing applications inbox with a `NOTIFY_WHEN_OPEN` badge; we can split this out later if volumes warrant.
- Dropping the legacy `trainerAcceptingClients` boolean column. Railway's `prisma db push` runs without `--accept-data-loss` per project deploy convention; the column stays in the schema, gets mirrored on writes, and a real migration removes it later.
- A separate notification preference for "I have new notify-me captures." Bell + email behavior follows the existing applications path.
- Per-state custom copy that the trainer authors themselves. The state-specific public copy is platform-default in v1.
- Any change to `VISIBILITY` (public-vs-private directory listing). It is a separate axis from status.
- The Billing snapshot block from the Claude-Design layout. Hidden in v1 — only renders if a real Stripe subscription is wired through. The slot exists in the layout for the day that ships.
- The Link clicks / QR scans KPIs in the Referral performance block. Hidden in v1 because click tracking does not exist; the 4-up grid degrades to 2-up (Applications + Accepted) until that lands.
- Tabbed Settings (an earlier iteration of this spec). Replaced by the dashboard layout below.

## Architecture

### Schema

Two enum changes in `prisma/schema.prisma`, both additive:

```prisma
enum TrainerClientStatus {
  ACCEPTING
  WAITLIST
  NOT_ACCEPTING
}

enum ContactSubmissionKind {
  APPLICATION       // existing default — full apply form
  NOTIFY_WHEN_OPEN  // new — email-only capture from /apply when status = NOT_ACCEPTING
}

model User {
  // existing — kept for rollback safety, no longer read after switchover
  trainerAcceptingClients Boolean             @default(true)
  // new — single source of truth
  trainerClientStatus     TrainerClientStatus @default(ACCEPTING)
}

model ContactSubmission {
  // ... existing fields ...
  kind        ContactSubmissionKind @default(APPLICATION)
  notifiedAt  DateTime?  // set when trainer reopens and we email this row's address
}
```

**Backfill (one-time, idempotent):**
```ts
await prisma.user.updateMany({
  where: { trainerAcceptingClients: false, trainerClientStatus: 'ACCEPTING' },
  data:  { trainerClientStatus: 'WAITLIST' },
});
```
This preserves today's externally-visible behavior, since `trainerAcceptingClients=false` already renders as "waitlist" in the directory and apply page.

**Write path during transition:** `PATCH /api/trainers/me` writes both `trainerClientStatus` (the new truth) and mirrors `trainerAcceptingClients = (status === 'ACCEPTING')` so any code path we miss does not regress.

### API surface

- **`PATCH /api/trainers/me`** accepts `clientStatus: 'ACCEPTING' | 'WAITLIST' | 'NOT_ACCEPTING'` (Zod enum). When the status transitions **out of** `NOT_ACCEPTING`, kick off the notify-when-open mailer (see below). The legacy `acceptingClients: boolean` shape is also accepted for one release for any in-flight clients; both fields update both columns.
- **`GET /api/trainers/me`** returns `clientStatus` (and keeps `acceptingClients` until callers are migrated).
- **`GET /api/trainers/search`** returns `clientStatus` instead of `acceptingClients`.
- **New: `POST /api/trainers/[slug]/notify-me`** — public, unauthenticated. Body: `{ email: string }`. Creates a `ContactSubmission { kind: NOTIFY_WHEN_OPEN, email, name: email, message: '(notify me when reopen)', trainerId, status: NEW }`. Idempotent: if a row already exists for `(trainerId, email, kind=NOTIFY_WHEN_OPEN, notifiedAt=null)`, return 200 without creating a duplicate. Rate-limited via the existing Upstash limiter keyed by IP.

`name` and `message` on `ContactSubmission` are required in the schema today; the route fills them with sensible defaults so we do not have to relax the schema (which would be a more disruptive migration).

### Notify-when-open mailer

Triggered inside the `PATCH /api/trainers/me` handler whenever `prevStatus === 'NOT_ACCEPTING' && nextStatus !== 'NOT_ACCEPTING'`:

1. Find all `ContactSubmission` rows where `trainerId = me`, `kind = NOTIFY_WHEN_OPEN`, `notifiedAt IS NULL`.
2. For each row, send a one-shot Resend email:
   > Subject: `<Trainer name> just reopened on RepLab`
   > Body: short copy + CTA link to `https://replabusa.com/apply/<slug>`.
3. Set `notifiedAt = now()` on the row in the same transaction so flipping status off-and-on does not re-email.

Failures are logged but do not fail the PATCH. The mailer is fire-and-forget within the request — for a single trainer the volume is small enough that we do not need a queue in v1.

### Trainer settings UI

Replace the toggle button in `src/app/trainer/(v4)/settings/sharing-panel-client.tsx` with a status section that uses an explicit save:

```
STATUS

[ Accepting ]  [ Waitlist ]  [ Not accepting ]    ← segmented control, current state highlighted

<one-line description that swaps with selection>

  Accepting     → "Your apply link shows the normal sign-up form."
  Waitlist      → "Your apply link still works, but framed as joining your waitlist."
  Not accepting → "Your apply form is hidden. Visitors can leave their email and we'll
                   ping them automatically when you flip back to Accepting or Waitlist."

[ SAVE ]   ← disabled until selection differs from saved value
            → "SAVED ✓" for 2s after success
            → "TRY AGAIN" with red border on failure
```

State diagram:
- `savedStatus` (server-known) and `pendingStatus` (local). Save button enabled iff `pendingStatus !== savedStatus`.
- After successful PATCH, `savedStatus = pendingStatus`.
- Navigation away with unsaved changes: render a 1-line warning under the Save button — no modal blocking; the user can choose to leave.

### Settings page layout — 12-col dashboard (Claude-Design handoff)

The earlier "three tabs" approach is dropped in favor of the Claude-Design layout the user handed off (bundle id `IOaMcrZhbCpKoYRoFhO7yg`, file `src/screens_trainer_settings.jsx`). The new page uses one continuous dashboard that fills horizontal space instead of stacking everything in a 720px column. Reference: `screens_trainer_settings.jsx` in the bundle. The existing `mf-*` design tokens already cover every primitive the design uses (`mf-card`, `mf-eyebrow`, `mf-input`, `mf-btn`, `Avatar`, `Sparkline`, `Chip`, `Toggle`).

```
TRAINER / SETTINGS                                    [ ✓ All changes saved ]
Settings

╭────────────────── IDENTITY STRIP ──────────────────────────────────────╮
│ ▢ BM   Brent Martinez                                                  │
│        branden574@icloud.com · MF-A4NTUS · ● ACCEPTING · PRIVATE       │
│                                  [Edit profile] [Change password] [⎋] │
╰────────────────────────────────────────────────────────────────────────╯

┌── 12-col grid (desktop ≥1024px) ─────────────────────────────────────┐
│ LEFT 8 cols                              │ RIGHT 4 cols              │
│                                          │                           │
│ SHARING                                  │ ACCOUNT                   │
│ ╭ 7/5 split inside one card ─────────╮  │ • Change password         │
│ │ link + code            │ QR + dl   │  │ • Edit public profile     │
│ │ visibility | status segs │ embed   │  │ • Manage testimonials     │
│ ╰─────────────────────────────────────╯  │ • Manage transformations  │
│                                          │ • Biometric sign-in [tog] │
│ NOTIFICATIONS                            │                           │
│ ╭ 4/8 ─ Channels │ By-type (2 cols) ──╮  │ BILLING (real Stripe data │
│ │  bell · push   │ 6 toggles          │  │  if available, else hide) │
│ ╰─────────────────────────────────────╯  │                           │
│ ╭ 7/5 ─ Quiet hours │ This device ────╮  │ REFERRAL PERFORMANCE      │
│ │ start/end inputs  │ active chip + Btn│ │ (real metrics only — see  │
│ ╰─────────────────────────────────────╯  │  "Right-column data"      │
│                                          │  below)                   │
│                                          │                           │
│                                          │ COMING IN PHASE 2         │
│                                          │ (dashed card)             │
└──────────────────────────────────────────┴───────────────────────────┘

Below 1024px the grid collapses to a single column. Identity strip stacks
its action buttons under the name.
```

The page container uses `maxWidth: 1320`. Non-tabbed: every block is visible on one page; the layout's job is to make the page short by going wide rather than tall.

**Status control inside SHARING:** uses the design's segmented-control treatment (orange pill background on the active segment) but with **three** segments (Accepting / Waitlist / Not accepting) instead of the design's two. The Save button from the earlier section still applies — only the *Status* segmented control is dirty-state + Save; everything else on the page is auto-save and the header shows "All changes saved" the moment any pending status save completes (or when there's nothing pending). Concretely: while a status edit is unsaved the header pill changes to "Unsaved changes" with the explicit Save button visible inside the Sharing card; otherwise the header reads "All changes saved."

**Right-column data — what ships and what doesn't:**

| Block | Ships v1? | Source |
| --- | --- | --- |
| Account list (Change password / Edit profile / Testimonials / Transformations / Biometric) | yes | existing routes; same destinations as today's Settings list |
| Billing snapshot (PRO · $39/MO · seats / storage / card) | **no — hidden in v1**; render only if a real Stripe subscription is wired through. The design includes it as future shape, not required content. | — |
| Referral performance (Link clicks · QR scans · Applications · Accepted + sparkline) | partial — Applications + Accepted ship from `ContactSubmission` counts; Link clicks and QR scans require click tracking that does not exist and are hidden in v1. The 4-up grid renders 2-up when the click-tracked metrics are absent. | `prisma.contactSubmission.groupBy` |
| Coming in Phase 2 (dashed card with bullets) | yes — visual only, no data | static |

This deliberately ships the layout the user signed off on without inventing fake KPIs or fake billing data. When the click-tracking and Stripe-billing systems exist later, those blocks light up in place.

**Sharing card 7/5 split:**
- Left 7/12 (`col-span-7`): Personal link with copy button → blurb · Trainer code with copy button → blurb · `border-t hairline` divider · 2-col bottom row: VISIBILITY segmented (Private/Public, auto-save) | STATUS 3-segment segmented (Accepting/Waitlist/Not accepting, dirty-state + Save).
- Right 5/12 (`col-span-5`): QR placeholder image · vertical button stack (Download PNG, Download SVG, Embed) · footer blurb.

**Notification block** mirrors the design exactly: a 4/8 grid (Channels card | By-type card with two columns of three toggles each), then a 7/5 grid below (Quiet hours card | This device card). Identical content + behavior to today; only the layout changes.

### Public-facing surfaces — 3-state handling

**`/apply/[trainerSlug]/page.tsx`:**
- `ACCEPTING` → existing form, no banner.
- `WAITLIST` → existing form + the existing "waitlist" banner. (No behavior change vs. today's `false`.)
- `NOT_ACCEPTING` → hide the apply form. Render:
  > "[Trainer name] isn't taking new clients right now."
  > "Drop your email and I'll let you know when I reopen."
  > [ email input ] [ Notify me ]
  >
  > After submit: "Got it — we'll email you the moment <Trainer> reopens."

  The submit posts to `POST /api/trainers/[slug]/notify-me`.

**`/trainers/trainer-card.tsx`:** Extend `StatusPill`'s `kind` prop from `'accepting' | 'waitlist'` to `'accepting' | 'waitlist' | 'not_accepting'`. The new variant uses the dimmest pill style and copy "Not accepting."

**`/apply/apply-generic-client.tsx`:** Replace the conditional `r.acceptingClients && '● accepting'` row pill with switch on `r.clientStatus`:
- `ACCEPTING`   → `● accepting`
- `WAITLIST`    → `· waitlist`
- `NOT_ACCEPTING` → `· closed`

**`/t/[trainerSlug]/page.tsx`:** Pass `clientStatus` through to the public profile renderer; the renderer surfaces a small pill matching the trainer card.

**Directory inclusion:** `NOT_ACCEPTING` trainers stay listed in the directory (with the new pill). Reasoning: they still benefit from notify-list growth while closed.

### Component file map

New / modified:
- `prisma/schema.prisma` — enums + new fields.
- `src/lib/trainerStatus.ts` — `type TrainerClientStatus`, label/copy maps, `statusFromBoolean()` shim.
- `src/app/api/trainers/me/route.ts` — Zod accepts `clientStatus`, mirrors writes, triggers mailer on transition.
- `src/app/api/trainers/[slug]/notify-me/route.ts` — new public endpoint.
- `src/lib/email/notifyWhenOpen.ts` — new mailer, used by the PATCH handler.
- `src/app/trainer/(v4)/settings/page.tsx` — new dashboard shell: identity strip + 12-col grid (no tabs).
- `src/app/trainer/(v4)/settings/identity-strip.tsx` — server-rendered top strip (avatar + name + email/code/status/visibility chips + action buttons).
- `src/app/trainer/(v4)/settings/sharing-panel-client.tsx` — rebuilt as the 7/5 SHARING card (link/code/visibility/status segmented on the left, QR + downloads on the right). Status uses 3-segment + Save button; visibility stays 2-segment auto-save.
- `src/app/trainer/(v4)/settings/notifications-grid.tsx` — wraps existing `<NotificationPreferences />` content in the 4/8 + 7/5 grid layout; refactor `NotificationPreferences` only if needed to expose the four sub-sections (Channels, By-type, Quiet hours, This device) as composable parts.
- `src/app/trainer/(v4)/settings/account-list.tsx` — right-column ACCOUNT card with Change password / Edit public profile / Manage testimonials / Manage transformations / Biometric toggle. Biometric row renders as `<div>` (not `<button>`) when it has the inline toggle, to avoid a nested-button DOM warning.
- `src/app/trainer/(v4)/settings/referral-performance.tsx` — right-column KPI card; uses `groupBy` to count Applications + Accepted from `ContactSubmission`; sparkline of last 12 weeks (or hides on insufficient data).
- `src/app/trainer/(v4)/settings/coming-soon-card.tsx` — right-column dashed bullet list.
- `src/app/apply/[trainerSlug]/page.tsx` — render NOT_ACCEPTING email-capture branch.
- `src/app/apply/[trainerSlug]/notify-me-form.tsx` — new client component.
- `src/app/apply/apply-generic-client.tsx` — 3-state pill.
- `src/app/trainers/trainer-card.tsx` — `StatusPill` adds `not_accepting` variant.
- `src/app/trainers/page.tsx`, `src/app/api/trainers/search/route.ts` — return `clientStatus`.
- `src/app/t/[trainerSlug]/page.tsx` — pass `clientStatus` through.

## Testing

- **Unit:** `statusFromBoolean()` mapping, mailer happy-path + idempotency (`notifiedAt` set), Zod schema accepts both old and new shapes during transition.
- **Integration (manual / browser):**
  - Trainer flips Accepting → Waitlist → Not Accepting → Accepting; apply page reflects each state; notify-me submissions arrive in inbox; reopening sends the captured email exactly once.
  - Save button disables/enables correctly with dirty state.
  - Identity strip header pill flips between "All changes saved" and "Unsaved changes" tracking the Status save lifecycle.
  - At ≥1024px the page renders as a single 12-col dashboard with no internal scroll on a 1080p monitor; below 1024px the grid collapses to one column.
- **No regression:** existing trainers with `trainerAcceptingClients=true` still render as Accepting; existing trainers with `false` still render as Waitlist (via backfill).

## Rollout

1. Schema additions + backfill ship together (no `--accept-data-loss` needed; only adds columns and updates rows).
2. API + UI ship together so the new control writes the new field on day one.
3. Legacy boolean stays mirrored for one release, then a follow-up migration removes it.

## Open questions

None — defaults committed:
- Mailer is in-process fire-and-forget (no queue in v1).
- `NOT_ACCEPTING` trainers stay in the directory with the new pill.
- Per-state copy is platform-default; trainer-authored copy is out of scope.
