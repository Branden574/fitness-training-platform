# Expanded Client Intake Form — Design

**Date:** 2026-04-30
**Status:** DRAFT
**Owner:** Branden Vincent-Walker
**Related code:** `src/components/apply/ApplyForm.tsx`, `src/app/api/contact/route.ts`, `src/app/trainer/(v4)/applications/applications-client.tsx`, `prisma/schema.prisma` (ContactSubmission, User)

---

## Problem

Trainers reviewing applications in `/trainer/applications` only see a single free-text MESSAGE block. They've asked for the structured client info they need to write a real first program: height, current weight, primary goal, previous injuries, physical limitations, training experience, days/week available.

The schema already has half of the columns (`age`, `fitnessLevel`, `fitnessGoals`, `currentActivity`, `injuries`, `availability`) — but the public apply form (`ApplyForm.tsx`) doesn't surface any of them. Apply form currently captures only name, email, phone, and a single free-text "what are you trying to do" textarea.

This design closes the gap on both sides.

## Goals

- Trainer sees structured intake at-a-glance in the application detail panel.
- Apply form collects the new fields without raising friction for applicants.
- Height/weight carry over to the client's `User` profile when they accept the invite.
- Existing application rows continue rendering correctly (graceful degradation).

## Non-goals

- Metric units (imperial only for now — revisit if international trainers ask).
- Photo/body-comp uploads at intake (separate feature).
- Editing intake data post-submission (intake is a snapshot; live profile diverges from there).
- Backfilling existing rows.
- Feature flag — additive change, no flag needed.

## Field set

Final field set (option B from brainstorming):

| Field | Type | Required | Notes |
|---|---|---|---|
| Name | string | ✅ | existing |
| Email | string | ✅ | existing |
| Phone | string | optional | existing |
| Free-text goal | textarea | ✅ | existing — backs `fitnessGoals` |
| Height | inches (int) | optional | UI: `[ft] [in]`, stored as total inches |
| Current weight | lb (float) | optional | decimal allowed |
| Primary goal | enum-string | optional | LOSE_FAT, BUILD_MUSCLE, GET_STRONGER, SPORT_SPECIFIC, GENERAL_HEALTH, OTHER |
| Training experience | enum-string | optional | NONE, SOME, INTERMEDIATE, ADVANCED — backs existing `fitnessLevel` |
| Days/week available | int (1–7) | optional | new column |
| Previous injuries | textarea | optional | backs existing `injuries` |
| Physical limitations | textarea | optional | new column |

## Schema changes

`ContactSubmission` model:

```prisma
model ContactSubmission {
  // ... existing fields ...
  heightInches  Int?       // total inches (e.g. 70 = 5'10")
  weightLb      Float?     // decimal allowed
  primaryGoal   String?    // enum-style; null = "didn't say"
  limitations   String?    // physical limitations free-text
  daysPerWeek   Int?       // 1..7

  // Repurposed (already present):
  // fitnessLevel    -> training experience dropdown
  // fitnessGoals    -> free-text goal textarea (existing required)
  // injuries        -> previous injuries textarea
  // age, currentActivity, availability -> retained but unused by new form
}
```

All five new columns are nullable. Migration strategy: `prisma db push --skip-generate` against Railway prod (additive, no `--accept-data-loss` needed, no backfill).

The `primaryGoal` value is stored as a plain string with the convention listed above. Choosing string-not-enum keeps the migration trivial; if we ever want the trainer dashboard to enumerate goals strictly, we promote it to a Prisma enum then.

## Apply form UX (`ApplyForm.tsx`)

Reorganize into three labeled sections:

**Section A — Contact** (existing, unchanged): Name*, Email*, Phone

**Section B — About you** (new):
- HEIGHT — two side-by-side inputs `[ft] [in]`, both optional. Form converts to total inches before submit.
- WEIGHT — `[lb]`, optional, decimal allowed.
- TRAINING EXPERIENCE — dropdown: New to lifting / Some experience / Intermediate / Advanced.

**Section C — Goals & body** (new + existing):
- PRIMARY GOAL — dropdown: Lose fat / Build muscle / Get stronger / Sport-specific / General health / Other.
- WHAT ARE YOU TRYING TO DO?* — existing textarea, kept required.
- DAYS/WEEK YOU CAN TRAIN — dropdown: 1, 2, 3, 4, 5, 6, 7.
- PREVIOUS INJURIES — textarea, optional, placeholder "e.g. Rotator cuff strain 2024 — still avoid overhead press".
- PHYSICAL LIMITATIONS — textarea, optional, placeholder "e.g. Bad knees on stairs, mild lower back from desk job".

