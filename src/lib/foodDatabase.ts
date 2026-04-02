// Pre-populated food database with accurate nutritional data per 100g serving
// Sources: USDA FoodData Central approximations

export interface FoodItem {
  name: string;
  category: FoodCategory;
  calories: number;  // per 100g
  protein: number;   // grams per 100g
  carbs: number;     // grams per 100g
  fat: number;       // grams per 100g
  servingSize: number; // default serving in grams
  servingUnit: string;
}

export type FoodCategory =
  | 'protein'
  | 'carbs'
  | 'fruits'
  | 'vegetables'
  | 'dairy'
  | 'grains'
  | 'snacks'
  | 'drinks'
  | 'fats'
  | 'supplements';

export const FOOD_CATEGORIES: { value: FoodCategory; label: string }[] = [
  { value: 'protein', label: 'Protein' },
  { value: 'carbs', label: 'Carbs & Starches' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'grains', label: 'Grains & Bread' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'fats', label: 'Fats & Oils' },
  { value: 'supplements', label: 'Supplements' },
];

export const FOOD_DATABASE: FoodItem[] = [
  // ── Protein Sources ──
  { name: 'Chicken Breast (cooked)', category: 'protein', calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: 140, servingUnit: 'grams' },
  { name: 'Chicken Thigh (cooked)', category: 'protein', calories: 209, protein: 26, carbs: 0, fat: 10.9, servingSize: 130, servingUnit: 'grams' },
  { name: 'Ground Turkey (93% lean)', category: 'protein', calories: 170, protein: 21, carbs: 0, fat: 9.4, servingSize: 112, servingUnit: 'grams' },
  { name: 'Ground Beef (90% lean)', category: 'protein', calories: 217, protein: 26, carbs: 0, fat: 11.7, servingSize: 112, servingUnit: 'grams' },
  { name: 'Ground Beef (80% lean)', category: 'protein', calories: 254, protein: 24, carbs: 0, fat: 17, servingSize: 112, servingUnit: 'grams' },
  { name: 'Sirloin Steak (cooked)', category: 'protein', calories: 206, protein: 26, carbs: 0, fat: 10.6, servingSize: 170, servingUnit: 'grams' },
  { name: 'Salmon (cooked)', category: 'protein', calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: 140, servingUnit: 'grams' },
  { name: 'Tuna (canned in water)', category: 'protein', calories: 116, protein: 25.5, carbs: 0, fat: 0.8, servingSize: 85, servingUnit: 'grams' },
  { name: 'Shrimp (cooked)', category: 'protein', calories: 99, protein: 24, carbs: 0.2, fat: 0.3, servingSize: 85, servingUnit: 'grams' },
  { name: 'Tilapia (cooked)', category: 'protein', calories: 128, protein: 26, carbs: 0, fat: 2.7, servingSize: 112, servingUnit: 'grams' },
  { name: 'Pork Chop (cooked)', category: 'protein', calories: 231, protein: 27, carbs: 0, fat: 13, servingSize: 140, servingUnit: 'grams' },
  { name: 'Bacon (cooked)', category: 'protein', calories: 541, protein: 37, carbs: 1.4, fat: 42, servingSize: 28, servingUnit: 'grams' },
  { name: 'Eggs (whole, large)', category: 'protein', calories: 155, protein: 13, carbs: 1.1, fat: 11, servingSize: 50, servingUnit: 'grams' },
  { name: 'Egg Whites', category: 'protein', calories: 52, protein: 11, carbs: 0.7, fat: 0.2, servingSize: 100, servingUnit: 'grams' },
  { name: 'Tofu (firm)', category: 'protein', calories: 144, protein: 17, carbs: 3, fat: 8.7, servingSize: 126, servingUnit: 'grams' },
  { name: 'Tempeh', category: 'protein', calories: 192, protein: 20, carbs: 7.6, fat: 11, servingSize: 84, servingUnit: 'grams' },
  { name: 'Turkey Breast (deli)', category: 'protein', calories: 104, protein: 18, carbs: 3.5, fat: 1.7, servingSize: 56, servingUnit: 'grams' },

  // ── Dairy ──
  { name: 'Greek Yogurt (plain, nonfat)', category: 'dairy', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, servingSize: 170, servingUnit: 'grams' },
  { name: 'Greek Yogurt (plain, whole)', category: 'dairy', calories: 97, protein: 9, carbs: 3.9, fat: 5, servingSize: 170, servingUnit: 'grams' },
  { name: 'Cottage Cheese (2%)', category: 'dairy', calories: 86, protein: 11.8, carbs: 4.3, fat: 2.3, servingSize: 113, servingUnit: 'grams' },
  { name: 'Cheddar Cheese', category: 'dairy', calories: 403, protein: 25, carbs: 1.3, fat: 33, servingSize: 28, servingUnit: 'grams' },
  { name: 'Mozzarella Cheese', category: 'dairy', calories: 280, protein: 28, carbs: 3.1, fat: 17, servingSize: 28, servingUnit: 'grams' },
  { name: 'Whole Milk', category: 'dairy', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, servingSize: 240, servingUnit: 'ml' },
  { name: 'Skim Milk', category: 'dairy', calories: 34, protein: 3.4, carbs: 5, fat: 0.1, servingSize: 240, servingUnit: 'ml' },
  { name: 'Whey Protein Powder', category: 'dairy', calories: 380, protein: 75, carbs: 8, fat: 5, servingSize: 30, servingUnit: 'grams' },

  // ── Grains & Bread ──
  { name: 'White Rice (cooked)', category: 'grains', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: 158, servingUnit: 'grams' },
  { name: 'Brown Rice (cooked)', category: 'grains', calories: 112, protein: 2.3, carbs: 24, fat: 0.8, servingSize: 158, servingUnit: 'grams' },
  { name: 'Oatmeal (cooked)', category: 'grains', calories: 71, protein: 2.5, carbs: 12, fat: 1.5, servingSize: 234, servingUnit: 'grams' },
  { name: 'Instant Oats (dry)', category: 'grains', calories: 379, protein: 13, carbs: 67, fat: 6.5, servingSize: 40, servingUnit: 'grams' },
  { name: 'Whole Wheat Bread', category: 'grains', calories: 247, protein: 13, carbs: 41, fat: 3.4, servingSize: 32, servingUnit: 'grams' },
  { name: 'White Bread', category: 'grains', calories: 265, protein: 9, carbs: 49, fat: 3.2, servingSize: 30, servingUnit: 'grams' },
  { name: 'Pasta (cooked)', category: 'grains', calories: 131, protein: 5, carbs: 25, fat: 1.1, servingSize: 140, servingUnit: 'grams' },
  { name: 'Tortilla (flour, 8in)', category: 'grains', calories: 306, protein: 8, carbs: 50, fat: 8, servingSize: 49, servingUnit: 'grams' },
  { name: 'Tortilla (corn)', category: 'grains', calories: 218, protein: 5.7, carbs: 44, fat: 2.8, servingSize: 26, servingUnit: 'grams' },
  { name: 'Quinoa (cooked)', category: 'grains', calories: 120, protein: 4.4, carbs: 21, fat: 1.9, servingSize: 185, servingUnit: 'grams' },
  { name: 'Granola', category: 'grains', calories: 471, protein: 10, carbs: 64, fat: 20, servingSize: 55, servingUnit: 'grams' },

  // ── Carbs & Starches ──
  { name: 'Sweet Potato (baked)', category: 'carbs', calories: 90, protein: 2, carbs: 21, fat: 0.1, servingSize: 130, servingUnit: 'grams' },
  { name: 'Potato (baked)', category: 'carbs', calories: 93, protein: 2.5, carbs: 21, fat: 0.1, servingSize: 173, servingUnit: 'grams' },
  { name: 'Black Beans (cooked)', category: 'carbs', calories: 132, protein: 8.9, carbs: 24, fat: 0.5, servingSize: 172, servingUnit: 'grams' },
  { name: 'Chickpeas (cooked)', category: 'carbs', calories: 164, protein: 8.9, carbs: 27, fat: 2.6, servingSize: 164, servingUnit: 'grams' },
  { name: 'Lentils (cooked)', category: 'carbs', calories: 116, protein: 9, carbs: 20, fat: 0.4, servingSize: 198, servingUnit: 'grams' },

  // ── Fruits ──
  { name: 'Banana', category: 'fruits', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, servingSize: 118, servingUnit: 'grams' },
  { name: 'Apple', category: 'fruits', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, servingSize: 182, servingUnit: 'grams' },
  { name: 'Blueberries', category: 'fruits', calories: 57, protein: 0.7, carbs: 14, fat: 0.3, servingSize: 148, servingUnit: 'grams' },
  { name: 'Strawberries', category: 'fruits', calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, servingSize: 152, servingUnit: 'grams' },
  { name: 'Orange', category: 'fruits', calories: 47, protein: 0.9, carbs: 12, fat: 0.1, servingSize: 131, servingUnit: 'grams' },
  { name: 'Grapes', category: 'fruits', calories: 69, protein: 0.7, carbs: 18, fat: 0.2, servingSize: 151, servingUnit: 'grams' },
  { name: 'Watermelon', category: 'fruits', calories: 30, protein: 0.6, carbs: 7.5, fat: 0.2, servingSize: 280, servingUnit: 'grams' },
  { name: 'Mango', category: 'fruits', calories: 60, protein: 0.8, carbs: 15, fat: 0.4, servingSize: 165, servingUnit: 'grams' },
  { name: 'Avocado', category: 'fruits', calories: 160, protein: 2, carbs: 9, fat: 15, servingSize: 68, servingUnit: 'grams' },
  { name: 'Pineapple', category: 'fruits', calories: 50, protein: 0.5, carbs: 13, fat: 0.1, servingSize: 165, servingUnit: 'grams' },

  // ── Vegetables ──
  { name: 'Broccoli (cooked)', category: 'vegetables', calories: 35, protein: 2.4, carbs: 7.2, fat: 0.4, servingSize: 91, servingUnit: 'grams' },
  { name: 'Spinach (raw)', category: 'vegetables', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, servingSize: 30, servingUnit: 'grams' },
  { name: 'Mixed Greens (salad)', category: 'vegetables', calories: 20, protein: 1.8, carbs: 3.3, fat: 0.3, servingSize: 85, servingUnit: 'grams' },
  { name: 'Bell Pepper', category: 'vegetables', calories: 31, protein: 1, carbs: 6, fat: 0.3, servingSize: 119, servingUnit: 'grams' },
  { name: 'Carrots', category: 'vegetables', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, servingSize: 61, servingUnit: 'grams' },
  { name: 'Cucumber', category: 'vegetables', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, servingSize: 52, servingUnit: 'grams' },
  { name: 'Tomato', category: 'vegetables', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, servingSize: 123, servingUnit: 'grams' },
  { name: 'Onion', category: 'vegetables', calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, servingSize: 110, servingUnit: 'grams' },
  { name: 'Green Beans (cooked)', category: 'vegetables', calories: 35, protein: 1.8, carbs: 8, fat: 0.1, servingSize: 125, servingUnit: 'grams' },
  { name: 'Asparagus (cooked)', category: 'vegetables', calories: 22, protein: 2.4, carbs: 4.1, fat: 0.2, servingSize: 90, servingUnit: 'grams' },
  { name: 'Cauliflower', category: 'vegetables', calories: 25, protein: 1.9, carbs: 5, fat: 0.3, servingSize: 107, servingUnit: 'grams' },
  { name: 'Zucchini', category: 'vegetables', calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, servingSize: 113, servingUnit: 'grams' },
  { name: 'Mushrooms', category: 'vegetables', calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, servingSize: 70, servingUnit: 'grams' },
  { name: 'Corn (cooked)', category: 'vegetables', calories: 96, protein: 3.4, carbs: 21, fat: 1.5, servingSize: 90, servingUnit: 'grams' },

  // ── Fats & Oils ──
  { name: 'Olive Oil', category: 'fats', calories: 884, protein: 0, carbs: 0, fat: 100, servingSize: 14, servingUnit: 'ml' },
  { name: 'Coconut Oil', category: 'fats', calories: 862, protein: 0, carbs: 0, fat: 100, servingSize: 14, servingUnit: 'ml' },
  { name: 'Butter', category: 'fats', calories: 717, protein: 0.9, carbs: 0.1, fat: 81, servingSize: 14, servingUnit: 'grams' },
  { name: 'Peanut Butter', category: 'fats', calories: 588, protein: 25, carbs: 20, fat: 50, servingSize: 32, servingUnit: 'grams' },
  { name: 'Almond Butter', category: 'fats', calories: 614, protein: 21, carbs: 19, fat: 56, servingSize: 32, servingUnit: 'grams' },
  { name: 'Almonds', category: 'fats', calories: 579, protein: 21, carbs: 22, fat: 50, servingSize: 28, servingUnit: 'grams' },
  { name: 'Walnuts', category: 'fats', calories: 654, protein: 15, carbs: 14, fat: 65, servingSize: 28, servingUnit: 'grams' },
  { name: 'Cashews', category: 'fats', calories: 553, protein: 18, carbs: 30, fat: 44, servingSize: 28, servingUnit: 'grams' },
  { name: 'Chia Seeds', category: 'fats', calories: 486, protein: 17, carbs: 42, fat: 31, servingSize: 28, servingUnit: 'grams' },
  { name: 'Flax Seeds', category: 'fats', calories: 534, protein: 18, carbs: 29, fat: 42, servingSize: 10, servingUnit: 'grams' },

  // ── Snacks ──
  { name: 'Protein Bar (average)', category: 'snacks', calories: 350, protein: 20, carbs: 38, fat: 12, servingSize: 60, servingUnit: 'grams' },
  { name: 'Rice Cakes', category: 'snacks', calories: 387, protein: 8, carbs: 82, fat: 2.8, servingSize: 9, servingUnit: 'grams' },
  { name: 'Hummus', category: 'snacks', calories: 166, protein: 7.9, carbs: 14, fat: 9.6, servingSize: 30, servingUnit: 'grams' },
  { name: 'Trail Mix', category: 'snacks', calories: 462, protein: 14, carbs: 44, fat: 29, servingSize: 40, servingUnit: 'grams' },
  { name: 'Dark Chocolate (70%+)', category: 'snacks', calories: 598, protein: 7.8, carbs: 46, fat: 43, servingSize: 28, servingUnit: 'grams' },
  { name: 'Popcorn (air-popped)', category: 'snacks', calories: 387, protein: 13, carbs: 78, fat: 4.5, servingSize: 8, servingUnit: 'grams' },
  { name: 'Beef Jerky', category: 'snacks', calories: 322, protein: 52, carbs: 11, fat: 8, servingSize: 28, servingUnit: 'grams' },

  // ── Drinks ──
  { name: 'Orange Juice', category: 'drinks', calories: 45, protein: 0.7, carbs: 10, fat: 0.2, servingSize: 240, servingUnit: 'ml' },
  { name: 'Coffee (black)', category: 'drinks', calories: 2, protein: 0.3, carbs: 0, fat: 0, servingSize: 240, servingUnit: 'ml' },
  { name: 'Protein Shake (with water)', category: 'drinks', calories: 120, protein: 24, carbs: 3, fat: 1.5, servingSize: 355, servingUnit: 'ml' },
  { name: 'Smoothie (fruit)', category: 'drinks', calories: 57, protein: 0.8, carbs: 14, fat: 0.2, servingSize: 240, servingUnit: 'ml' },
  { name: 'Coconut Water', category: 'drinks', calories: 19, protein: 0.7, carbs: 3.7, fat: 0.2, servingSize: 240, servingUnit: 'ml' },
  { name: 'Almond Milk (unsweetened)', category: 'drinks', calories: 15, protein: 0.6, carbs: 0.3, fat: 1.1, servingSize: 240, servingUnit: 'ml' },
  { name: 'Gatorade/Sports Drink', category: 'drinks', calories: 26, protein: 0, carbs: 6.7, fat: 0, servingSize: 355, servingUnit: 'ml' },

  // ── Supplements ──
  { name: 'Creatine Monohydrate', category: 'supplements', calories: 0, protein: 0, carbs: 0, fat: 0, servingSize: 5, servingUnit: 'grams' },
  { name: 'BCAA Powder', category: 'supplements', calories: 10, protein: 2.5, carbs: 0, fat: 0, servingSize: 7, servingUnit: 'grams' },
  { name: 'Pre-Workout Powder', category: 'supplements', calories: 15, protein: 0, carbs: 3, fat: 0, servingSize: 12, servingUnit: 'grams' },
  { name: 'Fish Oil Capsule', category: 'supplements', calories: 10, protein: 0, carbs: 0, fat: 1, servingSize: 1, servingUnit: 'capsule' },
  { name: 'Multivitamin', category: 'supplements', calories: 0, protein: 0, carbs: 0, fat: 0, servingSize: 1, servingUnit: 'tablet' },
];

