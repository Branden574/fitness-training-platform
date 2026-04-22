import 'server-only';

import { getServerSession, type Session } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';
import { prisma } from './prisma';

export async function requireTrainerSession(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/signin');
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    if (session.user.role === 'CLIENT') redirect('/client');
    redirect('/auth/signin');
  }
  return session;
}

export function initialsFor(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export interface RosterClient {
  id: string;
  name: string | null;
  email: string;
  initials: string;
  image: string | null;
  status: 'active' | 'behind' | 'paused' | 'new';
  lastLogLabel: string;
  streak: number;
  program: string | null;
  programWeek: number | null;
  adherence: number;
  prBadge: boolean;
  unread: number;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const days = new Set(dates.map(dayKey));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function statusFor(lastActivity: Date | null, isActive: boolean, createdAt: Date): RosterClient['status'] {
  if (!isActive) return 'paused';
  const now = Date.now();
  const weekOld = now - createdAt.getTime() < 14 * 86400000;
  if (!lastActivity) return weekOld ? 'new' : 'behind';
  const diff = now - lastActivity.getTime();
  if (diff > 3 * 86400000) return 'behind';
  if (weekOld) return 'new';
  return 'active';
}

function relativeShort(d: Date | null): string {
  if (!d) return 'Never';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return 'Today';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export async function getRoster(trainerUserId: string): Promise<RosterClient[]> {
  const clients = await prisma.user.findMany({
    where: {
      trainerId: trainerUserId,
      role: 'CLIENT',
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      isActive: true,
      createdAt: true,
      workoutSessions: {
        where: { completed: true },
        orderBy: { startTime: 'desc' },
        // 60 is enough for 30-day adherence (5/wk × 4 = 20) + headroom
        // to compute the current streak even after short training gaps.
        // Anything beyond wastes payload.
        take: 60,
        select: { startTime: true, workout: { select: { title: true } } },
      },
      // _count avoids loading every unread-message row just to count
      // them. At 50 clients × 100+ unread each that's 5k+ rows for
      // one roster render otherwise.
      _count: {
        select: {
          sentMessages: {
            where: { receiverId: trainerUserId, read: false },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const now = Date.now();
  const thirtyDays = now - 30 * 86400000;

  return clients.map((c) => {
    const dates = c.workoutSessions.map((s) => s.startTime);
    const lastActivity = dates[0] ?? null;
    const last30Count = dates.filter((d) => d.getTime() >= thirtyDays).length;
    const adherence = Math.min(100, Math.round((last30Count / 20) * 100)); // ~5 sessions/wk target
    const program = c.workoutSessions[0]?.workout.title ?? null;

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      initials: initialsFor(c.name, c.email),
      image: c.image ?? null,
      status: statusFor(lastActivity, c.isActive, c.createdAt),
      lastLogLabel: relativeShort(lastActivity),
      streak: computeStreak(dates),
      program,
      programWeek: null,
      adherence,
      prBadge: last30Count >= 8,
      unread: c._count.sentMessages,
    };
  });
}

export async function getTrainerRosterStats(trainerUserId: string) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const roster = await getRoster(trainerUserId);
  const loggedToday = roster.filter((r) => r.lastLogLabel === 'Today').length;
  const avgAdherence =
    roster.length > 0 ? Math.round(roster.reduce((s, r) => s + r.adherence, 0) / roster.length) : 0;

  const prsThisWeek = await prisma.workoutProgress.count({
    where: {
      date: { gte: weekAgo },
      user: { trainerId: trainerUserId },
    },
  });

  return {
    totalClients: roster.length,
    loggedToday,
    avgAdherence,
    prsThisWeek,
  };
}
