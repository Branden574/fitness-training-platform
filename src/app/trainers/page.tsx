import { prisma } from '@/lib/prisma';
import DirectoryClient from './directory-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Trainers · Martinez/Fitness',
  description:
    'Hand-vetted coaches on the Martinez/Fitness platform. Browse by specialty, location, and availability — then apply.',
};

const POPULAR_SPECIALTIES = [
  'Hypertrophy',
  'Fat Loss',
  'Powerlifting',
  'Strength Foundations',
  'Endurance',
  'Olympic',
  'Performance',
  'Nutrition',
  "Women's Strength",
  'Strongman',
];

export default async function TrainersDirectoryPage() {
  const [initialTrainers, totalPublic] = await Promise.all([
    prisma.user.findMany({
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
            headline: true,
            photoUrl: true,
            coverImageUrl: true,
            location: true,
            experience: true,
            specialties: true,
            priceTier: true,
            clientsTrained: true,
          },
        },
      },
      orderBy: { trainer: { profilePublishedAt: 'desc' } },
      take: 100,
    }),
    prisma.user.count({
      where: {
        role: 'TRAINER',
        trainerIsPublic: true,
        trainerSlug: { not: null },
      },
    }),
  ]);

  return (
    <main data-mf className="mf-bg mf-fg" style={{ minHeight: '100vh' }}>
      <section
        style={{
          borderBottom: '1px solid var(--mf-hairline)',
          background: 'var(--mf-bg)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '56px 24px 48px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 40,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: 720 }}>
              <div
                className="mf-eyebrow"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 4,
                    background: 'var(--mf-accent)',
                  }}
                />
                FIND YOUR COACH · {totalPublic} VERIFIED TRAINERS
              </div>
              <h1
                className="mf-font-display"
                style={{
                  fontSize: 'clamp(44px, 7vw, 72px)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.015em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                Work with a coach
                <br />
                who actually{' '}
                <span style={{ color: 'var(--mf-accent)' }}>reads your logs.</span>
              </h1>
              <p
                className="mf-fg-dim"
                style={{
                  marginTop: 24,
                  fontSize: 15,
                  lineHeight: 1.6,
                  maxWidth: 560,
                }}
              >
                Every trainer on the platform is hand-vetted by the Martinez Fitness
                team. Browse by specialty, location, and availability — then apply to
                the ones you vibe with.
              </p>
            </div>
            <div
              className="mf-font-mono mf-fg-mute"
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                textAlign: 'right',
              }}
            >
              <div>
                UPDATED{' '}
                {new Date().toLocaleDateString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  year: '2-digit',
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <DirectoryClient
        initialTrainers={initialTrainers}
        popularSpecialties={POPULAR_SPECIALTIES}
      />
    </main>
  );
}
