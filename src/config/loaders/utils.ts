import { ConfigLoadContext } from './types';
import { DEFAULT_COMMUNITY_ID, resolveCommunityConfig } from './registry';

/**
 * Resolve community ID from context (async version with caching)
 * 
 * Priority order:
 * 1. Explicit context.communityId
 * 2. Development override (NEXT_PUBLIC_TEST_COMMUNITY) - for local testing only
 * 3. Domain resolution (production or localhost subdomains) - uses cached Supabase lookup
 * 4. Build-time fallback (NEXT_PUBLIC_TEST_COMMUNITY or default community) - for static generation
 * 
 * Note: During build time (static generation), there's no request context, so we use
 * NEXT_PUBLIC_TEST_COMMUNITY if set, otherwise default to the nounspace community as a fallback.
 */
export async function resolveCommunityId(context: ConfigLoadContext): Promise<string | undefined> {
  let communityId = context.communityId;
  
  // Development override: allows testing communities locally
  // Set NEXT_PUBLIC_TEST_COMMUNITY=example to test 'example' community
  if (!communityId && process.env.NODE_ENV === 'development') {
    communityId = process.env.NEXT_PUBLIC_TEST_COMMUNITY || undefined;
  }
  
  // Resolve from domain if still no community ID (uses cached Supabase lookup)
  if (!communityId && context.domain) {
    const resolution = await resolveCommunityConfig(context.domain);
    communityId = resolution?.communityId || undefined;
  }

  // Build-time fallback: when there's no request context (static generation)
  // Use NEXT_PUBLIC_TEST_COMMUNITY if set, otherwise default to nounspace.com
  if (!communityId) {
    communityId = process.env.NEXT_PUBLIC_TEST_COMMUNITY || DEFAULT_COMMUNITY_ID;
  }

  return communityId;
}


