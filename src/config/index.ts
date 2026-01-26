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
    // Note: This uses Next.js headers() API which is NOT available in Edge Runtime
    // For Edge Runtime routes, domain must be provided in context
    try {
      // Check if we're in Edge Runtime by trying to detect it
      // Edge Runtime doesn't have Node.js globals like process.versions.node
      // @ts-expect-error - EdgeRuntime is a global available in Edge Runtime
      const isEdgeRuntime = typeof EdgeRuntime !== 'undefined' || 
                           (typeof process !== 'undefined' && !process.versions?.node);
      
      if (isEdgeRuntime) {
        // In Edge Runtime, we can't use headers() API
        // Domain must be provided via context
        // This should not happen if resolveMetadataBranding is used correctly
        console.warn(
          `[Config] Edge Runtime detected: domain must be provided in context. ` +
          `Falling back to default: "${DEFAULT_COMMUNITY_ID}"`
        );
        return await loadSystemConfigById(DEFAULT_COMMUNITY_ID);
      }
      
      // Only import next/headers if we're NOT in Edge Runtime
      // This prevents Next.js from trying to bundle it for Edge Runtime routes
      const headersModule = await import('next/headers');
      const headersList = await headersModule.headers();
      const host = headersList.get('host') || headersList.get('x-forwarded-host');
      
      if (host) {
        // Import normalizeDomain to normalize the host
        const { normalizeDomain } = await import('@/common/lib/utils/domain');
        domain = normalizeDomain(host) ?? undefined;
      }
    } catch (error) {
      // Not in request context (static generation/build time) or Edge Runtime
      // This should not happen if layout is set to dynamic
      domain = undefined;
      console.error(`[Config] Failed to read headers (not in request context):`, error);
    }
  }

  if (domain) {
    try {
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
    } catch (error) {
      // System/transient error - log and fall back to default
      // This allows the app to continue functioning even if one domain's config fails to load
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `[Config] System error loading config for domain "${domain}": ${errorMessage}. ` +
        `Falling back to default: "${DEFAULT_COMMUNITY_ID}"`
      );
      return await loadSystemConfigById(DEFAULT_COMMUNITY_ID);
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

// Space creators - default layouts for new spaces
// Community customizations should be handled via database config, not code-level routing
import { default as createInitialProfileSpaceConfigForFid } from './initialSpaces/initialProfileSpace';
import { default as createInitialChannelSpaceConfig } from './initialSpaces/initialChannelSpace';
import { default as createInitialTokenSpaceConfigForAddress } from './initialSpaces/initialTokenSpace';
import { default as createInitalProposalSpaceConfigForProposalId } from './initialSpaces/initialProposalSpace';
import { default as INITIAL_HOMEBASE_CONFIG } from './initialSpaces/initialHomebase';

export { createInitialProfileSpaceConfigForFid };
export { createInitialChannelSpaceConfig };
export { createInitialTokenSpaceConfigForAddress };
export { createInitalProposalSpaceConfigForProposalId };
export { INITIAL_HOMEBASE_CONFIG };

/**
 * Create initial homebase config with user-specific data (e.g., wallet address)
 * Note: Nouns implementation doesn't use userAddress, but kept for API compatibility
 */
export function createInitialHomebaseConfig(userAddress?: string) {
  return INITIAL_HOMEBASE_CONFIG;
}
// Export initial space config
export { INITIAL_SPACE_CONFIG_EMPTY } from './initialSpaceConfig';
