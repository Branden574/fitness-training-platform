import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-data';
import { prisma } from '@/lib/prisma';

interface ExerciseDbItem {
  id?: string;
  name?: string;
  gifUrl?: string;
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: 'RAPIDAPI_KEY is not configured on the server.' },
      { status: 503 },
    );
  }

  const missing = await prisma.exercise.findMany({
    where: { OR: [{ imageUrl: null }, { imageUrl: '' }] },
    select: { id: true, name: true },
  });

  const results: {
    updated: number;
    skipped: number;
    failed: number;
    details: Array<{ id: string; name: string; status: 'updated' | 'skipped' | 'failed'; reason?: string; gifUrl?: string }>;
  } = { updated: 0, skipped: 0, failed: 0, details: [] };

  for (const ex of missing) {
    const name = (ex.name ?? '').trim();
    if (!name) {
      results.skipped++;
      results.details.push({ id: ex.id, name, status: 'skipped', reason: 'empty name' });
      continue;
    }

    try {
      const res = await fetch(
        `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(name.toLowerCase())}`,
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
          },
          cache: 'no-store',
        },
      );

      if (!res.ok) {
        results.failed++;
        results.details.push({ id: ex.id, name, status: 'failed', reason: `HTTP ${res.status}` });
        continue;
      }

      const raw = (await res.json()) as ExerciseDbItem[] | ExerciseDbItem;
      const items = Array.isArray(raw) ? raw : [raw];
      const lowered = name.toLowerCase();
      const exact = items.find((it) => (it.name ?? '').toLowerCase() === lowered);
      const match = exact ?? items[0];
      const gifUrl = match?.gifUrl?.trim();

      if (!gifUrl) {
        results.skipped++;
        results.details.push({ id: ex.id, name, status: 'skipped', reason: 'no match' });
        continue;
      }

      await prisma.exercise.update({
        where: { id: ex.id },
        data: { imageUrl: gifUrl },
      });
      results.updated++;
      results.details.push({ id: ex.id, name, status: 'updated', gifUrl });
    } catch (e) {
      results.failed++;
      results.details.push({
        id: ex.id,
        name,
        status: 'failed',
        reason: e instanceof Error ? e.message : 'unknown error',
      });
    }

    await new Promise((r) => setTimeout(r, 120));
  }

  return NextResponse.json({
    total: missing.length,
    updated: results.updated,
    skipped: results.skipped,
    failed: results.failed,
    details: results.details,
  });
}
