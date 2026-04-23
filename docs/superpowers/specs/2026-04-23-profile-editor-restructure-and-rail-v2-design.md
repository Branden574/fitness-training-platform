# Profile Editor — Form Restructure + Rail v2 (Share + Activity)

**Date:** 2026-04-23
**Status:** Approved for implementation

## Problem

The right rail (shipped earlier today in commits `7da1c49..d4fcb7c`) only contains a Preview card and a Completion Checklist — together ~700px tall. The form is ~3000px tall. The rail is sticky, so at any given scroll position the rail follows the user, but the viewport still shows a tall empty column on the right. Zooming the browser out makes the empty space obvious. Separately, many form Sections are near-empty individual cards (a single input + helper text) that stack vertically, burning form height unnecessarily.

This spec addresses both in one pass: denser form layout + two new rail cards.

## Goal

1. Pair short form Sections into half-width columns so the form collapses from ~3000px to roughly ~2000px at desktop widths.
2. Add two new rail cards — **Share your profile** and **Recent activity** — under the existing Preview + Checklist, so the rail's content height better matches the form and the rail justifies its column width on every scroll position.

Everything below 768px (mobile) stays byte-identical to today.

## Non-goals

- No changes to any form field's value, validation, handler, submit payload, or server API beyond one new read-only GET endpoint for Activity.
- No touching of the existing personal-QR feature — that lives wherever it currently is and is not duplicated in the Share card.
- No Profile Views tracking — the Activity card shows applications this week only; views are a "Coming soon" placeholder until tracking is built.
- No visual redesign of individual Section cards. Only how they lay out in the grid.
- Tablet (768–1279) gets the paired form but no rail. Mobile (<768) gets today's single-column layout unchanged.

## Part 1 — Form restructure

### Layout

The existing form column (inside the `xl:grid-cols-[minmax(0,720px)_320px]` outer grid) currently uses `display: grid; gap: 16` and stacks every `<Section>` vertically. Replace the inner stack with a 2-column grid at `md:` (≥768px):

```tsx
<div
  className="md:grid-cols-2"
  style={{ display: 'grid', gap: 16, minWidth: 0 }}
>
  {/* Sections that pair up are marked span="half"; others default to full. */}
</div>
```

Each `<Section>` gets an optional `span?: 'half' | 'full'` prop (default `'full'`). A half-width Section adds `className="md:col-span-1"` to its root; a full-width Section adds `className="md:col-span-2"`. Below `md:`, no column classes apply and the grid falls back to an implicit single column — identical to today's stacking behavior.

### Section assignments

**Half-width (paired):**

| Left | Right |
| --- | --- |
| Headline | Location |
| Instagram | TikTok |
| YouTube | Contact Phone |
| Reply-to Email | Reply-from Name |
| Experience | Clients Trained |
| Price Tier | Hourly Rate |

**Half-width (lone — no partner):**

