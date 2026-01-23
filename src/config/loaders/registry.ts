import { createSupabaseServerClient } from '@/common/data/database/supabase/clients/server';
import { Database } from '@/supabase/database';
import { SystemConfig } from '../systemConfig';
import { themes } from '../shared/themes';
import { normalizeDomain } from '@/common/lib/utils/domain';

export const DEFAULT_COMMUNITY_ID = 'nounspace.com';

type CommunityConfigRow = Database['public']['Tables']['community_configs']['Row'];
type CommunityDomainRow = Database['public']['Tables']['community_domains']['Row'];

type CommunityDomains = {
  blankSubdomain?: string;
  customDomain?: string;
};

/**
 * Resolve community ID from domain.
 * Priority: community_domains table lookup → domain as community_id (legacy fallback)
 * Throws error if domain cannot be resolved (no default fallback).
 */
function looksLikeDomain(value: string): boolean {
  return value.includes('.');
}

function inferDomainsFromCommunityId(communityId: string): CommunityDomains {
  const normalized = normalizeDomain(communityId);
  if (!normalized || !looksLikeDomain(normalized)) {
    return {};
  }

  if (normalized.endsWith('.blank.space')) {
    return { blankSubdomain: normalized };
  }

  return { customDomain: normalized };
}

/**
 * Resolve community ID from domain.
 * 
 * Error Handling Strategy:
 * - Returns string: Successfully resolved community ID
 * - Throws Error: Invalid input or system/transient error (DB failure, network issue, etc.)
 * 
 * Resolution priority:
 * 1) community_domains table lookup
 * 2) Domain as community_id (legacy fallback)
 * 
 * @param domain - Domain string to resolve
 * @returns Community ID string
 * @throws Error if domain cannot be normalized or if a transient/system error occurs
 */
async function resolveCommunityIdFromDomain(domain: string): Promise<string> {
  const normalizedDomain = normalizeDomain(domain);
  
  if (!normalizedDomain) {
    throw new Error(
      `❌ Cannot resolve community ID: domain "${domain}" normalized to null. ` +
      `Domain must be a valid, non-empty value.`
    );
  }

  // Priority 1: Community domain mappings (from community_domains table)
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('community_domains')
    .select('community_id')
    .eq('domain', normalizedDomain)
    .maybeSingle();

  if (error) {
    // PGRST116 = no rows returned (legitimate "not found")
    if (error.code === 'PGRST116') {
      // Not found - continue to fallback (domain as community ID)
    } else {
      // Transient/system error - throw (fail fast, let Next.js handle retries)
      throw new Error(
        `❌ Failed to resolve community domain mapping for "${normalizedDomain}": ${error.message} ` +
        `(Error code: ${error.code}). This may be a network issue or database problem.`
      );
    }
  }

  if (data?.community_id) {
    return data.community_id;
  }
  
  // Priority 2: Domain as community ID (legacy fallback)
  return normalizedDomain;
} 



/**
 * Transform a database row to SystemConfig format.
 * This replaces the RPC function transformation, done in application code.
 */
function transformRowToSystemConfig(
  row: CommunityConfigRow,
  communityId: string,
  domains: CommunityDomains
): SystemConfig {
  const canonicalDomain = domains.customDomain || domains.blankSubdomain;

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
    domains,
    canonicalDomain,
  };
}

/**
 * Fetch the SystemConfig for a given domain.
 * 
 * Error Handling Strategy:
 * - Returns object: Successfully loaded config
 * - Returns null: Config not found for domain (expected case - caller should handle fallback)
 * - Throws Error: System/transient error (DB failure, invalid domain, etc.)
 * 
 * Resolution priority:
 * 1) community_domains table lookup
 * 2) Domain as community_id (legacy fallback)
 *
 * Note: React Server Components automatically deduplicate async calls within a single request,
 * so multiple components calling this function won't cause duplicate database queries.
 * 
 * @param domain - Domain string to resolve and load config for
 * @returns Config object if found, null if not found
 * @throws Error on system/transient errors (DB failures, invalid domain format)
 */
export async function getCommunityConfigForDomain(
  domain: string
): Promise<{ communityId: string; config: SystemConfig } | null> {
  // Resolve community ID from domain (throws on system errors)
  let communityId: string;
  try {
    communityId = await resolveCommunityIdFromDomain(domain);
  } catch (error) {
    // System/transient error - rethrow (don't silently return null)
    // Caller should handle this as a system error, not a "not found"
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `❌ Failed to resolve community ID from domain "${domain}": ${errorMessage}`
    );
  }

  // Load config from database (throws on system errors, returns null if not found)
  try {
    const primaryConfig = await loadCommunityConfigFromDatabase(communityId);
    if (primaryConfig) {
      return { communityId, config: primaryConfig };
    }
    // Config not found - return null (caller will handle fallback)
    return null;
  } catch (error) {
    // System/transient error - rethrow with context
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `❌ Failed to load config for communityId "${communityId}" (resolved from domain "${domain}"): ${errorMessage}`
    );
  }
}

