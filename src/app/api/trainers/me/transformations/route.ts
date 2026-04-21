import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { sniffImage, IMAGE_EXT } from '@/lib/imageSniff';

async function savePhoto(
  file: File,
  trainerId: string,
  id: string,
  phase: 'before' | 'after',
): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('too_large');
  // Sniff magic bytes — client-supplied Content-Type is untrusted.
  const bytes = await file.arrayBuffer();
  const kind = sniffImage(bytes);
  if (!kind) throw new Error('invalid_type');
  const { ext } = IMAGE_EXT[kind];
  const dir = path.join(
    process.cwd(),
    'public',
    'uploads',
    'transformations',
    trainerId,
  );
  await mkdir(dir, { recursive: true });
  const filename = `${id}-${phase}.${ext}`;
  const filepath = path.join(dir, filename);
  await writeFile(filepath, Buffer.from(bytes));
  return `/uploads/transformations/${trainerId}/${filename}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const trainer = await ensureTrainerRow(session.user.id, prisma);
  const items = await prisma.trainerTransformation.findMany({
    where: { trainerId: trainer.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const trainer = await ensureTrainerRow(session.user.id, prisma);

  const form = await request.formData();
  const before = form.get('before');
  const after = form.get('after');
  const caption = (form.get('caption') ?? '').toString().slice(0, 200) || null;
  const durationRaw = form.get('durationWeeks');
  const durationWeeks =
    typeof durationRaw === 'string' && durationRaw.length > 0
      ? Math.max(0, Math.min(520, Number.parseInt(durationRaw, 10)))
      : null;

  if (!(before instanceof File) || !(after instanceof File)) {
    return NextResponse.json(
      { error: 'Both before and after photos required' },
      { status: 400 },
    );
  }

  const id = nanoid();
  try {
    const beforeUrl = await savePhoto(before, trainer.id, id, 'before');
    const afterUrl = await savePhoto(after, trainer.id, id, 'after');
    const created = await prisma.trainerTransformation.create({
      data: {
        id,
        trainerId: trainer.id,
        beforePhotoUrl: beforeUrl,
        afterPhotoUrl: afterUrl,
        caption,
        durationWeeks,
        status: 'PENDING',
      },
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === 'invalid_type') {
      return NextResponse.json(
        { error: 'Photos must be JPEG, PNG, or WebP' },
        { status: 400 },
      );
    }
    if ((error as Error).message === 'too_large') {
      return NextResponse.json({ error: 'Photo too large (max 5 MB)' }, { status: 400 });
    }
    throw error;
  }
}
