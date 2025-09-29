import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

// Minimal middleware - security features temporarily disabled for debugging
export default withAuth(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function middleware(_req) {
    // Just pass through all requests to fix auth issues
    return NextResponse.next();
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