import { CompleteFidgets } from "@/fidgets";
import { 
  FidgetOption, 
  StaticFidgetOption, 
  CuratedFidgetOption, 
  MiniAppFidgetOption,
  FidgetCategory,
  FidgetSearchFilters,
  FidgetOptionsResponse 
} from "@/common/types/fidgetOptions";
import { CURATED_SITES } from "@/common/data/curated/curatedSites";
import { NeynarMiniAppService } from "./neynarMiniAppService";

// Default categories configuration
const DEFAULT_CATEGORIES: FidgetCategory[] = [
  {
    id: 'social',
    name: 'Social',
    icon: '👥',
    description: 'Connect and engage with others',

    order: 1
  },
  {
    id: 'defi',
    name: 'DeFi',
    icon: '💰',
    description: 'Decentralized finance tools',

    order: 2
  },
  {
    id: 'content',
    name: 'Content',
    icon: '🎨',
    description: 'Images, videos, and creative content',

    order: 3
  },
  {
    id: 'tools',
    name: 'Tools',
    icon: '🔧',
    description: 'Utility fidgets and productivity tools',

    order: 4
  },
  {
    id: 'games',
    name: 'Games',
    icon: '🎮',
    description: 'Entertainment and gaming',

    order: 5
  },
  {
    id: 'mini-apps',
    name: 'Mini Apps',
    icon: '📦',
    description: 'Mini apps from Farcaster',

    order: 99
  }
];

