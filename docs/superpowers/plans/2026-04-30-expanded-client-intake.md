# Expanded Client Intake Form — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the public apply form (`ApplyForm.tsx`) to capture height, current weight, training experience, days/week available, primary goal (dropdown), previous injuries, and physical limitations — and surface them as a structured grid in the trainer applications inbox detail panel. Carry height/weight forward to `User` on invite acceptance.

**Architecture:** Five new nullable columns on `ContactSubmission` (the rest of the new fields reuse existing columns: `fitnessLevel`, `fitnessGoals`, `injuries`). The contact API extends its Zod schema and persists the new fields. The apply form is reorganized into three sections (Contact / About you / Goals & body); the trainer inbox detail panel replaces its single MESSAGE block with a labeled ABOUT/GOAL/INJURIES/LIMITATIONS layout. The register route copies `heightInches`/`weightLb` into `User.height`/`User.weight` when those are null on the user. All changes are additive — old applications render `—` for missing fields.

**Tech Stack:** Next.js 16 App Router · Prisma 6 · Zod · Tailwind 4 · existing `mf-*` design system primitives.

**Spec:** [docs/superpowers/specs/2026-04-30-expanded-client-intake-design.md](../specs/2026-04-30-expanded-client-intake-design.md)

**Project conventions to honor:**

- Railway deploys main via `prisma db push --skip-generate` (no migrations, no `--accept-data-loss`). Schema changes must be additive only.
- Build-critical packages must live in `dependencies`, not `devDependencies`. We don't add either here.
- Never run `npm run build` while `npm run dev` is active (Turbopack cache collision).
- This codebase has no test runner. Verification is `npm run lint`, `npx tsc --noEmit -p .`, and manual browser smoke at `http://localhost:3000` against `npm run dev`.
- Custom CSS classes (`mf-input`, `mf-btn`, `mf-card`) must come from existing primitives — don't invent new ones.
- Never echo any portion of secret values when describing env vars to the user.

---

## File Structure

**New files:**

- `src/lib/intake.ts` — formatters and label maps (`formatHeightInches`, `formatWeightLb`, `humanizePrimaryGoal`, `humanizeTrainingExperience`).

**Modified files:**

- `prisma/schema.prisma` — add 5 nullable columns to `ContactSubmission`.
- `src/app/api/contact/route.ts` — extend Zod schema, persist new fields, keep `composeMessage` as legacy fallback.
- `src/components/apply/ApplyForm.tsx` — reorganize into three sections, add new fields, ft+in→inches conversion before submit.
- `src/app/trainer/(v4)/applications/applications-client.tsx` — replace the MESSAGE block in the detail panel with structured ABOUT/GOAL/INJURIES/LIMITATIONS layout.
- `src/app/trainer/(v4)/applications/page.tsx` — extend the server-side `select` clause so the new columns reach the client component.
- `src/app/api/auth/register/route.ts` — copy `heightInches`/`weightLb` from matching `ContactSubmission` to `User.height`/`User.weight` when null on the user.

---

## Task 1: Schema additions

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the new columns to `ContactSubmission`**

In `model ContactSubmission` (around line 711), immediately after the existing `availability` field, add:

```prisma
  // ---- Expanded intake (2026-04-30) ----
  // Total inches (e.g. 70 = 5'10"). Form converts ft+in to total before POST.
  heightInches    Int?
  // Pounds, decimals allowed.
  weightLb        Float?
  // Plain string convention: LOSE_FAT | BUILD_MUSCLE | GET_STRONGER |
  // SPORT_SPECIFIC | GENERAL_HEALTH | OTHER. Promote to enum later if needed.
  primaryGoal     String?
  // Free-text physical limitations (separate from `injuries`).
  limitations     String?
  // 1..7 — soft validation in API + form, no Prisma constraint.
  daysPerWeek     Int?
```

- [ ] **Step 2: Push the schema to the local Postgres**

