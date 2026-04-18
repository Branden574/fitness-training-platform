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

function stem(t: string): string {
  if (t.length > 3 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
  if (t.length > 3 && t.endsWith('es')) return t.slice(0, -2);
  if (t.length > 2 && t.endsWith('s')) return t.slice(0, -1);
  if (t.length > 3 && t.endsWith('ing')) return t.slice(0, -3);
  return t;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(stem);
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

async function resolveGifUrl(
  item: ExerciseDbItem,
  apiKey: string,
): Promise<string | null> {
  if (item.gifUrl && item.gifUrl.trim()) return item.gifUrl.trim();
  const id = item.id;
  if (!id) return null;
  try {
    const res = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises/exercise/${encodeURIComponent(id)}`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
        },
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as ExerciseDbItem;
    return data.gifUrl?.trim() || null;
  } catch {
    return null;
  }
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

  const BODY_PARTS = [
    'back',
    'cardio',
    'chest',
    'lower arms',
    'lower legs',
    'neck',
    'shoulders',
    'upper arms',
    'upper legs',
    'waist',
  ];

  const library: ExerciseDbItem[] = [];
  const seen = new Set<string>();
  const fetchErrors: string[] = [];

  const PAGE_SIZE = 10;
  const MAX_PAGES_PER_BP = 40;
  for (const bp of BODY_PARTS) {
    let offset = 0;
    let pages = 0;
    for (;;) {
      if (pages >= MAX_PAGES_PER_BP) break;
      pages++;
      try {
        const res = await fetch(
          `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${encodeURIComponent(
            bp,
          )}?limit=${PAGE_SIZE}&offset=${offset}`,
          {
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
            },
            cache: 'no-store',
          },
        );
        if (!res.ok) {
          fetchErrors.push(`${bp}@${offset}: HTTP ${res.status}`);
          break;
        }
        const raw = (await res.json()) as ExerciseDbItem[] | ExerciseDbItem;
        const items = Array.isArray(raw) ? raw : [raw];
        if (items.length === 0) break;
        let added = 0;
        for (const it of items) {
          const key = String(it.id ?? it.name ?? '');
          if (!key || seen.has(key)) continue;
          seen.add(key);
          library.push(it);
          added++;
        }
        if (items.length < PAGE_SIZE) break;
        // If an entire page returned only duplicates, bail out — stuck in a loop.
        if (added === 0) break;
        offset += items.length;
      } catch (e) {
        fetchErrors.push(`${bp}@${offset}: ${e instanceof Error ? e.message : 'unknown'}`);
        break;
      }
      await new Promise((r) => setTimeout(r, 80));
    }
  }

  if (library.length === 0) {
    return NextResponse.json(
      { message: 'ExerciseDB returned no library items', fetchErrors },
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

    const threshold = 0.34;

    // Fallback: if library match is too weak, try the per-name search endpoint.
    if (!best || best.score < threshold) {
      const queries: string[] = [];
      const tokens = tokenize(name);
      const lower = name.toLowerCase();
      if (lower) queries.push(lower);
      if (tokens.length >= 2) queries.push(tokens.slice(-2).join(' '));
      if (tokens.length >= 1) queries.push(tokens[tokens.length - 1]!);

      for (const q of queries) {
        try {
          const res = await fetch(
            `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(q)}`,
            {
              headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
              },
              cache: 'no-store',
            },
          );
          if (!res.ok) continue;
          const raw = (await res.json()) as ExerciseDbItem[] | ExerciseDbItem;
          const items = Array.isArray(raw) ? raw : [raw];
          for (const item of items) {
            const candidateName = item.name ?? '';
            if (!candidateName) continue;
            const score = scoreMatch(name, candidateName);
            if (!best || score > best.score) best = { item, score };
          }
          if (best && best.score >= threshold) break;
        } catch {
          // try next query
        }
        await new Promise((r) => setTimeout(r, 80));
      }
    }

    if (!best || best.score < threshold) {
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

    const gifUrl = await resolveGifUrl(best.item, apiKey);
    if (!gifUrl) {
      results.skipped++;
      results.details.push({
        id: ex.id,
        name,
        status: 'skipped',
        reason: `matched "${best.item.name ?? ''}" but no gifUrl returned by detail endpoint`,
        matchedName: best.item.name,
        score: best.score,
      });
      continue;
    }

    try {
      await prisma.exercise.update({
        where: { id: ex.id },
        data: { imageUrl: gifUrl },
      });
      results.updated++;
      results.details.push({
        id: ex.id,
        name,
        status: 'updated',
        matchedName: best.item.name,
        score: best.score,
        gifUrl,
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
    await new Promise((r) => setTimeout(r, 80));
  }

  const sampleLibraryItem = library[0] ?? null;
  let sampleDetail: unknown = null;
  if (sampleLibraryItem?.id) {
    try {
      const res = await fetch(
        `https://exercisedb.p.rapidapi.com/exercises/exercise/${encodeURIComponent(sampleLibraryItem.id)}`,
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
          },
          cache: 'no-store',
        },
      );
      if (res.ok) sampleDetail = await res.json();
    } catch {
      sampleDetail = null;
    }
  }

  return NextResponse.json({
    libraryCount: library.length,
    fetchErrors,
    total: missing.length,
    updated: results.updated,
    skipped: results.skipped,
    failed: results.failed,
    details: results.details,
    debug: {
      sampleLibraryItem,
      sampleDetail,
    },
  });
}
