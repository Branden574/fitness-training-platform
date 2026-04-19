import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PublicTopNav from '@/components/ui/mf/PublicTopNav';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ApplySuccessPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get('mf_apply_success')?.value;
  if (!raw) redirect('/apply');

  let payload: { trainerId: string | null; email: string };
  try {
    payload = JSON.parse(raw);
  } catch {
    redirect('/apply');
  }

  const trainerName = payload.trainerId
    ? (
        await prisma.user.findUnique({
          where: { id: payload.trainerId },
          select: { name: true },
        })
      )?.name ?? null
    : null;

  return (
    <>
      <PublicTopNav />
      <main
        data-mf
        className="mf-bg mf-fg"
        style={{ minHeight: '100vh', padding: '96px 20px 80px' }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
            APPLICATION RECEIVED
          </div>
          <h1
            className="mf-font-display"
            style={{ fontSize: 36, margin: 0, lineHeight: 1.1 }}
          >
            Thanks — we&apos;ll be in touch.
          </h1>
          <p
            className="mf-fg-dim"
            style={{ fontSize: 15, lineHeight: 1.5, marginTop: 12 }}
          >
            {trainerName
              ? `${trainerName} reviews applications within 48 hours.`
              : 'Brent reviews applications within 48 hours.'}{' '}
            If your goals fit the current roster, you&apos;ll receive an
            invitation email with a code to join.
          </p>
          <div
            className="mf-card"
            style={{ padding: 16, marginTop: 24 }}
          >
            <Row
              label="APPLIED WITH"
              value={trainerName ?? 'Platform triage'}
            />
            <Row label="EMAIL" value={payload.email} />
          </div>
        </div>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0' }}>
      <div
        className="mf-font-mono mf-fg-dim"
        style={{ fontSize: 10, letterSpacing: '.15em', minWidth: 140 }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14 }}>{value}</div>
    </div>
  );
}
