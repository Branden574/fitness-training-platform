'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag, Minus, Plus, Check, MapPin, Clock, ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { formatPrice } from '@/lib/cartUtils';

interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  trackInventory: boolean;
  isFeatured: boolean;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; alt: string | null; sortOrder: number }[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart, cart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/shop/products?slug=${params.slug}`);
        if (res.ok) {
          const data = await res.json();
          // API returns array, find the matching product
          const found = Array.isArray(data)
            ? data.find((p: Product) => p.slug === params.slug)
            : data;
          if (found) {
            setProduct(found);
          } else {
            router.push('/shop');
          }
        }
      } catch (err) {
        console.error('Failed to fetch product:', err);
      } finally {
        setLoading(false);
      }
    }
    if (params.slug) fetchProduct();
  }, [params.slug, router]);

  function handleAddToCart() {
    if (!product) return;
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.images[0]?.url,
      slug: product.slug,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const isOutOfStock = product?.trackInventory && (product?.stock ?? 0) <= 0;
  const isOnSale = product?.compareAtPrice && product.compareAtPrice > product.price;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <main className="bg-[#0f1219] min-h-screen pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 animate-pulse">
            <div className="aspect-square bg-[#1e2433] rounded-xl" />
            <div className="space-y-4 py-8">
              <div className="h-4 bg-[#1e2433] rounded w-1/4" />
              <div className="h-8 bg-[#1e2433] rounded w-3/4" />
              <div className="h-4 bg-[#1e2433] rounded w-full" />
              <div className="h-4 bg-[#1e2433] rounded w-2/3" />
              <div className="h-10 bg-[#1e2433] rounded w-1/3 mt-8" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="bg-[#0f1219] min-h-screen pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          <ShoppingBag className="w-12 h-12 text-[#4b5563] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Product not found</h2>
          <Link href="/shop" className="text-[#818cf8] hover:text-[#6366f1]">Back to shop</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#0f1219] min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shop
          </Link>
          <Link
            href="/shop/cart"
            className="relative inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Cart
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#6366f1] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <div className="relative aspect-square bg-[#1e2433] rounded-xl overflow-hidden mb-4">
              {product.images.length > 0 ? (
                <Image
                  src={product.images[selectedImage]?.url || product.images[0].url}
                  alt={product.images[selectedImage]?.alt || product.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-16 h-16 text-[#4b5563]" />
                </div>
              )}
              {isOnSale && (
                <span className="absolute top-3 left-3 bg-red-500 text-white text-sm font-semibold px-3 py-1 rounded-full">
                  Sale
                </span>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === i ? 'border-[#6366f1]' : 'border-[#2d3548] hover:border-[#4b5563]'
                    }`}
                  >
                    <Image src={img.url} alt={img.alt || ''} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="py-2">
            {product.category && (
              <p className="text-sm text-[#6b7280] mb-2">{product.category.name}</p>
            )}
            <h1 className="text-3xl font-bold text-white mb-4">{product.name}</h1>

            {product.shortDescription && (
              <p className="text-[#9ca3af] mb-6">{product.shortDescription}</p>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-white">{formatPrice(product.price)}</span>
              {isOnSale && (
                <>
                  <span className="text-xl text-[#6b7280] line-through">{formatPrice(product.compareAtPrice!)}</span>
                  <span className="text-sm font-semibold text-red-400">
                    Save {formatPrice(product.compareAtPrice! - product.price)}
                  </span>
                </>
              )}
            </div>

            {/* Stock */}
            {product.trackInventory && (
              <p className={`text-sm mb-6 ${product.stock > 5 ? 'text-emerald-400' : product.stock > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                {product.stock > 5
                  ? 'In Stock'
                  : product.stock > 0
                  ? `Only ${product.stock} left`
                  : 'Out of Stock'}
              </p>
            )}

            {/* Quantity + Add to Cart */}
            {!isOutOfStock && (
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center border border-[#2d3548] rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2.5 text-[#9ca3af] hover:text-white transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-white font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.trackInventory ? product.stock : 99, quantity + 1))}
                    className="p-2.5 text-[#9ca3af] hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#6366f1] text-white font-semibold py-3 rounded-lg hover:bg-[#5558e3] transition-colors"
                >
                  {added ? (
                    <>
                      <Check className="w-5 h-5" /> Added to Cart
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5" /> Add to Cart
                    </>
                  )}
                </button>
              </div>
            )}

            {isOutOfStock && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8">
                <p className="text-red-400 font-medium">This product is currently out of stock.</p>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="border-t border-[#2d3548] pt-6 mb-6">
                <h3 className="font-semibold text-white mb-3">Description</h3>
                <div className="text-sm text-[#9ca3af] leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              </div>
            )}

            {/* Pickup Info */}
            <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-5">
              <h3 className="font-semibold text-white mb-3">Pickup Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2 text-[#9ca3af]">
                  <MapPin className="w-4 h-4 text-[#818cf8] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-white">Synergy Personal Training</p>
                    <p>4774 N Blackstone Ave, Fresno, CA 93726</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-[#9ca3af]">
                  <Clock className="w-4 h-4 text-[#818cf8] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-white">Pickup Hours</p>
                    <p>Monday - Friday: 5:00 AM - 8:00 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
