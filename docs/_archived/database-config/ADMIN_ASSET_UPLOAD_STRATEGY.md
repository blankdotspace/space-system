# Admin Asset Upload Strategy

## Overview

Admins need to upload assets through the admin UI (no repo access), and those assets must be available at build time. This requires:

1. **Asset upload** - Admins upload to Supabase Storage
2. **Asset storage** - Store asset URLs/paths in database
3. **Build-time download** - Download assets during build
4. **Asset resolution** - Make assets available to Next.js

## Architecture

```
Admin UI → Upload to Supabase Storage → Store URLs in DB
                                              ↓
                                    Build Time:
                                    Download Assets
                                    → Copy to public/
                                    → Reference in Config
```

## Implementation

### 1. Database Schema

Add asset storage information to the config:

```sql
-- In community_configs table, assets_config JSONB column:
{
  "logos": {
    "main": {
      "storagePath": "community-assets/nouns/logo.svg",
      "publicUrl": "https://{supabase-url}/storage/v1/object/public/community-assets/nouns/logo.svg",
      "localPath": "/images/nouns/logo.svg"  // Where it will be in public/ after build
    },
    "icon": {
      "storagePath": "community-assets/nouns/noggles.svg",
      "publicUrl": "https://...",
      "localPath": "/images/nouns/noggles.svg"
    },
    // ... etc
  }
}
```

Or simpler - just store storage paths, generate URLs at build time:

```json
{
  "assets": {
    "logos": {
      "main": "community-assets/nouns/logo.svg",
      "icon": "community-assets/nouns/noggles.svg",
      "favicon": "community-assets/nouns/favicon.ico",
      "appleTouch": "community-assets/nouns/apple-touch.png",
      "og": "community-assets/nouns/og.png",
      "splash": "community-assets/nouns/splash.png"
    }
  }
}
```

### 2. Supabase Storage Setup

Create a storage bucket for community assets:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-assets', 'community-assets', true);

-- Set up RLS policies
CREATE POLICY "Admins can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-assets' AND
  EXISTS (
    SELECT 1 FROM community_config_admins cca
    WHERE cca.admin_identity_public_key = auth.uid()::text
    AND cca.is_active = true
  )
);

CREATE POLICY "Public can read assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-assets');
```

### 3. Build-Time Asset Download

```javascript
// next.config.mjs

import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function downloadAsset(supabase, storagePath, localPath) {
  try {
    const { data, error } = await supabase.storage
      .from('community-assets')
      .download(storagePath);
    
    if (error || !data) {
      console.warn(`⚠️  Failed to download ${storagePath}:`, error?.message);
      return false;
    }
    
    // Ensure directory exists
    const fullPath = join(__dirname, 'public', localPath);
    const dir = dirname(fullPath);
    await mkdir(dir, { recursive: true });
    
    // Convert blob to buffer and write
    const buffer = Buffer.from(await data.arrayBuffer());
    await writeFile(fullPath, buffer);
    
    console.log(`✅ Downloaded ${storagePath} → ${localPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error downloading ${storagePath}:`, error.message);
    return false;
  }
}

async function downloadAssets(config, communityId) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Missing Supabase credentials, skipping asset download');
    return config;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const assets = config.assets?.logos || {};
  const downloadedAssets = {};
  
  // Download each asset
  for (const [key, storagePath] of Object.entries(assets)) {
    if (typeof storagePath === 'string' && storagePath.startsWith('community-assets/')) {
      // Generate local path
      const localPath = `/images/${communityId}/${storagePath.split('/').pop()}`;
      
      // Download asset
      const success = await downloadAsset(supabase, storagePath, localPath);
      
      if (success) {
        downloadedAssets[key] = localPath;
      } else {
        // Fall back to static asset if download fails
        console.warn(`⚠️  Using static fallback for ${key}`);
        downloadedAssets[key] = null; // Will be replaced with static in loader
      }
    } else if (typeof storagePath === 'string') {
      // Already a public path, use as-is
      downloadedAssets[key] = storagePath;
    }
  }
  
  // Update config with downloaded asset paths
  return {
    ...config,
    assets: {
      logos: downloadedAssets
    }
  };
}

async function generateConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Missing Supabase credentials, using static config');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const community = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  try {
    const { data, error } = await supabase
      .rpc('get_active_community_config', { p_community_id: community })
      .single();
    
    if (error || !data) {
      console.warn('⚠️  No config in DB, using static');
      return;
    }
    
    // Download assets from Supabase Storage
    const configWithAssets = await downloadAssets(data, community);
    
    // Set as env var
    process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG = JSON.stringify(configWithAssets);
    console.log('✅ Loaded config with downloaded assets from database');
  } catch (error) {
    console.warn('⚠️  Error loading config:', error.message);
  }
}

await generateConfig();

// Continue with Next.js config...
```

### 4. Config Loader with Asset Fallback

```typescript
// src/config/index.ts

import { SystemConfig } from './systemConfig';
import { nounsSystemConfig } from './nouns/index';
import { clankerSystemConfig } from './clanker/index';
import { exampleSystemConfig } from './example/index';

// Import static assets for fallback
import { nounsAssets } from './nouns/nouns.assets';
import { clankerAssets } from './clanker/clanker.assets';
import { exampleAssets } from './example/example.assets';

const STATIC_CONFIGS: Record<string, SystemConfig> = {
  nouns: nounsSystemConfig,
  clanker: clankerSystemConfig as unknown as SystemConfig,
  example: exampleSystemConfig,
};

const STATIC_ASSETS: Record<string, typeof nounsAssets> = {
  nouns: nounsAssets,
  clanker: clankerAssets,
  example: exampleAssets,
};

