import { ConfigLoadContext } from './types';
import { resolveCommunityFromDomain } from './registry';

/**
 * Resolve community ID from context
 * 
 * Priority order:
 * 1. Explicit context.communityId
 * 2. Development override (NEXT_PUBLIC_TEST_COMMUNITY) - for local testing only
 * 3. Domain resolution (production or localhost subdomains)
 * 4. Build-time fallback (NEXT_PUBLIC_TEST_COMMUNITY or 'nouns') - for static generation
 * 
 * Note: During build time (static generation), there's no request context, so we use
 * NEXT_PUBLIC_TEST_COMMUNITY if set, otherwise default to 'nouns' as a fallback.
 */
export function resolveCommunityId(context: ConfigLoadContext): string | undefined {
  let communityId = context.communityId;
  
  // Development override: allows testing communities locally
  // Set NEXT_PUBLIC_TEST_COMMUNITY=example to test 'example' community
  if (!communityId && process.env.NODE_ENV === 'development') {
    communityId = process.env.NEXT_PUBLIC_TEST_COMMUNITY || undefined;
  }
  
  // Resolve from domain if still no community ID
  if (!communityId && context.domain) {
    communityId = resolveCommunityFromDomain(context.domain) || undefined;
  }

  // Build-time fallback: when there's no request context (static generation)
  // Use NEXT_PUBLIC_TEST_COMMUNITY if set, otherwise default to 'nouns'
  if (!communityId) {
    communityId = process.env.NEXT_PUBLIC_TEST_COMMUNITY || 'nouns';
  }

  return communityId;
}

/**
 * Get domain from middleware-set headers (SERVER-ONLY)
 * 
 * Server-side: Reads x-detected-domain header set by middleware, or falls back
 * to reading host/x-forwarded-host headers directly.
 * 
 * Returns undefined if domain cannot be determined (build time, etc.)
 * 
 * This function is server-only and should not be called from client components.
 */
export async function getDomainFromContext(): Promise<string | undefined> {
  try {
    // Dynamic import to avoid issues when headers() isn't available (build time)
    const { headers } = await import('next/headers');
    const headersList = await headers();
    
    // Read domain from middleware-set header (preferred)
    const domain = headersList.get('x-detected-domain');
    if (domain) {
      return domain;
    }
    
    // Fallback: read directly from headers if middleware didn't set it
    const forwardedHost = headersList.get('x-forwarded-host');
    if (forwardedHost) {
      return forwardedHost.split(':')[0]; // Remove port
    }
    
    const host = headersList.get('host');
    if (host) {
      return host.split(':')[0]; // Remove port
    }
  } catch (error) {
    // Not in request context (static generation, etc.)
    // Return undefined to fall back to env vars
    return undefined;
  }
  
  return undefined;
}

/**
 * Get community ID from middleware-set header (server-side only)
 * Returns undefined if not available
 */
export async function getCommunityIdFromHeaders(): Promise<string | undefined> {
  if (typeof window === 'undefined') {
    try {
      const { headers } = await import('next/headers');
      const headersList = await headers();
      return headersList.get('x-community-id') || undefined;
    } catch (error) {
      return undefined;
    }
  }
  return undefined;
}