Run: `npx prisma db push --skip-generate`
Expected: "The database is now in sync with your Prisma schema." Any output mentioning data loss → STOP and re-read the column additions.

- [ ] **Step 3: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: clean exit (no errors). The new columns are not yet referenced anywhere, so this is a sanity check that nothing else broke.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add expanded intake columns to ContactSubmission"
```

---

## Task 2: Intake formatters and label maps

**Files:**

- Create: `src/lib/intake.ts`

- [ ] **Step 1: Write the formatters file**

Create `src/lib/intake.ts` with:

```ts
// src/lib/intake.ts
// Formatters and label maps for ContactSubmission's expanded intake fields.
// Used by the trainer applications inbox + future client-detail surfaces.

export type PrimaryGoal =
  | 'LOSE_FAT'
  | 'BUILD_MUSCLE'
  | 'GET_STRONGER'
  | 'SPORT_SPECIFIC'
  | 'GENERAL_HEALTH'
  | 'OTHER';

export type TrainingExperience = 'NONE' | 'SOME' | 'INTERMEDIATE' | 'ADVANCED';

export const PRIMARY_GOAL_LABEL: Record<PrimaryGoal, string> = {
  LOSE_FAT: 'Lose fat',
  BUILD_MUSCLE: 'Build muscle',
  GET_STRONGER: 'Get stronger',
  SPORT_SPECIFIC: 'Sport-specific',
  GENERAL_HEALTH: 'General health',
  OTHER: 'Other',
};

export const TRAINING_EXPERIENCE_LABEL: Record<TrainingExperience, string> = {
  NONE: 'New to lifting',
  SOME: 'Some experience',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export function humanizePrimaryGoal(value: string | null | undefined): string {
  if (!value) return '—';
  return PRIMARY_GOAL_LABEL[value as PrimaryGoal] ?? value;
}

export function humanizeTrainingExperience(
  value: string | null | undefined,
): string {
  if (!value) return '—';
  return TRAINING_EXPERIENCE_LABEL[value as TrainingExperience] ?? value;
}

/** Format total inches as `Xʹ Yʺ` using straight quotes for monospace look. */
export function formatHeightInches(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const ft = Math.floor(value / 12);
  const inch = value - ft * 12;
  return `${ft}'${inch}"`;
}

/** Format pounds with up to one decimal place, trimming trailing `.0`. */
export function formatWeightLb(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} lb`;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: clean.

- [ ] **Step 3: Lint**

Run: `npm run lint -- src/lib/intake.ts`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/intake.ts
git commit -m "feat(intake): formatters + label maps for expanded intake fields"
```

---

## Task 3: Extend `/api/contact` Zod schema and persistence

**Files:**

- Modify: `src/app/api/contact/route.ts`

- [ ] **Step 1: Extend the Zod schema**

In `src/app/api/contact/route.ts`, locate the Zod schema (around lines 30–37 — the block with `age: z.string().optional()`). Add after the existing optional fields (keeping the existing ones intact):

```ts
  // ---- Expanded intake (2026-04-30) ----
  heightInches: z.number().int().min(36).max(96).optional(),
  weightLb: z.number().min(40).max(800).optional(),
  primaryGoal: z
    .enum([
      'LOSE_FAT',
      'BUILD_MUSCLE',
      'GET_STRONGER',
      'SPORT_SPECIFIC',
      'GENERAL_HEALTH',
      'OTHER',
    ])
    .optional(),
  // trainingExperience is the API/form field name. It is persisted into the
  // existing ContactSubmission.fitnessLevel column — no new column needed.
  trainingExperience: z
    .enum(['NONE', 'SOME', 'INTERMEDIATE', 'ADVANCED'])
    .optional(),
  limitations: z.string().max(500).optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
```

- [ ] **Step 2: Persist the new fields on the create call**

Find the `prisma.contactSubmission.create({ data: { ... } })` call and add the new fields. The existing call already passes the parsed body's optional fields through; add to that object:

```ts
        // Expanded intake — fitnessLevel takes the trainingExperience value.
        heightInches: parsed.heightInches ?? null,
        weightLb: parsed.weightLb ?? null,
        primaryGoal: parsed.primaryGoal ?? null,
        limitations: parsed.limitations ?? null,
        daysPerWeek: parsed.daysPerWeek ?? null,
        fitnessLevel: parsed.trainingExperience ?? parsed.fitnessLevel ?? null,
```

The `fitnessLevel ?? null` fallback line preserves callers that still send the legacy `fitnessLevel` string.

- [ ] **Step 3: Verify `composeMessage` still compiles**

`composeMessage` (around line 39) currently formats existing optional fields into the `message` body for back-compat with the trainer inbox's MESSAGE block. Leave it alone — it stays as a legacy fallback for old code paths and the existing message rendering. It does not need to know about the new fields.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: clean.

- [ ] **Step 5: Lint**

Run: `npm run lint -- src/app/api/contact/route.ts`
Expected: clean.

- [ ] **Step 6: Manual smoke (curl)**

In one terminal: `npm run dev`. In another:

```bash
curl -X POST http://localhost:3000/api/contact \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"Smoke Test",
    "email":"smoke@test.local",
    "message":"Just verifying.",
    "heightInches":70,
    "weightLb":175.5,
    "primaryGoal":"BUILD_MUSCLE",
    "trainingExperience":"INTERMEDIATE",
    "limitations":"Bad knees on stairs",
    "daysPerWeek":4
  }'
```

Expected: `{ "ok": true }` (or whatever the existing route returns) with HTTP 200. Confirm with `npx prisma studio` that the row landed with the new columns populated and `fitnessLevel = "INTERMEDIATE"`.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/contact/route.ts
git commit -m "feat(api/contact): accept + persist expanded intake fields"
```

---

## Task 4: Apply form UX rewrite

**Files:**

- Modify: `src/components/apply/ApplyForm.tsx`

- [ ] **Step 1: Add the new state hooks**

In `src/components/apply/ApplyForm.tsx`, immediately after the existing `useState` block (around line 27), add:

```tsx
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightLb, setWeightLb] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [trainingExperience, setTrainingExperience] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('');
  const [injuries, setInjuries] = useState('');
  const [limitations, setLimitations] = useState('');
