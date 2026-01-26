import * as React from 'react';

// Base interface for all fidget options
export interface FidgetOption {
  id: string;
  type: 'static' | 'curated' | 'miniapp';
  name: string;
  description: string;
  icon: string | React.ReactNode;
  tags: string[];
  category: string;
  popularity?: number;
  /** Whether this fidget has been verified to work well in Blankspace */
  verified?: boolean;
}

// For existing static fidgets (cast, feed, gallery, etc.)
export interface StaticFidgetOption extends FidgetOption {
  type: 'static';
  fidgetType: string; // References key in CompleteFidgets
}

// For curated iframe-friendly sites
export interface CuratedFidgetOption extends FidgetOption {
  type: 'curated';
  url: string;
  iframeSettings?: {
    allowScripts?: boolean;
    allowPopups?: boolean;
    sandbox?: string;
  };
  previewImage?: string;
}

// For Farcaster mini-apps/frames
export interface MiniAppFidgetOption extends FidgetOption {
  type: 'miniapp';
  frameUrl: string;
  homeUrl?: string;
  domain?: string;
  author?: {
    fid: number;
    displayName: string;
    username: string;
    followerCount?: number;
    followingCount?: number;
    referrerUsername?: string;
    pfp?: {
      url: string;
      verified: boolean;
    };
    profile?: {
      bio?: {
        text: string;
        mentions?: string[];
        channelMentions?: string[];
      };
      location?: {
        placeId: string;
        description: string;
      };
      earlyWalletAdopter?: boolean;
      accountLevel?: string;
      totalEarned?: number;
      url?: string;
      bannerImageUrl?: string;
    };
    viewerContext?: {
      following: boolean;
      followedBy: boolean;
    };
  };
  buttonTitle?: string;
  imageUrl?: string;
  splashImageUrl?: string;
  splashBackgroundColor?: string;
  subtitle?: string;
  screenshotUrls?: string[];
  manifest?: any; // For future PWA-style manifests
}

// Farcaster API response structure
export interface FarcasterFrameApp {
  domain: string;
  name: string;
  iconUrl: string;
  homeUrl: string;
  id: string;
  shortId: string;
  supportsNotifications: boolean;
  imageUrl?: string;
  buttonTitle?: string;
  splashImageUrl?: string;
  splashBackgroundColor?: string;
  subtitle?: string;
  description?: string;
  tagline?: string;
  heroImageUrl?: string;
  primaryCategory?: string;
  tags?: string[];
  screenshotUrls?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  castShareUrl?: string;
  noindex?: boolean;
  requiredChains?: string[];
  requiredCapabilities?: string[];
  viewerContext?: any;
  author: {
    fid: number;
    displayName: string;
    username: string;
    followerCount?: number;
    followingCount?: number;
    referrerUsername?: string;
    pfp?: {
      url: string;
      verified: boolean;
    };
    profile?: {
      bio?: {
        text: string;
        mentions?: string[];
        channelMentions?: string[];
      };
      location?: {
        placeId: string;
        description: string;
      };
      earlyWalletAdopter?: boolean;
      accountLevel?: string;
      totalEarned?: number;
      url?: string;
      bannerImageUrl?: string;
    };
    viewerContext?: {
      following: boolean;
      followedBy: boolean;
    };
  };
}

// Category configuration
export interface FidgetCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  order: number;
}

// Search and filtering
export interface FidgetSearchFilters {
  query?: string;
  category?: string;
  type?: FidgetOption['type'];
  tags?: string[];
}

// Combined response from service
export interface FidgetOptionsResponse {
  options: FidgetOption[];
  categories: FidgetCategory[];
  total: number;
  hasMore: boolean;
  searchQuery?: string; // Optional search query that was used
} 