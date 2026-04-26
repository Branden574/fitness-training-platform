# Chat Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the no-op paperclip in every chat surface with a working attachment flow that supports photos, files, voice notes, and video — plus a workout-completion bridge that closes the deferred Spec-1 photo case.

**Architecture:** Single additive `attachment Json?` column on `Message`, two new `MessageType` enum values, one new `POST /api/messages/upload` endpoint that streams to R2 (existing `src/lib/storage.ts`), and four new shared UI primitives (`AttachmentPicker`, `AttachmentBubble`, `MessagePhotoLightbox`, `PendingAttachmentChip`) wired into all four chat surfaces. Voice via in-WebView `MediaRecorder` (no Capacitor plugin in v1).

**Tech Stack:** Next.js 16 App Router, Prisma 7, Zod, React, Tailwind, existing `dispatchNotification` (web-push + FCM + bell), R2 via `src/lib/storage.ts`, Capacitor 8 (iOS + Android shells), Server-Sent Events for chat realtime.

**Note on testing:** This project has no automated test harness today (per Spec 1's plan and the project's testing strategy). Each phase ends with a manual smoke checklist and a push to main. New pure helpers (mime sniffing, R2 keying) are written so unit tests slot in later if/when a harness lands.

**Phasing — each phase ships to main on its own:**

- **Phase 2A (Tasks 1–11):** schema + upload endpoint + UI primitives + photos & files end-to-end on all four chat surfaces.
- **Phase 2B (Tasks 12–14):** voice notes — native permissions, recorder UI, picker integration.
- **Phase 2C (Tasks 15–16):** video — picker mime extension, render path.
- **Phase 2D (Tasks 17–19):** workout-completion bridge — "Add a photo + tell your coach" button, query-param attachment handoff.

---

## File Structure

**Created:**

- `src/lib/messages/attachmentLimits.ts` — pure helper: per-intent allowed-mime sets, max-byte caps, mime→extension mapping. Used by both server (validation) and client (pre-upload guard).
- `src/app/api/messages/upload/route.ts` — `POST` route: multipart parser, auth check, mime/size validation, R2 put, metadata response.
- `src/components/ui/mf/AttachmentPicker.tsx` — paperclip-popover trigger and 3-row action sheet (Photo/Video, Voice, File). Hidden file inputs trigger native pickers; voice opens VoiceRecorder inline.
- `src/components/ui/mf/VoiceRecorder.tsx` — `MediaRecorder` UI (timer, cancel, send). Returns a Blob via callback.
- `src/components/ui/mf/PendingAttachmentChip.tsx` — composer-side preview before send (thumbnail/icon + remove `×`).
- `src/components/ui/mf/AttachmentBubble.tsx` — single component that renders all four bubble types (image/video/voice/file) based on `Message.type`.
- `src/components/ui/mf/MessagePhotoLightbox.tsx` — fullscreen image overlay rendered via portal.

**Modified:**

- `prisma/schema.prisma` — add `Message.attachment Json?`; add `VIDEO`, `VOICE` to `MessageType`.
- `src/lib/storage.ts` — add `putBlob` alias (cleaner naming for non-image uploads); `putImage` keeps working for existing callers.
- `src/app/api/messages/route.ts` — Zod schema extension, attachment-aware push body, `fileUrl` mirroring.
- `src/components/ui/mf/index.ts` — export the new primitives.
- `src/app/client/(v4)/messages/messages-client.tsx` — wire picker + bubble (mobile).
- `src/app/client/(v4)/messages/messages-desktop.tsx` — wire picker + bubble (desktop).
- `src/app/trainer/(v4)/messages/inbox-mobile.tsx` — wire picker + bubble.
- `src/app/trainer/(v4)/messages/inbox-client.tsx` — wire picker + bubble.
- `src/app/client/(v4)/workout/[sessionId]/active-workout-client.tsx` — Phase 2D button.
- `src/app/client/(v4)/workout/[sessionId]/active-workout-desktop.tsx` — Phase 2D button.
- `ios/App/App/Info.plist` — `NSMicrophoneUsageDescription` (Phase 2B).
- `android/app/src/main/AndroidManifest.xml` — `RECORD_AUDIO` permission (Phase 2B).

---

## Phase 2A — Photos + Files

## Task 1: Schema additions

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Open `prisma/schema.prisma` and locate `enum MessageType` (around line 817).**

Current contents:

```prisma
enum MessageType {
  TEXT
  IMAGE
  FILE
}
```

- [ ] **Step 2: Add `VIDEO` and `VOICE`.**

```prisma
enum MessageType {
  TEXT
  IMAGE
  FILE
  VIDEO
  VOICE
}
```

- [ ] **Step 3: Locate `model Message` (around line 574) and add the `attachment` column.**

Current relevant lines:

```prisma
  type       MessageType @default(TEXT)
  fileUrl    String?
  read       Boolean     @default(false)
```

Becomes:

```prisma
  type       MessageType @default(TEXT)
  fileUrl    String?
  attachment Json?
  read       Boolean     @default(false)
```

- [ ] **Step 4: Push the schema change.**

Run: `npx prisma db push --skip-generate`
Expected: `🚀 Your database is now in sync with your Prisma schema.` No `--accept-data-loss` because both changes are additive.

- [ ] **Step 5: Regenerate the Prisma client locally.**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client`.

- [ ] **Step 6: Type-check (skip `npm run build` if dev server is running per project memory).**

Run: `npx tsc --noEmit`
Expected: clean (no output).

- [ ] **Step 7: Commit.**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add attachment column + VIDEO/VOICE message types"
```

---

## Task 2: Pure helper for attachment limits and mime mapping

**Files:**

- Create: `src/lib/messages/attachmentLimits.ts`

- [ ] **Step 1: Create the file.**

```ts
// src/lib/messages/attachmentLimits.ts
//
// Pure helpers shared between the upload route (server-side validation) and
// the AttachmentPicker (client-side pre-flight guard). Keeping limits in a
// single file means the cap shown in error toasts can never drift from what
// the server enforces.

export type AttachmentIntent = 'image' | 'video' | 'voice' | 'file';

interface IntentSpec {
  /** Allowed MIME types for this intent. */
  mimes: ReadonlySet<string>;
  /** Max payload size in bytes. */
  maxBytes: number;
  /** Human-friendly cap label for error UI: "10 MB". */
  maxLabel: string;
}

const MB = 1024 * 1024;

export const INTENT_SPEC: Record<AttachmentIntent, IntentSpec> = {
  image: {
    mimes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
    maxBytes: 10 * MB,
    maxLabel: '10 MB',
  },
  video: {
    mimes: new Set(['video/mp4', 'video/webm', 'video/quicktime']),
    maxBytes: 100 * MB,
    maxLabel: '100 MB',
  },
  voice: {
    mimes: new Set(['audio/webm', 'audio/mp4', 'audio/mpeg']),
    maxBytes: 10 * MB,
    maxLabel: '10 MB',
  },
  file: {
    mimes: new Set([
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    ]),
    maxBytes: 10 * MB,
    maxLabel: '10 MB',
  },
};

/** Map a MIME type to a file extension (no leading dot). Falls back to `bin`. */
export function mimeToExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
  return map[mime] ?? 'bin';
}

export interface ValidateResult {
  ok: boolean;
  error?: string;
}

/** Cheap validation usable on both client and server. */
export function validateAttachment(
  intent: AttachmentIntent,
  mime: string,
  size: number,
): ValidateResult {
  const spec = INTENT_SPEC[intent];
  if (!spec.mimes.has(mime)) {
    return { ok: false, error: `Unsupported file type for ${intent}` };
  }
  if (size <= 0) return { ok: false, error: 'File is empty' };
  if (size > spec.maxBytes) {
    return { ok: false, error: `File too large (max ${spec.maxLabel})` };
  }
  return { ok: true };
}
```

