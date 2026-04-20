import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { computeTrainerStats } from '@/lib/trainerStats';
import ProfileSections from './profile-sections';

export const dynamic = 'force-dynamic';

interface Params {
  trainerSlug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { trainerSlug } = await params;
  const user = await prisma.user.findFirst({
    where: { trainerSlug, trainerIsPublic: true },
    orderBy: { createdAt: 'asc' },
    select: { name: true, trainer: { select: { bio: true, photoUrl: true } } },
  });
  if (!user) return { title: 'Trainer not found · Martinez/Fitness' };
  const title = `${user.name ?? 'Trainer'} · Martinez/Fitness`;
  const description =
    user.trainer?.bio?.slice(0, 160) ?? `Train with ${user.name ?? 'this trainer'}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: user.trainer?.photoUrl ? [{ url: user.trainer.photoUrl }] : [],
    },
  };
}

export default async function TrainerProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { trainerSlug } = await params;

  const user = await prisma.user.findFirst({
    where: { trainerSlug, trainerIsPublic: true },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      image: true,
      trainerAcceptingClients: true,
      trainer: {
        select: {
          bio: true,
          photoUrl: true,
          location: true,
          instagramHandle: true,
          experience: true,
          certifications: true,
          specialties: true,
          priceTier: true,
          hourlyRate: true,
          acceptsInPerson: true,
          acceptsOnline: true,
          testimonials: { orderBy: { order: 'asc' } },
          transformations: {
            where: { status: 'APPROVED' },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!user || !user.trainer) notFound();

  const stats = await computeTrainerStats(user.id, prisma);
  const photo = user.trainer.photoUrl ?? user.image;
  const eyebrowParts: string[] = ['TRAINER'];
  if (user.trainer.location) eyebrowParts.push(user.trainer.location.toUpperCase());
  if (user.trainer.experience > 0) eyebrowParts.push(`${user.trainer.experience} YRS`);

  return (
    <>
      <main
        data-mf
        className="mf-bg mf-fg"
        style={{ minHeight: '100vh', padding: '48px 20px 80px' }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: photo ? 'minmax(200px, 240px) 1fr' : '1fr',
              gap: 24,
              alignItems: 'start',
            }}
          >
            {photo && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={photo}
                alt={user.name ?? 'Trainer'}
                style={{
                  width: '100%',
                  aspectRatio: '4 / 5',
                  objectFit: 'cover',
                  borderRadius: 6,
                  border: '1px solid var(--mf-hairline)',
                }}
              />
            )}
            <div>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                {eyebrowParts.join(' · ')}
              </div>
              <h1
                className="mf-font-display"
                style={{
                  fontSize: 48,
                  lineHeight: 1.05,
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {user.name}
              </h1>

              {!user.trainerAcceptingClients && (
                <div
                  className="mf-card"
                  style={{
                    marginTop: 12,
                    padding: 10,
                    borderColor: 'var(--mf-amber, #F5B544)',
                    color: 'var(--mf-amber, #F5B544)',
                    fontSize: 12,
                  }}
                >
                  WAITLIST ONLY · Not accepting new clients right now
                </div>
              )}

              <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link
                  href={`/apply/${trainerSlug}`}
                  className="mf-btn mf-btn-primary"
                  style={{ height: 44, padding: '0 24px' }}
                >
                  Apply →
                </Link>
                {user.trainer.instagramHandle && (
                  <a
                    href={`https://instagram.com/${user.trainer.instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mf-btn"
                    style={{ height: 44, padding: '0 20px' }}
                  >
                    @{user.trainer.instagramHandle}
                  </a>
                )}
              </div>
            </div>
          </div>

          <ProfileSections
            bio={user.trainer.bio}
            specialties={user.trainer.specialties}
            certifications={user.trainer.certifications}
            priceTier={user.trainer.priceTier}
            hourlyRate={user.trainer.hourlyRate}
            acceptsInPerson={user.trainer.acceptsInPerson}
            acceptsOnline={user.trainer.acceptsOnline}
            stats={stats}
            testimonials={user.trainer.testimonials.map((t) => ({
              id: t.id,
              quote: t.quote,
              attribution: t.attribution,
            }))}
            transformations={user.trainer.transformations.map((tr) => ({
              id: tr.id,
              beforePhotoUrl: tr.beforePhotoUrl,
              afterPhotoUrl: tr.afterPhotoUrl,
              caption: tr.caption,
              durationWeeks: tr.durationWeeks,
            }))}
            trainerName={user.name ?? 'Trainer'}
            trainerSlug={trainerSlug}
          />

          <div style={{ marginTop: 48, textAlign: 'center' }}>
            <Link
              href={`/apply/${trainerSlug}`}
              className="mf-btn mf-btn-primary"
              style={{ height: 48, padding: '0 32px' }}
            >
              Apply to {user.name} →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
