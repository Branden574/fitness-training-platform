import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Barcode lookup endpoint — tries multiple databases server-side using real API keys
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('code')?.trim();

    if (!barcode) {
      return NextResponse.json({ error: 'Barcode required' }, { status: 400 });
    }

    // Try 0: Check community database first (instant, no external API call)
    try {
      const communityFood = await prisma.communityFood.findUnique({
        where: { barcode },
      });
      if (communityFood) {
        await prisma.communityFood.update({
          where: { id: communityFood.id },
          data: { useCount: { increment: 1 } },
        }).catch(() => {});
        return NextResponse.json({
          found: true,
          source: 'Community',
          product: {
            name: communityFood.name,
            brand: communityFood.brand,
            calories: communityFood.calories,
            protein: communityFood.protein,
            carbs: communityFood.carbs,
            fat: communityFood.fat,
            servingSize: communityFood.servingSize,
            servingUnit: communityFood.servingUnit,
          },
        });
      }
    } catch {}

    // Try 1: Open Food Facts
    try {
      const offRes = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
        { signal: AbortSignal.timeout(5000) }
      );
      const offData = await offRes.json();

      if (offData.status === 1 && offData.product?.product_name) {
        const p = offData.product;
        const n = p.nutriments || {};
        const cal100 = n['energy-kcal_100g'] || (n.energy_100g || 0) / 4.184;

        if (cal100 > 0 || n.proteins_100g > 0) {
          const servingSize = p.serving_quantity || 100;
          const ratio = servingSize / 100;
          return NextResponse.json({
            found: true,
            source: 'Open Food Facts',
            product: {
              name: p.product_name,
              brand: p.brands || null,
              calories: Math.round(cal100 * ratio),
              protein: Math.round((n.proteins_100g || 0) * ratio * 10) / 10,
              carbs: Math.round((n.carbohydrates_100g || 0) * ratio * 10) / 10,
              fat: Math.round((n.fat_100g || 0) * ratio * 10) / 10,
              servingSize,
              servingUnit: p.serving_quantity ? 'serving' : 'g',
            },
          });
        }
      }
    } catch {}

    // Try 2: USDA FoodData Central — search by UPC with real API key
    const usdaKey = process.env.USDA_API_KEY || 'DEMO_KEY';
    try {
      // First try exact GTIN/UPC match
      const usdaRes = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey}&query=${barcode}&dataType=Branded&pageSize=5`,
        { signal: AbortSignal.timeout(8000) }
      );
      const usdaData = await usdaRes.json();

      if (usdaData.foods && usdaData.foods.length > 0) {
        const food = usdaData.foods[0];
        const nutrients = food.foodNutrients || [];
        const getVal = (id: number) => nutrients.find((n: any) => n.nutrientId === id)?.value || 0;
        const servingSize = food.servingSize || 100;
        const ratio = servingSize / 100;

        return NextResponse.json({
          found: true,
          source: 'USDA',
          product: {
            name: cleanName(food.description || 'Unknown Product'),
            brand: food.brandName || food.brandOwner || null,
            calories: Math.round(getVal(1008) * ratio),
            protein: Math.round(getVal(1003) * ratio * 10) / 10,
            carbs: Math.round(getVal(1005) * ratio * 10) / 10,
            fat: Math.round(getVal(1004) * ratio * 10) / 10,
            servingSize,
            servingUnit: food.servingSizeUnit || 'g',
          },
        });
      }
    } catch {}

    // Try 3: USDA — search by product name keywords from barcode (sometimes UPC isn't indexed but product name is)
    try {
      // Try searching with common barcode prefixes stripped
      const cleanBarcode = barcode.replace(/^0+/, ''); // Strip leading zeros
      const usdaRes2 = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey}&query=${cleanBarcode}&dataType=Branded&pageSize=3`,
        { signal: AbortSignal.timeout(6000) }
      );
      const usdaData2 = await usdaRes2.json();

      if (usdaData2.foods && usdaData2.foods.length > 0) {
        const food = usdaData2.foods[0];
        const nutrients = food.foodNutrients || [];
        const getVal = (id: number) => nutrients.find((n: any) => n.nutrientId === id)?.value || 0;
        const servingSize = food.servingSize || 100;
        const ratio = servingSize / 100;

        return NextResponse.json({
          found: true,
          source: 'USDA',
          product: {
            name: cleanName(food.description || 'Unknown Product'),
            brand: food.brandName || food.brandOwner || null,
            calories: Math.round(getVal(1008) * ratio),
            protein: Math.round(getVal(1003) * ratio * 10) / 10,
            carbs: Math.round(getVal(1005) * ratio * 10) / 10,
            fat: Math.round(getVal(1004) * ratio * 10) / 10,
            servingSize,
            servingUnit: food.servingSizeUnit || 'g',
          },
        });
      }
    } catch {}

    return NextResponse.json({
      found: false,
      barcode,
      message: 'Product not found. Try searching by name instead.',
    });
  } catch (error) {
    console.error('Barcode lookup error:', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}

function cleanName(name: string): string {
  if (name === name.toUpperCase()) {
    return name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return name;
}
