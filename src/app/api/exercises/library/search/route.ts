import { NextResponse } from 'next/server';
import { requireTrainerSession } from '@/lib/trainer-data';

interface ExerciseDbItem {
  id?: string;
  name?: string;
  gifUrl?: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
}

export async function GET(request: Request) {
  try {
    await requireTrainerSession();
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        message:
          'Exercise library is not configured. Set RAPIDAPI_KEY in the environment to enable search.',
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  const bodyPart = (searchParams.get('bodyPart') ?? '').trim();
  const limitRaw = parseInt(searchParams.get('limit') ?? '20', 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 20;

  let url: string;
  if (bodyPart) {
    url = `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${encodeURIComponent(bodyPart)}`;
  } else if (q) {
    url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(q)}`;
  } else {
    url = `https://exercisedb.p.rapidapi.com/exercises`;
  }

  try {
    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { message: `ExerciseDB error (${res.status})`, detail: text.slice(0, 300) },
        { status: 502 },
      );
    }

    const raw = (await res.json()) as ExerciseDbItem[] | ExerciseDbItem;
    const items = Array.isArray(raw) ? raw : [raw];

    // If a query was provided and we hit the bodyPart/all endpoints, further filter by name.
    const qLower = q.toLowerCase();
    const filtered = q && !bodyPart
      ? items
      : q
        ? items.filter((it) => (it.name ?? '').toLowerCase().includes(qLower))
        : items;

    const results = filtered.slice(0, limit).map((it) => ({
      externalId: String(it.id ?? ''),
      name: String(it.name ?? ''),
      gifUrl: String(it.gifUrl ?? ''),
      bodyPart: String(it.bodyPart ?? ''),
      target: String(it.target ?? ''),
      equipment: String(it.equipment ?? ''),
      secondaryMuscles: Array.isArray(it.secondaryMuscles)
        ? it.secondaryMuscles.map(String)
        : [],
      instructions: Array.isArray(it.instructions) ? it.instructions.map(String) : [],
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('ExerciseDB search error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch exercise library' },
      { status: 502 },
    );
  }
}
