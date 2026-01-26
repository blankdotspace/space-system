#!/usr/bin/env tsx
/**
 * Unified local database seeding script
 * 
 * This script handles all local database seeding operations:
 * 1. Checks if database is already seeded (--check flag)
 * 2. Uploads Nouns brand assets to ImgBB (--skip-assets to skip)
 * 3. Seeds storage buckets (if needed)
 * 4. Creates navPage space registrations
 * 5. Seeds community configs (using ImgBB URLs)
 * 6. Uploads navPage space configs to Supabase Storage
 * 
 * Usage:
 *   tsx scripts/seed.ts                    # Full seeding
 *   tsx scripts/seed.ts --check            # Check if already seeded
 *   tsx scripts/seed.ts --skip-assets      # Skip asset upload (use existing URLs)
 * 
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_KEY
 *   - NEXT_PUBLIC_IMGBB_API_KEY (optional, only needed for uploading assets)
 * 
 * This script consolidates:
 *   - scripts/seed-all.ts (original)
 *   - scripts/seed-community-configs.ts (redundant)
 *   - scripts/seed-navpage-spaces.ts (redundant)
 *   - scripts/check-seeding.ts (integrated)
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Try to load .env files in order of priority
const envFiles = ['.env.local', '.env.development.local', '.env'];
for (const envFile of envFiles) {
  const envPath = resolve(process.cwd(), envFile);
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`📁 Loaded environment from ${envFile}`);
    break;
  }
}

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import stringify from 'fast-json-stable-stringify';
import moment from 'moment';
import { SignedFile } from '../src/common/lib/signedFiles';
import { SpaceConfig } from '../src/app/(spaces)/Space';

// Import page configs for navPage spaces (from seed-data folder)
import { nounsHomePage } from './seed-data/nouns-home';
import { clankerHomePage } from './seed-data/clanker-home';

// Import utilities and types for building explore page config inline
import DEFAULT_THEME from '../src/common/lib/theme/defaultTheme';
import type { NavPageConfig, TabConfig } from '../src/config/systemConfig';
import type {
  DirectoryFidgetSettings,
  DirectoryNetwork,
  DirectoryChannelFilterOption,
  DirectoryAssetType,
  DirectoryFidgetData,
} from '../src/fidgets/token/Directory/types';
import { getDirectoryDataFromTabJson } from './seed-data/exploreTabDirectoryData';
import nounsChannelTab from './seed-data/exploreTabs/channel.json';
import spaceHoldersTab from './seed-data/exploreTabs/spaceHolders.json';
import nounsNftHoldersTab from './seed-data/exploreTabs/nounsNFTholders.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const imgBBApiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

// ============================================================================
// Inline explore page config builder (extracted from createExplorePageConfig)
// ============================================================================

type TokenInput = {
  address: string;
  symbol: string;
  network?: DirectoryNetwork | "eth";
  assetType?: DirectoryAssetType;
};

const FULL_WIDTH = 12;
const FULL_HEIGHT = 24;
const RESIZE_HANDLES = ["s", "w", "e", "n", "sw", "nw", "se", "ne"] as const;

const sanitizeTabKey = (value: string, fallback: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const slugify = (value: string, fallback: string) => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : fallback;
};

const createDirectoryFidgetId = (suffix: string) => `Directory:${suffix}`;

const BASE_DIRECTORY_SETTINGS: Pick<
  DirectoryFidgetSettings,
  | "layoutStyle"
  | "include"
  | "mobileDisplayName"
  | "primaryFontFamily"
  | "primaryFontColor"
  | "secondaryFontFamily"
  | "secondaryFontColor"
> = {
  layoutStyle: "cards",
  include: "holdersWithFarcasterAccount",
  mobileDisplayName: undefined,
  primaryFontFamily: undefined,
  primaryFontColor: undefined,
  secondaryFontFamily: undefined,
  secondaryFontColor: undefined,
};

const normalizeTokenNetwork = (
  network: DirectoryNetwork | "eth" | undefined,
  defaultNetwork: DirectoryNetwork,
): DirectoryNetwork => {
  if (!network) {
    return defaultNetwork;
  }
  if (network === "eth") {
    return "mainnet";
  }
  return network;
};

const buildTokenDirectorySettings = (
  token: TokenInput,
  defaultNetwork: DirectoryNetwork,
): DirectoryFidgetSettings => ({
  ...BASE_DIRECTORY_SETTINGS,
  source: "tokenHolders",
  network: normalizeTokenNetwork(token.network, defaultNetwork),
  contractAddress: token.address,
  assetType: token.assetType ?? "token",
  sortBy: "tokenHoldings",
});

const buildChannelDirectorySettings = (
  channel: string,
  channelNetwork: DirectoryNetwork,
): DirectoryFidgetSettings => ({
  ...BASE_DIRECTORY_SETTINGS,
  source: "farcasterChannel",
  network: channelNetwork,
  contractAddress: "",
  assetType: "token",
  sortBy: "followers",
  channelName: channel,
  channelFilter: "members" as DirectoryChannelFilterOption,
});

const createTabTheme = (idSuffix: string) => ({
  id: `explore-${idSuffix}-theme`,
  name: `${DEFAULT_THEME.name} Explore`,
  properties: {
    ...DEFAULT_THEME.properties,
    fidgetBorderRadius: "0px",
    gridSpacing: "0",
  },
});

const getPreloadedDirectoryData = (
  tabKey: string,
  idSuffix: string,
  preloadedDirectoryData?: Record<string, DirectoryFidgetData | undefined>,
): DirectoryFidgetData | undefined =>
  preloadedDirectoryData?.[tabKey] ?? preloadedDirectoryData?.[idSuffix];

const buildTabConfig = (
  name: string,
  idSuffix: string,
  settings: DirectoryFidgetSettings,
  preloadedData?: DirectoryFidgetData,
): TabConfig => {
  const fidgetId = createDirectoryFidgetId(idSuffix);
  return {
    name,
    displayName: name,
    layoutID: `explore-${idSuffix}-layout`,
    layoutDetails: {
      layoutFidget: "grid",
      layoutConfig: {
        layout: [
          {
            w: FULL_WIDTH,
            h: FULL_HEIGHT,
            x: 0,
            y: 0,
            i: fidgetId,
            minW: FULL_WIDTH,
            maxW: FULL_WIDTH,
            minH: 8,
            maxH: 36,
            moved: false,
            static: false,
            resizeHandles: [...RESIZE_HANDLES],
            isBounded: false,
          },
        ],
      },
    },
    theme: createTabTheme(idSuffix),
    fidgetInstanceDatums: {
      [fidgetId]: {
        config: {
          data: preloadedData ?? {},
          editable: false,
          settings,
        },
        fidgetType: "Directory",
        id: fidgetId,
      },
    },
    fidgetTrayContents: [],
    isEditable: false,
    timestamp: new Date().toISOString(),
  };
};

function createExplorePageConfig({
  tokens = [],
  channel,
  defaultTokenNetwork = "mainnet",
  channelNetwork = "base",
  preloadedDirectoryData,
}: {
  tokens?: TokenInput[];
  channel?: string | null;
  defaultTokenNetwork?: DirectoryNetwork;
  channelNetwork?: DirectoryNetwork;
  preloadedDirectoryData?: Record<string, DirectoryFidgetData | undefined>;
}): NavPageConfig {
  const tabEntries: Array<{ key: string; config: TabConfig }> = [];
  const seenTabNames = new Set<string>();

  tokens.forEach((token, index) => {
    if (!token?.address || !token.symbol) {
      return;
    }

    const tabName = sanitizeTabKey(token.symbol, `Token ${index + 1}`);
    if (seenTabNames.has(tabName)) {
      return;
    }

    seenTabNames.add(tabName);
    const idSuffix = slugify(tabName, `token-${index + 1}`);
    const settings = buildTokenDirectorySettings(token, defaultTokenNetwork);
    const preloadedData = getPreloadedDirectoryData(tabName, idSuffix, preloadedDirectoryData);
    tabEntries.push({
      key: tabName,
      config: buildTabConfig(tabName, idSuffix, settings, preloadedData),
    });
  });

  const normalizedChannel = channel?.trim().replace(/^\/+/, "");
  if (normalizedChannel) {
    const tabName = "channel";
    const idSuffix = slugify(`channel-${normalizedChannel}`, `channel-${tabEntries.length + 1}`);
    const settings = buildChannelDirectorySettings(normalizedChannel, channelNetwork);
    const preloadedData = getPreloadedDirectoryData(tabName, idSuffix, preloadedDirectoryData);
    tabEntries.push({
      key: tabName,
      config: buildTabConfig(tabName, idSuffix, settings, preloadedData),
    });
  }

  if (tabEntries.length === 0) {
    const fallbackName = "Directory";
    const settings: DirectoryFidgetSettings = {
      ...BASE_DIRECTORY_SETTINGS,
      source: "tokenHolders",
      network: defaultTokenNetwork,
      contractAddress: "",
      assetType: "token",
      sortBy: "tokenHoldings",
    };
    tabEntries.push({
      key: fallbackName,
      config: buildTabConfig(fallbackName, slugify(fallbackName, "directory"), settings),
    });
  }

  const tabOrder = tabEntries.map((entry) => entry.key);
  const tabs = tabEntries.reduce<Record<string, TabConfig>>((acc, entry) => {
    acc[entry.key] = entry.config;
    return acc;
  }, {});

  const defaultTab = tabOrder[0];

  return {
    defaultTab,
    tabOrder,
    tabs,
    layout: {
      defaultLayoutFidget: "grid",
      gridSpacing: 0,
      theme: {
        background: DEFAULT_THEME.properties.background,
        fidgetBackground: DEFAULT_THEME.properties.fidgetBackground,
        font: DEFAULT_THEME.properties.font,
        fontColor: DEFAULT_THEME.properties.fontColor,
      },
    },
  };
}

// Create nouns explore page config inline
const nounsTokens: TokenInput[] = [
  {
    address: '0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab',
    symbol: '$SPACE',
    network: 'base',
    assetType: "token" as const,
  },
  {
    address: '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03',
    symbol: 'Nouns',
    network: 'eth',
    assetType: "nft" as const,
  },
];

const nounsPreloadedDirectoryData = {
  "$SPACE": getDirectoryDataFromTabJson(spaceHoldersTab),
  space: getDirectoryDataFromTabJson(spaceHoldersTab),
  Nouns: getDirectoryDataFromTabJson(nounsNftHoldersTab),
  nouns: getDirectoryDataFromTabJson(nounsNftHoldersTab),
  "/nouns": getDirectoryDataFromTabJson(nounsChannelTab),
  "channel-nouns": getDirectoryDataFromTabJson(nounsChannelTab),
};

const nounsExplorePage = createExplorePageConfig({
  tokens: nounsTokens,
  channel: 'nouns',
  defaultTokenNetwork: "mainnet",
  preloadedDirectoryData: nounsPreloadedDirectoryData,
});

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse command-line arguments
const args = process.argv.slice(2);
const flags = {
  check: args.includes('--check'),
  skipAssets: args.includes('--skip-assets'),
};

/**
 * Upload a file to ImgBB using base64 encoding
 */
