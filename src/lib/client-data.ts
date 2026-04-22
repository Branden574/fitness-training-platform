import 'server-only';

import { getServerSession, type Session } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';
import { prisma } from './prisma';

/**
 * Enforce a CLIENT session. Returns the session; redirects to /auth/signin
 * if missing or the role is wrong.
 */
export async function requireClientSession(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/signin');
  if (session.user.role !== 'CLIENT') {
    if (session.user.role === 'TRAINER') redirect('/trainer');
    if (session.user.role === 'ADMIN') redirect('/admin');
    redirect('/auth/signin');
  }
  return session;
}

export interface ClientContext {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  initials: string;
  trainer: { id: string; name: string | null; photoUrl: string | null } | null;
}

/**
 * Load the core identity context for a signed-in client: their profile
 * basics and their assigned trainer (via User.trainerId). Surfaces both
 * the client's own `image` (User.image) and the coach's public photo
 * (prefers Trainer.photoUrl — the curated headshot — and falls back to
 * User.image when unset) so every client surface can render real faces.
 */
export async function getClientContext(userId: string): Promise<ClientContext> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      assignedTrainer: {
        select: {
          id: true,
          name: true,
          image: true,
          trainer: { select: { photoUrl: true } },
        },
      },
    },
  });

  const name = u?.name ?? null;
  const initials = buildInitials(name, u?.email ?? '');
  const trainer = u?.assignedTrainer
    ? {
        id: u.assignedTrainer.id,
        name: u.assignedTrainer.name,
        photoUrl:
          u.assignedTrainer.trainer?.photoUrl ?? u.assignedTrainer.image ?? null,
      }
    : null;

  return {
    userId,
    name,
    email: u?.email ?? '',
    image: u?.image ?? null,
    initials,
    trainer,
  };
}

function buildInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/** Start of the current week (Monday 00:00 local) */
export function startOfWeek(d = new Date()): Date {
  const s = new Date(d);
  const day = s.getDay();
  const diff = (day === 0 ? -6 : 1 - day); // Monday-indexed
  s.setDate(s.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

/** Start of today (local) */
export function startOfToday(): Date {
  const s = new Date();
  s.setHours(0, 0, 0, 0);
  return s;
}
