import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  // Accept any non-empty string + validate it's a real IANA zone below via
  // Intl.DateTimeFormat — cheaper than bundling an allowlist, and keeps the
  // server authoritative on what's accepted.
  timezone: z.string().min(1).max(100).optional(),
});

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid fields' },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.timezone !== undefined) {
    if (!isValidTimezone(parsed.data.timezone)) {
      return NextResponse.json(
        { error: 'Unrecognized timezone. Pick from the list.' },
        { status: 400 },
      );
    }
    data.timezone = parsed.data.timezone;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  return NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