async function uploadToImgBB(filePath: string, filename: string): Promise<string | null> {
  if (!imgBBApiKey) {
    console.warn(`⚠️  NEXT_PUBLIC_IMGBB_API_KEY not set, skipping upload for ${filename}`);
    return null;
  }

  try {
    const fileBuffer = await readFile(filePath);
    const base64 = fileBuffer.toString('base64');

    const params = new URLSearchParams();
    params.append('image', base64);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgBBApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || JSON.stringify(data));
    }

    const imageUrl = data.data.display_url || data.data.url;
    console.log(`  ✅ Uploaded ${filename} → ${imageUrl}`);
    return imageUrl;
  } catch (error: any) {
    console.error(`  ❌ Failed to upload ${filename}:`, error.message);
    return null;
  }
}

/**
 * Upload Nouns assets to ImgBB and return URLs
 */
async function uploadNounsAssets(): Promise<Record<string, string>> {
  console.log('\n📤 Step 1: Uploading Nouns assets to ImgBB...\n');

  const assetsDir = join(__dirname, 'seed-data', 'nouns-assets');
  const assetsToUpload = [
    { file: 'logo.svg', key: 'main' },
    { file: 'noggles.svg', key: 'icon' },
    { file: 'og.svg', key: 'og' },
    { file: 'splash.svg', key: 'splash' },
  ];

  const uploadedUrls: Record<string, string> = {};

  for (const asset of assetsToUpload) {
    const filePath = join(assetsDir, asset.file);
    const url = await uploadToImgBB(filePath, asset.file);
    if (url) {
      uploadedUrls[asset.key] = url;
    } else {
      // Fallback to local paths if upload fails or API key missing
      uploadedUrls[asset.key] = `/images/nouns/${asset.file}`;
    }
  }

  // Keep existing paths for favicon and appleTouch
  uploadedUrls['favicon'] = '/images/favicon.ico';
  uploadedUrls['appleTouch'] = '/images/apple-touch-icon.png';

  return uploadedUrls;
}

