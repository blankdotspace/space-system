import { createSupabaseServerClient } from '@/common/data/database/supabase/clients/server';
import { Database } from '@/supabase/database';
import { SystemConfig } from '../systemConfig';
import { themes } from '../shared/themes';

export const DEFAULT_COMMUNITY_ID = 'nounspace.com';

/**
 * Special domain mappings
 * 
 * Maps specific domains to community IDs, overriding normal domain resolution.
 * Useful for staging environments, special domains, Vercel preview deployments, etc.
 * 
 * Examples:
 * - staging.nounspace.com -> nounspace.com
 * - *.vercel.app -> nounspace.com (handled separately for pattern matching)
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
 * Simple priority: special mapping → domain as-is → default fallback
 */
function resolveCommunityIdFromDomain(domain: string): string {
  const normalizedDomain = normalizeDomain(domain);
  
  if (!normalizedDomain) {
    return DEFAULT_COMMUNITY_ID;
  }
  
  // Priority 1: Handle Vercel preview deployments (e.g., nounspace.vercel.app, branch-nounspace.vercel.app)
  // All Vercel preview deployments should point to nounspace.com community
  // Match any .vercel.app domain (preview deployments have random branch names)
  if (domain.endsWith('.vercel.app')) {
    return DEFAULT_COMMUNITY_ID;
  }
  
  // Priority 2: Special domain mappings (from DOMAIN_TO_COMMUNITY_MAP)
  if (normalizedDomain in DOMAIN_TO_COMMUNITY_MAP) {
    return DOMAIN_TO_COMMUNITY_MAP[normalizedDomain];
  }
  
  // Priority 3: Domain as community ID (e.g., example.nounspace.com → example.nounspace.com)
  // Priority 4: Default fallback (handled by caller if domain lookup fails)
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
function transformRowToSystemConfig(row: CommunityConfigRow): SystemConfig {
  return {
    brand: row.brand_config as unknown as SystemConfig['brand'],
    assets: row.assets_config as unknown as SystemConfig['assets'],
    community: row.community_config as unknown as SystemConfig['community'],
    fidgets: row.fidgets_config as unknown as SystemConfig['fidgets'],
    navigation: (row.navigation_config ?? null) as unknown as SystemConfig['navigation'],
    ui: (row.ui_config ?? null) as unknown as SystemConfig['ui'],
    theme: themes, // Themes come from shared file, not database
  };
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
 */
function writeSystemConfigCache(communityId: string, value: SystemConfig | null) {
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
  // Resolve community ID from domain (simple priority)
  const communityId = resolveCommunityIdFromDomain(domain);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Config] Resolving domain "${domain}" → communityId: "${communityId}"`);
  }
  
  // Check cache first
  const cached = readSystemConfigCache(communityId);
  if (cached) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Config] Cache hit for communityId: "${communityId}"`);
    }
    return { communityId, config: cached };
  }

  // Try primary community ID
  const primaryConfig = await tryLoadCommunityConfig(communityId);
  if (primaryConfig) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Config] ✅ Loaded config for communityId: "${communityId}"`);
    }
    return { communityId, config: primaryConfig };
  }

  // Config not found - return null with informative error (always log, not just in dev)
  console.error(
    `[Config] ❌ Community config not found for domain "${domain}" (resolved to communityId: "${communityId}"). ` +
    `No automatic fallback to default. ` +
    `Check: Does a record exist in community_configs with community_id="${communityId}" and is_published=true?`
  );
  return null;
}

/**
 * Try to load a community config by ID.
 * Returns null if not found (does not cache misses to allow retries).
 */
async function tryLoadCommunityConfig(communityId: string): Promise<SystemConfig | null> {
  // Check cache
  const cached = readSystemConfigCache(communityId);
  if (cached !== undefined) {
    return cached;
  }

  // Query Supabase
  const supabase = createSupabaseServerClient();
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Config] 🔍 Querying database for communityId: "${communityId}"`);
  }
  
  const { data, error } = await supabase
    .from('community_configs')
    .select('*')
    .eq('community_id', communityId)
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Don't cache null for errors - allows retries for transient errors
    // PGRST116 = no rows returned (legitimate not found)
    // Other errors are likely transient (network, timeout, etc.)
    const isNotFoundError = error.code === 'PGRST116';
    
    if (isNotFoundError) {
      // Legitimate "not found" - return null without caching
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Config] ❌ Community config not found in database: "${communityId}" (PGRST116)`);
        console.log(`[Config] 💡 Check: Does a record exist with community_id="${communityId}" and is_published=true?`);
      }
      return null;
    } else {
      // Transient/unknown error - don't cache null to avoid suppressing valid entries
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
    // Don't cache null to allow retries if config is added later
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Config] ❌ No data returned for communityId: "${communityId}"`);
      console.log(`[Config] 💡 Check: Does a record exist with community_id="${communityId}" and is_published=true?`);
    }
    return null;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Config] ✅ Found config in database for communityId: "${communityId}"`);
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
    // Invalid config structure - don't cache null, allow retries if config is fixed
    console.error(
      `❌ Invalid config structure for communityId: "${communityId}". ` +
      `Missing required fields: ${missingFields.join(', ')}. ` +
      `All community configs must have brand_config, assets_config, community_config, and fidgets_config. ` +
      `Will retry on next request if config is fixed.`,
      { communityId, missingFields }
    );
    return null;
  }

  // Transform to SystemConfig
  const systemConfig = transformRowToSystemConfig(data);
  
  // Cache the result
  writeSystemConfigCache(communityId, systemConfig);
  
  return systemConfig;
}

/**
 * Load SystemConfig by community ID (when ID is already known).
 * Uses cache if available, otherwise queries Supabase.
 */
export async function loadSystemConfigById(
  communityId: string
): Promise<SystemConfig> {
  // Check cache first
  const cached = readSystemConfigCache(communityId);
  if (cached) {
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
    .single();

  if (error || !data) {
    const errorCode = error?.code || 'UNKNOWN';
    const errorMessage = error?.message || 'No data returned';
    throw new Error(
      `❌ Failed to load config from database for community: "${communityId}". ` +
      `Error code: ${errorCode}, Message: ${errorMessage}. ` +
      `Check: Does a record exist in community_configs with community_id="${communityId}" and is_published=true?`
    );
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
    throw new Error(
      `❌ Invalid config structure from database for community: "${communityId}". ` +
      `Missing required fields: ${missingFields.join(', ')}. ` +
      `All community configs must have brand_config, assets_config, community_config, and fidgets_config. ` +
      `Ensure database is seeded correctly or update the record.`
    );
  }

  // Transform to SystemConfig
  const systemConfig = transformRowToSystemConfig(data);
  
  // Cache the result
  writeSystemConfigCache(communityId, systemConfig);
  
  return systemConfig;
}

