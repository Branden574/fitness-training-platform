import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';

const schema = z.object({
  bio: z.string().max(500).optional(),
  location: z.string().max(120).optional().nullable(),
  instagramHandle: z
    .string()
    .max(40)
    .regex(/^[A-Za-z0-9._]*$/, 'Invalid Instagram handle')
    .optional()
    .nullable(),
  specialties: z.array(z.string().min(1).max(60)).max(5).optional(),
  experience: z.number().int().min(0).max(80).optional(),
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
        location: true,
        instagramHandle: true,
        contactPhone: true,
        bio: true,
        specialties: true,
        experience: true,
        certifications: true,
        priceTier: true,
        hourlyRate: true,
        acceptsInPerson: true,
        acceptsOnline: true,
        replyFromEmail: true,
        replyFromName: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { trainerIsPublic: true },
    }),
  ]);
  return NextResponse.json(
    {
      ...trainer,
      certifications: (trainer?.certifications as string[] | null) ?? [],
      trainerIsPublic: user?.trainerIsPublic ?? false,
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

  const trainer = await prisma.trainer.update({
    where: { userId: session.user.id },
    data,
  });

  return NextResponse.json(
    { trainer },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
