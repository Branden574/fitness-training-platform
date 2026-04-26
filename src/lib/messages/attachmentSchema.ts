// src/lib/messages/attachmentSchema.ts
//
// Single source of truth for the shape of a chat attachment metadata blob.
// Used by:
//   - POST /api/messages/upload (response shape)
//   - POST /api/messages       (request body, attachment field)
//   - AttachmentBubble UI      (read-side typing of Message.attachment Json)
//
// The Prisma schema column is `attachment Json?` (no DB-level shape
// enforcement); this Zod schema is the contract everything else parses
// against, so renderers don't have to do unsafe `as` casts on Json reads.
//
// SHAPE-ONLY: this schema validates structure, not values. A 500 MB image
// parses cleanly. Server callers MUST also run `validateAttachment(intent,
// payload.mime, payload.size)` from `./attachmentLimits` after parsing —
// otherwise per-intent caps are silently bypassed.

import { z } from 'zod';

export const attachmentPayloadSchema = z.object({
  url: z.string().url(),
  mime: z.string(),
  size: z.number().int().positive(),
  name: z.string().nullable().optional(),
  durationSec: z.number().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  posterUrl: z.string().url().optional(),
});

export type AttachmentPayload = z.infer<typeof attachmentPayloadSchema>;
