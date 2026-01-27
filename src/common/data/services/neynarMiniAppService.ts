// Pure API integration - no database dependencies
import { isMiniAppApproved } from "@/common/data/constants/approvedMiniApps";

export interface NeynarMiniAppManifest {
  version: string;
  name: string;
  home_url: string;
  icon_url: string;
  image_url?: string;
  button_title?: string;
  splash_image_url?: string;
  splash_background_color?: string;
  webhook_url?: string;
  subtitle?: string;
  description?: string;
  screenshot_urls?: string[];
  primary_category?: string;
  tags?: string[];
  hero_image_url?: string;
  tagline?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  noindex?: boolean;
}

export interface NeynarMiniApp {
  version: string;
  image: string;
  frames_url: string;
  title: string;
  manifest: {
    account_association?: {
      header: string;
      payload: string;
      signature: string;
    };
    frame?: NeynarMiniAppManifest;
    miniapp?: NeynarMiniAppManifest;
  };
  author: {
    object: string;
    fid: number;
    username: string;
    display_name: string;
    pfp_url?: string;
    follower_count: number;
    following_count: number;
    power_badge: boolean;
    verified_addresses?: {
      eth_addresses: string[];
      sol_addresses: string[];
    };
  };
  metadata: {
    html?: Record<string, any>;
  };
}

export interface NeynarCatalogResponse {
  frames: NeynarMiniApp[];
  next?: {
    cursor: string;
  };
}

export interface MiniAppFilters {
  categories?: string[];
  networks?: string[];
  timeWindow?: '1h' | '6h' | '12h' | '24h' | '7d';
  limit?: number;
  cursor?: string;
}

export interface ProcessedMiniApp {
  id: string;
  domain: string;
  name: string;
  description?: string;
  iconUrl: string;
  homeUrl: string;
  category?: string;
  tags: string[];
  author: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl?: string;
    isPowerUser: boolean;
  };
  engagement: {
    followerCount: number;
    isPowerBadge: boolean;
  };
  metadata: {
    version: string;
    buttonTitle?: string;
    screenshots?: string[];
    heroImage?: string;
    tagline?: string;
  };
  lastFetched: Date;
}

export class NeynarMiniAppService {
  private static instance: NeynarMiniAppService;
  private apiKey: string;
  private baseUrl = 'https://api.neynar.com/v2/farcaster/frame/catalog';
  private cache: Map<string, { data: ProcessedMiniApp[]; timestamp: number }> = new Map();
  private cacheTimeout = 15 * 60 * 1000; // 15 minutes

