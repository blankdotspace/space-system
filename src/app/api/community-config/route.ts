import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/common/data/database/supabase/clients/server';

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

    const normalizedCommunityDetails =
      communityDetails && typeof communityDetails === 'object'
        ? {
            ...(communityDetails as Record<string, unknown>),
            ...(adminAddress ? { admin_address: adminAddress } : {}),
            ...(domain ? { domain } : {}),
          }
        : communityDetails;

    const { data, error } = await supabase
      .from('community_configs')
      .upsert(
        {
          community_id: communityId,
          brand_config: brandConfig,
          assets_config: assetsConfig,
          community_config: normalizedCommunityDetails,
          fidgets_config: fidgetsConfig,
          navigation_config: navigationConfig ?? null,
          ui_config: uiConfig ?? null,
          is_published: isPublished ?? true,
        },
        { onConflict: 'community_id' }
      )
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
    console.error('community-config POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid JSON or server error' },
      { status: 400 }
    );
  }
}
