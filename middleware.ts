import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function middleware(request: NextRequest) {
  // Skip ALL middleware logic for NextAuth routes - let them be completely untouched
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // CSRF / Origin validation for state-changing API requests
  if (
    request.nextUrl.pathname.startsWith('/api/') &&
    !SAFE_METHODS.has(request.method)
  ) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    // Allow requests with no origin (same-origin fetch, server-side calls)
    // but block requests where origin doesn't match host
    if (origin) {
      let originHost: string
      try {
        originHost = new URL(origin).host
      } catch {
        return NextResponse.json(
          { error: 'Invalid origin' },
          { status: 403 }
        )
      }

      if (originHost !== host) {
        return NextResponse.json(
          { error: 'Cross-origin request blocked' },
          { status: 403 }
        )
      }
    }
  }

  // For all other routes, add security headers and continue
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  const isDev = process.env.NODE_ENV === 'development';
  // NOTE: script-src still needs 'unsafe-inline' because Next.js injects data scripts
  // inline. Proper fix is a nonce-based CSP (generate per-request nonce in middleware,
  // attach to <Script nonce={...}>). Tracked as M-2 follow-up. Other directives are
  // tightened below to reduce blast radius even while script-src stays permissive.
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";
  // Narrow connect-src to specific hosts we actually talk to, instead of all of https:
  const connectSrc = [
    "'self'",
    'https://api.stripe.com',
    'https://checkout.stripe.com',
    'https://api.resend.com',
    'https://api.nal.usda.gov',
    'https://exercisedb.p.rapidapi.com',
    'https://www.googleapis.com',
  ].join(' ');
  response.headers.set(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src ${scriptSrc} https://www.youtube.com https://www.youtube-nocookie.com https://js.stripe.com`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: https:`,
      `font-src 'self' data:`,
      `connect-src ${connectSrc}`,
      `frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://js.stripe.com https://checkout.stripe.com`,
      `media-src 'self' https:`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
    ].join('; '),
  )

  return response
}

export const config = {
  matcher: [
    /*
     * Only apply middleware to non-NextAuth routes
     * Completely exclude all NextAuth routes from any middleware processing
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