/**
 * Seed storage buckets
 */
async function seedBuckets() {
  console.log('\n📦 Step 2: Creating storage buckets...\n');

  // Note: We can't directly INSERT into storage.buckets via the client easily
  // This is typically done via SQL migrations, but we'll try via RPC or just skip if exists
  console.log('  ℹ️  Storage buckets should be created via migrations');
  console.log('  ℹ️  Skipping bucket creation (assumes buckets already exist)');
}

/**
 * Create navPage space registrations
 */
async function createNavPageSpaces() {
  console.log('\n🏗️  Step 3: Creating navPage space registrations...\n');

  const spaces = [
    { spaceName: 'nouns-home' },
    { spaceName: 'nouns-explore' },
    { spaceName: 'clanker-home' },
  ];

  for (const space of spaces) {
    const { data: existing } = await supabase
      .from('spaceRegistrations')
      .select('spaceId')
      .eq('spaceName', space.spaceName)
      .eq('spaceType', 'navPage')
      .single();

    if (existing) {
      console.log(`  ✅ Space already exists: ${space.spaceName} (${existing.spaceId})`);
      continue;
    }

    const { data, error } = await supabase
      .from('spaceRegistrations')
      .insert({
        fid: null,
        spaceName: space.spaceName,
        spaceType: 'navPage',
        identityPublicKey: 'system',
        signature: 'system-seed',
        timestamp: new Date().toISOString(),
      })
      .select('spaceId')
      .single();

    if (error) {
      console.error(`  ❌ Failed to create ${space.spaceName}:`, error.message);
    } else {
      console.log(`  ✅ Created space: ${space.spaceName} (${data.spaceId})`);
    }
  }
}

