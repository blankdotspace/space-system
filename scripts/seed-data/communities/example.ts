/**
 * Example community configuration
 * 
 * A minimal template for creating new community configs
 */

/**
 * Creates the Example community config for database insertion
 */
export function createExampleCommunityConfig() {
  return {
    community_id: 'example',
    is_published: true,
    admin_identity_public_keys: [],
    brand_config: {
      displayName: 'Example Community',
      description: 'The social hub for Example Community',
      miniAppTags: [],
    },
    assets_config: {
      logos: {
        main: '/images/example_logo.png',
        icon: '/images/example_icon.png',
        favicon: '/images/example_favicon.ico',
        appleTouch: '/images/example_apple_touch.png',
        og: '/images/example_og.png',
        splash: '/images/example_splash.png',
      },
    },
    community_config: {
      type: 'example',
      urls: {
        website: 'https://example.com',
        discord: 'https://discord.gg/example',
      },
      social: {
        farcaster: 'example',
      },
      governance: {},
      tokens: {
        erc20Tokens: [
          {
            address: '0x1234567890123456789012345678901234567890',
            symbol: '$EXAMPLE',
            decimals: 18,
            network: 'mainnet',
          },
        ],
        nftTokens: [
          {
            address: '0x1234567890123456789012345678901234567890',
            symbol: 'Example NFT',
            type: 'erc721',
            network: 'eth',
          },
        ],
      },
    },
    fidgets_config: {
      enabled: [
        'feed',
        'cast',
        'gallery',
        'text',
        'iframe',
        'links',
        'video',
        'channel',
        'profile',
        'swap',
        'rss',
        'market',
        'portfolio',
        'chat',
        'framesV2',
      ],
      disabled: ['example', 'nounsHome', 'governance', 'snapshot', 'builderScore'],
    },
    navigation_config: null,
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