```

- [ ] **Step 2: Compute structured fields and extend the POST body**

Replace the existing `body` argument inside `fetch('/api/contact', { ... })` with:

```ts
  const ft = parseInt(heightFt, 10);
  const inch = parseInt(heightIn, 10);
  const totalInches =
    Number.isFinite(ft) || Number.isFinite(inch)
      ? (Number.isFinite(ft) ? ft : 0) * 12 + (Number.isFinite(inch) ? inch : 0)
      : undefined;
  const weight = parseFloat(weightLb);
  const days = parseInt(daysPerWeek, 10);

  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      trainerId: selection.id ?? undefined,
      goal: goal.trim() || undefined,
      heightInches: totalInches,
      weightLb: Number.isFinite(weight) ? weight : undefined,
      primaryGoal: primaryGoal || undefined,
      trainingExperience: trainingExperience || undefined,
      limitations: limitations.trim() || undefined,
      daysPerWeek: Number.isFinite(days) ? days : undefined,
      // injuries is sent so the existing schema column gets populated.
      injuries: injuries.trim() || undefined,
    }),
  });
```

- [ ] **Step 3: Add the new form fields under the existing goal textarea**

After the existing goal `<Field>` (around line 174), insert (everything inside the same `<form>`):

```tsx
      <div
        className="mf-eyebrow"
        style={{ marginBottom: -6, marginTop: 8 }}
      >
        ABOUT YOU
      </div>
      <div
        className="mf-fg-mute"
        style={{ fontSize: 11, marginTop: -10, marginBottom: -4 }}
      >
        Trainers use this to write your first program — skip anything
        you'd rather discuss in person.
      </div>

      <Field label="HEIGHT" hint="Optional">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="mf-input"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="ft"
            value={heightFt}
            onChange={(e) => setHeightFt(e.target.value.replace(/\D/g, ''))}
            maxLength={1}
            style={{ width: 80 }}
          />
          <input
            className="mf-input"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="in"
            value={heightIn}
            onChange={(e) => setHeightIn(e.target.value.replace(/\D/g, ''))}
            maxLength={2}
            style={{ width: 80 }}
          />
        </div>
      </Field>

      <Field label="CURRENT WEIGHT" hint="lb · optional">
        <input
          className="mf-input"
          inputMode="decimal"
          placeholder="175"
          value={weightLb}
          onChange={(e) => setWeightLb(e.target.value)}
          style={{ width: 120 }}
        />
      </Field>

      <Field label="TRAINING EXPERIENCE" hint="Optional">
        <select
          className="mf-input"
          value={trainingExperience}
          onChange={(e) => setTrainingExperience(e.target.value)}
        >
          <option value="">— Select —</option>
          <option value="NONE">New to lifting</option>
          <option value="SOME">Some experience</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
      </Field>

      <Field label="PRIMARY GOAL" hint="Optional · helps your trainer match programming">
        <select
          className="mf-input"
          value={primaryGoal}
          onChange={(e) => setPrimaryGoal(e.target.value)}
        >
          <option value="">— Select —</option>
          <option value="LOSE_FAT">Lose fat</option>
          <option value="BUILD_MUSCLE">Build muscle</option>
          <option value="GET_STRONGER">Get stronger</option>
          <option value="SPORT_SPECIFIC">Sport-specific</option>
          <option value="GENERAL_HEALTH">General health</option>
          <option value="OTHER">Other</option>
        </select>
      </Field>

      <Field label="DAYS / WEEK YOU CAN TRAIN" hint="Optional">
        <select
          className="mf-input"
          value={daysPerWeek}
          onChange={(e) => setDaysPerWeek(e.target.value)}
          style={{ width: 120 }}
        >
          <option value="">—</option>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="PREVIOUS INJURIES"
        hint="Optional · so your trainer can program around them"
      >
        <textarea
          className="mf-input"
          rows={2}
          maxLength={500}
          placeholder="e.g. Rotator cuff strain 2024 — still avoid overhead press"
          value={injuries}
          onChange={(e) => setInjuries(e.target.value)}
        />
      </Field>

      <Field
        label="PHYSICAL LIMITATIONS"
        hint="Optional · anything that affects how you move"
      >
        <textarea
          className="mf-input"
          rows={2}
          maxLength={500}
          placeholder="e.g. Bad knees on stairs, mild lower back from desk job"
          value={limitations}
          onChange={(e) => setLimitations(e.target.value)}
        />
      </Field>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: clean.

