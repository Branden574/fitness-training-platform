import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withAuth } from "next-auth/middleware"

// Extend global object for rate limiting
declare global {
  var rateLimitMap: Map<string, number[]> | undefined
}

// Security middleware function
function securityMiddleware(request: NextRequest) {
  // CRITICAL: Allow NextAuth.js API routes to pass through without any interference
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  
  // Add essential security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
  // Basic rate limiting protection
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown'
  const now = Date.now()
  
  // Initialize rate limit map if needed
  if (!global.rateLimitMap) {
    global.rateLimitMap = new Map()
  }
  
  const userRequests = global.rateLimitMap.get(ip) || []
  const recentRequests = userRequests.filter((time: number) => now - time < 60000) // 1 minute window
  
  // Allow 150 requests per minute (generous but still protective)
  if (recentRequests.length > 150) {
    return new NextResponse('Rate limit exceeded', { 
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    })
  }
  
  recentRequests.push(now)
  global.rateLimitMap.set(ip, recentRequests)
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    const cutoff = now - 300000 // 5 minutes
    for (const [key, requests] of global.rateLimitMap.entries()) {
      const filtered = requests.filter(time => time > cutoff)
      if (filtered.length === 0) {
        global.rateLimitMap.delete(key)
      } else {
        global.rateLimitMap.set(key, filtered)
      }
    }
  }
  
  return response
}

// Export secure middleware that protects against attacks but allows NextAuth
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
        
        // Protect authenticated routes
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