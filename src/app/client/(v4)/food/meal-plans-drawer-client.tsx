'use client';

import { useEffect, useState } from 'react';
import { FolderOpen, X } from 'lucide-react';
import { Btn, Chip } from '@/components/ui/mf';

interface MealPlan {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  dailyCarbTarget: number;
  dailyFatTarget: number;
  trainer: { name: string | null } | null;
}

function planStatus(
  startISO: string,
  endISO: string,
): 'active' | 'upcoming' | 'ended' {
  const now = Date.now();
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MealPlansDrawerClient() {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<MealPlan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || plans !== null) return;
    setLoading(true);
    fetch('/api/meal-plans/me')
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) setError(d.error ?? 'Failed to load plans');
        else setPlans(d.plans ?? []);
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [open, plans]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <Btn icon={FolderOpen} onClick={() => setOpen(true)}>
        Meal plans
      </Btn>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="mf-bg"
            style={{
              width: 'min(480px, 100vw)',
              height: '100%',
              borderLeft: '1px solid var(--mf-hairline)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{
                padding: 16,
                borderBottom: '1px solid var(--mf-hairline)',
              }}
            >
              <div>
                <div className="mf-eyebrow">NUTRITION</div>
                <div
                  className="mf-font-display"
                  style={{
                    fontSize: 20,
                    letterSpacing: '-0.01em',
                    marginTop: 2,
                  }}
                >
                  Your meal plans
                </div>
              </div>
              <button
                type="button"
                className="mf-btn mf-btn-ghost"
                style={{ height: 32, width: 32, padding: 0 }}
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {loading && (
                <div className="mf-fg-dim" style={{ fontSize: 13 }}>
                  Loading…
                </div>
              )}
              {error && (
                <div
                  role="alert"
                  style={{
                    padding: 12,
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
              {plans && plans.length === 0 && (
                <div
                  className="mf-card"
                  style={{ padding: 24, textAlign: 'center' }}
                >
                  <div className="mf-fg-dim" style={{ fontSize: 13 }}>
                    No meal plans assigned yet.
                  </div>
                  <div
                    className="mf-fg-mute"
                    style={{ fontSize: 11, marginTop: 6 }}
                  >
                    Your coach will set macro targets here once your intake is
                    complete.
                  </div>
                </div>
              )}
              {plans && plans.length > 0 && (
                <div style={{ display: 'grid', gap: 12 }}>
                  {plans.map((p) => {
                    const status = planStatus(p.startDate, p.endDate);
                    return (
                      <div
                        key={p.id}
                        className="mf-card"
                        style={{ padding: 16 }}
                      >
                        <div
                          className="flex items-center justify-between"
                          style={{ marginBottom: 8 }}
                        >
                          <div
                            style={{ fontSize: 15, fontWeight: 600, minWidth: 0 }}
                          >
                            {p.name}
                          </div>
                          <Chip
                            kind={
                              status === 'active'
                                ? 'ok'
                                : status === 'upcoming'
                                  ? 'warn'
                                  : undefined
                            }
                          >
                            {status.toUpperCase()}
                          </Chip>
                        </div>
                        <div
                          className="mf-font-mono mf-fg-mute"
                          style={{ fontSize: 10, letterSpacing: '0.1em' }}
                        >
                          {fmtDate(p.startDate)} → {fmtDate(p.endDate)}
                          {p.trainer?.name
                            ? ` · COACH ${p.trainer.name.toUpperCase()}`
                            : ''}
                        </div>
                        {p.description && (
                          <div
                            className="mf-fg-dim"
                            style={{ fontSize: 12, marginTop: 8 }}
                          >
                            {p.description}
                          </div>
                        )}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 8,
                            marginTop: 12,
                          }}
                        >
                          <Stat label="KCAL" value={p.dailyCalorieTarget} />
                          <Stat
                            label="PROTEIN"
                            value={`${Math.round(p.dailyProteinTarget)}G`}
                          />
                          <Stat
                            label="CARBS"
                            value={`${Math.round(p.dailyCarbTarget)}G`}
                          />
                          <Stat
                            label="FAT"
                            value={`${Math.round(p.dailyFatTarget)}G`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        padding: '8px 10px',
        background: 'var(--mf-surface-2)',
        border: '1px solid var(--mf-hairline)',
        borderRadius: 4,
      }}
    >
      <div
        className="mf-font-mono mf-fg-mute"
        style={{ fontSize: 9, letterSpacing: '0.1em' }}
      >
        {label}
      </div>
      <div
        className="mf-font-display mf-tnum"
        style={{ fontSize: 18, marginTop: 2 }}
      >
        {value}
      </div>
    </div>
  );
}