- [ ] **Step 5: Lint**

Run: `npm run lint -- src/components/apply/ApplyForm.tsx`
Expected: clean.

- [ ] **Step 6: Browser smoke**

`npm run dev` → open `http://localhost:3000/apply` (generic) and `http://localhost:3000/apply/{your-trainer-slug}` (direct). Verify:

- The new section header "ABOUT YOU" renders below the goal textarea.
- All fields are optional (submit form with only name + email + goal — should succeed and redirect to `/apply/success`).
- Submit a fully-populated form. Open `npx prisma studio` → `contact_submissions` and confirm the latest row has `heightInches`, `weightLb`, `primaryGoal`, `fitnessLevel` (mapped from `trainingExperience`), `injuries`, `limitations`, `daysPerWeek` populated.
- Try invalid data: ft = 99 → API should reject with 400 (field caps at 96 inches max).

- [ ] **Step 7: Commit**

```bash
git add src/components/apply/ApplyForm.tsx
git commit -m "feat(apply): collect height, weight, experience, goal, injuries, limitations, days/week"
```

---

## Task 5: Trainer applications inbox structured display

**Files:**

- Modify: `src/app/trainer/(v4)/applications/page.tsx`
- Modify: `src/app/trainer/(v4)/applications/applications-client.tsx`

