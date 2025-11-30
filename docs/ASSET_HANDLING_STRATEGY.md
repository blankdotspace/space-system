# Asset Handling Strategy for Database Configs

## The Challenge

Assets in the config can be:
1. **Imported modules** (bundled by Next.js) - `import logo from './assets/logo.svg'`
2. **String paths** (public paths) - `"/images/logo.png"`

When using environment variables, we need to handle both cases.

## Recommended Approach: Hybrid Strategy

**Keep assets in repo, store paths in DB, resolve at build time**

### Strategy Overview

1. **Assets stay in version control** - `src/config/{community}/assets/` directory
2. **DB stores relative paths** - Just the paths, not the files
3. **Build-time resolution** - Convert DB paths to actual asset references
4. **Fallback to static** - If DB path doesn't exist, use static asset config

### Implementation

#### 1. Database Schema

Store asset paths as strings in the database:

```sql
-- In community_configs table, assets_config JSONB column:
{
  "logos": {
    "main": "/images/nouns/logo.svg",           -- Public path
    "icon": "./assets/noggles.svg",            -- Relative to config dir
    "favicon": "/images/favicon.ico",          -- Public path
    "appleTouch": "/images/apple-touch-icon.png",
    "og": "./assets/og.svg",                    -- Relative path
    "splash": "./assets/splash.svg"             -- Relative path
  }
}
```

#### 2. Build-Time Resolution

```javascript
// next.config.mjs

import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function resolveAssets(config, communityId) {
  const configDir = join(__dirname, 'src', 'config', communityId);
  const publicDir = join(__dirname, 'public');
  
  const resolvedAssets = { ...config.assets };
  
  // Resolve each asset path
  for (const [key, value] of Object.entries(config.assets.logos)) {
    if (typeof value === 'string') {
      // Check if it's a relative path (starts with ./)
      if (value.startsWith('./')) {
        const assetPath = join(configDir, value.replace('./', ''));
        if (existsSync(assetPath)) {
          // Keep relative path - Next.js will bundle it
          resolvedAssets.logos[key] = value;
        } else {
          console.warn(`⚠️  Asset not found: ${assetPath}, using static fallback`);
          resolvedAssets.logos[key] = null; // Will use static
        }
      } else if (value.startsWith('/')) {
        // Public path - check if exists
        const publicPath = join(publicDir, value);
        if (existsSync(publicPath)) {
          resolvedAssets.logos[key] = value;
        } else {
          console.warn(`⚠️  Public asset not found: ${publicPath}`);
          resolvedAssets.logos[key] = null;
        }
      } else {
        // Assume it's a valid path
        resolvedAssets.logos[key] = value;
      }
    }
  }
  
  return resolvedAssets;
}

async function generateConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) return;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const community = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  try {
    const { data, error } = await supabase
      .rpc('get_active_community_config', { p_community_id: community })
      .single();
    
    if (error || !data) return;
    
    // Resolve asset paths
    const resolvedAssets = await resolveAssets(data, community);
    const configWithAssets = {
      ...data,
      assets: resolvedAssets
    };
    
    // Set as env var
    process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG = JSON.stringify(configWithAssets);
    console.log('✅ Loaded config with resolved assets from database');
  } catch (error) {
    console.warn('⚠️  Error loading config:', error.message);
  }
}

await generateConfig();
```

#### 3. Config Loader with Asset Fallback

```typescript
// src/config/index.ts

import { SystemConfig } from './systemConfig';
import { nounsSystemConfig } from './nouns/index';
import { exampleSystemConfig } from './example/index';
import { clankerSystemConfig } from './clanker/index';

// Import static asset configs for fallback
import { nounsAssets } from './nouns/nouns.assets';
import { clankerAssets } from './clanker/clanker.assets';
import { exampleAssets } from './example/example.assets';

const STATIC_CONFIGS: Record<string, SystemConfig> = {
  nouns: nounsSystemConfig,
  example: exampleSystemConfig,
  clanker: clankerSystemConfig as unknown as SystemConfig,
};

const STATIC_ASSETS: Record<string, typeof nounsAssets> = {
  nouns: nounsAssets,
  clanker: clankerAssets,
  example: exampleAssets,
};

export const loadSystemConfig = (): SystemConfig => {
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  const community = communityConfig.toLowerCase();
  
  // Try build-time config from env var
  const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
  if (buildTimeConfig) {
    try {
      const config = JSON.parse(buildTimeConfig) as SystemConfig;
      
      // Merge assets: use DB assets, fall back to static for missing ones
      const staticAssets = STATIC_ASSETS[community];
      if (staticAssets) {
        config.assets = {
          logos: {
            main: config.assets?.logos?.main || staticAssets.logos.main,
            icon: config.assets?.logos?.icon || staticAssets.logos.icon,
            favicon: config.assets?.logos?.favicon || staticAssets.logos.favicon,
            appleTouch: config.assets?.logos?.appleTouch || staticAssets.logos.appleTouch,
            og: config.assets?.logos?.og || staticAssets.logos.og,
            splash: config.assets?.logos?.splash || staticAssets.logos.splash,
          }
        };
      }
      
      return config;
    } catch {
      // Fall through to static
    }
  }
  
  // Fall back to static configs
  return STATIC_CONFIGS[community] || STATIC_CONFIGS.nouns;
};
```

