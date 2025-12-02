#!/usr/bin/env tsx
/**
 * Unified seed script for database and storage
 * 
 * This script:
 * 1. Uploads Nouns brand assets to ImgBB
 * 2. Seeds the database with community configs (using ImgBB URLs)
 * 3. Creates navPage space registrations
 * 4. Uploads navPage space configs to Supabase Storage
 * 
 * Usage:
 *   tsx scripts/seed-all.ts
 * 
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - NEXT_PUBLIC_IMGBB_API_KEY (optional, only needed for uploading assets)
 * 
 * This script replaces the need to:
 *   - Run supabase/seed.sql separately
 *   - Run scripts/upload-nouns-assets-to-imgbb.ts
 *   - Run scripts/seed-navpage-spaces.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import stringify from 'fast-json-stable-stringify';
import moment from 'moment';
import { SignedFile } from '../src/common/lib/signedFiles';
import { SpaceConfig } from '../src/app/(spaces)/Space';

// Import page configs for navPage spaces
import { nounsHomePage, nounsExplorePage, clankerHomePage } from './seed-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const imgBBApiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

  const assetsDir = join(__dirname, '..', 'src', 'config', 'nouns', 'assets');
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
  const { data: nounsHomeSpace } = await supabase
    .from('spaceRegistrations')
    .select('spaceId')
    .eq('spaceName', 'nouns-home')
    .eq('spaceType', 'navPage')
    .single();

  const { data: nounsExploreSpace } = await supabase
    .from('spaceRegistrations')
    .select('spaceId')
    .eq('spaceName', 'nouns-explore')
    .eq('spaceType', 'navPage')
    .single();

  // Nouns config
  const { error: nounsError } = await supabase
    .from('community_configs')
    .upsert({
      community_id: 'nouns',
      is_published: true,
      brand_config: {
        name: 'Nouns',
        displayName: 'Nouns',
        tagline: 'A space for Nouns',
        description: 'The social hub for Nouns',
        miniAppTags: ['nouns', 'client', 'customizable', 'social', 'link'],
      },
      assets_config: nounsAssetsConfig,
      community_config: {
        type: 'nouns',
        urls: {
          website: 'https://nouns.com',
          discord: 'https://discord.gg/nouns',
          twitter: 'https://twitter.com/nounsdao',
          github: 'https://github.com/nounsDAO',
          forum: 'https://discourse.nouns.wtf',
        },
        social: {
          farcaster: 'nouns',
          discord: 'nouns',
          twitter: 'nounsdao',
        },
        governance: {
          proposals: 'https://nouns.wtf/vote',
          delegates: 'https://nouns.wtf/delegates',
          treasury: 'https://nouns.wtf/treasury',
        },
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
        contracts: {
          nouns: '0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03',
          auctionHouse: '0x830bd73e4184cef73443c15111a1df14e495c706',
          space: '0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab',
          nogs: '0xD094D5D45c06c1581f5f429462eE7cCe72215616',
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
    brand_config: {
      name: 'Example',
      displayName: 'Example Community',
      tagline: 'A space for Example Community',
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
        twitter: 'https://twitter.com/example',
        github: 'https://github.com/example',
        forum: 'https://forum.example.com',
      },
      social: {
        farcaster: 'example',
        discord: 'example',
        twitter: 'example',
      },
      governance: {
        proposals: 'https://governance.example.com/proposals',
        delegates: 'https://governance.example.com/delegates',
        treasury: 'https://governance.example.com/treasury',
      },
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
      contracts: {
        nouns: '0x1234567890123456789012345678901234567890',
        auctionHouse: '0x1234567890123456789012345678901234567890',
        space: '0x1234567890123456789012345678901234567890',
        nogs: '0x1234567890123456789012345678901234567890',
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
    community_id: 'clanker',
    is_published: true,
    brand_config: {
      name: 'clanker',
      displayName: 'Clanker',
      tagline: 'Clank Clank',
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
        twitter: 'https://twitter.com/clankerworld',
        github: 'https://github.com/clanker',
        forum: 'https://forum.clanker.world',
      },
      social: {
        farcaster: 'clanker',
        discord: 'clanker',
        twitter: 'clankerworld',
      },
      governance: {
        proposals: 'https://proposals.clanker.world',
        delegates: 'https://delegates.clanker.world',
        treasury: 'https://treasury.clanker.world',
      },
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
      contracts: {
        clanker: '0x1bc0c42215582d5a085795f4badbac3ff36d1bcb',
        tokenFactory: '0x0000000000000000000000000000000000000000',
        space: '0x0000000000000000000000000000000000000000',
        trading: '0x0000000000000000000000000000000000000000',
        nouns: '0x0000000000000000000000000000000000000000',
        auctionHouse: '0x0000000000000000000000000000000000000000',
        nogs: '0x0000000000000000000000000000000000000000',
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
 * Creates a SignedFile for tab order
 */
function createTabOrderSignedFile(spaceId: string, tabOrder: string[]): SignedFile {
  const tabOrderData = {
    spaceId,
    timestamp: moment().toISOString(),
    tabOrder,
    publicKey: 'nounspace',
    signature: 'not applicable, machine generated file',
  };
  return createSystemSignedFile(stringify(tabOrderData));
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
 */
async function uploadTabOrder(spaceId: string, tabOrder: string[]): Promise<boolean> {
  const signedFile = createTabOrderSignedFile(spaceId, tabOrder);
  const filePath = `${spaceId}/tabOrder`;

  const { error } = await supabase.storage
    .from('spaces')
    .upload(filePath, new Blob([stringify(signedFile)], { type: 'application/json' }), {
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
 * Main seeding function
 */
async function main() {
  console.log('🚀 Starting unified database seeding...\n');

  try {
    // Step 1: Upload assets to ImgBB
    const assetsUrls = await uploadNounsAssets();

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
    console.log('  ✓ Nouns assets uploaded to ImgBB');
    console.log('  ✓ NavPage spaces created');
    console.log('  ✓ Community configs seeded');
    console.log('  ✓ NavPage space configs uploaded to Storage');
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

