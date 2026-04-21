import Link from 'next/link';
import { requireTrainerSession, initialsFor } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Avatar, DesktopShell } from '@/components/ui/mf';

export const dynamic = 'force-dynamic';

// Index for the Client Detail sidebar entry. Single client → jump straight
// to their detail page (saves a click). Multiple clients → render a compact
// picker so the trainer can pick which deep view to open. No clients → show
// an empty-state CTA pointing at roster/invites.
export default async function TrainerClientsIndexPage() {
  const session = await requireTrainerSession();

  const clients = await prisma.user.findMany({
    where: {
      trainerId: session.user.id,
      role: 'CLIENT',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      lastLogin: true,
      createdAt: true,
    },
    orderBy: [{ lastLogin: 'desc' }, { createdAt: 'desc' }],
  });

  if (clients.length === 1) {
    redirect(`/trainer/clients/${clients[0]!.id}`);
  }

  return (
    <DesktopShell
      role="trainer"
      active="clientdetail"
      title="Client Detail"
      breadcrumbs="TRAINER / CLIENT DETAIL"
    >
      <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
          PICK A CLIENT
        </div>
        <h1
          className="mf-font-display"
          style={{
            fontSize: 28,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            margin: '0 0 4px 0',
          }}
        >
          Client Detail
        </h1>
        <p className="mf-fg-dim" style={{ fontSize: 13, marginTop: 6, marginBottom: 24 }}>
          Deep view per athlete — big three progression, 12-week compliance,
          recent sessions, and coach notes. Pick who to open.
        </p>

        {clients.length === 0 ? (
          <div
            className="mf-card"
            style={{ padding: 40, textAlign: 'center', color: 'var(--mf-fg-mute)' }}
          >
            <div
              className="mf-font-mono"
              style={{ fontSize: 11, letterSpacing: '0.1em', marginBottom: 8 }}
            >
              NO CLIENTS YET
            </div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              Your client detail view lights up after you add athletes to your roster.
            </div>
            <Link
              href="/trainer"
              className="mf-btn mf-btn-primary"
              style={{ display: 'inline-flex', height: 40 }}
            >
              Open roster
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {clients.map((c) => {
              const initials = initialsFor(c.name, c.email);
              const lastLogin = c.lastLogin
                ? c.lastLogin.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : null;
              return (
                <Link
                  key={c.id}
                  href={`/trainer/clients/${c.id}`}
                  className="mf-card"
                  style={{
                    padding: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    textDecoration: 'none',
                    color: 'var(--mf-fg)',
                  }}
                >
                  <Avatar initials={initials} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {c.name ?? c.email}
                    </div>
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10, marginTop: 2 }}
                    >
                      {c.email}
                      {lastLogin ? ` · LAST SEEN ${lastLogin.toUpperCase()}` : ''}
                    </div>
                  </div>
                  <ChevronRight size={14} className="mf-fg-mute" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DesktopShell>
  );
}
