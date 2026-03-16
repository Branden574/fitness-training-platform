import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Ultra-minimal middleware that only adds security headers
// and lets NextAuth handle ALL authentication routing
export function middleware(request: NextRequest) {
  // Skip ALL middleware logic for NextAuth routes - let them be completely untouched
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // For all other routes, add security headers and continue
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
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