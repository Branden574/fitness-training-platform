# Phase 2 — Public Trainer Directory + Profiles — Design

**Date:** 2026-04-19
**Phase:** Phase 2 of the multi-trainer rollout. Phase 1 (apply flow + referral links) is shipped.
**Goal:** Turn the repo from "Brent's single-trainer site" into a genuine multi-trainer marketplace with a browseable directory, rich public profiles, trainer-editable content, and a legal/moderation framework sufficient for real trainers to onboard.

## Scope

**In scope for Phase 2:**

1. Public directory page `/trainers` with search and filters (specialty, location, accepting-clients, pricing tier, experience range, sort order).
2. Individual public trainer profile pages `/t/[slug]` (replaces current redirect stub).
3. Trainer profile editor in `/trainer/settings` — writes to the existing `Trainer` model (plus a few new fields).
4. Social-proof surfaces on each profile: testimonials (written quotes), before/after transformation gallery (photos), and verified stats block (aggregated from existing data).
5. Trainer signup agreement — Terms of Service + liability waiver + content warranty + indemnification — gated before any TRAINER-role user can publish their profile.
6. Admin moderation queue for transformation photos and content takedown requests.
7. DMCA-style public takedown form on a legal/contact page.

**Out of scope (Phase 3 and later):**

- Self-service trainer signup (admin still invites trainers; Phase 3 adds public trainer applications).
- Stripe Connect payment splits.
- Per-trainer email sender domains.
- Reviews / star ratings.

## Brent-safety guarantees

- Brent's existing `User` row is untouched.
- Brent's existing clients (rows with `trainerId` pointing at him) stay assigned.
- `useAssignedTrainer` continues to return Brent for his clients' dashboards.
- If Brent's `Trainer` row doesn't exist, the editor auto-creates an empty one on first visit (same pattern as `ensureTrainerIdentity`).
- Brent's `trainerIsPublic` value is NOT changed by Phase 2. He has to explicitly flip it to appear in the directory — nothing auto-promotes anyone.
- First Phase 2 deploy does NOT require any trainer to re-sign the agreement; they'll see the modal when they next log in.

---

## Section 1 — Data model

### Additions to the existing `Trainer` model

Nullable fields, all optional on save so a partially-filled profile still works.

```prisma
model Trainer {
  // existing fields...
  photoUrl         String?       // separate from User.image; high-res headshot for public profile
  location         String?       // "Fresno, CA" — freeform city/state display string
  instagramHandle  String?       // "brentjmartinez" (no @ prefix stored)
  priceTier        String?       // "tier-1" | "tier-2" | "tier-3" — maps to $ / $$ / $$$
  specialties      String[]      @default([])  // max 5, normalized lowercase on save
  acceptsInPerson  Boolean       @default(false)
  acceptsOnline    Boolean       @default(false)
  profilePublishedAt DateTime?   // set when trainerIsPublic first flips true; used for "Recently joined" sort

  testimonials     TrainerTestimonial[]
  transformations  TrainerTransformation[]
}
```

`specialties` is a PostgreSQL `text[]` — native array type, not JSON. Enables `ANY()` filters and GIN indexing. Normalized to lowercase on save; rendered with Title Case on display.

### New model: `TrainerTestimonial`

```prisma
model TrainerTestimonial {
  id           String   @id @default(cuid())
  trainerId    String
  quote        String                // max 500 chars
  attribution  String                // "Sarah K." or "Jordan, marathon runner"
  order        Int      @default(0)  // trainer-managed display order
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  trainer      Trainer  @relation(fields: [trainerId], references: [id], onDelete: Cascade)

  @@index([trainerId, order])
}
```

Trust-on-submit (no moderation queue) — trainers are legally responsible for authenticity via the signup agreement.

### New model: `TrainerTransformation`