/**
 * Load the domains associated with a community (blank subdomain + custom domain).
 * 
 * Error Handling Strategy:
 * - Returns CommunityDomains: Successfully loaded domains or inferred from communityId
 * - Never throws: Falls back to inference on any error (domains are optional metadata)
 * 
 * Falls back to inferring from community_id if no mappings exist or on errors.
 * This is safe because domains are optional metadata and inference is always available.
 * 
 * @param communityId - Community ID to load domains for
 * @returns CommunityDomains (always succeeds, falls back to inference)
 */
async function loadCommunityDomainsFromDatabase(
  communityId: string
): Promise<CommunityDomains> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('community_domains')
    .select('domain, domain_type')
    .eq('community_id', communityId);

  if (error) {
    // Log but don't throw - domains are optional metadata
    // PGRST116 (not found) is expected, other errors are logged but we fall back
    if (error.code !== 'PGRST116') {
      console.warn(
        `[Config] Failed to load community domains for communityId "${communityId}": ${error.message}. ` +
        `Falling back to inference from communityId.`
      );
    }
    return inferDomainsFromCommunityId(communityId);
  }

  if (!data || data.length === 0) {
    return inferDomainsFromCommunityId(communityId);
  }

  const domains: CommunityDomains = {};
  for (const row of data as CommunityDomainRow[]) {
    const normalized = normalizeDomain(row.domain);
    if (!normalized) continue;
    if (row.domain_type === 'blank_subdomain') {
      domains.blankSubdomain = normalized;
    } else if (row.domain_type === 'custom') {
      domains.customDomain = normalized;
    }
  }

  return Object.keys(domains).length > 0 ? domains : inferDomainsFromCommunityId(communityId);
}

/**
 * Core function to load a community config from the database.
 * 
 * Error Handling Strategy:
 * - Returns null: Expected "not found" (config doesn't exist for this communityId)
 * - Throws Error: Unexpected/system error (transient DB failure, invalid data structure, etc.)
 * 
 * This is the single source of truth for database queries.
 * Callers should handle null as "not found" and catch throws as system errors.
 * 
 * @param communityId - Community ID to load config for
 * @returns SystemConfig if found, null if not found
 * @throws Error on transient/system errors (DB failures, invalid data structure)
 */
async function loadCommunityConfigFromDatabase(communityId: string): Promise<SystemConfig | null> {
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
    // PGRST116 = no rows returned (legitimate "not found")
    const isNotFoundError = error.code === 'PGRST116';
    
    if (isNotFoundError) {
      // Legitimate "not found" - return null
      return null;
    } else {
      // Transient/system error - throw (fail fast, let Next.js handle retries)
      throw new Error(
        `❌ Failed to fetch community config (transient error) for communityId: "${communityId}". ` +
        `Error code: ${error.code}, Message: ${error.message}. ` +
        `This may be a network issue or database problem.`
      );
    }
  }

  if (!data) {
    // No data returned but no error - legitimate "not found"
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

  const domains = await loadCommunityDomainsFromDatabase(communityId);

  // Transform to SystemConfig
  const systemConfig = transformRowToSystemConfig(data, communityId, domains);
  
  return systemConfig;
}

/**
 * Load SystemConfig by community ID (when ID is already known).
 * 
 * Error Handling Strategy:
 * - Returns SystemConfig: Successfully loaded config
 * - Throws Error: Config not found OR system/transient error
 * 
 * Use this when the config MUST exist (e.g., explicit communityId provided).
 * For cases where config may not exist, use loadCommunityConfigFromDatabase directly.
 * 
 * @param communityId - Community ID to load config for
 * @returns SystemConfig (never null)
 * @throws Error if config not found or on system/transient errors
 */
export async function loadSystemConfigById(
  communityId: string
): Promise<SystemConfig> {
  try {
    const config = await loadCommunityConfigFromDatabase(communityId);
    
    if (!config) {
      throw new Error(
        `❌ Failed to load config from database for community: "${communityId}". ` +
        `Check: Does a record exist in community_configs with community_id="${communityId}" and is_published=true?`
      );
    }
    
    return config;
  } catch (error) {
    // If it's already an Error from loadCommunityConfigFromDatabase, rethrow as-is
    // Otherwise, wrap it
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `❌ Failed to load config for community "${communityId}": ${String(error)}`
    );
  }
}
