/**
 * ImgBB upload utilities for seed scripts
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

const imgBBApiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

/**
 * Upload a file to ImgBB using base64 encoding
 */
export async function uploadToImgBB(filePath: string, filename: string): Promise<string | null> {
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

export type AssetMapping = {
  file: string;
  key: string;
};

/**
 * Upload multiple assets from a directory to ImgBB
 */
export async function uploadAssets(
  assetsDir: string,
  assets: AssetMapping[],
  fallbackPathPrefix: string,
): Promise<Record<string, string>> {
  const uploadedUrls: Record<string, string> = {};

  for (const asset of assets) {
    const filePath = join(assetsDir, asset.file);
    const url = await uploadToImgBB(filePath, asset.file);
    if (url) {
      uploadedUrls[asset.key] = url;
    } else {
      // Fallback to local paths if upload fails or API key missing
      uploadedUrls[asset.key] = `${fallbackPathPrefix}/${asset.file}`;
    }
  }

  return uploadedUrls;
}

