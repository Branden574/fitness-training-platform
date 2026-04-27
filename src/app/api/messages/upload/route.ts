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
  const rawName = (file as { name?: string }).name ?? null;
  // Truncate to keep DB rows + push previews bounded. 200 chars is generous
  // for any realistic filename and well under any reasonable column width.
  const name = rawName ? rawName.slice(0, 200) : null;

  const validation = validateAttachment(intent, mime, size);
  if (!validation.ok) {
    const status = validation.kind === 'too-large' ? 413 : 400;
    return NextResponse.json({ error: validation.error }, { status });
  }

  // Pairing auth — same rules as POST /api/messages. Logic copied verbatim
  // from src/app/api/messages/route.ts so the two endpoints can't drift:
  // - Lookup uses the same select shape.
  // - Only `!receiver` triggers 404 (sender comes from a valid session).
  // - CLIENT must target their assigned trainer.
  // - TRAINER targeting a CLIENT must own that client; TRAINER↔ADMIN passes.
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { role: true, trainerId: true },
  });
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, role: true, trainerId: true },
  });

  if (!receiver) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
  }

  if (sender?.role === 'CLIENT') {
    if (sender.trainerId !== receiverId) {
      return NextResponse.json(
        { error: 'You can only message your assigned trainer' },
        { status: 403 },
      );
    }
  }

  if (sender?.role === 'TRAINER') {
    if (receiver.role === 'CLIENT' && receiver.trainerId !== senderId) {
      return NextResponse.json(
        { error: 'You can only message your assigned clients' },
        { status: 403 },
      );
    }
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
