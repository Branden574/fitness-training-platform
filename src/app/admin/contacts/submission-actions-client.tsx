'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Check, UserPlus } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

type Status = 'NEW' | 'IN_PROGRESS' | 'CONTACTED' | 'INVITED' | 'COMPLETED' | 'DECLINED';

export default function SubmissionActionsClient({
  submissionId,
  email,
  currentStatus,
}: {
  submissionId: string;
  email: string;
  currentStatus: Status;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invitedCode, setInvitedCode] = useState<string | null>(null);

  async function updateStatus(next: Status) {
    setBusy(`status:${next}`);
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: submissionId, status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? 'Update failed');
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  }

  async function invite() {
    setBusy('invite');
    setError(null);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, submissionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message ?? 'Could not send invite');
      }
      const code = data?.invitation?.code ?? data?.code;
      setInvitedCode(code ?? null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invite failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {invitedCode && (
        <div
          className="mf-card"
          style={{
            padding: 12,
            marginBottom: 12,
            background: 'linear-gradient(180deg, rgba(43,217,133,0.08), transparent 60%)',
            borderColor: 'var(--mf-green)',
          }}
        >
          <div
            className="flex items-center gap-2"
            style={{ fontSize: 12, color: 'var(--mf-green)', marginBottom: 4 }}
          >
            <Check size={14} />
            <span className="mf-font-mono" style={{ letterSpacing: '0.1em' }}>
              INVITATION SENT
            </span>
          </div>
          <div className="mf-font-display mf-tnum" style={{ fontSize: 24, letterSpacing: '0.05em' }}>
            {invitedCode}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="mf-font-mono mf-fg-mute"
          style={{ fontSize: 10, letterSpacing: '0.1em', marginRight: 4 }}
        >
          MARK AS:
        </span>
        {(['NEW', 'IN_PROGRESS', 'CONTACTED', 'COMPLETED'] as const).map((s) => (
          <Btn
            key={s}
            onClick={() => updateStatus(s)}
            disabled={busy !== null || currentStatus === s}
            icon={busy === `status:${s}` ? Loader2 : undefined}
            variant={currentStatus === s ? 'primary' : 'default'}
            style={{ height: 32, padding: '0 10px', fontSize: 11 }}
          >
            {s.replace('_', ' ')}
          </Btn>
        ))}
        <span style={{ marginLeft: 'auto' }}>
          <Btn
            variant="primary"
            icon={busy === 'invite' ? Loader2 : UserPlus}
            onClick={invite}
            disabled={busy !== null || currentStatus === 'INVITED'}
          >
            {currentStatus === 'INVITED' ? 'Invite sent' : 'Send invite code'}
          </Btn>
        </span>
      </div>

      {error && (
        <div
          className="mf-chip mf-chip-bad"
          style={{ display: 'block', marginTop: 8, padding: '6px 10px', height: 'auto' }}
        >
          {error}
        </div>
      )}
    </>
  );
}
