'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, X } from 'lucide-react';
import { Btn, Chip } from '@/components/ui/mf';

type NoteContext = 'GENERAL' | 'TRAINING' | 'NUTRITION' | 'PROGRESS';

interface InitialNote {
  id: string;
  body: string;
  context: NoteContext;
  createdAt: string;
}

export default function CoachNotesClient({
  clientId,
  initial,
}: {
  clientId: string;
  initial: InitialNote[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<InitialNote[]>(initial);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [context, setContext] = useState<NoteContext>('GENERAL');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const body = draft.trim();
    if (!body) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/coach-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, body, context }),
      });
      if (!res.ok) throw new Error('Could not save');
      const note = (await res.json()) as InitialNote;
      setNotes([note, ...notes]);
      setDraft('');
      setContext('GENERAL');
      setComposing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this note?')) return;
    try {
      const res = await fetch(`/api/coach-notes?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setNotes(notes.filter((n) => n.id !== id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div className="mf-card" style={{ padding: 16 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div className="mf-eyebrow">COACH NOTES</div>
        <Btn
          variant="ghost"
          icon={composing ? X : Plus}
          style={{ height: 28, padding: '0 8px', fontSize: 11 }}
          onClick={() => setComposing(!composing)}
        >
          {composing ? 'Cancel' : 'Note'}
        </Btn>
      </div>

      {composing && (
        <div
          className="mf-card"
          style={{
            padding: 12,
            marginBottom: 12,
            background: 'var(--mf-surface-2)',
          }}
        >
          <div className="flex items-center gap-1" style={{ marginBottom: 8 }}>
            {(['GENERAL', 'TRAINING', 'NUTRITION', 'PROGRESS'] as const).map((c) => {
              const active = context === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setContext(c)}
                  className="mf-font-mono"
                  style={{
                    padding: '4px 8px',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    borderRadius: 4,
                    background: active ? 'var(--mf-accent)' : 'transparent',
                    color: active ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                    border: `1px solid ${active ? 'var(--mf-accent)' : 'var(--mf-hairline)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <textarea
            className="mf-input"
            rows={3}
            placeholder="What should future-you know about this athlete?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            style={{ fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
          />
          {error && (
            <div
              className="mf-chip mf-chip-bad"
              style={{ marginTop: 8, padding: '4px 8px', height: 'auto', display: 'block' }}
            >
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2" style={{ marginTop: 8 }}>
            <Btn
              variant="primary"
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              icon={saving ? Loader2 : undefined}
              style={{ height: 32 }}
            >
              {saving ? 'Saving…' : 'Save note'}
            </Btn>
          </div>
        </div>
      )}

      {notes.length === 0 && !composing && (
        <div className="mf-fg-mute mf-font-mono" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
          NO NOTES YET
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {notes.map((n) => (
          <div
            key={n.id}
            style={{ paddingLeft: 12, borderLeft: '2px solid var(--mf-accent)', position: 'relative' }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
              <span
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 10 }}
              >
                {new Date(n.createdAt)
                  .toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
                  .replace('/', '.')}
              </span>
              {n.context !== 'GENERAL' && <Chip>{n.context}</Chip>}
              <button
                type="button"
                onClick={() => handleDelete(n.id)}
                className="mf-fg-mute"
                style={{
                  marginLeft: 'auto',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                }}
                aria-label="Delete note"
              >
                <X size={12} />
              </button>
            </div>
            <div className="mf-fg-dim" style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {n.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