export class FidgetOptionsService {
  private static instance: FidgetOptionsService;
  private miniAppsCache: MiniAppFidgetOption[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private neynarService: NeynarMiniAppService;

  static getInstance(): FidgetOptionsService {
    if (!FidgetOptionsService.instance) {
      FidgetOptionsService.instance = new FidgetOptionsService();
    }
    return FidgetOptionsService.instance;
  }

  private constructor() {
    this.neynarService = NeynarMiniAppService.getInstance();
  }

  // Get all static fidgets from CompleteFidgets
  private getStaticFidgets(): StaticFidgetOption[] {
    const staticFidgets: StaticFidgetOption[] = [];
    
    Object.entries(CompleteFidgets).forEach(([key, fidgetModule]) => {
      if (fidgetModule) {
        // Map to simplified core categories
        let primaryCategory = 'tools'; // default
        const specificTags: string[] = [];
        
        switch (key) {
          // Social
          case 'feed':
          case 'cast':
          case 'frame':
          case 'chat':
          case 'profile':
          case 'top8':
          case 'BuilderScore':
            primaryCategory = 'social';
            specificTags.push('farcaster');
            if (key === 'BuilderScore') {
              specificTags.push('talent protocol', 'builder score');
            }
            break;
            
          // DeFi
          case 'swap':
          case 'market':
          case 'portfolio':
          case 'Levr':
          case 'EmpireBuilder':
            primaryCategory = 'defi';
            specificTags.push('token');
            break;
            
          // Content
          case 'gallery':
          case 'text':
          case 'video':
          case 'nounsHome':
            primaryCategory = 'content';
            break;
            
          // Governance
          case 'governance':
          case 'snapshot':
            primaryCategory = 'governance';
            break;
            
          // Tools
          case 'iframe':
          case 'links':
          case 'rss':
          case 'FramesV2':
            primaryCategory = 'tools';
            break;
            
          // Games (if any game-related fidgets are added in the future)
          // case 'game':
          //   primaryCategory = 'games';
          //   break;
            
          // Mini Apps (handled separately via Farcaster API)
          // This is for external mini-apps, not static fidgets
            
          default:
            primaryCategory = 'tools';
            specificTags.push('utility');
        }
        
        if (key === 'nounsHome') {
          specificTags.push('nouns', 'auction');
        }
        // Add the fidget type as a specific tag
        specificTags.push(key);
        
        // Combine tags: primary category + specific tags
        const allTags = [primaryCategory, ...specificTags];
        
        staticFidgets.push({
          id: `static-${key}`,
          type: 'static',
          fidgetType: key,
          name: fidgetModule.properties.fidgetName,
          description: `${fidgetModule.properties.fidgetName} fidget`,
          icon: String.fromCodePoint(fidgetModule.properties.icon),
          tags: allTags,
          category: primaryCategory,
          popularity: ['feed', 'cast', 'gallery', 'text'].includes(key) ? 100 : 50
        });
      }
    });

    return staticFidgets;
  }

  // Get curated iframe sites
  private getCuratedSites(): CuratedFidgetOption[] {
    return CURATED_SITES.map((site, index) => ({
      ...site,
      id: `curated-${index}`
    }));
  }

  // Fetch mini-apps from discovery service (which now includes Farcaster API)
  private async fetchMiniApps(): Promise<MiniAppFidgetOption[]> {
    try {
      // Get all Mini Apps from the discovery service (which now includes Farcaster API)
      const discoveredApps = await this.neynarService.toFidgetOptions();
      
      console.log(`📱 Fetched ${discoveredApps.length} Mini Apps from discovery service`);
      
      return discoveredApps;
    } catch (error) {
      console.error('Error fetching mini-apps from discovery service:', error);
      return [];
    }
  }

  // Get cached mini-apps or fetch if cache is expired
  private async getMiniApps(): Promise<MiniAppFidgetOption[]> {
    const now = Date.now();
    if (this.miniAppsCache && now < this.cacheExpiry) {
      return this.miniAppsCache;
    }

    this.miniAppsCache = await this.fetchMiniApps();
    this.cacheExpiry = now + this.CACHE_DURATION;
    return this.miniAppsCache;
  }

  // Filter options based on search criteria
  private filterOptions(options: FidgetOption[], filters: FidgetSearchFilters): FidgetOption[] {
    let filtered = options;

    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(option => 
        option.name.toLowerCase().includes(query) ||
        option.description.toLowerCase().includes(query) ||
        option.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (filters.category) {
      filtered = filtered.filter(option => option.category === filters.category);
    }

    if (filters.type) {
      filtered = filtered.filter(option => option.type === filters.type);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(option => 
        filters.tags!.some(tag => option.tags.includes(tag))
      );
    }



    return filtered;
  }

  // Get immediate/local options (static fidgets + curated sites)
  getLocalFidgetOptions(filters: FidgetSearchFilters = {}): FidgetOptionsResponse {
    const staticFidgets = this.getStaticFidgets();
    const curatedSites = this.getCuratedSites();

    const localOptions: FidgetOption[] = [
      ...staticFidgets,
      ...curatedSites
    ];

    // Sort by popularity (desc) then by name (asc)
    localOptions.sort((a, b) => {
      if (a.popularity !== b.popularity) {
        return (b.popularity || 0) - (a.popularity || 0);
      }
      return a.name.localeCompare(b.name);
    });

    const filteredOptions = this.filterOptions(localOptions, filters);

    return {
      options: filteredOptions,
      categories: DEFAULT_CATEGORIES,
      total: filteredOptions.length,
      hasMore: true // Mini apps are still loading
    };
  }

  // Main method to get all fidget options (includes async mini apps)
  async getFidgetOptions(filters: FidgetSearchFilters = {}): Promise<FidgetOptionsResponse> {
    const [staticFidgets, curatedSites, miniApps] = await Promise.all([
      Promise.resolve(this.getStaticFidgets()),
      Promise.resolve(this.getCuratedSites()),
      this.getMiniApps()
    ]);

    const allOptions: FidgetOption[] = [
      ...staticFidgets,
      ...curatedSites,
      ...miniApps
    ];

    // Deduplicate by name (case-insensitive) and URL
    const seenNames = new Set<string>();
    const seenUrls = new Set<string>();
    const duplicates: string[] = [];
    const deduplicatedOptions = allOptions.filter(option => {
      const normalizedName = option.name.toLowerCase().trim();
      
      // Check for duplicate name (case-insensitive)
      if (seenNames.has(normalizedName)) {
        duplicates.push(option.name);
        return false;
      }
      
      // Check for duplicate URL (for curated sites and mini-apps)
      if ('url' in option && option.url && typeof option.url === 'string') {
        const normalizedUrl = option.url.toLowerCase().trim();
        if (seenUrls.has(normalizedUrl)) {
          duplicates.push(option.name);
          return false;
        }
        seenUrls.add(normalizedUrl);
      }
      
      // Also check frameUrl for mini-apps
      if ('frameUrl' in option && option.frameUrl && typeof option.frameUrl === 'string') {
        const normalizedFrameUrl = option.frameUrl.toLowerCase().trim();
        if (seenUrls.has(normalizedFrameUrl)) {
          duplicates.push(option.name);
          return false;
        }
        seenUrls.add(normalizedFrameUrl);
      }
      
      seenNames.add(normalizedName);
      return true;
    });

    // Log duplicates found for debugging
    if (duplicates.length > 0) {
      console.log('Duplicate fidget options removed:', duplicates);
    }

    // Sort by popularity (desc) then by name (asc)
    deduplicatedOptions.sort((a, b) => {
      if (a.popularity !== b.popularity) {
        return (b.popularity || 0) - (a.popularity || 0);
      }
      return a.name.localeCompare(b.name);
    });

    const filteredOptions = this.filterOptions(deduplicatedOptions, filters);

    return {
      options: filteredOptions,
      categories: DEFAULT_CATEGORIES,
      total: filteredOptions.length,
      hasMore: false // For future pagination
    };
  }

  // Search across all fidget types (local + remote)
  async searchFidgetOptions(query: string, filters: FidgetSearchFilters = {}): Promise<FidgetOptionsResponse> {
    if (!query.trim()) {
      // If no query, return regular options
      return this.getFidgetOptions(filters);
    }

    try {
      // Get local options (static + curated) and search through them
      const staticFidgets = this.getStaticFidgets();
      const curatedSites = this.getCuratedSites();
      
      const localOptions: FidgetOption[] = [
        ...staticFidgets,
        ...curatedSites
      ];

      // Search local options
      const normalizedQuery = query.toLowerCase();
      const matchingLocalOptions = localOptions.filter(option => {
        const tagMatch = option.tags.some(tag => tag.toLowerCase().includes(normalizedQuery));
        if (tagMatch) return true;

        return option.name.toLowerCase().includes(normalizedQuery) ||
               option.description.toLowerCase().includes(normalizedQuery);
      });

      // Search remote mini-apps using Neynar search API
      const searchResults = await this.neynarService.searchMiniApps(query, 50);
      const miniAppOptions = this.convertMiniAppsToFidgetOptions(searchResults);

      // Combine results
      const allOptions: FidgetOption[] = [
        ...matchingLocalOptions,
        ...miniAppOptions
      ];

      // Deduplicate by name (case-insensitive) and URL
      const seenNames = new Set<string>();
      const seenUrls = new Set<string>();
      const deduplicatedOptions = allOptions.filter(option => {
        const normalizedName = option.name.toLowerCase().trim();
        
        // Check for duplicate name (case-insensitive)
        if (seenNames.has(normalizedName)) {
          return false;
        }
        
        // Check for duplicate URL (for curated sites and mini-apps)
        if ('url' in option && option.url && typeof option.url === 'string') {
          const normalizedUrl = option.url.toLowerCase().trim();
          if (seenUrls.has(normalizedUrl)) {
            return false;
          }
          seenUrls.add(normalizedUrl);
        }
        
        // Also check frameUrl for mini-apps
        if ('frameUrl' in option && option.frameUrl && typeof option.frameUrl === 'string') {
          const normalizedFrameUrl = option.frameUrl.toLowerCase().trim();
          if (seenUrls.has(normalizedFrameUrl)) {
            return false;
          }
          seenUrls.add(normalizedFrameUrl);
        }
        
        seenNames.add(normalizedName);
        return true;
      });

      // Sort by popularity (desc) then by name (asc)
      deduplicatedOptions.sort((a, b) => {
        if (a.popularity !== b.popularity) {
          return (b.popularity || 0) - (a.popularity || 0);
        }
        return a.name.localeCompare(b.name);
      });

      const filteredOptions = this.filterOptions(deduplicatedOptions, filters);

      return {
        options: filteredOptions,
        categories: DEFAULT_CATEGORIES,
        total: filteredOptions.length,
        hasMore: false,
        searchQuery: query,
      };
    } catch (error) {
      console.error('Error searching fidget options:', error);
      
      // Fallback to local search only
      return this.getLocalFidgetOptions(filters);
    }
  }

  // Helper method to convert mini apps to fidget options
  private convertMiniAppsToFidgetOptions(miniApps: any[]): MiniAppFidgetOption[] {
    return miniApps.map(app => {
      const mappedCategory = this.mapToNounspaceCategory(app);
      const enhancedTags = this.generateEnhancedTags(app, mappedCategory);
      
      return {
        id: `neynar-search-${app.domain}`,
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
        metadata: app.metadata,
        lastFetched: app.lastFetched,
      };
    });
  }

  // Helper methods from neynar service
  private mapToNounspaceCategory(app: any): string {
    const category = app.category?.toLowerCase();
    const tags = app.tags?.map((tag: string) => tag.toLowerCase()) || [];
    
    // Category mapping logic
    if (category === 'social' || tags.some(tag => ['social', 'farcaster', 'chat'].includes(tag))) {
      return 'social';
    }
    if (category === 'defi' || tags.some(tag => ['defi', 'swap', 'trading', 'lending'].includes(tag))) {
      return 'defi';
    }
    if (category === 'games' || tags.some(tag => ['game', 'gaming', 'play'].includes(tag))) {
      return 'games';
    }
    if (category === 'tools' || tags.some(tag => ['tool', 'utility', 'analytics'].includes(tag))) {
      return 'tools';
    }
    if (category === 'governance' || tags.some(tag => ['governance', 'voting', 'dao'].includes(tag))) {
      return 'governance';
    }
    if (tags.some(tag => ['nft', 'art', 'creative', 'content'].includes(tag))) {
      return 'content';
    }
    
    return 'mini-apps';
  }

  private generateEnhancedTags(app: any, category: string): string[] {
    const tags = new Set<string>();
    
    // Add the mapped category
    tags.add(category);
    
    // Add original tags
    if (app.tags) {
      app.tags.forEach((tag: string) => tags.add(tag.toLowerCase()));
    }
    
    // Add mini-apps tag for all
    tags.add('mini-apps');
    
    return Array.from(tags);
  }

  private calculatePopularity(app: any): number {
    return app.engagement?.followerCount || 0;
  }

  // Get categories only
  getCategories(): FidgetCategory[] {
    return DEFAULT_CATEGORIES;
  }

  // Clear cache (for testing/refresh)
  clearCache(): void {
    this.miniAppsCache = null;
    this.cacheExpiry = 0;
  }
} 