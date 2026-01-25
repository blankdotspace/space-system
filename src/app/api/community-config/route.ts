import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/common/data/database/supabase/clients/server';
import { Database } from '@/supabase/database';
import type { CommunityTokensConfig } from '@/config';
import { normalizeAndValidateDomain } from '@/common/lib/utils/domain';

interface IncomingCommunityConfig {
  community_id?: string;
  admin_address?: string;
  domain?: string;
  custom_domain?: string;
  admin_email?: string;
  custom_domain_authorized?: boolean;
  brand_config?: unknown;
  assets_config?: unknown;
  community_config?: unknown;
  fidgets_config?: unknown;
  navigation_config?: unknown;
  ui_config?: unknown;
  is_published?: boolean;
}

// Default fallback tokens (SPACE + nOGs)
const DEFAULT_SPACE_CONTRACT_ADDR = 
  process.env.NEXT_PUBLIC_SPACE_CONTRACT_ADDR ||
  process.env.SPACE_CONTRACT_ADDR ||
  "0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab";

const DEFAULT_NOGS_CONTRACT_ADDR =
  process.env.NEXT_PUBLIC_NOGS_CONTRACT_ADDR ||
  process.env.NOGS_CONTRACT_ADDR ||
  "0xD094D5D45c06c1581f5f429462eE7cCe72215616";

/**
 * Get default fallback tokens (SPACE + nOGs).
 */
function getDefaultTokens(): CommunityTokensConfig {
  return {
    erc20Tokens: [
      {
        address: DEFAULT_SPACE_CONTRACT_ADDR,
        symbol: "SPACE",
        decimals: 18,
        network: "base",
      },
    ],
    nftTokens: DEFAULT_NOGS_CONTRACT_ADDR
      ? [
          {
            address: DEFAULT_NOGS_CONTRACT_ADDR,
            symbol: "NOGS",
            type: "erc721",
            network: "base",
          },
        ]
      : [],
  };
}

/**
 * Ensure tokens are present in community_config.
 * Adds default SPACE + nOGs tokens if tokens are missing or empty.
 * Returns a properly typed config object.
 */
function ensureTokensInCommunityConfig(communityConfig: unknown): Record<string, unknown> {
  if (!communityConfig || typeof communityConfig !== 'object') {
    return { tokens: getDefaultTokens() };
  }

  const config = communityConfig as Record<string, unknown>;
  const tokens = config.tokens as CommunityTokensConfig | undefined;

  // Type-safe check: ensure tokens exist and have at least one token
  const hasTokens = tokens && (
    (Array.isArray(tokens.erc20Tokens) && tokens.erc20Tokens.length > 0) ||
    (Array.isArray(tokens.nftTokens) && tokens.nftTokens.length > 0)
  );

  if (!hasTokens) {
    // Add default fallback tokens
    return {
      ...config,
      tokens: getDefaultTokens(),
    };
  }

  return config;
}


