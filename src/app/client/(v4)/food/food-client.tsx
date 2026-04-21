'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Minus, X, ChevronLeft, Calendar, Search, Loader2 } from 'lucide-react';
import { Apple, Heart, Clock, Camera } from 'lucide-react';
import { CalRing, MacroRing, SrcPill, type FoodSource } from '@/components/ui/mf';
import BarcodeScanner from '@/components/BarcodeScanner';

const MEALS = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as const;
type MealType = (typeof MEALS)[number];

const MEAL_TIMES: Record<MealType, string> = {
  BREAKFAST: '06:30',
  LUNCH: '12:00',
  SNACK: '15:30',
  DINNER: '19:30',
};

const MEAL_TARGET_SPLIT: Record<MealType, number> = {
  BREAKFAST: 0.22,
  LUNCH: 0.32,
  SNACK: 0.16,
  DINNER: 0.3,
};

interface Entry {
  id: string;
  name: string;
  qty: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
}

interface InitialData {
  totals: { calories: number; protein: number; carbs: number; fat: number };
  target: { calories: number; protein: number; carbs: number; fat: number };
  grouped: Record<string, Entry[]>;
  planName: string | null;
  trainerName: string | null;
}

interface SearchResult {
  id: string;
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number | string;
  servingUnit: string;
  source: string;
  category?: string | null;
  barcode?: string | null;
}

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export default function FoodClient({
  initial,
  viewDate,
  prevDate,
  todayDate,
}: {
  initial: InitialData;
  viewDate: string;
  prevDate: string;
  todayDate: string;
}) {
  const router = useRouter();
  const [drawerMeal, setDrawerMeal] = useState<MealType | null>(null);
  const isViewingToday = viewDate === todayDate;

  const proteinPct = (initial.totals.protein / initial.target.protein) * 100;
  const carbsPct = (initial.totals.carbs / initial.target.carbs) * 100;
  const fatPct = (initial.totals.fat / initial.target.fat) * 100;

  const dayLabel = parseLocalDate(viewDate)
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();

  return (
    <main className="md:hidden" style={{ padding: 0, position: 'relative' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--mf-hairline)',
        }}
      >
        <button
          className="mf-btn mf-btn-ghost"
          style={{ height: 32, width: 32, padding: 0 }}
          aria-label="Previous day"
          onClick={() => router.push(`/client/food?date=${prevDate}`)}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <div className="mf-eyebrow">{dayLabel}</div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>
            {isViewingToday ? 'FOOD LOG' : 'FOOD LOG · HISTORY'}
          </div>
        </div>
        <label
          className="mf-btn mf-btn-ghost"
          style={{
            height: 32,
            width: 32,
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
          }}
          aria-label="Pick date"
        >
          <Calendar size={16} />
          <input
            type="date"
            value={viewDate}
            max={todayDate}
            onChange={(e) => {
              const next = e.target.value;
              if (next) router.push(`/client/food?date=${next}`);
            }}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              cursor: 'pointer',
            }}
          />
        </label>
      </div>
      {!isViewingToday && (
        <button
          type="button"
          onClick={() => router.push(`/client/food?date=${todayDate}`)}
          className="mf-font-mono"
          style={{
            display: 'block',
            width: '100%',
            padding: '6px 16px',
            background: 'var(--mf-surface-2)',
            border: 'none',
            borderBottom: '1px solid var(--mf-hairline)',
            color: 'var(--mf-accent)',
            fontSize: 10,
            letterSpacing: '0.15em',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          ← JUMP BACK TO TODAY
        </button>
      )}

      {/* Hero: cal ring + macros */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--mf-hairline)',
          background: 'linear-gradient(180deg, var(--mf-surface-1) 0%, var(--mf-bg) 100%)',
        }}
      >
        <CalRing
          eaten={Math.round(initial.totals.calories)}
          target={initial.target.calories}
          burn={0}
        />
        <div
          className="grid grid-cols-3 gap-2"
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid var(--mf-hairline)',
          }}
        >
          <MacroRing
            pct={proteinPct}
            color="#FF4D1C"
            label="PROTEIN"
            value={Math.round(initial.totals.protein)}
            target={`${initial.target.protein}G`}
          />
          <MacroRing
            pct={carbsPct}
            color="#4D9EFF"
            label="CARBS"
            value={Math.round(initial.totals.carbs)}
            target={`${initial.target.carbs}G`}
          />
          <MacroRing
            pct={fatPct}
            color="#F5B544"
            label="FAT"
            value={Math.round(initial.totals.fat)}
            target={`${initial.target.fat}G`}
          />
        </div>
      </div>

      {/* Coach plan banner */}
      {initial.planName && (
        <div
          className="mf-card flex items-center gap-3"
          style={{ margin: '12px 16px 0', padding: 12 }}
        >
          <div
            className="grid place-items-center shrink-0"
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              background: 'var(--mf-accent)',
            }}
          >
            <Apple size={14} color="#0A0A0B" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {initial.planName}
            </div>
            <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9 }}>
              COACH {initial.trainerName?.toUpperCase() ?? 'MARTINEZ'}
            </div>
          </div>
        </div>
      )}

      {/* Quick chips */}
      <div
        className="flex gap-1.5 overflow-x-auto"
        style={{
          padding: '12px 16px',
          scrollbarWidth: 'none',
        }}
      >
        <button
          className="mf-chip mf-chip-live shrink-0"
          onClick={() => setDrawerMeal('SNACK')}
          style={{ height: 28, padding: '0 10px' }}
        >
          <Plus size={10} /> QUICK ADD
        </button>
        <button className="mf-chip shrink-0" style={{ height: 28, padding: '0 10px' }}>
          <Heart size={10} /> FAVORITES
        </button>
        <button className="mf-chip shrink-0" style={{ height: 28, padding: '0 10px' }}>
          <Clock size={10} /> RECENT
        </button>
      </div>

      {/* Meal sections */}
      <div style={{ paddingBottom: 24 }}>
        {MEALS.map((m) => {
          const entries = initial.grouped[m] ?? [];
          const kcal = entries.reduce((s, e) => s + e.kcal, 0);
          const target = Math.round(initial.target.calories * MEAL_TARGET_SPLIT[m]);
          return (
            <div key={m} style={{ marginBottom: 8 }}>
              <div
                className="mf-bg flex items-center justify-between"
                style={{
                  padding: '8px 16px',
                  position: 'sticky',
                  top: 0,
                  zIndex: 5,
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      width: 4,
                      height: 16,
                      borderRadius: 2,
                      background: 'var(--mf-accent)',
                    }}
                  />
                  <div>
                    <div className="mf-font-display" style={{ fontSize: 13 }}>
                      {m}
                    </div>
                    <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9 }}>
                      {entries.length} ITEMS · {MEAL_TIMES[m]}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ textAlign: 'right' }}>
                    <div
                      className="mf-font-display mf-tnum"
                      style={{ fontSize: 14, lineHeight: 1 }}
                    >
                      {kcal}
                    </div>
                    <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 9 }}>
                      / {target}
                    </div>
                  </div>
                  <button
                    className="grid place-items-center shrink-0"
                    onClick={() => setDrawerMeal(m)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'var(--mf-surface-2)',
                      border: '1px solid var(--mf-hairline-strong)',
                      cursor: 'pointer',
                    }}
                    aria-label={`Add to ${m}`}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '0 12px' }}>
                {entries.length === 0 ? (
                  <button
                    onClick={() => setDrawerMeal(m)}
                    className="mf-font-mono mf-fg-mute"
                    style={{
                      display: 'block',
                      width: '100%',
                      margin: '4px 0',
                      padding: '12px',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      border: '1px dashed var(--mf-hairline-strong)',
                      borderRadius: 6,
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    + LOG {m.toLowerCase()}
                  </button>
                ) : (
                  entries.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-3"
                      style={{ padding: '8px 12px', borderRadius: 4 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{e.name}</div>
                        <div
                          className="mf-font-mono mf-fg-mute flex items-center gap-2"
                          style={{ fontSize: 10, marginTop: 2 }}
                        >
                          <span>{e.qty}</span>
                          <span>·</span>
                          <span>{e.time}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          className="mf-font-display mf-tnum"
                          style={{ fontSize: 16, lineHeight: 1 }}
                        >
                          {e.kcal}
                        </div>
                        <div
                          className="mf-font-mono mf-fg-mute"
                          style={{ fontSize: 9, marginTop: 2 }}
                        >
                          P{e.protein} · C{e.carbs} · F{e.fat}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer */}
      {drawerMeal && (
        <LogFoodDrawer
          meal={drawerMeal}
          viewDate={viewDate}
          onClose={() => setDrawerMeal(null)}
        />
      )}
    </main>
  );
}

function LogFoodDrawer({
  meal,
  viewDate,
  onClose,
}: {
  meal: MealType;
  viewDate: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<SearchResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<FoodSource | 'all'>('all');
  const [scannerOpen, setScannerOpen] = useState(false);

  const runSearch = useCallback(async (query: string, source: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const url = `/api/food-search?q=${encodeURIComponent(query)}&source=${source}`;
      const res = await fetch(url);
      const data = await res.json();
      setResults((data.results as SearchResult[]) ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.length >= 2) runSearch(q, sourceFilter);
      else setResults([]);
    }, 250);
    return () => clearTimeout(t);
  }, [q, sourceFilter, runSearch]);

  const totalKcal = useMemo(() => picked.reduce((s, i) => s + (i.calories ?? 0), 0), [picked]);

  async function handleSubmit() {
    if (picked.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      for (const it of picked) {
        const res = await fetch('/api/food-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            foodName: it.brand ? `${it.name} (${it.brand})` : it.name,
            quantity: Number(it.servingSize) || 1,
            unit: it.servingUnit,
            calories: it.calories,
            protein: it.protein,
            carbs: it.carbs,
            fat: it.fat,
            mealType: meal,
            date: viewDate,
          }),
        });
        if (!res.ok) throw new Error('Could not save entry');
      }
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  const sourceToPill = (s: string): FoodSource => {
    if (s === 'usda') return 'usda';
    if (s === 'openfoodfacts') return 'openfoodfacts';
    if (s === 'community') return 'community';
    if (s === 'local') return 'local';
    return 'custom';
  };

  return (
    <div
      className="mf-bg"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Log to ${meal}`}
    >
      <div
        className="flex items-center gap-2 shrink-0"
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--mf-hairline)',
        }}
      >
        <button
          onClick={onClose}
          className="grid place-items-center mf-fg-mute"
          style={{ width: 32, height: 32, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1 }}>
            Log to {meal.charAt(0) + meal.slice(1).toLowerCase()}
          </div>
          <div
            className="mf-font-mono mf-fg-mute"
            style={{ fontSize: 9, marginTop: 2 }}
          >
            {picked.length} ITEM{picked.length === 1 ? '' : 'S'} · {Math.round(totalKcal)} KCAL
          </div>
        </div>
        {picked.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mf-btn mf-btn-primary"
            style={{ height: 32, padding: '0 12px', fontSize: 11 }}
          >
            {submitting ? 'ADDING…' : `ADD ${picked.length}`}
          </button>
        )}
      </div>

      {/* Search bar */}
      <div style={{ padding: '12px 12px 0', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            className="mf-fg-mute"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            className="mf-input"
            style={{ paddingLeft: 36, paddingRight: 44, height: 40, fontSize: 13 }}
            placeholder='Search "chicken breast" or scan ▥'
          />
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            aria-label="Scan barcode"
            className="grid place-items-center"
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 30,
              height: 30,
              borderRadius: 6,
              background: 'var(--mf-surface-3)',
              border: '1px solid var(--mf-hairline-strong)',
              cursor: 'pointer',
            }}
          >
            <Camera size={14} className="mf-fg-dim" />
          </button>
        </div>

        {/* Source filter pills */}
        <div
          className="flex gap-1 overflow-x-auto"
          style={{ marginTop: 8, scrollbarWidth: 'none' }}
        >
          {(
            [
              ['all', 'ALL'],
              ['local', 'LOCAL'],
              ['usda', 'USDA'],
              ['community', 'COMMUNITY'],
              ['openfoodfacts', 'OFF'],
            ] as const
          ).map(([k, l]) => {
            const active = sourceFilter === k;
            return (
              <button
                key={k}
                onClick={() => setSourceFilter(k)}
                className="mf-font-mono shrink-0"
                style={{
                  padding: '4px 8px',
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: 4,
                  background: active ? 'var(--mf-accent)' : 'var(--mf-surface-2)',
                  color: active ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                  border: `1px solid ${active ? 'var(--mf-accent)' : 'var(--mf-hairline-strong)'}`,
                  cursor: 'pointer',
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div
        className="mf-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0 16px',
        }}
      >
        {loading && (
          <div
            className="mf-fg-mute flex items-center justify-center gap-2 mf-font-mono"
            style={{ padding: '32px 0', fontSize: 11 }}
          >
            <Loader2 size={12} className="animate-spin" /> SEARCHING…
          </div>
        )}
        {error && (
          <div
            className="mf-chip mf-chip-bad"
            style={{ margin: '8px 12px', height: 'auto', padding: '8px 12px', display: 'block' }}
          >
            {error}
          </div>
        )}
        {!loading && q.length >= 2 && results.length === 0 && (
          <div
            className="mf-fg-mute mf-font-mono"
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              fontSize: 11,
            }}
          >
            NO RESULTS
          </div>
        )}
        {!loading && q.length < 2 && (
          <div
            className="mf-fg-mute mf-font-mono"
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              fontSize: 11,
              lineHeight: 1.6,
            }}
          >
            TYPE TO SEARCH FOODS.
            <br />
            USDA · OPEN FOOD FACTS · COMMUNITY DB
          </div>
        )}
        {results.map((it) => {
          const inPicked = picked.some((p) => p.id === it.id);
          return (
            <button
              key={it.id}
              onClick={() => {
                if (inPicked) setPicked(picked.filter((p) => p.id !== it.id));
                else setPicked([...picked, it]);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 16px',
                background: inPicked ? 'rgba(255,77,28,0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                borderBottom: '1px solid var(--mf-hairline)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-1.5" style={{ marginBottom: 2 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {it.name}
                  </span>
                  <SrcPill src={sourceToPill(it.source)} barcode={it.barcode ?? undefined} />
                </div>
                <div
                  className="mf-font-mono mf-fg-mute flex items-center gap-1"
                  style={{ fontSize: 10 }}
                >
                  {it.brand && (
                    <>
                      <span>{it.brand}</span>
                      <span>·</span>
                    </>
                  )}
                  <span>
                    {it.servingSize} {it.servingUnit}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div
                  className="mf-font-display mf-tnum"
                  style={{ fontSize: 16, lineHeight: 1 }}
                >
                  {Math.round(it.calories)}
                </div>
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 9, marginTop: 2 }}
                >
                  P{Math.round(it.protein)} · C{Math.round(it.carbs)} · F{Math.round(it.fat)}
                </div>
              </div>
              <div
                className="grid place-items-center shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: inPicked ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
                  color: inPicked ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
                }}
              >
                {inPicked ? <Minus size={14} /> : <Plus size={14} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Barcode scanner overlay */}
      {scannerOpen && (
        <BarcodeScanner
          onResult={async (product) => {
            // Auto-log scanned product as a food entry for this meal on the
            // currently-viewed date (mobile can now browse history).
            try {
              await fetch('/api/food-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  foodName: product.name,
                  quantity: product.servingSize || 1,
                  unit: product.servingUnit || 'serving',
                  calories: product.calories,
                  protein: product.protein,
                  carbs: product.carbs,
                  fat: product.fat,
                  mealType: meal,
                  date: viewDate,
                }),
              });
              setScannerOpen(false);
              onClose();
              router.refresh();
            } catch {
              setScannerOpen(false);
              setError('Could not save scanned food');
            }
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}
