import { nounsSystemConfig } from './nouns/index';
import { exampleSystemConfig } from './example/index';
import { clankerSystemConfig } from './clanker/index';
import { SystemConfig } from './systemConfig';
import { themes } from './shared/themes';

// Available community configurations
const AVAILABLE_CONFIGURATIONS = ['nouns', 'example', 'clanker'] as const;
type CommunityConfig = typeof AVAILABLE_CONFIGURATIONS[number];

// Configuration loader
// REQUIRES database config - no fallback to static configs
export const loadSystemConfig = (): SystemConfig => {
  // Get the community configuration from environment variable
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  // REQUIRED: Build-time config from database (stored in env var at build time)
  const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
  
  if (!buildTimeConfig) {
    const errorMsg = 
      `❌ NEXT_PUBLIC_BUILD_TIME_CONFIG is not set. ` +
      `Database configuration is required. ` +
      `Ensure Supabase credentials are set and run: npm run build`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const dbConfig = JSON.parse(buildTimeConfig) as any;
    
    // Validate config structure
    if (!dbConfig || !dbConfig.brand || !dbConfig.assets) {
      const errorMsg = 
        `❌ Invalid config structure from database. ` +
        `Missing required fields: brand, assets. ` +
        `Ensure database is seeded correctly.`;
      console.error(errorMsg);
      console.error('Config received:', Object.keys(dbConfig || {}));
      throw new Error(errorMsg);
    }

    console.log('✅ Using config from database');
    
    // Map pages object to homePage/explorePage for backward compatibility
    // Add themes from shared file (themes are not in database)
    const mappedConfig: SystemConfig = {
      ...dbConfig,
      theme: themes, // Themes come from shared file
      homePage: dbConfig.pages?.['home'] || dbConfig.homePage || null,
      explorePage: dbConfig.pages?.['explore'] || dbConfig.explorePage || null,
    };
    
    return mappedConfig as SystemConfig;
  } catch (error) {
    if (error instanceof SyntaxError) {
      const errorMsg = 
        `❌ Failed to parse build-time config from database. ` +
        `Invalid JSON in NEXT_PUBLIC_BUILD_TIME_CONFIG. ` +
        `Error: ${error.message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    // Re-throw validation errors
    throw error;
  }
};

// Helper function to validate community configuration
function isValidCommunityConfig(config: string): config is CommunityConfig {
  return AVAILABLE_CONFIGURATIONS.includes(config.toLowerCase() as CommunityConfig);
}

// Export available configurations for reference
export { AVAILABLE_CONFIGURATIONS };

// Export the configurations
export { nounsSystemConfig } from './nouns/index';
export { exampleSystemConfig } from './example/index';
export { clankerSystemConfig } from './clanker/index';
export type { SystemConfig };

// Export individual configuration modules from nouns
export * from './nouns/index';

// Export individual configuration modules from example
export * from './example/index';

// Export individual configuration modules from clanker
export * from './clanker/index';

// Space creators - delegate to the active community at runtime
// Import creators for all communities under unique aliases
import { default as nounsCreateInitialProfileSpaceConfigForFid } from './nouns/initialSpaces/initialProfileSpace';
import { default as nounsCreateInitialChannelSpaceConfig } from './nouns/initialSpaces/initialChannelSpace';
import { default as nounsCreateInitialTokenSpaceConfigForAddress } from './nouns/initialSpaces/initialTokenSpace';
import { default as nounsCreateInitalProposalSpaceConfigForProposalId } from './nouns/initialSpaces/initialProposalSpace';
import { default as nounsINITIAL_HOMEBASE_CONFIG } from './nouns/initialSpaces/initialHomebase';

import { default as exampleCreateInitialProfileSpaceConfigForFid } from './example/initialSpaces/profile';
import { default as exampleCreateInitialChannelSpaceConfig } from './example/initialSpaces/channel';
import { default as exampleCreateInitialTokenSpaceConfigForAddress } from './example/initialSpaces/token';
import { default as exampleCreateInitalProposalSpaceConfigForProposalId } from './example/initialSpaces/proposal';
import { default as exampleINITIAL_HOMEBASE_CONFIG } from './example/initialSpaces/homebase';

import { default as clankerCreateInitialProfileSpaceConfigForFid } from './clanker/initialSpaces/initialProfileSpace';
import { default as clankerCreateInitialChannelSpaceConfig } from './clanker/initialSpaces/initialChannelSpace';
import { default as clankerCreateInitialTokenSpaceConfigForAddress } from './clanker/initialSpaces/initialTokenSpace';
import { default as clankerCreateInitialProposalSpaceConfigForProposalId } from './clanker/initialSpaces/initialProposalSpace';
import { default as clankerINITIAL_HOMEBASE_CONFIG, createInitialHomebaseConfig as clankerCreateInitialHomebaseConfig } from './clanker/initialSpaces/initialHomebase';

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
