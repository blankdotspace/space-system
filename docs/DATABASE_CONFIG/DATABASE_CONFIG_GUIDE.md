# Database-Backed Configuration System Guide

## Overview

Nounspace uses a **database-backed configuration system** that allows admins to update community configurations without code changes. Configurations are stored in Supabase and loaded at **build time** (not runtime), ensuring zero database queries in production.

## Architecture

### Current Approach

```
┌─────────────────┐
│   Admin UI      │
│  (Updates DB)   │
└────────┬────────┘
         │
         ▼
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

### Key Design Decisions

1. **Build-Time Loading** - Configs fetched from DB during build, stored in env var
2. **Shared Themes** - Themes stored in `src/config/shared/themes.ts` (not in DB)
3. **Navigation-Space References** - Pages (homePage/explorePage) stored as Spaces, referenced by navigation items
4. **Environment Variables** - Config stored in `NEXT_PUBLIC_BUILD_TIME_CONFIG` (~2.8 KB)

## Config Size Reduction

| Stage | Config Size | Reduction |
|-------|-------------|-----------|
| **Original** | ~29 KB | - |
| **After removing pages** | ~8.3 KB | 71% |
| **After removing themes** | **~2.8 KB** | **90%** |

### What Was Removed

- **Themes** (5.5 KB) → Moved to `src/config/shared/themes.ts`
- **homePage** (19.2 KB) → Stored as Space, referenced by nav item
- **explorePage** (1.4 KB) → Stored as Space, referenced by nav item

## Database Schema

### `community_configs` Table

```sql
CREATE TABLE "public"."community_configs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "community_id" VARCHAR(50) NOT NULL UNIQUE,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "brand_config" JSONB NOT NULL,           -- Brand identity
    "assets_config" JSONB NOT NULL,          -- Asset paths
    "community_config" JSONB NOT NULL,       -- Community integration data
    "fidgets_config" JSONB NOT NULL,         -- Enabled/disabled fidgets
    "navigation_config" JSONB,              -- Navigation items (with spaceId refs)
    "ui_config" JSONB,                      -- UI colors
    "is_published" BOOLEAN DEFAULT true     -- Draft vs published
);
```

**Note:** No `theme_config`, `home_page_config`, or `explore_page_config` columns.

### Config Sections

#### `brand_config`
- `name`: Internal identifier (e.g., "nouns")
- `displayName`: User-facing name
- `tagline`: Short tagline
- `description`: Full description
- `miniAppTags`: Farcaster Mini App discovery tags

#### `assets_config`
- `logos`: Paths to logo files (main, icon, favicon, etc.)
- All paths are public URLs (e.g., `/images/nouns/logo.svg`)

#### `community_config`
- `type`: Community type
- `urls`: Website, Discord, Twitter, GitHub, Forum links
- `social`: Social handles
- `governance`: Proposals, delegates, treasury links
- `tokens`: ERC20 and NFT token definitions
- `contracts`: Contract addresses

#### `fidgets_config`
- `enabled`: Array of enabled fidget IDs
- `disabled`: Array of disabled fidget IDs

#### `navigation_config`
- `logoTooltip`: Logo tooltip text and href
- `items`: Navigation items array
  - Each item can have `spaceId` to reference a Space for page content
- `showMusicPlayer`: Boolean
- `showSocials`: Boolean

#### `ui_config`
- `primaryColor`: Primary UI color
- `primaryHoverColor`: Hover state color
- `primaryActiveColor`: Active state color
- `castButton`: Cast button color config

### Navigation-Space References

Navigation items can reference Spaces for page content:

```typescript
{
  id: 'home',
  label: 'Home',
  href: '/home',
  icon: 'home',
  spaceId: 'uuid-of-home-space'  // ← References Space
}
```

- Spaces stored in `spaceRegistrations` with `spaceType = 'navPage'` (system-owned, fid=NULL)
- Space configs stored in Supabase Storage at `{spaceId}/tabs/{tabName}` and `{spaceId}/tabOrder`
- Uploaded via `scripts/seed-navpage-spaces.ts` script after database reset
- Stored as unencrypted SignedFile objects (readable by existing code)
- Fetched at build time and converted to page configs

### Shared Themes

Themes are stored in `src/config/shared/themes.ts`:

```typescript
export const themes = {
  default: { /* ... */ },
  nounish: { /* ... */ },
  // ... all 10 themes
};
```

All communities import from this shared file.

## Build Process

### 1. Fetch Config from Database

```javascript
// next.config.mjs

