import { NextRequest, NextResponse } from 'next/server';
import { NeynarMiniAppService } from '@/common/data/services/neynarMiniAppService';
import {
  applyBotIdHeaders,
  enforceBotIdProtection,
} from '@/common/utils/botIdProtection';

export async function GET(request: NextRequest): Promise<Response> {
  const botCheck = await enforceBotIdProtection(request);
  if (botCheck instanceof NextResponse) {
    return botCheck;
  }

  const verification = botCheck;
  const respond = (body: unknown, init?: Parameters<typeof NextResponse.json>[1]) => {
    const response = NextResponse.json(body, init);
    applyBotIdHeaders(response, verification);
    return response;
  };

  try {
    const { searchParams } = new URL(request.url);
    const neynarService = NeynarMiniAppService.getInstance();
    
    // Parse query parameters
    const category = searchParams.get('category');
    const categories = category ? [category] : undefined;
    const networks = searchParams.get('networks')?.split(',');
    const timeWindow = searchParams.get('timeWindow') as '1h' | '6h' | '12h' | '24h' | '7d' || '7d';
    const limit = parseInt(searchParams.get('limit') || '50');
    const trending = searchParams.get('trending') === 'true';

    let apps;
    if (trending) {
      apps = await neynarService.getTrendingMiniApps(timeWindow, limit);
    } else if (categories?.length) {
      apps = await neynarService.getMiniAppsByCategory(categories, limit);
    } else if (networks?.length) {
      apps = await neynarService.getMiniAppsByNetwork(networks, limit);
    } else {
      apps = await neynarService.fetchMiniApps({ limit });
    }

    const stats = neynarService.getStats();

    return respond({
      success: true,
      stats: {
        totalDiscovered: apps.length,
        validApps: apps.length,
        isCrawling: false,
        cacheSize: stats.cacheSize,
        hasApiKey: stats.hasApiKey,
      },
      validApps: apps.length,
      apps: apps.slice(0, limit).map(app => ({
        id: app.id,
        domain: app.domain,
        name: app.name,
        iconUrl: app.iconUrl,
        homeUrl: app.homeUrl,
        description: app.description,
        category: app.category,
        tags: app.tags,
        author: {
          username: app.author.username,
          displayName: app.author.displayName,
          fid: app.author.fid,
          isPowerUser: app.author.isPowerUser,
          followerCount: app.engagement.followerCount,
        },
        popularity: app.engagement.followerCount,
        lastFetched: app.lastFetched,
        metadata: app.metadata,
      })),
      filters: {
        categories,
        networks,
        timeWindow,
        trending,
        limit,
      },
    });
  } catch (error) {
    console.error('Error in miniapp-discovery GET:', error);
    return respond(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const botCheck = await enforceBotIdProtection(request);
  if (botCheck instanceof NextResponse) {
    return botCheck;
  }

  const verification = botCheck;
  const respond = (body: unknown, init?: Parameters<typeof NextResponse.json>[1]) => {
    const response = NextResponse.json(body, init);
    applyBotIdHeaders(response, verification);
    return response;
  };

  try {
    const body = await request.json();
    const { action, filters } = body;

    const neynarService = NeynarMiniAppService.getInstance();

    switch (action) {
      case 'refresh': {
        // Clear cache to force fresh data fetch
        neynarService.clearCache();
        const refreshedApps = await neynarService.fetchMiniApps(filters || {});
        return respond({
          success: true,
          message: 'Cache refreshed',
          count: refreshedApps.length,
        });
      }

      case 'search': {
        const { query } = body;
        if (!query) {
          return respond(
            { success: false, error: 'Search query required' },
            { status: 400 },
          );
        }
        const searchResults = await neynarService.searchMiniApps(query);
        return respond({
          success: true,
          results: searchResults,
          count: searchResults.length,
        });
      }

      case 'trending': {
        const { timeWindow = '7d', limit = 50 } = body;
        const trendingApps = await neynarService.getTrendingMiniApps(timeWindow, limit);
        return respond({
          success: true,
          apps: trendingApps,
          count: trendingApps.length,
        });
      }

      case 'discover': {
        // Backward compatibility with existing tests
        const discoveredApps = await neynarService.fetchMiniApps({ limit: 50 });
        return respond({
          success: true,
          message: 'Discovery started',
          count: discoveredApps.length,
        });
      }

      default:
        return respond(
          { success: false, error: 'Invalid action. Supported: refresh, search, trending, discover' },
          { status: 400 },
        );
    }
    
  } catch (error) {
    console.error('Error in miniapp-discovery POST:', error);
    return respond(
      { success: false, error: 'Invalid JSON or server error' },
      { status: 400 },
    );
  }
}
