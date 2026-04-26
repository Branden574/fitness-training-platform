# Chat Attachments — Design

**Date:** 2026-04-26
**Status:** Spec — awaiting plan
**Roadmap position:** Spec 2 of 3 (workout-share → chat-attachments → AI features). Spec 1 shipped 2026-04-26 (commits `41df28a..e6115c1`).

## Problem

Today, every chat surface (`/client/messages` mobile + desktop, `/trainer/messages` mobile + desktop) renders a paperclip / plus icon next to the composer that does nothing. The product needs that button to actually attach things — photos for form-checks and progress shots, videos for movement review, voice notes for personal coach feedback, and PDFs for meal plans and waivers.

Spec 1 explicitly deferred the photo case ("photo attachment to the prefilled message — arrives for free when the chat-attachments spec lands"). This spec closes that gap and unlocks the broader set in one design.

## Goals

- All four attachment types work end-to-end on web, iOS, and Android (Capacitor WebView).
- Sender sees an optimistic message bubble immediately, with a progress indicator during upload.
- Recipient gets the existing chat push + bell notification, with an attachment-aware preview ("📷 Photo", "🎬 Video · 0:18", etc).
- The deferred Spec 1 case (workout-completion → "Tell your coach" with a photo) ships in this spec as a small additive bridge.
- Zero `--accept-data-loss` migrations on Railway. One additive `attachment Json?` column on `Message`, two additive `MessageType` enum values.
- Reuse existing R2 storage plumbing (`src/lib/storage.ts`). Reuse existing `dispatchNotification`. Reuse existing per-pairing auth in `POST /api/messages`.

## Non-goals (deferred)

- **Multi-attach per message** (sending 3 photos in one bubble). v2 — schema is JSON and migrates cleanly to a child table later.
- **Server-side video compression** (ffmpeg pipeline). v1 ships videos as-is up to 100 MB.
- **Server-side video poster extraction.** v1 relies on the browser's `<video preload="metadata">` to render the first frame. If this is bad in practice, add ffmpeg in v1.1.
- **Real-time waveform during voice recording.** v1 uses 10 fixed bars and a duration timer.
- **Resumable / chunked uploads.** v1 uses a single `POST` per upload. Failed uploads surface a retry pill.
- **Background upload across app suspend/foreground cycles.** Capacitor WebView aborts in-flight `fetch` on background. Out of scope.
- **Hold-to-record voice UX (iMessage style).** v1 is tap-to-start / tap-to-stop. Easier on web, more discoverable.
- **NSFW / content moderation hooks.** Deferred until external trainer growth makes this matter.

## Architecture

### Phasing

This spec describes one feature; the implementation plan executes in four phases that each push to main on their own:

| Phase | Ships | Approx effort |
|---|---|---|
| **2A — Photos + Files** | image and file attachments end-to-end (paperclip popover → pick → upload → bubble → lightbox or download) | ~2 sittings |
| **2B — Voice notes** | tap-to-record / tap-to-stop button, simple-bar playback bubble | ~1-2 sittings |
| **2C — Video** | video upload, inline `<video>` player, native poster | ~2-3 sittings |
| **2D — Workout-completion bridge** | "Add a photo + tell your coach" button on completion panel | ~half sitting |

Each phase is gated by manual smoke test before push. Pushing to main is the standard project convention (`feedback_work_style.md`).

### Schema

One additive column on `Message`, two additive enum values on `MessageType`. Both are nullable / additive so `npx prisma db push --skip-generate` deploys to Railway without `--accept-data-loss`.

```prisma
enum MessageType {
  TEXT
  IMAGE
  FILE
  VIDEO    // NEW
  VOICE    // NEW
}

model Message {
  // existing fields…
  type        MessageType @default(TEXT)
  fileUrl     String?     // existing — mirrors attachment.url for back-compat reads
  attachment  Json?       // NEW
  // existing fields…
}
```

`attachment` JSON shape (TS-side type only):

