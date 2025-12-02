import { SystemConfig } from './systemConfig';
import { 
  getConfigLoaderFactory, 
  getDomainFromContext,
  getCommunityIdFromHeaders,
  ConfigLoadContext 
} from './loaders';
import { resolveCommunityFromDomain } from './loaders/registry';

// Available community configurations
const AVAILABLE_CONFIGURATIONS = ['nouns', 'example', 'clanker'] as const;
type CommunityConfig = typeof AVAILABLE_CONFIGURATIONS[number];

/**
 * Load system configuration from database
 * 
 * All communities use runtime loading from Supabase.
 * 
 * @param context Optional context (communityId, domain) - if not provided, 
 *                will be inferred from environment/domain
 * @returns The loaded system configuration (always async)
 */
export async function loadSystemConfig(context?: ConfigLoadContext): Promise<SystemConfig> {
  const factory = getConfigLoaderFactory();
  
  // Build context if not provided
  // Server-side: uses headers() to detect domain
  // Client-side: uses window.location.hostname
  const buildContext = async (): Promise<ConfigLoadContext> => {
    if (context) {
      return context;
    }
    
    // Get domain (async on server, sync on client)
    const domain = typeof window === 'undefined'
      ? await getDomainFromContext() // Server: uses headers()
      : getDomainFromContext();      // Client: uses window.location
    
    return {
      communityId: process.env.NEXT_PUBLIC_COMMUNITY,
      domain,
      isServer: typeof window === 'undefined',
    };
  };
  
  const loadContext = await buildContext();
  const loader = factory.getLoader(loadContext);
  
  // Log which community is being loaded (in development)
  if (process.env.NODE_ENV === 'development') {
    const communityId = loadContext.communityId || 
                       (loadContext.domain ? resolveCommunityFromDomain(loadContext.domain) : null) ||
                       'unknown';
    console.log(`✅ Loading config for community: ${communityId} (domain: ${loadContext.domain || 'none'})`);
  }
  
  // Always use runtime loader (async)
  return loader.load(loadContext) as Promise<SystemConfig>;
}

// Helper function to validate community configuration
function isValidCommunityConfig(config: string): config is CommunityConfig {
  return AVAILABLE_CONFIGURATIONS.includes(config.toLowerCase() as CommunityConfig);
}

// Export available configurations for reference
export { AVAILABLE_CONFIGURATIONS };

// Export SystemConfig type (configs are now database-backed, no static exports)
export type { SystemConfig };

// Space creators - delegate to the active community at runtime
// Import creators for all communities under unique aliases
import { createInitialProfileSpaceConfigForFid as nounsCreateInitialProfileSpaceConfigForFid } from './nouns/index';
import { createInitialChannelSpaceConfig as nounsCreateInitialChannelSpaceConfig } from './nouns/index';
import { createInitialTokenSpaceConfigForAddress as nounsCreateInitialTokenSpaceConfigForAddress } from './nouns/index';
import { createInitalProposalSpaceConfigForProposalId as nounsCreateInitalProposalSpaceConfigForProposalId } from './nouns/index';
import { INITIAL_HOMEBASE_CONFIG as nounsINITIAL_HOMEBASE_CONFIG } from './nouns/index';

import { createInitialProfileSpaceConfigForFid as exampleCreateInitialProfileSpaceConfigForFid } from './example/index';
import { createInitialChannelSpaceConfig as exampleCreateInitialChannelSpaceConfig } from './example/index';
import { createInitialTokenSpaceConfigForAddress as exampleCreateInitialTokenSpaceConfigForAddress } from './example/index';
import { createInitalProposalSpaceConfigForProposalId as exampleCreateInitalProposalSpaceConfigForProposalId } from './example/index';
import { INITIAL_HOMEBASE_CONFIG as exampleINITIAL_HOMEBASE_CONFIG } from './example/index';

