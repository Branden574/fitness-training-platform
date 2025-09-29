import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// CSRF Protection System
export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_LIFETIME = 60 * 60 * 1000; // 1 hour
  private static tokens = new Map<string, { token: string; expires: number; sessionId: string }>();

  // Generate CSRF token
  static generateToken(sessionId: string): string {
    const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
    const expires = Date.now() + this.TOKEN_LIFETIME;
    
    this.tokens.set(token, { token, expires, sessionId });
    
    // Clean up expired tokens
    this.cleanup();
    
    return token;
  }

  // Validate CSRF token
  static validateToken(token: string, sessionId: string): boolean {
    if (!token || !sessionId) return false;
    
    const tokenData = this.tokens.get(token);
    if (!tokenData) return false;
    
    // Check expiration
    if (Date.now() > tokenData.expires) {
      this.tokens.delete(token);
      return false;
    }
    
    // Check session match
    if (tokenData.sessionId !== sessionId) return false;
    
    return true;
  }

  // Invalidate token after use (single-use tokens)
  static invalidateToken(token: string): void {
    this.tokens.delete(token);
  }

  // Clean up expired tokens
  private static cleanup(): void {
    const now = Date.now();
    for (const [token, data] of this.tokens.entries()) {
      if (now > data.expires) {
        this.tokens.delete(token);
      }
    }
  }

  // Get CSRF token from request headers
  static getTokenFromRequest(req: NextRequest): string | null {
    // Check X-CSRF-Token header first
    let token = req.headers.get('x-csrf-token');
    
    // Fallback to form data or query params
    if (!token) {
      const url = new URL(req.url);
      token = url.searchParams.get('_token');
    }
    
    return token;
  }

  // Create CSRF protection middleware
  static createMiddleware() {
    return (req: NextRequest, sessionId: string) => {
      const method = req.method;
      
      // Only protect state-changing methods
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return { valid: true };
      }
      
      const token = this.getTokenFromRequest(req);
      const isValid = this.validateToken(token || '', sessionId);
      
      if (!isValid) {
        return {
          valid: false,
          response: NextResponse.json(
            { error: 'Invalid or missing CSRF token' },
            { status: 403 }
          )
        };
      }
      
      // Invalidate single-use token
      if (token) {
        this.invalidateToken(token);
      }
      
      return { valid: true };
    };
  }
}

// Content Security Policy (CSP)
export class ContentSecurityPolicy {
  private static readonly DEFAULT_CSP = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://vercel.live"],
    'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    'font-src': ["'self'", "https://fonts.gstatic.com"],
    'img-src': ["'self'", "data:", "https:", "blob:"],
    'connect-src': ["'self'", "https:", "wss:"],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  };

  static generateCSPHeader(customPolicies?: Partial<typeof this.DEFAULT_CSP>): string {
    const policies = { ...this.DEFAULT_CSP, ...customPolicies };
    
    return Object.entries(policies)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive;
        }
        return `${directive} ${sources.join(' ')}`;
      })
      .join('; ');
  }

  static getSecurityHeaders(): Record<string, string> {
    return {
      // Content Security Policy
      'Content-Security-Policy': this.generateCSPHeader(),
      
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // XSS Protection
      'X-XSS-Protection': '1; mode=block',
      
      // Prevent embedding in frames
      'X-Frame-Options': 'DENY',
      
      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions Policy (Feature Policy)
      'Permissions-Policy': [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()'
      ].join(', '),
      
      // HTTP Strict Transport Security (HSTS)
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      
      // Expect-CT
      'Expect-CT': 'max-age=86400, enforce',
      
      // Cross-Origin Policies
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin'
    };
  }
}

// Security Headers Middleware
export class SecurityHeaders {
  static applyHeaders(response: NextResponse): NextResponse {
    const headers = ContentSecurityPolicy.getSecurityHeaders();
    
    Object.entries(headers).forEach(([name, value]) => {
      response.headers.set(name, value);
    });
    
    // Remove server information
    response.headers.delete('Server');
    response.headers.delete('X-Powered-By');
    
    return response;
  }

  static createSecureResponse(data: unknown, status = 200): NextResponse {
    const response = NextResponse.json(data, { status });
    return this.applyHeaders(response);
  }
}

// API Security Utilities
export class APISecurityUtils {
  // Secure error responses (don't leak internal info)
  static createErrorResponse(
    message: string,
    status: number,
    details?: string[]
  ): NextResponse {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const errorResponse = {
      error: message,
      status,
      timestamp: new Date().toISOString(),
      ...(isDevelopment && details && { details })
    };
    
    return SecurityHeaders.createSecureResponse(errorResponse, status);
  }

  // Rate limiting response
  static createRateLimitResponse(
    limit: number,
    remaining: number,
    resetTime: number,
    retryAfter?: number
  ): NextResponse {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        limit,
        remaining,
        resetTime: new Date(resetTime).toISOString(),
        ...(retryAfter && { retryAfter })
      },
      { status: 429 }
    );

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
    
    if (retryAfter) {
      response.headers.set('Retry-After', retryAfter.toString());
    }

    return SecurityHeaders.applyHeaders(response);
  }

  // Secure success response with minimal data exposure
  static createSuccessResponse(
    data: unknown,
    allowedFields?: string[]
  ): NextResponse {
    let responseData = data;
    
    // Filter sensitive fields if specified
    if (allowedFields && typeof data === 'object' && data !== null) {
      responseData = Object.fromEntries(
        Object.entries(data as Record<string, unknown>)
          .filter(([key]) => allowedFields.includes(key))
      );
    }
    
    return SecurityHeaders.createSecureResponse({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    });
  }
}

// Request Sanitization
export class RequestSanitizer {
  // Sanitize request body
  static sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(body)) {
      // Skip prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      
      // Recursively sanitize objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeBody(value as Record<string, unknown>);
      } else if (typeof value === 'string') {
        // Basic string sanitization
        sanitized[key] = value
          .trim()
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
          .substring(0, 10000); // Limit string length
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  // Sanitize query parameters
  static sanitizeQuery(url: URL): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of url.searchParams.entries()) {
      // Skip dangerous parameters
      if (key === '__proto__' || key === 'constructor') {
        continue;
      }
      
      // Sanitize value
      sanitized[key] = value
        .trim()
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .substring(0, 1000); // Limit parameter length
    }
    
    return sanitized;
  }
}

const SecurityUtilsModule = {
  CSRFProtection,
  ContentSecurityPolicy,
  SecurityHeaders,
  APISecurityUtils,
  RequestSanitizer
};

export default SecurityUtilsModule;