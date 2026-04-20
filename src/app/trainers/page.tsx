import { prisma } from '@/lib/prisma';
import DirectoryClient from './directory-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Trainers · Martinez/Fitness',
  description: 'Browse invite-only coaches on the Martinez/Fitness platform.',
};

export default async function TrainersDirectoryPage() {
  const initialTrainers = await prisma.user.findMany({
    where: {
      role: 'TRAINER',
      trainerIsPublic: true,
      trainerSlug: { not: null },
    },
    select: {
      id: true,
      name: true,
      image: true,
      trainerSlug: true,
      trainerAcceptingClients: true,
      trainer: {
        select: {
          bio: true,
          photoUrl: true,
          location: true,
          experience: true,
          specialties: true,
          priceTier: true,
        },
      },
    },
    orderBy: { trainer: { profilePublishedAt: 'desc' } },
    take: 100,
  });

  return (
    <>
      <main
        data-mf
        className="mf-bg mf-fg"
        style={{ minHeight: '100vh', padding: '48px 20px 80px' }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
            TRAINERS · MARTINEZ/FITNESS
          </div>
          <h1
            className="mf-font-display"
            style={{
              fontSize: 48,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Find your coach.
          </h1>
          <p
            className="mf-fg-dim"
            style={{
              fontSize: 15,
              lineHeight: 1.5,
              marginTop: 12,
              maxWidth: 560,
              marginBottom: 32,
            }}
          >
            Every trainer here is invite-only on platform. Pick one, apply, and
            they&apos;ll review you within 48 hours.
          </p>

          <DirectoryClient initialTrainers={initialTrainers} />
        </div>
      </main>
    </>
  );
}
