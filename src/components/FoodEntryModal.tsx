'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { X, Search, Heart, Clock, TrendingUp, Plus, ScanBarcode, Loader2, Star } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';

interface FoodSearchResult {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  source: 'local' | 'usda' | 'openfoodfacts';
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

interface FavoriteFood {
  id: string;
  foodName: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  sourceId: string | null;
}

interface FoodEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entry: {
    foodName: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealType: string;
    notes: string;
  }) => void;
  selectedDate: string;
}

type Tab = 'search' | 'favorites' | 'recent' | 'manual';

export default function FoodEntryModal({ isOpen, onClose, onSubmit, selectedDate }: FoodEntryModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [customQuantity, setCustomQuantity] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [mealType, setMealType] = useState('BREAKFAST');
  const [notes, setNotes] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteFood[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Recent/frequent state
  const [recentFoods, setRecentFoods] = useState<any[]>([]);
  const [frequentFoods, setFrequentFoods] = useState<any[]>([]);

  // Manual entry
  const [manualForm, setManualForm] = useState({
    foodName: '', quantity: '', unit: 'grams', calories: '', protein: '', carbs: '', fat: '',
  });

  // Load favorites and recents on mount
  useEffect(() => {
    if (!isOpen) return;
    fetchFavorites();
    fetchRecents();
  }, [isOpen]);

  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/food-favorites');
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
        setFavoriteIds(new Set((data.favorites || []).map((f: FavoriteFood) => f.foodName.toLowerCase())));
      }
    } catch {}
  };

  const fetchRecents = async () => {
    try {
      const res = await fetch('/api/food-recent');
      if (res.ok) {
        const data = await res.json();
        setRecentFoods(data.recent || []);
        setFrequentFoods(data.frequent || []);
      }
    } catch {}
  };

  // Debounced API search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/food-search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400); // 400ms debounce
  }, []);

  const toggleFavorite = async (food: FoodSearchResult | { name: string; brand?: string | null; calories: number; protein: number; carbs: number; fat: number; servingSize: number; servingUnit: string; id?: string }) => {
    const key = food.name.toLowerCase();
    if (favoriteIds.has(key)) {
      // Remove favorite
      const fav = favorites.find(f => f.foodName.toLowerCase() === key);
      if (fav) {
        await fetch(`/api/food-favorites?id=${fav.id}`, { method: 'DELETE' });
        setFavorites(prev => prev.filter(f => f.id !== fav.id));
        setFavoriteIds(prev => { const s = new Set(prev); s.delete(key); return s; });
      }
    } else {
      // Add favorite
      const res = await fetch('/api/food-favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodName: food.name,
          brand: ('brand' in food) ? food.brand : null,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          servingSize: food.servingSize,
          servingUnit: food.servingUnit,
          sourceId: food.id || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(prev => [data.favorite, ...prev]);
        setFavoriteIds(prev => new Set(prev).add(key));
      }
    }
  };

  const selectFood = (food: FoodSearchResult | FavoriteFood | any) => {
    const result: FoodSearchResult = {
      id: food.id || food.sourceId || `custom-${Date.now()}`,
      name: food.name || food.foodName,
      brand: food.brand || null,
      category: food.category || 'other',
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      servingSize: food.servingSize || 100,
      servingUnit: food.servingUnit || 'g',
      source: food.source || 'local',
      caloriesPer100g: food.caloriesPer100g || food.calories,
      proteinPer100g: food.proteinPer100g || food.protein,
      carbsPer100g: food.carbsPer100g || food.carbs,
      fatPer100g: food.fatPer100g || food.fat,
    };
    setSelectedFood(result);
    setServingMultiplier(1);
    setCustomQuantity(result.servingSize.toString());
    setUseCustom(false);
  };

  const calculatedNutrition = useMemo(() => {
    if (!selectedFood) return null;
    const grams = useCustom ? parseFloat(customQuantity) || 0 : selectedFood.servingSize * servingMultiplier;
    const ratio = grams / 100;
    return {
      calories: Math.round(selectedFood.caloriesPer100g * ratio),
      protein: Math.round(selectedFood.proteinPer100g * ratio * 10) / 10,
      carbs: Math.round(selectedFood.carbsPer100g * ratio * 10) / 10,
      fat: Math.round(selectedFood.fatPer100g * ratio * 10) / 10,
    };
  }, [selectedFood, servingMultiplier, customQuantity, useCustom]);

  const currentGrams = useMemo(() => {
    if (!selectedFood) return 0;
    return useCustom ? parseFloat(customQuantity) || 0 : selectedFood.servingSize * servingMultiplier;
  }, [selectedFood, servingMultiplier, customQuantity, useCustom]);

  const handleSubmit = () => {
    if (activeTab === 'manual') {
      if (!manualForm.foodName) return;
      onSubmit({
        foodName: manualForm.foodName,
        quantity: parseFloat(manualForm.quantity) || 0,
        unit: manualForm.unit,
        calories: parseFloat(manualForm.calories) || 0,
        protein: parseFloat(manualForm.protein) || 0,
        carbs: parseFloat(manualForm.carbs) || 0,
        fat: parseFloat(manualForm.fat) || 0,
        mealType,
        notes,
      });
    } else if (selectedFood && calculatedNutrition) {
      onSubmit({
        foodName: selectedFood.brand ? `${selectedFood.name} (${selectedFood.brand})` : selectedFood.name,
        quantity: currentGrams,
        unit: selectedFood.servingUnit || 'g',
        calories: calculatedNutrition.calories,
        protein: calculatedNutrition.protein,
        carbs: calculatedNutrition.carbs,
        fat: calculatedNutrition.fat,
        mealType,
        notes,
      });
    }

    // Save to community database if there's a pending barcode from a failed scan
    if (pendingBarcode && activeTab === 'manual' && manualForm.foodName) {
      fetch('/api/food-community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: pendingBarcode,
          name: manualForm.foodName,
          calories: manualForm.calories,
          protein: manualForm.protein,
          carbs: manualForm.carbs,
          fat: manualForm.fat,
          servingSize: manualForm.quantity,
          servingUnit: manualForm.unit,
        }),
      }).catch(() => {});
    }

    // Reset
    setPendingBarcode(null);
    setSelectedFood(null);
    setSearchQuery('');
    setSearchResults([]);
    setServingMultiplier(1);
    setCustomQuantity('');
    setUseCustom(false);
    setMealType('BREAKFAST');
    setNotes('');
    setActiveTab('search');
    setManualForm({ foodName: '', quantity: '', unit: 'grams', calories: '', protein: '', carbs: '', fat: '' });
    onClose();
  };

  if (!isOpen) return null;

  const sourceLabel = (s: string) => {
    if (s === 'usda') return 'USDA';
    if (s === 'openfoodfacts') return 'OFF';
    return '';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white dark:bg-[#1a1f2e] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:p-5 border-b border-gray-200 dark:border-[#2a3042] flex-shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Log Food</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(() => { const [y, m, d] = selectedDate.split('-'); return `${m}/${d}/${y}`; })()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#242938] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 sm:p-5 space-y-3 sm:space-y-4">
          {/* Meal Type */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
            {['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].map((type) => (
              <button key={type} onClick={() => setMealType(type)}
                className={`py-2 px-4 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  mealType === type ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-[#242938] text-gray-600 dark:text-gray-400'
                }`}
              >{type.charAt(0) + type.slice(1).toLowerCase()}</button>
            ))}
          </div>

          {/* Tab Navigation */}
          {!selectedFood && (
            <div className="flex gap-1 bg-gray-100 dark:bg-[#111827] rounded-xl p-1 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-1">
              {([
                { key: 'search' as Tab, icon: Search, label: 'Search' },
                { key: 'favorites' as Tab, icon: Heart, label: 'Fav' },
                { key: 'recent' as Tab, icon: Clock, label: 'Recent' },
                { key: 'manual' as Tab, icon: Plus, label: 'Manual' },
              ]).map(({ key, icon: Icon, label }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                    activeTab === key
                      ? 'bg-white dark:bg-[#1a1f2e] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                ><Icon className="w-3.5 h-3.5" />{label}</button>
              ))}
            </div>
          )}

          {/* ── SEARCH TAB ── */}
          {activeTab === 'search' && !selectedFood && (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search millions of foods..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-[#2a3042] rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => setShowBarcodeScanner(true)}
                  className="p-2.5 bg-gray-100 dark:bg-[#242938] text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a3042] transition-colors"
                  title="Scan barcode"
                >
                  <ScanBarcode className="w-5 h-5" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-56 overflow-y-auto space-y-1">
                {searching && (
                  <div className="flex items-center justify-center py-6 gap-2">
                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Searching databases...</span>
                  </div>
                )}
                {!searching && searchResults.map((food) => (
                  <FoodResultRow
                    key={food.id}
                    name={food.name}
                    brand={food.brand}
                    calories={food.calories}
                    protein={food.protein}
                    servingSize={food.servingSize}
                    servingUnit={food.servingUnit}
                    source={sourceLabel(food.source)}
                    isFavorite={favoriteIds.has(food.name.toLowerCase())}
                    onSelect={() => selectFood(food)}
                    onToggleFavorite={() => toggleFavorite(food)}
                  />
                ))}
                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No results found.</p>
                    <button onClick={() => { setActiveTab('manual'); setManualForm(prev => ({ ...prev, foodName: searchQuery })); }}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
                    >Add manually</button>
                  </div>
                )}
                {!searching && searchQuery.length < 2 && searchResults.length === 0 && (
                  <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
                    Type at least 2 characters to search USDA + Open Food Facts databases
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── FAVORITES TAB ── */}
          {activeTab === 'favorites' && !selectedFood && (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {favorites.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No favorites yet.</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Tap the heart icon on any food to save it here.
                  </p>
                </div>
              ) : (
                favorites.map((fav) => (
                  <FoodResultRow
                    key={fav.id}
                    name={fav.foodName}
                    brand={fav.brand}
                    calories={fav.calories}
                    protein={fav.protein}
                    servingSize={fav.servingSize}
                    servingUnit={fav.servingUnit}
                    isFavorite={true}
                    onSelect={() => selectFood(fav)}
                    onToggleFavorite={() => toggleFavorite({ name: fav.foodName, brand: fav.brand, calories: fav.calories, protein: fav.protein, carbs: fav.carbs, fat: fav.fat, servingSize: fav.servingSize, servingUnit: fav.servingUnit, id: fav.sourceId || fav.id })}
                  />
                ))
              )}
            </div>
          )}

          {/* ── RECENT TAB ── */}
          {activeTab === 'recent' && !selectedFood && (
            <div className="space-y-4">
              {frequentFoods.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Most Logged
                  </h4>
                  <div className="space-y-1">
                    {frequentFoods.map((food, i) => (
                      <FoodResultRow
                        key={`freq-${i}`}
                        name={food.foodName}
                        calories={food.calories}
                        protein={food.protein}
                        servingSize={0}
                        servingUnit=""
                        badge={`${food.count}x`}
                        isFavorite={favoriteIds.has(food.foodName.toLowerCase())}
                        onSelect={() => selectFood({ name: food.foodName, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, servingSize: 100, servingUnit: 'g', caloriesPer100g: food.calories, proteinPer100g: food.protein, carbsPer100g: food.carbs, fatPer100g: food.fat })}
                        onToggleFavorite={() => toggleFavorite({ name: food.foodName, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, servingSize: 100, servingUnit: 'g' })}
                      />
                    ))}
                  </div>
                </div>
              )}
              {recentFoods.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Recently Logged
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {recentFoods.map((food, i) => (
                      <FoodResultRow
                        key={`recent-${i}`}
                        name={food.foodName}
                        calories={food.calories}
                        protein={food.protein}
                        servingSize={food.servingSize}
                        servingUnit={food.servingUnit}
                        isFavorite={favoriteIds.has(food.foodName.toLowerCase())}
                        onSelect={() => selectFood({ name: food.foodName, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, servingSize: food.servingSize || 100, servingUnit: food.servingUnit || 'g', caloriesPer100g: food.calories, proteinPer100g: food.protein, carbsPer100g: food.carbs, fatPer100g: food.fat })}
                        onToggleFavorite={() => toggleFavorite({ name: food.foodName, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, servingSize: food.servingSize || 100, servingUnit: food.servingUnit || 'g' })}
                      />
                    ))}
                  </div>
                </div>
              )}
              {recentFoods.length === 0 && frequentFoods.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recent foods.</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Foods you log will appear here.</p>
                </div>
              )}
            </div>
          )}

          {/* ── MANUAL TAB ── */}
          {activeTab === 'manual' && !selectedFood && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Food Name</label>
                <input type="text" value={manualForm.foodName} onChange={(e) => setManualForm(p => ({ ...p, foodName: e.target.value }))}
                  placeholder="e.g. Homemade protein shake"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input type="number" value={manualForm.quantity} onChange={(e) => setManualForm(p => ({ ...p, quantity: e.target.value }))} placeholder="100"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                  <select value={manualForm.unit} onChange={(e) => setManualForm(p => ({ ...p, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm">
                    <option value="grams">grams</option><option value="ml">ml</option><option value="oz">oz</option>
                    <option value="cups">cups</option><option value="tbsp">tbsp</option><option value="tsp">tsp</option>
                    <option value="pieces">pieces</option><option value="serving">serving</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Calories</label>
                  <input type="number" value={manualForm.calories} onChange={(e) => setManualForm(p => ({ ...p, calories: e.target.value }))} placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Protein (g)</label>
                  <input type="number" value={manualForm.protein} onChange={(e) => setManualForm(p => ({ ...p, protein: e.target.value }))} placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Carbs (g)</label>
                  <input type="number" value={manualForm.carbs} onChange={(e) => setManualForm(p => ({ ...p, carbs: e.target.value }))} placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fat (g)</label>
                  <input type="number" value={manualForm.fat} onChange={(e) => setManualForm(p => ({ ...p, fat: e.target.value }))} placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. post-workout"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm" /></div>
            </div>
          )}

          {/* ── SELECTED FOOD DETAIL ── */}
          {selectedFood && calculatedNutrition && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{selectedFood.name}</h4>
                  {selectedFood.brand && <p className="text-xs text-indigo-600 dark:text-indigo-400">{selectedFood.brand}</p>}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Per 100g: {selectedFood.caloriesPer100g} cal
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleFavorite(selectedFood)}
                    className={`p-1.5 rounded-lg transition-colors ${favoriteIds.has(selectedFood.name.toLowerCase()) ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}>
                    <Heart className={`w-5 h-5 ${favoriteIds.has(selectedFood.name.toLowerCase()) ? 'fill-current' : ''}`} />
                  </button>
                  <button onClick={() => setSelectedFood(null)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Change</button>
                </div>
              </div>

              {/* Serving Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Serving</label>
                <div className="flex gap-2">
                  {[0.5, 1, 1.5, 2].map((m) => (
                    <button key={m} onClick={() => { setServingMultiplier(m); setUseCustom(false); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        !useCustom && servingMultiplier === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-[#242938] text-gray-600 dark:text-gray-400'
                      }`}>{m}x</button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input type="number" value={useCustom ? customQuantity : (selectedFood.servingSize * servingMultiplier).toString()}
                    onChange={(e) => { setCustomQuantity(e.target.value); setUseCustom(true); }}
                    onFocus={() => setUseCustom(true)}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm" min="0" step="1" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 w-12">{selectedFood.servingUnit}</span>
                </div>
              </div>

              {/* Nutrition Preview */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Calories', value: calculatedNutrition.calories, unit: '', color: 'indigo' },
                  { label: 'Protein', value: `${calculatedNutrition.protein}g`, unit: '', color: 'emerald' },
                  { label: 'Carbs', value: `${calculatedNutrition.carbs}g`, unit: '', color: 'amber' },
                  { label: 'Fat', value: `${calculatedNutrition.fat}g`, unit: '', color: 'violet' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`bg-${color}-50 dark:bg-${color}-500/10 rounded-lg p-2.5 text-center`}>
                    <p className={`text-lg font-bold text-${color}-700 dark:text-${color}-300`}>{value}</p>
                    <p className={`text-xs text-${color}-600 dark:text-${color}-400`}>{label}</p>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. with olive oil"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:p-5 border-t border-gray-200 dark:border-[#2a3042] flex gap-2 sm:gap-3 flex-shrink-0 pb-safe">
          <button onClick={onClose} className="flex-1 px-3 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#242938] rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a3042] transition-colors text-sm font-medium">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={activeTab === 'manual' ? !manualForm.foodName : !selectedFood}
            className="flex-1 px-3 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            Add Entry
          </button>
        </div>
      </div>

      {showBarcodeScanner && (
        <BarcodeScanner
          onClose={(scannedBarcode) => {
            setShowBarcodeScanner(false);
            if (scannedBarcode) {
              setPendingBarcode(scannedBarcode);
              setActiveTab('manual');
            }
          }}
          onResult={(product) => {
            setShowBarcodeScanner(false);
            setPendingBarcode(null);
            setActiveTab('manual');
            setManualForm({
              foodName: product.name, quantity: product.servingSize.toString(), unit: product.servingUnit,
              calories: product.calories.toString(), protein: product.protein.toString(),
              carbs: product.carbs.toString(), fat: product.fat.toString(),
            });
          }}
        />
      )}
    </div>
  );
}

// ── Food Result Row Component ──
function FoodResultRow({ name, brand, calories, protein, servingSize, servingUnit, source, badge, isFavorite, onSelect, onToggleFavorite }: {
  name: string; brand?: string | null; calories: number; protein: number;
  servingSize: number; servingUnit: string; source?: string; badge?: string;
  isFavorite: boolean; onSelect: () => void; onToggleFavorite: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#242938] transition-colors group">
      <button onClick={onSelect} className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
          {source && <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-[#2a3042] px-1.5 py-0.5 rounded flex-shrink-0">{source}</span>}
          {badge && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">{badge}</span>}
        </div>
        {brand && <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate">{brand}</p>}
        {servingSize > 0 && <p className="text-xs text-gray-400 dark:text-gray-500">{servingSize}{servingUnit} serving</p>}
      </button>
      <div className="text-right flex-shrink-0 mr-1">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{calories} cal</p>
        <p className="text-xs text-gray-400">P:{protein}g</p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${isFavorite ? 'text-red-500' : 'text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100'}`}>
        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
}
