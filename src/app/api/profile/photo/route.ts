import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sniffImage, IMAGE_EXT } from '@/lib/imageSniff';
import { putImage, deleteImage, keyFromPublicUrl } from '@/lib/storage';

// Lets any authenticated user (client, trainer, admin) upload a profile
// picture stored on User.image. Trainers already have a richer
// /api/trainers/me/photo route that writes to Trainer.photoUrl — this is
// the plain-User version so clients have one to set, and it renders in the
// trainer roster avatar column + anywhere else User.image is shown.

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('photo');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File too large (max 5 MB)' },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const kind = sniffImage(bytes);
  if (!kind) {
    return NextResponse.json(
      { error: 'File must be a real JPEG, PNG, GIF, or WebP image.' },
      { status: 400 },
    );
  }

  // Need the existing User.image so we can clean up the old R2 object after
  // the upload succeeds. findUnique is cheap (single index lookup) and the
  // update below happens either way, so one extra round-trip is fine.
  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  const { ext, mime } = IMAGE_EXT[kind];
  const filename = `profile-${Date.now()}.${ext}`;
  const key = `users/${session.user.id}/${filename}`;
  const image = await putImage({ key, body: bytes, contentType: mime });

  // Prune the prior R2 object if there was one. Old /uploads/... paths
  // return null from keyFromPublicUrl and are skipped — they were already
  // wiped by Railway's ephemeral disk.
  const oldKey = keyFromPublicUrl(existing?.image ?? null);
  if (oldKey) {
    deleteImage(oldKey).catch(() => {});
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image },
  });

  return NextResponse.json(
    { image },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  const oldKey = keyFromPublicUrl(existing?.image ?? null);
  if (oldKey) {
    deleteImage(oldKey).catch(() => {});
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: null },
  });

  return NextResponse.json({ ok: true });
}
