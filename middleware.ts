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
  // Nonce-based CSP is the correct long-term answer but requires
  // threading `headers().get('x-nonce')` through every `<Script>` call
  // site + the root layout. Attempted in commit cb2e297 — broke the
  // site because Next.js's internal hydration scripts don't pick up
  // the nonce automatically. Reverting to 'unsafe-inline' until the
  // nonce propagation is properly implemented as a standalone project.
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
    'https://www.googleapis.com',
  ].join(' ');
  response.headers.set(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src ${scriptSrc} https://www.youtube.com https://www.youtube-nocookie.com https://js.stripe.com https://static.cloudflareinsights.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `img-src 'self' data: https:`,
      `font-src 'self' data: https://fonts.gstatic.com`,
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
