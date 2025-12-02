import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveCommunityFromDomain } from '@/config/loaders/registry';

/**
 * Middleware for domain-based community detection
 * 
 * Detects the domain from the request and sets x-community-id header
 * for Server Components to read. This centralizes domain detection logic
 * and avoids URL processing in Server Components.
 */
export function middleware(request: NextRequest) {
  // Get domain from request headers (synchronous in middleware)
  const host = request.headers.get('host') || 
               request.headers.get('x-forwarded-host') || 
               '';
  
  // Remove port number if present
  const domain = host.split(':')[0];
  
  // Resolve community ID from domain
  const communityId = domain 
    ? resolveCommunityFromDomain(domain)
    : null;
  
  // Create response
  const response = NextResponse.next();
  
  // Set headers for Server Components to read
  if (communityId) {
    response.headers.set('x-community-id', communityId);
  }
  
  // Also set domain for reference/debugging
  if (domain) {
    response.headers.set('x-detected-domain', domain);
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

