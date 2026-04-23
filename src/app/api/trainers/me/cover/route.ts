import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';
import { sniffImage, IMAGE_EXT } from '@/lib/imageSniff';
import { putImage, deleteImage, keyFromPublicUrl } from '@/lib/storage';
import { guardUpload } from '@/lib/uploadGuard';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — covers are wider and higher resolution
const MAX_BODY = MAX_BYTES + 64 * 1024;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const blocked = await guardUpload(request, {
    scope: 'trainer-cover',
    userId: session.user.id,
    maxBodyBytes: MAX_BODY,
  });
  if (blocked) return blocked;

  const form = await request.formData();
  const file = form.get('cover');
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

  const { ext, mime } = IMAGE_EXT[kind];
  const filename = `cover-${Date.now()}.${ext}`;
  const key = `trainers/${session.user.id}/${filename}`;
  const coverImageUrl = await putImage({ key, body: bytes, contentType: mime });

  const oldKey = keyFromPublicUrl(trainerRow.coverImageUrl);
  if (oldKey) {
    deleteImage(oldKey).catch(() => {});
  }

  const trainer = await prisma.trainer.update({
    where: { userId: session.user.id },
    data: { coverImageUrl },
  });

  return NextResponse.json(
    { coverImageUrl: trainer.coverImageUrl },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await ensureTrainerRow(session.user.id, prisma);
  const existing = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: { coverImageUrl: true },
  });

  const oldKey = keyFromPublicUrl(existing?.coverImageUrl ?? null);
  if (oldKey) {
    deleteImage(oldKey).catch(() => {});
  }

  await prisma.trainer.update({
    where: { userId: session.user.id },
    data: { coverImageUrl: null },
  });

  return NextResponse.json({ ok: true });
}