export const loadSystemConfig = (): SystemConfig => {
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  const community = communityConfig.toLowerCase();
  
  const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
  
  if (buildTimeConfig) {
    try {
      const dbConfig = JSON.parse(buildTimeConfig) as SystemConfig;
      const staticAssets = STATIC_ASSETS[community];
      
      // Merge assets: use downloaded assets, fall back to static
      const mergedAssets = {
        logos: {
          main: dbConfig.assets?.logos?.main || staticAssets?.logos.main,
          icon: dbConfig.assets?.logos?.icon || staticAssets?.logos.icon,
          favicon: dbConfig.assets?.logos?.favicon || staticAssets?.logos.favicon,
          appleTouch: dbConfig.assets?.logos?.appleTouch || staticAssets?.logos.appleTouch,
          og: dbConfig.assets?.logos?.og || staticAssets?.logos.og,
          splash: dbConfig.assets?.logos?.splash || staticAssets?.logos.splash,
        }
      };
      
      return {
        ...dbConfig,
        assets: mergedAssets,
      };
    } catch (error) {
      console.warn('Failed to parse build-time config:', error);
    }
  }
  
  return STATIC_CONFIGS[community] || STATIC_CONFIGS.nouns;
};
```

### 5. Admin Upload API

```typescript
// src/app/api/admin/assets/upload/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const communityId = formData.get('communityId') as string;
  const assetType = formData.get('assetType') as string; // 'main', 'icon', etc.
  
  // Verify admin permissions (use your auth system)
  const adminIdentity = request.headers.get('x-admin-identity');
  if (!adminIdentity) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Check admin permissions
  const { data: admin } = await supabase
    .from('community_config_admins')
    .select('id')
    .eq('community_id', communityId)
    .eq('admin_identity_public_key', adminIdentity)
    .eq('is_active', true)
    .single();
  
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Generate storage path
  const fileExt = file.name.split('.').pop();
  const storagePath = `community-assets/${communityId}/${assetType}.${fileExt}`;
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('community-assets')
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type,
    });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('community-assets')
    .getPublicUrl(storagePath);
  
  // Update config in database
  // (You'll need to update the assets_config JSONB column)
  
  return NextResponse.json({
    success: true,
    storagePath,
    publicUrl,
  });
}
```

### 6. Admin UI Component

```typescript
// src/app/admin/config/[communityId]/assets/page.tsx

'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';

export default function AssetUploadPage({ params }: { params: { communityId: string } }) {
  const [uploading, setUploading] = useState(false);
  
  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('communityId', params.communityId);
    formData.append('assetType', 'main'); // or from UI selection
    
    try {
      const response = await fetch('/api/admin/assets/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'x-admin-identity': getAdminIdentity(), // Your auth
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update config in DB
        await updateConfigAsset(params.communityId, 'main', result.storagePath);
        alert('Asset uploaded! Trigger rebuild to see changes.');
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };
  
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.svg', '.png', '.jpg', '.jpeg', '.webp'],
    },
  });
  
  return (
    <div>
      <h1>Upload Assets</h1>
      <div {...getRootProps()} className="border-dashed border-2 p-8">
        <input {...getInputProps()} />
        <p>Drag & drop assets here, or click to select</p>
      </div>
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

## Asset Path Structure

### Storage Paths (in Supabase)
```
community-assets/
  ├── nouns/
  │   ├── logo.svg
  │   ├── noggles.svg
  │   ├── favicon.ico
  │   ├── apple-touch.png
  │   ├── og.png
  │   └── splash.png
  ├── clanker/
  │   └── ...
  └── example/
      └── ...
```

### Public Paths (after build)
```
public/
  └── images/
      ├── nouns/
      │   ├── logo.svg
      │   ├── noggles.svg
      │   └── ...
      ├── clanker/
      │   └── ...
      └── example/
          └── ...
```

## Build Process Flow

1. **Build starts** → `next.config.mjs` runs
2. **Fetch config** → Get config from database
3. **Download assets** → For each asset in config:
   - Download from Supabase Storage
   - Save to `public/images/{community}/{filename}`
4. **Update config** → Replace storage paths with public paths
5. **Set env var** → Store config with public paths
6. **Next.js build** → Uses config with public paths
7. **Assets available** → Served from `public/` folder

## Benefits

✅ **Admin uploads** - No repo access needed  
✅ **Build-time availability** - Assets downloaded before build  
✅ **Public paths** - Assets served from `public/` folder  
✅ **Fallback safety** - Static assets if download fails  
✅ **Version control** - Assets stored in Supabase Storage  
✅ **CDN ready** - Can be served via CDN if needed  

## Considerations

1. **Build time** - Asset downloads add ~1-2 seconds per community
2. **Storage costs** - Supabase Storage usage
3. **Cache invalidation** - May need to clear Next.js cache after asset updates
4. **File size limits** - Set reasonable limits for uploads
5. **File types** - Validate file types (SVG, PNG, etc.)

## Alternative: CDN URLs

If you want to skip downloads entirely, you could:

1. Upload to Supabase Storage
2. Store public URLs directly in config
3. Use URLs directly (no download needed)

```json
{
  "assets": {
    "logos": {
      "main": "https://{supabase-url}/storage/v1/object/public/community-assets/nouns/logo.svg"
    }
  }
}
```

**Pros:** Faster builds, no local storage  
**Cons:** External dependency, no bundling, CDN costs

## Recommended Approach

**Download to public/ folder** because:
- ✅ Assets are part of the build
- ✅ No external dependencies at runtime
- ✅ Can be cached/CDN'd with the app
- ✅ Works offline
- ✅ Predictable paths

This gives you the best balance of admin flexibility and build reliability.

