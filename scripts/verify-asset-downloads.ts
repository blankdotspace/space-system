#!/usr/bin/env tsx
/**
 * Verification script to check if ImgBB assets are being downloaded during build
 * 
 * This script:
 * 1. Checks the database for ImgBB URLs in assets_config
 * 2. Verifies if files exist in public/images/{community}/
 * 3. Shows what URLs are stored vs what should be downloaded
 * 
 * Usage:
 *   tsx scripts/verify-asset-downloads.ts
 * 
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - NEXT_PUBLIC_TEST_COMMUNITY (required, specify which community to verify)
 * 
 * Usage:
 *   NEXT_PUBLIC_TEST_COMMUNITY=example tsx scripts/verify-asset-downloads.ts
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const community = process.env.NEXT_PUBLIC_TEST_COMMUNITY;

if (!community) {
  console.error('❌ Missing required environment variable:');
  console.error('   NEXT_PUBLIC_TEST_COMMUNITY');
  console.error('   Example: NEXT_PUBLIC_TEST_COMMUNITY=example tsx scripts/verify-asset-downloads.ts');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check if URL is from ImgBB
 */
function isImgBBUrl(url: string): boolean {
  return url.includes('i.ibb.co') || url.includes('ibb.co') || url.includes('imgbb.com');
}

/**
 * Extract filename from URL
 */
function getFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || '';
    // Remove query params
    return filename.split('?')[0] || 'unknown';
  } catch {
    // If not a valid URL, treat as path
    return url.split('/').pop() || 'unknown';
  }
}

/**
 * Type for config returned from database
 */
type DatabaseConfig = {
  brand?: any;
  assets?: {
    logos?: {
      main?: string;
      icon?: string;
      favicon?: string;
      appleTouch?: string;
      og?: string;
      splash?: string;
    };
  };
  [key: string]: any;
};

/**
 * Main verification function
 */
async function verifyAssetDownloads() {
  console.log('🔍 Verifying asset downloads from ImgBB...\n');
  console.log(`📦 Community: ${community}\n`);

  // Fetch config from database
  const { data, error } = await supabase
    .rpc('get_active_community_config', { p_community_id: community })
    .single();

  if (error || !data) {
    console.error('❌ Failed to fetch config from database:', error?.message);
    process.exit(1);
  }

  const config = data as DatabaseConfig;

  if (!config.assets?.logos) {
    console.error('❌ No assets_config.logos found in config');
    process.exit(1);
  }

  const logos = config.assets.logos;
  const assetTypes = ['main', 'icon', 'favicon', 'appleTouch', 'og', 'splash'];

  console.log('📋 Assets in database:\n');

  const imgBBUrls: Array<{ type: string; url: string }> = [];
  const localPaths: Array<{ type: string; path: string }> = [];

  for (const assetType of assetTypes) {
    const url = logos[assetType];
    if (!url) continue;

    if (isImgBBUrl(url)) {
      imgBBUrls.push({ type: assetType, url });
      console.log(`  ${assetType.padEnd(12)} → 🔗 ${url} (ImgBB)`);
    } else if (url.startsWith('/')) {
      localPaths.push({ type: assetType, path: url });
      console.log(`  ${assetType.padEnd(12)} → 📁 ${url} (local)`);
    } else {
      console.log(`  ${assetType.padEnd(12)} → ❓ ${url} (unknown format)`);
    }
  }

  if (imgBBUrls.length === 0) {
    console.log('\n⚠️  No ImgBB URLs found in database!');
    console.log('   This means either:');
    console.log('   - Assets were not uploaded to ImgBB');
    console.log('   - Database still has local paths');
    console.log('   - You need to run: tsx scripts/seed-all.ts');
    return;
  }

  console.log(`\n✅ Found ${imgBBUrls.length} ImgBB URL(s)`);

  // Check if downloaded files exist
  const assetsDir = join(__dirname, '..', 'public', 'images', community as string);
  console.log(`\n📂 Checking download directory: ${assetsDir}\n`);

  if (!existsSync(assetsDir)) {
    console.log('❌ Download directory does not exist!');
    console.log('   Run a build to trigger downloads: npm run build');
    return;
  }

  const filesInDir = readdirSync(assetsDir).filter((file) => {
    const filePath = join(assetsDir, file);
    return statSync(filePath).isFile();
  });

  console.log(`📁 Files in directory (${filesInDir.length}):`);
  filesInDir.forEach((file) => {
    const filePath = join(assetsDir, file);
    const stats = statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`  - ${file} (${sizeKB} KB)`);
  });

  // Check if each ImgBB URL has a corresponding downloaded file
  console.log(`\n🔍 Verifying downloads:\n`);

  let allDownloaded = true;
  for (const { type, url } of imgBBUrls) {
    const expectedFilename = getFilenameFromUrl(url);
    const filePath = join(assetsDir, expectedFilename);
    const exists = existsSync(filePath);

    if (exists) {
      const stats = statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`  ✅ ${type.padEnd(12)} → ${expectedFilename} (${sizeKB} KB)`);
    } else {
      console.log(`  ❌ ${type.padEnd(12)} → ${expectedFilename} (NOT FOUND)`);
      console.log(`     Expected from: ${url}`);
      allDownloaded = false;
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(60));
  if (allDownloaded) {
    console.log('✅ All ImgBB assets have been downloaded successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npm run build');
    console.log('   2. Check build logs for: "✅ Downloaded ..." messages');
    console.log('   3. Verify images load from local paths in the app');
  } else {
    console.log('⚠️  Some assets are missing from the download directory');
    console.log('\n💡 To fix:');
    console.log('   1. Run: npm run build');
    console.log('   2. The build process should automatically download missing assets');
    console.log('   3. Check build logs for any download errors');
  }

  // Note: Config is now loaded at runtime from database, not from env var
  console.log('\nℹ️  Config is loaded at runtime from database');
  console.log('   Assets are downloaded during build and stored in public/images/');
}

verifyAssetDownloads().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});