- [ ] **Step 1: Extend the server-side `select`**

In `src/app/trainer/(v4)/applications/page.tsx`, find the `prisma.contactSubmission.findMany({ ... })` call and locate its `select` clause. Add the new columns to the selection so they reach the client component:

```ts
        heightInches: true,
        weightLb: true,
        primaryGoal: true,
        fitnessLevel: true,
        fitnessGoals: true,
        injuries: true,
        limitations: true,
        daysPerWeek: true,
```

If the page also has a `serializedItems`/mapping helper that whitelists fields, add the same set there.

- [ ] **Step 2: Extend the `SerializedSubmission` type**

In `src/app/trainer/(v4)/applications/applications-client.tsx`, find the `type SerializedSubmission` declaration (near the top — search for `inviteCode: string | null;`). Append:

```ts
  heightInches: number | null;
  weightLb: number | null;
  primaryGoal: string | null;
  fitnessLevel: string | null;
  fitnessGoals: string | null;
  injuries: string | null;
  limitations: string | null;
  daysPerWeek: number | null;
```

- [ ] **Step 3: Import the formatters**

At the top of `applications-client.tsx`, add:

```ts
import {
  formatHeightInches,
  formatWeightLb,
  humanizePrimaryGoal,
  humanizeTrainingExperience,
} from '@/lib/intake';
```

- [ ] **Step 4: Replace the MESSAGE block with the structured layout**

In the detail panel, find the existing MESSAGE rendering (search for `MESSAGE` eyebrow text). Replace the single MESSAGE block with the structured layout below — keep everything before the MESSAGE block (header / contact / phone) and after it (INVITED card / status dropdown) untouched:

```tsx
              {/* ---- Expanded intake (2026-04-30) ---- */}
              <div
                className="mf-eyebrow"
                style={{ marginTop: 24, marginBottom: 8 }}
              >
                ABOUT
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '8px 24px',
                  marginBottom: 16,
                }}
                className="intake-grid"
              >
                <IntakeRow label="HEIGHT" value={formatHeightInches(selected.heightInches)} />
                <IntakeRow label="WEIGHT" value={formatWeightLb(selected.weightLb)} />
                <IntakeRow
                  label="EXPERIENCE"
                  value={humanizeTrainingExperience(selected.fitnessLevel)}
                />
                <IntakeRow
                  label="DAYS/WEEK"
                  value={selected.daysPerWeek != null ? String(selected.daysPerWeek) : '—'}
                />
              </div>

              <div
                className="mf-eyebrow"
                style={{ marginTop: 16, marginBottom: 8 }}
              >
                GOAL
              </div>
              <div style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.5 }}>
                <span className="mf-fg">{humanizePrimaryGoal(selected.primaryGoal)}</span>
                {selected.fitnessGoals ? (
                  <span className="mf-fg-dim"> · &ldquo;{selected.fitnessGoals}&rdquo;</span>
                ) : selected.message ? (
                  <span className="mf-fg-dim"> · &ldquo;{selected.message}&rdquo;</span>
                ) : null}
              </div>

              <div
                className="mf-eyebrow"
                style={{ marginTop: 16, marginBottom: 8 }}
              >
                INJURIES
              </div>
              <div
                style={{ marginBottom: 16, fontSize: 13, whiteSpace: 'pre-wrap' }}
                className={selected.injuries ? 'mf-fg' : 'mf-fg-dim'}
              >
                {selected.injuries ?? '—'}
              </div>

              <div
                className="mf-eyebrow"
                style={{ marginTop: 16, marginBottom: 8 }}
              >
                LIMITATIONS
              </div>
              <div
                style={{ marginBottom: 24, fontSize: 13, whiteSpace: 'pre-wrap' }}
                className={selected.limitations ? 'mf-fg' : 'mf-fg-dim'}
              >
                {selected.limitations ?? '—'}
              </div>
```

