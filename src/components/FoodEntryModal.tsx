'use client';

import { useState, useCallback, useMemo } from 'react';
import { X, Search, Apple, ChevronDown, ScanBarcode } from 'lucide-react';
import { searchFoods, calculateNutrition, FOOD_CATEGORIES, type FoodItem, type FoodCategory } from '@/lib/foodDatabase';
import BarcodeScanner from '@/components/BarcodeScanner';

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

export default function FoodEntryModal({ isOpen, onClose, onSubmit, selectedDate }: FoodEntryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | ''>('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [customQuantity, setCustomQuantity] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [mealType, setMealType] = useState('BREAKFAST');
  const [notes, setNotes] = useState('');

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Manual entry fields (for foods not in database)
  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({
    foodName: '',
    quantity: '',
    unit: 'grams',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  const searchResults = useMemo(() => {
    return searchFoods(searchQuery, selectedCategory || undefined);
  }, [searchQuery, selectedCategory]);

  const calculatedNutrition = useMemo(() => {
    if (!selectedFood) return null;
    const grams = useCustom
      ? parseFloat(customQuantity) || 0
      : selectedFood.servingSize * servingMultiplier;
    return calculateNutrition(selectedFood, grams);
  }, [selectedFood, servingMultiplier, customQuantity, useCustom]);

  const currentGrams = useMemo(() => {
    if (!selectedFood) return 0;
    return useCustom
      ? parseFloat(customQuantity) || 0
      : selectedFood.servingSize * servingMultiplier;
  }, [selectedFood, servingMultiplier, customQuantity, useCustom]);

  const handleSelectFood = useCallback((food: FoodItem) => {
    setSelectedFood(food);
    setServingMultiplier(1);
    setCustomQuantity(food.servingSize.toString());
    setUseCustom(false);
    setSearchQuery('');
  }, []);

  const handleSubmit = useCallback(() => {
    if (manualMode) {
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
        foodName: selectedFood.name,
        quantity: currentGrams,
        unit: 'grams',
        calories: calculatedNutrition.calories,
        protein: calculatedNutrition.protein,
        carbs: calculatedNutrition.carbs,
        fat: calculatedNutrition.fat,
        mealType,
        notes,
      });
    }

    // Reset state
    setSelectedFood(null);
    setSearchQuery('');
    setSelectedCategory('');
    setServingMultiplier(1);
    setCustomQuantity('');
    setUseCustom(false);
    setMealType('BREAKFAST');
    setNotes('');
    setManualMode(false);
    setManualForm({ foodName: '', quantity: '', unit: 'grams', calories: '', protein: '', carbs: '', fat: '' });
    onClose();
  }, [manualMode, manualForm, selectedFood, calculatedNutrition, currentGrams, mealType, notes, onSubmit, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1f2e] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#2a3042]">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Log Food</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {(() => {
                const [year, month, day] = selectedDate.split('-');
                return `${month}/${day}/${year}`;
              })()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#242938] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Meal Type Selector */}
          <div className="flex gap-2">
            {['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].map((type) => (
              <button
                key={type}
                onClick={() => setMealType(type)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  mealType === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-[#242938] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a3042]'
                }`}
              >
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => { setManualMode(false); setSelectedFood(null); }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                !manualMode
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20'
                  : 'bg-gray-50 dark:bg-[#242938] text-gray-500 dark:text-gray-400'
              }`}
            >
              Search
            </button>
            <button
              onClick={() => setShowBarcodeScanner(true)}
              className="py-2 px-3 rounded-lg text-sm font-medium transition-colors bg-gray-50 dark:bg-[#242938] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a3042] flex items-center gap-1.5"
            >
              <ScanBarcode className="w-4 h-4" />
              Scan
            </button>
            <button
              onClick={() => { setManualMode(true); setSelectedFood(null); }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                manualMode
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20'
                  : 'bg-gray-50 dark:bg-[#242938] text-gray-500 dark:text-gray-400'
              }`}
            >
              Manual
            </button>
          </div>

          {!manualMode ? (
            <>
              {/* Search + Category Filter */}
              {!selectedFood && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search foods... (e.g. chicken breast)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      autoFocus
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedCategory('')}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        !selectedCategory
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-[#242938] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a3042]'
                      }`}
                    >
                      All
                    </button>
                    {FOOD_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedCategory === cat.value
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-[#242938] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a3042]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Results */}
                  <div className="max-h-48 overflow-y-auto space-y-1 -mx-1 px-1">
                    {searchResults.slice(0, 20).map((food, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectFood(food)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[#242938] transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {food.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {food.servingSize}{food.servingUnit} serving
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {Math.round(food.calories * food.servingSize / 100)} cal
                            </p>
                            <p className="text-xs text-gray-400">
                              P:{Math.round(food.protein * food.servingSize / 100)}g
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {searchResults.length === 0 && searchQuery && (
                      <div className="text-center py-6">
                        <Apple className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No foods found.</p>
                        <button
                          onClick={() => { setManualMode(true); setManualForm(prev => ({ ...prev, foodName: searchQuery })); }}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
                        >
                          Add manually instead
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Selected Food Details */}
              {selectedFood && calculatedNutrition && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{selectedFood.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Per 100g: {selectedFood.calories} cal · {selectedFood.protein}g P · {selectedFood.carbs}g C · {selectedFood.fat}g F
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFood(null)}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  {/* Serving Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Serving Size</label>
                    <div className="flex gap-2">
                      {[0.5, 1, 1.5, 2].map((mult) => (
                        <button
                          key={mult}
                          onClick={() => { setServingMultiplier(mult); setUseCustom(false); }}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            !useCustom && servingMultiplier === mult
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 dark:bg-[#242938] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a3042]'
                          }`}
                        >
                          {mult}x
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        value={useCustom ? customQuantity : (selectedFood.servingSize * servingMultiplier).toString()}
                        onChange={(e) => { setCustomQuantity(e.target.value); setUseCustom(true); }}
                        onFocus={() => setUseCustom(true)}
                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
                        min="0"
                        step="1"
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400 w-16">{selectedFood.servingUnit}</span>
                    </div>
                  </div>

                  {/* Nutrition Preview */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{calculatedNutrition.calories}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Calories</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-green-700 dark:text-green-300">{calculatedNutrition.protein}g</p>
                      <p className="text-xs text-green-600 dark:text-green-400">Protein</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{calculatedNutrition.carbs}g</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">Carbs</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-500/10 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{calculatedNutrition.fat}g</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">Fat</p>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes (optional)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. with olive oil, grilled"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm placeholder-gray-400"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Manual Entry Form */
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Food Name</label>
                <input
                  type="text"
                  value={manualForm.foodName}
                  onChange={(e) => setManualForm(prev => ({ ...prev, foodName: e.target.value }))}
                  placeholder="e.g. Homemade protein shake"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={manualForm.quantity}
                    onChange={(e) => setManualForm(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="100"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                  <select
                    value={manualForm.unit}
                    onChange={(e) => setManualForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
                  >
                    <option value="grams">grams</option>
                    <option value="ml">ml</option>
                    <option value="oz">oz</option>
                    <option value="cups">cups</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                    <option value="pieces">pieces</option>
                    <option value="serving">serving</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Calories</label>
                  <input
                    type="number"
                    value={manualForm.calories}
                    onChange={(e) => setManualForm(prev => ({ ...prev, calories: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={manualForm.protein}
                    onChange={(e) => setManualForm(prev => ({ ...prev, protein: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={manualForm.carbs}
                    onChange={(e) => setManualForm(prev => ({ ...prev, carbs: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fat (g)</label>
                  <input
                    type="number"
                    value={manualForm.fat}
                    onChange={(e) => setManualForm(prev => ({ ...prev, fat: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. post-workout"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-[#2a3042] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#242938] rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a3042] transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={manualMode ? !manualForm.foodName : !selectedFood}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Entry
          </button>
        </div>
      </div>

      {/* Barcode Scanner Overlay */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onClose={() => setShowBarcodeScanner(false)}
          onResult={(product) => {
            setShowBarcodeScanner(false);
            setManualMode(true);
            setManualForm({
              foodName: product.name,
              quantity: product.servingSize.toString(),
              unit: product.servingUnit,
              calories: product.calories.toString(),
              protein: product.protein.toString(),
              carbs: product.carbs.toString(),
              fat: product.fat.toString(),
            });
          }}
        />
      )}
    </div>
  );
}
