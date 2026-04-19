import 'server-only';
import { customAlphabet } from 'nanoid';
import type { PrismaClient } from '@prisma/client';

// Unambiguous alphabet — no 0/O/1/I/L — safer when spoken over the phone
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = customAlphabet(CODE_ALPHABET, 6);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function generateSlug(
  name: string,
  prisma: PrismaClient,
): Promise<string> {
  const base = slugify(name) || 'trainer';
  let candidate = base;
  let suffix = 1;
  // Linear probe — 10 collisions is astronomically unlikely for a single trainer.
  // Uses findFirst because trainerSlug is not @unique in the schema yet (deferred
  // — Railway db push can't add the constraint without --accept-data-loss).
  while (
    await prisma.user.findFirst({
      where: { trainerSlug: candidate },
      select: { id: true },
    })
  ) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
    if (suffix > 100) throw new Error('Slug collision overflow');
  }
  return candidate;
}

export async function generateReferralCode(prisma: PrismaClient): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = makeCode();
    const existing = await prisma.user.findFirst({
      where: { trainerReferralCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error('Could not generate unique referral code after 5 attempts');
}

/**
 * Idempotent backfill — ensures the given trainer has both a slug and a
 * referral code. Returns the current (now-guaranteed) values.
 */
export async function ensureTrainerIdentity(
  userId: string,
  prisma: PrismaClient,
): Promise<{ slug: string; referralCode: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      trainerSlug: true,
      trainerReferralCode: true,
    },
  });
  if (!user) throw new Error('User not found');
  if (user.role !== 'TRAINER' && user.role !== 'ADMIN') {
    throw new Error('Only trainers or admins can have trainer identity');
  }

  const slug =
    user.trainerSlug ?? (await generateSlug(user.name ?? 'trainer', prisma));
  const referralCode =
    user.trainerReferralCode ?? (await generateReferralCode(prisma));

  if (user.trainerSlug !== slug || user.trainerReferralCode !== referralCode) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        trainerSlug: slug,
        trainerReferralCode: referralCode,
      },
    });
  }

  return { slug, referralCode };
}
