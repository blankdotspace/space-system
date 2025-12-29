import { createSupabaseServerClient } from '@/common/data/database/supabase/clients/server';
import { Database } from '@/supabase/database';
import { SystemConfig } from '../systemConfig';
import { themes } from '../shared/themes';

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
  'staging.nounspace.com': 'nounspace.com',
};

export const DEFAULT_COMMUNITY_ID = 'nounspace.com';

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
  
  // Priority 1: Special domain mappings
  if (normalizedDomain in DOMAIN_TO_COMMUNITY_MAP) {
    return DOMAIN_TO_COMMUNITY_MAP[normalizedDomain];
  }
  
  // Priority 2: Domain as community ID (e.g., example.nounspace.com → example.nounspace.com)
  // Priority 3: Default fallback (handled by caller if domain lookup fails)
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
  
  // Check cache first
  const cached = readSystemConfigCache(communityId);
  if (cached !== undefined) {
    if (cached) {
      return { communityId, config: cached };
    }
    // Cached miss - try fallback if not already default
    if (communityId !== DEFAULT_COMMUNITY_ID) {
      const defaultCached = readSystemConfigCache(DEFAULT_COMMUNITY_ID);
      if (defaultCached) {
        return { communityId: DEFAULT_COMMUNITY_ID, config: defaultCached };
      }
    }
  }

  // Try primary community ID
  const primaryConfig = await tryLoadCommunityConfig(communityId);
  if (primaryConfig) {
    return { communityId, config: primaryConfig };
  }

  // Fallback to default if primary failed and not already default
  if (communityId !== DEFAULT_COMMUNITY_ID) {
    const defaultConfig = await tryLoadCommunityConfig(DEFAULT_COMMUNITY_ID);
    if (defaultConfig) {
      return { communityId: DEFAULT_COMMUNITY_ID, config: defaultConfig };
    }
  }

  return null;
}

/**
 * Try to load a community config by ID.
 * Returns null if not found (caches the miss).
 */
async function tryLoadCommunityConfig(communityId: string): Promise<SystemConfig | null> {
  // Check cache
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
    console.error('Failed to fetch community config', { communityId, error });
    writeSystemConfigCache(communityId, null);
    return null;
  }

  if (!data) {
    writeSystemConfigCache(communityId, null);
    return null;
  }

  // Validate config structure
  if (!data.brand_config || !data.assets_config) {
    console.error('Invalid config structure', { communityId });
    writeSystemConfigCache(communityId, null);
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
    throw new Error(
      `❌ Failed to load config from database for community: ${communityId}. ` +
      `Error: ${error?.message || 'No data returned'}`
    );
  }

  // Validate config structure
  if (!data.brand_config || !data.assets_config) {
    throw new Error(
      `❌ Invalid config structure from database. ` +
      `Missing required fields: brand_config, assets_config. ` +
      `Ensure database is seeded correctly.`
    );
  }

  // Transform to SystemConfig
  const systemConfig = transformRowToSystemConfig(data);
  
  // Cache the result
  writeSystemConfigCache(communityId, systemConfig);
  
  return systemConfig;
}

