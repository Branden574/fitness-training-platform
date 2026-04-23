import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';
import { sniffImage, IMAGE_EXT } from '@/lib/imageSniff';
import { putImage, deleteImage, keyFromPublicUrl } from '@/lib/storage';
import { guardUpload } from '@/lib/uploadGuard';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_BODY = MAX_BYTES + 64 * 1024;
const MAX_GALLERY = 30;

// POST — upload a new image, append to the trainer's gallery array.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const blocked = await guardUpload(request, {
    scope: 'trainer-gallery',
    userId: session.user.id,
    maxBodyBytes: MAX_BODY,
  });
  if (blocked) return blocked;

  const form = await request.formData();
  const file = form.get('image');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 8 MB)' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const kind = sniffImage(bytes);
  if (!kind) {
    return NextResponse.json(
      { error: 'File must be a real JPEG, PNG, GIF, or WebP image.' },
      { status: 400 },
    );
  }

  const trainerRow = await ensureTrainerRow(session.user.id, prisma);
  if (trainerRow.gallery.length >= MAX_GALLERY) {
    return NextResponse.json(
      { error: `Gallery is full (max ${MAX_GALLERY} images)` },
      { status: 400 },
    );
  }

  const { ext, mime } = IMAGE_EXT[kind];
  const filename = `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const key = `trainers/${session.user.id}/${filename}`;
  const url = await putImage({ key, body: bytes, contentType: mime });

  const updated = await prisma.trainer.update({
    where: { userId: session.user.id },
    data: { gallery: [...trainerRow.gallery, url] },
    select: { gallery: true },
  });

  return NextResponse.json(
    { url, gallery: updated.gallery },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

// DELETE — remove a single gallery entry by URL (or label string).
// Body: { url: string }. Also deletes the R2 object when the URL is
// on our CDN.
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const target = body.url?.trim();
  if (!target) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  const trainerRow = await ensureTrainerRow(session.user.id, prisma);
  const next = trainerRow.gallery.filter((g) => g !== target);
  if (next.length === trainerRow.gallery.length) {
    return NextResponse.json(
      { error: 'Entry not found in gallery' },
      { status: 404 },
    );
  }

  const oldKey = keyFromPublicUrl(target);
  if (oldKey) {
    deleteImage(oldKey).catch(() => {});
  }

  const updated = await prisma.trainer.update({
    where: { userId: session.user.id },
    data: { gallery: next },
    select: { gallery: true },
  });

  return NextResponse.json(
    { gallery: updated.gallery },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
