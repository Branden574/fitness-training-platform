import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { sniffImage, IMAGE_EXT } from '@/lib/imageSniff';

// Lets trainers upload a custom exercise image instead of relying on
// free-exercise-db matches. Returns a relative URL the New Exercise modal
// (and the edit modal) stuff into `imageUrl` on the Exercise row.
//
// Magic-byte validation — same pattern as trainers/me/photo — so a spoofed
// Content-Type can't drop an SVG-with-script into public/uploads.

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get('image');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  // 10MB ceiling — exercise GIFs can be chunky (2-4MB for a full rep loop).
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File too large (max 10 MB)' },
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

  const dir = path.join(process.cwd(), 'public', 'uploads', 'exercises');
  await mkdir(dir, { recursive: true });

  const { ext } = IMAGE_EXT[kind];
  const filename = `${Date.now()}-${nanoid(8)}.${ext}`;
  const filepath = path.join(dir, filename);
  await writeFile(filepath, Buffer.from(bytes));

  const imageUrl = `/uploads/exercises/${filename}`;
  return NextResponse.json(
    { imageUrl },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
