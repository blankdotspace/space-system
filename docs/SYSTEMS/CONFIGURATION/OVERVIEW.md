# Database-Backed Configuration System

## Overview

Nounspace uses a database-backed configuration system that allows community configurations to be stored in Supabase and loaded at build time. This provides admin-editable configs with zero runtime database queries.

## Architecture

```
┌─────────────────┐
│   Database      │
│  (Stores Config)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Build Process  │─────▶│  Set Env Var     │
│ (next.config.mjs)│      │  NEXT_PUBLIC_    │
│                 │      │  BUILD_TIME_      │
│                 │      │  CONFIG           │
└─────────────────┘      └─────────┬──────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │   Runtime App    │
                          │ (Reads Env Var   │
                          │  Zero DB Queries)│
                          └──────────────────┘
```

## Configuration Storage

### Database Table

Configurations are stored in the `community_configs` table:

```sql
CREATE TABLE "public"."community_configs" (
    "id" UUID PRIMARY KEY,
    "community_id" VARCHAR(50) NOT NULL UNIQUE,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "brand_config" JSONB NOT NULL,           -- Brand identity
    "assets_config" JSONB NOT NULL,          -- Asset paths
    "community_config" JSONB NOT NULL,       -- Community integration data
    "fidgets_config" JSONB NOT NULL,         -- Enabled/disabled fidgets
    "navigation_config" JSONB,              -- Navigation items (with spaceId refs)
    "ui_config" JSONB,                      -- UI colors
    "is_published" BOOLEAN DEFAULT true
);
```

### Config Sections

- **`brand_config`**: Display name, tagline, description, mini app tags
- **`assets_config`**: Logo paths (main, icon, favicon, og image, splash)
- **`community_config`**: URLs, social handles, governance links, tokens, contracts
- **`fidgets_config`**: Enabled and disabled fidget IDs
- **`navigation_config`**: Navigation items with optional `spaceId` references
- **`ui_config`**: Primary colors, hover states, cast button colors

### What's Not in the Database

- **Themes**: Stored in `src/config/shared/themes.ts` (shared across communities)
- **Pages** (homePage/explorePage): Stored as Spaces in Supabase Storage, referenced by navigation items

## Build-Time Loading

### Process

1. **Fetch Config from Database**
   ```javascript
   // next.config.mjs runs during build
   const { data } = await supabase
     .rpc('get_active_community_config', { p_community_id: community })
     .single();
   ```

2. **Store in Environment Variable**
   ```javascript
   process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG = JSON.stringify(data);
   ```

3. **Runtime Access**
   ```typescript
   // src/config/index.ts
   const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
   if (buildTimeConfig) {
     const dbConfig = JSON.parse(buildTimeConfig) as SystemConfig;
     return dbConfig;
   }
   // Falls back to static configs if unavailable
   ```

### Database Function

The `get_active_community_config(community_id)` function returns a combined JSON object:

```json
{
  "brand": { /* brand_config */ },
  "assets": { /* assets_config */ },
  "community": { /* community_config */ },
  "fidgets": { /* fidgets_config */ },
  "navigation": { /* navigation_config */ },
  "ui": { /* ui_config */ }
}
```

## Navigation Pages as Spaces

### Concept

Navigation pages (like `/home` and `/explore`) are stored as Spaces in Supabase Storage, not in the database config. Navigation items reference these Spaces via `spaceId`.

### Storage Structure

**Space Registration** (in `spaceRegistrations` table):
- `spaceType = 'navPage'`
- `fid = NULL` (system-owned)
- `identityPublicKey = 'system'`
- `signature = 'system-seed'`

**Space Config Files** (in Supabase Storage bucket `spaces`):
```
spaces/
  {spaceId}/
    tabOrder          ← JSON: { tabOrder: ["Nouns", "Socials", ...] }
    tabs/
      Nouns           ← SpaceConfig JSON (fidgets, layout, etc.)
      Socials         ← SpaceConfig JSON
      ...
```

**File Format** (SignedFile wrapper):
```json
{
  "fileData": "{...SpaceConfig JSON as string...}",
  "fileType": "json",
  "isEncrypted": false,
  "timestamp": "2024-01-01T00:00:00Z",
  "publicKey": "nounspace",
  "signature": "not applicable, machine generated file"
}
```

### Navigation Reference

Navigation items reference Spaces:

```typescript
{
  id: 'home',
  label: 'Home',
  href: '/home',
  icon: 'home',
  spaceId: 'uuid-of-home-space'  // ← References Space
}
```

## Dynamic Routing

### Route Handler

The `/[navSlug]/[[...tabName]]/page.tsx` route handles all navigation-backed pages:

