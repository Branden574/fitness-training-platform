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

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreMatch(target: string, candidate: string): number {
  const tTokens = new Set(tokenize(target));
  const cTokens = new Set(tokenize(candidate));
  if (tTokens.size === 0 || cTokens.size === 0) return 0;
  let shared = 0;
  for (const t of tTokens) if (cTokens.has(t)) shared++;
  const denom = Math.max(tTokens.size, cTokens.size);
  return shared / denom;
}

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

  let library: ExerciseDbItem[];
  try {
    const res = await fetch(
      'https://exercisedb.p.rapidapi.com/exercises?limit=1500',
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
        },
        cache: 'no-store',
      },
    );
    if (!res.ok) {
      return NextResponse.json(
        { message: `ExerciseDB fetch failed (${res.status})` },
        { status: 502 },
      );
    }
    const raw = (await res.json()) as ExerciseDbItem[] | ExerciseDbItem;
    library = Array.isArray(raw) ? raw : [raw];
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'ExerciseDB fetch error' },
      { status: 502 },
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
    details: Array<{
      id: string;
      name: string;
      status: 'updated' | 'skipped' | 'failed';
      reason?: string;
      matchedName?: string;
      score?: number;
      gifUrl?: string;
    }>;
  } = { updated: 0, skipped: 0, failed: 0, details: [] };

  for (const ex of missing) {
    const name = (ex.name ?? '').trim();
    if (!name) {
      results.skipped++;
      results.details.push({ id: ex.id, name, status: 'skipped', reason: 'empty name' });
      continue;
    }

    let best: { item: ExerciseDbItem; score: number } | null = null;
    for (const item of library) {
      const candidateName = item.name ?? '';
      if (!candidateName) continue;
      const score = scoreMatch(name, candidateName);
      if (!best || score > best.score) best = { item, score };
    }

    const threshold = 0.5;
    if (!best || best.score < threshold || !best.item.gifUrl) {
      results.skipped++;
      results.details.push({
        id: ex.id,
        name,
        status: 'skipped',
        reason: best
          ? `low score ${best.score.toFixed(2)} (closest: "${best.item.name ?? ''}")`
          : 'no library items',
        matchedName: best?.item.name,
        score: best?.score,
      });
      continue;
    }

    try {
      await prisma.exercise.update({
        where: { id: ex.id },
        data: { imageUrl: best.item.gifUrl },
      });
      results.updated++;
      results.details.push({
        id: ex.id,
        name,
        status: 'updated',
        matchedName: best.item.name,
        score: best.score,
        gifUrl: best.item.gifUrl,
      });
    } catch (e) {
      results.failed++;
      results.details.push({
        id: ex.id,
        name,
        status: 'failed',
        reason: e instanceof Error ? e.message : 'db error',
      });
    }
  }

  return NextResponse.json({
    libraryCount: library.length,
    total: missing.length,
    updated: results.updated,
    skipped: results.skipped,
    failed: results.failed,
    details: results.details,
  });
}