Section header copy under section B: *"Trainers use this to write your first program — skip anything you'd rather discuss in person."* So the applicant doesn't feel obligated to fill everything.

The existing free-text "WHAT ARE YOU TRYING TO DO?" stays as the only required goal field — the dropdown is purely structured filtering.

## API changes (`/api/contact`)

`/api/contact/route.ts` already accepts `age`, `fitnessLevel`, `fitnessGoals`, `currentActivity`, `injuries`, `availability` as optional strings. Add to the Zod schema:

```ts
heightInches: z.number().int().min(36).max(96).optional(),
weightLb: z.number().min(40).max(800).optional(),
primaryGoal: z.enum([
  'LOSE_FAT', 'BUILD_MUSCLE', 'GET_STRONGER',
  'SPORT_SPECIFIC', 'GENERAL_HEALTH', 'OTHER'
]).optional(),
trainingExperience: z.enum(['NONE', 'SOME', 'INTERMEDIATE', 'ADVANCED']).optional(),
// trainingExperience is the API/form field name; persisted into the existing
// ContactSubmission.fitnessLevel column (no new column needed for it).
limitations: z.string().max(500).optional(),
daysPerWeek: z.number().int().min(1).max(7).optional(),
```

The existing `composeMessage` helper that prepends "[Goal: …]" to the message field is kept for backward-display, but the trainer inbox will primarily render the structured fields directly — `composeMessage` becomes legacy fallback.

## Trainer inbox display (`applications-client.tsx`)

Replace the single MESSAGE block in the detail panel with:

```
ABOUT (2-col grid, collapses to 1-col under 600px)
HEIGHT      5'10"          WEIGHT       175 lb
EXPERIENCE  Intermediate    DAYS/WEEK    4

GOAL
Build muscle · "Want to put on 10 lbs of muscle by summer"

INJURIES
Right shoulder strain 2024 — still cautious overhead

LIMITATIONS
—
```

Render rules:
- Empty fields render `—`, not hidden — trainers see at a glance what the client did or did not share.
- HEIGHT formatted as `Xʹ Yʺ` (e.g. `5'10"`).
- WEIGHT formatted as `175 lb`.
- EXPERIENCE labels: NONE → "New", SOME → "Some experience", INTERMEDIATE → "Intermediate", ADVANCED → "Advanced".
- PRIMARY_GOAL labels: humanized ("Build muscle", "Lose fat", etc.).
- The free-text goal continues to render under the structured GOAL line, in quotes.
- Existing INVITED card with code + Resend invite email stays where it is (below the new ABOUT/GOAL block).

Old applications without the new fields render `—` everywhere except the existing message — no schema gymnastics.

## Profile carry-over on accept

When a client accepts the invite at `/api/auth/register`, the route already looks up the `Invitation` and `ContactSubmission` rows. Add: copy `heightInches → User.height` and `weightLb → User.weight` if those fields are null on User (don't overwrite live profile data if the user has already updated it through some other flow).

The other intake fields (`primaryGoal`, `injuries`, `limitations`, `trainingExperience`, `daysPerWeek`) stay on `ContactSubmission` as a permanent snapshot. The trainer's existing Client Detail page can later render both: live `User.height`/`weight` and the original intake snapshot read-only.

## Tests

Unit / integration:
- `/api/contact` POST accepting all new fields, persisting to ContactSubmission.
- `/api/contact` POST without any new fields, ensuring backward compat.
- Carry-over in `/api/auth/register`: User.height/weight populated from matching ContactSubmission, but only when User row's fields are null.

UI:
- `ApplyForm.tsx` — form submits with name/email/goal only (smoke).
- `ApplyForm.tsx` — form submits with all fields populated (golden path).
- Trainer applications detail panel renders all fields (with `—` for nulls).

## Migration & rollout

1. Schema change: `prisma db push --skip-generate` against Railway. Five new nullable columns on `contact_submissions`. No `--accept-data-loss`.
2. Ship form + API + trainer-inbox changes in a single PR / single Railway deploy.
3. No feature flag — additive UX, degrades gracefully on old rows.
4. Memory note + updated MEMORY.md after push.

## Open questions

- Should the trainer be able to edit the intake snapshot (e.g. to fix typos)? Default: **no** — intake is the client's testimony; if the trainer wants notes, they use the existing coach-notes feature. Revisit if requested.
- Should the client also see their intake later? Default: **no** — once registered, they live in their profile. Revisit if requested.
