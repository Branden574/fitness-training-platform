import { requireTrainerSession } from '@/lib/trainer-data';
import { DesktopShell } from '@/components/ui/mf';
import {
  AGREEMENT_MARKDOWN,
  AGREEMENT_PLACEHOLDER_BANNER,
  AGREEMENT_TITLE,
  CURRENT_AGREEMENT_VERSION,
} from '@/lib/legal/agreement-text';
import AgreementClient from './agreement-client';

export const dynamic = 'force-dynamic';

export default async function TrainerAgreementPage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  await requireTrainerSession();
  const sp = await searchParams;
  const returnTo = sp.return ?? '/trainer/settings';

  return (
    <DesktopShell
      role="trainer"
      active="settings"
      title={AGREEMENT_TITLE}
      breadcrumbs="TRAINER / AGREEMENT"
    >
      <div style={{ padding: 24, maxWidth: 760 }}>
        <div
          className="mf-card-elev"
          style={{
            padding: 12,
            marginBottom: 20,
            borderColor: 'var(--mf-amber, #F5B544)',
            background: 'rgba(245,181,68,0.08)',
          }}
        >
          <div
            className="mf-font-mono"
            style={{
              fontSize: 11,
              letterSpacing: '.1em',
              color: 'var(--mf-amber, #F5B544)',
            }}
          >
            {AGREEMENT_PLACEHOLDER_BANNER}
          </div>
        </div>

        <AgreementClient
          markdown={AGREEMENT_MARKDOWN}
          version={CURRENT_AGREEMENT_VERSION}
          returnTo={returnTo}
        />
      </div>
    </DesktopShell>
  );
}
