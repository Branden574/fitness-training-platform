import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimitAsync, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimitAsync(`specialties-suggest:${ip}`, {
    maxRequests: 30,
    windowSeconds: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const thresholdRaw = Number.parseInt(searchParams.get('threshold') ?? '1', 10);
  const minCount = Number.isFinite(thresholdRaw) && thresholdRaw > 0 ? thresholdRaw : 1;

  const rows = q
    ? await prisma.$queryRaw<Array<{ tag: string; count: bigint }>>`
        SELECT lower(s.tag) AS tag, COUNT(*) AS count
        FROM "trainers" t
        JOIN "users" u ON u.id = t."userId"
        , LATERAL unnest(t.specialties) AS s(tag)
        WHERE u."trainerIsPublic" = true
          AND lower(s.tag) LIKE ${q + '%'}
        GROUP BY lower(s.tag)
        HAVING COUNT(*) >= ${minCount}
        ORDER BY count DESC, tag ASC
        LIMIT 20
      `
    : await prisma.$queryRaw<Array<{ tag: string; count: bigint }>>`
        SELECT lower(s.tag) AS tag, COUNT(*) AS count
        FROM "trainers" t
        JOIN "users" u ON u.id = t."userId"
        , LATERAL unnest(t.specialties) AS s(tag)
        WHERE u."trainerIsPublic" = true
        GROUP BY lower(s.tag)
        HAVING COUNT(*) >= ${minCount}
        ORDER BY count DESC, tag ASC
        LIMIT 20
      `;

  return NextResponse.json({
    suggestions: rows.map((r) => ({ tag: r.tag, count: Number(r.count) })),
  });
}