- Service Modes (odd number of shorts; sits alone, stays half-width so its row isn't a full-width block). The grid fills the leftover half with empty space — acceptable because this is the last short Section before the next full-width section stacks under it cleanly.

**Full-width (`span='full'` or default):**

Public Photo · Cover Image · Bio · Specialties · Quick Facts · Approach Pillars · Gallery · Services & Pricing · Certifications.

### Section order

Preserve today's ordering exactly. Nothing is reordered. A paired row is created by giving two consecutive Sections `span='half'`. Because they're adjacent in the DOM and the grid lays out left-to-right, they naturally pair.

### Section component change

```tsx
function Section({
  id,
  title,
  span = 'full',
  children,
}: {
  id?: string;
  title: string;
  span?: 'half' | 'full';
  children: React.ReactNode;
}) {
  const colClass = span === 'half' ? 'md:col-span-1' : 'md:col-span-2';
  return (
    <div
      id={id}
      className={`mf-card ${colClass}`}
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

### Constraints and guarantees

- `span` is optional, defaults to `'full'`. Any existing `<Section>` call that does not pass `span` keeps rendering full-width — no surprise layout breakage anywhere else in the app. (`Section` is file-local to `profile-editor-client.tsx`, so the blast radius is limited to this file only.)
- The outer grid still has `minWidth: 0` to guard against blowout from long text inside a Section.
- Each paired row's two cards use `align-items: start` (grid default when not set) so one card being taller than the other doesn't stretch the shorter one unpleasantly.
- No field's input, state, handler, submit payload, or server API changes.

## Part 2 — Rail v2 (two new cards)

Order inside the sticky `<aside>` becomes: **Preview → Checklist → Share → Activity**.

### Card 3 — Share your profile

Requires: the trainer's `trainerSlug`, `trainerIsPublic`, and the app's origin.

Behavior:

- If `trainerIsPublic === true && trainerSlug`: render the public URL as text (`origin + '/t/' + trainerSlug`), a **Copy link** button that calls `navigator.clipboard.writeText(url)` and flips its label to "Copied ✓" for ~2s, and a **View live profile** link (`target="_blank" rel="noopener"`) pointing at the same URL.
- If `trainerIsPublic === false` OR `trainerSlug` is empty: render a muted state with copy "Publish your profile to start sharing" and no URL or buttons. This matches the existing rule that private slugs 404.
- No QR code anywhere in this card — per user, the existing personal QR feature stays exactly where it lives today.

Data source:

- `trainerSlug` and `trainerIsPublic` are already loaded into the editor's `profile` state. No new fetch.
- `origin` is read at render time from `typeof window !== 'undefined' ? window.location.origin : ''`. Server render returns empty string and hydrates correctly on first client render. Acceptable because this card is inside a `'use client'` component and isn't SSR-critical.

### Card 4 — Recent activity

Minimum payload (v1): `{ applicationsThisWeek: number }`. Rendered as:

- Big mono number + small label "Applications this week"
- A link row "View inbox" → `/trainer/messages` (existing route)
- A dim "Profile views · Coming soon" line below, so the card doesn't read as 50%-empty

Data source:

- New GET endpoint `GET /api/trainers/me/activity` returning `{ applicationsThisWeek: number }`. Authenticated trainer session required. Counts rows in the existing applications table where `trainerId === session.user.trainerId && createdAt >= startOfWeek()`.
- Rail component fetches once on mount via `useEffect`, stores in local state. No revalidation; the editor is a rarely-visited page and stale counts are fine. On fetch error, the number shows `—` (em-dash) and the "View inbox" link still works.

### Layout inside the `<aside>`

Simply append two more `<...Card>` calls inside the existing `<div style={{ display: 'grid', gap: 16 }}>` wrapper that already holds Preview + Checklist. No structural changes to the aside itself.

### Empty-space outcome

With both new cards, rail content grows from ~700px to roughly ~1100–1200px. The form shrinks to ~2000px via restructure. The remaining gap (~800px) is absorbed by the rail's sticky behavior — as the user scrolls, the rail stays pinned and the empty space stays below the viewport, never visible at a normal scroll position. At zoomed-out views the gap is still there but dramatically smaller than before.

## Part 3 — Applications-count endpoint

### Route

`GET /api/trainers/me/activity`

### Handler logic

1. `getServerSession(authOptions)`; require `session.user.role === 'TRAINER'` and a `session.user.id`.
2. Compute `startOfWeek` (Monday 00:00 local). Reuse the existing helper at `src/lib/client-data.ts` if its semantics match; otherwise inline a two-line local helper. It's fine to duplicate the three-line function rather than drag in a client-only import.
3. Run `prisma.contactSubmission.count({ where: { trainerId: session.user.id, createdAt: { gte: startOfWeek() } } })`.
4. Return `NextResponse.json({ applicationsThisWeek: count }, { headers: { 'Cache-Control': 'private, no-store' } })`.

`ContactSubmission` is the model `/apply/[slug]` writes to (via `POST /api/contact`); `trainerId` is the owning-trainer FK. Confirmed via grep at spec time.

### Failure modes

- 401 if no session → component shows `—`.
- 500 from Prisma → component shows `—`.
- Empty result → `0` renders normally.

## Non-breaking guarantees (both parts)

1. `Section` gains one optional prop (`span`). Existing calls elsewhere in the app compile identically — the prop is optional with a default that matches today's behavior.
2. `Section` is defined locally to `profile-editor-client.tsx` (not exported), so the change cannot affect any other page.
3. Below `md:` (768px), no column classes are applied and the form is single-column exactly as today.
4. Between `md:` and `xl:` (768–1279), the form pairs up but the rail is still `hidden xl:block`.
5. At `xl:` and above, form pairs + rail with 4 cards.
6. No existing `<Section>` has its title, id, content, or children changed — only the new `span` prop is added.
7. Activity card fetch is optional from the UI's perspective — if it fails, nothing else on the page is affected.
8. Share card reads from existing `profile` state; no new fetches for it at all.
9. Personal QR feature is untouched wherever it currently lives.
10. Mobile: unchanged.

## Testing / verification

The repo has no Jest/Vitest/RTL harness. Verification is:

- `npx tsc --noEmit -p tsconfig.json` clean.
- `npx eslint` clean on changed files.
- Manual browser pass at 1440×900 (desktop — expect rail + paired form), 1100×700 (laptop — expect paired form, no rail), 900×700 (tablet — expect paired form, no rail), 375×720 (phone — expect single-column form identical to today).
- Resize between breakpoints and confirm no layout jump or dead pixels.
- Click Copy link → clipboard has the URL, label flips to "Copied ✓".
- Toggle the profile from Public to Private via the existing button — Share card swaps to the muted state.
- Confirm existing Save, Publish, SubNav tabs, cropper, gallery upload, and all form submit behavior still work.
- Check `/api/trainers/me/activity` in isolation: returns JSON with `applicationsThisWeek` as a number.

## Files touched

| File | Change |
| --- | --- |
| `src/app/trainer/(v4)/settings/profile/profile-editor-client.tsx` | `Section` gets `span` prop; outer form column gets `md:grid-cols-2`; ~13 paired Sections get `span="half"`; two new card components appended; rail's aside renders four cards. |
| `src/app/api/trainers/me/activity/route.ts` | **New file.** GET handler returning applications-this-week count. |

No other files touched. No new npm dependencies.
