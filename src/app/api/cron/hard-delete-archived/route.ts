// Nightly cron: hard-delete every archived account whose grace window has
// expired. Authenticated via CRON_SECRET bearer token (same pattern as the
// existing weekly-digest cron at src/app/api/cron/weekly-digest/route.ts).

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hardDeleteClient, hardDeleteCutoff } from '@/lib/clientArchival';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Auth via bearer token. CRON_SECRET is set in Railway env.
  const auth = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = hardDeleteCutoff();
  const candidates = await prisma.user.findMany({
    where: {
      archivedAt: { not: null, lt: cutoff },
    },
    select: { id: true },
  });

  let deletedCount = 0;
  const errors: Array<{ userId: string; message: string }> = [];

  for (const c of candidates) {
    try {
      await hardDeleteClient(c.id);
      deletedCount += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ userId: c.id, message });
      console.error(`[hard-delete-archived] failed for ${c.id}:`, err);
    }
  }

  return NextResponse.json({
    deletedCount,
    errorCount: errors.length,
    errors,
    cutoffIso: cutoff.toISOString(),
  });
}
