import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Switched from RapidAPI ExerciseDB to yuhonas/free-exercise-db because
// ExerciseDB was rate-limiting the name-search endpoint and returning empty
// arrays for common names like "barbell bench press". free-exercise-db is
// a GitHub-hosted static JSON (~870 exercises) with image frames on jsDelivr
// — no API key, no rate limits, deterministic. Image URLs in the dataset
// are relative paths ("Barbell_Bench_Press/images/0.jpg") joined with the
// CDN base; we hit cdn.jsdelivr.net which is faster + more cacheable than
// raw.githubusercontent.
//
// Data source:
//   https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json
// Image base:
//   https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/

interface FreeExerciseItem {
  id?: string;
  name?: string;
  images?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipment?: string | null;
  level?: string | null;
  category?: string | null;
  instructions?: string[];
}

const DATA_URL =
  'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json';
const IMAGE_BASE =
  'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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
  // Use the smaller set as denominator so "bench press" matching
  // "Barbell Bench Press" scores 2/2=1.0, not 2/3=0.67 — the target's
  // tokens are all present in the candidate, which IS a strong match.
  const denom = Math.min(tTokens.size, cTokens.size);
  return shared / denom;
}

function firstImageUrl(item: FreeExerciseItem): string | null {
  const imgs = item.images;
  if (!imgs || imgs.length === 0) return null;
  const first = imgs[0];
  if (!first) return null;
  return IMAGE_BASE + first;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'TRAINER')
  ) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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

  // Fetch the whole library once. ~250 KB of JSON, cached aggressively by
  // jsDelivr's CDN, so this is fast and reliable.
  let library: FreeExerciseItem[] = [];
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json(
        {
          message: `Failed to fetch free-exercise-db (HTTP ${res.status}). Try again in a minute.`,
        },
        { status: 502 },
      );
    }
    library = (await res.json()) as FreeExerciseItem[];
  } catch (err) {
    return NextResponse.json(
      {
        message: `Network error fetching exercise dataset: ${err instanceof Error ? err.message : 'unknown'}`,
      },
      { status: 502 },
    );
  }

  if (!Array.isArray(library) || library.length === 0) {
    return NextResponse.json(
      { message: 'Exercise dataset returned no items.' },
      { status: 502 },
    );
  }

  const MATCH_THRESHOLD = 0.5;
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
      imageUrl?: string;
    }>;
  } = { updated: 0, skipped: 0, failed: 0, details: [] };

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

    let best: { item: FreeExerciseItem; score: number } | null = null;
    for (const item of library) {
      const candidateName = item.name ?? '';
      if (!candidateName) continue;
      const score = scoreMatch(name, candidateName);
      if (score <= 0) continue;
      if (!best || score > best.score) {
        best = { item, score };
      }
    }

    if (!best || best.score < MATCH_THRESHOLD) {
      results.failed++;
      results.details.push({
        id: ex.id,
        name,
        status: 'failed',
        reason: 'no match above threshold',
        score: best?.score,
        matchedName: best?.item.name,
      });
      continue;
    }

    const imageUrl = firstImageUrl(best.item);
    if (!imageUrl) {
      results.failed++;
      results.details.push({
        id: ex.id,
        name,
        status: 'failed',
        reason: 'match had no images',
        matchedName: best.item.name,
        score: best.score,
      });
      continue;
    }

    try {
      await prisma.exercise.update({
        where: { id: ex.id },
        data: { imageUrl },
      });
      results.updated++;
      results.details.push({
        id: ex.id,
        name,
        status: 'updated',
        matchedName: best.item.name,
        score: best.score,
        imageUrl,
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
