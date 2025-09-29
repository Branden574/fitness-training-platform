import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Ultra-minimal middleware that only adds security headers
// and lets NextAuth handle ALL authentication routing
export function middleware(request: NextRequest) {
  // Skip ALL middleware logic for NextAuth routes - let them be completely untouched
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // For all other routes, just add basic security headers and continue
  const response = NextResponse.next()
  
  // Add minimal security headers only
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
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