import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchFoods as searchLocalFoods } from '@/lib/foodDatabase';
import { checkRateLimitAsync, rateLimitResponse } from '@/lib/rate-limit';

// Unified food search endpoint — searches local DB, USDA, and Open Food Facts
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 60 searches per minute per user — plenty for normal typeahead, caps
    // abuse of our paid USDA / Open Food Facts quotas. Keyed on userId (not
    // IP) since the endpoint is auth-gated.
    const rl = await checkRateLimitAsync(`food-search:${session.user.id}`, {
      maxRequests: 60,
      windowSeconds: 60,
    });
    if (!rl.allowed) return rateLimitResponse(rl.resetIn);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const category = searchParams.get('category') || '';
    const source = searchParams.get('source') || 'all'; // 'local', 'usda', 'openfoodfacts', 'all'

    if (!query && !category) {
      return NextResponse.json({ results: [], source: 'none' });
    }

    const results: FoodSearchResult[] = [];

    // 0. Search community database (user-contributed foods). The COMMUNITY
    // pill previously did nothing because this block only ran on 'all'; and
    // community hits were mis-tagged as 'local' so the UI pill rendered the
    // wrong source chip. Fixed both.
    if ((source === 'all' || source === 'community') && query.length >= 2) {
      try {
        const communityFoods = await prisma.communityFood.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { brand: { contains: query, mode: 'insensitive' } },
            ],
          },
          orderBy: [
            // Verified first, then by popularity — most-logged foods bubble
            // to the top so a new user sees "Chicken breast (100 uses)" before
            // a one-off "Chicken breast grandma's" entry.
            { verified: 'desc' },
            { useCount: 'desc' },
          ],
          take: source === 'community' ? 25 : 10,
        });
        for (const food of communityFoods) {
          results.push({
            id: `community-${food.id}`,
            name: food.name,
            brand: food.brand,
            category: food.category || 'other',
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            servingSize: food.servingSize,
            servingUnit: food.servingUnit,
            source: 'community' as const,
            caloriesPer100g: food.calories,
            proteinPer100g: food.protein,
            carbsPer100g: food.carbs,
            fatPer100g: food.fat,
          });
        }
      } catch (e) {
        console.error('Community food search error:', e);
      }
    }

    // 1. Search local database first (instant)
    if (source === 'all' || source === 'local') {
      const localResults = searchLocalFoods(query, (category as Parameters<typeof searchLocalFoods>[1]) || undefined);
      for (const food of localResults.slice(0, 10)) {
        const ratio = food.servingSize / 100;
        results.push({
          id: `local-${food.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: food.name,
          brand: null,
          category: food.category,
          calories: Math.round(food.calories * ratio),
          protein: Math.round(food.protein * ratio * 10) / 10,
          carbs: Math.round(food.carbs * ratio * 10) / 10,
          fat: Math.round(food.fat * ratio * 10) / 10,
          servingSize: food.servingSize,
          servingUnit: food.servingUnit,
          source: 'local',
          caloriesPer100g: food.calories,
          proteinPer100g: food.protein,
          carbsPer100g: food.carbs,
          fatPer100g: food.fat,
        });
      }
    }

    // 2. Search USDA FoodData Central (comprehensive US food database)
    if ((source === 'all' || source === 'usda') && query.length >= 2) {
      try {
        const usdaResults = await searchUSDA(query);
        for (const food of usdaResults) {
          // Deduplicate against local results
          const isDuplicate = results.some(r =>
            r.name.toLowerCase() === food.name.toLowerCase()
          );
          if (!isDuplicate) {
            results.push(food);
          }
        }
      } catch (error) {
        console.error('USDA search error:', error);
        // Continue with local results if USDA fails
      }
    }

    // 3. Search Open Food Facts for branded products
    if ((source === 'all' || source === 'openfoodfacts') && query.length >= 3) {
      try {
        const offResults = await searchOpenFoodFacts(query);
        for (const food of offResults) {
          const isDuplicate = results.some(r =>
            r.name.toLowerCase() === food.name.toLowerCase() &&
            r.brand?.toLowerCase() === food.brand?.toLowerCase()
          );
          if (!isDuplicate) {
            results.push(food);
          }
        }
      } catch (error) {
        console.error('Open Food Facts search error:', error);
      }
    }

    // Sort: local first, then by relevance (name starts with query)
    const queryLower = query.toLowerCase();
    results.sort((a, b) => {
      // Local results first
      if (a.source === 'local' && b.source !== 'local') return -1;
      if (a.source !== 'local' && b.source === 'local') return 1;
      // Then by name match quality
      const aStarts = a.name.toLowerCase().startsWith(queryLower) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(queryLower) ? 0 : 1;
      return aStarts - bStarts;
    });

    return NextResponse.json({
      results: results.slice(0, 50),
      query,
      totalFound: results.length,
    });

  } catch (error) {
    console.error('Food search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

// ── USDA FoodData Central API ──
async function searchUSDA(query: string): Promise<FoodSearchResult[]> {
  // USDA FoodData Central API - free, no key required for demo key
  // Get a free API key at https://fdc.nal.usda.gov/api-key-signup.html
  // DEMO_KEY works but is rate-limited to 30 req/hour
  const apiKey = process.env.USDA_API_KEY || 'DEMO_KEY';
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&dataType=Survey%20(FNDDS),Branded,SR%20Legacy&pageSize=25&sortBy=dataType.keyword&sortOrder=asc`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000), // 8s timeout for slower connections
  });

  if (!response.ok) return [];
  const data = await response.json();

  interface UsdaNutrient { nutrientId?: number; value?: number }
  interface UsdaFood {
    fdcId?: number;
    description?: string;
    brandName?: string;
    brandOwner?: string;
    foodCategory?: string;
    foodNutrients?: UsdaNutrient[];
    servingSize?: number;
    servingSizeUnit?: string;
  }
  return ((data.foods as UsdaFood[] | undefined) || []).map((food) => {
    const nutrients: UsdaNutrient[] = food.foodNutrients || [];
    const getVal = (id: number) => nutrients.find((n) => n.nutrientId === id)?.value || 0;

    // Nutrient IDs: 1008=Energy(kcal), 1003=Protein, 1005=Carbs, 1004=Fat
    const caloriesPer100g = getVal(1008);
    const proteinPer100g = getVal(1003);
    const carbsPer100g = getVal(1005);
    const fatPer100g = getVal(1004);

    const servingSize = food.servingSize || 100;
    const ratio = servingSize / 100;

    return {
      id: `usda-${food.fdcId}`,
      name: cleanFoodName(food.description || ''),
      brand: food.brandName || food.brandOwner || null,
      category: mapUSDACategory(food.foodCategory || ''),
      calories: Math.round(caloriesPer100g * ratio),
      protein: Math.round(proteinPer100g * ratio * 10) / 10,
      carbs: Math.round(carbsPer100g * ratio * 10) / 10,
      fat: Math.round(fatPer100g * ratio * 10) / 10,
      servingSize,
      servingUnit: food.servingSizeUnit || 'g',
      source: 'usda' as const,
      caloriesPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
    };
  }).filter((f: FoodSearchResult) => f.calories > 0 || f.protein > 0); // Filter out empty results
}

