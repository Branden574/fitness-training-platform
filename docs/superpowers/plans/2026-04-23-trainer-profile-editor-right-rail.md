# Trainer Profile Editor — Right Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the empty right-hand space on `/trainer/settings/profile` at desktop widths (≥1280px) with a sticky rail containing a live preview of the public profile and a publish-readiness checklist — without changing anything about the form below 1280px.

**Architecture:** Two file edits. `page.tsx` widens the content band. `profile-editor-client.tsx` wraps its form sections in a CSS grid whose second column is a sticky `<aside>` rendered only at the Tailwind `xl:` breakpoint. Two new file-local components (`ProfilePreviewCard`, `CompletionChecklistCard`) read the same `profile` state the form already manages, so no state lifting, no new fetches, no prop drilling.

**Tech Stack:** Next.js 15 App Router · React · TypeScript · Tailwind (arbitrary-value grid columns) · existing `mf-*` design-system primitives (`SpecialtyChip`, `mf-card`, `mf-eyebrow`, `mf-fg-dim`).

---

## Testing note

This repo has no Jest / Vitest / Playwright harness for client components. "Verify" steps therefore run `npx tsc --noEmit`, `npx eslint` against the changed files, and a short scripted manual-browser pass at three viewport widths. Do not skip the manual pass — it's the only safety net against a layout regression.

## File structure

Two files change in total. No new files are created.

- **Modify:** `src/app/trainer/(v4)/settings/profile/page.tsx`
  - Change the outer `<div>`'s `maxWidth` constraint from `720` to `1140`.
- **Modify:** `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx`
  - Add optional `id?: string` prop to the `Section` helper.
  - Assign stable ids to the 11 `<Section>` calls the checklist references.
  - Wrap the sections + a new `<aside>` in a two-column CSS grid (second column hidden below `xl:`).
  - Add two file-local components — `ProfilePreviewCard` and `CompletionChecklistCard` — rendering inside the `<aside>`.

---

## Task 1 — Add optional `id` + scroll margin to `Section`

**Files:**

- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` (the `Section` helper near the bottom of the file)

- [ ] **Step 1: Update the `Section` signature and root element**

Find the existing helper at the bottom of the file:

```tsx
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mf-card" style={{ padding: 16 }}>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
```

Replace with:

```tsx
function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="mf-card"
      // scrollMarginTop keeps the section's title visible below the sticky
      // save row when the checklist smooth-scrolls us to this anchor.
      style={{ padding: 16, scrollMarginTop: 96 }}
    >
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify existing callers still compile**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors. Existing `<Section title="...">` calls don't pass `id`, and the prop is optional, so they keep compiling.

- [ ] **Step 3: Commit**

```bash
git add "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
git commit -m "refactor(profile-editor): Section accepts optional id + scrollMarginTop"
```

---

## Task 2 — Assign stable ids to the 11 sections the checklist references

**Files:**

- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` (`<Section>` calls in the editor's return)

The checklist in Task 5 will scroll to these anchors. Leaving ids on any other sections is fine but not required — only the 11 below are wired up.

- [ ] **Step 1: Add `id` to Photo section**

Find:

```tsx
      <Section title="PUBLIC PHOTO">
```

Replace with:

```tsx
      <Section id="section-photo" title="PUBLIC PHOTO">
```

- [ ] **Step 2: Add `id` to Cover section**

Find:

```tsx
      <Section title="COVER IMAGE (optional)">
```

Replace with:

```tsx
      <Section id="section-cover" title="COVER IMAGE (optional)">
```

- [ ] **Step 3: Add `id` to Headline section**

Find the first `<Section>` wrapping the "HEADLINE" heading:

```tsx
      <Section title="HEADLINE (one sentence shown under your name)">
```

Replace with:

```tsx
      <Section id="section-headline" title="HEADLINE (one sentence shown under your name)">
```

- [ ] **Step 4: Add `id` to Location section**

Find:

```tsx
      <Section title="LOCATION">
