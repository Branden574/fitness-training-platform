'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Loader2, MoreHorizontal, Camera, Copy, FolderOpen } from 'lucide-react';
import { Btn, Chip, ClientDesktopShell, SrcPill, type FoodSource } from '@/components/ui/mf';
import BarcodeScanner from '@/components/BarcodeScanner';
import type { ClientContext } from '@/lib/client-data';

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

const SOURCE_OPTIONS: ReadonlyArray<readonly [FoodSource | 'all', string]> = [
  ['all', 'ALL'],
  ['local', 'LOCAL'],
  ['usda', 'USDA'],
  ['community', 'COMMUNITY'],
  ['openfoodfacts', 'OFF'],
];

function sourceToPill(s: string): FoodSource {
  if (s === 'usda') return 'usda';
  if (s === 'openfoodfacts') return 'openfoodfacts';
  if (s === 'community') return 'community';
  if (s === 'local') return 'local';
  return 'custom';
}

function formatDesktopTitle(d: Date): string {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  return `Food Log · ${weekday}, ${month} ${d.getDate()}`;
}

export default function FoodDesktop({
  ctx,
  initial,
}: {
  ctx: ClientContext;
  initial: InitialData;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<FoodSource | 'all'>('all');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [logTarget, setLogTarget] = useState<MealType>('LUNCH');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function logFood(it: SearchResult, meal: MealType) {
    setPending(it.id);
    setError(null);
    const dateStr = new Date().toLocaleDateString('en-CA');
    try {
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
          date: dateStr,
        }),
      });
      if (!res.ok) throw new Error('Could not save entry');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setPending(null);
    }
  }

  const remaining = Math.max(0, initial.target.calories - Math.round(initial.totals.calories));
  const caloriePct = Math.min(
    100,
    Math.round((initial.totals.calories / initial.target.calories) * 100),
  );
  const proteinPct = Math.min(
    100,
    Math.round((initial.totals.protein / initial.target.protein) * 100),
  );
  const carbsPct = Math.min(
    100,
    Math.round((initial.totals.carbs / initial.target.carbs) * 100),
  );
  const fatPct = Math.min(100, Math.round((initial.totals.fat / initial.target.fat) * 100));

  const macroCards: ReadonlyArray<readonly [string, number, number, string, number]> = [
    ['PROTEIN', Math.round(initial.totals.protein), initial.target.protein, '#FF4D1C', proteinPct],
    ['CARBS', Math.round(initial.totals.carbs), initial.target.carbs, '#4D9EFF', carbsPct],
    ['FAT', Math.round(initial.totals.fat), initial.target.fat, '#F5B544', fatPct],
  ];

  const meals = MEALS.map((m) => {
    const items = initial.grouped[m] ?? [];
    const kcal = items.reduce((s, e) => s + e.kcal, 0);
    const target = Math.round(initial.target.calories * MEAL_TARGET_SPLIT[m]);
    return { m, t: MEAL_TIMES[m], target, kcal, items };
  });

  return (
    <div className="hidden md:block">
      <ClientDesktopShell
        active="food"
        title={formatDesktopTitle(new Date())}
        breadcrumbs="NUTRITION"
        athleteInitials={ctx.initials}
        athleteName={ctx.name ?? ctx.email}
        athleteMeta={ctx.trainer?.name ? `COACH · ${ctx.trainer.name.toUpperCase()}` : undefined}
        headerRight={
          <>
            <Chip>{`${Math.round(initial.totals.calories)} / ${initial.target.calories} KCAL`}</Chip>
            <Btn icon={Copy} disabled>
              Copy yesterday
            </Btn>
            <Btn icon={FolderOpen} disabled>
              Meal plans
            </Btn>
          </>
        }
      >
        <div className="p-6 grid grid-cols-12 gap-5">
          {/* Macro summary — 5-col KPI strip */}
          <div className="col-span-12 grid grid-cols-5 gap-3">
            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                REMAINING
              </div>
              <div
                className="mf-font-display mf-tnum mf-accent"
                style={{ fontSize: 36, lineHeight: 1 }}
              >
                {remaining}
              </div>
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 10, marginTop: 4 }}
              >
                / {initial.target.calories} KCAL TARGET
              </div>
              <div
                className="h-1.5 rounded"
                style={{ background: 'var(--mf-hairline)', marginTop: 12 }}
              >
                <div
                  style={{
                    width: `${caloriePct}%`,
                    height: '100%',
                    background: 'var(--mf-accent)',
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>

            {macroCards.map(([label, v, t, color, pct]) => (
              <div key={label} className="mf-card" style={{ padding: 16 }}>
                <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                  {label}
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="mf-font-display mf-tnum"
                    style={{ fontSize: 36, lineHeight: 1 }}
                  >
                    {v}
                  </span>
                  <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 11 }}>
                    / {t}G
                  </span>
                </div>
                <div
                  className="h-1.5 rounded"
                  style={{ background: 'var(--mf-hairline)', marginTop: 12 }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: color,
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))}

            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                CALORIES IN
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className="mf-font-display mf-tnum"
                  style={{ fontSize: 36, lineHeight: 1 }}
                >
                  {Math.round(initial.totals.calories)}
                </span>
                <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 11 }}>
                  / {initial.target.calories}
                </span>
              </div>
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 10, marginTop: 8 }}
              >
                {caloriePct}% OF TARGET
              </div>
              <div
                className="h-1.5 rounded"
                style={{ background: 'var(--mf-hairline)', marginTop: 8 }}
              >
                <div
                  style={{
                    width: `${caloriePct}%`,
                    height: '100%',
                    background: 'var(--mf-accent)',
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Meal log — 8 cols */}
          <div
            className="col-span-8"
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {initial.planName && (
              <div
                className="mf-card flex items-center gap-3"
                style={{ padding: 14 }}
              >
                <div
                  style={{
                    width: 4,
                    height: 28,
                    borderRadius: 2,
                    background: 'var(--mf-accent)',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{initial.planName}</div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 10, marginTop: 2 }}
                  >
                    COACH {initial.trainerName?.toUpperCase() ?? 'MARTINEZ'}
                  </div>
                </div>
              </div>
            )}

            {meals.map((m) => (
              <div key={m.m} className="mf-card">
                <div
                  className="flex items-center gap-3"
                  style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--mf-hairline)',
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 20,
                      borderRadius: 2,
                      background: 'var(--mf-accent)',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mf-font-display" style={{ fontSize: 15, lineHeight: 1 }}>
                      {m.m}
                    </div>
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10, marginTop: 2 }}
                    >
                      {m.t} · {m.items.length} ITEM{m.items.length === 1 ? '' : 'S'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      className="mf-font-display mf-tnum"
                      style={{ fontSize: 16, lineHeight: 1 }}
                    >
                      {m.kcal}{' '}
                      <span className="mf-fg-mute" style={{ fontSize: 11 }}>
                        / {m.target}
                      </span>
                    </div>
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 9, marginTop: 2 }}
                    >
                      KCAL
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogTarget(m.m)}
                    className="mf-btn"
                    style={{
                      height: 32,
                      fontSize: 11,
                      padding: '0 10px',
                      background:
                        logTarget === m.m ? 'var(--mf-accent)' : 'var(--mf-surface-2)',
                      color:
                        logTarget === m.m ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                      border: `1px solid ${
                        logTarget === m.m ? 'var(--mf-accent)' : 'var(--mf-hairline-strong)'
                      }`,
                    }}
                  >
                    {logTarget === m.m ? 'TARGET' : 'SET TARGET'}
                  </button>
                </div>
                <div>
                  {m.items.length === 0 ? (
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{
                        padding: '16px 20px',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      NOT YET LOGGED
                    </div>
                  ) : (
                    m.items.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center gap-3"
                        style={{
                          padding: '10px 20px',
                          borderBottom: '1px solid var(--mf-hairline)',
                          fontSize: 13,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              marginBottom: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {it.name}
                          </div>
                          <div
                            className="mf-font-mono mf-fg-mute"
                            style={{ fontSize: 10 }}
                          >
                            {it.qty} · {it.time}
                          </div>
                        </div>
                        <div
                          className="mf-font-mono mf-fg-dim flex gap-3"
                          style={{ fontSize: 10 }}
                        >
                          <span>
                            <span
                              className="mf-font-display"
                              style={{ fontSize: 12, color: 'var(--mf-fg)' }}
                            >
                              {it.protein}
                            </span>
                            P
                          </span>
                          <span>
                            <span
                              className="mf-font-display"
                              style={{ fontSize: 12, color: 'var(--mf-fg)' }}
                            >
                              {it.carbs}
                            </span>
                            C
                          </span>
                          <span>
                            <span
                              className="mf-font-display"
                              style={{ fontSize: 12, color: 'var(--mf-fg)' }}
                            >
                              {it.fat}
                            </span>
                            F
                          </span>
                        </div>
                        <div
                          className="mf-font-display mf-tnum"
                          style={{ fontSize: 16, width: 56, textAlign: 'right' }}
                        >
                          {it.kcal}
                        </div>
                        <button
                          type="button"
                          className="mf-fg-mute"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          aria-label="More"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Search side panel — 4 cols */}
          <aside
            className="col-span-4 mf-card-elev"
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 700,
              position: 'sticky',
              top: 0,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: 16, borderBottom: '1px solid var(--mf-hairline)' }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                QUICK LOG · {logTarget}
              </div>
              <div style={{ position: 'relative', marginBottom: 8 }}>
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
                  className="mf-input"
                  style={{
                    paddingLeft: 36,
                    paddingRight: 44,
                    height: 40,
                    fontSize: 13,
                  }}
                  placeholder="Search foods or scan"
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
              <div
                className="flex gap-1 overflow-x-auto"
                style={{ scrollbarWidth: 'none' }}
              >
                {SOURCE_OPTIONS.map(([k, l]) => {
                  const active = sourceFilter === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setSourceFilter(k)}
                      type="button"
                      className="mf-font-mono shrink-0"
                      style={{
                        padding: '4px 8px',
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        borderRadius: 4,
                        background: active ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
                        color: active ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                        border: `1px solid ${
                          active ? 'var(--mf-accent)' : 'var(--mf-hairline-strong)'
                        }`,
                        cursor: 'pointer',
                      }}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="mf-scroll"
              style={{ flex: 1, overflowY: 'auto' }}
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
                  style={{
                    margin: '8px 12px',
                    height: 'auto',
                    padding: '8px 12px',
                    display: 'block',
                  }}
                >
                  {error}
                </div>
              )}
              {!loading && q.length >= 2 && results.length === 0 && (
                <div
                  className="mf-fg-mute mf-font-mono"
                  style={{ padding: '32px 24px', textAlign: 'center', fontSize: 11 }}
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
                  USDA · OPEN FOOD FACTS · COMMUNITY
                </div>
              )}
              {results.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-3"
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--mf-hairline)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="flex items-center gap-1.5"
                      style={{ marginBottom: 2 }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {it.name}
                      </span>
                      <SrcPill
                        src={sourceToPill(it.source)}
                        barcode={it.barcode ?? undefined}
                      />
                    </div>
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 9 }}
                    >
                      {it.brand && <>{it.brand} · </>}
                      {it.servingSize} {it.servingUnit}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      className="mf-font-display mf-tnum"
                      style={{ fontSize: 14, lineHeight: 1 }}
                    >
                      {Math.round(it.calories)}
                    </div>
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 9, marginTop: 2 }}
                    >
                      KCAL
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => logFood(it, logTarget)}
                    disabled={pending === it.id}
                    aria-label={`Add ${it.name} to ${logTarget}`}
                    className="grid place-items-center"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'var(--mf-accent)',
                      color: 'var(--mf-accent-ink)',
                      border: 'none',
                      cursor: pending === it.id ? 'progress' : 'pointer',
                      opacity: pending === it.id ? 0.6 : 1,
                    }}
                  >
                    {pending === it.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Plus size={12} />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: 12,
                borderTop: '1px solid var(--mf-hairline)',
              }}
            >
              <Btn
                icon={Camera}
                className="w-full"
                onClick={() => setScannerOpen(true)}
                style={{ height: 36, fontSize: 11 }}
              >
                Scan barcode
              </Btn>
            </div>
          </aside>
        </div>
      </ClientDesktopShell>

      {scannerOpen && (
        <BarcodeScanner
          onResult={async (product) => {
            const dateStr = new Date().toLocaleDateString('en-CA');
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
                  mealType: logTarget,
                  date: dateStr,
                }),
              });
              setScannerOpen(false);
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
