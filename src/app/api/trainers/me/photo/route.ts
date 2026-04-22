import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';
import { sniffImage, IMAGE_EXT } from '@/lib/imageSniff';
import { putImage, deleteImage, keyFromPublicUrl } from '@/lib/storage';
import { guardUpload } from '@/lib/uploadGuard';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_BODY = MAX_BYTES + 64 * 1024; // slack for form headers

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const blocked = guardUpload(request, {
    scope: 'trainer-photo',
    userId: session.user.id,
    maxBodyBytes: MAX_BODY,
  });
  if (blocked) return blocked;

  const form = await request.formData();
  const file = form.get('photo');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 });
  }

  // Sniff magic bytes — client-supplied Content-Type is untrusted. Blocks
  // SVG + arbitrary bytes being written to R2 with an image content-type.
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
  const filename = `profile-${Date.now()}.${ext}`;
  const key = `trainers/${session.user.id}/${filename}`;
  const photoUrl = await putImage({ key, body: bytes, contentType: mime });

  // Remove the old R2 object if there was one. Old /uploads/... URLs from
  // pre-R2 uploads aren't on R2 — keyFromPublicUrl returns null for them
  // and we skip the delete. Any failure here is swallowed so a stale
  // object can't block a successful new upload.
  const oldKey = keyFromPublicUrl(trainerRow.photoUrl);
  if (oldKey) {
    deleteImage(oldKey).catch(() => {});
  }

  const trainer = await prisma.trainer.update({
    where: { userId: session.user.id },
    data: { photoUrl },
  });

  return NextResponse.json(
    { photoUrl: trainer.photoUrl },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
