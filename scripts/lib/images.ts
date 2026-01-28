/**
 * Supabase Storage upload utilities for seed scripts
 *
 * Uploads community assets to the 'images' bucket in Supabase Storage.
 * Replaces ImgBB with self-hosted storage.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import { supabase } from './supabase';

const IMAGES_BUCKET = 'images';

/**
 * Get the MIME type for a file based on extension
 */
function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Upload a single file to Supabase Storage
 *
 * @param filePath - Local path to the file
 * @param storagePath - Path in the storage bucket (e.g., 'nouns/logo.svg')
 * @returns Public URL of the uploaded file, or null on failure
 */
export async function uploadToSupabaseStorage(
  filePath: string,
  storagePath: string,
): Promise<string | null> {
  if (!existsSync(filePath)) {
    console.error(`  ❌ File not found: ${filePath}`);
    return null;
  }

  try {
    const fileBuffer = await readFile(filePath);
    const mimeType = getMimeType(filePath);

    // Upload to Supabase Storage (upsert to overwrite if exists)
    const { error } = await supabase.storage
      .from(IMAGES_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(IMAGES_BUCKET)
      .getPublicUrl(storagePath);

    console.log(`  ✅ Uploaded ${storagePath}`);
    return urlData.publicUrl;
  } catch (error: any) {
    console.error(`  ❌ Failed to upload ${storagePath}:`, error.message);
    return null;
  }
}

export type AssetMapping = {
  file: string;
  key: string;
};

export type AssetConfig = {
  directory: string;
  files: AssetMapping[];
  storageFolder: string;
};

/**
 * Upload multiple assets from a directory to Supabase Storage
 *
 * @param assetsDir - Base directory containing assets
 * @param config - Asset configuration with files and storage folder
 * @returns Record of asset keys to their public URLs
 */
export async function uploadAssets(
  assetsDir: string,
  config: AssetConfig,
): Promise<Record<string, string>> {
  const uploadedUrls: Record<string, string> = {};
  const sourceDir = join(assetsDir, config.directory);

  for (const asset of config.files) {
    const filePath = join(sourceDir, asset.file);
    const storagePath = `${config.storageFolder}/${asset.file}`;

    const url = await uploadToSupabaseStorage(filePath, storagePath);
    if (url) {
      uploadedUrls[asset.key] = url;
    }
  }

  return uploadedUrls;
}

/**
 * Ensure the images bucket exists and is public
 */
export async function ensureImagesBucket(): Promise<boolean> {
  try {
    // Try to get bucket info
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.id === IMAGES_BUCKET);

    if (!exists) {
      // Create the bucket
      const { error } = await supabase.storage.createBucket(IMAGES_BUCKET, {
        public: true,
      });

      if (error) {
        // Bucket might already exist (race condition)
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
      console.log(`  ✅ Created '${IMAGES_BUCKET}' bucket`);
    } else {
      console.log(`  ✅ '${IMAGES_BUCKET}' bucket exists`);
    }

    return true;
  } catch (error: any) {
    console.error(`  ❌ Failed to ensure images bucket:`, error.message);
    return false;
  }
}
