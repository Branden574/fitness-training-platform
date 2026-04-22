'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface ActivePlanRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  dailyCalorieTarget: number;
}

// Tight list of every active+future meal plan for a client with a delete
// affordance per row. Exists because until now the trainer only saw one
// plan at a time (`take: 1`) and couldn't remove accidental duplicates.
// Shows a confirm step before hitting DELETE so a slipped click doesn't
// nuke a plan the client is actively eating against.

export default function ActivePlansList({ plans }: { plans: ActivePlanRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  if (plans.length === 0) return null;

  async function doDelete(id: string, name: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/meal-plans/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setToast({ kind: 'err', msg: data.error ?? 'Delete failed' });
        return;
      }
      setToast({ kind: 'ok', msg: `Removed "${name}".` });
      setPendingId(null);
      router.refresh();
    } catch (e) {
      setToast({
        kind: 'err',
        msg: e instanceof Error ? e.message : 'Network error',
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mf-card" style={{ marginBottom: 24, overflow: 'hidden' }}>
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--mf-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="mf-eyebrow">ACTIVE PLANS · {plans.length}</div>
        {plans.length > 1 && (
          <div
            className="mf-font-mono"
            style={{ fontSize: 10, color: 'var(--mf-amber)', letterSpacing: '0.1em' }}
          >
            <AlertTriangle size={10} style={{ verticalAlign: -1, marginRight: 4 }} />
            MULTIPLE OVERLAPPING — CHECK FOR DUPLICATE
          </div>
        )}
      </div>
      {plans.map((p, i) => (
        <div
          key={p.id}
          style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: i < plans.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
            <div
              className="mf-font-mono mf-fg-mute"
              style={{ fontSize: 10, marginTop: 2, letterSpacing: '0.1em' }}
            >
              {p.startDate} → {p.endDate} · {p.dailyCalorieTarget} KCAL
            </div>
          </div>
          {pendingId === p.id ? (
            <div className="flex items-center gap-2">
              <span className="mf-fg-mute" style={{ fontSize: 11 }}>
                Delete {p.name}?
              </span>
              <button
                type="button"
                onClick={() => setPendingId(null)}
                disabled={busyId === p.id}
                className="mf-btn"
                style={{ height: 28, fontSize: 11 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => doDelete(p.id, p.name)}
                disabled={busyId === p.id}
                className="mf-btn"
                style={{
                  height: 28,
                  fontSize: 11,
                  background: '#6b1f1f',
                  borderColor: '#6b1f1f',
                  color: '#fca5a5',
                }}
              >
                {busyId === p.id ? 'Removing…' : 'Delete'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPendingId(p.id)}
              className="mf-btn mf-btn-ghost"
              style={{ height: 28, width: 28, padding: 0 }}
              aria-label={`Delete ${p.name}`}
              title="Delete plan"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            background: toast.kind === 'ok' ? '#10291a' : '#2a1212',
            border: `1px solid ${toast.kind === 'ok' ? '#1f6b3a' : '#6b1f1f'}`,
            color: toast.kind === 'ok' ? '#a7f3c2' : '#fca5a5',
            borderRadius: 8,
            fontSize: 13,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          {toast.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