```ts
type MessageAttachment = {
  mime: string;            // "image/jpeg", "video/mp4", "audio/webm", "application/pdf"
  size: number;            // bytes
  name?: string;           // file: "Meal_Plan_Apr.pdf"
  durationSec?: number;    // video + voice
  width?: number;          // image + video
  height?: number;
  posterUrl?: string;      // video only, deferred to v1.1 (ffmpeg)
};
```

**Why JSON over per-column fields:** different types need different metadata. Matches the `Notification.metadata` pattern already in use. Trade-off: not queryable; we never need to query "all messages with images > 5 MB."

**Why not a `MessageAttachment` child table:** would future-proof multi-attach, but multi-attach is explicitly v2. Migrating from `Json?` to a child table later is a one-time job; doing it now adds joins to every read.

**`fileUrl` retention:** keep it in sync with `attachment.url` on every write so older readers (and the existing `Message.type === 'IMAGE'` paths if any) keep working.

### API surface

**1. `POST /api/messages/upload` — NEW.** Multipart endpoint that streams a single file to R2 and returns the metadata blob. Does not create a `Message` row.

```ts
// Request: multipart/form-data
//   file: Blob
//   intent: "image" | "video" | "voice" | "file"
//   receiverId: string
//
// Response 200:
//   { url, mime, size, name?, durationSec?, width?, height? }
//
// Errors:
//   400 — missing field, mime/intent mismatch, invalid receiver
//   403 — sender not paired with receiver (CLIENT can only upload toward own trainer; TRAINER toward own clients)
//   413 — over per-intent size limit
//   500 — R2 put failed
```

Per-intent constraints, enforced server-side:

| Intent | Allowed mime | Max size |
|---|---|---|
| `image` | `image/jpeg`, `image/png`, `image/webp`, `image/heic` | 10 MB |
| `video` | `video/mp4`, `video/webm`, `video/quicktime` | 100 MB |
| `voice` | `audio/webm`, `audio/mp4`, `audio/mpeg` | 10 MB |
| `file`  | `application/pdf`, `text/plain`, common docs (csv, xlsx, docx mime list) | 10 MB |

R2 keying: `messages/<senderId>/<yyyymmdd>/<cuid>.<ext>`. Sender-prefixed for ownership-by-key semantics; deletion later joins on the prefix.

Auth piggybacks the same pairing rules as `POST /api/messages` (client-only-to-trainer, trainer-only-to-assigned-client). Unauthorized = 403, not 404, so the UI can distinguish.

**2. `POST /api/messages` — EXTENDED.** Zod schema relaxes `content` from `min(1)` to allow empty content when `attachment` is present, and accepts the `attachment` field:

```ts
const messageSchema = z.object({
  receiverId: z.string(),
  content: z.string().default(''),
  type: z.enum(['TEXT', 'IMAGE', 'FILE', 'VIDEO', 'VOICE']).default('TEXT'),
  attachment: z.object({
    url: z.string().url(),
    mime: z.string(),
    size: z.number().int().positive(),
    name: z.string().optional(),
    durationSec: z.number().optional(),
    width: z.number().int().optional(),
    height: z.number().int().optional(),
  }).optional(),
}).refine(
  (m) => m.content.trim().length > 0 || !!m.attachment,
  'Message must have content or an attachment',
);
```

When `attachment` is present, the route writes `fileUrl = attachment.url` and persists the rest in `attachment`. Both stay in sync.

The `dispatchNotification` body for attachment messages is type-aware:
- `IMAGE` → `📷 Photo` (or `📷 Photo · {first 80 chars of content}` if caption)
- `VIDEO` → `🎬 Video · {durationSec}s`
- `VOICE` → `🎤 Voice note · {durationSec}s`
- `FILE` → `📎 {attachment.name}`

**Why two endpoints, not one multipart-everything:**
- Lets the UI show real upload progress decoupled from "send"
- Failed upload doesn't create a half-baked `Message` row
- Composer can show "uploading…" with a cancel button, then send the now-uploaded attachment when ready

### UI / UX

**Paperclip popover.** All four chat surfaces' paperclip / plus button becomes a popover trigger. Tapping it opens an action sheet with three rows:

