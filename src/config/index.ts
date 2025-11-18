import {
  SystemConfig,
  type CommunityErc20Token,
  type CommunityNftToken,
  type CommunityTokenNetwork,
  type CommunityTokensConfig,
  type MiniAppAccountAssociation,
  type MiniAppManifestOverrides,
  type MiniAppConfig,
} from './systemConfig';
import { 
  ConfigLoadContext,
  DEFAULT_COMMUNITY_ID,
  getCommunityConfigForDomain,
  loadSystemConfigById,
} from './loaders';

// Track domains we've already warned about to avoid spam
const warnedDomains = new Set<string>();

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

  // Priority 2: Resolve from domain
  let domain: string | undefined = context?.domain;
  
  if (!domain) {
    // Read host header directly (no middleware needed)
    try {
      const { headers } = await import('next/headers');
      const headersList = await headers();
      const host = headersList.get('host') || headersList.get('x-forwarded-host');
      
      if (host) {
        // Import normalizeDomain to normalize the host
        const { normalizeDomain } = await import('./loaders/registry');
        domain = normalizeDomain(host);
      }
    } catch (error) {
      // Not in request context (static generation/build time)
      // This should not happen if layout is set to dynamic
      domain = undefined;
      console.error(`[Config] Failed to read headers (not in request context):`, error);
    }
  }

  if (domain) {
    const resolution = await getCommunityConfigForDomain(domain);
    if (resolution) {
      return resolution.config;
    }
    // Domain provided but config not found - fall back to default
    // Only warn once per domain to avoid console spam
    if (!warnedDomains.has(domain)) {
      warnedDomains.add(domain);
      console.warn(
        `[Config] Community config not found for domain: "${domain}", falling back to default: "${DEFAULT_COMMUNITY_ID}"`
      );
    }
    return await loadSystemConfigById(DEFAULT_COMMUNITY_ID);
  }

  // Priority 3: Development override
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_TEST_COMMUNITY) {
    const devCommunityId = process.env.NEXT_PUBLIC_TEST_COMMUNITY;
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Loading config for community: ${devCommunityId} (dev override)`);
    }
    return await loadSystemConfigById(devCommunityId);
  }

  // No domain or communityId provided - fall back to default
  // This should not happen at runtime if host header is available
  // If this happens during build, the layout should be set to dynamic
  console.warn(
    `[Config] No domain or communityId provided, falling back to default: "${DEFAULT_COMMUNITY_ID}"`
  );
  return await loadSystemConfigById(DEFAULT_COMMUNITY_ID);
}

// Export SystemConfig type (configs are now database-backed, no static exports)
export type {
  SystemConfig,
  CommunityErc20Token,
  CommunityNftToken,
  CommunityTokenNetwork,
  CommunityTokensConfig,
  MiniAppAccountAssociation,
  MiniAppManifestOverrides,
  MiniAppConfig,
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

type CommunityName = 'nouns' | 'clanker' | 'example';

function resolveCommunity(): CommunityName {
  const c = (process.env.NEXT_PUBLIC_COMMUNITY || 'nouns').toLowerCase();
  return (c === 'clanker' || c === 'example' || c === 'nouns') ? c : 'nouns';
}

export const createInitialProfileSpaceConfigForFid = (fid: number, username?: string) => {
  switch (resolveCommunity()) {
    case 'clanker':
      return clankerCreateInitialProfileSpaceConfigForFid(fid, username);
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
