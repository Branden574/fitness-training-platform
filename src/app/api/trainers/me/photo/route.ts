import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { sniffImage, IMAGE_EXT } from '@/lib/imageSniff';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get('photo');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 });
  }

  // Sniff magic bytes — client-supplied Content-Type is untrusted. Blocks
  // SVG + arbitrary bytes being written to public/uploads with an image
  // content-type.
  const bytes = await file.arrayBuffer();
  const kind = sniffImage(bytes);
  if (!kind) {
    return NextResponse.json(
      { error: 'File must be a real JPEG, PNG, GIF, or WebP image.' },
      { status: 400 },
    );
  }

  await ensureTrainerRow(session.user.id, prisma);

  const dir = path.join(process.cwd(), 'public', 'uploads', 'trainers', session.user.id);
  await mkdir(dir, { recursive: true });

  const { ext } = IMAGE_EXT[kind];
  const filename = `profile-${Date.now()}.${ext}`;
  const filepath = path.join(dir, filename);
  await writeFile(filepath, Buffer.from(bytes));

  const photoUrl = `/uploads/trainers/${session.user.id}/${filename}`;

  const trainer = await prisma.trainer.update({
    where: { userId: session.user.id },
    data: { photoUrl },
  });

  return NextResponse.json(
    { photoUrl: trainer.photoUrl },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