```

Replace with:

```tsx
      <Section id="section-location" title="LOCATION">
```

- [ ] **Step 5: Add `id` to Bio section**

Find the bio section (it renders a textarea for `profile.bio`). Example:

```tsx
      <Section title="BIO (3–6 sentences — your story, approach, tone)">
```

Replace with:

```tsx
      <Section id="section-bio" title="BIO (3–6 sentences — your story, approach, tone)">
```

(If the exact title copy differs, preserve the existing title and only prepend `id="section-bio"`.)

- [ ] **Step 6: Add `id` to Specialties section**

Find:

```tsx
      <Section title="SPECIALTIES">
```

Replace with:

```tsx
      <Section id="section-specialties" title="SPECIALTIES">
```

- [ ] **Step 7: Add `id` to Quick Facts section**

Find (already retitled in an earlier commit):

```tsx
      <Section title="QUICK FACTS · sidebar bullet points">
```

Replace with:

```tsx
      <Section id="section-quick-facts" title="QUICK FACTS · sidebar bullet points">
```

- [ ] **Step 8: Add `id` to Approach Pillars section**

Find:

```tsx
      <Section title="APPROACH PILLARS · up to 6 cards on your profile">
```

Replace with:

```tsx
      <Section id="section-pillars" title="APPROACH PILLARS · up to 6 cards on your profile">
```

- [ ] **Step 9: Add `id` to Gallery section**

Find (the title contains a count like `(0/30)`):

```tsx
      <Section title={`GALLERY (${profile.gallery.length}/30)`}>
```

Replace with:

```tsx
      <Section id="section-gallery" title={`GALLERY (${profile.gallery.length}/30)`}>
```

- [ ] **Step 10: Add `id` to Services section**

Find:

```tsx
      <Section title="SERVICES & PRICING · up to 8 cards">
```

Replace with:

```tsx
      <Section id="section-services" title="SERVICES & PRICING · up to 8 cards">
```

- [ ] **Step 11: Add `id` to Certifications section**

Find:

```tsx
      <Section title="CERTIFICATIONS">
```

Replace with:

```tsx
      <Section id="section-certifications" title="CERTIFICATIONS">
```

- [ ] **Step 12: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

Run: `npx eslint "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"`
Expected: clean.

- [ ] **Step 13: Commit**

```bash
git add "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
git commit -m "chore(profile-editor): anchor ids on sections the checklist will target"
```

---

## Task 3 — Widen the page content band

**Files:**

- Modify: `src/app/trainer/(v4)/settings/profile/page.tsx`

- [ ] **Step 1: Swap `maxWidth: 720` → `maxWidth: 1140`**

Find:

```tsx
      <div style={{ padding: 24, maxWidth: 720 }}>
        <SubNav current="profile" />
        <div style={{ marginTop: 16 }}>
          <ProfileEditorClient />
        </div>
      </div>
```

Replace with:

```tsx
      <div style={{ padding: 24, maxWidth: 1140 }}>
        <SubNav current="profile" />
        <div style={{ marginTop: 16 }}>
          <ProfileEditorClient />
        </div>
      </div>
```

- [ ] **Step 2: Confirm no other knock-on effects**

`DesktopShell` already renders its children in a full-width main area — `maxWidth` here just caps the content band. The SubNav and the editor below it are both left-aligned; widening the band doesn't reflow them.

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "src/app/trainer/(v4)/settings/profile/page.tsx"
git commit -m "chore(profile-editor): widen page content band to 1140px for desktop rail"
```

---

## Task 4 — Add `CompletionChecklistCard` component

**Files:**

- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` (add new component below the existing `Section` helper)

- [ ] **Step 1: Add the component at the end of the file**

Append this component after the existing `function Section({ ... })` definition:

```tsx
// ──────────────────────────────────────────────────────────────────────────
// Right-rail cards
// ──────────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  /** id of the <Section> to smooth-scroll to when the row is clicked. */
  sectionId: string;
}

