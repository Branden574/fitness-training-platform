import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import { EdgeSecurityUtils, EdgeRequestValidator } from './lib/security/edge-security';

// Enhanced Edge Runtime Compatible Security Middleware
export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;
    
    // Apply security headers to all responses
    const secureNext = (response?: NextResponse) => {
      const res = response || NextResponse.next();
      return EdgeSecurityUtils.applySecurityHeaders(res);
    };

    // Skip security checks for static files and auth endpoints
    if (pathname.startsWith('/_next/') || 
        pathname.startsWith('/api/auth/') ||
        pathname.includes('.')) {
      return secureNext();
    }

    // 1. RATE LIMITING (Edge Runtime Compatible)
    const clientId = EdgeSecurityUtils.getClientId(req);
    
    // Different limits for different types of requests
    let maxRequests = 100; // Default: 100 requests per minute
    if (pathname.includes('auth') || pathname.includes('password')) {
      maxRequests = 10; // Auth: 10 requests per minute
    } else if (pathname.startsWith('/api/admin')) {
      maxRequests = 50; // Admin: 50 requests per minute
    }
    
    if (!EdgeSecurityUtils.checkRateLimit(clientId, maxRequests)) {
      return secureNext(NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      ));
    }

    // 2. REQUEST SIZE VALIDATION
    if (!EdgeSecurityUtils.validateRequestSize(req)) {
      return secureNext(NextResponse.json(
        { error: 'Request entity too large' },
        { status: 413 }
      ));
    }

    // 3. HEADER VALIDATION
    if (!EdgeRequestValidator.validateHeaders(req)) {
      return secureNext(NextResponse.json(
        { error: 'Invalid request headers' },
        { status: 400 }
      ));
    }

    // 4. BASIC INPUT VALIDATION FOR POST/PUT REQUESTS
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && 
        req.headers.get('content-type')?.includes('application/json')) {
      
      try {
        // Create a clone for validation since we can only read body once
        const clonedRequest = req.clone();
        const validation = await EdgeRequestValidator.validateJSON(clonedRequest);
        
        if (!validation.valid) {
          return secureNext(NextResponse.json(
            { error: validation.error || 'Invalid request data' },
            { status: 400 }
          ));
        }
      } catch {
        return secureNext(NextResponse.json(
          { error: 'Request processing error' },
          { status: 400 }
        ));
      }
    }

    // 5. ENHANCED BOT PROTECTION
    const userAgent = req.headers.get('user-agent') || '';
    
    // Block known malicious bots
    const maliciousBots = ['sqlmap', 'nikto', 'masscan', 'nmap'];
    if (maliciousBots.some(bot => userAgent.toLowerCase().includes(bot))) {
      return secureNext(NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      ));
    }
    
    // Allow legitimate bots but limit others
    if (userAgent.includes('bot') && 
        !userAgent.includes('Googlebot') && 
        !userAgent.includes('bingbot')) {
      return secureNext(NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      ));
    }

    // Authentication & Authorization (existing logic)
    if (pathname.startsWith('/auth/') || pathname.startsWith('/api/')) {
      return secureNext();
    }

    // Force password change if required
    if (token?.passwordChangeRequired && pathname !== '/auth/change-password') {
      return secureNext(NextResponse.redirect(new URL('/auth/change-password', req.url)));
    }

    // Role-based access control
    if (token) {
      // Trainers accessing client areas
      if (token.role === 'TRAINER' && pathname.startsWith('/client/')) {
        return secureNext(NextResponse.redirect(new URL('/trainer/dashboard', req.url)));
      }

      // Clients accessing trainer areas
      if (token.role === 'CLIENT' && pathname.startsWith('/trainer/')) {
        return secureNext(NextResponse.redirect(new URL('/client/dashboard', req.url)));
      }

      // Admin-only areas
      if (pathname.startsWith('/admin/') && token.role !== 'ADMIN') {
        return secureNext(NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        ));
      }
    }

    return secureNext();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Public routes that don't require authentication
        const publicRoutes = [
          '/auth/signin', 
          '/auth/signup', 
          '/auth/change-password', 
          '/', 
          '/about', 
          '/contact', 
          '/programs',
          '/register-with-code',
          '/invite'
        ];
        
        // API routes that handle their own auth
        if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/register')) {
          return true;
        }
        
        if (publicRoutes.includes(pathname)) {
          return true;
        }

        // Protected routes require a token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};