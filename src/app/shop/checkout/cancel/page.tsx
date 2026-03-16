import Link from 'next/link';
import { XCircle, ArrowLeft, ShoppingCart } from 'lucide-react';

export default function CheckoutCancelPage() {
  return (
    <main className="bg-[#0f1219] min-h-screen pt-28 pb-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Checkout Cancelled</h1>
        <p className="text-[#9ca3af] mb-8">
          Your payment was not processed and you have not been charged.
          Your cart items are still saved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/shop/cart"
            className="inline-flex items-center justify-center gap-2 bg-[#6366f1] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#5558e3] transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Return to Cart
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 border border-[#2d3548] text-[#9ca3af] font-medium px-6 py-3 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
