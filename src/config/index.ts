import { SystemConfig } from './systemConfig';
import { 
  getDomainFromContext,
  getCommunityIdFromHeaders,
  resolveCommunityId,
  ConfigLoadContext 
} from './loaders';
import { RuntimeConfigLoader } from './loaders/runtimeLoader';

// Available community configurations
const AVAILABLE_CONFIGURATIONS = ['nouns', 'example', 'clanker'] as const;
type CommunityConfig = typeof AVAILABLE_CONFIGURATIONS[number];

// Singleton loader instance
let loaderInstance: RuntimeConfigLoader | null = null;

function getLoader(): RuntimeConfigLoader {
  if (!loaderInstance) {
    loaderInstance = new RuntimeConfigLoader();
  }
  return loaderInstance;
}

/**
 * Load system configuration from database
 * 
 * All communities use runtime loading from Supabase.
 * 
 * @param context Optional context (communityId, domain) - if not provided, 
 *                will be inferred from environment/domain
 * @returns The loaded system configuration (always async)
 */
/**
 * Load system configuration from database (SERVER-ONLY)
 * 
 * This function can only be called from Server Components or Server Actions.
 * For client components, pass systemConfig as a prop from a parent Server Component.
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
    
    // Get domain from headers (server-side only)
    const domain = await getDomainFromContext();
    
    return {
      communityId: process.env.NEXT_PUBLIC_COMMUNITY,
      domain,
      isServer: true,
    };
  };
  
  const loadContext = await buildContext();
  
  // Resolve community ID with priority order
  const communityId = resolveCommunityId(loadContext);
  const finalContext: ConfigLoadContext = {
    ...loadContext,
    communityId,
  };
  
  // Log which community is being loaded (in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Loading config for community: ${communityId || 'unknown'} (domain: ${loadContext.domain || 'none'})`);
  }
  
  // Load config using runtime loader
  return getLoader().load(finalContext);
}

// Export available configurations for reference
export { AVAILABLE_CONFIGURATIONS };

// Export SystemConfig type (configs are now database-backed, no static exports)
export type { SystemConfig };

// Space creators - re-export directly from Nouns implementations
import { 
  default as nounsCreateInitialProfileSpaceConfigForFid,
  default as nounsCreateInitialChannelSpaceConfig,
  default as nounsCreateInitialTokenSpaceConfigForAddress,
  default as nounsCreateInitalProposalSpaceConfigForProposalId,
  default as nounsINITIAL_HOMEBASE_CONFIG
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