export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const incomingConfig: IncomingCommunityConfig | undefined = body?.community_config;

    if (!incomingConfig || typeof incomingConfig !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Missing community_config payload' },
        { status: 400 }
      );
    }

    const {
      community_id: communityId,
      admin_address: adminAddress,
      domain,
      custom_domain: customDomainInput,
      admin_email: adminEmail,
      custom_domain_authorized: customDomainAuthorized,
      brand_config: brandConfig,
      assets_config: assetsConfig,
      community_config: communityDetails,
      fidgets_config: fidgetsConfig,
      navigation_config: navigationConfig,
      ui_config: uiConfig,
      is_published: isPublished,
    } = incomingConfig;

    if (!communityId) {
      return NextResponse.json(
        { success: false, error: 'community_id is required' },
        { status: 400 }
      );
    }

    if (!brandConfig || !assetsConfig || !communityDetails || !fidgetsConfig) {
      return NextResponse.json(
        {
          success: false,
          error: 'brand_config, assets_config, community_config, and fidgets_config are required',
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const rawCustomDomain =
      typeof customDomainInput === 'string' && customDomainInput.trim()
        ? customDomainInput
        : typeof domain === 'string' && domain.trim()
          ? domain
          : null;
    const normalizedCustomDomain = normalizeAndValidateDomain(rawCustomDomain);
    const normalizedCommunityDomain = normalizeAndValidateDomain(communityId);

    if (rawCustomDomain && !normalizedCustomDomain) {
      return NextResponse.json(
        { success: false, error: 'Invalid custom domain provided' },
        { status: 400 }
      );
    }

    if (normalizedCustomDomain && normalizedCustomDomain.endsWith('.blank.space')) {
      return NextResponse.json(
        { success: false, error: 'Custom domain cannot be a blank.space subdomain' },
        { status: 400 }
      );
    }

    if (
      normalizedCustomDomain &&
      normalizedCommunityDomain &&
      normalizedCommunityDomain.endsWith('.blank.space') &&
      normalizedCustomDomain === normalizedCommunityDomain
    ) {
      return NextResponse.json(
        { success: false, error: 'Custom domain must be different from the blank.space subdomain' },
        { status: 400 }
      );
    }

    if (normalizedCustomDomain) {
      const { data: existingDomain } = await supabase
        .from('community_domains')
        .select('community_id')
        .eq('domain', normalizedCustomDomain)
        .maybeSingle();

      if (existingDomain?.community_id && existingDomain.community_id !== communityId) {
        return NextResponse.json(
          { success: false, error: 'Custom domain is already in use by another community' },
          { status: 409 }
        );
      }
    }

    if (normalizedCommunityDomain) {
      const { data: existingBlankDomain } = await supabase
        .from('community_domains')
        .select('community_id')
        .eq('domain', normalizedCommunityDomain)
        .maybeSingle();

      if (existingBlankDomain?.community_id && existingBlankDomain.community_id !== communityId) {
        return NextResponse.json(
          { success: false, error: 'Blank.space subdomain is already in use by another community' },
          { status: 409 }
        );
      }
    }

    type CommunityConfigInsert = Database['public']['Tables']['community_configs']['Insert'];

    // Ensure tokens are present in community_config (add fallback if missing)
    const communityConfigWithTokens = ensureTokensInCommunityConfig(communityDetails);

    const normalizedCommunityDetails =
      communityConfigWithTokens && typeof communityConfigWithTokens === 'object'
        ? {
            ...(communityConfigWithTokens as Record<string, unknown>),
            ...(adminAddress ? { admin_address: adminAddress } : {}),
            ...(normalizedCustomDomain ? { domain: normalizedCustomDomain } : {}),
          }
        : communityConfigWithTokens;

    const upsertPayload: CommunityConfigInsert = {
      community_id: communityId,
      brand_config: brandConfig as CommunityConfigInsert['brand_config'],
      assets_config: assetsConfig as CommunityConfigInsert['assets_config'],
      community_config: normalizedCommunityDetails as CommunityConfigInsert['community_config'],
      fidgets_config: fidgetsConfig as CommunityConfigInsert['fidgets_config'],
      navigation_config: (navigationConfig ?? null) as CommunityConfigInsert['navigation_config'],
      ui_config: (uiConfig ?? null) as CommunityConfigInsert['ui_config'],
      is_published: isPublished ?? true,
    };

    if (typeof customDomainAuthorized === 'boolean') {
      upsertPayload.custom_domain_authorized = customDomainAuthorized;
    }

    if (typeof adminEmail === 'string' && adminEmail.trim()) {
      upsertPayload.admin_email = adminEmail.trim();
    }

    const { data, error } = await supabase
      .from('community_configs')
      .upsert(upsertPayload, { onConflict: 'community_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting community config:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save community config' },
        { status: 500 }
      );
    }

    const domainRows: Array<{
      community_id: string;
      domain: string;
      domain_type: string;
      updated_at: string;
    }> = [];

    if (normalizedCommunityDomain) {
      domainRows.push({
        community_id: communityId,
        domain: normalizedCommunityDomain,
        domain_type: normalizedCommunityDomain.endsWith('.blank.space')
          ? 'blank_subdomain'
          : 'custom',
        updated_at: new Date().toISOString(),
      });
    }

    if (normalizedCustomDomain) {
      domainRows.push({
        community_id: communityId,
        domain: normalizedCustomDomain,
        domain_type: 'custom',
        updated_at: new Date().toISOString(),
      });
    }

    if (domainRows.length > 0) {
      const { error: domainError } = await supabase
        .from('community_domains')
        .upsert(domainRows, { onConflict: 'community_id,domain_type' });

      if (domainError) {
        console.error('Error upserting community domain mappings:', domainError);
        return NextResponse.json(
          { success: false, error: 'Failed to save community domain mappings' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof SyntaxError || (error as { name?: string })?.name === 'SyntaxError') {
      console.error('community-config POST JSON parse error:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    console.error('community-config POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
