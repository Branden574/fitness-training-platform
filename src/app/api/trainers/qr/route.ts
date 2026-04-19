import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerIdentity } from '@/lib/trainerIdentity';
import QRCode from 'qrcode';

const QR_OPTIONS = {
  margin: 1,
  width: 512,
  color: {
    dark: '#FF4D1C',
    light: '#0A0A0B',
  },
} as const;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await ensureTrainerIdentity(session.user.id, prisma);

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') === 'svg' ? 'svg' : 'png';
  const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || request.nextUrl.origin;
  const url = `${origin}/apply/${slug}`;

  if (format === 'svg') {
    const svg = await QRCode.toString(url, { ...QR_OPTIONS, type: 'svg' });
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="mf-${slug}.svg"`,
        'Cache-Control': 'private, max-age=0, no-cache',
      },
    });
  }

  const buffer = await QRCode.toBuffer(url, QR_OPTIONS);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="mf-${slug}.png"`,
      'Cache-Control': 'private, max-age=0, no-cache',
    },
  });
}
