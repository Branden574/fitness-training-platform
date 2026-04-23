# Trainer Profile Editor — Desktop Right Rail

**Date:** 2026-04-23
**Status:** Approved for implementation

## Problem

`/trainer/settings/profile` caps its content column at `maxWidth: 720`. On typical desktop widths (≥1280px) this leaves a large empty area on the right. Non-technical trainers editing their public profile have no visual feedback for what their `/t/[slug]` page will look like until they save and navigate away, and no clear indication of what's still missing before they can publish. Filling the empty space is an opportunity to make the editor concretely more useful, not just balanced.

## Goal

Add a sticky right rail, visible at ≥1280px only, containing two cards:

1. **Live preview** — a compact render of the public profile that updates as the trainer types.
2. **Completion checklist** — grouped list of publish-required and recommended fields, each clickable to jump to that section.

Everything below 1280px stays byte-identical to today.

## Non-goals

- No backend changes. No new API routes. No new persisted state.
- No refactor of existing editor state or save handlers.
- Mobile / tablet experience is not touched in this spec.
- Preview is not pixel-perfect parity with `/t/[slug]`; it is a *recognizable* summary showing the fields being edited.

## Layout

Outer wrapper in `page.tsx` changes `maxWidth: 720` → `maxWidth: 1140`. `DesktopShell` already renders full-viewport so this only widens the content band; it does not affect the shell.

Inside `ProfileEditorClient` the return now renders a two-column grid:

```tsx
<div
  style={{ display: 'grid', gap: 24, alignItems: 'start' }}
  className="xl:grid-cols-[minmax(0,720px)_320px]"
>
  <div> {/* form column — existing sticky save row + all Sections */} </div>
  <aside className="hidden xl:block" style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
    <ProfilePreviewCard profile={profile} />
    <CompletionChecklistCard profile={profile} />
  </aside>
</div>
```

Breakpoint: Tailwind `xl:` = 1280px. Below `xl:`:

- `xl:grid-cols-[...]` does not apply → grid falls back to implicit single column
- `hidden xl:block` makes the `<aside>` `display: none`

Net effect below 1280px: identical DOM to today except the outer wrapper is wider (but the 720px form column doesn't grow because its content is constrained by each `Section`).

## Right rail · Card 1 · Live preview

Component: `ProfilePreviewCard`, file-local inside `profile-editor-client.tsx`. Reads the same `profile` state the form uses. Renders:

- Header strip: 60×75 rounded-rect photo (from `profile.photoUrl`, falls back to a dim placeholder), next to stacked `profile.headline` and `profile.location`.
- Specialty chips: first 3 of `profile.specialties`, rendered with the `SpecialtyChip` primitive already exported from `@/components/ui/mf`.
- Quick Facts block: up to 3 rows of `profile.quickFacts`, rendered as `LABEL · value` mono text.
- Approach Pillars block: up to 3 pillar titles as bulleted list, no icon rendering (keeps preview dependency-light).
- Services block: up to 2 services, rendered as `title — $price per` on a single line each.

For every empty field the preview shows dim italic placeholder copy — for example, `Add headline to preview` — so the preview teaches trainers what each field does.

Fixed maximum height with `overflow: hidden` to prevent a trainer with 12 quick facts + 6 pillars from blowing up the rail.

## Right rail · Card 2 · Completion checklist

Component: `CompletionChecklistCard`, same file. Derives from `profile`:

**Required to publish** — these four mirror the existing `canPublish` computed field:

- Photo — satisfied when `profile.photoUrl` is truthy
- Bio — satisfied when `profile.bio` is truthy
- Specialties — satisfied when `profile.specialties.length > 0`
- Location — satisfied when `profile.location` is truthy

**Recommended** (quality hints, don't gate publish):

- Cover image (`profile.coverImageUrl`)
- Headline (`profile.headline`)
- At least one Quick Fact (`profile.quickFacts.length > 0`)
- At least one Approach Pillar (`profile.pillars.length > 0`)
- At least one Service (`profile.services.length > 0`)
- At least one Certification (`profile.certifications.length > 0`)
- At least one Gallery image (`profile.gallery.length > 0`)

Each row is a `<button>` that calls `document.getElementById('section-<slug>')?.scrollIntoView({ behavior: 'smooth', block: 'start' })`. Rows show a green check when satisfied, a dim dash otherwise.

Rail header of the card shows `X / N complete` counter for the required group so the publish readiness is obvious at a glance.

## Section anchoring

`Section` component gains an optional `id?: string` prop. Each existing `<Section>` call in the editor gets a stable id: `section-photo`, `section-cover`, `section-headline`, `section-location`, `section-socials`, `section-bio`, `section-specialties`, `section-experience`, `section-quick-facts`, `section-pillars`, `section-gallery`, `section-services`, `section-certifications`, `section-price-tier`, `section-hourly-rate`, `section-service-modes`.

`scrollMarginTop: 96px` is added to the Section root style so smooth-scroll targets land below the sticky save row instead of being hidden behind it.

`id` is optional — existing or future `Section` uses without an id continue to compile and render identically.

## Data flow

No state changes. `ProfileEditorClient` already holds the complete `profile` object in React state. Preview and Checklist are rendered as children of the same function component, so they naturally re-render whenever the form mutates `profile`.

No new fetches. No localStorage. No effects.

## Non-breaking guarantees

1. At widths below 1280px the rail's `<aside>` is `display: none` and the outer grid has no `grid-template-columns` set — layout is single-column, identical DOM to today except the outer wrapper width which doesn't affect anything inside because the Sections are all full-width of their column.
2. Every existing `<Section>` call site keeps compiling; `id` is optional.
3. Sticky save row, publish toggle, SubNav tabs, image cropper, all upload flows, save / PATCH behavior — none of these files or functions are modified.
4. `SpecialtyChip` is reused from the existing primitive rather than re-implemented.
5. No new npm dependencies.

## Testing / verification

Manual verification plan (the app has no Playwright or RTL tests for this page):

- Load `/trainer/settings/profile` at 1440px desktop: confirm two-column layout, rail sticky.
- Resize to 1100px: confirm rail disappears, form stays at 720px max.
- Resize to 375px (mobile): confirm form fills the narrow column, no horizontal scroll, same as today.
- Edit the headline field: confirm preview updates live.
- Uncheck/clear Bio: confirm checklist flips that row from green to dim.
- Click a checklist row: confirm the matching section scrolls into view just below the sticky save row.
- Confirm `npx tsc --noEmit` is clean.
- Confirm `npx eslint` on the two touched files is clean.

## Files touched

1. `src/app/trainer/(v4)/settings/profile/page.tsx` — widen `maxWidth` on the wrapper div.
2. `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` — wrap form in a grid, add `<aside>`, add the two card components at the bottom of the file, add optional `id` to `Section`, add `scrollMarginTop`.

That's it. No other files.
