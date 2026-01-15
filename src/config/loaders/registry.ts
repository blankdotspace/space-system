import { createSupabaseServerClient } from '@/common/data/database/supabase/clients/server';
import { Database } from '@/supabase/database';
import { SystemConfig } from '../systemConfig';
import { themes } from '../shared/themes';

export const DEFAULT_COMMUNITY_ID = 'nounspace.com';

/**
 * Special domain mappings
 * 
 * Maps specific domains to community IDs, overriding normal domain resolution.
 * Useful for staging environments, special domains, etc.
 * 
 * Examples:
 * - staging.nounspace.com -> nounspace.com
 */
const DOMAIN_TO_COMMUNITY_MAP: Record<string, string> = {
  'staging.nounspace.com': DEFAULT_COMMUNITY_ID,
};

type CommunityConfigRow = Database['public']['Tables']['community_configs']['Row'];

/**
 * Cache entry for SystemConfig lookups.
 *
 * Keeps a short-lived in-memory cache to reduce Supabase round-trips when the
 * same community is requested repeatedly (e.g., during navigation or asset loads).
 * Caches the final SystemConfig (transformed and ready to use).
 */
type SystemConfigCacheEntry = {
  expiresAt: number;
  value: SystemConfig | null;
};

const SYSTEM_CONFIG_CACHE = new Map<string, SystemConfigCacheEntry>();
const SYSTEM_CONFIG_CACHE_TTL_MS = 60_000;

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
export async function getCommunityConfigForDomain(
  domain: string
): Promise<{ communityId: string; config: SystemConfig } | null> {
  // Resolve community ID from domain (throws if cannot resolve)
  let communityId: string;
  try {
    communityId = resolveCommunityIdFromDomain(domain);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Config] Failed to resolve community ID from domain "${domain}": ${errorMessage}`);
    return null;
  }

  // Check cache first
  const cached = readSystemConfigCache(communityId);
  if (cached) {
    return { communityId, config: cached };
  }

  // Load config from database
  const primaryConfig = await loadCommunityConfigFromDatabase(communityId);
  if (primaryConfig) {
    return { communityId, config: primaryConfig };
  }

  // Config not found - return null (caller will handle fallback)
  return null;
}

/**
 * Core function to load a community config from the database.
 * Returns null if not found, throws on validation errors.
 * This is the single source of truth for database queries.
 */
async function loadCommunityConfigFromDatabase(communityId: string): Promise<SystemConfig | null> {
  // Check cache first
  const cached = readSystemConfigCache(communityId);
  if (cached !== undefined) {
    return cached;
  }

  // Query Supabase
  const supabase = createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('community_configs')
    .select('*')
    .eq('community_id', communityId)
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // PGRST116 = no rows returned (legitimate not found)
    const isNotFoundError = error.code === 'PGRST116';
    
    if (isNotFoundError) {
      // Legitimate "not found" - return null
      return null;
    } else {
      // Transient/unknown error - return null to allow retries
      console.error(
        `❌ Failed to fetch community config (transient error) for communityId: "${communityId}". ` +
        `Error code: ${error.code}, Message: ${error.message}. ` +
        `This may be a network issue or database problem. Will retry on next request.`,
        { communityId, error: error.message, code: error.code }
      );
      return null;
    }
  }

  if (!data) {
    // No data returned but no error - legitimate not found
    return null;
  }

  // Validate config structure - check all required fields
  const requiredFields = ['brand_config', 'assets_config', 'community_config', 'fidgets_config'] as const;
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    // Invalid config structure - throw error (this is a data integrity issue)
    throw new Error(
      `❌ Invalid config structure for communityId: "${communityId}". ` +
      `Missing required fields: ${missingFields.join(', ')}. ` +
      `All community configs must have brand_config, assets_config, community_config, and fidgets_config. ` +
      `Ensure database is seeded correctly or update the record.`
    );
  }

  // Transform to SystemConfig
  const systemConfig = transformRowToSystemConfig(data, communityId);
  
  // Cache the result
  writeSystemConfigCache(communityId, systemConfig);
  
  return systemConfig;
}

/**
 * Load SystemConfig by community ID (when ID is already known).
 * Throws an error if config is not found (use when config must exist).
 */
export async function loadSystemConfigById(
  communityId: string
): Promise<SystemConfig> {
  // Check cache first
  const cached = readSystemConfigCache(communityId);
  if (cached) {
    return cached;
  }

  const config = await loadCommunityConfigFromDatabase(communityId);
  
  if (!config) {
    throw new Error(
      `❌ Failed to load config from database for community: "${communityId}". ` +
      `Check: Does a record exist in community_configs with community_id="${communityId}" and is_published=true?`
    );
  }
  
  return config;
}
