/**
 * Rate limiter with an Upstash Redis backend when configured and a
 * process-local `Map` fallback otherwise.
 *
 * Why two backends:
 * - Local dev has no reason to spin up Redis — the Map is fine.
 * - Railway before Branden wires Upstash keeps working.
 * - Production (2+ replicas, Railway container recycles during
 *   deploys) MUST use Upstash so limits actually hold across
 *   instances and across cold starts. The in-memory fallback
 *   resets every deploy — fine for dev, catastrophic at scale.
 *
 * Call sites (`checkRateLimitAsync`, `rateLimitResponse`, `getClientIp`)
 * stay identical — swapping backends is a config change, never a
 * code change at call sites.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

interface RateLimitOptions {
  maxRequests: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

// --- Upstash backend (used when UPSTASH_REDIS_REST_URL is set) ---

let upstashClient: Redis | null = null;
const limiterCache = new Map<string, Ratelimit>();

function upstashAvailable(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRedis(): Redis {
  if (!upstashClient) {
    upstashClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return upstashClient;
}

function getLimiter(opts: RateLimitOptions): Ratelimit {
  const key = `${opts.maxRequests}:${opts.windowSeconds}`;
  const cached = limiterCache.get(key);
  if (cached) return cached;
  const limiter = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(
      opts.maxRequests,
      `${opts.windowSeconds} s`,
    ),
    prefix: 'mf:rl',
    analytics: false,
  });
  limiterCache.set(key, limiter);
  return limiter;
}

// --- In-memory fallback ---

interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const memoryStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes so the Map doesn't grow
// unbounded under attack. Single instance only — fine for dev + the
// single-replica Railway prod until Upstash comes online.
setInterval(
  () => {
    const now = Date.now();
    for (const [k, v] of memoryStore) {
      if (now > v.resetTime) memoryStore.delete(k);
    }
  },
  5 * 60 * 1000,
);

function checkMemory(
  identifier: string,
  opts: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(identifier);
  if (!entry || now > entry.resetTime) {
    memoryStore.set(identifier, {
      count: 1,
      resetTime: now + opts.windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: opts.maxRequests - 1,
      resetIn: opts.windowSeconds,
    };
  }
  if (entry.count >= opts.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }
  entry.count++;
  return {
    allowed: true,
    remaining: opts.maxRequests - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

// --- Public API ---

/**
 * Preferred variant. Uses Upstash when the env is set so limits hold
 * across replicas and deploys; falls back to in-memory otherwise.
 */
export async function checkRateLimitAsync(
  identifier: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  if (upstashAvailable()) {
    try {
      const limiter = getLimiter(options);
      const res = await limiter.limit(identifier);
      return {
        allowed: res.success,
        remaining: res.remaining,
        resetIn: Math.max(0, Math.ceil((res.reset - Date.now()) / 1000)),
      };
    } catch (err) {
      // Upstash outage → fall back to in-memory rather than fail open
      // on all requests. Log so ops notices the degraded mode.
      console.warn('[rate-limit] Upstash failed, using in-memory fallback:', err);
      return checkMemory(identifier, options);
    }
  }
  return checkMemory(identifier, options);
}

/**
 * Sync variant — kept for call sites that can't go async cheaply
 * (e.g. middleware.ts, which needs a sync decision). Always uses the
 * in-memory store. New code should prefer checkRateLimitAsync so the
 * distributed limit applies.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions,
): RateLimitResult {
  return checkMemory(identifier, options);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export function rateLimitResponse(resetIn: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(resetIn),
      },
    },
  );
}
