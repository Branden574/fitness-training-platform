'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Pencil, Trash2, X } from 'lucide-react';

type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface EditableFoodEntry {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
}

// Three-dot menu + edit/delete flow for a single FoodEntry row. Previously
// the MoreHorizontal button was inert; the API already accepts PUT/DELETE
// on /api/food-entries?id=<id>, this wires them up. Portals the dropdown
// to document.body so row overflow doesn't clip it.
//
// Optimistic delete: the parent passes `onDeleted(id)` and the row
// vanishes the instant the DELETE resolves, before router.refresh()
// re-hydrates the server data. Without this the user sees a stale row
// for ~300–800ms until the server round-trips.

const MEAL_OPTIONS: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

export default function FoodEntryActions({
  entry,
  onDeleted,
}: {
  entry: EditableFoodEntry;
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    // Close on outside click. Listens on `click` (not `mousedown`) because
    // mousedown fires before React dispatches the menu item's onClick — if
    // we closed the menu on mousedown the portal would unmount before the
    // click landed, and Edit/Delete would silently no-op. Also gates on
    // both triggerRef and menuRef so clicks inside the portal'd menu don't
    // close it immediately.
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current && triggerRef.current.contains(t)) return;
      if (menuRef.current && menuRef.current.contains(t)) return;
      setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  function openMenu() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 160),
      });
    }
    setMenuOpen(true);
  }

  async function onDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/food-entries?id=${entry.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Delete failed');
        setBusy(false);
        return;
      }
      // Vanish the row locally first so the UI reacts immediately, then
      // let server state catch up in the background.
      onDeleted?.(entry.id);
      setConfirmDelete(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        className="mf-fg-mute"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
        }}
        aria-label={`Actions for ${entry.name}`}
        aria-expanded={menuOpen}
      >
        <MoreHorizontal size={14} />
      </button>

      {menuOpen && menuPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              className="mf-card-elev"
              role="menu"
              style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                minWidth: 160,
                zIndex: 1200,
                padding: 4,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setEditOpen(true);
                }}
                className="flex items-center gap-2"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--mf-fg)',
                  borderRadius: 4,
                  textAlign: 'left',
                }}
              >
                <Pencil size={13} />
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
                className="flex items-center gap-2"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--mf-red)',
                  borderRadius: 4,
                  textAlign: 'left',
                }}
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>,
            document.body,
          )
        : null}

      {editOpen && (
        <EditEntryModal
          entry={entry}
          busy={busy}
          setBusy={setBusy}
          error={error}
          setError={setError}
          onClose={() => {
            setEditOpen(false);
            setError(null);
          }}
          onSaved={() => {
            setEditOpen(false);
            setError(null);
            router.refresh();
          }}
        />
      )}

      {confirmDelete && (
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
            if (e.target === e.currentTarget && !busy) setConfirmDelete(false);
          }}
        >
          <div
            className="mf-card-elev"
            style={{
              width: 'min(380px, 100%)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div className="mf-eyebrow" style={{ color: 'var(--mf-red)' }}>
              DELETE ENTRY
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              Remove <strong>{entry.name}</strong> from your log?
            </div>
            {error && (
              <div
                role="alert"
                style={{
                  padding: '8px 10px',
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
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
                className="mf-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={busy}
                className="mf-btn"
                style={{
                  background: '#6b1f1f',
                  borderColor: '#6b1f1f',
                  color: '#fca5a5',
                }}
              >
                {busy ? 'Removing…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EditEntryModal({
  entry,
  busy,
  setBusy,
  error,
  setError,
  onClose,
  onSaved,
}: {
  entry: EditableFoodEntry;
  busy: boolean;
  setBusy: (b: boolean) => void;
  error: string | null;
  setError: (s: string | null) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(entry.name);
  const [quantity, setQuantity] = useState(String(entry.quantity));
  const [unit, setUnit] = useState(entry.unit);
  const [calories, setCalories] = useState(String(Math.round(entry.calories)));
  const [protein, setProtein] = useState(String(Math.round(entry.protein)));
  const [carbs, setCarbs] = useState(String(Math.round(entry.carbs)));
  const [fat, setFat] = useState(String(Math.round(entry.fat)));
  const [mealType, setMealType] = useState<MealType>(entry.mealType);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/food-entries?id=${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodName: name.trim(),
          quantity,
          unit,
          calories,
          protein,
          carbs,
          fat,
          mealType,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Save failed');
        return;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
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
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="mf-card-elev"
        style={{
          width: 'min(480px, 100%)',
          padding: 24,
          display: 'grid',
          gap: 12,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="mf-eyebrow">EDIT</div>
            <div className="mf-font-display" style={{ fontSize: 20, marginTop: 2 }}>
              Food entry
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="mf-btn mf-btn-ghost"
            style={{ height: 32, width: 32, padding: 0 }}
          >
            <X size={14} />
          </button>
        </div>

        <Field label="NAME">
          <input
            className="mf-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <Field label="QUANTITY">
            <input
              type="number"
              min={0}
              step="0.01"
              className="mf-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </Field>
          <Field label="UNIT">
            <input
              className="mf-input"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </Field>
          <Field label="MEAL">
            <select
              className="mf-input"
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
            >
              {MEAL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Field label="KCAL">
            <input
              type="number"
              min={0}
              className="mf-input"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              required
            />
          </Field>
          <Field label="PROTEIN G">
            <input
              type="number"
              min={0}
              step="0.1"
              className="mf-input"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </Field>
          <Field label="CARBS G">
            <input
              type="number"
              min={0}
              step="0.1"
              className="mf-input"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
            />
          </Field>
          <Field label="FAT G">
            <input
              type="number"
              min={0}
              step="0.1"
              className="mf-input"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
            />
          </Field>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '8px 10px',
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
          <button type="button" onClick={onClose} disabled={busy} className="mf-btn">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="mf-btn mf-btn-primary"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div
        className="mf-font-mono mf-fg-mute"
        style={{
          fontSize: 9,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}
