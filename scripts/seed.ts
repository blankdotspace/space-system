#!/usr/bin/env tsx
/**
 * Database Seeding Script
 * 
 * Seeds the local Supabase database with community configs and nav page spaces.
 * 
 * Usage:
 *   tsx scripts/seed.ts                    # Full seeding
 *   tsx scripts/seed.ts --check            # Check if already seeded
 *   tsx scripts/seed.ts --skip-assets      # Skip ImgBB asset upload
 * 
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_KEY
 *   - NEXT_PUBLIC_IMGBB_API_KEY (optional, for asset uploads)
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Library utilities
import { 
  supabase, 
  uploadAssets, 
  uploadPageConfig, 
  createNavPageSpace,
  createExplorePageConfig,
} from './lib';

// Community configurations
import {
  nounsAssets,
  nounsExploreOptions,
  createNounsCommunityConfig,
  createClankerCommunityConfig,
  createExampleCommunityConfig,
} from './seed-data/communities';

// Page configurations  
import { nounsHomePage, clankerHomePage } from './seed-data/pages';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// CLI Flags
// ============================================================================

const args = process.argv.slice(2);
const flags = {
  check: args.includes('--check'),
  skipAssets: args.includes('--skip-assets'),
};

// ============================================================================
// Seeding Steps
// ============================================================================

/**
 * Step 1: Upload Nouns assets to ImgBB
 */
async function uploadNounsAssetsStep(): Promise<Record<string, string>> {
  console.log('\n📤 Step 1: Uploading Nouns assets to ImgBB...\n');

  const assetsDir = join(__dirname, 'seed-data', 'assets', nounsAssets.directory);
  const uploadedUrls = await uploadAssets(
    assetsDir,
    nounsAssets.files,
    nounsAssets.fallbackPrefix,
  );

  // Add static paths
  uploadedUrls.favicon = nounsAssets.static.favicon;
  uploadedUrls.appleTouch = nounsAssets.static.appleTouch;

  return uploadedUrls;
}

/**
 * Step 2: Create navPage space registrations
 */
async function createNavPageSpacesStep(): Promise<Record<string, string | null>> {
  console.log('\n🏗️  Step 2: Creating navPage space registrations...\n');

  const spaceNames = ['nouns-home', 'nouns-explore', 'clanker-home'];
  const spaceIds: Record<string, string | null> = {};

  for (const spaceName of spaceNames) {
    spaceIds[spaceName] = await createNavPageSpace(spaceName);
  }

  return spaceIds;
}

/**
 * Step 3: Seed community configs to database
 */
async function seedCommunityConfigsStep(
  assetUrls: Record<string, string>,
  spaceIds: Record<string, string | null>,
): Promise<void> {
  console.log('\n⚙️  Step 3: Seeding community configs...\n');

  const configs = [
    {
      name: 'Nouns',
      config: createNounsCommunityConfig(assetUrls, {
        home: spaceIds['nouns-home'],
        explore: spaceIds['nouns-explore'],
      }),
    },
    {
      name: 'Clanker',
      config: createClankerCommunityConfig({
        home: spaceIds['clanker-home'],
      }),
    },
    {
      name: 'Example',
      config: createExampleCommunityConfig(),
    },
  ];

  for (const { name, config } of configs) {
    const { error } = await supabase.from('community_configs').upsert(config);
    if (error) {
      console.error(`  ❌ Failed to seed ${name} config:`, error.message);
    } else {
      console.log(`  ✅ Seeded ${name} community config`);
    }
  }
}

/**
 * Step 4: Upload navPage space configs to Storage
 */
async function uploadNavPageSpacesStep(): Promise<boolean> {
  console.log('\n📤 Step 4: Uploading navPage space configs to Storage...\n');

  // Generate explore page config on-the-fly
  const nounsExplorePage = createExplorePageConfig(nounsExploreOptions);

  const spaceConfigs = [
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

// ============================================================================
// Verification
// ============================================================================

/**
 * Check if database is already seeded
 */
async function checkSeeding(): Promise<boolean> {
  console.log('🔍 Checking if database is seeded...\n');

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

// ============================================================================
// Main
// ============================================================================

async function main() {
  // Handle --check flag
  if (flags.check) {
    const isSeeded = await checkSeeding();
    process.exit(isSeeded ? 0 : 1);
  }

  console.log('🚀 Starting database seeding...\n');

  try {
    // Step 1: Upload assets (skip if --skip-assets)
    let assetUrls: Record<string, string> = {};
    if (!flags.skipAssets) {
      assetUrls = await uploadNounsAssetsStep();
    } else {
      console.log('⏭️  Skipping asset upload (--skip-assets flag)\n');
    }

    // Step 2: Create navPage spaces
    const spaceIds = await createNavPageSpacesStep();

    // Step 3: Seed community configs
    await seedCommunityConfigsStep(assetUrls, spaceIds);

    // Step 4: Upload navPage space configs
    const success = await uploadNavPageSpacesStep();
    if (!success) {
      console.error('\n❌ Some steps failed. Check errors above.');
      process.exit(1);
    }

    // Summary
    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📋 Summary:');
    if (!flags.skipAssets) {
      console.log('  ✓ Nouns assets uploaded to ImgBB');
    }
    console.log('  ✓ NavPage spaces created');
    console.log('  ✓ Community configs seeded');
    console.log('  ✓ NavPage space configs uploaded');

    // Verify
    console.log('\n🔍 Verifying seeding...');
    await checkSeeding();
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
