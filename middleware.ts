import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { normalizeDomain, resolveCommunityConfig } from '@/config/loaders/registry';

/**
 * Middleware for domain-based community detection
 *
 * Detects the domain from the request, resolves the matching community config
 * (including Supabase lookup + caching), and sets headers for Server Components
 * to read without re-querying:
 * - x-community-id: resolved community id for the incoming domain
 * - x-community-config: stringified community config row (when found)
 */
export async function middleware(request: NextRequest) {
  // Get domain from request headers (synchronous in middleware)
  const host = request.headers.get('host') || 
               request.headers.get('x-forwarded-host') || 
               '';

  const domain = normalizeDomain(host);

  const communityResolution = domain
    ? await resolveCommunityConfig(domain)
    : null;
  
  // Create response
  const response = NextResponse.next();
  
  // Set headers for Server Components to read
  if (communityResolution) {
    response.headers.set('x-community-id', communityResolution.communityId);
    response.headers.set('x-community-config', JSON.stringify(communityResolution.config));
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