/**
 * Seed community configs with ImgBB URLs
 */
async function seedCommunityConfigs(assetsUrls: Record<string, string>) {
  console.log('\n⚙️  Step 4: Seeding community configs...\n');

  // Nouns assets config with ImgBB URLs
  const nounsAssetsConfig = {
    logos: {
      main: assetsUrls.main || '/images/nouns/logo.svg',
      icon: assetsUrls.icon || '/images/nouns/noggles.svg',
      favicon: assetsUrls.favicon || '/images/favicon.ico',
      appleTouch: assetsUrls.appleTouch || '/images/apple-touch-icon.png',
      og: assetsUrls.og || '/images/nouns/og.svg',
      splash: assetsUrls.splash || '/images/nouns/splash.svg',
    },
  };

  // Get space IDs for navigation
  const { data: nounsHomeSpace, error: nounsHomeError } = await supabase
    .from('spaceRegistrations')
    .select('spaceId')
    .eq('spaceName', 'nouns-home')
    .eq('spaceType', 'navPage')
    .maybeSingle();

  if (nounsHomeError) {
    console.error('  ⚠️  Error fetching nouns-home space:', nounsHomeError.message);
  }
  if (!nounsHomeSpace) {
    console.error('  ⚠️  nouns-home space not found in database. Make sure Step 3 (createNavPageSpaces) ran successfully.');
  }

  const { data: nounsExploreSpace, error: nounsExploreError } = await supabase
    .from('spaceRegistrations')
    .select('spaceId')
    .eq('spaceName', 'nouns-explore')
    .eq('spaceType', 'navPage')
    .maybeSingle();

  if (nounsExploreError) {
    console.error('  ⚠️  Error fetching nouns-explore space:', nounsExploreError.message);
  }
  if (!nounsExploreSpace) {
    console.error('  ⚠️  nouns-explore space not found in database. Make sure Step 3 (createNavPageSpaces) ran successfully.');
  }

  // Nouns config
  // Note: Add identityPublicKey values to admin_identity_public_keys to allow users to edit nav pages
  // You can find a user's identityPublicKey in the browser devtools: 
  // localStorage.getItem('nounspace-app-store') -> account.currentSpaceIdentityPublicKey
  const { error: nounsError } = await supabase
    .from('community_configs')
    .upsert({
      community_id: 'nounspace.com',
      is_published: true,
      admin_identity_public_keys: [], // Add admin identityPublicKey values here
      brand_config: {
        displayName: 'Nouns',
        description: 'The social hub for Nouns',
        miniAppTags: ['nouns', 'client', 'customizable', 'social', 'link'],
      },
      assets_config: nounsAssetsConfig,
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
            spaceId: nounsHomeSpace?.spaceId || null,
          },
          {
            id: 'explore',
            label: 'Explore',
            href: '/explore',
            icon: 'explore',
            spaceId: nounsExploreSpace?.spaceId || null,
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
    });

  if (nounsError) {
    console.error('  ❌ Failed to seed Nouns config:', nounsError.message);
  } else {
    console.log('  ✅ Seeded Nouns community config');
  }

  // Example config
  const { error: exampleError } = await supabase.from('community_configs').upsert({
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
  });

  if (exampleError) {
    console.error('  ❌ Failed to seed Example config:', exampleError.message);
  } else {
    console.log('  ✅ Seeded Example community config');
  }

  // Get Clanker home space ID
  const { data: clankerHomeSpace } = await supabase
    .from('spaceRegistrations')
    .select('spaceId')
    .eq('spaceName', 'clanker-home')
    .eq('spaceType', 'navPage')
    .single();

  // Clanker config
  const { error: clankerError } = await supabase.from('community_configs').upsert({
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
        main: '/images/clanker/logo.svg',
        icon: '/images/clanker/logo.svg',
        favicon: '/images/clanker/favicon.ico',
        appleTouch: '/images/clanker/apple.png',
        og: '/images/clanker/og.jpg',
        splash: '/images/clanker/og.jpg',
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
          spaceId: clankerHomeSpace?.spaceId || null,
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
  });

  if (clankerError) {
    console.error('  ❌ Failed to seed Clanker config:', clankerError.message);
  } else {
    console.log('  ✅ Seeded Clanker community config');
  }
}

