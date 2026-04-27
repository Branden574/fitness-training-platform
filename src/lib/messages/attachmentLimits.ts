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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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

export type ValidateResult =
  | { ok: true }
  | { ok: false; kind: 'unsupported' | 'empty' | 'too-large'; error: string };

/** Cheap validation usable on both client and server. */
export function validateAttachment(
  intent: AttachmentIntent,
  mime: string,
  size: number,
): ValidateResult {
  const spec = INTENT_SPEC[intent];
  if (!spec.mimes.has(mime)) {
    return { ok: false, kind: 'unsupported', error: `Unsupported file type for ${intent}` };
  }
  if (size <= 0) return { ok: false, kind: 'empty', error: 'File is empty' };
  if (size > spec.maxBytes) {
    return { ok: false, kind: 'too-large', error: `File too large (max ${spec.maxLabel})` };
  }
  return { ok: true };
}
