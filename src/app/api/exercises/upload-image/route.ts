import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';
import { sniffImage, IMAGE_EXT } from '@/lib/imageSniff';
import { putImage } from '@/lib/storage';
import { guardUpload } from '@/lib/uploadGuard';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — exercise GIFs are chunky
const MAX_BODY = MAX_BYTES + 64 * 1024;

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
  const blocked = guardUpload(request, {
    scope: 'exercise-image',
    userId: session.user.id,
    maxBodyBytes: MAX_BODY,
  });
  if (blocked) return blocked;

  const form = await request.formData();
  const file = form.get('image');
  // Avoid `instanceof File` — File is not a runtime global on Node 18.
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
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