const { data } = await supabase
  .rpc('get_active_community_config', { p_community_id: community })
  .single();
```

### 2. Fetch Spaces for Navigation Items

```javascript
// Extract spaceIds from navigation items
const spaceIds = navItems
  .filter(item => item.spaceId)
  .map(item => ({ navId: item.id, spaceId: item.spaceId }));

// Fetch Spaces from database/storage
const pageConfigs = {};
for (const { navId, spaceId } of spaceIds) {
  // Fetch tab order first
  const { data: tabOrderData } = await supabase.storage
    .from('spaces')
    .download(`${spaceId}/tabOrder`);
  
  if (!tabOrderData) continue;
  
  const tabOrderFile = JSON.parse(await tabOrderData.text());
  const tabOrder = tabOrderFile.tabOrder || [];
  
  // Fetch each tab config
  const tabs = {};
  for (const tabName of tabOrder) {
    const { data: tabData } = await supabase.storage
      .from('spaces')
      .download(`${spaceId}/tabs/${tabName}`);
    
    if (tabData) {
      const tabFile = JSON.parse(await tabData.text());
      const tabConfig = JSON.parse(tabFile.fileData); // Unencrypted SignedFile
      tabs[tabName] = tabConfig;
    }
  }
  
  // Reconstruct HomePageConfig/ExplorePageConfig format
  if (Object.keys(tabs).length > 0) {
    pageConfigs[navId] = {
      defaultTab: tabOrder[0] || 'Home',
      tabOrder,
      tabs,
      layout: {
        defaultLayoutFidget: 'grid',
        gridSpacing: 16,
        theme: {},
      },
    };
  }
}
```

### 3. Import Shared Themes

```javascript
import { themes } from './src/config/shared/themes';
```

### 4. Combine and Store in Env Var

```javascript
const fullConfig = {
  ...config,
  theme: themes,        // From shared file
  pages: pageConfigs,   // From Spaces
};

process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG = JSON.stringify(fullConfig);
```

### 5. Runtime Usage

```typescript
// src/config/index.ts

const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
if (buildTimeConfig) {
  const dbConfig = JSON.parse(buildTimeConfig) as SystemConfig;
  return dbConfig;
}
// Fall back to static configs
```

## Quick Start

### 1. Reset Database

```bash
# Applies migrations + seed data
supabase db reset
```

This will:
- Create `community_configs` table
- Add `navPage` spaceType
- Seed configs for nouns, example, clanker
- Create navPage space registrations (nouns-home, nouns-explore, clanker-home)
- Link navigation items to spaces via spaceId

### 2. Upload Space Configs

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Upload space config files to Supabase Storage
tsx scripts/seed-navpage-spaces.ts
```

This uploads:
- Each tab config as `{spaceId}/tabs/{tabName}` (SignedFile format)
- Tab order as `{spaceId}/tabOrder` (SignedFile format)

**Note:** Space configs are stored as unencrypted SignedFile objects and can be read by the existing space loading code.

### 3. Build Application

```bash
NEXT_PUBLIC_SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npm run build
```

Expected output:
```
✅ Loaded config from database
```

### 4. Verify

```bash
npm run dev
# App should load with DB config
# Pages should load from Spaces
```

## Environment Variables

**Required for Build:**
```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_COMMUNITY=nouns  # Optional, defaults to 'nouns'
```

**Optional:**
- If DB credentials missing → Falls back to static configs
- If DB config not found → Falls back to static configs

## Benefits

✅ **Zero Runtime Overhead** - No database queries in production  
✅ **Admin Updates** - Changes made through database/admin UI  
✅ **Fast Runtime** - Config loaded from env var (instant)  
✅ **Safe Fallback** - Static configs always available  
✅ **Small Config** - Only ~2.8 KB (fits in env vars)  
✅ **Unified Architecture** - Pages are Spaces  
✅ **Shared Themes** - Single source of truth  

## Migration Path

See `DATABASE_CONFIG_IMPLEMENTATION.md` for detailed phase-by-phase implementation plan.

## Related Documentation

- `DATABASE_CONFIG_IMPLEMENTATION.md` - Detailed implementation plan
- `QUICK_START_IMPLEMENTATION.md` - Quick start guide
- `QUICK_START_TESTING.md` - Testing guide
- `INCREMENTAL_IMPLEMENTATION_PLAN.md` - Complete phase-by-phase plan
- `README.md` - Documentation index