- [ ] **Step 2: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add src/lib/messages/attachmentLimits.ts
git commit -m "feat(messages): attachment intent specs + mime/size validator"
```

---

## Task 3: Add `putBlob` to storage helper

**Files:**

- Modify: `src/lib/storage.ts`

- [ ] **Step 1: Open `src/lib/storage.ts` and find the `putImage` function (around line 87).**

- [ ] **Step 2: Add a `putBlob` export immediately after `putImage`.**

Insert this block after the closing `}` of `putImage` and before `export async function deleteImage`:

```ts
export interface PutBlobInput {
  /** Object key inside the bucket. e.g. "messages/<userId>/<yyyymmdd>/<cuid>.<ext>" */
  key: string;
  /** Raw bytes — pass an ArrayBuffer straight from file.arrayBuffer() */
  body: ArrayBuffer | Uint8Array | Buffer;
  /** Any MIME type — image, video, audio, application/pdf, etc. */
  contentType: string;
}

/**
 * Generic R2 put. Use this for non-image uploads (video, audio, PDF, etc.) so
 * call sites read clearly. `putImage` is retained for the existing image-only
 * callers that want a self-documenting name.
 */
export async function putBlob({
  key,
  body,
  contentType,
}: PutBlobInput): Promise<string> {
  return putImage({ key, body, contentType });
}
```

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/storage.ts
git commit -m "feat(storage): add putBlob alias for non-image uploads"
```

---

## Task 4: Build the upload endpoint

**Files:**

- Create: `src/app/api/messages/upload/route.ts`

- [ ] **Step 1: Create the route file.**

```ts
// src/app/api/messages/upload/route.ts
//
// Multipart upload endpoint. Streams a single file to R2 and returns the
// metadata blob — does not create a Message row. The chat composer then
// passes the returned URL/metadata to POST /api/messages to actually send
// the message. This split lets the UI show real upload progress and keeps
// failed uploads from creating half-baked Message rows.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { randomUUID } from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { putBlob } from '@/lib/storage';
import {
  INTENT_SPEC,
  mimeToExtension,
  validateAttachment,
  type AttachmentIntent,
} from '@/lib/messages/attachmentLimits';

export const runtime = 'nodejs';

const VALID_INTENTS: ReadonlySet<string> = new Set([
  'image',
  'video',
  'voice',
  'file',
]);

function todayStamp(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const senderId = session.user.id;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 });
  }

  const intentRaw = form.get('intent');
  const receiverId = form.get('receiverId');
  const file = form.get('file');

  if (typeof intentRaw !== 'string' || !VALID_INTENTS.has(intentRaw)) {
    return NextResponse.json({ error: 'Invalid intent' }, { status: 400 });
  }
  const intent = intentRaw as AttachmentIntent;

  if (typeof receiverId !== 'string' || !receiverId) {
    return NextResponse.json({ error: 'receiverId is required' }, { status: 400 });
  }

  // FormDataEntryValue is `string | File` in spec, but Railway Node 18
  // doesn't expose `File` as a global. Narrow by checking it's not a string.
  // Per project memory: never use `instanceof File` here.
  if (typeof file === 'string' || !file) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const mime = (file as Blob).type ?? '';
  const size = (file as Blob).size ?? 0;
  const name = (file as { name?: string }).name ?? null;

  const validation = validateAttachment(intent, mime, size);
  if (!validation.ok) {
    const status = validation.error?.includes('too large') ? 413 : 400;
    return NextResponse.json({ error: validation.error }, { status });
  }

  // Pairing auth — same rules as POST /api/messages.
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { role: true, trainerId: true },
  });
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, role: true, trainerId: true },
  });
  if (!receiver || !sender) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
  }
  if (sender.role === 'CLIENT' && sender.trainerId !== receiverId) {
    return NextResponse.json(
      { error: 'You can only message your assigned trainer' },
      { status: 403 },
    );
  }
  if (
    sender.role === 'TRAINER' &&
    receiver.role === 'CLIENT' &&
    receiver.trainerId !== senderId
  ) {
    return NextResponse.json(
      { error: 'You can only message your assigned clients' },
      { status: 403 },
    );
  }

  // Upload to R2.
  const ext = mimeToExtension(mime);
  const key = `messages/${senderId}/${todayStamp()}/${randomUUID()}.${ext}`;
  let url: string;
  try {
    const bytes = await (file as Blob).arrayBuffer();
    url = await putBlob({ key, body: bytes, contentType: mime });
  } catch (err) {
    console.error('[messages/upload] R2 put failed', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  return NextResponse.json({
    url,
    mime,
    size,
    name,
  });
}
```

- [ ] **Step 2: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Spot-check the auth flow against `src/app/api/messages/route.ts`.**

Open both files side-by-side. The pairing-rule blocks should match (CLIENT can only target their `trainerId`; TRAINER can only target their assigned clients). If they differ, copy the canonical version from `route.ts` into `upload/route.ts` so the rules can't drift.

- [ ] **Step 4: Commit.**

```bash
git add src/app/api/messages/upload/route.ts
git commit -m "feat(messages): POST /api/messages/upload — R2 multipart upload endpoint"
```

---

## Task 5: Extend `POST /api/messages` with attachment support

**Files:**

- Modify: `src/app/api/messages/route.ts`

- [ ] **Step 1: Replace the `messageSchema` Zod definition (around line 9).**

Current:

```ts
const messageSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1, 'Message cannot be empty'),
  type: z.enum(['TEXT', 'IMAGE', 'FILE']).default('TEXT'),
});
```

Replace with:

```ts
const attachmentSchema = z.object({
  url: z.string().url(),
  mime: z.string(),
  size: z.number().int().positive(),
  name: z.string().nullable().optional(),
  durationSec: z.number().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
});

const messageSchema = z
  .object({
    receiverId: z.string(),
    content: z.string().default(''),
    type: z.enum(['TEXT', 'IMAGE', 'FILE', 'VIDEO', 'VOICE']).default('TEXT'),
    attachment: attachmentSchema.optional(),
  })
  .refine(
    (m) => m.content.trim().length > 0 || !!m.attachment,
    { message: 'Message must have content or an attachment' },
  );
```

- [ ] **Step 2: In the `prisma.message.create` call (around line 145), persist the attachment.**

Current `data` object:

```ts
data: {
  senderId: session.user.id,
  receiverId: validatedData.receiverId,
  content: validatedData.content,
  type: validatedData.type,
},
```

Replace with:

```ts
data: {
  senderId: session.user.id,
  receiverId: validatedData.receiverId,
  content: validatedData.content,
  type: validatedData.type,
  ...(validatedData.attachment
    ? {
        fileUrl: validatedData.attachment.url,
        attachment: validatedData.attachment,
      }
    : {}),
},
```

- [ ] **Step 3: Build an attachment-aware push preview before the `dispatchNotification` call (around line 189).**

Current:

```ts
const preview =
  message.content.length > 120
    ? `${message.content.slice(0, 120)}…`
    : message.content;
```

Replace with:

```ts
function attachmentPreviewLabel(): string | null {
  if (!validatedData.attachment) return null;
  const dur =
    typeof validatedData.attachment.durationSec === 'number'
      ? `${Math.max(1, Math.round(validatedData.attachment.durationSec))}s`
      : null;
  switch (validatedData.type) {
    case 'IMAGE':
      return '📷 Photo';
    case 'VIDEO':
      return dur ? `🎬 Video · ${dur}` : '🎬 Video';
    case 'VOICE':
      return dur ? `🎤 Voice note · ${dur}` : '🎤 Voice note';
    case 'FILE':
      return `📎 ${validatedData.attachment.name ?? 'File'}`;
    default:
      return null;
  }
}

const attachmentLabel = attachmentPreviewLabel();
const textPreview =
  message.content.length > 120
    ? `${message.content.slice(0, 120)}…`
    : message.content;
const preview = attachmentLabel
  ? textPreview
    ? `${attachmentLabel} · ${textPreview}`
    : attachmentLabel
  : textPreview;
```

(The function is defined inline because it closes over `validatedData`. Pulling it into `src/lib/notifications/messagePreview.ts` is a nice future-cleanup but adds a file for one caller.)

- [ ] **Step 4: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit.**

```bash
git add src/app/api/messages/route.ts
git commit -m "feat(messages): accept attachment payload + attachment-aware push preview"
```

---

## Task 6: Build `AttachmentPicker` (paperclip popover)

**Files:**

- Create: `src/components/ui/mf/AttachmentPicker.tsx`

- [ ] **Step 1: Create the file.**