/**
 * Creates a SignedFile wrapper for system-generated files
 */
function createSystemSignedFile(fileData: string): SignedFile {
  return {
    fileData,
    fileType: 'json',
    isEncrypted: false,
    timestamp: moment().toISOString(),
    publicKey: 'nounspace',
    signature: 'not applicable, machine generated file',
  };
}

/**
 * Creates tab order data in the format expected by the app
 * NOTE: Tab order is NOT wrapped in a SignedFile like tabs are.
 * The app saves tab order directly as a signed request object.
 */
function createTabOrderData(spaceId: string, tabOrder: string[]) {
  return {
    spaceId,
    timestamp: moment().toISOString(),
    tabOrder,
  };
}

/**
 * Uploads a single tab config to Supabase Storage
 */
async function uploadTab(spaceId: string, tabName: string, tabConfig: SpaceConfig): Promise<boolean> {
  const signedFile = createSystemSignedFile(stringify(tabConfig));
  const filePath = `${spaceId}/tabs/${tabName}`;

  const { error } = await supabase.storage
    .from('spaces')
    .upload(filePath, new Blob([stringify(signedFile)], { type: 'application/json' }), {
      upsert: true,
    });

  if (error) {
    console.error(`    ❌ Failed to upload tab ${tabName}:`, error.message);
    return false;
  }

  console.log(`    ✅ Uploaded tab: ${tabName}`);
  return true;
}