```prisma
enum TransformationStatus {
  PENDING     // uploaded, awaiting admin review
  APPROVED    // visible on public profile
  REJECTED    // admin rejected; visible to trainer only, not public
  REMOVED     // takedown request honored; hidden from everyone
}

model TrainerTransformation {
  id              String   @id @default(cuid())
  trainerId       String
  beforePhotoUrl  String                // /uploads/transformations/{trainerId}/{id}-before.jpg
  afterPhotoUrl   String                // /uploads/transformations/{trainerId}/{id}-after.jpg
  caption         String?               // max 200 chars
  durationWeeks   Int?                  // "16 weeks" etc., optional
  status          TransformationStatus  @default(PENDING)
  reviewedBy      String?               // admin user id who reviewed
  reviewedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime @default(now())
  trainer         Trainer  @relation(fields: [trainerId], references: [id], onDelete: Cascade)

  @@index([trainerId, status])
  @@index([status, createdAt])  // supports admin pending-queue query
}
```

Every upload starts at `PENDING`. Only `APPROVED` transformations render on public profiles. `REMOVED` is a soft-delete that preserves the row for audit but hides it from all surfaces.

### New model: `TrainerAgreement`

```prisma
model TrainerAgreement {
  id             String   @id @default(cuid())
  trainerId      String   @unique
  version        String                // "v1-2026-04-19" — bump when text changes to re-prompt
  acceptedAt     DateTime @default(now())
  ipAddress      String?
  userAgent      String?
  trainer        User     @relation(fields: [trainerId], references: [id], onDelete: Cascade)
}
```

Stored per-trainer with timestamp + IP + user agent for legal audit trail. A new agreement version invalidates old acceptances (version mismatch → trainer must accept again before editing their profile).

### New model: `ContentTakedownRequest`

```prisma
enum TakedownStatus {
  OPEN
  REVIEWING
  RESOLVED_REMOVED
  RESOLVED_KEPT
}

model ContentTakedownRequest {
  id              String           @id @default(cuid())
  contentType     String                      // "transformation" | "testimonial" | "profile"
  contentId       String
  reporterEmail   String
  reporterName    String?
  reason          String                      // max 2000 chars
  status          TakedownStatus   @default(OPEN)
  resolvedBy      String?
  resolvedAt      DateTime?
  resolutionNote  String?
  createdAt       DateTime         @default(now())

  @@index([status, createdAt])
}
```

Public `/legal/takedown` form writes to this table. Admin `/admin/takedowns` lists open requests. Status transitions audited.

### Migration strategy

Single migration file `20260420000000_phase_2_trainer_directory/migration.sql` with:

1. `ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT` etc. for the 8 Trainer additions.
2. `CREATE TABLE "trainer_testimonials" ...`
3. `CREATE TABLE "trainer_transformations" ...`
4. `CREATE TABLE "trainer_agreements" ...`
5. `CREATE TABLE "content_takedown_requests" ...`
6. `CREATE INDEX` statements for all declared `@@index`.

All additive — no existing column altered, no data loss risk. Safe for `prisma db push --skip-generate` on Railway.

---

## Section 2 — Routes

| URL | Purpose |
|---|---|
| `/trainers` | Public directory grid. Server-rendered for SEO. Client-hydrated for filters. |
| `/t/[trainerSlug]` | Replaces the current redirect stub. Full public profile page. |
| `/apply/[trainerSlug]` | Unchanged from Phase 1 — still the application form. |
| `/trainer/settings/profile` | New trainer-editor page for bio/photo/specialties/pricing/location/instagram. |
| `/trainer/settings/testimonials` | List/add/edit/remove/reorder testimonials. |
| `/trainer/settings/transformations` | List/upload/remove transformations; shows per-item status (PENDING/APPROVED/REJECTED). |
| `/trainer/agreement` | Trainer signup agreement modal/page. Gated: trainer can't publish until they accept the current version. |
| `/admin/transformations` | Admin moderation queue for PENDING transformations. |
| `/admin/takedowns` | Admin view of takedown requests. |
| `/legal/takedown` | Public form for reporting content. No auth required. |
| `/api/trainers` | GET — directory search with filter params. |
| `/api/trainers/me/profile` | PATCH — trainer updates own profile fields. |
| `/api/trainers/me/testimonials` | GET / POST / PATCH / DELETE — testimonial CRUD for own profile. |
| `/api/trainers/me/transformations` | GET / POST (upload) / DELETE — transformation gallery for own profile. |
| `/api/trainers/me/photo` | POST — upload new trainer headshot (separate from `User.image`). |
| `/api/trainers/me/agreement` | GET (current version + my acceptance status) / POST (accept current version). |
| `/api/specialties/suggest` | GET `?q=w` — autocomplete specialties from existing tag usage; returns `{ tag, count }` ordered by count desc. |
| `/api/admin/transformations` | GET (pending queue) / PATCH (approve/reject). |
| `/api/admin/takedowns` | GET / PATCH (resolve). |
| `/api/legal/takedown` | POST — public takedown request submission. |