  private constructor() {
    this.apiKey = process.env.NEYNAR_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('NEYNAR_API_KEY not found. Mini app discovery will not work.');
    }
  }

  static getInstance(): NeynarMiniAppService {
    if (!NeynarMiniAppService.instance) {
      NeynarMiniAppService.instance = new NeynarMiniAppService();
    }
    return NeynarMiniAppService.instance;
  }

  /**
   * Check if running in browser environment
   */
  private isClientSide(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Fetch mini apps from Neynar catalog with optional filters
   */
  async fetchMiniApps(filters: MiniAppFilters = {}): Promise<ProcessedMiniApp[]> {
    const cacheKey = JSON.stringify(filters);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // If running on client-side, use our internal API
      if (this.isClientSide()) {
        return this.fetchFromInternalAPI(filters);
      }

      // Server-side: make direct call to Neynar
      const url = new URL(this.baseUrl);
      
      // Add query parameters
      if (filters.limit) url.searchParams.set('limit', filters.limit.toString());
      if (filters.cursor) url.searchParams.set('cursor', filters.cursor);
      if (filters.timeWindow) url.searchParams.set('time_window', filters.timeWindow);
      if (filters.categories?.length) {
        url.searchParams.set('categories', filters.categories.join(','));
      }
      if (filters.networks?.length) {
        url.searchParams.set('networks', filters.networks.join(','));
      }

      const response = await fetch(url.toString(), {
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Neynar API error: ${response.status} ${response.statusText}`);
      }

      const data: NeynarCatalogResponse = await response.json();
      const processedApps = this.processNeynarApps(data.frames);

      // Cache the results
      this.cache.set(cacheKey, {
        data: processedApps,
        timestamp: Date.now(),
      });

      return processedApps;
    } catch (error) {
      console.error('Error fetching from Neynar catalog:', error);
      
      // Return empty array on error since we don't have database fallback
      return [];
    }
  }

  /**
   * Fetch mini apps from our internal API (client-side)
   */
  private async fetchFromInternalAPI(filters: MiniAppFilters = {}): Promise<ProcessedMiniApp[]> {
    const cacheKey = JSON.stringify(filters);
    const url = new URL('/api/miniapp-discovery', window.location.origin);
    
    // Add query parameters
    if (filters.limit) url.searchParams.set('limit', filters.limit.toString());
    if (filters.timeWindow) url.searchParams.set('timeWindow', filters.timeWindow);
    if (filters.categories?.length) {
      url.searchParams.set('category', filters.categories[0]); // API expects single category
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Internal API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'API returned unsuccessful response');
    }

    // Convert the API response format to our internal format
    const processedApps = data.apps.map((app: any) => ({
      id: app.id,
      domain: app.domain,
      name: app.name,
      iconUrl: app.iconUrl,
      homeUrl: app.homeUrl,
      description: app.description,
      category: app.category,
      tags: app.tags || [],
      author: app.author,
      engagement: {
        followerCount: app.author.followerCount || 0,
      },
      lastFetched: new Date(app.lastFetched),
      metadata: app.metadata || {},
    }));

    // Cache the results
    this.cache.set(cacheKey, {
      data: processedApps,
      timestamp: Date.now(),
    });

    return processedApps;
  }

  /**
   * Get trending mini apps with time window
   */
  async getTrendingMiniApps(
    timeWindow: '1h' | '6h' | '12h' | '24h' | '7d' = '7d',
    limit: number = 50
  ): Promise<ProcessedMiniApp[]> {
    return this.fetchMiniApps({ timeWindow, limit });
  }

  /**
   * Get mini apps by category
   */
  async getMiniAppsByCategory(
    categories: string[],
    limit: number = 50
  ): Promise<ProcessedMiniApp[]> {
    return this.fetchMiniApps({ categories, limit });
  }

  /**
   * Get mini apps by blockchain network
   */
  async getMiniAppsByNetwork(
    networks: string[],
    limit: number = 50
  ): Promise<ProcessedMiniApp[]> {
    return this.fetchMiniApps({ networks, limit });
  }

  /**
   * Search mini apps using Neynar's search endpoint
   */
  async searchMiniApps(query: string, limit: number = 50): Promise<ProcessedMiniApp[]> {
    if (!query.trim()) {
      return [];
    }

    const cacheKey = `search:${query}:${limit}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // If running on client-side, use our internal API
      if (this.isClientSide()) {
        return this.searchFromInternalAPI(query, limit);
      }

      // Server-side: make direct call to Neynar search endpoint
      const url = new URL('https://api.neynar.com/v2/farcaster/frame/search/');
      url.searchParams.set('q', query);
      url.searchParams.set('limit', limit.toString());

      const response = await fetch(url.toString(), {
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Neynar search API error: ${response.status} ${response.statusText}`);
      }

      const data: NeynarCatalogResponse = await response.json();
      const processedApps = this.processNeynarApps(data.frames);

      // Cache the results
      this.cache.set(cacheKey, {
        data: processedApps,
        timestamp: Date.now(),
      });

      return processedApps;
    } catch (error) {
      console.error('Error searching Neynar mini apps:', error);
      
      // Fallback to local search
      return this.searchLocalCache(query);
    }
  }

  /**
   * Search mini apps from our internal API (client-side)
   */
  private async searchFromInternalAPI(query: string, limit: number = 50): Promise<ProcessedMiniApp[]> {
    const url = new URL('/api/miniapp-discovery', window.location.origin);
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'search',
        query: query,
        limit: limit,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Internal search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Search API returned unsuccessful response');
    }

    // Convert the API response format to our internal format
    return data.results.map((app: any) => ({
      id: app.id,
      domain: app.domain,
      name: app.name,
      iconUrl: app.iconUrl,
      homeUrl: app.homeUrl,
      description: app.description,
      category: app.category,
      tags: app.tags || [],
      author: app.author,
      engagement: {
        followerCount: app.author.followerCount || 0,
      },
      lastFetched: new Date(app.lastFetched),
      metadata: app.metadata || {},
    }));
  }

  /**
   * Fallback local search in cached results
   */
  private async searchLocalCache(query: string): Promise<ProcessedMiniApp[]> {
    const allApps = await this.fetchMiniApps({ limit: 100 });
    
    const normalizedQuery = query.toLowerCase();
    return allApps.filter(app => 
      app.name.toLowerCase().includes(normalizedQuery) ||
      app.description?.toLowerCase().includes(normalizedQuery) ||
      app.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
    );
  }

  /**
   * Convert to fidget options format for compatibility
   */
  async toFidgetOptions(): Promise<any[]> {
    const miniApps = await this.fetchMiniApps({ limit: 100 });
    
    return miniApps.map(app => {
      const mappedCategory = this.mapToNounspaceCategory(app);
      const enhancedTags = this.generateEnhancedTags(app, mappedCategory);
      const isApproved = isMiniAppApproved(app.domain);
      
      return {
        id: `neynar-miniapp-${app.domain}`,
        type: 'miniapp',
        name: app.name,
        description: app.description || `Mini app by ${app.author.displayName}`,
        icon: app.iconUrl,
        tags: enhancedTags,
        category: mappedCategory,
        frameUrl: app.homeUrl,
        homeUrl: app.homeUrl,
        domain: app.domain,
        buttonTitle: app.metadata.buttonTitle || 'Open',
        imageUrl: app.metadata.heroImage || app.iconUrl,
        popularity: this.calculatePopularity(app),
        author: app.author.username,
        verified: isApproved, // Check against approved list
      };
    });
  }

  /**
   * Map Neynar categories to Nounspace category system
   */
  private mapToNounspaceCategory(app: ProcessedMiniApp): string {
    const neynarCategory = app.category?.toLowerCase();
    const tags = app.tags.map(tag => tag.toLowerCase());
    const description = app.description?.toLowerCase() || '';
    const name = app.name.toLowerCase();
    
    // Helper function to check for keywords across tags, description, and name
    const hasKeyword = (keywords: string[]) => 
      tags.some(tag => keywords.some(keyword => tag.includes(keyword))) ||
      keywords.some(keyword => description.includes(keyword)) ||
      keywords.some(keyword => name.includes(keyword));
    
    // Tag-based analysis (prioritized over Neynar category for better accuracy)
    if (hasKeyword(['game', 'gaming', 'play', 'battle', 'league', 'mech', 'versus', 'fight'])) return 'games';
    if (hasKeyword(['defi', 'finance', 'trading', 'swap', 'token', 'coin', 'money', 'pay'])) return 'defi';
    if (hasKeyword(['tool', 'utility', 'productivity', 'earn', 'discover', 'qr', 'scan'])) return 'tools';
    if (hasKeyword(['art', 'content', 'media', 'nft', 'create', 'design'])) return 'content';
    if (hasKeyword(['governance', 'voting', 'dao', 'proposal', 'vote'])) return 'governance';
    if (hasKeyword(['donate', 'impact', 'charity', 'public', 'social-impact'])) return 'social-impact';
    
    // Direct Neynar category mapping (fallback after tag analysis)
    if (neynarCategory) {
      switch (neynarCategory) {
        case 'games':
        case 'gaming':
          return 'games';
        case 'social':
        case 'community':
          return 'social';
        case 'defi':
        case 'finance':
          return 'defi';
        case 'utility':
        case 'tools':
          return 'tools';
        case 'content':
        case 'media':
          return 'content';
        case 'governance':
          return 'governance';
      }
    }
    
    // Social fallback (if no other category matches)
    if (hasKeyword(['social', 'community', 'chat', 'follow', 'friend'])) return 'social';
    
    // Default fallback
    return 'mini-apps';
  }

  /**
   * Generate enhanced tags for better discoverability
   */
  private generateEnhancedTags(app: ProcessedMiniApp, category: string): string[] {
    const tags = new Set<string>();
    
    // Always include core tags
    tags.add('mini-apps');
    tags.add('neynar');
    tags.add('farcaster');
    
    // Add the mapped category
    if (category !== 'mini-apps') {
      tags.add(category);
    }
    
    // Add original Neynar category if different
    if (app.category && app.category.toLowerCase() !== category) {
      tags.add(app.category.toLowerCase());
    }
    
    // Add original app tags (filtered and cleaned)
    app.tags.forEach(tag => {
      const cleanTag = tag.toLowerCase().trim();
      if (cleanTag && cleanTag !== 'miniapp' && cleanTag.length > 1) {
        tags.add(cleanTag);
      }
    });
    
    // Add author-based tags if power user
    if (app.author.isPowerUser) {
      tags.add('verified');
    }
    
    // Add engagement-based tags
    if (app.engagement.followerCount > 10000) {
      tags.add('popular');
    }
    
    return Array.from(tags);
  }

  /**
   * Process raw Neynar apps into our format
   */
  private processNeynarApps(neynarApps: NeynarMiniApp[]): ProcessedMiniApp[] {
    return neynarApps.map(app => {
      const manifest = app.manifest.miniapp || app.manifest.frame;
      const domain = this.extractDomain(manifest?.home_url || app.frames_url);
      
      return {
        id: `neynar-${domain}-${app.author.fid}`,
        domain,
        name: manifest?.name || app.title,
        description: manifest?.description,
        iconUrl: manifest?.icon_url || app.image,
        homeUrl: manifest?.home_url || app.frames_url,
        category: manifest?.primary_category,
        tags: manifest?.tags || [],
        author: {
          fid: app.author.fid,
          username: app.author.username,
          displayName: app.author.display_name,
          pfpUrl: app.author.pfp_url,
          isPowerUser: app.author.power_badge,
        },
        engagement: {
          followerCount: app.author.follower_count,
          isPowerBadge: app.author.power_badge,
        },
        metadata: {
          version: manifest?.version || app.version,
          buttonTitle: manifest?.button_title,
          screenshots: manifest?.screenshot_urls,
          heroImage: manifest?.hero_image_url,
          tagline: manifest?.tagline,
        },
        lastFetched: new Date(),
      };
    });
  }

  /**
   * Calculate popularity score based on author engagement
   */
  private calculatePopularity(app: ProcessedMiniApp): number {
    let score = 50; // Base score
    
    // Follower count contribution (up to 30 points)
    score += Math.min(30, Math.floor(app.engagement.followerCount / 1000));
    
    // Power badge bonus
    if (app.engagement.isPowerBadge) {
      score += 20;
    }
    
    return Math.min(100, score);
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }



  /**
   * Get service statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      hasApiKey: !!this.apiKey,
      cacheTimeout: this.cacheTimeout,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}