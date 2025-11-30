# Assets Config and Storage Relationship

## Overview

Yes, `assets_config` is directly tied to assets uploaded to Supabase Storage. The paths stored in `assets_config` reference assets in the `community-assets` storage bucket, which are then downloaded at build time.

## The Relationship

### 1. Admin Uploads Asset

When an admin uploads an asset via the admin UI:

```
Admin UI → Upload to Supabase Storage
         → Store path in assets_config
```

**Example:**
- Admin uploads `logo.svg` for Nouns community
- Asset stored at: `community-assets/nouns/logo.svg` in Supabase Storage
- `assets_config` updated to: `"main": "community-assets/nouns/logo.svg"`

### 2. Database Storage

The `assets_config` JSONB column stores the **storage path**:

```json
{
  "logos": {
    "main": "community-assets/nouns/logo.svg",      // ← Supabase Storage path
    "icon": "community-assets/nouns/noggles.svg",   // ← Supabase Storage path
    "favicon": "community-assets/nouns/favicon.ico",
    "appleTouch": "community-assets/nouns/apple-touch.png",
    "og": "community-assets/nouns/og.png",
    "splash": "community-assets/nouns/splash.png"
  }
}
```

### 3. Build-Time Download

During build (`next.config.mjs`), assets are downloaded:

```javascript
// next.config.mjs

async function downloadAssets(config, communityId) {
  const assets = config.assets?.logos || {};
  
  for (const [key, storagePath] of Object.entries(assets)) {
    if (storagePath.startsWith('community-assets/')) {
      // Download from Supabase Storage
      const { data } = await supabase.storage
        .from('community-assets')
        .download(storagePath);
      
      // Save to public/images/{community}/
      const localPath = `/images/${communityId}/${filename}`;
      await writeFile(`public${localPath}`, buffer);
      
      // Update config with public path
      assets[key] = localPath;  // ← Changed to public path
    }
  }
  
  return { ...config, assets: { logos: assets } };
}
```

### 4. Runtime Usage

After build, the app uses **public paths**:

```typescript
// src/config/index.ts

const config = loadSystemConfig();
const logoSrc = config.assets.logos.main;  // "/images/nouns/logo.svg"
```

## Complete Flow Diagram

```
┌─────────────────┐
│  Admin Uploads  │
│   logo.svg      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Supabase Storage       │
│  community-assets/      │
│    └─ nouns/            │
│       └─ logo.svg       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Database               │
│  assets_config JSONB    │
│  "main": "community-   │
│    assets/nouns/        │
│    logo.svg"           │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Build Time             │
│  next.config.mjs        │
│  1. Read storage path   │
│  2. Download from       │
│     Supabase Storage    │
│  3. Save to public/     │
│  4. Update config to    │
│     public path         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  public/images/         │
│    └─ nouns/            │
│       └─ logo.svg       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Runtime                │
│  App uses:              │
│  "/images/nouns/        │
│    logo.svg"            │
└─────────────────────────┘
```

## Database Schema

### Storage Path Format (in database)

```json
{
  "logos": {
    "main": "community-assets/nouns/logo.svg"
  }
}
```

**Format:** `community-assets/{communityId}/{filename}`

### Public Path Format (after build)

```json
{
  "logos": {
    "main": "/images/nouns/logo.svg"
  }
}
```

**Format:** `/images/{communityId}/{filename}`

## Implementation Details

### Admin Upload API

```typescript
// src/app/api/admin/assets/upload/route.ts

export async function POST(request: NextRequest) {
  const file = formData.get('file') as File;
  const communityId = formData.get('communityId') as string;
  const assetType = formData.get('assetType') as string; // 'main', 'icon', etc.
  
  // Upload to Supabase Storage
  const storagePath = `community-assets/${communityId}/${assetType}.${fileExt}`;
  
  await supabase.storage
    .from('community-assets')
    .upload(storagePath, file, { upsert: true });
  
  // Update assets_config in database
  await supabase
    .from('community_configs')
    .update({
      assets_config: jsonb_set(
        assets_config,
        `{logos,${assetType}}`,
        `"${storagePath}"`::jsonb
      )
    })
    .eq('community_id', communityId);
  
  return { success: true, storagePath };
}
```

### Build-Time Download

