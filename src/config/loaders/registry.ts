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

  // Support localhost subdomains for local testing (e.g., example.localhost)
  if (normalizedDomain.includes('localhost')) {
    const parts = normalizedDomain.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost') {
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

function isNotFoundError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === 'PGRST116';
}

/**
 * Fetch the SystemConfig for a given domain.
 *
 * Resolution priority:
 * 1) Normalize the domain (lowercase, strip port, drop leading `www.`)
 * 2) Apply DOMAIN_TO_COMMUNITY_MAP overrides
 * 3) Try exact domain match in community_id (e.g., example.blank.space -> community_id=example.blank.space)
 * 4) Use the default nounspace community when no explicit match is found
 *
 * A short-lived in-memory cache is used to avoid repeated Supabase lookups for the same
 * community during navigation bursts. Returns the final SystemConfig (transformed and ready to use).
 */
export async function getCommunityConfigForDomain(
  domain: string
): Promise<{ communityId: string; config: SystemConfig } | null> {
  const candidates = getCommunityIdCandidates(domain);

  // Check cache first (now caches SystemConfig, not raw rows)
  for (const candidate of candidates) {
    const cached = readSystemConfigCache(candidate);
    if (cached !== undefined) {
      if (cached) {
        return { communityId: candidate, config: cached };
      }
      // Cached miss, continue to next candidate
    }
  }

  // Single Supabase query - get published configs only
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('community_configs')
    .select('*')
    .in('community_id', candidates)
    .eq('is_published', true)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch community config', { candidates, error });
    if (isNotFoundError(error)) {
      candidates.forEach((candidate) => writeSystemConfigCache(candidate, null));
    }
    return null;
  }

  // Build map of results (most recent first due to ordering)
  const dataById = new Map<string, CommunityConfigRow>();
  (data ?? []).forEach((row) => {
    if (row.community_id && !dataById.has(row.community_id)) {
      // Only keep first (most recent) entry per community_id
      dataById.set(row.community_id, row);
    }
  });

  // Try each candidate in priority order
  for (const candidate of candidates) {
    const matched = dataById.get(candidate);
    if (matched) {
      // Transform row to SystemConfig
      const systemConfig = transformRowToSystemConfig(matched);
      
      // Cache SystemConfig (not raw row)
      writeSystemConfigCache(candidate, systemConfig);
      
      return { communityId: candidate, config: systemConfig };
    }
    // Cache the miss
    writeSystemConfigCache(candidate, null);
  }

  return null;
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

