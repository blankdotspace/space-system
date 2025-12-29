import {
  SystemConfig,
  type CommunityErc20Token,
  type CommunityNftToken,
  type CommunityTokenNetwork,
  type CommunityTokensConfig,
} from './systemConfig';
import { 
  resolveCommunityId,
  ConfigLoadContext,
  DEFAULT_COMMUNITY_ID,
} from './loaders';
import { RuntimeConfigLoader } from './loaders/runtimeLoader';

// Singleton loader instance
let loaderInstance: RuntimeConfigLoader | null = null;

function getLoader(): RuntimeConfigLoader {
  if (!loaderInstance) {
    loaderInstance = new RuntimeConfigLoader();
  }
  return loaderInstance;
}

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
  // Build context if not provided
  // Server-side only: uses headers() to detect domain
  const buildContext = async (): Promise<ConfigLoadContext> => {
    if (context) {
      return context;
    }

    // Get domain from middleware-set header (server-side only)
    let domain: string | undefined;
    try {
      const { headers } = await import('next/headers');
      const headersList = await headers();
      domain = headersList.get('x-detected-domain') ?? undefined;
    } catch (error) {
      // Not in request context (static generation, etc.)
      domain = undefined;
    }

    return {
      communityId: undefined, // Will be resolved via resolveCommunityId()
      domain,
      isServer: true,
    };
  };
  
  const loadContext = await buildContext();
  
  // Resolve community ID with priority order (uses cached Supabase lookup)
  const communityId = await resolveCommunityId(loadContext);
  const finalContext: ConfigLoadContext = {
    ...loadContext,
    communityId,
  };
  
  // Log which community is being loaded (in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Loading config for community: ${communityId || 'unknown'} (domain: ${loadContext.domain || 'none'})`);
  }
  
  // Load config using runtime loader
  try {
    return await getLoader().load(finalContext);
  } catch (error) {
    // If the resolved community fails to load and isn't already the default,
    // fall back to the nounspace.com config to avoid runtime crashes.
    if (communityId && communityId !== DEFAULT_COMMUNITY_ID) {
      console.warn(
        `Falling back to default community after failed load for "${communityId}".`,
        error
      );
      return await getLoader().load({
        ...finalContext,
        communityId: DEFAULT_COMMUNITY_ID,
      });
    }

    throw error;
  }
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
