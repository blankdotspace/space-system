import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/common/data/database/supabase/clients/server';
import { Database } from '@/supabase/database';
import type { CommunityTokensConfig } from '@/config';

interface IncomingCommunityConfig {
  community_id?: string;
  admin_address?: string;
  domain?: string;
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

    type CommunityConfigInsert = Database['public']['Tables']['community_configs']['Insert'];

    // Ensure tokens are present in community_config (add fallback if missing)
    const communityConfigWithTokens = ensureTokensInCommunityConfig(communityDetails);

    const normalizedCommunityDetails =
      communityConfigWithTokens && typeof communityConfigWithTokens === 'object'
        ? {
            ...(communityConfigWithTokens as Record<string, unknown>),
            ...(adminAddress ? { admin_address: adminAddress } : {}),
            ...(domain ? { domain } : {}),
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
