import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';

const handleRe = /^[A-Za-z0-9._-]*$/;

const quickFactSchema = z.object({
  label: z.string().min(1).max(40),
  value: z.string().min(1).max(200),
});
const pillarSchema = z.object({
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(280),
  icon: z.string().max(40).optional().default('Target'),
});
const serviceSchema = z.object({
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(280),
  price: z.string().min(1).max(24),
  per: z.string().max(24).optional().default(''),
  cta: z.string().min(1).max(24),
  featured: z.boolean().optional().default(false),
});

// Gallery entries are either URLs (https://… or /…) or short label strings
// that render as placeholder tiles — that lets trainers seed a layout before
// real uploads are wired.
const galleryEntry = z.string().min(1).max(240);

const schema = z.object({
  bio: z.string().max(500).optional(),
  headline: z.string().max(200).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  instagramHandle: z
    .string()
    .max(40)
    .regex(/^[A-Za-z0-9._]*$/, 'Invalid Instagram handle')
    .optional()
    .nullable(),
  tiktokHandle: z
    .string()
    .max(40)
    .regex(handleRe, 'Invalid TikTok handle')
    .optional()
    .nullable(),
  youtubeHandle: z
    .string()
    .max(60)
    .regex(handleRe, 'Invalid YouTube handle')
    .optional()
    .nullable(),
  specialties: z.array(z.string().min(1).max(60)).max(5).optional(),
  experience: z.number().int().min(0).max(80).optional(),
  clientsTrained: z.number().int().min(0).max(100000).nullable().optional(),
  certifications: z.array(z.string().max(120)).max(20).optional(),
  priceTier: z.enum(['tier-1', 'tier-2', 'tier-3', 'contact']).optional().nullable(),
  hourlyRate: z.number().min(0).max(10000).nullable().optional(),
  acceptsInPerson: z.boolean().optional(),
  acceptsOnline: z.boolean().optional(),
  contactPhone: z
    .string()
    .max(32)
    // Allow digits, spaces, parens, dashes, dots, plus. Require 7+ digits.
    .refine(
      (v) => v === '' || (v.replace(/\D/g, '').length >= 7 && /^[0-9+().\-\s]+$/.test(v)),
      'Enter a valid phone (digits, +, -, (), spaces only)',
    )
    .optional()
    .nullable(),
  replyFromEmail: z
    .union([z.string().email().max(200), z.literal('')])
    .optional()
    .nullable(),
  replyFromName: z.string().max(120).optional().nullable(),
  coverImageUrl: z
    .union([
      z.string().url().max(500),
      z.literal(''),
    ])
    .optional()
    .nullable(),
  quickFacts: z.array(quickFactSchema).max(12).optional(),
  pillars: z.array(pillarSchema).max(6).optional(),
  gallery: z.array(galleryEntry).max(30).optional(),
  services: z.array(serviceSchema).max(8).optional(),
});

function normalizeSpecialty(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Used by the profile editor to pre-populate fields on mount instead of
// rendering an empty form every visit (the previous behaviour made trainers
// think their saved data had been lost).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await ensureTrainerRow(session.user.id, prisma);
  const [trainer, user] = await Promise.all([
    prisma.trainer.findUnique({
      where: { userId: session.user.id },
      select: {
        photoUrl: true,
        coverImageUrl: true,
        location: true,
        instagramHandle: true,
        tiktokHandle: true,
        youtubeHandle: true,
        contactPhone: true,
        bio: true,
        headline: true,
        specialties: true,
        experience: true,
        clientsTrained: true,
        certifications: true,
        priceTier: true,
        hourlyRate: true,
        acceptsInPerson: true,
        acceptsOnline: true,
        replyFromEmail: true,
        replyFromName: true,
        quickFacts: true,
        pillars: true,
        gallery: true,
        services: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { trainerIsPublic: true, trainerSlug: true },
    }),
  ]);
  return NextResponse.json(
    {
      ...trainer,
      certifications: (trainer?.certifications as string[] | null) ?? [],
      quickFacts: Array.isArray(trainer?.quickFacts) ? trainer.quickFacts : [],
      pillars: Array.isArray(trainer?.pillars) ? trainer.pillars : [],
      gallery: trainer?.gallery ?? [],
      services: Array.isArray(trainer?.services) ? trainer.services : [],
      trainerIsPublic: user?.trainerIsPublic ?? false,
      trainerSlug: user?.trainerSlug ?? null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      { error: 'Invalid fields', details: parsed.error.issues },
      { status: 400 },
    );
  }

  await ensureTrainerRow(session.user.id, prisma);

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.specialties) {
    const normalized = parsed.data.specialties.map(normalizeSpecialty);
    data.specialties = Array.from(new Set(normalized));
  }
  if (parsed.data.contactPhone !== undefined) {
    const trimmed = parsed.data.contactPhone?.trim() ?? null;
    data.contactPhone = trimmed ? trimmed : null;
  }
  if (parsed.data.replyFromEmail !== undefined) {
    const trimmed = parsed.data.replyFromEmail?.trim() ?? null;
    data.replyFromEmail = trimmed ? trimmed : null;
  }
  if (parsed.data.replyFromName !== undefined) {
    const trimmed = parsed.data.replyFromName?.trim() ?? null;
    data.replyFromName = trimmed ? trimmed : null;
  }
  if (parsed.data.headline !== undefined) {
    const trimmed = parsed.data.headline?.trim() ?? null;
    data.headline = trimmed ? trimmed : null;
  }
  if (parsed.data.coverImageUrl !== undefined) {
    const trimmed = parsed.data.coverImageUrl?.trim() ?? null;
    data.coverImageUrl = trimmed ? trimmed : null;
  }
  if (parsed.data.tiktokHandle !== undefined) {
    const trimmed = parsed.data.tiktokHandle?.trim().replace(/^@/, '') ?? null;
    data.tiktokHandle = trimmed ? trimmed : null;
  }
  if (parsed.data.youtubeHandle !== undefined) {
    const trimmed = parsed.data.youtubeHandle?.trim().replace(/^@/, '') ?? null;
    data.youtubeHandle = trimmed ? trimmed : null;
  }
  // JSON blobs — pass through as-is; Prisma handles Json arrays.
  // Empty arrays clear the field.
  for (const k of ['quickFacts', 'pillars', 'services'] as const) {
    if (parsed.data[k] !== undefined) {
      data[k] = parsed.data[k];
    }
  }
  if (parsed.data.gallery !== undefined) {
    data.gallery = parsed.data.gallery;
  }

  const trainer = await prisma.trainer.update({
    where: { userId: session.user.id },
    data,
  });

  return NextResponse.json(
    { trainer },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