// ── Open Food Facts API ──
async function searchOpenFoodFacts(query: string): Promise<FoodSearchResult[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&countries_tags=en:united-states`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) return [];
  const data = await response.json();

  interface OffProduct {
    code?: string;
    _id?: string;
    product_name?: string;
    brands?: string;
    serving_quantity?: number;
    serving_size?: string;
    categories?: string;
    categories_tags?: string[];
    nutriments?: Record<string, number>;
  }
  // Type predicate narrows product_name + nutriments to defined inside map.
  function hasRequired(
    p: OffProduct,
  ): p is OffProduct & { product_name: string; nutriments: Record<string, number> } {
    return Boolean(p.product_name && p.nutriments);
  }
  return ((data.products as OffProduct[] | undefined) || [])
    .filter(hasRequired)
    .map((product) => {
      const n = product.nutriments;
      const servingSize = product.serving_quantity || 100;
      const ratio = servingSize / 100;

      const caloriesPer100g = n['energy-kcal_100g'] || (n.energy_100g || 0) / 4.184;

      return {
        id: `off-${product.code || product._id}`,
        name: product.product_name,
        brand: product.brands || null,
        category: mapOFFCategory(product.categories_tags || []),
        calories: Math.round(caloriesPer100g * ratio),
        protein: Math.round((n.proteins_100g || 0) * ratio * 10) / 10,
        carbs: Math.round((n.carbohydrates_100g || 0) * ratio * 10) / 10,
        fat: Math.round((n.fat_100g || 0) * ratio * 10) / 10,
        servingSize,
        servingUnit: product.serving_quantity ? 'serving' : 'g',
        source: 'openfoodfacts' as const,
        caloriesPer100g,
        proteinPer100g: n.proteins_100g || 0,
        carbsPer100g: n.carbohydrates_100g || 0,
        fatPer100g: n.fat_100g || 0,
      };
    })
    .filter((f: FoodSearchResult) => f.name && f.calories > 0);
}

// ── Helpers ──
function cleanFoodName(name: string): string {
  // USDA names are often ALL CAPS - convert to title case
  if (name === name.toUpperCase()) {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return name;
}

function mapUSDACategory(cat: string): string {
  const lower = cat.toLowerCase();
  if (lower.includes('meat') || lower.includes('poultry') || lower.includes('fish') || lower.includes('egg')) return 'protein';
  if (lower.includes('dairy') || lower.includes('milk') || lower.includes('cheese')) return 'dairy';
  if (lower.includes('fruit')) return 'fruits';
  if (lower.includes('vegetable') || lower.includes('legume')) return 'vegetables';
  if (lower.includes('grain') || lower.includes('cereal') || lower.includes('bread') || lower.includes('baked')) return 'grains';
  if (lower.includes('snack') || lower.includes('candy') || lower.includes('sweet')) return 'snacks';
  if (lower.includes('beverage') || lower.includes('drink') || lower.includes('water') || lower.includes('juice')) return 'drinks';
  if (lower.includes('fat') || lower.includes('oil') || lower.includes('nut') || lower.includes('seed')) return 'fats';
  if (lower.includes('supplement')) return 'supplements';
  return 'other';
}

function mapOFFCategory(tags: string[]): string {
  const joined = tags.join(',').toLowerCase();
  if (joined.includes('meat') || joined.includes('fish') || joined.includes('egg')) return 'protein';
  if (joined.includes('dairy') || joined.includes('milk') || joined.includes('cheese')) return 'dairy';
  if (joined.includes('fruit')) return 'fruits';
  if (joined.includes('vegetable')) return 'vegetables';
  if (joined.includes('cereal') || joined.includes('bread') || joined.includes('grain')) return 'grains';
  if (joined.includes('snack') || joined.includes('chip') || joined.includes('candy')) return 'snacks';
  if (joined.includes('beverage') || joined.includes('drink') || joined.includes('juice')) return 'drinks';
  return 'other';
}

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
  source: 'local' | 'usda' | 'openfoodfacts' | 'community';
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}
