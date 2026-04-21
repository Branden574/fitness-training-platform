import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function parseLocal(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export async function POST(request: NextRequest) {
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
      { error: 'Invalid dates' },
      { status: 400 },
    );
  }

  const fromStart = parseLocal(parsed.data.fromDate);
  const fromEnd = new Date(fromStart);
  fromEnd.setDate(fromStart.getDate() + 1);
  const toStart = parseLocal(parsed.data.toDate);
  const toEnd = new Date(toStart);
  toEnd.setDate(toStart.getDate() + 1);

  // Guard: refuse to copy into a day that already has entries to prevent
  // accidental double-logging on repeat taps. User can delete existing entries
  // if they truly want to overwrite.
  const existing = await prisma.foodEntry.count({
    where: {
      userId: session.user.id,
      date: { gte: toStart, lt: toEnd },
    },
  });
  if (existing > 0) {
    return NextResponse.json(
      {
        error: 'Target day already has entries. Delete them first, or pick an empty day.',
      },
      { status: 409 },
    );
  }

  const source = await prisma.foodEntry.findMany({
    where: {
      userId: session.user.id,
      date: { gte: fromStart, lt: fromEnd },
    },
    orderBy: [{ mealType: 'asc' }, { createdAt: 'asc' }],
  });

  if (source.length === 0) {
    return NextResponse.json(
      { error: 'No entries found on the source day to copy.' },
      { status: 404 },
    );
  }

  // Set each new entry's `date` to the target day at midnight local. Bulk
  // createMany is fast and transactional enough for this — no related rows to
  // worry about (FoodEntry is flat).
  const created = await prisma.foodEntry.createMany({
    data: source.map((e) => ({
      userId: e.userId,
      foodName: e.foodName,
      quantity: e.quantity,
      unit: e.unit,
      calories: e.calories,
      protein: e.protein,
      carbs: e.carbs,
      fat: e.fat,
      mealType: e.mealType,
      date: toStart,
      notes: e.notes,
      foodId: e.foodId,
    })),
  });

  return NextResponse.json(
    { copied: created.count, toDate: parsed.data.toDate },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