```javascript
// next.config.mjs

async function downloadAssets(config, communityId) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const assets = config.assets?.logos || {};
  const downloadedAssets = {};
  
  for (const [key, storagePath] of Object.entries(assets)) {
    if (typeof storagePath === 'string' && storagePath.startsWith('community-assets/')) {
      // Download from Supabase Storage
      const { data } = await supabase.storage
        .from('community-assets')
        .download(storagePath);
      
      if (data) {
        // Generate local path
        const filename = storagePath.split('/').pop();
        const localPath = `/images/${communityId}/${filename}`;
        
        // Save to public folder
        await writeFile(`public${localPath}`, Buffer.from(await data.arrayBuffer()));
        
        // Update to public path
        downloadedAssets[key] = localPath;
      }
    } else {
      // Already a public path or external URL, use as-is
      downloadedAssets[key] = storagePath;
    }
  }
  
  // Return config with updated paths
  return {
    ...config,
    assets: {
      logos: downloadedAssets
    }
  };
}
```

## Path Resolution Logic

### In Database (Storage Paths)

```json
{
  "logos": {
    "main": "community-assets/nouns/logo.svg",     // ← Storage path
    "icon": "community-assets/nouns/noggles.svg",  // ← Storage path
    "favicon": "/images/favicon.ico"               // ← Public path (static fallback)
  }
}
```

### After Build (Public Paths)

```json
{
  "logos": {
    "main": "/images/nouns/logo.svg",              // ← Downloaded from storage
    "icon": "/images/nouns/noggles.svg",           // ← Downloaded from storage
    "favicon": "/images/favicon.ico"               // ← Static (not in storage)
  }
}
```

## Fallback Strategy

### Static Assets (Not in Storage)

Some assets might not be uploaded (e.g., default favicon):

```json
{
  "logos": {
    "main": "community-assets/nouns/logo.svg",    // ← From storage
    "favicon": "/images/favicon.ico"               // ← Static fallback
  }
}
```

**Build-time logic:**
- If path starts with `community-assets/` → Download from storage
- If path starts with `/` → Use as-is (public path)
- If path starts with `http://` or `https://` → Use as-is (external URL)

## Storage Bucket Structure

```
Supabase Storage: community-assets/
├── nouns/
│   ├── logo.svg
│   ├── noggles.svg
│   ├── favicon.ico
│   ├── apple-touch.png
│   ├── og.png
│   └── splash.png
├── clanker/
│   ├── logo.svg
│   └── ...
└── example/
    └── ...
```

## Public Folder Structure (After Build)

```
public/
└── images/
    ├── nouns/
    │   ├── logo.svg          ← Downloaded from storage
    │   ├── noggles.svg       ← Downloaded from storage
    │   └── ...
    ├── clanker/
    │   └── ...
    └── favicon.ico           ← Static (not downloaded)
```

## Key Points

1. **`assets_config` stores storage paths** - References assets in Supabase Storage
2. **Build-time transformation** - Storage paths → Public paths
3. **Runtime uses public paths** - App serves from `public/images/`
4. **Fallback support** - Can mix storage paths and static paths
5. **Admin updates storage** - Changes reflected after rebuild

## Example: Complete Flow

### Step 1: Admin Uploads Logo

```typescript
// Admin uploads logo.svg via UI
POST /api/admin/assets/upload
{
  file: File,
  communityId: "nouns",
  assetType: "main"
}

// Asset stored at: community-assets/nouns/logo.svg
// Database updated:
{
  "assets_config": {
    "logos": {
      "main": "community-assets/nouns/logo.svg"  // ← Storage path
    }
  }
}
```

### Step 2: Build Time

```javascript
// next.config.mjs runs
1. Fetch config from DB
2. See "main": "community-assets/nouns/logo.svg"
3. Download from Supabase Storage
4. Save to public/images/nouns/logo.svg
5. Update config: "main": "/images/nouns/logo.svg"
6. Store in env var: NEXT_PUBLIC_BUILD_TIME_CONFIG
```

### Step 3: Runtime

```typescript
// App loads config
const config = loadSystemConfig();
const logoSrc = config.assets.logos.main;  // "/images/nouns/logo.svg"

// Next.js Image component uses public path
<Image src={logoSrc} />  // Serves from public/images/nouns/logo.svg
```

## Summary

**Yes, `assets_config` is directly tied to uploaded assets:**

1. ✅ **Admin uploads** → Stored in Supabase Storage
2. ✅ **Path stored** → `assets_config` contains storage path
3. ✅ **Build downloads** → Assets copied to `public/images/`
4. ✅ **Path updated** → Config uses public path
5. ✅ **Runtime serves** → App uses public path

The `assets_config` paths act as the **bridge** between:
- **Storage** (where admins upload)
- **Build** (where assets are downloaded)
- **Runtime** (where assets are served)

