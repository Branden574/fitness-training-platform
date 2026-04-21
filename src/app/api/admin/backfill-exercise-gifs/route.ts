import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface ExerciseDbItem {
  id?: string;
  name?: string;
  gifUrl?: string;
  target?: string;
  bodyPart?: string;
  equipment?: string;
  secondaryMuscles?: string[] | string;
  instructions?: string[] | string;
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

async function searchByName(
  query: string,
  apiKey: string,
): Promise<ExerciseDbItem[]> {
  try {
    const res = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(query)}`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
        },
        cache: 'no-store',
      },
    );
    if (!res.ok) return [];
    const raw = (await res.json()) as ExerciseDbItem[] | ExerciseDbItem;
    return Array.isArray(raw) ? raw : [raw];
  } catch {
    return [];
  }
}

export async function POST() {
  // Trainer + admin can trigger — the Exercise table is a shared global
  // library, so filling GIFs benefits every coach on the platform. Clients
  // are excluded because they shouldn't be mutating the trainer library.
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'TRAINER')
  ) {
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

  if (missing.length === 0) {
    return NextResponse.json({
      updated: 0,
      skipped: 0,
      failed: 0,
      message: 'No exercises need GIFs.',
    });
  }

  // Per-exercise name search instead of the old "download the whole library
  // then fuzzy-match" approach — that was iterating 10 body parts × up to 40
  // pages (≈4000 items) with 80ms delays before doing any matching, so users
  // saw "Filling…" for minutes. For N missing exercises this is now ~N×3
  // fetches; typical case finishes in 10-30s.
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

  const MATCH_THRESHOLD = 0.34;

  for (const ex of missing) {
    const name = (ex.name ?? '').trim();
    if (!name) {
      results.skipped++;
      results.details.push({
        id: ex.id,
        name,
        status: 'skipped',
        reason: 'empty name',
      });
      continue;
    }

    // Build a few progressively broader search queries. Longer phrases first
    // so "barbell bench press" can hit an exact-ish match before the single
    // token "press" drowns in results.
    const tokens = tokenize(name);
    const queries: string[] = [];
    const lower = name.toLowerCase();
    if (lower) queries.push(lower);
    if (tokens.length >= 2) queries.push(tokens.slice(-2).join(' '));
    if (tokens.length >= 1) queries.push(tokens[tokens.length - 1]!);

    let best: { item: ExerciseDbItem; score: number } | null = null;
    for (const q of queries) {
      const items = await searchByName(q, apiKey);
      for (const item of items) {
        if (!item.gifUrl) continue; // No point matching if there's no GIF to apply
        const candidateName = item.name ?? '';
        if (!candidateName) continue;
        const score = scoreMatch(name, candidateName);
        if (!best || score > best.score) best = { item, score };
      }
      // Early exit if we already found a strong match — don't keep hitting
      // the API with broader queries that'll only return weaker candidates.
      if (best && best.score >= 0.7) break;
      // Small delay between queries to stay polite to ExerciseDB.
      await new Promise((r) => setTimeout(r, 80));
    }

    if (!best || best.score < MATCH_THRESHOLD) {
      results.failed++;
      results.details.push({
        id: ex.id,
        name,
        status: 'failed',
        reason: 'no match',
        score: best?.score,
      });
      continue;
    }

    const gifUrl = best.item.gifUrl?.trim();
    if (!gifUrl) {
      results.failed++;
      results.details.push({
        id: ex.id,
        name,
        status: 'failed',
        reason: 'match had no gifUrl',
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
    } catch (err) {
      results.failed++;
      results.details.push({
        id: ex.id,
        name,
        status: 'failed',
        reason: err instanceof Error ? err.message : 'db update failed',
        matchedName: best.item.name,
        score: best.score,
      });
    }
  }

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
