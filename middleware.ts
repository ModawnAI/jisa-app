/**
 * Next.js Middleware
 * Handles authentication and route protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/admin'];

// Routes that should redirect authenticated users
const authRoutes = ['/auth/login', '/auth/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if route is auth page
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Skip API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (user && isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If user is not authenticated and trying to access protected routes, redirect to login
    if (!user && isProtectedRoute) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check admin access for /admin routes
    if (pathname.startsWith('/admin') && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // Only allow admin and ceo roles
      if (!profile || (profile.role !== 'admin' && profile.role !== 'ceo')) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('[Middleware] Error:', error);

    // On error, allow access but log it
    return NextResponse.next();
  }
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
