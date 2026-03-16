import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort');
    const slug = searchParams.get('slug');
    const showAll = searchParams.get('admin') === 'true';

    // Build where clause
    const where: Record<string, unknown> = {};

    // Only show inactive products if the user is an authenticated admin/trainer
    if (showAll) {
      const session = await getServerSession(authOptions);
      const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'TRAINER';
      if (!isAdmin) {
        where.isActive = true; // Non-admin users always see active only
      }
    } else {
      where.isActive = true;
    }

    if (slug) {
      where.slug = slug;
    }

    if (category) {
      where.category = { slug: category };
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    let orderBy: Record<string, string> = { createdAt: 'desc' };
    switch (sort) {
      case 'price-asc':
        orderBy = { price: 'asc' };
        break;
      case 'price-desc':
        orderBy = { price: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'name':
        orderBy = { name: 'asc' };
        break;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
      },
      orderBy,
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'TRAINER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      shortDescription,
      description,
      price,
      compareAtPrice,
      sku,
      stock,
      lowStockThreshold,
      trackInventory,
      isActive,
      isFeatured,
      featuredOrder,
      categoryId,
      images,
    } = body;

    if (!name || !slug || price === undefined) {
      return NextResponse.json(
        { error: 'Name, slug, and price are required' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        shortDescription,
        description,
        price,
        compareAtPrice,
        sku,
        stock: stock ?? 0,
        lowStockThreshold: lowStockThreshold ?? 5,
        trackInventory: trackInventory ?? true,
        isActive: isActive ?? true,
        isFeatured: isFeatured ?? false,
        featuredOrder: featuredOrder ?? 0,
        categoryId,
        images: images?.length
          ? {
              create: images.map(
                (img: { url: string; alt?: string; sortOrder?: number }) => ({
                  url: img.url,
                  alt: img.alt,
                  sortOrder: img.sortOrder ?? 0,
                })
              ),
            }
          : undefined,
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
