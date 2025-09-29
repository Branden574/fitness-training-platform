import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// TEMPORARY: Minimal middleware for debugging authentication
export function middleware(request: NextRequest) {
  // Allow all NextAuth routes to pass through
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }
  
  // Allow all other routes for now
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}