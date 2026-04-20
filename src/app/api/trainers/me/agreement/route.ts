import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CURRENT_AGREEMENT_VERSION } from '@/lib/legal/agreement-text';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const agreement = await prisma.trainerAgreement.findUnique({
    where: { userId: session.user.id },
  });
  const accepted = agreement?.version === CURRENT_AGREEMENT_VERSION;

  return NextResponse.json(
    {
      currentVersion: CURRENT_AGREEMENT_VERSION,
      accepted,
      acceptedVersion: agreement?.version ?? null,
      acceptedAt: agreement?.acceptedAt ?? null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = request.headers.get('user-agent') ?? null;

  const agreement = await prisma.trainerAgreement.upsert({
    where: { userId: session.user.id },
    update: {
      version: CURRENT_AGREEMENT_VERSION,
      acceptedAt: new Date(),
      ipAddress,
      userAgent,
    },
    create: {
      userId: session.user.id,
      version: CURRENT_AGREEMENT_VERSION,
      ipAddress,
      userAgent,
    },
  });

  return NextResponse.json(
    {
      acceptedVersion: agreement.version,
      acceptedAt: agreement.acceptedAt,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
