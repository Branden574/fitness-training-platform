import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withAuth } from "next-auth/middleware"

// Simple rate limiting without global (Edge Runtime compatible)
const rateLimitMap = new Map<string, number[]>()

// Security middleware function
function securityMiddleware(request: NextRequest) {
  // CRITICAL: Always allow NextAuth.js API routes to pass through untouched
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Basic rate limiting (simplified for Edge Runtime)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const now = Date.now()
  
  const userRequests = rateLimitMap.get(ip) || []
  const recentRequests = userRequests.filter((time: number) => now - time < 60000)
  
  // Allow 100 requests per minute (reasonable limit)
  if (recentRequests.length > 100) {
    return new NextResponse('Rate limit exceeded', { 
      status: 429,
      headers: { 'Retry-After': '60' }
    })
  }
  
  recentRequests.push(now)
  rateLimitMap.set(ip, recentRequests)
  
  // Create response with security headers
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  return response
}

// Export secure middleware with authentication
export default withAuth(
  function middleware(req) {
    return securityMiddleware(req)
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        
        // CRITICAL: Always allow NextAuth API routes
        if (pathname.startsWith('/api/auth/')) {
          return true
        }
        
        // Allow public pages and assets
        const publicPaths = [
          '/',
          '/auth/signin',
          '/auth/signup',
          '/contact',
          '/about'
        ]
        
        if (publicPaths.includes(pathname) ||
            pathname.startsWith('/_next/') ||
            pathname.startsWith('/favicon') ||
            pathname.includes('.')  // Static assets
        ) {
          return true
        }
        
        // Protect authenticated routes - require valid token
        return !!token
      },
    },
  }
)

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