- [ ] **Step 5: Add the `IntakeRow` helper at the bottom of the file**

Just before the file's closing `}`, after the existing component, add:

```tsx
function IntakeRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="mf-eyebrow" style={{ marginBottom: 2 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mf-mono), monospace',
          fontSize: 13,
        }}
        className={value === '—' ? 'mf-fg-dim' : 'mf-fg'}
      >
        {value}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Mobile collapse rule**

Inside the same file (or in the existing global CSS file the page already imports — check `globals.css` or similar), add a media query that collapses the intake grid below 600px:

```css
@media (max-width: 600px) {
  .intake-grid {
    grid-template-columns: 1fr !important;
  }
}
```

If the project has no obvious global CSS for this surface, embed a `<style jsx>` block at the bottom of `applications-client.tsx` containing the same media query. Pick whichever matches the file's existing pattern.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: clean.

- [ ] **Step 8: Lint**

Run: `npm run lint -- src/app/trainer/\\(v4\\)/applications/`
Expected: clean.

- [ ] **Step 9: Browser smoke**

With `npm run dev` running and a fully-populated `contact_submissions` row from Task 4 in hand, navigate to `http://localhost:3000/trainer/applications`. Verify:

- The detail panel shows ABOUT (HEIGHT / WEIGHT / EXPERIENCE / DAYS/WEEK), GOAL, INJURIES, LIMITATIONS in that order.
- A row with no expanded intake (predates this PR) renders `—` everywhere except possibly the existing MESSAGE-derived goal.
- Resize to <600px viewport — the ABOUT grid collapses to a single column.
- INVITED card with code + Resend invite email still renders below.
- Status dropdown still works.

- [ ] **Step 10: Commit**

```bash
git add src/app/trainer/\\(v4\\)/applications/
git commit -m "feat(applications): structured intake display in detail panel"
```

---

## Task 6: Profile carry-over on register

**Files:**

- Modify: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: Look up the matching ContactSubmission**

In `src/app/api/auth/register/route.ts`, after the `prisma.user.create({ ... })` call (which currently creates the user with `name`, `email`, `password`, `role`, `trainerId`), insert before the return:

```ts
    // Carry-over from intake: copy height/weight from the matching
    // ContactSubmission into the new User row, but only if the user's
    // own height/weight are still null (don't clobber any default seeded
    // by another flow). Match by lowercased email — the same key we
    // used to validate the invitation.
    const intake = await prisma.contactSubmission.findFirst({
      where: { email: normalizedEmail },
      select: { heightInches: true, weightLb: true },
      orderBy: { createdAt: 'desc' },
    });
    if (intake && (intake.heightInches != null || intake.weightLb != null)) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          // User.height is in inches (Float? in schema, see line ~250).
          height:
            intake.heightInches != null && user.height == null
              ? intake.heightInches
              : undefined,
          weight:
            intake.weightLb != null && user.weight == null
              ? intake.weightLb
              : undefined,
        },
      });
    }
```

- [ ] **Step 2: Verify the `select` on `user` includes `height`/`weight`**

The current create call's `select` clause needs to include `height: true, weight: true` so the carry-over `if` checks have something to compare against. Inspect the existing `select` block in the same `create` call and add those fields if missing:

