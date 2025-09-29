import { NextResponse } from 'next/server';

/**
 * Edge Runtime Compatible Security Utilities
 * Uses Web Crypto API instead of Node.js crypto
 */

export class EdgeSecurityUtils {
  // Simple rate limiting using in-memory storage (for Edge Runtime)
  private static requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  static async hashString(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  static getClientId(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    const userAgent = req.headers.get('user-agent') || '';
    return `${ip}-${userAgent.slice(0, 50)}`;
  }
  
  static checkRateLimit(clientId: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const clientData = this.requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      this.requestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (clientData.count >= maxRequests) {
      return false;
    }
    
    clientData.count++;
    return true;
  }
  
  static sanitizeInput(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\'|\"|;|--|\||\*)/,
      /(\bOR\b.*=.*\bOR\b)/i,
      /(\bAND\b.*=.*\bAND\b)/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }
  
  static validateRequestSize(req: Request, maxSize: number = 10 * 1024 * 1024): boolean {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSize) {
      return false;
    }
    return true;
  }
  
  static applySecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    return response;
  }
  
  static async generateCSRFToken(sessionId: string): Promise<string> {
    const timestamp = Date.now().toString();
    const data = `${sessionId}-${timestamp}`;
    return await this.hashString(data);
  }
  
  static async validateCSRFToken(token: string, _sessionId: string): Promise<boolean> {
    // Simple validation - in production you'd want more sophisticated validation
    if (!token || token.length < 10) return false;
    
    // For now, just check if it's a valid hash format
    return /^[a-f0-9]{64}$/.test(token);
  }
}

export class EdgeRequestValidator {
  static async validateJSON(req: Request): Promise<{ valid: boolean; data?: unknown; error?: string }> {
    try {
      const text = await req.text();
      
      if (!text) return { valid: true, data: null };
      
      // Check for obviously malicious content
      if (EdgeSecurityUtils.detectSQLInjection(text)) {
        return { valid: false, error: 'Potentially malicious content detected' };
      }
      
      const data = JSON.parse(text);
      return { valid: true, data };
    } catch {
      return { valid: false, error: 'Invalid JSON format' };
    }
  }
  
  static validateHeaders(req: Request): boolean {
    const userAgent = req.headers.get('user-agent');
    
    // Block requests with suspicious headers
    if (userAgent && userAgent.includes('sqlmap')) return false;
    if (userAgent && userAgent.includes('nikto')) return false;
    
    return true;
  }
}