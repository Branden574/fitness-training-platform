import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { computeTrainerStats } from '@/lib/trainerStats';
import AboutSection from './about-section';
import ClosingCTA from './closing-cta';
import GallerySection from './gallery-section';
import PillarsSection from './pillars-section';
import ProfileHeader from './profile-header';
import ServicesSection from './services-section';
import StatStrip from './stat-strip';
import StickyBookingBar from './sticky-booking-bar';
import TestimonialsSection from './testimonials-section';
import TransformationsSection from './transformations-section';
import WaitlistBanner from './waitlist-banner';
import type {
  ProfileData,
  ProfilePillar,
  ProfileQuickFact,
  ProfileService,
} from './types';

export const dynamic = 'force-dynamic';

interface Params {
  trainerSlug: string;
}

function initialsFrom(name: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function parseJsonArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  return [];
}

function stringsFromJson(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function derivedEntryPrice(services: ProfileService[], hourlyRate: number | null): string | null {
  if (services.length > 0) {
    const featured = services.find((s) => s.featured) ?? services[0]!;
    return `${featured.price}${featured.per ?? ''}`;
  }
  if (typeof hourlyRate === 'number' && hourlyRate > 0) return `$${hourlyRate}/hr`;
  return null;
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
    select: {
      name: true,
      trainer: {
        select: { bio: true, headline: true, photoUrl: true, coverImageUrl: true },
      },
    },
  });
  if (!user) return { title: 'Trainer not found · RepLab' };
  const title = `${user.name ?? 'Trainer'} · RepLab`;
  const description =
    user.trainer?.headline ??
    user.trainer?.bio?.slice(0, 160) ??
    `Train with ${user.name ?? 'this coach'}.`;
  const ogImage = user.trainer?.coverImageUrl ?? user.trainer?.photoUrl ?? null;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : [],
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
          headline: true,
          location: true,
          experience: true,
          clientsTrained: true,
          photoUrl: true,
          coverImageUrl: true,
          specialties: true,
          certifications: true,
          instagramHandle: true,
          tiktokHandle: true,
          youtubeHandle: true,
          priceTier: true,
          hourlyRate: true,
          quickFacts: true,
          pillars: true,
          gallery: true,
          services: true,
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
  const services = parseJsonArray<ProfileService>(user.trainer.services);
  const quickFacts = parseJsonArray<ProfileQuickFact>(user.trainer.quickFacts);
  const pillars = parseJsonArray<ProfilePillar>(user.trainer.pillars);
  const certifications = stringsFromJson(user.trainer.certifications);

  const testimonials = user.trainer.testimonials.map((t) => {
    const nameSeg = t.attribution.split('·')[0]?.trim() ?? t.attribution;
    return {
      id: t.id,
      quote: t.quote,
      attribution: t.attribution,
      initials: initialsFrom(nameSeg),
    };
  });

  const transformations = user.trainer.transformations.map((tr) => ({
    id: tr.id,
    beforePhotoUrl: tr.beforePhotoUrl,
    afterPhotoUrl: tr.afterPhotoUrl,
    caption: tr.caption,
    durationWeeks: tr.durationWeeks,
  }));

  const entryPrice = derivedEntryPrice(services, user.trainer.hourlyRate);

  const p: ProfileData = {
    id: user.id,
    name: user.name ?? 'Trainer',
    initials: initialsFrom(user.name),
    slug: trainerSlug,
    accepting: user.trainerAcceptingClients,
    headline: user.trainer.headline,
    bio: user.trainer.bio,
    location: user.trainer.location,
    experience: user.trainer.experience,
    clientsTrained: user.trainer.clientsTrained,
    specialties: user.trainer.specialties,
    photoUrl: user.trainer.photoUrl ?? user.image,
    coverImageUrl: user.trainer.coverImageUrl,
    instagramHandle: user.trainer.instagramHandle,
    tiktokHandle: user.trainer.tiktokHandle,
    youtubeHandle: user.trainer.youtubeHandle,
    quickFacts,
    pillars,
    gallery: user.trainer.gallery,
    services,
    certifications,
    testimonials,
    transformations,
    entryPrice,
    activeClients: stats?.activeClients ?? 0,
  };

  const firstName = p.name.split(' ')[0] ?? p.name;

  return (
    <main data-mf className="mf-bg mf-fg" style={{ minHeight: '100vh' }}>
      <ProfileHeader p={p} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        {!p.accepting ? <WaitlistBanner slug={p.slug} /> : null}
        <StatStrip p={p} />
        <AboutSection p={p} />
        <PillarsSection p={p} />
        <GallerySection gallery={p.gallery} />
        <TransformationsSection transformations={p.transformations} />
        <ServicesSection services={p.services} slug={p.slug} />
        <TestimonialsSection testimonials={p.testimonials} />
      </div>

      <ClosingCTA trainerFirstName={firstName} slug={p.slug} accepting={p.accepting} />

      <StickyBookingBar
        name={p.name}
        initials={p.initials}
        photoUrl={p.photoUrl}
        accepting={p.accepting}
        entryPrice={p.entryPrice}
        slug={p.slug}
      />

      {/* Bottom spacer so sticky bar doesn't cover footer content on mobile */}
      <div aria-hidden className="md:hidden" style={{ height: 72 }} />
    </main>
  );
}