---

## Section 3 — Specialties taxonomy (Option D)

Free-text with normalization and discovery aids.

### Storage

- Stored as PostgreSQL `text[]` on `Trainer.specialties`.
- Normalized on save: `tag.toLowerCase().trim().replace(/\s+/g, ' ')`.
- Max 5 tags per trainer (enforced in API validation).
- Rendered with Title Case on display (simple per-word capitalization in a client helper).

### Autocomplete during profile editing

`GET /api/specialties/suggest?q=pow` returns:

```json
{ "suggestions": [
  { "tag": "powerlifting", "count": 4 },
  { "tag": "power cleans", "count": 1 }
] }
```

Query: `SELECT unnest(specialties) AS tag, COUNT(*) FROM trainers WHERE 'tag' ILIKE $1 || '%' GROUP BY tag ORDER BY count DESC LIMIT 10`. Rate-limited 30/min/IP.

### Directory filter dropdown

Populated from `GET /api/specialties/suggest?threshold=2` — returns only tags used by **2 or more trainers**. At current scale (1 trainer) the dropdown is empty; it populates naturally as trainers join. Prevents a prospect from filtering on a one-off tag that only 1 trainer uses.

When only 0–1 trainers use a tag, the directory filter hides it entirely; the tag still renders as a badge on individual profiles.

---

## Section 4 — Public pages

### `/trainers` — directory

**Hero:** "Find your coach." subheadline "Every trainer here is invite-only on platform."

**Filter bar** (sticky):
- Text search (name, bio, specialty keywords)
- Specialty dropdown (threshold-filtered, multi-select)
- Location text filter (partial match on `Trainer.location`)
- "Accepting new clients" toggle
- Pricing tier chips ($, $$, $$$)
- Experience range dropdown (1+, 3+, 5+, 10+ years)
- Sort dropdown (Recently joined / Most experienced / A–Z)

Debounced 200ms on text inputs; filters composed into a single query-string that drives the URL (`/trainers?specialty=powerlifting&loc=fresno&accepting=1&tier=2`). Shareable links.

**Result grid:** 3-column on desktop, 2-column tablet, 1-column mobile. Each card:

```
┌─────────────────────────────────────┐
│  [Photo 4:5]                        │
│                                     │
│  BRENT MARTINEZ · FRESNO, CA        │
│  15 yrs · NSCA-CPT · $$             │
│                                     │
│  "Powerlifting coach who actually   │
│   programs the accessory work..."   │
│                                     │
│  [Powerlifting] [Weight Loss] +2    │
│  ● accepting                        │
│  [ Apply → ]                        │
└─────────────────────────────────────┘
```

Card is a link to `/t/[slug]`; "Apply" button is a separate link to `/apply/[slug]`.

SEO-safe: directory is server-rendered for the default (unfiltered) view; filters apply client-side over the initial payload for small trainer counts, with a fetch-on-filter upgrade once count exceeds 50.

### `/t/[trainerSlug]` — profile

**Hero block:**
- Trainer photo (headshot, 4:5, ~400×500)
- Name in Oswald 48px
- `mf-eyebrow` row: "TRAINER · FRESNO, CA · 15 YRS · NSCA-CPT"
- Accepting/paused badge
- Primary CTA button `Apply →` linking to `/apply/[slug]`
- Secondary: Instagram icon link if `instagramHandle` set

**Body sections (render only when the trainer has content for that section):**

1. **Bio** — card with `mf-card` styling, Oswald section heading "ABOUT", body copy in default font.

2. **Specialties** — chip row of up to 5 tags.

3. **Credentials** — certifications as a list.

