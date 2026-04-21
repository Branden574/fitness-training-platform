import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureTrainerRow } from '@/lib/trainerRow';
import { DesktopShell } from '@/components/ui/mf';
import BillingClient from './billing-client';

export const dynamic = 'force-dynamic';

export default async function TrainerBillingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/signin');
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    redirect('/');
  }

  // Handles the edge case where a legacy TRAINER user pre-dates the Trainer
  // row auto-creation in register — without this they'd hit a null and the
  // page would crash on first visit.
  await ensureTrainerRow(session.user.id, prisma);

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: {
      subscriptionTier: true,
      monthlyPrice: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeConnectAccountId: true,
      connectOnboarded: true,
      connectChargesEnabled: true,
      connectPayoutsEnabled: true,
    },
  });

  return (
    <DesktopShell
      role="trainer"
      active="settings"
      title="Billing"
      breadcrumbs="SETTINGS / BILLING"
    >
      <div style={{ padding: 24, maxWidth: 800 }}>
        <BillingClient
          initial={{
            tier: (trainer?.subscriptionTier ?? null) as
              | 'FREE'
              | 'STARTER'
              | 'PRO'
              | 'CUSTOM'
              | null,
            status: trainer?.subscriptionStatus ?? null,
            monthlyPrice: trainer?.monthlyPrice ?? null,
            hasCustomer: !!trainer?.stripeCustomerId,
            hasSubscription: !!trainer?.stripeSubscriptionId,
            connectOnboarded: trainer?.connectOnboarded ?? false,
            connectChargesEnabled: trainer?.connectChargesEnabled ?? false,
            connectPayoutsEnabled: trainer?.connectPayoutsEnabled ?? false,
          }}
        />
      </div>
    </DesktopShell>
  );
}