/**
 * Search the food database with fuzzy matching
 */
export function searchFoods(query: string, category?: FoodCategory): FoodItem[] {
  const normalizedQuery = query.toLowerCase().trim();

  let results = FOOD_DATABASE;

  if (category) {
    results = results.filter(food => food.category === category);
  }

  if (!normalizedQuery) {
    return results;
  }

  // Split query into words for multi-word matching
  const queryWords = normalizedQuery.split(/\s+/);

  return results
    .filter(food => {
      const foodName = food.name.toLowerCase();
      // Every query word must appear somewhere in the food name
      return queryWords.every(word => foodName.includes(word));
    })
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      // Exact start match gets priority
      const aStartsWith = aName.startsWith(normalizedQuery) ? 0 : 1;
      const bStartsWith = bName.startsWith(normalizedQuery) ? 0 : 1;
      if (aStartsWith !== bStartsWith) return aStartsWith - bStartsWith;
      return aName.localeCompare(bName);
    });
}

/**
 * Calculate nutrition values for a given quantity
 */
export function calculateNutrition(food: FoodItem, quantityGrams: number) {
  const ratio = quantityGrams / 100;
  return {
    calories: Math.round(food.calories * ratio),
    protein: Math.round(food.protein * ratio * 10) / 10,
    carbs: Math.round(food.carbs * ratio * 10) / 10,
    fat: Math.round(food.fat * ratio * 10) / 10,
  };
}
