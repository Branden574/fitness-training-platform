import { NextResponse } from 'next/server';
import { requireTrainerSession } from '@/lib/trainer-data';

// Switched off RapidAPI ExerciseDB because its gifUrls live on v2.exercisedb.io
// behind the API key — browser <img> tags can't auth, so every search card
// rendered "NO GIF". yuhonas/free-exercise-db is a static JSON (~870 items)
// with CDN-hosted image frames on jsDelivr. No API key, no rate limit, and
// it's the same dataset the import fallback + Fill-GIFs backfill already use,
// so imports save the exact image the search card previews.
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

function scoreMatch(queryTokens: string[], candidate: string): number {
  if (queryTokens.length === 0) return 0;
  const cTokens = new Set(tokenize(candidate));
  if (cTokens.size === 0) return 0;
  let shared = 0;
  for (const t of queryTokens) if (cTokens.has(t)) shared++;
  // Every query token must appear in the candidate name for it to count as
  // a search hit — otherwise "hack" returns unrelated items that merely share
  // one word. Return 0 below a full match so those rows get filtered out.
  if (shared < queryTokens.length) return 0;
  // Within hits, favor tighter names ("Hack Squat" beats "Barbell Hack Squat"
  // beats "Close-Grip Hack Squat") by scoring query-coverage of the candidate.
  return shared / cTokens.size;
}

export async function GET(request: Request) {
  try {
    await requireTrainerSession();
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  const limitRaw = parseInt(searchParams.get('limit') ?? '20', 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 20;

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  let library: FreeExerciseItem[] = [];
  try {
    // Revalidate daily — the dataset changes rarely and jsDelivr caches aggressively.
    const res = await fetch(DATA_URL, { next: { revalidate: 86400 } });
    if (!res.ok) {
      return NextResponse.json(
        { message: `Exercise dataset unavailable (HTTP ${res.status}). Try again shortly.` },
        { status: 502 },
      );
    }
    library = (await res.json()) as FreeExerciseItem[];
  } catch {
    return NextResponse.json(
      { message: 'Network error fetching exercise dataset.' },
      { status: 502 },
    );
  }

  if (!Array.isArray(library)) {
    return NextResponse.json(
      { message: 'Exercise dataset returned an unexpected shape.' },
      { status: 502 },
    );
  }

  const queryTokens = tokenize(q);
  const scored: Array<{ item: FreeExerciseItem; score: number }> = [];
  for (const item of library) {
    const name = item.name ?? '';
    if (!name) continue;
    const score = scoreMatch(queryTokens, name);
    if (score <= 0) continue;
    scored.push({ item, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tiebreaker: shorter name first (usually the "cleaner" canonical variant).
    return (a.item.name?.length ?? 0) - (b.item.name?.length ?? 0);
  });

  const results = scored.slice(0, limit).map(({ item }) => {
    const firstImage = item.images?.[0];
    const gifUrl = firstImage ? IMAGE_BASE + firstImage : '';
    // Map free-exercise-db fields onto the legacy ExerciseDB-shaped payload
    // so LibrarySearchClient + the import route don't need to change. Kept
    // gifUrl as the field name even though these are static JPGs — the client
    // + import route both key off it.
    return {
      externalId: item.id ?? item.name ?? '',
      name: item.name ?? '',
      gifUrl,
      bodyPart: item.category ?? '',
      target: item.primaryMuscles?.[0] ?? '',
      equipment: item.equipment ?? '',
      secondaryMuscles: Array.isArray(item.secondaryMuscles) ? item.secondaryMuscles : [],
      instructions: Array.isArray(item.instructions) ? item.instructions : [],
    };
  });

  return NextResponse.json({ results });
}
