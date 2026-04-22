'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

// "Create custom food" button + inline modal. Routes to the same
// /api/food-entries POST that search results use, just lets the client
// type arbitrary name + macros for foods not in any of our backing
// databases (homemade meals, small-brand snacks, grandma's lasagna).

const MEAL_OPTIONS: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

export default function CustomFoodButton({
  viewDate,
  defaultMeal = 'SNACK',
  className,
  label = 'Log custom food',
  fullWidth = false,
}: {
  viewDate: string;
  defaultMeal?: MealType;
  className?: string;
  label?: string;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('serving');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<MealType>(defaultMeal);
  // Default ON — community growth comes from every custom log. Client can
  // untick if they don't want grandma's lasagna searchable to everyone
  // else under the COMMUNITY filter.
  const [share, setShare] = useState(true);

  function reset() {
    setName('');
    setBrand('');
    setQuantity('1');
    setUnit('serving');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setError(null);
    setMealType(defaultMeal);
    setShare(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!calories || Number(calories) < 0) {
      setError('Calories is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 1. Optionally contribute to the shared community DB so the next
      // person typing "grandma's lasagna" finds it. Fire-and-forget from
      // the log perspective — if sharing fails we still log the entry.
      let communityFoodId: string | null = null;
      if (share) {
        try {
          const shareRes = await fetch('/api/food-community', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              brand: brand.trim() || undefined,
              calories: Number(calories),
              protein: Number(protein) || 0,
              carbs: Number(carbs) || 0,
              fat: Number(fat) || 0,
              servingSize: Number(quantity) || 1,
              servingUnit: unit,
            }),
          });
          if (shareRes.ok) {
            const data = (await shareRes.json().catch(() => ({}))) as {
              food?: { id: string };
            };
            communityFoodId = data.food?.id ?? null;
          }
        } catch {
          // Non-fatal — entry still gets logged below.
        }
      }

      const res = await fetch('/api/food-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodName: brand.trim()
            ? `${name.trim()} (${brand.trim()})`
            : name.trim(),
          quantity,
          unit,
          calories,
          protein: protein || '0',
          carbs: carbs || '0',
          fat: fat || '0',
          mealType,
          date: viewDate,
          communityFoodId,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Save failed');
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Btn
        icon={Pencil}
        onClick={() => setOpen(true)}
        className={className ?? (fullWidth ? 'w-full' : undefined)}
        style={{ height: 36, fontSize: 11 }}
      >
        {label}
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
            if (e.target === e.currentTarget && !busy) {
              setOpen(false);
              reset();
            }
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
                <div className="mf-eyebrow">LOG</div>
                <div className="mf-font-display" style={{ fontSize: 20, marginTop: 2 }}>
                  Custom food
                </div>
                <div className="mf-fg-dim" style={{ fontSize: 12, marginTop: 4 }}>
                  For meals not in USDA / Open Food Facts / your trainer&apos;s library.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!busy) {
                    setOpen(false);
                    reset();
                  }
                }}
                disabled={busy}
                aria-label="Close"
                className="mf-btn mf-btn-ghost"
                style={{ height: 32, width: 32, padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <Field label="NAME">
                <input
                  className="mf-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Grandma's lasagna"
                />
              </Field>
              <Field label="BRAND (OPT)">
                <input
                  className="mf-input"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="optional"
                />
              </Field>
            </div>

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
                  placeholder="grams"
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

            <label
              className="flex items-start gap-2"
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: 'var(--mf-surface-2)',
                border: '1px solid var(--mf-hairline)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={share}
                onChange={(e) => setShare(e.target.checked)}
                style={{ marginTop: 3, accentColor: 'var(--mf-accent)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  Share with the community
                </div>
                <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>
                  Other clients will find this food under the COMMUNITY filter.
                  Popular entries move to the top automatically. Uncheck to keep it private.
                </div>
              </div>
            </label>

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
                onClick={() => {
                  if (!busy) {
                    setOpen(false);
                    reset();
                  }
                }}
                disabled={busy}
                className="mf-btn"
              >
                Cancel
              </button>
              <button type="submit" disabled={busy} className="mf-btn mf-btn-primary">
                {busy ? 'Saving…' : 'Log it'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
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
