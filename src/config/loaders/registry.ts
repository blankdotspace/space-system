import { createSupabaseServerClient } from '@/common/data/database/supabase/clients/server';
import { Database } from '@/supabase/database';

/**
 * Special domain mappings
 * 
 * Maps specific domains to community IDs, overriding normal domain resolution.
 * Useful for staging environments, special domains, etc.
 * 
 * Examples:
 * - staging.nounspace.com -> nouns
 * - nounspace.vercel.app -> nouns (Vercel preview deployments)
 * - staging.localhost -> nouns (for local testing)
 */
const DOMAIN_TO_COMMUNITY_MAP: Record<string, string> = {
  'staging.nounspace.com': 'nouns',
  'nounspace.vercel.app': 'nouns',
};

type CommunityConfigRow = Database['public']['Tables']['community_configs']['Row'];

/**
 * Cache entry for community configuration lookups.
 *
 * Keeps a short-lived in-memory cache to reduce Supabase round-trips when the
 * same domain is requested repeatedly (e.g., during navigation or asset loads).
 */
type CommunityConfigCacheEntry = {
  expiresAt: number;
  value: CommunityConfigRow | null;
};

const COMMUNITY_CONFIG_CACHE = new Map<string, CommunityConfigCacheEntry>();
const COMMUNITY_CONFIG_CACHE_TTL_MS = 60_000;

/**
 * Normalize an incoming domain/host value for consistent resolution.
 *
 * - Lowercases the domain
 * - Strips any port numbers
 * - Removes a leading `www.` prefix when present
 */
export function normalizeDomain(domain: string): string {
  if (!domain) return '';

  const host = domain.split(':')[0]?.trim().toLowerCase() ?? '';
  if (!host) return '';

  return host.startsWith('www.') ? host.slice(4) : host;
}

/**
 * Resolve community ID from domain
 * 
 * The domain is used to infer the community ID.
 * Supports both production domains and localhost subdomains for local testing.
 * 
 * Priority:
 * 1. Special domain mappings (DOMAIN_TO_COMMUNITY_MAP)
 * 2. Normal domain resolution (subdomain extraction, etc.)
 * 
 * @param domain The domain/hostname
 * @returns The community ID inferred from domain, or null if cannot be determined
 */
export function resolveCommunityFromDomain(
  domain: string
): string | null {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) return null;
  
  // Check special domain mappings first (highest priority)
  if (normalizedDomain in DOMAIN_TO_COMMUNITY_MAP) {
    return DOMAIN_TO_COMMUNITY_MAP[normalizedDomain];
  }
  
  // Handle Vercel preview deployments (e.g., nounspace.vercel.app, branch-nounspace.vercel.app)
  // All Vercel preview deployments should point to nouns community
  if (normalizedDomain.endsWith('.vercel.app') && normalizedDomain.includes('nounspace')) {
    return 'nouns';
  }
  
  // Support localhost subdomains for local testing
  // e.g., example.localhost:3000 -> example
  if (normalizedDomain.includes('localhost')) {
    const parts = normalizedDomain.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost') {
      // Has subdomain before localhost
      return parts[0];
    }
    // Just localhost - can't determine community
    return null;
  }
  
  // Production domain: extract subdomain or use domain as community ID
  // Example: subdomain.nounspace.com -> subdomain
  if (normalizedDomain.includes('.')) {
    const parts = normalizedDomain.split('.');
    if (parts.length > 2) {
      // Has subdomain (e.g., example.nounspace.com)
      return parts[0];
    }
    // Use domain name without TLD as community ID (e.g., example.com -> example)
    return parts[0];
  }
  
  // Single word domain - use as community ID
  return normalizedDomain;
}

/**
 * Attempt to read a cached community config entry if it has not expired.
 */
function readCommunityConfigCache(communityId: string): CommunityConfigRow | null | undefined {
  const entry = COMMUNITY_CONFIG_CACHE.get(communityId);
  if (!entry) return undefined;

  if (entry.expiresAt > Date.now()) {
    return entry.value;
  }

  COMMUNITY_CONFIG_CACHE.delete(communityId);
  return undefined;
}

/**
 * Store a community config value in the cache with a short TTL.
 */
function writeCommunityConfigCache(communityId: string, value: CommunityConfigRow | null) {
  COMMUNITY_CONFIG_CACHE.set(communityId, {
    expiresAt: Date.now() + COMMUNITY_CONFIG_CACHE_TTL_MS,
    value,
  });
}

/**
 * Fetch the community configuration row for a given domain.
 *
 * Resolution priority:
 * 1) Normalize the domain (lowercase, strip port, drop leading `www.`)
 * 2) Apply DOMAIN_TO_COMMUNITY_MAP overrides
 * 3) Fall back to using the normalized host as the community_id (domain is stored in community_id)
 *
 * A short-lived in-memory cache is used to avoid repeated Supabase lookups for the same
 * community during navigation bursts.
 */
export async function getCommunityConfigForDomain(domain: string): Promise<CommunityConfigRow | null> {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) return null;

  const communityId = resolveCommunityFromDomain(normalizedDomain);
  if (!communityId) return null;

  const cached = readCommunityConfigCache(communityId);
  if (cached !== undefined) {
    return cached;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('community_configs')
    .select('*')
    .eq('community_id', communityId)
    .single();

  if (error) {
    console.error('Failed to fetch community config', { communityId, error });
    writeCommunityConfigCache(communityId, null);
    return null;
  }

  writeCommunityConfigCache(communityId, data ?? null);
  return data ?? null;
}

/**
 * Resolve and return the community ID and configuration for a domain.
 *
 * If no configuration is found, returns null and logs a warning for visibility.
 */
export async function resolveCommunityConfig(
  domain: string
): Promise<{ communityId: string; config: CommunityConfigRow } | null> {
  const normalizedDomain = normalizeDomain(domain);
  const communityId = normalizedDomain ? resolveCommunityFromDomain(normalizedDomain) : null;

  if (!communityId) {
    return null;
  }

  const config = await getCommunityConfigForDomain(normalizedDomain);

  if (!config) {
    console.warn('Community config not found for domain', { domain: normalizedDomain, communityId });
    return null;
  }

  return { communityId, config };
}
