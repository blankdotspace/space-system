/**
 * Nouns community configuration
 * 
 * This file defines all data needed to seed the Nouns community:
 * - Database config (brand, assets, community, fidgets, navigation, ui)
 * - Explore page parameters (tokens, channel)
 * - Asset mappings for ImgBB upload
 */

import type { ExplorePageOptions, TokenInput } from '../../lib/explore-config';

// ============================================================================
// Asset Configuration
// ============================================================================

export const nounsAssets = {
  directory: 'nouns', // Relative to scripts/seed-data/assets/
  files: [
    { file: 'logo.svg', key: 'main' },
    { file: 'noggles.svg', key: 'icon' },
    { file: 'og.svg', key: 'og' },
    { file: 'splash.svg', key: 'splash' },
  ],
  fallbackPrefix: '/images/nouns',
  // Static paths (not uploaded to ImgBB)
  static: {
    favicon: '/images/favicon.ico',
    appleTouch: '/images/apple-touch-icon.png',
  },
};

// ============================================================================
// Explore Page Configuration
// ============================================================================

export const nounsExploreTokens: TokenInput[] = [
  {
    address: '0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab',
    symbol: '$SPACE',
    network: 'base',
    assetType: 'token',
  },
  {
    address: '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03',
    symbol: 'Nouns',
    network: 'eth',
    assetType: 'nft',
  },
];

export const nounsExploreOptions: ExplorePageOptions = {
  tokens: nounsExploreTokens,
  channel: 'nouns',
  defaultTokenNetwork: 'mainnet',
  channelNetwork: 'base',
};

// ============================================================================
// Database Configuration
// ============================================================================

/**
 * Creates the Nouns community config for database insertion
 * @param assetUrls - URLs from ImgBB upload (or fallbacks)
 * @param spaceIds - Space IDs for navigation items
 */
export function createNounsCommunityConfig(
  assetUrls: Record<string, string>,
  spaceIds: { home?: string | null; explore?: string | null },
) {
  return {
    community_id: 'nounspace.com',
    is_published: true,
    admin_identity_public_keys: [], // Add admin identityPublicKey values here
    brand_config: {
      displayName: 'Nouns',
      description: 'The social hub for Nouns',
      miniAppTags: ['nouns', 'client', 'customizable', 'social', 'link'],
    },
    assets_config: {
      logos: {
        main: assetUrls.main || '/images/nouns/logo.svg',
        icon: assetUrls.icon || '/images/nouns/noggles.svg',
        favicon: nounsAssets.static.favicon,
        appleTouch: nounsAssets.static.appleTouch,
        og: assetUrls.og || '/images/nouns/og.svg',
        splash: assetUrls.splash || '/images/nouns/splash.svg',
      },
    },
    community_config: {
      type: 'nouns',
      urls: {
        website: 'https://nouns.com',
        discord: 'https://discord.gg/nouns',
      },
      social: {
        farcaster: 'nouns',
      },
      governance: {},
      tokens: {
        erc20Tokens: [
          {
            address: '0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab',
            symbol: '$SPACE',
            decimals: 18,
            network: 'base',
          },
        ],
        nftTokens: [
          {
            address: '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03',
            symbol: 'Nouns',
            type: 'erc721',
            network: 'eth',
          },
        ],
      },
    },
    fidgets_config: {
      enabled: [
        'nounsHome',
        'governance',
        'feed',
        'cast',
        'gallery',
        'text',
        'iframe',
        'links',
        'video',
        'channel',
        'profile',
        'snapshot',
        'swap',
        'rss',
        'market',
        'portfolio',
        'chat',
        'builderScore',
        'framesV2',
      ],
      disabled: ['example'],
    },
    navigation_config: {
      logoTooltip: { text: 'wtf is nouns?', href: 'https://nouns.wtf' },
      items: [
        {
          id: 'home',
          label: 'Home',
          href: '/home',
          icon: 'home',
          spaceId: spaceIds.home || null,
        },
        {
          id: 'explore',
          label: 'Explore',
          href: '/explore',
          icon: 'explore',
          spaceId: spaceIds.explore || null,
        },
        {
          id: 'notifications',
          label: 'Notifications',
          href: '/notifications',
          icon: 'notifications',
          requiresAuth: true,
        },
        {
          id: 'space-token',
          label: '$SPACE',
          href: '/t/base/0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab/Profile',
          icon: 'space',
        },
      ],
      showMusicPlayer: true,
      showSocials: true,
    },
    ui_config: {
      primaryColor: 'rgb(37, 99, 235)',
      primaryHoverColor: 'rgb(29, 78, 216)',
      primaryActiveColor: 'rgb(30, 64, 175)',
      fontColor: 'rgb(15, 23, 42)',
      castButtonFontColor: '#ffffff',
      url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      backgroundColor: 'rgb(255, 255, 255)',
      castButton: {
        backgroundColor: 'rgb(37, 99, 235)',
        hoverColor: 'rgb(29, 78, 216)',
        activeColor: 'rgb(30, 64, 175)',
      },
    },
  };
}

