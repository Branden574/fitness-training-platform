import { notFound } from 'next/navigation';
import PublicTopNav from '@/components/ui/mf/PublicTopNav';
import { prisma } from '@/lib/prisma';
import ApplyDirectClient from './apply-direct-client';

export const dynamic = 'force-dynamic';

interface Params {
  trainerSlug: string;
}

export default async function ApplyDirectPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { trainerSlug } = await params;

  // trainerSlug isn't @unique in the schema yet (deferred) — findFirst is required.
  const trainer = await prisma.user.findFirst({
    where: { trainerSlug },
    select: {
      id: true,
      name: true,
      image: true,
      trainerAcceptingClients: true,
      trainerIsPublic: true,
    },
  });

  if (!trainer || !trainer.trainerIsPublic) {
    notFound();
  }

  return (
    <>
      <PublicTopNav />
      <main
        data-mf
        className="mf-bg mf-fg"
        style={{ minHeight: '100vh', padding: '48px 20px 80px' }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
            APPLY · MARTINEZ/FITNESS
          </div>
          <h1
            className="mf-font-display"
            style={{
              fontSize: 40,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Train with {trainer.name}.
          </h1>
          {!trainer.trainerAcceptingClients && (
            <div
              className="mf-card"
              style={{
                marginTop: 16,
                padding: 12,
                borderColor: 'var(--mf-amber, #F5B544)',
                color: 'var(--mf-amber, #F5B544)',
              }}
            >
              WAITLIST ONLY · {trainer.name} is at capacity. Join below and
              they&apos;ll reach out when a spot opens.
            </div>
          )}

          <div style={{ marginTop: 32 }}>
            <ApplyDirectClient
              trainerId={trainer.id}
              trainerName={trainer.name ?? 'Coach'}
              waitlist={!trainer.trainerAcceptingClients}
            />
          </div>
        </div>
      </main>
    </>
  );
}
