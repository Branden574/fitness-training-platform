'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

// Trash-the-program affordance on the builder detail page. Soft-archives
// the program AND cancels every active client assignment via the DELETE
// /api/programs/[id] route (transactional). Trainers expected this to
// "just work" during testing; before, programs archived but clients
// still saw them as active.

export default function DeleteProgramButton({
  programId,
  programName,
  activeAssignments,
}: {
  programId: string;
  programName: string;
  activeAssignments: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/programs/${programId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Delete failed');
        setBusy(false);
        return;
      }
      router.push('/trainer/builder');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setBusy(false);
    }
  }

  return (
    <>
      <Btn variant="ghost" icon={Trash2} onClick={() => setOpen(true)}>
        Delete
      </Btn>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div
            className="mf-card-elev"
            style={{
              width: 'min(440px, 100%)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div>
              <div className="mf-eyebrow" style={{ color: 'var(--mf-red)' }}>
                DELETE PROGRAM
              </div>
              <div
                className="mf-font-display"
                style={{ fontSize: 20, letterSpacing: '-0.01em', marginTop: 4 }}
              >
                Remove {programName}?
              </div>
            </div>
            <div className="mf-fg-dim" style={{ fontSize: 13, lineHeight: 1.5 }}>
              The program will be archived and {activeAssignments}{' '}
              {activeAssignments === 1 ? 'client' : 'clients'} currently on it
              will be unassigned. They&apos;ll get a notification that their
              program ended. Session history is preserved.
            </div>
            {error && (
              <div
                role="alert"
                style={{
                  padding: '8px 12px',
                  background: '#2a1212',
                  border: '1px solid #6b1f1f',
                  color: '#fca5a5',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="mf-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busy}
                className="mf-btn"
                style={{
                  background: '#6b1f1f',
                  borderColor: '#6b1f1f',
                  color: '#fca5a5',
                }}
              >
                {busy ? 'Removing…' : 'Delete program'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