```
📷  Photo or video        ← native picker, accept="image/*,video/*"
🎤  Voice note            ← starts recording inline
📎  File                  ← native picker, accept="application/pdf,…"
```

Three rows, four types: photo and video share the OS picker; the intent is inferred from the picked file's mime.

**Mobile**: action sheet slides up from the bottom (existing `mf-card` styling, `position: fixed; bottom: 0`).
**Desktop**: action popover anchored above the paperclip. Portals to `document.body` to escape `mf-card { overflow: hidden }` per `feedback_portal_dropdowns_in_cards.md`.

**Voice recording UX**:
- Composer flips to record mode: red pulsing dot, MM:SS timer, cancel `×`, send `▶`
- Cancel → discard, restore composer
- Send → upload + create message in one flow

**Send-state on attachment messages**:
1. User picks file → optimistic message bubble appears immediately with a thumbnail (image/video) or icon (file/voice)
2. Bubble has a thin progress bar overlay during upload
3. On upload success → `POST /api/messages` runs → bubble swaps to real id via SSE
4. On upload failure → red border + "Tap to retry" pill below the bubble; retry rerouts the file
5. On message-create failure (post-upload) → same retry pill, retry skips the upload (URL already present)

**Render — per type:**

| Type | Bubble |
|---|---|
| **Image** | Rounded thumbnail, max 240×320 mobile / 320×400 desktop, `object-fit: cover`. Tap → fullscreen lightbox (`MessagePhotoLightbox`). Pinch-zoom on mobile, click-outside dismiss on desktop. |
| **Video** | Same dims as image. `<video poster=…>` with center play overlay. Tap → swap to `<video controls>` inline. Native fullscreen via `controls` is enough. |
| **Voice** | Pill bubble: play/pause icon + 10 fixed bars + MM:SS duration. Sender uses `--mf-accent`, recipient `--mf-surface-2`. |
| **File** | Card row: file-type icon (PDF/DOCX/etc) + filename (truncate middle) + size. Tap → opens R2 URL in new tab. |

**Caption support**: an attachment message can optionally have text content. Composer shows a removable thumbnail above the text field; sent message renders attachment + text as a vertically-stacked group sharing one timestamp.

**New shared component**: `MessagePhotoLightbox` in `src/components/ui/mf/`. Used by both client and trainer chat surfaces.

### Capacitor / native considerations

The native iOS/Android shells wrap the same Next.js web (`project_app_store_path.md`). Attachments must work end-to-end inside the WebView.

**File picker**: `<input type="file">` works in WebView on both platforms. No Capacitor plugin needed for v1. The OS picker on iOS already includes "Take Photo or Video" so we get camera capture without `@capacitor/camera`.

**Voice recording — Path A (preferred)**: native `MediaRecorder` inside WebView. Requires:
- `NSMicrophoneUsageDescription` in `ios/App/App/Info.plist`
- `<uses-permission android:name="android.permission.RECORD_AUDIO" />` in `android/app/src/main/AndroidManifest.xml`
- `npx cap sync` after the manifest edits (per `feedback_capacitor_plugin_sync.md`)

**Voice recording — Path B (fallback)**: `@capacitor-community/voice-recorder` plugin. Only adopt if smoke-test of Path A breaks on a specific iOS version. The plan starts with Path A.

**Video upload over cellular**: hard 100 MB cap, blocked client-side before upload, re-checked server-side. No chunking in v1.

**Background upload**: not implemented. WebView aborts in-flight `fetch` on background. UI surfaces retry pill on failure.

**Lightbox pinch-zoom**: native iOS WebView supports pinch-zoom on `<img>` in `position: fixed` containers by default. Verify in smoke test; if broken, swap in `react-zoom-pan-pinch`.

### Phase 2D — Workout-completion bridge

Closes the deferred Spec-1 case. Three small additions, no new endpoints.

**1. Completion panel adds a third button** above the existing two:

```
[ 📷 Add a photo + tell your coach ]   ← NEW (2D)
[ Tell your coach ]                     ← Spec 1
[ Done ]                                ← Spec 1
```

