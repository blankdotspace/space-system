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

/**
 * Resolve community ID from domain.
 * Simple priority: special mapping → domain as-is
 * Throws error if domain cannot be resolved (no default fallback).
 */
function resolveCommunityIdFromDomain(domain: string): string {
  const normalizedDomain = normalizeDomain(domain);
  
  if (!normalizedDomain) {
    throw new Error(
      `❌ Cannot resolve community ID: domain "${domain}" normalized to empty string. ` +
      `Domain must be a valid, non-empty value.`
    );
  }
  
  // Priority 1: Special domain mappings (from DOMAIN_TO_COMMUNITY_MAP)
  if (normalizedDomain in DOMAIN_TO_COMMUNITY_MAP) {
    return DOMAIN_TO_COMMUNITY_MAP[normalizedDomain];
  }

  if (domain.endsWith('.vercel.app')) {
    const subdomain = domain.replace('.vercel.app', '');
    const parts = subdomain.split('-').filter(Boolean);
    const hashIndex = parts.findIndex(
      (part, index) => index > 0 && index < parts.length - 1 && /^[a-z0-9]{7,}$/.test(part)
    );
    if (hashIndex !== -1 && hashIndex < parts.length - 1) {
      const candidate = parts.slice(hashIndex + 1).join('-');
      if (candidate) {
        return candidate;
      }
    }
  }
  
  // Priority 3: Domain as community ID (e.g., example.nounspace.com → example.nounspace.com)
  return normalizedDomain;
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
 * Transform a database row to SystemConfig format.
 * This replaces the RPC function transformation, done in application code.
 */
function transformRowToSystemConfig(row: CommunityConfigRow, communityId: string): SystemConfig {
  return {
    brand: row.brand_config as unknown as SystemConfig['brand'],
    assets: row.assets_config as unknown as SystemConfig['assets'],
    community: row.community_config as unknown as SystemConfig['community'],
    fidgets: row.fidgets_config as unknown as SystemConfig['fidgets'],
    navigation: (row.navigation_config ?? null) as unknown as SystemConfig['navigation'],
    ui: (row.ui_config ?? null) as unknown as SystemConfig['ui'],
    adminIdentityPublicKeys: row.admin_identity_public_keys ?? [],
    theme: themes, // Themes come from shared file, not database
    communityId, // The database community_id used to load this config
  };
}

/**
 * Clean up expired cache entries to prevent memory leaks.
 * Should be called periodically or before write operations.
 */
function cleanupExpiredCacheEntries(): void {
  const now = Date.now();
  for (const [key, entry] of SYSTEM_CONFIG_CACHE.entries()) {
    if (entry.expiresAt <= now) {
      SYSTEM_CONFIG_CACHE.delete(key);
    }
  }
}

/**
 * Attempt to read a cached SystemConfig entry if it has not expired.
 */
function readSystemConfigCache(communityId: string): SystemConfig | null | undefined {
  const entry = SYSTEM_CONFIG_CACHE.get(communityId);
  if (!entry) return undefined;

  if (entry.expiresAt > Date.now()) {
    return entry.value;
  }

  SYSTEM_CONFIG_CACHE.delete(communityId);
  return undefined;
}

/**
 * Store a SystemConfig value in the cache with a short TTL.
 * Cleans up expired entries before writing to prevent unbounded growth.
 */
function writeSystemConfigCache(communityId: string, value: SystemConfig | null) {
  // Clean up expired entries periodically to prevent memory leaks
  // Do this on write since writes are less frequent than reads
  if (SYSTEM_CONFIG_CACHE.size > 10) {
    cleanupExpiredCacheEntries();
  }
  
  SYSTEM_CONFIG_CACHE.set(communityId, {
    expiresAt: Date.now() + SYSTEM_CONFIG_CACHE_TTL_MS,
    value,
  });
}


/**
 * Fetch the SystemConfig for a given domain.
 *
 * Resolution priority:
 * 1) Special domain mappings (DOMAIN_TO_COMMUNITY_MAP)
 * 2) Domain as community_id (e.g., example.nounspace.com → community_id=example.nounspace.com)
 * 3) Default fallback (nounspace.com)
 *
 * A short-lived in-memory cache is used to avoid repeated Supabase lookups for the same
 * community during navigation bursts. Returns the final SystemConfig (transformed and ready to use).
 */
export function resolveCommunityFromDomain(
  domain: string
): string | null {
  if (!domain) return null;
  
  // Check special domain mappings first (highest priority)
  if (domain in DOMAIN_TO_COMMUNITY_MAP) {
    return DOMAIN_TO_COMMUNITY_MAP[domain];
  }
  
  // Handle Vercel preview deployments (e.g., nounspace.vercel.app, branch-nounspace.vercel.app)
  // All Vercel preview deployments should point to nouns community
  if (domain.endsWith('.vercel.app') && domain.includes('nounspace')) {
    return 'nouns';
  }

  if (domain.endsWith('.vercel.app')) {
    const subdomain = domain.replace('.vercel.app', '');
    const parts = subdomain.split('-').filter(Boolean);
    const hashIndex = parts.findIndex(
      (part, index) => index > 0 && index < parts.length - 1 && /^[a-z0-9]{7,}$/.test(part)
    );
    if (hashIndex !== -1 && hashIndex < parts.length - 1) {
      const candidate = parts.slice(hashIndex + 1).join('-');
      if (candidate) {
        return candidate;
      }
    }
  }
  
  // Support localhost subdomains for local testing
  // e.g., example.localhost:3000 -> example
  if (domain.includes('localhost')) {
    const parts = domain.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost') {
      // Has subdomain before localhost
      return parts[0];
    }
    // Just localhost - can't determine community
    return null;
  }
  
  // Production domain: extract subdomain or use domain as community ID
  // Example: subdomain.nounspace.com -> subdomain
  if (domain.includes('.')) {
    const parts = domain.split('.');
    if (parts.length > 2) {
      // Has subdomain (e.g., example.nounspace.com)
      return parts[0];
    }
    // Use domain name without TLD as community ID (e.g., example.com -> example)
    return parts[0];
  }
  
  // Single word domain - use as community ID
  return domain;
}