4. **Stats** (verified, from platform data):
   - `Active clients` — count of non-deleted User rows where trainerId = this
   - `PRs this year` — count of workoutProgress where weight > prior max for user+exercise
   - `Average session logging` — rough engagement metric
   - Only shown when the trainer has at least 1 active client. New trainers see this section hidden until data exists.

5. **Testimonials** — card list of quotes + attributions.

6. **Transformations** — grid of approved before/after pairs. Each pair shows side-by-side photos, optional caption + duration. Visible disclaimer: *"Posted by [Trainer Name]. Subject? [Report this content]"* linking to `/legal/takedown?contentId={transformationId}&type=transformation`.

7. **Apply CTA repeat** — bottom of page, same button as hero.

### Metadata

`generateMetadata` returns:
- `title` — `[Trainer Name] · Martinez/Fitness`
- `description` — trainer bio (truncated 160 chars)
- OpenGraph image — `Trainer.photoUrl` or fallback to platform mark
- Structured data (JSON-LD `ProfilePage`) for search-engine rich results

---

## Section 5 — Trainer profile editor

Lives inside the existing trainer settings nav. The Phase 1 Sharing panel stays untouched; this adds two new sidebar items and three new pages.

### `/trainer/settings/profile`

Single-column form, `mf-card` wrapping each field group:

- **Public photo** — file upload (5MB max, image/jpeg|png|webp), shows current photo with "Replace" button. Stored at `/public/uploads/trainers/{userId}/profile-{timestamp}.jpg`.
- **Location** — text field with `mf-input` styling.
- **Instagram handle** — text field with `@` prefix visual.
- **Bio** — textarea, 500 char limit.
- **Specialties** — 5 tag slots with autocomplete suggesting tags used by other trainers.
- **Experience** — number input (years).
- **Certifications** — repeating list, trainer adds rows.
- **Pricing tier** — radio chip group ($, $$, $$$, "Contact for pricing").
- **Hourly rate** — optional number input (USD cents stored, rendered as `$120/hr`).
- **Service modes** — two checkboxes: accepts in-person / accepts online.
- **"Make profile public" toggle** — disabled until trainer has accepted the current agreement version AND filled at minimum: photo, bio, specialties (1+), location. Shows an inline warning listing what's missing.

Save button at bottom: `PATCH /api/trainers/me/profile`. Returns the updated Trainer row. Optimistic UI.

### `/trainer/settings/testimonials`

List of existing testimonials. "Add testimonial" button opens an inline form. Each row has drag handle for reorder, edit pencil, delete trash. All writes use the same row component — optimistic UI with rollback on API error.

### `/trainer/settings/transformations`

List of existing transformations grouped by status:
- **Live** (APPROVED) — visible on public profile
- **Pending review** (PENDING) — uploaded, awaiting admin
- **Rejected** (REJECTED) — with `rejectionReason` shown
- **Removed** (REMOVED) — takedown-honored, read-only

"Add transformation" opens modal: before photo upload, after photo upload, caption field, duration-weeks field, and a single acknowledgment line: *"By uploading, I confirm this content is covered by my accepted Trainer Agreement. I accept full responsibility per the terms I agreed to on [date]."*

Submit → `POST /api/trainers/me/transformations` (multipart form data with the two image files). Response creates a PENDING row. Trainer sees "Pending admin review" status immediately.

---

## Section 6 — Trainer agreement flow

### First-time acceptance

When a TRAINER-role user attempts to access `/trainer/settings/profile` or hits "Make profile public" without a current acceptance:

1. Server returns a redirect to `/trainer/agreement?return=<original-url>`.
2. Page renders the full current agreement text in a scrollable `mf-card-elev`.
3. Bottom: two required checkboxes + "I agree" button:
   - [ ] I have read and agree to the Terms of Service, Liability Waiver, and Content Warranty.
   - [ ] I understand I am fully responsible for all content I post, including all client consents and releases.
4. Accept → `POST /api/trainers/me/agreement` → creates a `TrainerAgreement` row with version + IP + user agent.
5. Redirect back to the original URL.

### Version bumps

When the agreement text is revised, a new version string is deployed. On next trainer login, their stored acceptance's `version` no longer matches the current one → they're redirected to re-accept. Old acceptance rows are preserved (audit trail).

