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

const DEFAULT_COMMUNITY_ID = 'nounspace.com';

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

function getCommunityIdCandidates(domain: string): string[] {
  const normalizedDomain = normalizeDomain(domain);

  const candidates: string[] = [];
  const addCandidate = (candidate?: string | null) => {
    if (!candidate) return;
    if (!candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  };

  if (!normalizedDomain) {
    addCandidate(DEFAULT_COMMUNITY_ID);
    return candidates;
  }

  if (normalizedDomain in DOMAIN_TO_COMMUNITY_MAP) {
    addCandidate(DOMAIN_TO_COMMUNITY_MAP[normalizedDomain]);
  }

  // Highest priority: exact domain match
  addCandidate(normalizedDomain);

  // Handle Vercel preview deployments (e.g., nounspace.vercel.app, branch-nounspace.vercel.app)
  if (normalizedDomain.endsWith('.vercel.app') && normalizedDomain.includes('nounspace')) {
    addCandidate('nouns');
  }

  // Support localhost subdomains for local testing (e.g., example.localhost)
  if (normalizedDomain.includes('localhost')) {
    const parts = normalizedDomain.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost') {
      addCandidate(parts[0]);
    }
  }

  // Fallback: derive community from the leading subdomain (e.g., example.nounspace.com -> example)
  if (normalizedDomain.includes('.')) {
    const parts = normalizedDomain.split('.');
    if (parts[0]) {
      addCandidate(parts[0]);
    }
  }

  // Default fallback: use the nounspace config when no other candidate matches
  addCandidate(DEFAULT_COMMUNITY_ID);

  return candidates;
}

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
  const candidates = getCommunityIdCandidates(domain);
  return candidates[0] ?? null;
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
 * 3) Try exact domain match in community_id (e.g., example.blank.space -> community_id=example.blank.space)
 * 4) Fall back to using the leading subdomain as community_id (e.g., example.blank.space -> example)
 * 5) Use the default nounspace community when no explicit match is found
 *
 * A short-lived in-memory cache is used to avoid repeated Supabase lookups for the same
 * community during navigation bursts.
 */
export async function getCommunityConfigForDomain(
  domain: string
): Promise<{ communityId: string; config: CommunityConfigRow } | null> {
  const candidates = getCommunityIdCandidates(domain);

  // Check cache first
  for (const candidate of candidates) {
    const cached = readCommunityConfigCache(candidate);
    if (cached !== undefined) {
      if (cached) {
        return { communityId: candidate, config: cached };
      }
      // Cached miss, continue to next candidate
    }
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('community_configs')
    .select('*')
    .in('community_id', candidates);

  if (error) {
    console.error('Failed to fetch community config', { candidates, error });
    candidates.forEach((candidate) => writeCommunityConfigCache(candidate, null));
    return null;
  }

  const dataById = new Map<string, CommunityConfigRow>();
  (data ?? []).forEach((row) => {
    if (row.community_id) {
      dataById.set(row.community_id, row);
    }
  });

  for (const candidate of candidates) {
    const matched = dataById.get(candidate);
    if (matched) {
      writeCommunityConfigCache(candidate, matched);
      return { communityId: candidate, config: matched };
    }
    writeCommunityConfigCache(candidate, null);
  }

  return null;
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
  if (!normalizedDomain) {
    return null;
  }

  const resolution = await getCommunityConfigForDomain(normalizedDomain);

  if (!resolution) {
    console.warn('Community config not found for domain', { domain: normalizedDomain });
    return null;
  }

  return resolution;
}