```tsx
// src/components/ui/mf/AttachmentPicker.tsx
//
// Paperclip-popover trigger. On tap, opens an action sheet with three rows:
// Photo or video (native picker), Voice note (inline recorder), File. The
// caller passes a `onPicked(intent, file)` for non-voice intents and a
// separate `onVoiceRequest()` to swap the composer into voice-record mode.

'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Mic, Paperclip, Plus } from 'lucide-react';
import type { AttachmentIntent } from '@/lib/messages/attachmentLimits';

export interface AttachmentPickerProps {
  onPicked: (intent: AttachmentIntent, file: File) => void;
  onVoiceRequest: () => void;
  /** Render the trigger as Paperclip (mobile) or Plus (desktop). Default Paperclip. */
  trigger?: 'paperclip' | 'plus';
  /** Optional className for the trigger button (sizing, color tweaks). */
  triggerClassName?: string;
  ariaLabel?: string;
}

export default function AttachmentPicker({
  onPicked,
  onVoiceRequest,
  trigger = 'paperclip',
  triggerClassName,
  ariaLabel = 'Attach',
}: AttachmentPickerProps) {
  const [open, setOpen] = useState(false);
  const photoVideoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function handlePhotoOrVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ''; // reset so picking the same file twice works
    setOpen(false);
    if (!f) return;
    const intent: AttachmentIntent = f.type.startsWith('video/') ? 'video' : 'image';
    onPicked(intent, f);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    setOpen(false);
    if (!f) return;
    onPicked('file', f);
  }

  const TriggerIcon = trigger === 'plus' ? Plus : Paperclip;

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className={triggerClassName ?? 'mf-btn mf-btn-ghost'}
        style={{ height: 36, width: 36, padding: 0 }}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <TriggerIcon size={16} />
      </button>

      <input
        ref={photoVideoRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handlePhotoOrVideo}
      />
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {open && (
        <div
          role="menu"
          className="mf-card"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            zIndex: 40,
            minWidth: 220,
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          }}
        >
          <PickerRow
            icon={<Camera size={16} />}
            label="Photo or video"
            onClick={() => photoVideoRef.current?.click()}
          />
          <PickerRow
            icon={<Mic size={16} />}
            label="Voice note"
            onClick={() => {
              setOpen(false);
              onVoiceRequest();
            }}
          />
          <PickerRow
            icon={<Paperclip size={16} />}
            label="File"
            onClick={() => fileRef.current?.click()}
          />
        </div>
      )}
    </div>
  );
}

function PickerRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="mf-fg"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        fontSize: 13,
        cursor: 'pointer',
        borderRadius: 6,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--mf-surface-2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <span className="mf-fg-mute">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
```

- [ ] **Step 2: Add the export to the mf primitives barrel.**

Open `src/components/ui/mf/index.ts` and add (in alphabetical-ish position with the other components):

```ts
export { default as AttachmentPicker } from './AttachmentPicker';
export type { AttachmentPickerProps } from './AttachmentPicker';
```

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add src/components/ui/mf/AttachmentPicker.tsx src/components/ui/mf/index.ts
git commit -m "feat(mf): AttachmentPicker — paperclip popover with 3 actions"
```

---

## Task 7: Build `MessagePhotoLightbox`

**Files:**

- Create: `src/components/ui/mf/MessagePhotoLightbox.tsx`

- [ ] **Step 1: Create the file.**

```tsx
// src/components/ui/mf/MessagePhotoLightbox.tsx
//
// Fullscreen image overlay rendered via a portal so it escapes mf-card
// overflow:hidden (per feedback_portal_dropdowns_in_cards.md). Click outside
// or press Escape to dismiss. Native pinch-zoom on iOS WebView is supported
// because the <img> sits in a fixed container without touch-action: none.

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface MessagePhotoLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function MessagePhotoLightbox({
  src,
  alt,
  onClose,
}: MessagePhotoLightboxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(255,255,255,0.12)',
          border: 'none',
          color: '#fff',
          borderRadius: 999,
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <X size={18} />
      </button>
      <img
        src={src}
        alt={alt ?? ''}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          userSelect: 'none',
        }}
      />
    </div>,
    document.body,
  );
}
```

- [ ] **Step 2: Add the export to the mf barrel.**

In `src/components/ui/mf/index.ts`:

```ts
export { default as MessagePhotoLightbox } from './MessagePhotoLightbox';
export type { MessagePhotoLightboxProps } from './MessagePhotoLightbox';
```

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add src/components/ui/mf/MessagePhotoLightbox.tsx src/components/ui/mf/index.ts
git commit -m "feat(mf): MessagePhotoLightbox — fullscreen image overlay"
```

---

## Task 8: Build `PendingAttachmentChip`

**Files:**

- Create: `src/components/ui/mf/PendingAttachmentChip.tsx`

- [ ] **Step 1: Create the file.**

```tsx
// src/components/ui/mf/PendingAttachmentChip.tsx
//
// Composer-side preview for an attachment that's been picked but not sent
// yet. Shows a thumbnail (image/video) or a typed icon (file/voice) plus
// filename, size, and a remove `×`.

'use client';

import { useEffect, useState } from 'react';
import { File, Mic, Video, X } from 'lucide-react';

export interface PendingAttachmentChipProps {
  /** Local Blob (the picked file or recorded voice). May be null if upload has already completed and only the URL is known. */
  blob?: Blob | null;
  /** R2 URL — set after upload succeeds, used as a fallback preview source. */
  url?: string | null;
  mime: string;
  size: number;
  name?: string | null;
  /** Upload progress 0..1, or undefined when not uploading. */
  progress?: number;
  onRemove: () => void;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PendingAttachmentChip({
  blob,
  url,
  mime,
  size,
  name,
  progress,
  onRemove,
}: PendingAttachmentChipProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (blob && (mime.startsWith('image/') || mime.startsWith('video/'))) {
      const obj = URL.createObjectURL(blob);
      setPreviewUrl(obj);
      return () => URL.revokeObjectURL(obj);
    }
    setPreviewUrl(null);
    return () => undefined;
  }, [blob, mime]);

  const isImage = mime.startsWith('image/');
  const isVideo = mime.startsWith('video/');
  const isVoice = mime.startsWith('audio/');

  const thumbSrc = previewUrl ?? (isImage ? url : null);

  return (
    <div
      className="mf-card"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        marginBottom: 8,
        maxWidth: 320,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 6,
          background: 'var(--mf-surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {isImage && thumbSrc ? (
          <img
            src={thumbSrc}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : isVideo ? (
          <Video size={18} className="mf-fg-mute" />
        ) : isVoice ? (
          <Mic size={18} className="mf-fg-mute" />
        ) : (
          <File size={18} className="mf-fg-mute" />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name ?? (isImage ? 'Photo' : isVideo ? 'Video' : isVoice ? 'Voice note' : 'File')}
        </div>
        <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
          {formatBytes(size)}
          {typeof progress === 'number' && progress < 1
            ? ` · ${Math.round(progress * 100)}%`
            : ''}
        </div>
        {typeof progress === 'number' && progress < 1 && (
          <div
            style={{
              marginTop: 4,
              height: 3,
              background: 'var(--mf-surface-2)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.round(progress * 100)}%`,
                height: '100%',
                background: 'var(--mf-accent)',
                transition: 'width 120ms ease',
              }}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Remove attachment"
        onClick={onRemove}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--mf-fg-mute)',
          padding: 4,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add the export to the mf barrel.**

```ts
export { default as PendingAttachmentChip } from './PendingAttachmentChip';
export type { PendingAttachmentChipProps } from './PendingAttachmentChip';
```

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add src/components/ui/mf/PendingAttachmentChip.tsx src/components/ui/mf/index.ts
git commit -m "feat(mf): PendingAttachmentChip — composer preview before send"
```

---

## Task 9: Build `AttachmentBubble`

**Files:**

- Create: `src/components/ui/mf/AttachmentBubble.tsx`

- [ ] **Step 1: Create the file.**

```tsx
// src/components/ui/mf/AttachmentBubble.tsx
//
// Single component that renders all four attachment-bubble shapes (image,
// video, voice, file) based on the message's `type` and the `attachment`
// JSON blob. Used by every chat surface so the rendering can't drift.

