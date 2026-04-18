import 'server-only';

import { getServerSession, type Session } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';

export async function requireAdminSession(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/signin');
  if (session.user.role !== 'ADMIN') {
    if (session.user.role === 'TRAINER') redirect('/trainer');
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

export function relativeShort(d: Date | null): string {
  if (!d) return 'Never';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
