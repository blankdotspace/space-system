import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { normalizeDomain } from '@/config/loaders/registry';

/**
 * Middleware for domain detection
 * 
 * Only normalizes and passes the domain to Server Components.
 * Community resolution happens server-side to avoid unnecessary
 * database queries for static assets and API routes.
 */
export function middleware(request: NextRequest) {
  // Get domain from request headers
  const host = request.headers.get('host') || 
               request.headers.get('x-forwarded-host') || 
               '';

  const domain = normalizeDomain(host);
  
  // Log in middleware - should show in Vercel logs
  console.error(`[Middleware] Host: "${host}" → Normalized domain: "${domain}"`);
  
  // Create response
  const response = NextResponse.next();
  
  // Set domain header for Server Components to read
  if (domain) {
    response.headers.set('x-detected-domain', domain);
    console.error(`[Middleware] Set x-detected-domain header: "${domain}"`);
  } else {
    console.error(`[Middleware] No domain to set (host was: "${host}")`);
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};
