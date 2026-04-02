'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Plus, Edit2, Eye, EyeOff, Star, StarOff,
  Package, ShoppingBag, DollarSign, AlertTriangle, Search, Loader2,
  X, ChevronDown, Clock, MapPin, CheckCircle2, XCircle, TruckIcon
} from 'lucide-react';
import { formatPrice } from '@/lib/cartUtils';

interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  isActive: boolean;
  isFeatured: boolean;
  featuredOrder: number;
  categoryId: string | null;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; alt: string | null; sortOrder: number }[];
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string | null;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: number;
  total: number;
  pickupDate: string | null;
  pickupTime: string | null;
  pickupName: string | null;
  pickupPhone: string | null;
  notes: string | null;
  createdAt: string;
  items: { id: string; productName: string; price: number; quantity: number; total: number }[];
}

type Tab = 'products' | 'orders' | 'categories';

export default function AdminShopPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAll();
    }
  }, [status]);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchProducts(), fetchCategories(), fetchOrders()]);
    setLoading(false);
  }

  async function fetchProducts() {
    try {
      // Fetch all products including inactive for admin
      const res = await fetch('/api/shop/products?admin=true');
      if (res.ok) setProducts(await res.json());
    } catch (err) { console.error(err); }
  }

  async function fetchCategories() {
    try {
      const res = await fetch('/api/shop/categories');
      if (res.ok) setCategories(await res.json());
    } catch (err) { console.error(err); }
  }

  async function fetchOrders() {
    try {
      const params = orderStatusFilter ? `?status=${orderStatusFilter}` : '';
      const res = await fetch(`/api/shop/orders${params}`);
      if (res.ok) setOrders(await res.json());
    } catch (err) { console.error(err); }
  }

  useEffect(() => {
    if (status === 'authenticated') fetchOrders();
  }, [orderStatusFilter]);

  async function toggleProductActive(product: Product) {
    try {
      await fetch(`/api/shop/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      fetchProducts();
    } catch (err) { console.error(err); }
  }

  async function toggleProductFeatured(product: Product) {
    try {
      await fetch(`/api/shop/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !product.isFeatured }),
      });
      fetchProducts();
    } catch (err) { console.error(err); }
  }

  // No hard delete — products are hidden/shown via toggleProductActive

  async function updateOrderStatus(orderId: string, field: string, value: string) {
    try {
      await fetch(`/api/shop/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      fetchOrders();
    } catch (err) { console.error(err); }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0f1219] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2d3548] border-t-[#6366f1]" />
      </div>
    );
  }

  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'TRAINER')) {
    return (
      <div className="min-h-screen bg-[#0f1219] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-[#9ca3af]">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'products', label: `Products (${products.length})` },
    { key: 'orders', label: `Orders (${orders.length})` },
    { key: 'categories', label: `Categories (${categories.length})` },
  ];

  return (
    <div className="min-h-screen bg-[#0f1219]">
      {/* Header — compact on mobile */}
      <div className="bg-[#1a1f2e] border-b border-[#2d3548] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-5">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Link href="/admin" className="text-[#6b7280] hover:text-white transition-colors flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Shop</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href="/shop" className="hidden sm:flex px-3 py-1.5 text-sm font-medium text-[#9ca3af] border border-[#2d3548] rounded-lg hover:bg-white/5 transition-colors">
                View Store
              </Link>
              {activeTab === 'products' && (
                <button
                  onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#6366f1] text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#5558e3] transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span>
                </button>
              )}
              {activeTab === 'categories' && (
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#6366f1] text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#5558e3] transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Category</span><span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="bg-[#1a1f2e] border-b border-[#2d3548] sticky top-[52px] sm:top-[68px] z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <nav className="flex gap-4 sm:gap-6 -mb-px overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 px-1 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-[#6366f1] text-[#818cf8]'
                    : 'border-transparent text-[#6b7280] hover:text-[#9ca3af]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {products.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-12 h-12 text-[#4b5563] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No products yet</h3>
                <p className="text-[#6b7280] mb-4">Add your first product to get started.</p>
                <button
                  onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                  className="px-4 py-2 bg-[#6366f1] text-white text-sm font-semibold rounded-lg hover:bg-[#5558e3] transition-colors"
                >
                  Add Product
                </button>
              </div>
            ) : (
              <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2d3548]">
                      <th className="text-left text-xs font-medium text-[#6b7280] uppercase px-4 py-3">Product</th>
                      <th className="text-left text-xs font-medium text-[#6b7280] uppercase px-4 py-3">Price</th>
                      <th className="text-left text-xs font-medium text-[#6b7280] uppercase px-4 py-3">Stock</th>
                      <th className="text-left text-xs font-medium text-[#6b7280] uppercase px-4 py-3">Status</th>
                      <th className="text-right text-xs font-medium text-[#6b7280] uppercase px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-[#2d3548] last:border-0 hover:bg-[#252d3d]/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#252d3d] rounded-lg overflow-hidden shrink-0">
                              {product.images[0] ? (
                                <Image src={product.images[0].url} alt="" width={40} height={40} className="object-cover w-full h-full" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ShoppingBag className="w-4 h-4 text-[#4b5563]" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-white text-sm">{product.name}</p>
                              <p className="text-xs text-[#6b7280]">{product.category?.name || 'Uncategorized'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white text-sm">{formatPrice(product.price)}</span>
                          {product.compareAtPrice && product.compareAtPrice > product.price && (
                            <span className="text-xs text-[#6b7280] line-through ml-1">{formatPrice(product.compareAtPrice)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${product.stock <= product.lowStockThreshold ? 'text-amber-400' : 'text-white'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                              product.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#252d3d] text-[#6b7280]'
                            }`}>
                              {product.isActive ? 'Active' : 'Hidden'}
                            </span>
                            {product.isFeatured && (
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditingProduct(product); setShowProductModal(true); }} className="p-1.5 text-[#6b7280] hover:text-[#818cf8] transition-colors" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => toggleProductActive(product)} className="p-1.5 text-[#6b7280] hover:text-white transition-colors" title={product.isActive ? 'Hide' : 'Show'}>
                              {product.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button onClick={() => toggleProductFeatured(product)} className="p-1.5 text-[#6b7280] hover:text-amber-400 transition-colors" title={product.isFeatured ? 'Unfeature' : 'Feature'}>
                              {product.isFeatured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex gap-3 mb-4">
              {['', 'CONFIRMED', 'READY_FOR_PICKUP', 'PICKED_UP', 'CANCELLED'].map((s) => (
                <button
                  key={s}
                  onClick={() => setOrderStatusFilter(s)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    orderStatusFilter === s
                      ? 'bg-[#6366f1] text-white'
                      : 'bg-[#1e2433] text-[#9ca3af] border border-[#2d3548] hover:bg-[#252d3d]'
                  }`}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-20">
                <DollarSign className="w-12 h-12 text-[#4b5563] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No orders yet</h3>
                <p className="text-[#6b7280]">Orders will appear here once customers make purchases.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div>
                        <p className="font-mono font-semibold text-white">{order.orderNumber}</p>
                        <p className="text-sm text-[#6b7280]">
                          {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          order.paymentStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                          order.paymentStatus === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {order.paymentStatus}
                        </span>
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, 'status', e.target.value)}
                          className="px-2 py-1 bg-[#0f1219] border border-[#2d3548] rounded-lg text-white text-xs"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="PROCESSING">Processing</option>
                          <option value="READY_FOR_PICKUP">Ready for Pickup</option>
                          <option value="PICKED_UP">Picked Up</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-[#6b7280]">Customer</p>
                        <p className="text-white">{order.customerName || order.customerEmail}</p>
                        <p className="text-[#6b7280]">{order.customerEmail}</p>
                        {order.pickupPhone && <p className="text-[#6b7280]">{order.pickupPhone}</p>}
                      </div>
                      <div>
                        <p className="text-[#6b7280]">Pickup</p>
                        <p className="text-white">
                          {order.pickupDate ? new Date(order.pickupDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Not set'}
                        </p>
                        <p className="text-[#6b7280]">{order.pickupTime || 'Time not set'}</p>
                      </div>
                    </div>

                    <div className="border-t border-[#2d3548] pt-3 space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-[#9ca3af]">{item.productName} x{item.quantity}</span>
                          <span className="text-white">{formatPrice(item.total)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold text-white pt-2 border-t border-[#2d3548]">
                        <span>Total</span>
                        <span>{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            {categories.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-12 h-12 text-[#4b5563] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No categories yet</h3>
                <p className="text-[#6b7280] mb-4">Create categories to organize your products.</p>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="px-4 py-2 bg-[#6366f1] text-white text-sm font-semibold rounded-lg hover:bg-[#5558e3] transition-colors"
                >
                  Add Category
                </button>
              </div>
            ) : (
              <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl overflow-hidden">
                {categories.map((cat, i) => (
                  <div key={cat.id} className={`px-5 py-4 flex items-center justify-between ${i < categories.length - 1 ? 'border-b border-[#2d3548]' : ''}`}>
                    <div>
                      <p className="font-medium text-white">{cat.name}</p>
                      <p className="text-sm text-[#6b7280]">/{cat.slug}</p>
                    </div>
                    <span className="text-sm text-[#6b7280]">Sort: {cat.sortOrder}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
          onSave={() => { fetchProducts(); setShowProductModal(false); setEditingProduct(null); }}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSave={() => { fetchCategories(); setShowCategoryModal(false); }}
        />
      )}
    </div>
  );
}

// ── PRODUCT MODAL ──
function ProductModal({ product, categories, onClose, onSave }: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    shortDescription: product?.shortDescription || '',
    description: product?.description || '',
    price: product ? (product.price / 100).toFixed(2) : '',
    compareAtPrice: product?.compareAtPrice ? (product.compareAtPrice / 100).toFixed(2) : '',
    sku: product?.sku || '',
    stock: product?.stock?.toString() || '0',
    lowStockThreshold: product?.lowStockThreshold?.toString() || '5',
    trackInventory: product?.trackInventory ?? true,
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
    categoryId: product?.categoryId || '',
    imageUrl: product?.images?.[0]?.url || '',
  });

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const priceInCents = Math.round(parseFloat(form.price) * 100);
    const compareAtPriceInCents = form.compareAtPrice ? Math.round(parseFloat(form.compareAtPrice) * 100) : null;

    const payload = {
      name: form.name,
      slug: form.slug || generateSlug(form.name),
      shortDescription: form.shortDescription || null,
      description: form.description || null,
      price: priceInCents,
      compareAtPrice: compareAtPriceInCents,
      sku: form.sku || null,
      stock: parseInt(form.stock) || 0,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
      trackInventory: form.trackInventory,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      categoryId: form.categoryId || null,
      images: form.imageUrl ? [{ url: form.imageUrl, alt: form.name, sortOrder: 0 }] : [],
    };

    try {
      const url = product ? `/api/shop/products/${product.id}` : '/api/shop/products';
      const method = product ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save product');
      }
    } catch (err) {
      setError('Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  const inputClasses = "w-full px-3 py-2.5 bg-[#0f1219] border border-[#2d3548] rounded-lg text-white text-sm placeholder-[#4b5563] focus:ring-2 focus:ring-[#6366f1] focus:border-transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#1e2433] border border-[#2d3548] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#1e2433] border-b border-[#2d3548] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">Product Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || generateSlug(e.target.value) })}
                className={inputClasses}
                placeholder="e.g. Whey Protein Isolate"
              />
            </div>
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">URL Slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className={inputClasses}
                placeholder="auto-generated"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#9ca3af] mb-1">Short Description</label>
            <input
              value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              className={inputClasses}
              placeholder="Brief product summary"
            />
          </div>

          <div>
            <label className="block text-sm text-[#9ca3af] mb-1">Full Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className={`${inputClasses} resize-none`}
              placeholder="Detailed product description..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">Price ($) *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className={inputClasses}
                placeholder="29.99"
              />
            </div>
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">Compare at Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.compareAtPrice}
                onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
                className={inputClasses}
                placeholder="39.99"
              />
            </div>
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">SKU</label>
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className={inputClasses}
                placeholder="BMF-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">Stock</label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">Low Stock Alert</label>
              <input
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className={inputClasses}
              >
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#9ca3af] mb-1">Image URL</label>
            <input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className={inputClasses}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-[#9ca3af] cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-[#2d3548]" />
              Active (visible in store)
            </label>
            <label className="flex items-center gap-2 text-sm text-[#9ca3af] cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="rounded border-[#2d3548]" />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm text-[#9ca3af] cursor-pointer">
              <input type="checkbox" checked={form.trackInventory} onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })} className="rounded border-[#2d3548]" />
              Track inventory
            </label>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-[#2d3548] text-[#9ca3af] font-medium py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#6366f1] text-white font-semibold py-2.5 rounded-lg hover:bg-[#5558e3] transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-1.5">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : product ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── CATEGORY MODAL ──
function CategoryModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', slug: '', description: '', sortOrder: '0' });

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/shop/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug || generateSlug(form.name),
          description: form.description || null,
          sortOrder: parseInt(form.sortOrder) || 0,
        }),
      });
      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create category');
      }
    } catch (err) {
      setError('Failed to create category');
    } finally {
      setSaving(false);
    }
  }

  const inputClasses = "w-full px-3 py-2.5 bg-[#0f1219] border border-[#2d3548] rounded-lg text-white text-sm placeholder-[#4b5563] focus:ring-2 focus:ring-[#6366f1] focus:border-transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#1e2433] border border-[#2d3548] rounded-xl w-full max-w-md">
        <div className="border-b border-[#2d3548] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Add Category</h2>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-[#9ca3af] mb-1">Category Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })}
              className={inputClasses}
              placeholder="e.g. Protein Supplements"
            />
          </div>
          <div>
            <label className="block text-sm text-[#9ca3af] mb-1">Slug</label>
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputClasses} />
          </div>
          <div>
            <label className="block text-sm text-[#9ca3af] mb-1">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClasses} />
          </div>
          <div>
            <label className="block text-sm text-[#9ca3af] mb-1">Sort Order</label>
            <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className={inputClasses} />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-[#2d3548] text-[#9ca3af] font-medium py-2.5 rounded-lg hover:bg-white/5 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#6366f1] text-white font-semibold py-2.5 rounded-lg hover:bg-[#5558e3] disabled:opacity-50 text-sm">
              {saving ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
