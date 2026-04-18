import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Play, Calendar } from 'lucide-react';
import { requireClientSession, getClientContext } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import { Btn, ClientDesktopShell } from '@/components/ui/mf';
import StartSampleButton from './start-sample-button';

export const dynamic = 'force-dynamic';

export default async function WorkoutLandingPage() {
  const session = await requireClientSession();
  const userId = session.user.id;

  const inProgress = await prisma.workoutSession.findFirst({
    where: { userId, completed: false },
    orderBy: { startTime: 'desc' },
    select: { id: true },
  });
  if (inProgress) redirect(`/client/workout/${inProgress.id}`);

  const mostRecent = await prisma.workoutSession.findFirst({
    where: { userId },
    orderBy: { startTime: 'desc' },
    select: { id: true },
  });
  if (mostRecent) redirect(`/client/workout/${mostRecent.id}`);

  const ctx = await getClientContext(userId);

  return (
    <>
      <main
        className="flex flex-col md:hidden"
        style={{ padding: '24px 16px', minHeight: '100%' }}
      >
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>WORKOUT</div>
        <h1
          className="mf-font-display"
          style={{ fontSize: 28, letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 16 }}
        >
          No sessions yet
        </h1>
        <p className="mf-fg-dim" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
          Your trainer hasn&apos;t assigned any workouts yet. Start a session from a library template, or browse your program.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StartSampleButton fullWidth />
          <Link href="/client/program">
            <Btn icon={Calendar} className="w-full">Browse program</Btn>
          </Link>
        </div>
      </main>

      <div className="hidden md:block">
        <ClientDesktopShell
          active="workout"
          breadcrumbs="TRAIN"
          title="Active Session"
          athleteInitials={ctx.initials}
          athleteName={ctx.name ?? ctx.email}
          athleteMeta={ctx.trainer?.name ? `COACH · ${ctx.trainer.name.toUpperCase()}` : undefined}
        >
          <div className="p-6">
            <div
              className="mf-card-elev"
              style={{
                padding: 40,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                className="grid place-items-center"
                style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--mf-surface-3)' }}
              >
                <Play size={22} className="mf-fg-mute" />
              </div>
              <div>
                <div
                  className="mf-font-display"
                  style={{ fontSize: 24, letterSpacing: '-0.01em', lineHeight: 1.1 }}
                >
                  No sessions yet
                </div>
                <div className="mf-fg-dim" style={{ fontSize: 13, marginTop: 8, maxWidth: 420 }}>
                  Your trainer hasn&apos;t assigned any workouts yet. Start a session from a library template, or browse your program.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <StartSampleButton />
                <Link href="/client/program">
                  <Btn icon={Calendar}>Browse program</Btn>
                </Link>
              </div>
            </div>
          </div>
        </ClientDesktopShell>
      </div>
    </>
  );
}
