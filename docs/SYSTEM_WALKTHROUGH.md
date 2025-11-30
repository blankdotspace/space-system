# System Walkthrough: How Nounspace Works Now

This document provides a comprehensive walkthrough of how the Nounspace system currently works, focusing on the database-backed configuration system and dynamic navigation routing.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Flow](#architecture-flow)
3. [Build-Time Configuration Loading](#build-time-configuration-loading)
4. [Runtime Configuration Access](#runtime-configuration-access)
5. [Navigation Pages as Spaces](#navigation-pages-as-spaces)
6. [Dynamic Routing](#dynamic-routing)
7. [Data Flow Examples](#data-flow-examples)
8. [Key Components](#key-components)

---

## Overview

Nounspace is a **customizable Farcaster client** that can be whitelabeled for different communities (Nouns, Clanker, etc.). The system uses a **database-backed configuration** approach where:

- **Configurations are stored in Supabase** (PostgreSQL database)
- **Configs are loaded at build time** (not runtime), ensuring zero database queries in production
- **Navigation pages are stored as Spaces** in Supabase Storage, referenced by navigation items
- **Themes are shared** across communities in a TypeScript file
- **Zero runtime queries** - everything is baked into the build

### Key Benefits

- ✅ **Admin-editable**: Admins can update configs via database without code changes
- ✅ **Performance**: No runtime database queries
- ✅ **Flexible**: Navigation items can reference Spaces for page content
- ✅ **Maintainable**: Shared themes reduce duplication

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        BUILD TIME                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. next.config.mjs runs                                     │
│     ├─> Fetches config from community_configs table          │
│     ├─> Extracts spaceIds from navigation items              │
│     ├─> Fetches Spaces from Supabase Storage                 │
│     └─> Stores everything in NEXT_PUBLIC_BUILD_TIME_CONFIG   │
│                                                               │
│  2. Next.js builds static pages                              │
│     ├─> generateStaticParams() runs                          │
│     ├─> Generates static paths for navigation pages          │
│     └─> Creates static HTML/JS bundles                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        RUNTIME                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User visits /home or /explore                            │
│     ├─> Next.js routes to [navSlug]/[[...tabName]]/page.tsx │
│     ├─> loadSystemConfig() reads from env var                │
│     └─> No database queries!                                 │
│                                                               │
│  2. Page component loads                                     │
│     ├─> Finds navigation item by slug                        │
│     ├─> If spaceId exists, loads Space from Storage          │
│     ├─> Converts Space config to PageConfig                  │
│     └─> Renders NavPageClient with tabs                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Build-Time Configuration Loading

### Step 1: Database Query

When you run `npm run build`, `next.config.mjs` runs first:

```javascript
// next.config.mjs

async function loadConfigFromDB() {
  // 1. Get credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('ℹ️  Using static configs (no DB credentials)');
    return; // Falls back to static configs
  }
  
  // 2. Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  const community = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  // 3. Fetch config from database
  const { data, error } = await supabase
    .rpc('get_active_community_config', { p_community_id: community })
    .single();
  
  if (error || !data) {
    console.log('ℹ️  Using static configs (no DB config found)');
    return; // Falls back to static configs
  }
  
  // 4. Store in environment variable
  process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG = JSON.stringify(data);
  console.log('✅ Loaded config from database');
}
```

### Step 2: What Gets Fetched

The `get_active_community_config` function returns:

```json
{
  "brand": { /* Brand identity */ },
  "assets": { /* Asset paths */ },
  "community": { /* Community integration data */ },
  "fidgets": { /* Enabled/disabled fidgets */ },
  "navigation": {
    "items": [
      {
        "id": "home",
        "label": "Home",
        "href": "/home",
        "icon": "home",
        "spaceId": "uuid-123"  // ← References a Space!
      },
      {
        "id": "explore",
        "label": "Explore",
        "href": "/explore",
        "icon": "explore",
        "spaceId": "uuid-456"  // ← References a Space!
      }
    ]
  },
  "ui": { /* UI colors */ }
}
```

**Note:** 
- No `theme` (stored in shared file)
- No `homePage` or `explorePage` (stored as Spaces)
- Navigation items have `spaceId` references

### Step 3: Space Fetching (Future Enhancement)

Currently, Spaces are fetched at **runtime** when pages load. In the future, we could fetch them at build time too:

```javascript
// For each navigation item with spaceId:
const spaceIds = navigation.items
  .filter(item => item.spaceId)
  .map(item => item.spaceId);

// Fetch each Space from Storage
for (const spaceId of spaceIds) {
  const tabOrder = await fetchTabOrder(spaceId);
  const tabs = await fetchAllTabs(spaceId, tabOrder);
  // Store in config...
}
```

---

## Runtime Configuration Access

### Step 1: Config Loader

When the app runs, `loadSystemConfig()` is called:

```typescript
// src/config/index.ts

export const loadSystemConfig = (): SystemConfig => {
  // 1. Try build-time config from database
  const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
  if (buildTimeConfig) {
    try {
      const dbConfig = JSON.parse(buildTimeConfig) as SystemConfig;
      if (dbConfig && dbConfig.brand && dbConfig.assets) {
        console.log('✅ Using config from database');
        return dbConfig;  // ← Returns DB config
      }
    } catch (error) {
      console.warn('⚠️  Failed to parse build-time config');
    }
  }
  
  // 2. Fall back to static configs
  console.log('ℹ️  Using static configs');
  const community = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  switch (community) {
    case 'nouns':
      return nounsSystemConfig;
    case 'clanker':
      return clankerSystemConfig;
    default:
      return nounsSystemConfig;
  }
};
```

### Step 2: Component Usage

Components use `loadSystemConfig()` or the `useSystemConfig()` hook:

```typescript
// In a component
import { loadSystemConfig } from '@/config';

const config = loadSystemConfig();
const brandName = config.brand.displayName;
const logo = config.assets.logos.main;
const navItems = config.navigation?.items || [];
```

```typescript
// In a React component
import { useSystemConfig } from '@/common/lib/hooks/useSystemConfig';

function Navigation() {
  const config = useSystemConfig();
  // Use config.brand, config.navigation, etc.
}
```

**Important:** This happens at runtime, but **no database queries occur** - the config is already in the environment variable!

---

## Navigation Pages as Spaces

### Concept

Navigation pages (like `/home` and `/explore`) are stored as **Spaces** in Supabase Storage, not directly in the config. This allows:

- ✅ Pages to be updated independently
- ✅ Reusing existing Space infrastructure
- ✅ Dramatically reducing config size (from ~29 KB to ~2.8 KB)

### Storage Structure

**1. Space Registration** (in `spaceRegistrations` table):

```sql
INSERT INTO spaceRegistrations (
  spaceId,
  fid,              -- NULL for system-owned pages
  spaceName,        -- 'nouns-home', 'nouns-explore'
  spaceType,        -- 'navPage'
  identityPublicKey,-- 'system'
  signature,        -- 'system-seed'
  timestamp
) VALUES (...);
```

**2. Space Config Files** (in Supabase Storage bucket `spaces`):

```
spaces/
  {spaceId}/
    tabOrder          ← JSON: { tabOrder: ["Nouns", "Socials", ...] }
    tabs/
      Nouns           ← SpaceConfig JSON (fidgets, layout, etc.)
      Socials         ← SpaceConfig JSON
      ...
```

**3. File Format** (SignedFile wrapper):

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

### How It Works

1. **Navigation Config** references Spaces:
   ```typescript
   {
     id: 'home',
     href: '/home',
     spaceId: 'uuid-123'  // ← References Space
   }
   ```

2. **At Runtime**, when user visits `/home`:
   - Route handler finds navigation item
   - Extracts `spaceId`
   - Fetches Space from Storage
   - Converts Space config to PageConfig
   - Renders page with tabs

---

## Dynamic Routing

### Route Structure

```
src/app/[navSlug]/[[...tabName]]/page.tsx
```

This handles:
- `/home` → redirects to `/home/{defaultTab}`
- `/home/Nouns` → renders Nouns tab
- `/explore` → redirects to `/explore/{defaultTab}`
- `/explore/Featured` → renders Featured tab
- Any custom nav item with a Space

### Request Flow

```
User visits /home
    │
    ▼
┌─────────────────────────────────────────┐
│  [navSlug]/[[...tabName]]/page.tsx      │
├─────────────────────────────────────────┤
│                                          │
│  1. Extract navSlug = "home"            │
│                                          │
│  2. Load system config                  │
│     const config = loadSystemConfig();  │
│                                          │
│  3. Find navigation item                │
│     const navItem = config.navigation   │
│       .items.find(i => i.href === "/home")│
│                                          │
│  4. Check if spaceId exists             │
│     if (navItem.spaceId) {              │
│       // Load Space from Storage        │
│     }                                    │
│                                          │
└─────────────────────────────────────────┘
```

### Space Loading

When a navigation item has a `spaceId`, the system loads it:

```typescript
async function loadSpaceAsPageConfig(spaceId: string): Promise<PageConfig | null> {
  // 1. Create Supabase client (with credentials check)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ...;
  
  if (!supabaseUrl || !supabaseKey) {
    return null;  // Will render at runtime
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 2. Fetch tab order
  const { data: tabOrderData } = await supabase.storage
    .from('spaces')
    .download(`${spaceId}/tabOrder`);
  
  const tabOrderFile = JSON.parse(await tabOrderData.text()) as SignedFile;
  const tabOrderObj = JSON.parse(tabOrderFile.fileData);
  const tabOrder = tabOrderObj.tabOrder;
  
  // 3. Fetch each tab config
  const tabs = {};
  for (const tabName of tabOrder) {
    const { data: tabData } = await supabase.storage
      .from('spaces')
      .download(`${spaceId}/tabs/${tabName}`);
    
    const tabFile = JSON.parse(await tabData.text()) as SignedFile;
    const tabConfig = JSON.parse(tabFile.fileData);
    tabs[tabName] = tabConfig;
  }
  
  // 4. Reconstruct PageConfig
  return {
    defaultTab: tabOrder[0],
    tabOrder,
    tabs,
    layout: { /* defaults */ }
  };
}
```

### Redirect Logic

If no tab is specified, redirect to default:

```typescript
// If no tab name provided, redirect to default tab
if (!tabName || tabName.length === 0) {
  const pageConfig = await loadSpaceAsPageConfig(navItem.spaceId);
  if (pageConfig) {
    const defaultTab = encodeURIComponent(pageConfig.defaultTab);
    redirect(`/${navSlug}/${defaultTab}`);  // e.g., /home/Nouns
    return null;
  }
}
```

---

## Data Flow Examples

### Example 1: Building the App

```
1. Developer runs: npm run build
                    │
                    ▼
2. next.config.mjs executes
   ├─> loadConfigFromDB() runs
   ├─> Queries: SELECT get_active_community_config('nouns')
   ├─> Gets JSON config from database
   └─> Sets: process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG = "{...}"
                    │
                    ▼
3. Next.js build process starts
   ├─> generateStaticParams() runs for [navSlug] route
   ├─> loadSystemConfig() reads from env var
   ├─> Extracts navigation items
   ├─> (Optionally) Generates static paths
   └─> Builds static pages
                    │
                    ▼
4. Build completes
   └─> App is ready to deploy (no DB needed!)
```

### Example 2: User Visits /home

```
1. User navigates to: https://nounspace.com/home
                    │
                    ▼
2. Next.js routes to: [navSlug]/[[...tabName]]/page.tsx
   ├─> navSlug = "home"
   └─> tabName = undefined (no tab specified)
                    │
                    ▼
3. Page component executes:
   ├─> const config = loadSystemConfig();
   │   └─> Reads from NEXT_PUBLIC_BUILD_TIME_CONFIG (no DB query!)
   │
   ├─> const navItem = config.navigation.items.find(...)
   │   └─> Finds: { id: 'home', spaceId: 'uuid-123', ... }
   │
   ├─> if (!tabName) { redirect to default tab }
   │   └─> loadSpaceAsPageConfig('uuid-123')
   │       ├─> Fetches: spaces/uuid-123/tabOrder
   │       ├─> Fetches: spaces/uuid-123/tabs/Nouns
   │       ├─> Fetches: spaces/uuid-123/tabs/Socials
   │       └─> Returns PageConfig
   │
   └─> redirect(`/home/${defaultTab}`)  // e.g., /home/Nouns
                    │
                    ▼
4. User redirected to: /home/Nouns
   └─> Same component, but now tabName = ["Nouns"]
                    │
                    ▼
5. Page renders:
   ├─> Loads Space config (same as above)
   ├─> Renders NavPageClient with:
   │   ├─> pageConfig: { tabs: {...}, tabOrder: [...] }
   │   ├─> activeTabName: "Nouns"
   │   └─> navSlug: "home"
   └─> User sees Home page with Nouns tab active
```

### Example 3: Admin Updates Config

```
1. Admin opens admin UI (future feature)
                    │
                    ▼
2. Admin updates brand name in UI
   ├─> UI calls: UPDATE community_configs
   │   SET brand_config = '{...new config...}'
   │   WHERE community_id = 'nouns'
                    │
                    ▼
3. Admin triggers rebuild
   ├─> CI/CD system runs: npm run build
   ├─> Build process fetches new config from DB
   └─> New config is baked into build
                    │
                    ▼
4. New build deployed
   └─> Users see updated brand name (no code changes!)
```

---

## Key Components

### 1. Configuration System

**Files:**
- `src/config/index.ts` - Main config loader
- `src/config/systemConfig.ts` - TypeScript interfaces
- `src/config/shared/themes.ts` - Shared theme definitions
- `src/config/nouns/` - Static fallback configs

**Key Functions:**
- `loadSystemConfig()` - Returns SystemConfig (DB or static)
- `useSystemConfig()` - React hook for components

### 2. Build-Time Loading

**Files:**
- `next.config.mjs` - Fetches config from DB at build time

**Key Functions:**
- `loadConfigFromDB()` - Queries database, stores in env var

### 3. Database Schema

**Tables:**
- `community_configs` - Stores brand, assets, navigation, etc.
- `spaceRegistrations` - Registers navPage Spaces
- `storage.buckets.spaces` - Stores Space config files

**Functions:**
- `get_active_community_config(community_id)` - Returns combined config

### 4. Dynamic Routing

**Files:**
- `src/app/[navSlug]/[[...tabName]]/page.tsx` - Main route handler
- `src/app/[navSlug]/[[...tabName]]/NavPageClient.tsx` - Client component

**Key Functions:**
- `loadSpaceAsPageConfig(spaceId)` - Fetches Space from Storage
- `generateStaticParams()` - Generates static paths (optional)

### 5. Space Storage

**Structure:**
```
Supabase Storage: spaces/
  {spaceId}/
    tabOrder          ← Tab order JSON
    tabs/
      {tabName}      ← SpaceConfig JSON (fidgets, layout, etc.)
```

**Format:** SignedFile wrapper (unencrypted for system files)

---

## Summary

1. **Configs are stored in Supabase** but loaded at build time, not runtime
2. **Navigation pages are Spaces** stored in Supabase Storage, referenced by navigation items
3. **Themes are shared** across communities in a TypeScript file
4. **Zero runtime queries** - everything is in environment variables
5. **Dynamic routing** handles any navigation item that references a Space
6. **Graceful fallbacks** - if DB/config unavailable, falls back to static configs

This architecture provides the flexibility of database-backed configs with the performance of static builds!