function CompletionChecklistCard({ profile }: { profile: TrainerProfile }) {
  const required: ChecklistItem[] = [
    { key: 'photo', label: 'Public photo', done: !!profile.photoUrl, sectionId: 'section-photo' },
    { key: 'bio', label: 'Bio', done: !!profile.bio && profile.bio.trim().length > 0, sectionId: 'section-bio' },
    { key: 'specialties', label: 'Specialties', done: profile.specialties.length > 0, sectionId: 'section-specialties' },
    { key: 'location', label: 'Location', done: !!profile.location && profile.location.trim().length > 0, sectionId: 'section-location' },
  ];

  const recommended: ChecklistItem[] = [
    { key: 'cover', label: 'Cover image', done: !!profile.coverImageUrl, sectionId: 'section-cover' },
    { key: 'headline', label: 'Headline', done: !!profile.headline && profile.headline.trim().length > 0, sectionId: 'section-headline' },
    { key: 'quickFacts', label: 'At least one quick fact', done: profile.quickFacts.length > 0, sectionId: 'section-quick-facts' },
    { key: 'pillars', label: 'At least one approach pillar', done: profile.pillars.length > 0, sectionId: 'section-pillars' },
    { key: 'services', label: 'At least one service', done: profile.services.length > 0, sectionId: 'section-services' },
    { key: 'certifications', label: 'At least one certification', done: profile.certifications.length > 0, sectionId: 'section-certifications' },
    { key: 'gallery', label: 'At least one gallery image', done: profile.gallery.length > 0, sectionId: 'section-gallery' },
  ];

  const requiredDone = required.filter((r) => r.done).length;

  function jumpTo(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="mf-card" style={{ padding: 14 }}>
      <div
        className="mf-eyebrow"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span>Checklist</span>
        <span className="mf-fg-dim mf-font-mono" style={{ fontSize: 10 }}>
          {requiredDone} / {required.length} required
        </span>
      </div>

      <div
        className="mf-fg-dim mf-font-mono"
        style={{ fontSize: 9, letterSpacing: '0.08em', marginBottom: 6 }}
      >
        REQUIRED TO PUBLISH
      </div>
      <div style={{ display: 'grid', gap: 2, marginBottom: 12 }}>
        {required.map((item) => (
          <ChecklistRow key={item.key} item={item} onJump={jumpTo} />
        ))}
      </div>

      <div
        className="mf-fg-dim mf-font-mono"
        style={{ fontSize: 9, letterSpacing: '0.08em', marginBottom: 6 }}
      >
        RECOMMENDED
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        {recommended.map((item) => (
          <ChecklistRow key={item.key} item={item} onJump={jumpTo} />
        ))}
      </div>
    </div>
  );
}