```ts
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        trainerId: true,
        createdAt: true,
        height: true,
        weight: true,
      },
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: clean.

- [ ] **Step 4: Lint**

Run: `npm run lint -- src/app/api/auth/register/route.ts`
Expected: clean.

- [ ] **Step 5: Browser smoke (end-to-end)**

In `npm run dev`:

1. Submit an apply form (Task 4) with email `carryover@test.local`, height 5'10", weight 175.
2. Note the trainer's existing invite flow: from `/trainer/applications`, click Accept & send invite (or grab the invite code from Prisma Studio if Resend is gated locally).
3. Visit `http://localhost:3000/auth/signup?code={CODE}` and finish registration with email `carryover@test.local` and a valid password.
4. After redirect to `/client`, open Prisma Studio → `users` row for that email → confirm `height = 70` and `weight = 175`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/auth/register/route.ts
git commit -m "feat(register): carry intake height+weight into User on accept"
```

---

## Task 7: Push, deploy, and update memory

**Files:**

- Modify: `~/.claude/projects/.../memory/MEMORY.md` and one new memory file under the same dir.

- [ ] **Step 1: Push to main**

Run:

```bash
git push
```

Watch the push complete cleanly. Railway auto-deploys main; build takes ~5–8 min.

- [ ] **Step 2: Verify the Railway deploy lands**

Wait for the Railway dashboard to show the new commit hash on the "fitness-training-platform" service as "Active". If the build fails on Prisma push, it's almost certainly a missing `--skip-generate` or unexpected non-additive change — re-read Task 1.

- [ ] **Step 3: Production smoke**

Visit `https://replabusa.com/apply` — the new fields should render. Submit a real application. Check `/trainer/applications` as a trainer account; the structured ABOUT/GOAL/INJURIES/LIMITATIONS panel should appear.

- [ ] **Step 4: Write a memory note**

Create `~/.claude/projects/-Users-brandenvincent-walker-Documents-Documents---Branden-s-M3-MacBook-Projects-Development-Projects-fitness-training-platform/memory/project_expanded_client_intake_shipped.md` with:

```markdown
---
name: Expanded client intake form shipped (2026-04-30)
description: Apply form now collects height, weight, primary goal dropdown, training experience, days/week, injuries, limitations. Trainer inbox shows structured ABOUT/GOAL/INJURIES/LIMITATIONS panel. Height/weight carry over to User on register.
type: project
---

ContactSubmission gained 5 nullable columns: heightInches, weightLb, primaryGoal, limitations, daysPerWeek. fitnessLevel was repurposed for the trainingExperience dropdown. ApplyForm.tsx now has a 3-section layout (Contact / About you / Goals & body) — only name/email/goal are required. Trainer detail panel in /trainer/applications replaced its single MESSAGE block with a labeled grid + GOAL/INJURIES/LIMITATIONS rows. /api/auth/register copies heightInches→User.height and weightLb→User.weight if those are null on the user row. Imperial units only. Old applications render '—' for missing fields.

Spec: docs/superpowers/specs/2026-04-30-expanded-client-intake-design.md
Plan: docs/superpowers/plans/2026-04-30-expanded-client-intake.md
```

- [ ] **Step 5: Append a one-liner pointer to MEMORY.md**

Add to the bottom of `~/.claude/projects/.../memory/MEMORY.md`:

```markdown
- [Expanded client intake shipped 2026-04-30](project_expanded_client_intake_shipped.md) — apply form now collects height/weight/experience/goal/injuries/limitations/days; trainer detail panel renders structured grid; height+weight carry to User on register. ContactSubmission +5 nullable columns; fitnessLevel repurposed.
```

- [ ] **Step 6: Done**

No further commit needed — memory files live outside the repo. The feature is shipped end-to-end.

---

## Self-Review Notes

- All 5 spec sections (schema, form UX, API, trainer display, profile carry-over) have a corresponding task.
- All five new schema columns (`heightInches`, `weightLb`, `primaryGoal`, `limitations`, `daysPerWeek`) appear in Tasks 1, 3, and 5 with consistent names.
- The `trainingExperience` form/API field name persists into `fitnessLevel` column — this is documented in Tasks 3 and 5 and the spec.
- Mobile collapse rule (<600px) is explicit (Task 5 Step 6).
- Profile carry-over guard against clobbering user-edited values is explicit (Task 6 Step 1).
- No TBD/TODO/placeholder content. Each code step shows exact code.
- Frequent commits — every task ends in a commit.
