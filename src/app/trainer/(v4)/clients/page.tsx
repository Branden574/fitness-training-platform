import Link from 'next/link';
import { requireTrainerSession, initialsFor, getArchivedClients } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Avatar, DesktopShell } from '@/components/ui/mf';
import ArchivedRowActions from './archived-row-actions-client';

export const dynamic = 'force-dynamic';

// Small server-side helper — how many days until the 30-day purge window closes.
function daysUntilPurge(archivedAt: Date): number {
  const ms = archivedAt.getTime() + 30 * 86400000 - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

// Server-side relative time for archived timestamps (no interactivity needed).
function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return 'just now';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Index for the Client Detail sidebar entry. Single client → jump straight
// to their detail page (saves a click). Multiple clients → render a compact
// picker so the trainer can pick which deep view to open. No clients → show
// an empty-state CTA pointing at roster/invites.
export default async function TrainerClientsIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTrainerSession();
  const params = await searchParams;
  const tab = params['tab'] === 'archived' ? 'archived' : 'active';

  // ── Archived tab ──────────────────────────────────────────────────────────
  if (tab === 'archived') {
    const archived = await getArchivedClients(session.user.id);

    return (
      <DesktopShell
        role="trainer"
        active="clientdetail"
        title="Client Detail"
        breadcrumbs="TRAINER / CLIENT DETAIL"
      >
        <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
            CLIENT DETAIL
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
            Deep view per athlete — big three progression, 12-week compliance, recent sessions, and
            coach notes.
          </p>

          {/* Tab strip */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
            <Link
              href="/trainer/clients"
              className="mf-btn"
              style={{ height: 32, padding: '0 14px', fontSize: 12 }}
            >
              Active
            </Link>
            <Link
              href="/trainer/clients?tab=archived"
              className="mf-btn"
              style={{
                height: 32,
                padding: '0 14px',
                fontSize: 12,
                background: 'var(--mf-accent)',
                color: 'var(--mf-bg)',
                borderColor: 'var(--mf-accent)',
              }}
            >
              Archived
            </Link>
          </div>

          {archived.length === 0 ? (
            <div
              className="mf-card"
              style={{ padding: 40, textAlign: 'center', color: 'var(--mf-fg-mute)' }}
            >
              <div
                className="mf-font-mono"
                style={{ fontSize: 11, letterSpacing: '0.1em', marginBottom: 8 }}
              >
                NO ARCHIVED CLIENTS
              </div>
              <div style={{ fontSize: 13 }}>
                Clients you drop will appear here for 30 days before being permanently purged.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {archived.map((client) => (
                <div
                  key={client.id}
                  className="mf-card"
                  style={{ padding: 12 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="mf-fg" style={{ fontSize: 14, fontWeight: 600 }}>
                        {client.name ?? client.email}
                      </div>
                      <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 4 }}>
                        Archived {relativeTime(client.archivedAt)} &middot;{' '}
                        Purges in {daysUntilPurge(client.archivedAt)} days
                        {client.archivedReason ? (
                          <>
                            {' · '}
                            <span style={{ fontStyle: 'italic' }}>
                              &ldquo;{client.archivedReason}&rdquo;
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <ArchivedRowActions
                      clientId={client.id}
                      clientName={client.name ?? client.email}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DesktopShell>
    );
  }

  // ── Active tab (default) ──────────────────────────────────────────────────
  const clients = await prisma.user.findMany({
    where: {
      trainerId: session.user.id,
      role: 'CLIENT',
      isActive: true,
      // Exclude archived clients from the active picker.
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
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

        {/* Tab strip */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          <Link
            href="/trainer/clients"
            className="mf-btn"
            style={{
              height: 32,
              padding: '0 14px',
              fontSize: 12,
              background: 'var(--mf-accent)',
              color: 'var(--mf-bg)',
              borderColor: 'var(--mf-accent)',
            }}
          >
            Active
          </Link>
          <Link
            href="/trainer/clients?tab=archived"
            className="mf-btn"
            style={{ height: 32, padding: '0 14px', fontSize: 12 }}
          >
            Archived
          </Link>
        </div>

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
                  <Avatar initials={initials} image={c.image} alt={c.name ?? c.email} />
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