'use client';

import { useRef, useState } from 'react';
import { File as FileIcon, Pause, Play } from 'lucide-react';
import MessagePhotoLightbox from './MessagePhotoLightbox';

export interface AttachmentBubbleAttachment {
  url: string;
  mime: string;
  size: number;
  name?: string | null;
  durationSec?: number;
  width?: number;
  height?: number;
  posterUrl?: string;
}

export interface AttachmentBubbleProps {
  type: 'IMAGE' | 'VIDEO' | 'VOICE' | 'FILE';
  attachment: AttachmentBubbleAttachment;
  fromMe: boolean;
  /** Override the max thumbnail width for desktop. Default 240. */
  maxThumbWidth?: number;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function AttachmentBubble({
  type,
  attachment,
  fromMe,
  maxThumbWidth = 240,
}: AttachmentBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voicePlaying, setVoicePlaying] = useState(false);

  if (type === 'IMAGE') {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          style={{
            padding: 0,
            border: 'none',
            background: 'transparent',
            borderRadius: 10,
            overflow: 'hidden',
            cursor: 'zoom-in',
            display: 'block',
          }}
        >
          <img
            src={attachment.url}
            alt={attachment.name ?? 'Photo'}
            style={{
              maxWidth: maxThumbWidth,
              maxHeight: maxThumbWidth * 1.33,
              borderRadius: 10,
              display: 'block',
              objectFit: 'cover',
            }}
          />
        </button>
        {lightboxOpen && (
          <MessagePhotoLightbox
            src={attachment.url}
            alt={attachment.name ?? ''}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </>
    );
  }

  if (type === 'VIDEO') {
    return (
      <div
        style={{
          maxWidth: maxThumbWidth,
          borderRadius: 10,
          overflow: 'hidden',
          background: '#000',
        }}
      >
        {videoActive ? (
          <video
            src={attachment.url}
            controls
            autoPlay
            style={{ width: '100%', display: 'block' }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setVideoActive(true)}
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              position: 'relative',
              display: 'block',
              width: '100%',
            }}
          >
            <video
              src={attachment.url}
              poster={attachment.posterUrl}
              preload="metadata"
              style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  paddingLeft: 4,
                }}
              >
                <Play size={20} />
              </span>
            </span>
            {typeof attachment.durationSec === 'number' && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                }}
              >
                {formatDuration(attachment.durationSec)}
              </span>
            )}
          </button>
        )}
      </div>
    );
  }

  if (type === 'VOICE') {
    function toggleVoice() {
      if (!audioRef.current) {
        audioRef.current = new Audio(attachment.url);
        audioRef.current.addEventListener('ended', () => setVoicePlaying(false));
      }
      if (voicePlaying) {
        audioRef.current.pause();
        setVoicePlaying(false);
      } else {
        void audioRef.current.play();
        setVoicePlaying(true);
      }
    }
    const heights = [8, 14, 20, 12, 18, 10, 16, 8, 14, 6];
    return (
      <button
        type="button"
        onClick={toggleVoice}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 18,
          background: fromMe ? 'var(--mf-accent)' : 'var(--mf-surface-2)',
          color: fromMe ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
          border: 'none',
          minWidth: 200,
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {voicePlaying ? <Pause size={14} /> : <Play size={14} />}
        </span>
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          {heights.map((h, i) => (
            <span
              key={i}
              style={{
                width: 2,
                height: h,
                background: 'currentColor',
                opacity: 0.7,
                borderRadius: 1,
              }}
            />
          ))}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
          {typeof attachment.durationSec === 'number'
            ? formatDuration(attachment.durationSec)
            : '0:00'}
        </span>
      </button>
    );
  }

  // FILE
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: fromMe ? 'var(--mf-accent)' : 'var(--mf-surface-2)',
        color: fromMe ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
        textDecoration: 'none',
        minWidth: 220,
        maxWidth: 320,
      }}
    >
      <span
        style={{
          width: 36,
          height: 44,
          borderRadius: 4,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <FileIcon size={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {attachment.name ?? 'File'}
        </span>
        <span
          className="mf-font-mono"
          style={{ display: 'block', fontSize: 10, opacity: 0.7 }}
        >
          {formatBytes(attachment.size)}
        </span>
      </span>
    </a>
  );
}
```

- [ ] **Step 2: Add the export to the mf barrel.**

```ts
export { default as AttachmentBubble } from './AttachmentBubble';
export type {
  AttachmentBubbleProps,
  AttachmentBubbleAttachment,
} from './AttachmentBubble';
```

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add src/components/ui/mf/AttachmentBubble.tsx src/components/ui/mf/index.ts
git commit -m "feat(mf): AttachmentBubble — renders all 4 attachment types in chat"
```

---

## Task 10: Wire client mobile chat (`messages-client.tsx`)

**Files:**

- Modify: `src/app/client/(v4)/messages/messages-client.tsx`

- [ ] **Step 1: Extend the local `Message` interface to carry `type` and `attachment`.**

Find the existing interface (around line 8):

```ts
interface Message {
  id: string;
  content: string;
  fromMe: boolean;
  at: string;
}
```

Replace with:

```ts
import type { AttachmentBubbleAttachment } from '@/components/ui/mf';

interface Message {
  id: string;
  content: string;
  fromMe: boolean;
  at: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'VOICE';
  attachment?: AttachmentBubbleAttachment | null;
}
```

(Move the `import type` line to the top with the other `@/components/ui/mf` import — combine them: `import { Avatar, Chip, AttachmentPicker, AttachmentBubble, PendingAttachmentChip } from '@/components/ui/mf';` plus the `import type { AttachmentBubbleAttachment } from '@/components/ui/mf';`.)

- [ ] **Step 2: Update the SSE/poll mappers to forward the new fields.**

Find both places where the API response is mapped to `Message[]` (around lines 62 and 117). Each currently does:

```ts
.map((m) => ({
  id: m.id,
  content: m.content,
  fromMe: m.senderId === selfId,
  at: m.createdAt,
}))
```

Replace each with:

```ts
.map((m) => ({
  id: m.id,
  content: m.content,
  fromMe: m.senderId === selfId,
  at: m.createdAt,
  type: (m.type ?? 'TEXT') as Message['type'],
  attachment: (m.attachment ?? null) as AttachmentBubbleAttachment | null,
}))
```

Also widen the response type declaration at each call site to include `type` and `attachment`:

```ts
const data = (await res.json()) as Array<{
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  type?: string;
  attachment?: AttachmentBubbleAttachment | null;
}>;
```

(For the SSE handler, the corresponding `JSON.parse(evt.data)` also needs the wider shape.)

- [ ] **Step 3: Add pending-attachment state at the top of the component.**

Below the existing `const [draft, setDraft] = useState('');` line, add:

```ts
const [pending, setPending] = useState<{
  blob: Blob;
  mime: string;
  size: number;
  name: string | null;
  intent: 'image' | 'video' | 'voice' | 'file';
  durationSec?: number;
  width?: number;
  height?: number;
} | null>(null);
const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);
const [voiceMode, setVoiceMode] = useState(false);
```

- [ ] **Step 4: Replace `handleSend` so it uploads then posts.**

The full new function (replace the existing `handleSend`):

```ts
async function handleSend(e: React.FormEvent) {
  e.preventDefault();
  const content = draft.trim();
  if (!content && !pending) return;
  setSending(true);
  setError(null);

  let attachmentMeta:
    | {
        url: string;
        mime: string;
        size: number;
        name?: string | null;
        durationSec?: number;
        width?: number;
        height?: number;
      }
    | null = null;
  let outgoingType: Message['type'] = 'TEXT';

  if (pending) {
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append('intent', pending.intent);
      fd.append('receiverId', trainer.id);
      fd.append('file', pending.blob, pending.name ?? 'attachment');
      const upRes = await fetch('/api/messages/upload', {
        method: 'POST',
        body: fd,
      });
      if (!upRes.ok) {
        const err = (await upRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Upload failed');
      }
      const meta = (await upRes.json()) as {
        url: string;
        mime: string;
        size: number;
        name?: string | null;
      };
      attachmentMeta = {
        ...meta,
        durationSec: pending.durationSec,
        width: pending.width,
        height: pending.height,
      };
      outgoingType =
        pending.intent === 'image'
          ? 'IMAGE'
          : pending.intent === 'video'
            ? 'VIDEO'
            : pending.intent === 'voice'
              ? 'VOICE'
              : 'FILE';
      setUploadProgress(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setSending(false);
      setUploadProgress(undefined);
      return;
    }
  }

  const tempId = `temp-${Date.now()}`;
  setMessages((prev) => [
    ...prev,
    {
      id: tempId,
      content,
      fromMe: true,
      at: new Date().toISOString(),
      type: outgoingType,
      attachment: attachmentMeta as AttachmentBubbleAttachment | null,
    },
  ]);
  setDraft('');
  setPending(null);
  setUploadProgress(undefined);

  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId: trainer.id,
        content,
        type: outgoingType,
        attachment: attachmentMeta ?? undefined,
      }),
    });
    if (!res.ok) throw new Error('Could not send');
    await fetchFull();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Could not send');
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  } finally {
    setSending(false);
  }
}
```

- [ ] **Step 5: Render the pending chip above the composer and the attachment bubbles in the thread.**

Find the thread render block (around line 250 — `{g.items.map((m) => (`). Replace the bubble's content `<div>` (the one with `padding: '10px 14px'`) so it conditionally renders the attachment when `m.type !== 'TEXT'`. The simplest local change:

Find:

```tsx
<div
  style={{
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 14,
    lineHeight: 1.4,
    background: m.fromMe ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
    color: m.fromMe ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
    borderTopRightRadius: m.fromMe ? 4 : undefined,
    borderTopLeftRadius: m.fromMe ? undefined : 4,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }}
>
  {m.content}
</div>
```

Replace with:

```tsx
{m.type !== 'TEXT' && m.attachment ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <AttachmentBubble
      type={m.type as 'IMAGE' | 'VIDEO' | 'VOICE' | 'FILE'}
      attachment={m.attachment}
      fromMe={m.fromMe}
      maxThumbWidth={240}
    />
    {m.content && (
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 10,
          fontSize: 14,
          lineHeight: 1.4,
          background: m.fromMe ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
          color: m.fromMe ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {m.content}
      </div>
    )}
  </div>
) : (
  <div
    style={{
      padding: '10px 14px',
      borderRadius: 10,
      fontSize: 14,
      lineHeight: 1.4,
      background: m.fromMe ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
      color: m.fromMe ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
      borderTopRightRadius: m.fromMe ? 4 : undefined,
      borderTopLeftRadius: m.fromMe ? undefined : 4,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }}
  >
    {m.content}
  </div>
)}
```

- [ ] **Step 6: Replace the existing static paperclip with the picker, and render the pending chip.**

Find the composer form (around line 295) — replace the entire `<form onSubmit={handleSend}>` block with:

```tsx
<div style={{ flexShrink: 0 }}>
  {pending && (
    <div style={{ padding: '0 12px' }}>
      <PendingAttachmentChip
        blob={pending.blob}
        mime={pending.mime}
        size={pending.size}
        name={pending.name}
        progress={uploadProgress}
        onRemove={() => {
          setPending(null);
          setUploadProgress(undefined);
        }}
      />
    </div>
  )}
  <form
    onSubmit={handleSend}
    style={{
      borderTop: '1px solid var(--mf-hairline)',
      padding: '8px 12px',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}
  >
    <AttachmentPicker
      trigger="paperclip"
      onPicked={(intent, file) => {
        setPending({
          blob: file,
          mime: file.type,
          size: file.size,
          name: file.name,
          intent,
        });
      }}
      onVoiceRequest={() => setVoiceMode(true)}
    />
    <input
      className="mf-input"
      style={{ height: 40 }}
      placeholder={`Message ${(trainer.name ?? 'your coach').split(' ')[0]}…`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      disabled={sending}
    />
    <button
      type="submit"
      disabled={sending || (!draft.trim() && !pending)}
      className="mf-btn mf-btn-primary"
      style={{ height: 40, width: 40, padding: 0 }}
      aria-label="Send"
    >
      <Send size={16} />
    </button>
  </form>
</div>
```

(`Send` is already imported.)

The `voiceMode` state currently does nothing — Phase 2B wires it to a `<VoiceRecorder>` component. For Phase 2A, leave it as a no-op so the picker compiles, and remove the `Voice note` button click target client-side by gating the row in `AttachmentPicker`. **Actually**: keep the row in the picker; tapping it just sets `voiceMode = true` which the composer ignores in 2A. UX is "tapping voice does nothing yet" — acceptable for the in-flight phase. Final wiring lands in Task 14.

- [ ] **Step 7: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 8: Commit.**

```bash
git add "src/app/client/(v4)/messages/messages-client.tsx"
git commit -m "feat(messages): wire AttachmentPicker + AttachmentBubble (client mobile)"
```

---

## Task 11: Wire client desktop chat (`messages-desktop.tsx`)

**Files:**

- Modify: `src/app/client/(v4)/messages/messages-desktop.tsx`

- [ ] **Step 1: Mirror Task 10 in the desktop file.**

Apply the same five changes:

  1. Extend the local `Message` interface with `type` and `attachment` fields. Add `import type { AttachmentBubbleAttachment } from '@/components/ui/mf';` and merge the new components into the `@/components/ui/mf` import: `import { Avatar, Btn, Chip, ClientDesktopShell, StatusDot, AttachmentPicker, AttachmentBubble, PendingAttachmentChip } from '@/components/ui/mf';`
  2. Update the SSE/poll mappers (around lines 65 and 122) to forward `type` and `attachment`.
  3. Add `pending`, `uploadProgress`, `voiceMode` state.
  4. Replace `handleSend` with the upload-then-post version from Task 10. The only diff: the trainer-id reference is the same (`trainer.id`).
  5. Replace the bubble render block in `g.items.map` (note: desktop iterates `grouped.map` then `g.items.map`) with the `m.type !== 'TEXT' && m.attachment` conditional from Task 10. Pass `maxThumbWidth={320}` (desktop wider).
  6. Replace the composer `<form>` with the picker-aware version. Use `trigger="plus"` since desktop currently shows `<Plus size={14} />`. Render `<PendingAttachmentChip>` above the form.

- [ ] **Step 2: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add "src/app/client/(v4)/messages/messages-desktop.tsx"
git commit -m "feat(messages): wire AttachmentPicker + AttachmentBubble (client desktop)"
```

---

## Task 12: Wire trainer mobile inbox (`inbox-mobile.tsx`)

**Files:**

- Modify: `src/app/trainer/(v4)/messages/inbox-mobile.tsx`

- [ ] **Step 1: Apply the same five-change pattern from Task 10.**

Notes specific to this file:

- The local message type is `InboxMobileMessage` — extend it the same way.
- The receiver in this file is the *active client*, not a fixed trainer. The `handleSend` body should use `activeId` (or whatever the existing variable is) wherever Task 10 used `trainer.id`. Read the file's existing `handleSend` to find the field name; reuse it.
- The composer trigger is `Btn variant="ghost" icon={Paperclip}`. Replace that single button with `<AttachmentPicker trigger="paperclip" onPicked={...} onVoiceRequest={() => setVoiceMode(true)} />`.
- Maintain the existing day-divider grouping (added in commit `c0fa9f8`). The attachment-bubble swap goes inside the `g.items.map((m) => …)` loop, not at the top level.

- [ ] **Step 2: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add "src/app/trainer/(v4)/messages/inbox-mobile.tsx"
git commit -m "feat(messages): wire AttachmentPicker + AttachmentBubble (trainer mobile)"
```

---

## Task 13: Wire trainer desktop inbox (`inbox-client.tsx`)

**Files:**

- Modify: `src/app/trainer/(v4)/messages/inbox-client.tsx`

- [ ] **Step 1: Apply the same pattern as Task 12 (the trainer "desktop" view is rendered through this shared client component, see `inbox-desktop.tsx` wrapper).**

  - Receiver id is the active-conversation user id (the file uses `activeId`).
  - Use `trigger="paperclip"`, `maxThumbWidth={320}` for the bubble.
  - Day-divider grouping is preserved (also from `c0fa9f8`); the attachment swap is in the inner `g.items.map`.

- [ ] **Step 2: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add "src/app/trainer/(v4)/messages/inbox-client.tsx"
git commit -m "feat(messages): wire AttachmentPicker + AttachmentBubble (trainer desktop)"
```

---

## Task 14: Manual smoke test — Phase 2A — and push

**Files:** none modified.

- [ ] **Step 1: Confirm dev server is alive (start if needed, only if not already running).**

Run: `pgrep -af "next dev"`
If empty: `npm run dev`
If something is already running, **do not** also run `npm run build` (Turbopack collision per project memory).

- [ ] **Step 2: As a client account, send a photo to the assigned trainer.**

  1. Sign in as a test client. Open `/client/messages`.
  2. Tap paperclip → "Photo or video" → pick a photo from your library.
  3. Verify: pending chip appears above composer with thumbnail.
  4. Tap send. Verify the bubble appears in the thread, the chip clears, and the trainer's bell + push fire with preview "📷 Photo".
  5. Tap the photo bubble. Verify the lightbox opens, click outside / Escape dismiss it.

- [ ] **Step 3: As the trainer, send a PDF back to the client.**

  1. Sign in as the trainer in another browser session. Open `/trainer/messages`.
  2. Tap paperclip → "File" → pick a small PDF.
  3. Send. Verify file card renders with filename + size.
  4. As the client, refresh: file card visible. Tap → opens the PDF in a new tab.

- [ ] **Step 4: Verify caption support.**

  1. As either side, attach a photo, type "Check this out", send. Verify the bubble shows the photo above a text bubble in the same group, with a single timestamp.

- [ ] **Step 5: Verify size + type guards.**

  1. Attempt to attach a 50 MB image. Verify the toast surfaces "File too large (max 10 MB)".
  2. Attempt to attach a `.zip`. Verify it doesn't appear in the file picker (extension filter rejects it).

- [ ] **Step 6: Push.**

```bash
git push
```

Expected: pushes Tasks 1–13 to main. Railway picks up the deploy automatically.

- [ ] **Step 7: Update memory per the project convention.**

Append a one-line entry to `MEMORY.md` and a new file `project_chat_attachments_2a_shipped.md` summarizing photos+files end-to-end. Reference the commits and any open follow-ups (voice in 2B, video in 2C, completion bridge in 2D).

---

## Phase 2B — Voice notes

## Task 15: Native mic permissions + cap sync

**Files:**

- Modify: `ios/App/App/Info.plist`
- Modify: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Add `NSMicrophoneUsageDescription` to `Info.plist`.**

Inside the top-level `<dict>`, add:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Voice notes let you send your coach quick verbal feedback.</string>
```

- [ ] **Step 2: Add `RECORD_AUDIO` permission to `AndroidManifest.xml`.**

Inside `<manifest>`, alongside any existing `<uses-permission>` entries, add:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

- [ ] **Step 3: Run `npx cap sync` (per project memory).**

Run: `npx cap sync`
Expected: copies web assets to iOS + Android shells, propagates the permission descriptors.

- [ ] **Step 4: Commit.**

```bash
git add ios/App/App/Info.plist android/app/src/main/AndroidManifest.xml
git commit -m "feat(native): add mic permission for voice notes"
```

---

## Task 16: Build `VoiceRecorder` component

**Files:**

- Create: `src/components/ui/mf/VoiceRecorder.tsx`

- [ ] **Step 1: Create the file.**

```tsx
// src/components/ui/mf/VoiceRecorder.tsx
//
// Tap-to-start / tap-to-stop voice recording UI. Uses the browser's
// MediaRecorder API (works inside the Capacitor WebView with the right
// native permission). Returns a Blob + duration via onSend; calls onCancel
// to bail. The composer swaps to this component when the user taps "Voice
// note" in AttachmentPicker.

'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Send, X } from 'lucide-react';

export interface VoiceRecorderProps {
  onSend: (blob: Blob, durationSec: number) => void;
  onCancel: () => void;
}

function pickMime(): string {
  const candidates = ['audio/webm', 'audio/mp4', 'audio/mpeg'];
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  for (const m of candidates) {
    if ((MediaRecorder as unknown as { isTypeSupported?: (s: string) => boolean }).isTypeSupported?.(m)) {
      return m;
    }
  }
  return 'audio/webm';
}

export default function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const mime = pickMime();
        const rec = new MediaRecorder(stream, { mimeType: mime });
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.start();
        recorderRef.current = rec;
        startedAtRef.current = Date.now();
        setRecording(true);
        tickRef.current = setInterval(() => {
          setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 250);
      } catch (err) {
        setError(
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Microphone permission needed'
            : 'Could not start recording',
        );
      }
    }
    void start();
    return () => {
      cancelled = true;
      if (tickRef.current) clearInterval(tickRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') {
        try {
          rec.stop();
        } catch {
          // already stopped
        }
      }
      rec?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleSend() {
    const rec = recorderRef.current;
    if (!rec) return;
    if (tickRef.current) clearInterval(tickRef.current);
    const finalDuration = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
    rec.addEventListener(
      'stop',
      () => {
        const mime = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        onSend(blob, finalDuration);
      },
      { once: true },
    );
    try {
      rec.stop();
    } catch {
      // already stopped, fall through
    }
    rec.stream.getTracks().forEach((t) => t.stop());
  }

  function handleCancel() {
    if (tickRef.current) clearInterval(tickRef.current);
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        // already stopped
      }
    }
    rec?.stream.getTracks().forEach((t) => t.stop());
    onCancel();
  }

  if (error) {
    return (
      <div
        className="mf-card mf-chip-bad"
        style={{
          padding: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
        }}
      >
        <span>{error}</span>
        <button
          type="button"
          onClick={handleCancel}
          style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return (
    <div
      className="mf-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: '#ff3b30',
          animation: recording ? 'mf-pulse 1.2s ease-in-out infinite' : undefined,
        }}
      />
      <Mic size={16} className="mf-fg-mute" />
      <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}>
        {`${mm}:${String(ss).padStart(2, '0')}`}
      </span>
      <button
        type="button"
        onClick={handleCancel}
        aria-label="Cancel recording"
        className="mf-btn mf-btn-ghost"
        style={{ height: 32, width: 32, padding: 0 }}
      >
        <X size={14} />
      </button>
      <button
        type="button"
        onClick={handleSend}
        aria-label="Send voice note"
        className="mf-btn mf-btn-primary"
        style={{ height: 32, width: 32, padding: 0 }}
      >
        <Send size={14} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add a tiny pulse keyframe to `globals.css` (only if `mf-pulse` doesn't already exist).**

Search first:

```bash
grep -n "mf-pulse" src/app/globals.css
```

If empty, append to `src/app/globals.css`:

```css
@keyframes mf-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}
```

- [ ] **Step 3: Add the export to the mf barrel.**

```ts
export { default as VoiceRecorder } from './VoiceRecorder';
export type { VoiceRecorderProps } from './VoiceRecorder';
```

- [ ] **Step 4: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit.**

```bash
git add src/components/ui/mf/VoiceRecorder.tsx src/components/ui/mf/index.ts src/app/globals.css
git commit -m "feat(mf): VoiceRecorder — MediaRecorder with timer / cancel / send"
```

---

## Task 17: Wire `VoiceRecorder` into all four chat surfaces

**Files:**

- Modify: `src/app/client/(v4)/messages/messages-client.tsx`
- Modify: `src/app/client/(v4)/messages/messages-desktop.tsx`
- Modify: `src/app/trainer/(v4)/messages/inbox-mobile.tsx`
- Modify: `src/app/trainer/(v4)/messages/inbox-client.tsx`

- [ ] **Step 1: For each file, import `VoiceRecorder` from `@/components/ui/mf`.**

Add to the existing barrel import. Example for client mobile:

```ts
import {
  Avatar,
  Chip,
  AttachmentPicker,
  AttachmentBubble,
  PendingAttachmentChip,
  VoiceRecorder,
} from '@/components/ui/mf';
```

- [ ] **Step 2: Replace the no-op `voiceMode` branch with a render.**

In each file, in the composer wrapper added in Phase 2A, render the recorder when `voiceMode === true` *instead of* the form:

```tsx
{voiceMode ? (
  <div style={{ padding: '8px 12px' }}>
    <VoiceRecorder
      onSend={(blob, durationSec) => {
        setPending({
          blob,
          mime: blob.type || 'audio/webm',
          size: blob.size,
          name: 'voice-note',
          intent: 'voice',
          durationSec,
        });
        setVoiceMode(false);
      }}
      onCancel={() => setVoiceMode(false)}
    />
  </div>
) : (
  <>
    {pending && (
      <div style={{ padding: '0 12px' }}>
        <PendingAttachmentChip ... />
      </div>
    )}
    <form onSubmit={handleSend} ...>
      ...
    </form>
  </>
)}
```

The `<form>` and pending-chip JSX is what you wrote in Phase 2A — you're wrapping it in the conditional, not rewriting it.

- [ ] **Step 3: After `onSend` populates `pending`, the existing send flow (Task 10 step 4) handles upload+post.**

Verify `intent: 'voice'` flows through `handleSend` so the upload route receives the correct intent. The `outgoingType` ternary in `handleSend` already maps `voice → VOICE`; no change needed.

- [ ] **Step 4: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit.**

```bash
git add "src/app/client/(v4)/messages" "src/app/trainer/(v4)/messages"
git commit -m "feat(messages): wire VoiceRecorder into all chat surfaces"
```

---

## Task 18: Manual smoke test — Phase 2B — and push

**Files:** none modified.

- [ ] **Step 1: Smoke voice round-trip on web.**

  1. Sign in as a client in Brave. Open `/client/messages`.
  2. Tap paperclip → "Voice note". Confirm mic permission prompt; allow.
  3. Verify red pulsing dot + ticking timer. Speak for ~5 seconds.
  4. Tap send arrow. Verify pending chip with "voice-note" + bytes appears, upload runs, voice bubble renders.
  5. Tap voice bubble play button. Verify audio plays back. Tap pause. Verify it pauses.
  6. As the trainer, verify push notification preview is "🎤 Voice note · 5s".

- [ ] **Step 2: Smoke voice on Capacitor iOS.**

  1. `npx cap run ios` (or open in Xcode and run on a real device — the simulator's mic is unreliable).
  2. Repeat the round-trip from Step 1.
  3. First tap should trigger the iOS mic permission prompt; second-and-onward taps should not.

- [ ] **Step 3: Smoke voice on Capacitor Android.**

  1. `npx cap run android` on a real device.
  2. Repeat the round-trip.

- [ ] **Step 4: Smoke permission-denied path.**

  1. In iOS Settings → app → Microphone → off.
  2. Open the app, tap paperclip → "Voice note". Verify the error chip says "Microphone permission needed".

- [ ] **Step 5: Push.**

```bash
git push
```

- [ ] **Step 6: Update memory.**

Append a memory file `project_chat_attachments_2b_shipped.md` and a one-line entry to `MEMORY.md`.

---

## Phase 2C — Video

## Task 19: Verify and surface video through the existing picker

**Files:**

- Modify: `src/app/client/(v4)/messages/messages-client.tsx` (and the other three chat surfaces — same pattern)

- [ ] **Step 1: Confirm video already round-trips on the OS picker.**

The picker uses `accept="image/*,video/*"` (Task 6). The intent inference (`f.type.startsWith('video/') ? 'video' : 'image'`) routes correctly to the upload endpoint. The bubble already renders a video player (Task 9). So in principle, video already works after Phase 2A.

This task verifies nothing is missing and patches the gaps revealed by smoke testing.

- [ ] **Step 2: Add client-side guard for video size.**

Right where the picker calls `setPending`, add a pre-flight size check before stuffing the blob:

```ts
onPicked={(intent, file) => {
  // size guard mirrors INTENT_SPEC[intent].maxBytes — duplicating the check
  // client-side avoids a wasted upload + 413 round-trip.
  const maxByIntent: Record<typeof intent, number> = {
    image: 10 * 1024 * 1024,
    video: 100 * 1024 * 1024,
    voice: 10 * 1024 * 1024,
    file: 10 * 1024 * 1024,
  };
  if (file.size > maxByIntent[intent]) {
    setError(`File too large (max ${Math.round(maxByIntent[intent] / (1024 * 1024))} MB)`);
    return;
  }
  setPending({ ... });
}}
```

(Alternatively, factor `maxByIntent` into `attachmentLimits.ts` as `INTENT_SPEC[intent].maxBytes` — already there. Use that.)

Apply this change to all four chat surfaces (mobile + desktop, client + trainer).

- [ ] **Step 3: Probe the picked video for `durationSec`, `width`, `height` so the bubble shows the duration label.**

Add a one-shot helper at the top of each chat file (or factor into `src/lib/messages/probeMedia.ts` if you want to share it):

```ts
async function probeVideo(file: File): Promise<{ durationSec?: number; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.src = url;
    v.onloadedmetadata = () => {
      const out = {
        durationSec: Number.isFinite(v.duration) ? v.duration : undefined,
        width: v.videoWidth || undefined,
        height: v.videoHeight || undefined,
      };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
  });
}
```

In `onPicked`, await the probe before `setPending`:

```ts
onPicked={async (intent, file) => {
  // ...size guard from step 2...
  let probe: { durationSec?: number; width?: number; height?: number } = {};
  if (intent === 'video') probe = await probeVideo(file);
  setPending({
    blob: file,
    mime: file.type,
    size: file.size,
    name: file.name,
    intent,
    ...probe,
  });
}}
```

(For images, probing width/height is also nice — same trick with `<img>` instead of `<video>` — but optional for v1.)

- [ ] **Step 4: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit.**

```bash
git add "src/app/client/(v4)/messages" "src/app/trainer/(v4)/messages"
git commit -m "feat(messages): client-side size guard + video metadata probe"
```

---

## Task 20: Manual smoke test — Phase 2C — and push

**Files:** none modified.

- [ ] **Step 1: Smoke video round-trip on web.**

  1. Sign in as a client. Open `/client/messages`. Tap paperclip → "Photo or video" → pick a short MP4 (~5-15 s).
  2. Verify the pending chip shows the file name + size.
  3. Send. Verify the bubble appears with the poster (first frame) + play button overlay + duration badge.
  4. Tap play. Verify it plays inline with native controls.
  5. As the trainer, verify the push preview is "🎬 Video · {N}s".

- [ ] **Step 2: Smoke 100 MB upper bound.**

  1. Pick a >100 MB video. Verify the toast says "File too large (max 100 MB)" and no upload runs.

- [ ] **Step 3: Smoke iOS native fullscreen.**

  1. On a real iPhone via `npx cap run ios`, tap a video bubble. Tap inline controls' fullscreen button. Verify native fullscreen video controls take over.

- [ ] **Step 4: Push.**

```bash
git push
```

- [ ] **Step 5: Update memory.**

`project_chat_attachments_2c_shipped.md` + one-line `MEMORY.md` entry.

---

## Phase 2D — Workout-completion bridge

## Task 21: Add "Add a photo + tell your coach" button — mobile workout

**Files:**

- Modify: `src/app/client/(v4)/workout/[sessionId]/active-workout-client.tsx`

- [ ] **Step 1: Locate the completion panel JSX (added in Spec 1, commit `a7c9d67`).**

Search for `completedSummary` and find the block that renders the two `<Btn>` elements: "Tell your coach" and "Done".

- [ ] **Step 2: Insert a third button above the existing "Tell your coach" button.**

The new button + the supporting picker logic. Place a hidden `<input type="file" accept="image/*">` and a ref nearby:

```tsx
const photoInputRef = useRef<HTMLInputElement>(null);

