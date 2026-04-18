'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export default function NewProgramClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationWks, setDurationWks] = useState(8);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Seed with empty week skeletons so the detail view has something to edit
      const weeks = Array.from({ length: durationWks }, (_, i) => ({
        weekNumber: i + 1,
        name: null,
        days: DAYS.map((d, di) => ({
          dayOfWeek: d,
          sessionType: d === 'WED' || d === 'SUN' ? 'Rest' : 'Session',
          order: di,
          exercises: [],
        })),
      }));

      const res = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          durationWks,
          isTemplate: true,
          weeks,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Could not create');
      }
      const program = (await res.json()) as { id: string };
      router.push(`/trainer/builder/${program.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create');
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between" style={{ marginBottom: 0 }}>
        <div>
          <div className="mf-eyebrow">NEW PROGRAM</div>
          <div
            className="mf-fg-dim"
            style={{ fontSize: 13, marginTop: 4 }}
          >
            Name + duration gets you a 7-day empty week skeleton per week. Add exercises inside.
          </div>
        </div>
        <Btn variant="primary" icon={Plus} onClick={() => setOpen(true)}>
          New program
        </Btn>
      </div>
    );
  }

  return (
    <div
      className="mf-card-elev"
      style={{ padding: 20, marginBottom: 0 }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="mf-eyebrow">NEW PROGRAM</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cancel"
          className="mf-fg-mute"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <X size={16} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <label className="block">
          <div className="mf-eyebrow" style={{ marginBottom: 6 }}>NAME</div>
          <input
            className="mf-input"
            placeholder="Hypertrophy · 12 wk"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block">
          <div className="mf-eyebrow" style={{ marginBottom: 6 }}>DURATION · WEEKS</div>
          <input
            className="mf-input"
            type="number"
            min={1}
            max={52}
            value={durationWks}
            onChange={(e) => setDurationWks(Math.max(1, Math.min(52, Number(e.target.value) || 1)))}
          />
        </label>
      </div>
      <label className="block" style={{ marginTop: 12 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 6 }}>DESCRIPTION</div>
        <textarea
          className="mf-input"
          rows={2}
          placeholder="Volume block into peak. Block programming, 5-wave progression."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ fontFamily: 'inherit', resize: 'vertical' }}
        />
      </label>
      {error && (
        <div
          className="mf-chip mf-chip-bad"
          style={{ marginTop: 8, padding: '6px 10px', height: 'auto', display: 'block' }}
        >
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2" style={{ marginTop: 16 }}>
        <Btn onClick={() => setOpen(false)}>Cancel</Btn>
        <Btn
          variant="primary"
          icon={Plus}
          onClick={handleCreate}
          disabled={submitting}
        >
          {submitting ? 'Creating…' : 'Create program'}
        </Btn>
      </div>
    </div>
  );
}