### Placeholder text

The agreement page displays placeholder text wrapped in a clearly visible banner:

```
⚠️ [LEGAL REVIEW REQUIRED]
This text is a placeholder. Get real lawyer-drafted terms before
onboarding external trainers in volume. Current placeholder covers:
- Terms of service
- Content warranty (trainer warrants they have all rights/consents)
- Indemnification (trainer indemnifies platform for their content)
- Takedown procedure reference
```

Full placeholder text included in the implementation plan. Has clear `[LEGAL REVIEW REQUIRED]` markers throughout.

---

## Section 7 — Admin moderation + takedown

### `/admin/transformations`

Queue of `TransformationStatus = 'PENDING'` rows, newest first. Each row:
- Trainer name + link
- Before photo + after photo side-by-side (400px wide each)
- Caption + duration
- `[ Approve ]` `[ Reject ]` buttons
- Reject opens a reason textarea; reason is stored on the row and shown to the trainer.

Approve → status = APPROVED, `reviewedAt` + `reviewedBy` stamped. Appears on public profile next request.

Reject → status = REJECTED, reason stored, trainer sees it on their transformations page.

### `/admin/takedowns`

Queue of `ContentTakedownRequest` rows ordered by created date. Each shows:
- Reporter name/email
- Content type + link to the offending content
- Reason text
- `[ Remove content ]` → sets transformation/testimonial status to REMOVED + takedown status to RESOLVED_REMOVED
- `[ Keep as-is ]` → takedown status to RESOLVED_KEPT + optional resolution note
- Email notification to reporter on resolution (placeholder for Phase 3.5)

### `/legal/takedown` public form

Public page, no auth required. Simple form:
- Reporter name (optional)
- Reporter email (required)
- Content URL or description (required)
- Reason / explanation (required, 2000 char limit)
- Submit → `POST /api/legal/takedown` → creates a `ContentTakedownRequest` with status=OPEN.

Rate-limited 3/hour/IP to prevent abuse.

---

## Section 8 — Photo upload infrastructure

All photos stored at `/public/uploads/...` matching the existing profile-photo pattern from `/api/profile/route.ts`. Rationale:

- Railway doesn't have cheap blob storage
- Existing pattern works fine for <1000 photos
- Same MIME-based extension derivation (never trust `file.name`) to prevent RCE
- Same 5MB size cap per image

**Directory structure:**
- `/public/uploads/trainers/{userId}/profile-{timestamp}.jpg` — trainer headshot
- `/public/uploads/transformations/{trainerId}/{transformationId}-before.jpg`
- `/public/uploads/transformations/{trainerId}/{transformationId}-after.jpg`

**Migration path to R2/S3** (when count > 1000 or storage > 1GB): swap the upload helper in one file; existing URLs in DB stay as relative paths until a one-shot migration copies them.

---

## Section 9 — Architecture summary

- **One new directory page** `/trainers` with composable filter components.
- **One new public profile page** `/t/[slug]` replacing the redirect.
- **Four new trainer-settings subpages** (profile, testimonials, transformations, agreement).
- **Two new admin pages** (transformations queue, takedowns queue).
- **One new public legal page** (/legal/takedown).
- **Roughly 12 new or extended API routes** (detail in Section 2).
- **Four new Prisma models** + ~8 new Trainer columns.
- **Zero changes to shipped Phase 1 code** except the `/t/[slug]` redirect stub — which becomes a real page.

### Testing strategy

Repo has no test framework. Verification for Phase 2 uses:
- `npx tsc --noEmit` — must be clean after each task
- `npm run build` — must compile
- Manual smoke per the implementation plan's per-task verification steps
- A final end-to-end manual pass through: directory → filter → profile → apply → accept agreement → edit profile → submit testimonial → upload transformation → admin approve → transformation shows live → public takedown → admin resolve

### Deferred to Phase 3 and later

- Self-service trainer signup (currently admin-only invites)
- Stripe Connect split payments
- Per-trainer email sender domains
- Star ratings / reviews
- Trainer-to-trainer messaging (currently only trainer↔client)
- Real lawyer-drafted agreement text (placeholder ships Phase 2; real one required within 30 days of first public trainer signup)
