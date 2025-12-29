import {
  SystemConfig,
  type CommunityErc20Token,
  type CommunityNftToken,
  type CommunityTokenNetwork,
  type CommunityTokensConfig,
} from './systemConfig';
import { 
  ConfigLoadContext,
  getCommunityConfigForDomain,
  loadSystemConfigById,
} from './loaders';

/**
 * Load system configuration from database (SERVER-ONLY)
 * 
 * This function can only be called from Server Components or Server Actions.
 * For client components, pass systemConfig as a prop from a parent Server Component.
 * 
 * All communities use runtime loading from Supabase.
 * 
 * @param context Optional context (communityId, domain) - if not provided, 
 *                will be inferred from headers/domain
 * @returns The loaded system configuration (always async)
 */
export async function loadSystemConfig(context?: ConfigLoadContext): Promise<SystemConfig> {
  // Entry point log - should show in Vercel
  console.error('[loadSystemConfig] Entry point called', { hasContext: !!context, hasCommunityId: !!context?.communityId, hasDomain: !!context?.domain });
  
  // Priority 1: Explicit communityId provided
  if (context?.communityId) {
    try {
      return await loadSystemConfigById(context.communityId);
    } catch (error) {
      // Don't fall back to default - throw informative error
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `❌ Failed to load config for explicit communityId "${context.communityId}". ` +
        `Error: ${errorMessage}. ` +
        `No automatic fallback to default. ` +
        `Check: Does a record exist in community_configs with community_id="${context.communityId}" and is_published=true?`
      );
    }
  }

  // Priority 2: Resolve from domain (uses cached lookup)
  let domain: string | undefined = context?.domain;
  
  if (!domain) {
    // Get domain from middleware-set header (server-side only)
    try {
      const { headers } = await import('next/headers');
      const headersList = await headers();
      domain = headersList.get('x-detected-domain') ?? undefined;
      // Log header read for Vercel visibility
      console.error(`[Config] Read x-detected-domain header: "${domain ?? 'null'}"`);
    } catch (error) {
      // Not in request context (static generation, etc.)
      domain = undefined;
      console.error(`[Config] Failed to read headers (not in request context)`);
    }
  }

  if (domain) {
    console.error(`[Config] Starting domain resolution for: "${domain}"`);
    const resolution = await getCommunityConfigForDomain(domain);
    if (resolution) {
      // Always log for Vercel visibility
      console.error(`[Config] Successfully loaded config for community: ${resolution.communityId} (domain: ${domain})`);
      return resolution.config;
    }
    // Domain provided but config not found - throw informative error
    throw new Error(
      `❌ Community config not found for domain: "${domain}". ` +
      `No automatic fallback to default. ` +
      `Check: Does a record exist in community_configs with community_id matching this domain and is_published=true?`
    );
  }

  // Priority 3: Development override
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_TEST_COMMUNITY) {
    const devCommunityId = process.env.NEXT_PUBLIC_TEST_COMMUNITY;
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Loading config for community: ${devCommunityId} (dev override)`);
    }
    return await loadSystemConfigById(devCommunityId);
  }

  // No domain or communityId provided - throw error (no default fallback)
  throw new Error(
    `❌ Cannot load system config: No domain or communityId provided. ` +
    `Either provide a domain in the request context, or set NEXT_PUBLIC_TEST_COMMUNITY in development. ` +
    `Check: Is the middleware setting the x-detected-domain header correctly?`
  );
}

// Export SystemConfig type (configs are now database-backed, no static exports)
export type {
  SystemConfig,
  CommunityErc20Token,
  CommunityNftToken,
  CommunityTokenNetwork,
  CommunityTokensConfig,
};

// Space creators - re-export directly from Nouns implementations
import { 
  createInitialProfileSpaceConfigForFid as nounsCreateInitialProfileSpaceConfigForFid,
  createInitialChannelSpaceConfig as nounsCreateInitialChannelSpaceConfig,
  createInitialTokenSpaceConfigForAddress as nounsCreateInitialTokenSpaceConfigForAddress,
  createInitalProposalSpaceConfigForProposalId as nounsCreateInitalProposalSpaceConfigForProposalId,
  INITIAL_HOMEBASE_CONFIG as nounsINITIAL_HOMEBASE_CONFIG
} from './nouns/index';

export const createInitialProfileSpaceConfigForFid = nounsCreateInitialProfileSpaceConfigForFid;
export const createInitialChannelSpaceConfig = nounsCreateInitialChannelSpaceConfig;
export const createInitialTokenSpaceConfigForAddress = nounsCreateInitialTokenSpaceConfigForAddress;
export const createInitalProposalSpaceConfigForProposalId = nounsCreateInitalProposalSpaceConfigForProposalId;
export const INITIAL_HOMEBASE_CONFIG = nounsINITIAL_HOMEBASE_CONFIG;

/**
 * Create initial homebase config with user-specific data (e.g., wallet address)
 * Note: Nouns implementation doesn't use userAddress, but kept for API compatibility
 */
export function createInitialHomebaseConfig(userAddress?: string) {
  return nounsINITIAL_HOMEBASE_CONFIG;
}

// Export initial space config
export { INITIAL_SPACE_CONFIG_EMPTY } from './initialSpaceConfig';