function ChecklistRow({
  item,
  onJump,
}: {
  item: ChecklistItem;
  onJump: (sectionId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onJump(item.sectionId)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '6px 8px',
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: 12,
        color: item.done ? 'var(--mf-fg)' : 'var(--mf-fg-dim)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 14,
          display: 'inline-flex',
          justifyContent: 'center',
          color: item.done ? '#86efac' : 'var(--mf-fg-mute)',
          fontSize: 12,
        }}
      >
        {item.done ? '✓' : '–'}
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
    </button>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

Run: `npx eslint "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"`
Expected: clean.

The component is defined but not yet rendered anywhere — that's fine, it compiles as dead code until Task 6.

- [ ] **Step 3: Commit**

```bash
git add "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
git commit -m "feat(profile-editor): CompletionChecklistCard — required + recommended rows"
```

---

## Task 5 — Add `ProfilePreviewCard` component

**Files:**

- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` (append after `ChecklistRow`)

- [ ] **Step 1: Import `SpecialtyChip`**

Find the existing imports at the top of the file. The current line is approximately:

```tsx
import { Btn, Chip, /* … */ } from '@/components/ui/mf';
```

Confirm `SpecialtyChip` is imported from `@/components/ui/mf`. If not already imported, add it:

```tsx
import { SpecialtyChip } from '@/components/ui/mf';
```

(Merge with the existing named-imports line; do not add a second import statement.)

- [ ] **Step 2: Append the preview component**

Append at the end of the file, after `ChecklistRow`:

```tsx
function ProfilePreviewCard({ profile }: { profile: TrainerProfile }) {
  const headline = profile.headline?.trim() || null;
  const location = profile.location?.trim() || null;
  const specialties = profile.specialties.slice(0, 3);
  const quickFacts = profile.quickFacts.filter((f) => f.label.trim() && f.value.trim()).slice(0, 3);
  const pillarTitles = profile.pillars.map((p) => p.title.trim()).filter(Boolean).slice(0, 3);
  const services = profile.services.slice(0, 2);

  const placeholderStyle: React.CSSProperties = {
    fontStyle: 'italic',
    color: 'var(--mf-fg-mute)',
  };

  return (
    <div className="mf-card" style={{ padding: 14 }}>
      <div className="mf-eyebrow" style={{ marginBottom: 10 }}>
        Live preview
      </div>

      {/* Header row — photo + headline + location */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
        <div
          style={{
            width: 60,
            height: 75,
            flexShrink: 0,
            borderRadius: 4,
            background: 'var(--mf-surface-2)',
            border: '1px solid var(--mf-hairline)',
            backgroundImage: profile.photoUrl ? `url(${profile.photoUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-label={profile.photoUrl ? 'Profile photo' : 'No profile photo yet'}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="mf-font-display"
            style={{
              fontSize: 13,
              lineHeight: 1.25,
              ...(headline ? null : placeholderStyle),
            }}
          >
            {headline ?? 'Add a headline'}
          </div>
          <div
            className="mf-fg-dim"
            style={{ fontSize: 11, marginTop: 4, ...(location ? null : placeholderStyle) }}
          >
            {location ?? 'Add a location'}
          </div>
        </div>
      </div>

      {/* Specialty chips */}
      <div style={{ marginBottom: 10 }}>
        {specialties.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {specialties.map((s) => (
              <SpecialtyChip key={s}>{s}</SpecialtyChip>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, ...placeholderStyle }}>Add a specialty</div>
        )}
      </div>

      {/* Quick facts */}
      <PreviewBlock label="Quick facts">
        {quickFacts.length > 0 ? (
          <div style={{ display: 'grid', gap: 3 }}>
            {quickFacts.map((f, i) => (
              <div key={i} className="mf-font-mono" style={{ fontSize: 10, lineHeight: 1.4 }}>
                <span className="mf-fg-dim">{f.label}</span>
                <span className="mf-fg-mute"> · </span>
                <span>{f.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, ...placeholderStyle }}>Add a quick fact</div>
        )}
      </PreviewBlock>

      {/* Pillars */}
      <PreviewBlock label="Pillars">
        {pillarTitles.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, lineHeight: 1.5 }}>
            {pillarTitles.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 11, ...placeholderStyle }}>Add an approach pillar</div>
        )}
      </PreviewBlock>

      {/* Services */}
      <PreviewBlock label="Services" last>
        {services.length > 0 ? (
          <div style={{ display: 'grid', gap: 4 }}>
            {services.map((s, i) => (
              <div key={i} style={{ fontSize: 11, lineHeight: 1.4 }}>
                <span>{s.title.trim() || 'Untitled'}</span>
                {s.price.trim() ? (
                  <span className="mf-fg-dim">
                    {' — '}
                    {s.price}
                    {s.per.trim() ? ` ${s.per}` : ''}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, ...placeholderStyle }}>Add a service</div>
        )}
      </PreviewBlock>
    </div>
  );
}

function PreviewBlock({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        paddingTop: 8,
        paddingBottom: last ? 0 : 8,
        borderTop: '1px solid var(--mf-hairline)',
      }}
    >
      <div
        className="mf-fg-dim mf-font-mono"
        style={{ fontSize: 9, letterSpacing: '0.08em', marginBottom: 4 }}
      >
        {label.toUpperCase()}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

Run: `npx eslint "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
git commit -m "feat(profile-editor): ProfilePreviewCard — mini /t/[slug] render"
```

---

## Task 6 — Wrap form in two-column grid and render the rail

**Files:**

- Modify: `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` (the main `return` of `ProfileEditorClient`)

- [ ] **Step 1: Introduce the grid wrapper around the Sections**

Current structure (simplified) of the `ProfileEditorClient` return:

```tsx
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* sticky save row */}
      {message && (/* banner */)}
      {error && (/* banner */)}

      <Section id="section-photo" title="PUBLIC PHOTO">…</Section>
      <Section id="section-cover" title="COVER IMAGE (optional)">…</Section>
      …every other <Section>…

      <ImageCropperModal … />
      {/* comment about save row living in the sticky header */}
    </div>
  );
```

Wrap everything from the first `<Section>` through the last `<Section>` (but *not* the `<ImageCropperModal>` — the modal stays a sibling of the grid) in a two-column grid with an `<aside>`:

```tsx
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* sticky save row stays here, unchanged */}
      {/* message banner stays here, unchanged */}
      {/* error banner stays here, unchanged */}

      <div
        className="xl:grid-cols-[minmax(0,720px)_320px]"
        style={{ display: 'grid', gap: 24, alignItems: 'start' }}
      >
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <Section id="section-photo" title="PUBLIC PHOTO">…</Section>
          <Section id="section-cover" title="COVER IMAGE (optional)">…</Section>
          {/* …every other <Section> in its existing order… */}
        </div>

        <aside
          className="hidden xl:block"
          style={{ position: 'sticky', top: 80, alignSelf: 'start' }}
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <ProfilePreviewCard profile={profile} />
            <CompletionChecklistCard profile={profile} />
          </div>
        </aside>
      </div>

      <ImageCropperModal … />
      {/* comment stays */}
    </div>
  );
```

Key details:

- `minWidth: 0` on the form column is mandatory — without it, a long `<textarea>` or preformatted block can force the column to grow beyond `minmax(0, 720px)` and collapse the rail.
- `position: sticky; top: 80` on the `<aside>` keeps both cards in view as the user scrolls the long form. `80` clears the sticky save row (40px tall + 10px padding top/bottom + breathing room).
- `hidden xl:block` on the `<aside>` combined with no default `grid-template-columns` means the grid behaves as a single auto-flow column below `xl:`, preserving today's layout.
- The sticky save row, banners, and `<ImageCropperModal>` stay *outside* the inner grid so they span the full width of the outer container.

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

Run: `npx eslint "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"`
Expected: clean.

- [ ] **Step 3: Manual verification — three viewports**

Start (or reuse) the dev server at `npm run dev` on the usual port. Load `/trainer/settings/profile` while signed in as a trainer.

Viewport pass:

- **Wide desktop (≥1280px, e.g. 1440×900):** Confirm the right rail appears beside the form, both cards visible, the rail sticks to top 80px when you scroll the form.
- **Laptop (1100×700, below `xl:` breakpoint):** Confirm the rail is gone and the form looks identical to before this plan.
- **Mobile (375×720 via responsive tools):** Confirm the form fills the column, no horizontal scroll, no visual regression vs. earlier today.

Behavior pass (on wide desktop only):

- Edit the Headline input — the preview headline updates as you type.
- Toggle a specialty on/off — the preview's specialty chips row reflects it.
- Clear the Bio field — the checklist's Bio row flips from green ✓ to dim –.
- Click the "Headline" row in the checklist — the page smooth-scrolls to the Headline section, and the section title is visible (not hidden under the sticky save row — that's what `scrollMarginTop: 96` is for).
- Upload a cover image — checklist's Cover row turns green.

If any of the above fails, diagnose before committing. Do not "fix it later."

- [ ] **Step 4: Commit**

```bash
git add "src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx"
git commit -m "feat(profile-editor): desktop right rail with live preview + checklist"
```

---

## Task 7 — Push + update memory

**Files:** none (git + memory only)

- [ ] **Step 1: Push**

```bash
git push origin main
```

Expected: successful push; Railway picks up the new head and starts a deploy. Watch the build pipeline long enough to confirm it starts.

- [ ] **Step 2: Record in auto-memory**

Add a project memory file and update the index so future sessions know the rail exists. Exact contents:

Create `/Users/brandenvincent-walker/.claude/projects/-Users-brandenvincent-walker-Documents-Documents---Branden-s-M3-MacBook-Projects-Development-Projects-fitness-training-platform/memory/project_trainer_profile_editor_rail.md`:

```markdown
---
name: Trainer profile editor · right rail shipped
description: /trainer/settings/profile has a desktop-only (≥1280px) sticky right rail with a live preview card + publish-readiness checklist.
type: project
---

Shipped 2026-04-23 on `main`.

- `ProfilePreviewCard` renders a compact /t/[slug] from the in-memory profile state. No new fetches.
- `CompletionChecklistCard` lists publish-required + recommended items; each row smooth-scrolls to the matching Section anchor. Satisfied rows are green; dim otherwise.
- `Section` helper now takes optional `id` + `scrollMarginTop: 96` to land below the sticky save row.
- Rail lives inside `<aside className="hidden xl:block" style={{position:'sticky', top:80}}>` within a `xl:grid-cols-[minmax(0,720px)_320px]` grid. Below 1280px the DOM matches pre-rail — no mobile/tablet impact.
- Page wrapper widened from `maxWidth: 720` to `maxWidth: 1140`.

Next-time pitfalls: adding a new section to the editor and forgetting its checklist entry means the checklist silently ignores it. Keep the `required` and `recommended` arrays in CompletionChecklistCard aligned with the Sections that actually matter.
```

Append to `.../memory/MEMORY.md`:

```markdown
- [Trainer profile editor · right rail shipped](project_trainer_profile_editor_rail.md) — desktop ≥1280px, live preview + completion checklist, sticky. No mobile impact.
```

- [ ] **Step 3: Done**

No further commits. Memory files live outside the repo.

---

## Rollback

If anything looks wrong after deploy:

```bash
git revert HEAD~5..HEAD   # reverts the five profile-editor commits from Tasks 1–6
git push origin main
```

(Task 7's memory files are outside git, so nothing to revert there.)

---

## Spec coverage self-check

| Spec requirement | Implemented by |
| --- | --- |
| Outer maxWidth 720 → 1140 | Task 3 |
| Two-column grid, minmax(0,720px) + 320px | Task 6 |
| Rail hidden below xl: | Task 6 (`hidden xl:block`) |
| Sticky aside, top 80 | Task 6 |
| Preview — photo + headline + location | Task 5 header row |
| Preview — 3 specialty chips | Task 5, `SpecialtyChip` |
| Preview — 3 quick facts | Task 5 `PreviewBlock` |
| Preview — 3 pillar titles | Task 5 `PreviewBlock` |
| Preview — 2 services, "title — $price per" | Task 5 `PreviewBlock` |
| Preview — dim italic placeholders for empty fields | Task 5 `placeholderStyle` |
| Checklist — required group drives canPublish parity | Task 4 `required[]` |
| Checklist — recommended group | Task 4 `recommended[]` |
| Checklist — click to scroll | Task 4 `jumpTo()` |
| Checklist — X / N complete counter | Task 4 header |
| Section id prop optional | Task 1 |
| Section scrollMarginTop: 96 | Task 1 |
| Section anchors wired for checklist | Task 2 (all 11) |
| No new API / state / deps | Tasks 1–6 all local |
| Tablet / mobile unaffected | Task 6 breakpoint gating |