import { createInitialProfileSpaceConfigForFid as clankerCreateInitialProfileSpaceConfigForFid } from './clanker/index';
import { createInitialChannelSpaceConfig as clankerCreateInitialChannelSpaceConfig } from './clanker/index';
import { createInitialTokenSpaceConfigForAddress as clankerCreateInitialTokenSpaceConfigForAddress } from './clanker/index';
import { createInitialProposalSpaceConfigForProposalId as clankerCreateInitialProposalSpaceConfigForProposalId } from './clanker/index';
import { INITIAL_HOMEBASE_CONFIG as clankerINITIAL_HOMEBASE_CONFIG, createInitialHomebaseConfig as clankerCreateInitialHomebaseConfig } from './clanker/index';

function resolveCommunity(): CommunityConfig {
  const c = (process.env.NEXT_PUBLIC_COMMUNITY || 'nouns').toLowerCase();
  return isValidCommunityConfig(c) ? (c as CommunityConfig) : 'nouns';
}

export const createInitialProfileSpaceConfigForFid = (fid: number, username?: string, walletAddress?: string) => {
  switch (resolveCommunity()) {
    case 'clanker':
      return clankerCreateInitialProfileSpaceConfigForFid(fid, username, walletAddress);
    case 'example':
      return exampleCreateInitialProfileSpaceConfigForFid(fid, username);
    case 'nouns':
    default:
      return nounsCreateInitialProfileSpaceConfigForFid(fid, username);
  }
};

export const createInitialChannelSpaceConfig = (channelId: string) => {
  switch (resolveCommunity()) {
    case 'clanker':
      return clankerCreateInitialChannelSpaceConfig(channelId);
    case 'example':
      return exampleCreateInitialChannelSpaceConfig(channelId);
    case 'nouns':
    default:
      return nounsCreateInitialChannelSpaceConfig(channelId);
  }
};

export const createInitialTokenSpaceConfigForAddress = (
  ...args: any[]
) => {
  switch (resolveCommunity()) {
    case 'clanker':
      return (clankerCreateInitialTokenSpaceConfigForAddress as any)(...args);
    case 'example':
      return (exampleCreateInitialTokenSpaceConfigForAddress as any)(...args);
    case 'nouns':
    default:
      return (nounsCreateInitialTokenSpaceConfigForAddress as any)(...args);
  }
};

// Maintain the historical (typo) API used by consumers
export const createInitalProposalSpaceConfigForProposalId = (
  ...args: any[]
) => {
  switch (resolveCommunity()) {
    case 'clanker':
      // clanker uses the corrected spelling under the hood
      return (clankerCreateInitialProposalSpaceConfigForProposalId as any)(...args);
    case 'example':
      return (exampleCreateInitalProposalSpaceConfigForProposalId as any)(...args);
    case 'nouns':
    default:
      return (nounsCreateInitalProposalSpaceConfigForProposalId as any)(...args);
  }
};

// Resolve the initial homebase config at module load based on the active community
export const INITIAL_HOMEBASE_CONFIG = (() => {
  switch (resolveCommunity()) {
    case 'clanker':
      return clankerINITIAL_HOMEBASE_CONFIG;
    case 'example':
      return exampleINITIAL_HOMEBASE_CONFIG;
    case 'nouns':
    default:
      return nounsINITIAL_HOMEBASE_CONFIG;
  }
})();

// Function to create initial homebase config with user-specific data (e.g., wallet address)
export const createInitialHomebaseConfig = (userAddress?: string) => {
  switch (resolveCommunity()) {
    case 'clanker':
      return clankerCreateInitialHomebaseConfig(userAddress);
    case 'example':
      return exampleINITIAL_HOMEBASE_CONFIG;
    case 'nouns':
    default:
      return nounsINITIAL_HOMEBASE_CONFIG;
  }
};

// Export initial space config
export { INITIAL_SPACE_CONFIG_EMPTY } from './initialSpaceConfig';
