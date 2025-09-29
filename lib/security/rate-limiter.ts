import { NextRequest } from 'next/server';

// Advanced Rate Limiting System
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  failures: number;
}

class AdvancedRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    // Set up different rate limits for different endpoints
    this.setupDefaultLimits();
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private setupDefaultLimits() {
    // Authentication endpoints - stricter limits
    this.configs.set('auth', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 attempts per 15 minutes
      skipSuccessfulRequests: true
    });

    // Password reset - very strict
    this.configs.set('password-reset', {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 attempts per hour
      skipSuccessfulRequests: false
    });

    // API endpoints - moderate limits
    this.configs.set('api', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // 100 requests per 15 minutes
      skipSuccessfulRequests: true
    });

    // Admin actions - strict but reasonable
    this.configs.set('admin', {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 20, // 20 actions per 5 minutes
      skipSuccessfulRequests: true
    });

    // File uploads - very limited
    this.configs.set('upload', {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10, // 10 uploads per hour
      skipSuccessfulRequests: false
    });

    // General endpoints
    this.configs.set('general', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 200, // 200 requests per 15 minutes
      skipSuccessfulRequests: true
    });
  }

  private getKey(req: NextRequest, config: RateLimitConfig, prefix: string): string {
    if (config.keyGenerator) {
      return `${prefix}:${config.keyGenerator(req)}`;
    }
    
    // Use IP address as default (extract from headers)
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown';
    return `${prefix}:${ip}`;
  }

  checkLimit(req: NextRequest, limitType: string = 'general'): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const config = this.configs.get(limitType) || this.configs.get('general')!;
    const key = this.getKey(req, config, limitType);
    const now = Date.now();

    let entry = this.store.get(key);

    // Initialize or reset if window has passed
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
        failures: entry?.failures || 0
      };
      this.store.set(key, entry);
    }

    // Check if limit exceeded
    const allowed = entry.count < config.maxRequests;
    
    if (allowed) {
      entry.count++;
    } else {
      entry.failures++;
    }

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const retryAfter = !allowed ? Math.ceil((entry.resetTime - now) / 1000) : undefined;

    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      retryAfter
    };
  }

  // Record successful request (for skipSuccessfulRequests)
  recordSuccess(req: NextRequest, limitType: string = 'general') {
    const config = this.configs.get(limitType);
    if (config?.skipSuccessfulRequests) {
      const key = this.getKey(req, config, limitType);
      const entry = this.store.get(key);
      if (entry && entry.count > 0) {
        entry.count--;
      }
    }
  }

  // Record failed request (for skipFailedRequests)
  recordFailure(req: NextRequest, limitType: string = 'general') {
    const config = this.configs.get(limitType);
    if (config?.skipFailedRequests) {
      const key = this.getKey(req, config, limitType);
      const entry = this.store.get(key);
      if (entry && entry.count > 0) {
        entry.count--;
      }
    }
  }

  // Get failure count for account lockout decisions
  getFailureCount(req: NextRequest, limitType: string = 'auth'): number {
    const config = this.configs.get(limitType) || this.configs.get('general')!;
    const key = this.getKey(req, config, limitType);
    const entry = this.store.get(key);
    return entry?.failures || 0;
  }

  // Reset failures (e.g., after successful login)
  resetFailures(req: NextRequest, limitType: string = 'auth') {
    const config = this.configs.get(limitType) || this.configs.get('general')!;
    const key = this.getKey(req, config, limitType);
    const entry = this.store.get(key);
    if (entry) {
      entry.failures = 0;
    }
  }

  // Manual block (for security incidents)
  blockKey(req: NextRequest, limitType: string, durationMs: number) {
    const config = this.configs.get(limitType) || this.configs.get('general')!;
    const key = this.getKey(req, config, limitType);
    const now = Date.now();
    
    this.store.set(key, {
      count: config.maxRequests + 1, // Exceed limit
      resetTime: now + durationMs,
      failures: 0
    });
  }

  // Cleanup expired entries
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  // Get current status for monitoring
  getStats(): {
    totalEntries: number;
    blockedIPs: number;
    topFailures: Array<{ key: string; failures: number }>;
  } {
    const now = Date.now();
    let blockedIPs = 0;
    const failures: Array<{ key: string; failures: number }> = [];

    for (const [key, entry] of this.store.entries()) {
      if (now <= entry.resetTime && entry.count >= (this.configs.get('general')?.maxRequests || 200)) {
        blockedIPs++;
      }
      if (entry.failures > 0) {
        failures.push({ key, failures: entry.failures });
      }
    }

    failures.sort((a, b) => b.failures - a.failures);

    return {
      totalEntries: this.store.size,
      blockedIPs,
      topFailures: failures.slice(0, 10)
    };
  }
}

// Global rate limiter instance
export const rateLimiter = new AdvancedRateLimiter();

// Helper function for middleware
export function createRateLimitResponse(result: ReturnType<typeof rateLimiter.checkLimit>) {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

  if (!result.allowed && result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString());
  }

  return {
    allowed: result.allowed,
    headers,
    status: result.allowed ? 200 : 429,
    message: result.allowed 
      ? 'Request allowed' 
      : `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`
  };
}

// Middleware wrapper for easy use
export function withRateLimit(limitType: string = 'general') {
  return (req: NextRequest) => {
    const result = rateLimiter.checkLimit(req, limitType);
    return createRateLimitResponse(result);
  };
}

export default rateLimiter;