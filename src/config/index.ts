import { nounsSystemConfig } from './nouns/index';
import { exampleSystemConfig } from './example/index';
import { clankerSystemConfig } from './clanker/index';
import { SystemConfig } from './systemConfig';

// Available community configurations
const AVAILABLE_CONFIGURATIONS = ['nouns', 'example', 'clanker'] as const;
type CommunityConfig = typeof AVAILABLE_CONFIGURATIONS[number];

// Configuration loader
export const loadSystemConfig = (): SystemConfig => {
  // Get the community configuration from environment variable
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  // Try build-time config from database (stored in env var at build time)
  const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
  if (buildTimeConfig) {
    try {
      const dbConfig = JSON.parse(buildTimeConfig) as SystemConfig;
      // Validate config structure
      if (dbConfig && dbConfig.brand && dbConfig.assets) {
        console.log('✅ Using config from database');
        return dbConfig;
      } else {
        console.warn('⚠️  Invalid config structure from DB, falling back to static');
      }
    } catch (error) {
      console.warn('⚠️  Failed to parse build-time config, falling back to static:', error);
    }
  }
  
  // Fall back to static configs
  console.log('ℹ️  Using static configs');
  
  // Validate the configuration
  if (!isValidCommunityConfig(communityConfig)) {
    console.warn(
      `Invalid community configuration: "${communityConfig}". ` +
      `Available options: ${AVAILABLE_CONFIGURATIONS.join(', ')}. ` +
      `Falling back to "nouns" configuration.`
    );
  }
  
  // Switch between available configurations
  switch (communityConfig.toLowerCase()) {
    case 'nouns':
      return nounsSystemConfig;
    case 'example':
      return exampleSystemConfig;
    case 'clanker':
      return clankerSystemConfig as unknown as SystemConfig;
    // Add more community configurations here as they are created
    default:
      return nounsSystemConfig;
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