async function handleAttachAndTell() {
  const file = photoInputRef.current?.files?.[0];
  if (!file) return;
  // Same client-side size guard pattern — 10 MB image cap.
  if (file.size > 10 * 1024 * 1024) {
    alert('Photo too large (max 10 MB)');
    return;
  }
  const fd = new FormData();
  fd.append('intent', 'image');
  fd.append('receiverId', initial.user?.trainerId ?? '');
  fd.append('file', file, file.name);
  let meta: { url: string; mime: string; size: number; name?: string | null };
  try {
    const res = await fetch('/api/messages/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    meta = (await res.json()) as { url: string; mime: string; size: number; name?: string | null };
  } catch {
    alert('Photo upload failed');
    return;
  }
  if (!completedSummary) return;
  const minutes = Math.max(1, Math.floor(completedSummary.durationMs / 60000));
  const draft = `Just finished ${completedSummary.workoutTitle} — ${completedSummary.completedSetCount} of ${completedSummary.totalSetCount} sets in ${minutes} min 💪`;
  const params = new URLSearchParams({
    draft,
    attachmentUrl: meta.url,
    attachmentMime: meta.mime,
    attachmentSize: String(meta.size),
  });
  if (meta.name) params.set('attachmentName', meta.name);
  router.push(`/client/messages?${params.toString()}`);
}
```

(`initial.user?.trainerId` may not be a current field on `initial`. Read the file first to see what's already plumbed; if `trainerId` isn't available, fetch it via a tiny `useEffect` from `/api/me` or add it to the existing server-side prefetch in `active-workout-server.tsx` / equivalent. The plan's smoke step in Task 23 will catch this.)

Render the new button + hidden input:

```tsx
<input
  ref={photoInputRef}
  type="file"
  accept="image/*"
  style={{ display: 'none' }}
  onChange={() => void handleAttachAndTell()}
/>
<Btn
  variant="primary"
  onClick={() => photoInputRef.current?.click()}
>
  📷 Add a photo + tell your coach
</Btn>
```

Place this above the existing "Tell your coach" button so the visual order is: photo+tell, plain tell, done.

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/client/(v4)/workout/[sessionId]/active-workout-client.tsx"
git commit -m "feat(workout): add-a-photo + tell-your-coach button (mobile)"
```

---

## Task 22: Mirror Task 21 on desktop workout

**Files:**

- Modify: `src/app/client/(v4)/workout/[sessionId]/active-workout-desktop.tsx`

- [ ] **Step 1: Apply the same change pattern from Task 21 to the desktop file.**

Identical logic. The completion panel UI exists on desktop too (commit `4133095`); insert the photo button above "Tell your coach" with the same handler.

- [ ] **Step 2: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add "src/app/client/(v4)/workout/[sessionId]/active-workout-desktop.tsx"
git commit -m "feat(workout): add-a-photo + tell-your-coach button (desktop)"
```

---

## Task 23: Extend messages composer prefill to read attachment query params

**Files:**

- Modify: `src/app/client/(v4)/messages/messages-client.tsx`
- Modify: `src/app/client/(v4)/messages/messages-desktop.tsx`

- [ ] **Step 1: Adjust the `pending` state type FIRST to allow a pre-uploaded URL with no blob.**

(This must come before the prefill changes below, otherwise Step 2 won't compile.)

The current type:

```ts
const [pending, setPending] = useState<{
  blob: Blob;
  mime: string;
  size: number;
  name: string | null;
  intent: 'image' | 'video' | 'voice' | 'file';
  durationSec?: number;
  width?: number;
  height?: number;
} | null>(null);
```

becomes:

```ts
const [pending, setPending] = useState<{
  blob: Blob | null;
  url?: string;
  mime: string;
  size: number;
  name: string | null;
  intent: 'image' | 'video' | 'voice' | 'file';
  durationSec?: number;
  width?: number;
  height?: number;
} | null>(null);
```

- [ ] **Step 2: Replace the existing `?draft=` one-shot effect with one that also reads attachment params.**

Find the existing prefill effect (added in Spec 1, commits `6b23770` / `e6115c1`):

```ts
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

Replace with:

```ts
const prefillRanRef = useRef(false);
useEffect(() => {
  if (prefillRanRef.current) return;
  prefillRanRef.current = true;
  const draftValue = searchParams?.get('draft');
  const aUrl = searchParams?.get('attachmentUrl');
  const aMime = searchParams?.get('attachmentMime');
  const aSize = searchParams?.get('attachmentSize');
  const aName = searchParams?.get('attachmentName');
  if (draftValue) setDraft(draftValue);
  if (aUrl && aMime && aSize) {
    // Phase 2D: completion-panel handoff. The blob isn't available (it was
    // uploaded by the source page), so we seed pending with `blob: null` and
    // a pre-known url. handleSend skips the upload step when pending.url is
    // present and just posts the message with the stored metadata.
    setPending({
      blob: null,
      mime: aMime,
      size: Number(aSize),
      name: aName,
      intent: 'image',
      url: aUrl,
    });
  }
  if (draftValue || aUrl) router.replace('/client/messages');
}, [searchParams, router]);
```

Also pass `url` to the chip so it can render the pre-uploaded image preview when `blob === null`. Update the existing `<PendingAttachmentChip>` JSX:

```tsx
<PendingAttachmentChip
  blob={pending.blob}
  url={pending.url ?? null}
  mime={pending.mime}
  size={pending.size}
  name={pending.name}
  progress={uploadProgress}
  onRemove={() => {
    setPending(null);
    setUploadProgress(undefined);
  }}
/>
```

- [ ] **Step 3: Update `handleSend` to skip the upload when `pending.url` is already set.**

Inside the `if (pending) { ... }` block of `handleSend`, before the FormData upload, short-circuit:

```ts
if (pending.url) {
  attachmentMeta = {
    url: pending.url,
    mime: pending.mime,
    size: pending.size,
    name: pending.name,
    durationSec: pending.durationSec,
    width: pending.width,
    height: pending.height,
  };
  outgoingType = 'IMAGE'; // 2D only ever pre-uploads images
} else {
  // ...existing FormData upload code...
}
```

Also: `PendingAttachmentChip` accepts `blob: Blob | null` already (per Task 8). When `blob === null`, it falls back to the `url` prop for image previews — already handled in the chip's `useEffect`.

- [ ] **Step 4: Type-check.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit.**

```bash
git add "src/app/client/(v4)/messages/messages-client.tsx" "src/app/client/(v4)/messages/messages-desktop.tsx"
git commit -m "feat(messages): seed composer from completion-panel attachment query params"
```

---

## Task 24: Manual smoke test — Phase 2D — and push

**Files:** none modified.

- [ ] **Step 1: Smoke the full Spec 1 + 2D round trip.**

  1. Sign in as a client. Start a workout. Complete a few sets. Hit FINISH (non-PR path).
  2. Verify the completion panel renders with three buttons: 📷 Add a photo, Tell your coach, Done.
  3. Tap "📷 Add a photo + tell your coach". Pick a photo.
  4. Verify upload runs — there's no visible progress on the panel itself, just a brief delay, then navigation to `/client/messages`.
  5. Verify the composer shows the pending photo above the prefilled "Just finished … 💪" draft.
  6. Verify the URL is `/client/messages` only (no `?attachment...` query string remaining).
  7. Tap send. Verify the photo + caption render in the thread; the trainer's bell + push fire with `📷 Photo · Just finished …`.

- [ ] **Step 2: Smoke the upload-failure path.**

  1. Pick an enormous (>10 MB) photo from the completion panel. Verify the alert "Photo too large (max 10 MB)" surfaces and the panel state is preserved (you can still tap "Tell your coach" or "Done").

- [ ] **Step 3: Smoke the no-trainer case.**

  1. Use a client account whose `trainerId` is null.
  2. Verify the photo button still appears but the upload returns 403 — surface the error gracefully (the existing `alert('Photo upload failed')` is acceptable for v1).

- [ ] **Step 4: Push.**

```bash
git push
```

- [ ] **Step 5: Update memory — mark the chat-attachments feature shipped end-to-end.**

Add `project_chat_attachments_shipped.md` with a summary of all four phases. Append a one-line entry to `MEMORY.md`. Optionally consolidate the per-phase notes from 2A/2B/2C into one final entry.

---

## Out of scope reminders

The following were explicitly deferred per the spec — do NOT add them in this plan:

- Multi-attach per message
- Server-side video compression / poster extraction
- Real-time waveform during voice recording
- Resumable / chunked uploads
- Background upload across app suspend/foreground
- Hold-to-record voice UX
- NSFW / content moderation hooks

These belong in later specs once v1 has shipped and we have data on which gaps actually matter.