- `/home` → redirects to `/home/{defaultTab}`
- `/home/Nouns` → renders Nouns tab
- `/explore` → redirects to `/explore/{defaultTab}`
- `/explore/Featured` → renders Featured tab

### Request Flow

1. User visits `/home`
2. Route handler finds navigation item by slug
3. If `spaceId` exists, loads Space from Storage:
   - Fetches `{spaceId}/tabOrder` to get tab order
   - Fetches each `{spaceId}/tabs/{tabName}` for tab configs
   - Reconstructs `PageConfig` format
4. If no tab specified, redirects to default tab
5. Renders `NavPageClient` with tabs

### Space Loading Function

```typescript
async function loadSpaceAsPageConfig(spaceId: string): Promise<PageConfig | null> {
  // 1. Fetch tab order
  const { data: tabOrderData } = await supabase.storage
    .from('spaces')
    .download(`${spaceId}/tabOrder`);
  
  const tabOrderFile = JSON.parse(await tabOrderData.text()) as SignedFile;
  const tabOrderObj = JSON.parse(tabOrderFile.fileData);
  const tabOrder = tabOrderObj.tabOrder;
  
  // 2. Fetch each tab config
  const tabs = {};
  for (const tabName of tabOrder) {
    const { data: tabData } = await supabase.storage
      .from('spaces')
      .download(`${spaceId}/tabs/${tabName}`);
    
    const tabFile = JSON.parse(await tabData.text()) as SignedFile;
    const tabConfig = JSON.parse(tabFile.fileData);
    tabs[tabName] = tabConfig;
  }
  
  // 3. Reconstruct PageConfig
  return {
    defaultTab: tabOrder[0],
    tabOrder,
    tabs,
    layout: { /* defaults */ }
  };
}
```

## Shared Themes

Themes are stored in `src/config/shared/themes.ts` and shared across all communities:

```typescript
export const themes = {
  default: { /* ... */ },
  nounish: { /* ... */ },
  gradientAndWave: { /* ... */ },
  // ... all 10 themes
};
```

All communities import from this shared file, reducing duplication and config size.

## Configuration Size

The database config is ~2.8 KB (down from ~29 KB) by:
- Moving themes to shared file (5.5 KB saved)
- Moving pages to Spaces (20.6 KB saved)

This size reduction makes the environment variable approach viable.

## Runtime Access

### Config Loader

```typescript
// src/config/index.ts
export const loadSystemConfig = (): SystemConfig => {
  const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
  if (buildTimeConfig) {
    const dbConfig = JSON.parse(buildTimeConfig) as SystemConfig;
    // Map pages object to homePage/explorePage for backward compatibility
    return {
      ...dbConfig,
      homePage: dbConfig.pages?.['home'] || dbConfig.homePage || null,
      explorePage: dbConfig.pages?.['explore'] || dbConfig.explorePage || null,
    };
  }
  // Fall back to static configs
};
```

### Component Usage

```typescript
// In components
import { loadSystemConfig } from '@/config';

const config = loadSystemConfig();
const brandName = config.brand.displayName;
const navItems = config.navigation?.items || [];
```

```typescript
// React hook
import { useSystemConfig } from '@/common/lib/hooks/useSystemConfig';

function Navigation() {
  const config = useSystemConfig();
  // Use config.brand, config.navigation, etc.
}
```

## Environment Variables

**Required for Build:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for build-time access
- `NEXT_PUBLIC_COMMUNITY` - Community ID (defaults to 'nouns')

**Fallback Behavior:**
- If DB credentials missing → Falls back to static configs
- If DB config not found → Falls back to static configs
- App continues to work in all cases

## Benefits

- **Zero Runtime Overhead** - No database queries in production
- **Admin Updates** - Configs can be updated via database
- **Fast Runtime** - Config loaded from env var (instant)
- **Safe Fallback** - Static configs always available
- **Small Config** - Only ~2.8 KB (fits in env vars)
- **Unified Architecture** - Pages are Spaces, consistent with existing system
- **Shared Themes** - Single source of truth, no duplication

## Related Files

- **Database**: `supabase/migrations/20251129172847_create_community_configs.sql`
- **Build Config**: `next.config.mjs` - Loads config at build time
- **Config Loader**: `src/config/index.ts` - Reads from env var
- **Route Handler**: `src/app/[navSlug]/[[...tabName]]/page.tsx` - Dynamic navigation
- **Space Seeding**: `scripts/seed-navpage-spaces.ts` - Uploads space configs to Storage
- **Shared Themes**: `src/config/shared/themes.ts` - Theme definitions

