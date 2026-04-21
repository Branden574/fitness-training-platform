'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

interface ClientOption {
  id: string;
  name: string | null;
  email: string;
}

interface Props {
  clients: ClientOption[];
  defaultClientId: string | null;
}

function todayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function plusDaysIso(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AssignMealPlanClient({
  clients,
  defaultClientId,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string>(
    defaultClientId ?? clients[0]?.id ?? '',
  );
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(plusDaysIso(28));
  const [kcal, setKcal] = useState(2400);
  const [protein, setProtein] = useState(160);
  const [carbs, setCarbs] = useState(260);
  const [fat, setFat] = useState(70);

  const reset = () => {
    setName('');
    setStartDate(todayIso());
    setEndDate(plusDaysIso(28));
    setKcal(2400);
    setProtein(160);
    setCarbs(260);
    setFat(70);
    setError(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!userId) {
      setError('Pick a client first.');
      return;
    }
    if (!name.trim()) {
      setError('Plan name is required.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: name.trim(),
          startDate,
          endDate,
          dailyCalorieTarget: Number(kcal),
          dailyProteinTarget: Number(protein),
          dailyCarbTarget: Number(carbs),
          dailyFatTarget: Number(fat),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Create failed');
        return;
      }
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Btn
        variant="primary"
        icon={Plus}
        onClick={() => setOpen(true)}
        disabled={clients.length === 0}
        title={
          clients.length === 0
            ? 'No clients yet — invite one from /admin/invitations first.'
            : undefined
        }
      >
        Assign meal plan
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
            if (e.target === e.currentTarget) close();
          }}
        >
          <form
            onSubmit={submit}
            className="mf-card-elev"
            style={{
              width: 'min(560px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              display: 'grid',
              gap: 14,
            }}
          >
            <div className="flex items-center justify-between">
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
                  Assign meal plan
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="mf-btn mf-btn-ghost"
                style={{ height: 32, width: 32, padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>

            <Field label="CLIENT" required>
              <select
                className="mf-input"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ?? c.email}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="PLAN NAME" required>
              <input
                className="mf-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={120}
                placeholder="Cut · Week 1-4"
              />
            </Field>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <Field label="START DATE">
                <input
                  type="date"
                  className="mf-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="END DATE">
                <input
                  type="date"
                  className="mf-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  required
                />
              </Field>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
              }}
            >
              <Field label="KCAL / DAY">
                <input
                  type="number"
                  className="mf-input"
                  value={kcal}
                  min={0}
                  max={10000}
                  onChange={(e) => setKcal(Number(e.target.value))}
                  required
                />
              </Field>
              <Field label="PROTEIN G">
                <input
                  type="number"
                  className="mf-input"
                  value={protein}
                  min={0}
                  max={1000}
                  onChange={(e) => setProtein(Number(e.target.value))}
                  required
                />
              </Field>
              <Field label="CARBS G">
                <input
                  type="number"
                  className="mf-input"
                  value={carbs}
                  min={0}
                  max={2000}
                  onChange={(e) => setCarbs(Number(e.target.value))}
                  required
                />
              </Field>
              <Field label="FAT G">
                <input
                  type="number"
                  className="mf-input"
                  value={fat}
                  min={0}
                  max={500}
                  onChange={(e) => setFat(Number(e.target.value))}
                  required
                />
              </Field>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  padding: '10px 12px',
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
              <button type="button" onClick={close} className="mf-btn">
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="mf-btn mf-btn-primary"
              >
                {busy ? 'Assigning…' : 'Assign plan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div
        style={{
          fontFamily: 'var(--font-mf-mono), monospace',
          fontSize: 10,
          letterSpacing: '.15em',
          color: 'var(--mf-fg-dim)',
          marginBottom: 6,
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--mf-accent)', marginLeft: 4 }}>*</span>
        )}
      </div>
      {children}
    </label>
  );
}