---

## Alternative Approach: Keep Assets Static

**Simpler**: Only store non-asset config in DB, keep assets as static imports.

### Implementation

```typescript
// src/config/index.ts

export const loadSystemConfig = (): SystemConfig => {
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  const community = communityConfig.toLowerCase();
  
  // Try build-time config from env var
  const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
  
  if (buildTimeConfig) {
    try {
      const dbConfig = JSON.parse(buildTimeConfig) as SystemConfig;
      const staticConfig = STATIC_CONFIGS[community];
      
      // Merge: DB config + static assets
      return {
        ...dbConfig,
        assets: staticConfig.assets, // Always use static assets
      };
    } catch {
      // Fall through
    }
  }
  
  return STATIC_CONFIGS[community] || STATIC_CONFIGS.nouns;
};
```

**Pros:**
- ✅ Simplest approach
- ✅ Assets always bundled by Next.js
- ✅ No path resolution needed
- ✅ Type-safe asset imports

**Cons:**
- ⚠️ Assets can't be updated via admin UI
- ⚠️ Assets require code deployment

---

## Recommended: Hybrid with Smart Fallback

**Best of both worlds**: Store asset paths in DB, but fall back to static imports if paths don't resolve.

### Final Implementation

```typescript
// src/config/index.ts

import { SystemConfig } from './systemConfig';
import { nounsSystemConfig } from './nouns/index';
// ... other imports

const STATIC_CONFIGS: Record<string, SystemConfig> = {
  nouns: nounsSystemConfig,
  // ...
};

export const loadSystemConfig = (): SystemConfig => {
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  const community = communityConfig.toLowerCase();
  
  const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
  
  if (buildTimeConfig) {
    try {
      const dbConfig = JSON.parse(buildTimeConfig) as SystemConfig;
      const staticConfig = STATIC_CONFIGS[community];
      
      // Smart asset merging: use DB assets if valid, otherwise static
      const mergedAssets = {
        logos: {
          main: dbConfig.assets?.logos?.main || staticConfig.assets.logos.main,
          icon: dbConfig.assets?.logos?.icon || staticConfig.assets.logos.icon,
          favicon: dbConfig.assets?.logos?.favicon || staticConfig.assets.logos.favicon,
          appleTouch: dbConfig.assets?.logos?.appleTouch || staticConfig.assets.logos.appleTouch,
          og: dbConfig.assets?.logos?.og || staticConfig.assets.logos.og,
          splash: dbConfig.assets?.logos?.splash || staticConfig.assets.logos.splash,
        }
      };
      
      return {
        ...dbConfig,
        assets: mergedAssets,
      };
    } catch {
      // Fall through
    }
  }
  
  return STATIC_CONFIGS[community] || STATIC_CONFIGS.nouns;
};
```

**Benefits:**
- ✅ Admin can update asset paths in DB
- ✅ Falls back to static assets if DB paths invalid
- ✅ Assets still bundled by Next.js (if relative paths)
- ✅ Public paths work for CDN-hosted assets
- ✅ Type-safe with fallbacks

---

## Database Storage Format

Store assets as simple string paths in the database:

```json
{
  "assets": {
    "logos": {
      "main": "./assets/logo.svg",              // Relative - will be bundled
      "icon": "./assets/noggles.svg",           // Relative - will be bundled
      "favicon": "/images/favicon.ico",        // Public path
      "appleTouch": "/images/apple-touch.png",  // Public path
      "og": "./assets/og.svg",                  // Relative - will be bundled
      "splash": "./assets/splash.svg"           // Relative - will be bundled
    }
  }
}
```

**Path conventions:**
- `./assets/...` - Relative to `src/config/{community}/assets/` (bundled)
- `/images/...` - Public path in `public/images/` (not bundled)
- `https://...` - External URL (if needed)

---

## Summary

**Recommended**: Hybrid approach with smart fallback
- Store asset paths in DB
- Resolve paths at build time
- Fall back to static assets if DB paths invalid
- Supports both bundled (relative) and public (absolute) paths

This gives admins flexibility while maintaining the benefits of Next.js asset bundling.