The new button:
- Opens native photo/camera picker (`<input type="file" accept="image/*">`)
- On pick → uploads via `POST /api/messages/upload` with `intent=image`
- On upload success → navigates to `/client/messages?draft=…&attachmentUrl=…&attachmentMime=…&attachmentSize=…&attachmentWidth=…&attachmentHeight=…`
- On upload failure → toast, leave panel state intact

**2. Messages composer reads new query params.** Spec 1 already wired `?draft=`. 2D extends the same `prefillRanRef` effect to also read attachment params, hydrate a pending-attachment state, and `router.replace('/client/messages')` to clear the URL.

**3. Composer renders the pending attachment** as a removable thumbnail above the text field. On send, includes it in the `attachment` field of `POST /api/messages`. Uses the same `<PendingAttachmentChip>` component as the in-chat composer.

**Why query params over `sessionStorage`**: keeps the existing one-shot prefill pattern. Same guard, same cleanup, no new persistence layer. Total query string ~250 chars — well under any limit.

## Failure modes & error handling

| Failure | UI response | Recovery |
|---|---|---|
| Upload exceeds size cap | Toast "File too large (max 10 MB / 100 MB)" — blocked client-side, never hits server | User picks a smaller file |
| Upload network failure mid-flight | Optimistic bubble shows red border + "Tap to retry" pill | Retry re-uploads from the original picked Blob (held in component state until success) |
| Upload succeeds, `POST /api/messages` fails | Same red bubble + retry pill | Retry skips upload, sends the message with the already-uploaded URL |
| Mic permission denied (voice) | Toast "Microphone permission needed for voice notes" + link to settings | User must enable in OS settings |
| User backgrounds app mid-upload | Upload aborts, retry pill on resume | Tap retry |
| Unsupported mime | Server returns 400, toast "This file type isn't supported" | User picks a different file |
| R2 put failure | Server returns 500, toast "Upload failed, try again" | Retry pill |

## Testing strategy

The project has no automated test harness today. Each phase ends with a manual smoke checklist before push:
- 2A: client uploads photo to trainer; trainer uploads PDF to client; both render correctly; lightbox works on tap; trainer's bell + push fire with correct preview
- 2B: voice record + send + playback round-trip on Brave (web), Capacitor iOS, Capacitor Android
- 2C: video round-trip on the same three; native fullscreen works on iOS
- 2D: finish a workout, tap "Add a photo + tell your coach", verify composer prefills with both draft text and pending photo, send, verify trainer receives correctly

## Open questions

None blocking. Two open at v1 ship that don't gate this spec:
- **Server-side video poster extraction**: deferred to v1.1 if browser-native posters look bad
- **NSFW / moderation hooks**: deferred until external trainer growth makes this matter

## Files touched (preview, plan will enumerate)

**Created**
- `src/app/api/messages/upload/route.ts`
- `src/components/ui/mf/MessagePhotoLightbox.tsx`
- `src/components/ui/mf/AttachmentPicker.tsx` (the paperclip popover)
- `src/components/ui/mf/PendingAttachmentChip.tsx`
- `src/components/ui/mf/AttachmentBubble.tsx` (renders all four types in chat)

**Modified**
- `prisma/schema.prisma` — add `attachment Json?` column; add `VIDEO`, `VOICE` to `MessageType`
- `src/app/api/messages/route.ts` — Zod schema extension, attachment-aware push body
- `src/app/client/(v4)/messages/messages-client.tsx` — wire picker + bubble
- `src/app/client/(v4)/messages/messages-desktop.tsx` — wire picker + bubble
- `src/app/trainer/(v4)/messages/inbox-client.tsx` — wire picker + bubble
- `src/app/trainer/(v4)/messages/inbox-mobile.tsx` — wire picker + bubble
- `src/app/client/(v4)/workout/[sessionId]/active-workout-client.tsx` — 2D completion-panel button (mobile)
- `src/app/client/(v4)/workout/[sessionId]/active-workout-desktop.tsx` — 2D completion-panel button (desktop)
- `ios/App/App/Info.plist` — `NSMicrophoneUsageDescription` (2B)
- `android/app/src/main/AndroidManifest.xml` — `RECORD_AUDIO` permission (2B)
