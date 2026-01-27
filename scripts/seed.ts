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

const STORAGE_BUCKETS = [
  { id: 'spaces', name: 'spaces', public: true },
  { id: 'private', name: 'private', public: true },
  { id: 'explore', name: 'explore', public: false },
];

// Domain mappings for local development
// Note: Each community can only have one domain per domain_type due to DB constraint
// Using short names for local dev (production would use full domains)
const DOMAIN_MAPPINGS = [
  { community_id: 'nounspace.com', domain: 'nouns', domain_type: 'custom' },
  { community_id: 'clanker.space', domain: 'clanker', domain_type: 'custom' },
  { community_id: 'example', domain: 'example', domain_type: 'custom' },
];

/**
 * Step 1: Create storage buckets
 */
async function createStorageBucketsStep(): Promise<void> {
  console.log('\n📦 Step 1: Creating storage buckets...\n');

  for (const bucket of STORAGE_BUCKETS) {
    const { error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ✅ Bucket already exists: ${bucket.id}`);
      } else {
        console.error(`  ❌ Failed to create bucket ${bucket.id}:`, error.message);
      }
    } else {
      console.log(`  ✅ Created bucket: ${bucket.id}`);
    }
  }
}

/**
 * Step 2: Upload Nouns assets to ImgBB
 */
async function uploadNounsAssetsStep(): Promise<Record<string, string>> {
  console.log('\n📤 Step 2: Uploading Nouns assets to ImgBB...\n');

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
 * Step 3: Create navPage space registrations
 */
async function createNavPageSpacesStep(): Promise<Record<string, string | null>> {
  console.log('\n🏗️  Step 3: Creating navPage space registrations...\n');

  const spaceNames = ['nouns-home', 'nouns-explore', 'clanker-home'];
  const spaceIds: Record<string, string | null> = {};

  for (const spaceName of spaceNames) {
    spaceIds[spaceName] = await createNavPageSpace(spaceName);
  }

  return spaceIds;
}

/**
 * Step 4: Seed community configs to database
 */
async function seedCommunityConfigsStep(
  assetUrls: Record<string, string>,
  spaceIds: Record<string, string | null>,
): Promise<void> {
  console.log('\n⚙️  Step 4: Seeding community configs...\n');

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
 * Step 5: Create domain mappings
 */
async function seedDomainMappingsStep(): Promise<void> {
  console.log('\n🌐 Step 5: Creating domain mappings...\n');

  for (const mapping of DOMAIN_MAPPINGS) {
    const { error } = await supabase
      .from('community_domains')
      .upsert(mapping, { onConflict: 'domain' });

    if (error) {
      console.error(`  ❌ Failed to map ${mapping.domain}:`, error.message);
    } else {
      console.log(`  ✅ Mapped ${mapping.domain} → ${mapping.community_id}`);
    }
  }
}

/**
 * Step 6: Upload navPage space configs to Storage
 */
async function uploadNavPageSpacesStep(): Promise<boolean> {
  console.log('\n📤 Step 6: Uploading navPage space configs to Storage...\n');

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

const EXPECTED_COMMUNITIES = ['nounspace.com', 'clanker.space', 'example'];
const EXPECTED_SPACES = ['nouns-home', 'nouns-explore', 'clanker-home'];
const EXPECTED_BUCKETS = ['spaces', 'private', 'explore'];
const EXPECTED_DOMAINS = ['nouns', 'clanker', 'example'];

type CheckResult = { pass: boolean; message: string };

/**
 * Check storage buckets exist
 */
async function checkStorageBuckets(): Promise<CheckResult> {
  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    return { pass: false, message: `Error: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { pass: false, message: 'No buckets found' };
  }

  const foundBuckets = data.map((b) => b.id);
  const missing = EXPECTED_BUCKETS.filter((id) => !foundBuckets.includes(id));

  if (missing.length > 0) {
    return { pass: false, message: `Missing: ${missing.join(', ')}` };
  }

  return { pass: true, message: `${EXPECTED_BUCKETS.length} buckets exist` };
}

/**
 * Check domain mappings exist
 */
async function checkDomainMappings(): Promise<CheckResult> {
  const { data, error } = await supabase
    .from('community_domains')
    .select('domain, community_id');

  if (error) {
    return { pass: false, message: `Error: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { pass: false, message: 'No domain mappings found' };
  }

  const foundDomains = data.map((d) => d.domain);
  const missing = EXPECTED_DOMAINS.filter((d) => !foundDomains.includes(d));

  if (missing.length > 0) {
    return { pass: false, message: `Missing: ${missing.join(', ')}` };
  }

  return { pass: true, message: `${data.length} domains mapped` };
}

/**
 * Check community configs in database
 */
async function checkCommunityConfigs(): Promise<CheckResult> {
  const { data, error } = await supabase
    .from('community_configs')
    .select('community_id, is_published, updated_at');

  if (error) {
    return { pass: false, message: `Error: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { pass: false, message: 'No configs found' };
  }

  const foundIds = data.map((c) => c.community_id);
  const missing = EXPECTED_COMMUNITIES.filter((id) => !foundIds.includes(id));

  if (missing.length > 0) {
    return { pass: false, message: `Missing: ${missing.join(', ')}` };
  }

  const details = data.map((c) => `${c.community_id} (${c.is_published ? '✓' : '✗'})`).join(', ');
  return { pass: true, message: details };
}

/**
 * Check navPage space registrations
 */
async function checkSpaceRegistrations(): Promise<CheckResult> {
  const { data, error } = await supabase
    .from('spaceRegistrations')
    .select('spaceName, spaceId')
    .eq('spaceType', 'navPage');

  if (error) {
    return { pass: false, message: `Error: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { pass: false, message: 'No navPage spaces found' };
  }

  const foundNames = data.map((s) => s.spaceName);
  const missing = EXPECTED_SPACES.filter((name) => !foundNames.includes(name));

  if (missing.length > 0) {
    return { pass: false, message: `Missing: ${missing.join(', ')}` };
  }

  return { pass: true, message: `${data.length} spaces registered` };
}

/**
 * Check space configs in storage
 */
async function checkStorageConfigs(): Promise<CheckResult> {
  const results: string[] = [];
  let allPass = true;

  for (const spaceName of EXPECTED_SPACES) {
    // Get spaceId
    const { data: reg } = await supabase
      .from('spaceRegistrations')
      .select('spaceId')
      .eq('spaceName', spaceName)
      .eq('spaceType', 'navPage')
      .single();

    if (!reg?.spaceId) {
      results.push(`${spaceName}: no registration`);
      allPass = false;
      continue;
    }

    // Check tabOrder file exists
    const { data: tabOrder } = await supabase.storage
      .from('spaces')
      .download(`${reg.spaceId}/tabOrder`);

    if (!tabOrder) {
      results.push(`${spaceName}: no tabOrder`);
      allPass = false;
      continue;
    }

    // Parse tabOrder to check tabs
    const tabOrderJson = JSON.parse(await tabOrder.text());
    const tabCount = tabOrderJson.tabOrder?.length || 0;

    // Verify each tab exists
    let tabsOk = true;
    for (const tabName of tabOrderJson.tabOrder || []) {
      const { data: tab } = await supabase.storage
        .from('spaces')
        .download(`${reg.spaceId}/tabs/${tabName}`);
      if (!tab) {
        tabsOk = false;
        break;
      }
    }

    if (tabsOk) {
      results.push(`${spaceName}: ${tabCount} tab(s) ✓`);
    } else {
      results.push(`${spaceName}: missing tabs`);
      allPass = false;
    }
  }

  return { pass: allPass, message: results.join(', ') };
}

/**
 * Check RPC function works
 */
async function checkRpcFunction(): Promise<CheckResult> {
  const { data, error } = await supabase
    .rpc('get_active_community_config', { p_community_id: 'nounspace.com' })
    .single();

  if (error) {
    return { pass: false, message: `Error: ${error.message}` };
  }

  if (!data || !(data as any).brand) {
    return { pass: false, message: 'Invalid response structure' };
  }

  return { pass: true, message: 'Returns valid config' };
}

/**
 * Run all seed verification checks
 */
async function checkSeeding(): Promise<boolean> {
  console.log('🔍 Verifying seed data...\n');

  const checks = [
    { name: 'Storage Buckets', fn: checkStorageBuckets },
    { name: 'Community Configs', fn: checkCommunityConfigs },
    { name: 'Domain Mappings', fn: checkDomainMappings },
    { name: 'Space Registrations', fn: checkSpaceRegistrations },
    { name: 'Storage Configs', fn: checkStorageConfigs },
    { name: 'RPC Function', fn: checkRpcFunction },
  ];

  let allPass = true;

  for (const check of checks) {
    const result = await check.fn();
    const icon = result.pass ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${result.message}`);
    if (!result.pass) allPass = false;
  }

  console.log('');
  if (allPass) {
    console.log('✅ All checks passed! Database is properly seeded.');
  } else {
    console.log('❌ Some checks failed. Run: tsx scripts/seed.ts');
  }

  return allPass;
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
    // Step 1: Create storage buckets
    await createStorageBucketsStep();

    // Step 2: Upload assets (skip if --skip-assets)
    let assetUrls: Record<string, string> = {};
    if (!flags.skipAssets) {
      assetUrls = await uploadNounsAssetsStep();
    } else {
      console.log('\n⏭️  Skipping asset upload (--skip-assets flag)');
    }

    // Step 3: Create navPage spaces
    const spaceIds = await createNavPageSpacesStep();

    // Step 4: Seed community configs
    await seedCommunityConfigsStep(assetUrls, spaceIds);

    // Step 5: Seed domain mappings
    await seedDomainMappingsStep();

    // Step 6: Upload navPage space configs
    const success = await uploadNavPageSpacesStep();
    if (!success) {
      console.error('\n❌ Some steps failed. Check errors above.');
      process.exit(1);
    }

    // Summary
    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✓ Storage buckets created');
    if (!flags.skipAssets) {
      console.log('  ✓ Nouns assets uploaded to ImgBB');
    }
    console.log('  ✓ NavPage spaces created');
    console.log('  ✓ Community configs seeded');
    console.log('  ✓ Domain mappings created');
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
