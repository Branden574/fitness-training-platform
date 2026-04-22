import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';
import { sniffImage, IMAGE_EXT } from '@/lib/imageSniff';
import { putImage } from '@/lib/storage';

// Lets trainers upload a custom exercise image instead of relying on
// free-exercise-db matches. Returns a public URL the New Exercise modal
// (and the edit modal) stuff into `imageUrl` on the Exercise row.
//
// Magic-byte validation — same pattern as trainers/me/photo — so a spoofed
// Content-Type can't drop an SVG-with-script into the uploads bucket.

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

  const { ext, mime } = IMAGE_EXT[kind];
  const key = `exercises/${Date.now()}-${nanoid(8)}.${ext}`;
  const imageUrl = await putImage({ key, body: bytes, contentType: mime });

  return NextResponse.json(
    { imageUrl },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