/**
 * Uploads tab order to Supabase Storage
 * NOTE: Tab order is saved directly (not wrapped in SignedFile) to match app format
 */
async function uploadTabOrder(spaceId: string, tabOrder: string[]): Promise<boolean> {
  const tabOrderData = createTabOrderData(spaceId, tabOrder);
  const filePath = `${spaceId}/tabOrder`;

  const { error } = await supabase.storage
    .from('spaces')
    .upload(filePath, new Blob([stringify(tabOrderData)], { type: 'application/json' }), {
      upsert: true,
    });

  if (error) {
    console.error(`    ❌ Failed to upload tab order:`, error.message);
    return false;
  }

  console.log(`    ✅ Uploaded tab order: [${tabOrder.join(', ')}]`);
  return true;
}

/**
 * Gets spaceId from database by spaceName
 */
async function getSpaceId(spaceName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('spaceRegistrations')
    .select('spaceId')
    .eq('spaceName', spaceName)
    .eq('spaceType', 'navPage')
    .single();

  if (error || !data) {
    console.error(`    ❌ Space not found: ${spaceName}`, error?.message);
    return null;
  }

  return data.spaceId;
}

/**
 * Type for page configs with tabs
 */
type PageConfigWithSpaceTabs = {
  defaultTab: string;
  tabOrder: string[];
  tabs: Record<string, any>;
};

/**
 * Uploads a page config (homePage or explorePage) as a Space
 */
async function uploadPageConfig(
  spaceName: string,
  pageConfig: PageConfigWithSpaceTabs,
): Promise<boolean> {
  const spaceId = await getSpaceId(spaceName);
  if (!spaceId) {
    return false;
  }

  console.log(`  📦 Uploading ${spaceName} (${spaceId})`);

  // Upload each tab
  const tabNames = Object.keys(pageConfig.tabs);
  const tabResults = await Promise.all(
    tabNames.map((tabName) => {
      const tabConfig = pageConfig.tabs[tabName];
      const spaceConfig: SpaceConfig = {
        fidgetInstanceDatums: tabConfig.fidgetInstanceDatums,
        layoutID: tabConfig.layoutID,
        layoutDetails: tabConfig.layoutDetails,
        isEditable: tabConfig.isEditable ?? false,
        fidgetTrayContents: tabConfig.fidgetTrayContents,
        theme: tabConfig.theme,
        timestamp: tabConfig.timestamp,
        tabNames: tabConfig.tabNames,
        fid: tabConfig.fid,
      };
      return uploadTab(spaceId, tabName, spaceConfig);
    }),
  );

  const allTabsUploaded = tabResults.every((result) => result);
  if (!allTabsUploaded) {
    console.error(`    ❌ Some tabs failed to upload for ${spaceName}`);
    return false;
  }

  // Upload tab order
  const tabOrderUploaded = await uploadTabOrder(spaceId, pageConfig.tabOrder);
  if (!tabOrderUploaded) {
    console.error(`    ❌ Failed to upload tab order for ${spaceName}`);
    return false;
  }

  return true;
}

/**
 * Upload navPage space configs to Supabase Storage
 */
