import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { sniffImage, IMAGE_EXT } from '@/lib/imageSniff';

// Upload progress photos for a specific date
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const date = formData.get('date') as string;
    const entryId = formData.get('entryId') as string;
    const files = formData.getAll('photos') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }

    // Size gate only — real validation is magic-byte sniffing below. Client
    // Content-Type is spoofable in multipart uploads, so checking file.type
    // alone would let an attacker store arbitrary bytes as image/jpeg.
    const maxSize = 10 * 1024 * 1024; // 10MB
    for (const file of files) {
      if (file.size > maxSize) {
        return NextResponse.json({ error: 'File too large. Max 10MB per photo.' }, { status: 400 });
      }
    }

    // Create uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'progress', session.user.id);
    await mkdir(uploadsDir, { recursive: true });

    // Save files — sniff magic bytes first, reject anything that isn't a
    // real image, derive extension from the sniffed kind (never from the
    // user-controlled file.name or file.type).
    const photoUrls: string[] = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const kind = sniffImage(bytes);
      if (!kind) {
        return NextResponse.json(
          { error: 'Each file must be a real JPEG, PNG, GIF, or WebP image.' },
          { status: 400 },
        );
      }
      const { ext } = IMAGE_EXT[kind];
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filepath = path.join(uploadsDir, filename);
      await writeFile(filepath, Buffer.from(bytes));
      photoUrls.push(`/uploads/progress/${session.user.id}/${filename}`);
    }

    // Update the progress entry's photos field
    if (entryId) {
      const entry = await prisma.progressEntry.findFirst({
        where: { id: entryId, userId: session.user.id },
      });

      if (entry) {
        const existingPhotos = (entry.photos as string[] | null) || [];
        await prisma.progressEntry.update({
          where: { id: entryId },
          data: { photos: [...existingPhotos, ...photoUrls] },
        });
      }
    }

    return NextResponse.json({ photos: photoUrls });
  } catch (error) {
    console.error('Progress photo upload error:', error);
    return NextResponse.json({ error: 'Failed to upload photos' }, { status: 500 });
  }
}

// Get progress photos for a user (optionally filtered by date range)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    // Determine user ID (trainer can view client photos)
    let userId = session.user.id;
    if (session.user.role === 'TRAINER' && clientId) {
      const client = await prisma.user.findFirst({
        where: { id: clientId, trainerId: session.user.id },
      });
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
      userId = clientId;
    }

    // Get entries that have photos
    const entriesWithPhotos = await prisma.progressEntry.findMany({
      where: {
        userId,
        NOT: { photos: { equals: Prisma.DbNull } },
      },
      select: {
        id: true,
        date: true,
        photos: true,
        weight: true,
        notes: true,
      },
      orderBy: { date: 'desc' },
      take: 50,
    });

    // Filter out entries where photos is empty array or null
    const withPhotos = entriesWithPhotos.filter(e => {
      const photos = e.photos as string[] | null;
      return photos && photos.length > 0;
    });

    return NextResponse.json({ entries: withPhotos });
  } catch (error) {
    console.error('Error fetching progress photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}
