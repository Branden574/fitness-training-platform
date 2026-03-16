'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, SlidersHorizontal, ShoppingBag, Tag, Package } from 'lucide-react';
import { formatPrice } from '@/lib/cartUtils';

interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  trackInventory: boolean;
  isFeatured: boolean;
  images: { id: string; url: string; alt: string | null }[];
  category: { id: string; name: string; slug: string } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sort]);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/shop/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (sort) params.set('sort', sort);
      if (search) params.set('search', search);

      const res = await fetch(`/api/shop/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchProducts();
  }

  const featuredProducts = products.filter((p) => p.isFeatured);
  const allProducts = products;

  return (
    <main className="bg-[#0f1219] min-h-screen">
      {/* Hero */}
      <section className="pt-28 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-[#6366f1] font-semibold text-sm tracking-wide uppercase mb-2">Shop</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
              Supplements &amp; Products
            </h1>
            <p className="text-lg text-[#9ca3af]">
              Hand-picked supplements and fitness products recommended by Brent. Available for pickup at Synergy Personal Training in Fresno.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="pb-12 border-b border-[#2d3548]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-6">
              <Tag className="w-4 h-4 text-[#818cf8]" />
              <h2 className="text-lg font-semibold text-white">Featured</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filters + Products */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b5563]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1e2433] border border-[#2d3548] rounded-lg text-white placeholder-[#4b5563] text-sm focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
                />
              </div>
            </form>
            <div className="flex gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 bg-[#1e2433] border border-[#2d3548] rounded-lg text-white text-sm focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2.5 bg-[#1e2433] border border-[#2d3548] rounded-lg text-white text-sm focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-[#1e2433] border border-[#2d3548] rounded-xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-[#252d3d]" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-[#252d3d] rounded w-3/4" />
                    <div className="h-3 bg-[#252d3d] rounded w-1/2" />
                    <div className="h-5 bg-[#252d3d] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : allProducts.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 text-[#4b5563] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No products found</h3>
              <p className="text-[#6b7280]">
                {search || selectedCategory ? 'Try adjusting your filters.' : 'Check back soon for new products!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pickup Info */}
      <section className="py-12 border-t border-[#2d3548]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Pickup Only</h2>
          <p className="text-[#9ca3af] mb-4">
            All orders are available for pickup at Synergy Personal Training.
            Select your preferred pickup time during checkout.
          </p>
          <p className="text-sm text-[#6b7280]">
            4774 N Blackstone Ave, Fresno, CA 93726 &middot; Mon-Fri 5:00 AM - 8:00 PM
          </p>
        </div>
      </section>
    </main>
  );
}

function ProductCard({ product }: { product: Product }) {
  const isOnSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const isOutOfStock = product.trackInventory && product.stock <= 0;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group bg-[#1e2433] border border-[#2d3548] rounded-xl overflow-hidden hover:border-[#6366f1]/40 transition-all duration-200"
    >
      <div className="relative aspect-square bg-[#252d3d]">
        {product.images.length > 0 ? (
          <Image
            src={product.images[0].url}
            alt={product.images[0].alt || product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-[#4b5563]" />
          </div>
        )}
        {isOnSale && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            Sale
          </span>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-sm bg-black/70 px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        {product.category && (
          <p className="text-xs text-[#6b7280] mb-1">{product.category.name}</p>
        )}
        <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 group-hover:text-[#818cf8] transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{formatPrice(product.price)}</span>
          {isOnSale && (
            <span className="text-sm text-[#6b7280] line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
