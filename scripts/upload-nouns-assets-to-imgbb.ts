#!/usr/bin/env tsx
/**
 * Upload Nouns brand assets to ImgBB and generate updated seed SQL
 * 
 * This script:
 * 1. Reads image files from src/config/nouns/assets/
 * 2. Uploads them to ImgBB
 * 3. Outputs the URLs and updated SQL for seed.sql
 * 
 * Usage:
 *   tsx scripts/upload-nouns-assets-to-imgbb.ts
 * 
 * Requires:
 *   - NEXT_PUBLIC_IMGBB_API_KEY environment variable
 * 
 * After running, copy the generated SQL into supabase/seed.sql
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const imgBBApiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

if (!imgBBApiKey) {
  console.error('❌ Missing required environment variable: NEXT_PUBLIC_IMGBB_API_KEY');
  console.error('   Get your API key from: https://api.imgbb.com/');
  process.exit(1);
}

/**
 * Upload a file to ImgBB using base64 encoding
 */
async function uploadToImgBB(filePath: string, filename: string): Promise<string> {
  try {
    // Read file from filesystem
    const fileBuffer = await readFile(filePath);
    
    // Convert to base64 (ImgBB accepts base64-encoded images via form-urlencoded)
    const base64 = fileBuffer.toString('base64');

    // ImgBB API accepts base64 as 'image' parameter via application/x-www-form-urlencoded
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
    console.log(`✅ Uploaded ${filename} → ${imageUrl}`);
    return imageUrl;

  } catch (error: any) {
    console.error(`❌ Failed to upload ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const assetsDir = join(__dirname, '..', 'src', 'config', 'nouns', 'assets');
  
  // Define which assets to upload
  const assetsToUpload = [
    { file: 'logo.svg', key: 'main' },
    { file: 'noggles.svg', key: 'icon' },
    { file: 'og.svg', key: 'og' },
    { file: 'splash.svg', key: 'splash' },
  ];

  console.log('📤 Uploading Nouns assets to ImgBB...\n');

  const uploadedUrls: Record<string, string> = {};

  // Upload each asset
  for (const asset of assetsToUpload) {
    const filePath = join(assetsDir, asset.file);
    try {
      const url = await uploadToImgBB(filePath, asset.file);
      uploadedUrls[asset.key] = url;
    } catch (error) {
      console.error(`Failed to upload ${asset.file}, skipping...`);
    }
  }

  // Keep existing paths for favicon and appleTouch (these are already in public folder)
  uploadedUrls['favicon'] = '/images/favicon.ico';
  uploadedUrls['appleTouch'] = '/images/apple-touch-icon.png';

  console.log('\n✅ All assets uploaded!\n');
  console.log('📋 Copy this SQL snippet into supabase/seed.sql (replace line 101, the assets_config value):\n');
  console.log('─'.repeat(80));
  
  // Generate SQL with proper escaping for PostgreSQL JSON
  // PostgreSQL JSON strings need single quotes, and single quotes need to be doubled
  const assetsConfig = {
    logos: {
      main: uploadedUrls.main || '/images/nouns/logo.svg',
      icon: uploadedUrls.icon || '/images/nouns/noggles.svg',
      favicon: uploadedUrls.favicon || '/images/favicon.ico',
      appleTouch: uploadedUrls.appleTouch || '/images/apple-touch-icon.png',
      og: uploadedUrls.og || '/images/nouns/og.svg',
      splash: uploadedUrls.splash || '/images/nouns/splash.svg',
    },
  };

  // Convert to JSON string, escape single quotes for SQL
  const jsonString = JSON.stringify(assetsConfig);
  const sqlEscaped = jsonString.replace(/'/g, "''"); // Double single quotes for SQL
  
  const sqlSnippet = `    '${sqlEscaped}'::jsonb,`;

  console.log(sqlSnippet);
  console.log('─'.repeat(80));
  console.log('\n📝 Full assets_config JSON for reference:\n');
  console.log(JSON.stringify(assetsConfig, null, 2));
  console.log('\n💡 Replace line 101 in supabase/seed.sql with the SQL snippet above.\n');
}

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

