import { ConfigLoadContext } from './types';
import { resolveCommunityFromDomain } from './registry';

/**
 * Resolve community ID from context
 * 
 * Priority order:
 * 1. Explicit context.communityId
 * 2. Development override (NEXT_PUBLIC_TEST_COMMUNITY) - for local testing only
 * 3. Domain resolution (production or localhost subdomains)
 * 
 * Note: If no community ID can be resolved, the system will error when attempting
 * to load config. Use NEXT_PUBLIC_TEST_COMMUNITY in development or ensure domain
 * resolution works (e.g., use localhost subdomains or production domains).
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

  return communityId;
}

/**
 * Get domain and community ID from middleware-set headers (server-side) or window (client-side)
 * 
 * Server-side: Reads x-community-id and x-detected-domain headers set by middleware
 * Client-side: Uses window.location.hostname
 * 
 * Returns undefined if domain cannot be determined (build time, etc.)
 */
export async function getDomainFromContext(): Promise<string | undefined>;
export function getDomainFromContext(): string | undefined | Promise<string | undefined> {
  // Server-side: read from middleware-set headers
  if (typeof window === 'undefined') {
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
  
  // Client-side: use window.location.hostname
  return window.location.hostname;
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

