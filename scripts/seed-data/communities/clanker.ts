/**
 * Clanker community configuration
 *
 * This file defines all data needed to seed the Clanker community:
 * - Database config (brand, assets, community, fidgets, navigation, ui)
 * - Asset mappings for Supabase Storage upload
 */

// ============================================================================
// Asset Configuration
// ============================================================================

export const clankerAssets = {
  directory: 'clanker', // Relative to scripts/seed-data/assets/
  files: [
    { file: 'logo.png', key: 'main' },
    // Add more assets here as they become available:
    // { file: 'favicon.ico', key: 'favicon' },
    // { file: 'apple-touch-icon.png', key: 'appleTouch' },
    // { file: 'og.jpg', key: 'og' },
  ],
  fallbackPrefix: '/images/clanker',
};

// ============================================================================
// Database Configuration
// ============================================================================

/**
 * Creates the Clanker community config for database insertion
 * @param assetUrls - URLs from Supabase Storage upload (or fallbacks)
 * @param spaceIds - Space IDs for navigation items
 */
export function createClankerCommunityConfig(
  assetUrls: Record<string, string>,
  spaceIds: { home?: string | null },
) {
  return {
    community_id: 'clanker.space',
    is_published: true,
    admin_identity_public_keys: [],
    brand_config: {
      displayName: 'Clanker',
      description:
        'Explore, launch and trade tokens in the Clanker ecosystem. Create your own tokens and discover trending projects in the community-driven token economy.',
    },
    assets_config: {
      logos: {
        main: assetUrls.main || '/images/clanker/logo.png',
        icon: assetUrls.main || '/images/clanker/logo.png', // Use main logo as icon
        favicon: assetUrls.favicon || '/images/clanker/favicon.ico',
        appleTouch: assetUrls.appleTouch || '/images/clanker/apple-touch-icon.png',
        og: assetUrls.og || '/images/clanker/og.jpg',
        splash: assetUrls.og || '/images/clanker/og.jpg', // Use og as splash
      },
    },
    community_config: {
      type: 'token_platform',
      urls: {
        website: 'https://clanker.world',
        discord: 'https://discord.gg/clanker',
      },
      social: {
        farcaster: 'clanker',
      },
      governance: {},
      tokens: {
        erc20Tokens: [
          {
            address: '0x1bc0c42215582d5a085795f4badbac3ff36d1bcb',
            symbol: '$CLANKER',
            decimals: 18,
            network: 'base',
          },
        ],
        nftTokens: [],
      },
    },
    fidgets_config: {
      enabled: [
        'Market',
        'Portfolio',
        'Swap',
        'feed',
        'cast',
        'gallery',
        'text',
        'iframe',
        'links',
        'Video',
        'Chat',
        'BuilderScore',
        'FramesV2',
        'Rss',
        'SnapShot',
      ],
      disabled: ['nounsHome', 'governance'],
    },
    navigation_config: {
      logoTooltip: { text: 'clanker.world', href: 'https://www.clanker.world' },
      items: [
        {
          id: 'home',
          label: 'Home',
          href: '/home',
          icon: 'home',
          spaceId: spaceIds.home || null,
        },
        {
          id: 'notifications',
          label: 'Notifications',
          href: '/notifications',
          icon: 'notifications',
          requiresAuth: true,
        },
        {
          id: 'clanker-token',
          label: '$CLANKER',
          href: '/t/base/0x1bc0c42215582d5a085795f4badbac3ff36d1bcb/Profile',
          icon: 'robot',
        },
      ],
      showMusicPlayer: false,
      showSocials: false,
    },
    ui_config: {
      primaryColor: 'rgba(136, 131, 252, 1)',
      primaryHoverColor: 'rgba(116, 111, 232, 1)',
      primaryActiveColor: 'rgba(96, 91, 212, 1)',
      fontColor: 'rgb(15, 23, 42)',
      castButtonFontColor: '#ffffff',
      url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      backgroundColor: 'rgb(255, 255, 255)',
      castButton: {
        backgroundColor: 'rgba(136, 131, 252, 1)',
        hoverColor: 'rgba(116, 111, 232, 1)',
        activeColor: 'rgba(96, 91, 212, 1)',
      },
    },
  };
}

