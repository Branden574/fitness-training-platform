import 'server-only';
import Stripe from 'stripe';

// Singleton so we don't churn connection pools on every request. Reused across
// checkout session creation, webhook signature verification, Connect account
// links, and subscription reads.
let cached: Stripe | null = null;

/**
 * Returns a Stripe client, or `null` when `STRIPE_SECRET_KEY` is unset.
 * All callers must handle the null branch — Phase 3 is env-gated so the
 * admin-granted FREE tier keeps working even before billing keys arrive.
 */
export function getStripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Let the SDK pin its own Stripe-Version header so we automatically track
  // whatever this version of `stripe` was built against; avoids type drift
  // when we upgrade the package. Override per-call if a specific event needs
  // a different version.
  cached = new Stripe(key);
  return cached;
}

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function stripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}
