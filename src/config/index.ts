import {
  SystemConfig,
  type CommunityErc20Token,
  type CommunityNftToken,
  type CommunityTokenNetwork,
  type CommunityTokensConfig,
} from './systemConfig';
import { 
  ConfigLoadContext,
  DEFAULT_COMMUNITY_ID,
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
  // Priority 1: Explicit communityId provided
  if (context?.communityId) {
    try {
      return await loadSystemConfigById(context.communityId);
    } catch (error) {
      // Fallback to default if explicit ID fails
      if (context.communityId !== DEFAULT_COMMUNITY_ID) {
        console.warn(
          `Falling back to default community after failed load for "${context.communityId}".`,
          error
        );
        return await loadSystemConfigById(DEFAULT_COMMUNITY_ID);
      }
      throw error;
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
    } catch (error) {
      // Not in request context (static generation, etc.)
      domain = undefined;
    }
  }

  if (domain) {
    const resolution = await getCommunityConfigForDomain(domain);
    if (resolution) {
      // Log which community is being loaded (in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Loading config for community: ${resolution.communityId} (domain: ${domain})`);
      }
      return resolution.config;
    }
  }

  // Priority 3: Development override
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_TEST_COMMUNITY) {
    const devCommunityId = process.env.NEXT_PUBLIC_TEST_COMMUNITY;
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Loading config for community: ${devCommunityId} (dev override)`);
    }
    return await loadSystemConfigById(devCommunityId);
  }

  // Priority 4: Fallback to default
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Loading config for community: ${DEFAULT_COMMUNITY_ID} (fallback)`);
  }
  return await loadSystemConfigById(DEFAULT_COMMUNITY_ID);
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
