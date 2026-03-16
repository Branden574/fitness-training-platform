'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, MapPin, Clock, ShoppingBag, ArrowRight } from 'lucide-react';

interface OrderDetails {
  orderNumber: string;
  customerEmail: string;
  pickupDate: string;
  pickupTime: string;
  pickupName: string;
  total: number;
  items: { productName: string; quantity: number; price: number }[];
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <main className="bg-[#0f1219] min-h-screen pt-28 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2d3548] border-t-[#6366f1]" />
      </main>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      fetchOrderDetails(sessionId);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  async function fetchOrderDetails(sessionId: string) {
    try {
      const res = await fetch(`/api/shop/orders?session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-[#0f1219] min-h-screen pt-28 pb-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
          <p className="text-[#9ca3af]">
            Thank you for your purchase. You&apos;ll receive a confirmation email shortly.
          </p>
        </div>

        {loading ? (
          <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-8 animate-pulse">
            <div className="space-y-4">
              <div className="h-4 bg-[#252d3d] rounded w-1/2" />
              <div className="h-4 bg-[#252d3d] rounded w-3/4" />
              <div className="h-4 bg-[#252d3d] rounded w-1/3" />
            </div>
          </div>
        ) : order ? (
          <div className="space-y-4">
            <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-[#6b7280]">Order Number</p>
                  <p className="font-mono font-semibold text-white">{order.orderNumber}</p>
                </div>
                <span className="text-sm font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                  Confirmed
                </span>
              </div>

              <div className="border-t border-[#2d3548] pt-4 space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-[#9ca3af]">{item.productName} x{item.quantity}</span>
                    <span className="text-white">${((item.price * item.quantity) / 100).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-[#2d3548] pt-3 flex justify-between font-semibold">
                  <span className="text-white">Total</span>
                  <span className="text-white">${(order.total / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">Pickup Details</h3>
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
                    <p className="font-medium text-white">
                      {order.pickupDate ? new Date(order.pickupDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'TBD'}
                    </p>
                    <p>{order.pickupTime || 'Time not selected'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-[#9ca3af]">
                  <ShoppingBag className="w-4 h-4 text-[#818cf8] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-white">Pickup For</p>
                    <p>{order.pickupName}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-[#6b7280] text-center">
              A confirmation has been sent to <span className="text-white">{order.customerEmail}</span>
            </p>
          </div>
        ) : (
          <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-8 text-center">
            <p className="text-[#9ca3af] mb-4">Your order has been placed successfully.</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 bg-[#6366f1] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#5558e3] transition-colors"
          >
            Continue Shopping <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center border border-[#2d3548] text-[#9ca3af] font-medium px-6 py-3 rounded-lg hover:bg-white/5 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
