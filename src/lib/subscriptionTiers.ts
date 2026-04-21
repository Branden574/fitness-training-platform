export type Tier = 'FREE' | 'STARTER' | 'PRO' | 'CUSTOM';

export interface TierConfig {
  label: string;
  monthlyPriceDefault: number;
  stripePriceEnv: string | null;
  description: string;
}

// App-level tier catalogue. The Stripe Price ID is resolved via env at
// checkout time so we can change prices (or swap price IDs between test/live)
// without a code change. Admin-granted FREE bypasses Stripe entirely.
export const TIERS: Record<Tier, TierConfig> = {
  FREE: {
    label: 'Foundation',
    monthlyPriceDefault: 0,
    stripePriceEnv: null,
    description: 'Invite-only. Admin-granted. No platform fee.',
  },
  STARTER: {
    label: 'Starter',
    monthlyPriceDefault: 29,
    stripePriceEnv: 'STRIPE_PRICE_STARTER',
    description: 'Up to 20 active clients. Public directory listing.',
  },
  PRO: {
    label: 'Pro',
    monthlyPriceDefault: 99,
    stripePriceEnv: 'STRIPE_PRICE_PRO',
    description: 'Unlimited clients. Priority directory placement.',
  },
  CUSTOM: {
    label: 'Custom',
    monthlyPriceDefault: 0,
    stripePriceEnv: 'STRIPE_PRICE_CUSTOM',
    description: 'Enterprise / multi-location. Contact for pricing.',
  },
};

export function resolveStripePriceId(tier: Tier): string | null {
  const envKey = TIERS[tier].stripePriceEnv;
  if (!envKey) return null;
  return process.env[envKey] ?? null;
}

export function isPaidTier(tier: Tier | null | undefined): boolean {
  return tier === 'STARTER' || tier === 'PRO' || tier === 'CUSTOM';
}
