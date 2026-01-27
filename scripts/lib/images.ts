/**
 * Supabase Storage upload utilities for seed script assets
 */

import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { supabase } from './supabase';

const IMAGES_BUCKET = 'images';

/**
 * Get the MIME type for a file based on extension
 */
function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Upload a file to Supabase Storage images bucket
 */
export async function uploadToSupabaseStorage(
  filePath: string,
  filename: string,
  folder: string = 'seed'
): Promise<string | null> {
  try {
    const fileBuffer = await readFile(filePath);
    const mimeType = getMimeType(filename);
    const storagePath = `${folder}/${filename}`;

    const { error } = await supabase.storage
      .from(IMAGES_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(IMAGES_BUCKET)
      .getPublicUrl(storagePath);

    const imageUrl = urlData.publicUrl;
    console.log(`  ✅ Uploaded ${filename} → ${imageUrl}`);
    return imageUrl;
  } catch (error: any) {
    console.error(`  ❌ Failed to upload ${filename}:`, error.message);
    return null;
  }
}

export type AssetMapping = {
  file: string;
  key: string;
};

/**
 * Upload multiple assets from a directory to Supabase Storage
 */
export async function uploadAssets(
  assetsDir: string,
  assets: AssetMapping[],
  fallbackPathPrefix: string,
  folder: string = 'seed'
): Promise<Record<string, string>> {
  const uploadedUrls: Record<string, string> = {};

  for (const asset of assets) {
    const filePath = join(assetsDir, asset.file);
    const url = await uploadToSupabaseStorage(filePath, asset.file, folder);
    if (url) {
      uploadedUrls[asset.key] = url;
    } else {
      // Fallback to local paths if upload fails
      uploadedUrls[asset.key] = `${fallbackPathPrefix}/${asset.file}`;
    }
  }

  return uploadedUrls;
}

/**
 * Create the images bucket if it doesn't exist
 */
export async function ensureImagesBucket(): Promise<boolean> {
  const { error } = await supabase.storage.createBucket(IMAGES_BUCKET, {
    public: true,
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log(`  ✅ Bucket already exists: ${IMAGES_BUCKET}`);
      return true;
    }
    console.error(`  ❌ Failed to create bucket ${IMAGES_BUCKET}:`, error.message);
    return false;
  }

  console.log(`  ✅ Created bucket: ${IMAGES_BUCKET}`);
  return true;
}
