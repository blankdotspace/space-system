#!/usr/bin/env tsx
/**
 * Asset Migration Script
 *
 * Migrates community assets from ImgBB/local paths to Supabase Storage.
 * Updates the community_configs table with new asset URLs.
 *
 * Usage:
 *   tsx scripts/migrate-assets.ts                    # Uses local .env
 *   tsx scripts/migrate-assets.ts --env production   # Prompts for credentials
 *   tsx scripts/migrate-assets.ts --dry-run          # Preview changes without applying
 *
 * This script:
 * 1. Ensures the 'images' bucket exists
 * 2. Uploads assets from seed-data/assets/ to Supabase Storage
 * 3. Updates community_configs with new asset URLs
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  supabase,
  initializeSupabase,
  targetEnv,
  uploadAssets,
  ensureImagesBucket,
} from './lib';
import {
  nounsAssets,
  clankerAssets,
} from './seed-data/communities';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CLI flags
const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
};

type CommunityConfig = {
  community_id: string;
  assets_config: {
    logos: {
      main: string;
      icon: string;
      favicon: string;
      appleTouch: string;
      og: string;
      splash: string;
    };
  };
};

/**
 * Fetch current community configs from database
 */
async function fetchCommunityConfigs(): Promise<CommunityConfig[]> {
  const { data, error } = await supabase
    .from('community_configs')
    .select('community_id, assets_config')
    .in('community_id', ['nounspace.com', 'clanker.space']);

  if (error) {
    console.error('❌ Failed to fetch community configs:', error.message);
    process.exit(1);
  }

  return data as CommunityConfig[];
}

/**
 * Update a community config with new asset URLs
 */
async function updateCommunityConfig(
  communityId: string,
  newAssets: Record<string, string>,
): Promise<boolean> {
  // Fetch current config
  const { data: current, error: fetchError } = await supabase
    .from('community_configs')
    .select('assets_config')
    .eq('community_id', communityId)
    .single();

  if (fetchError) {
    console.error(`❌ Failed to fetch ${communityId}:`, fetchError.message);
    return false;
  }

  // Build updated assets_config
  const currentAssets = current.assets_config as CommunityConfig['assets_config'];
  const updatedAssetsConfig = {
    ...currentAssets,
    logos: {
      ...currentAssets.logos,
      ...newAssets,
    },
  };

  if (flags.dryRun) {
    console.log(`\n📋 [DRY RUN] Would update ${communityId}:`);
    console.log('   Current logos:', JSON.stringify(currentAssets.logos, null, 2));
    console.log('   New logos:', JSON.stringify(updatedAssetsConfig.logos, null, 2));
    return true;
  }

  // Update in database
  const { error: updateError } = await supabase
    .from('community_configs')
    .update({ assets_config: updatedAssetsConfig })
    .eq('community_id', communityId);

  if (updateError) {
    console.error(`❌ Failed to update ${communityId}:`, updateError.message);
    return false;
  }

  console.log(`✅ Updated ${communityId} assets`);
  return true;
}

async function main() {
  // Initialize Supabase client
  if (targetEnv) {
    await initializeSupabase();
  }

  console.log('🚀 Starting asset migration...\n');
  if (targetEnv) {
    console.log(`🌐 Target environment: ${targetEnv}`);
  }
  if (flags.dryRun) {
    console.log('📋 DRY RUN MODE - no changes will be made\n');
  }

  try {
    // Step 1: Ensure images bucket exists
    console.log('\n📦 Step 1: Ensuring images bucket exists...\n');
    if (!flags.dryRun) {
      await ensureImagesBucket();
    } else {
      console.log('   [DRY RUN] Would create/verify images bucket');
    }

    // Step 2: Upload assets
    console.log('\n📤 Step 2: Uploading assets to Supabase Storage...\n');
    const assetsDir = join(__dirname, 'seed-data', 'assets');

    let nounsUrls: Record<string, string> = {};
    let clankerUrls: Record<string, string> = {};

    if (!flags.dryRun) {
      console.log('  Uploading Nouns assets...');
      nounsUrls = await uploadAssets(assetsDir, nounsAssets);

      console.log('\n  Uploading Clanker assets...');
      clankerUrls = await uploadAssets(assetsDir, clankerAssets);
    } else {
      console.log('   [DRY RUN] Would upload Nouns assets:', nounsAssets.files.map(f => f.file));
      console.log('   [DRY RUN] Would upload Clanker assets:', clankerAssets.files.map(f => f.file));
    }

    // Step 3: Fetch current configs
    console.log('\n📊 Step 3: Fetching current community configs...\n');
    const configs = await fetchCommunityConfigs();
    console.log(`   Found ${configs.length} community config(s)`);

    for (const config of configs) {
      console.log(`   - ${config.community_id}`);
      console.log(`     Current main: ${config.assets_config?.logos?.main || 'not set'}`);
      console.log(`     Current icon: ${config.assets_config?.logos?.icon || 'not set'}`);
    }

    // Step 4: Update configs with new URLs
    console.log('\n🔄 Step 4: Updating community configs...\n');

    // Update Nouns config
    if (nounsUrls.main || flags.dryRun) {
      const nounsUpdate = flags.dryRun
        ? { main: '[new-url]', icon: '[new-url]', og: '[new-url]', splash: '[new-url]', favicon: '[new-url]', appleTouch: '[new-url]' }
        : nounsUrls;
      await updateCommunityConfig('nounspace.com', nounsUpdate);
    }

    // Update Clanker config
    if (clankerUrls.main || flags.dryRun) {
      const clankerUpdate = flags.dryRun
        ? { main: '[new-url]', icon: '[new-url]' }
        : {
            main: clankerUrls.main,
            icon: clankerUrls.icon,
            favicon: clankerUrls.main,
            appleTouch: clankerUrls.main,
            og: clankerUrls.main,
            splash: clankerUrls.main,
          };
      await updateCommunityConfig('clanker.space', clankerUpdate);
    }

    // Summary
    console.log('\n✅ Migration complete!');
    if (flags.dryRun) {
      console.log('\n📋 This was a dry run. Run without --dry-run to apply changes.');
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