async function uploadNavPageSpaces() {
  console.log('\n📤 Step 5: Uploading navPage space configs to Storage...\n');

  const spaceConfigs: Array<{ spaceName: string; config: PageConfigWithSpaceTabs }> = [
    { spaceName: 'nouns-home', config: nounsHomePage },
    { spaceName: 'nouns-explore', config: nounsExplorePage },
    { spaceName: 'clanker-home', config: clankerHomePage },
  ];

  const results = await Promise.allSettled(
    spaceConfigs.map(({ spaceName, config }) => uploadPageConfig(spaceName, config)),
  );

  const successCount = results.filter((r) => r.status === 'fulfilled' && r.value).length;
  const failCount = results.length - successCount;

  if (failCount > 0) {
    console.error(`\n  ❌ ${failCount} space(s) failed to upload`);
    return false;
  }

  console.log(`\n  ✅ All ${successCount} spaces uploaded successfully`);
  return true;
}

/**
 * Check if database is already seeded
 */
async function checkSeeding(): Promise<boolean> {
  console.log('🔍 Checking if database is seeded...\n');

  // Check if table exists and has data
  const { data, error, count } = await supabase
    .from('community_configs')
    .select('community_id, is_published, updated_at', { count: 'exact' });

  if (error) {
    console.error('❌ Error checking community_configs:', error.message);
    console.error('   The table might not exist. Run migrations first.');
    return false;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No community configs found in database.');
    console.log('\n📋 Run full seeding:');
    console.log('   tsx scripts/seed.ts');
    return false;
  }

  console.log(`✅ Found ${count} community config(s):\n`);
  data.forEach((config) => {
    console.log(`   - ${config.community_id} (published: ${config.is_published}, updated: ${config.updated_at})`);
  });

  // Test the RPC function
  console.log('\n🧪 Testing get_active_community_config function...');
  const { data: testConfig, error: testError } = await supabase
    .rpc('get_active_community_config', { p_community_id: 'nounspace.com' })
    .single();

  if (testError) {
    console.error('❌ Function test failed:', testError.message);
    return false;
  }

  if (testConfig && (testConfig as any).brand) {
    console.log('✅ Function works! Retrieved config successfully.');
  } else {
    console.error('❌ Function returned invalid config');
    return false;
  }

  console.log('\n✅ Database is properly seeded!');
  return true;
}

/**
 * Main seeding function
 */
async function main() {
  // Handle --check flag
  if (flags.check) {
    const isSeeded = await checkSeeding();
    process.exit(isSeeded ? 0 : 1);
    return;
  }

  console.log('🚀 Starting unified database seeding...\n');

  try {
    // Step 1: Upload assets to ImgBB (skip if --skip-assets flag)
    let assetsUrls: Record<string, string> = {};
    if (!flags.skipAssets) {
      assetsUrls = await uploadNounsAssets();
    } else {
      console.log('⏭️  Skipping asset upload (--skip-assets flag)\n');
      // Use empty object - seedCommunityConfigs will handle missing URLs
    }

    // Step 2: Seed storage buckets (skip, assume created via migrations)
    await seedBuckets();

    // Step 3: Create navPage space registrations
    await createNavPageSpaces();

    // Step 4: Seed community configs
    await seedCommunityConfigs(assetsUrls);

    // Step 5: Upload navPage space configs
    const spacesUploaded = await uploadNavPageSpaces();

    if (!spacesUploaded) {
      console.error('\n❌ Some steps failed. Check errors above.');
      process.exit(1);
    }

    console.log('\n✅ All seeding completed successfully!');
    console.log('\n📋 Summary:');
    if (!flags.skipAssets) {
      console.log('  ✓ Nouns assets uploaded to ImgBB');
    }
    console.log('  ✓ NavPage spaces created');
    console.log('  ✓ Community configs seeded');
    console.log('  ✓ NavPage space configs uploaded to Storage');
    
    // Final check
    console.log('\n🔍 Verifying seeding...');
    await checkSeeding();
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
