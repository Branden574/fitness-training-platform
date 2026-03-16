'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, MapPin, Clock, Loader2 } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { formatPrice } from '@/lib/cartUtils';

const PICKUP_TIMES = [
  '5:00 AM - 6:00 AM',
  '6:00 AM - 7:00 AM',
  '7:00 AM - 8:00 AM',
  '8:00 AM - 9:00 AM',
  '9:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 1:00 PM',
  '1:00 PM - 2:00 PM',
  '2:00 PM - 3:00 PM',
  '3:00 PM - 4:00 PM',
  '4:00 PM - 5:00 PM',
  '5:00 PM - 6:00 PM',
  '6:00 PM - 7:00 PM',
  '7:00 PM - 8:00 PM',
];

function getMinPickupDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function getMaxPickupDate(): string {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 14);
  return maxDate.toISOString().split('T')[0];
}

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, clearCart, getCartTotal } = useCart();
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [pickupName, setPickupName] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subtotal = getCartTotal();

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          pickupDate,
          pickupTime,
          pickupName,
          pickupPhone,
          customerEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Checkout failed. Please try again.');
        return;
      }

      // Redirect to Stripe Checkout — card info handled entirely by Stripe
      if (data.checkoutUrl) {
        clearCart();
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (cart.length === 0) {
    return (
      <main className="bg-[#0f1219] min-h-screen pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          <ShoppingBag className="w-14 h-14 text-[#4b5563] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-3">Your cart is empty</h1>
          <p className="text-[#9ca3af] mb-6">Browse our products and add something to your cart.</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-[#6366f1] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#5558e3] transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#0f1219] min-h-screen pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-white mb-8">Your Cart</h1>

        <form onSubmit={handleCheckout}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-4 flex gap-4"
                >
                  <Link href={`/shop/${item.slug}`} className="relative w-20 h-20 bg-[#252d3d] rounded-lg overflow-hidden shrink-0">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-[#4b5563]" />
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/shop/${item.slug}`} className="font-semibold text-white hover:text-[#818cf8] transition-colors">
                      {item.name}
                    </Link>
                    <p className="text-sm text-[#818cf8] font-medium mt-0.5">{formatPrice(item.price)}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-[#2d3548] rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="p-1.5 text-[#9ca3af] hover:text-white transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-white text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="p-1.5 text-[#9ca3af] hover:text-white transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-white">{formatPrice(item.price * item.quantity)}</span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-[#4b5563] hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary + Pickup Details */}
            <div className="space-y-4">
              {/* Your Info */}
              <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Your Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-[#9ca3af] mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={pickupName}
                      onChange={(e) => setPickupName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0f1219] border border-[#2d3548] rounded-lg text-white text-sm placeholder-[#4b5563] focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#9ca3af] mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0f1219] border border-[#2d3548] rounded-lg text-white text-sm placeholder-[#4b5563] focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#9ca3af] mb-1">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={pickupPhone}
                      onChange={(e) => setPickupPhone(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0f1219] border border-[#2d3548] rounded-lg text-white text-sm placeholder-[#4b5563] focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Pickup Details */}
              <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Pickup Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-[#9ca3af] mb-1">Pickup Date *</label>
                    <input
                      type="date"
                      required
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      min={getMinPickupDate()}
                      max={getMaxPickupDate()}
                      className="w-full px-3 py-2.5 bg-[#0f1219] border border-[#2d3548] rounded-lg text-white text-sm focus:ring-2 focus:ring-[#6366f1] focus:border-transparent [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#9ca3af] mb-1">Pickup Time *</label>
                    <select
                      required
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0f1219] border border-[#2d3548] rounded-lg text-white text-sm focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
                    >
                      <option value="">Select a time</option>
                      {PICKUP_TIMES.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#2d3548] space-y-2 text-sm text-[#6b7280]">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#818cf8] mt-0.5 shrink-0" />
                    <span>Synergy Personal Training, 4774 N Blackstone Ave, Fresno</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#818cf8] mt-0.5 shrink-0" />
                    <span>Mon-Fri: 5 AM - 8 PM</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[#9ca3af]">
                    <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#9ca3af]">
                    <span>Pickup</span>
                    <span className="text-emerald-400">Free</span>
                  </div>
                  <div className="border-t border-[#2d3548] pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-white text-base">
                      <span>Total</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-[#6366f1] text-white font-semibold py-3 rounded-lg hover:bg-[#5558e3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${formatPrice(subtotal)}`
                  )}
                </button>

                <p className="text-xs text-[#4b5563] text-center mt-3">
                  Secure payment powered by Stripe. Your card information is never stored on our servers.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
