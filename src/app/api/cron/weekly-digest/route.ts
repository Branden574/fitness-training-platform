// src/app/api/cron/weekly-digest/route.ts
//
// Sunday-evening cron entry. Authenticated via CRON_SECRET bearer token.
// Iterates trainers, computes each trainer's local week-start Sunday,
// builds the digest payload, persists to WeeklyDigest, sends the email.
// Idempotent across retries — @@unique([trainerId, weekStartIso]).

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildDigestPayload } from '@/lib/digest/buildDigestPayload';
import { sendWeeklyDigestEmail } from '@/lib/email/weeklyDigestTemplate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_TZ = 'America/Los_Angeles';

/** Compute the YYYY-MM-DD of the most recent Sunday in the given timezone, relative to `now`. */
function localSundayIso(now: Date, tz: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(now);
  const yearPart = parts.find((p) => p.type === 'year')!.value;
  const monthPart = parts.find((p) => p.type === 'month')!.value;
  const dayPart = parts.find((p) => p.type === 'day')!.value;
  const wkPart = parts.find((p) => p.type === 'weekday')!.value;
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const back = map[wkPart] ?? 0;
  const localDate = new Date(`${yearPart}-${monthPart}-${dayPart}T00:00:00Z`);
  localDate.setUTCDate(localDate.getUTCDate() - back);
  return localDate.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  // Auth via bearer token. CRON_SECRET is set in Railway env.
  const auth = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const trainers = await prisma.user.findMany({
    where: { role: 'TRAINER' },
    select: { id: true, email: true, name: true, timezone: true },
  });

  let processed = 0;
  let skippedExisting = 0;
  let errors = 0;

  for (const t of trainers) {
    try {
      const tz = t.timezone || DEFAULT_TZ;
      const weekStartIso = localSundayIso(now, tz);

      // Idempotency: skip if already generated for this week.
      const existing = await prisma.weeklyDigest.findUnique({
        where: { trainerId_weekStartIso: { trainerId: t.id, weekStartIso } },
        select: { id: true },
      });
      if (existing) {
        skippedExisting++;
        continue;
      }

      const payload = await buildDigestPayload(t.id, weekStartIso);
      if (payload.clients.length === 0) continue;

      await prisma.weeklyDigest.create({
        data: {
          trainerId: t.id,
          weekStartIso,
          payload: payload as unknown as object,
        },
      });

      void sendWeeklyDigestEmail({
        toEmail: t.email,
        toName: t.name,
        payload,
        appUrl: process.env.APP_URL ?? 'https://replab.com',
      });

      processed++;
    } catch (err) {
      errors++;
      console.error(`[cron/weekly-digest] trainer=${t.id} failed`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    skippedExisting,
    errors,
    trainerCount: trainers.length,
  });
}
