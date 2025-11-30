# Navigation-Space Reference Approach

## Overview

Instead of storing `homePage` and `explorePage` configs directly in `community_configs`, navigation items reference Spaces in the database. Pages are fetched at build time based on navigation entries.

## Architecture

```
Navigation Config
  ├── items: [
  │     { id: 'home', spaceId: 'uuid-1', ... },
  │     { id: 'explore', spaceId: 'uuid-2', ... },
  │     ...
  │   ]
  │
  └── Build Time:
      ├── Fetch nav config from community_configs
      ├── For each nav item with spaceId:
      │   └── Fetch Space from database/storage
      └── Build page configs from fetched Spaces
```

## Benefits

1. **Dramatically reduces config size** - Removes 71% (20.6 KB) of config
2. **Unified architecture** - Everything is Spaces
3. **Navigation as source of truth** - Nav defines what pages exist
4. **Flexible** - Any nav item can reference a Space
5. **Reuses existing infrastructure** - Uses Space storage/retrieval

## Implementation

### 1. Update NavigationItem Interface

```typescript
// src/config/systemConfig.ts

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: 'home' | 'explore' | 'notifications' | 'search' | 'space' | 'robot' | 'custom';
  openInNewTab?: boolean;
  requiresAuth?: boolean;
  spaceId?: string;  // ← NEW: Reference to Space in database
}
```

### 2. Add 'navPage' Space Type

```sql
-- Migration: Add navPage to spaceType enum
ALTER TABLE "public"."spaceRegistrations"
  DROP CONSTRAINT IF EXISTS valid_space_type;

ALTER TABLE "public"."spaceRegistrations"
  ADD CONSTRAINT valid_space_type CHECK (
    "spaceType" IN ('profile', 'token', 'proposal', 'channel', 'navPage')
  );
```

### 3. Update Navigation Config Structure

```typescript
// src/config/nouns/nouns.navigation.ts

export const nounsNavigation: NavigationConfig = {
  logoTooltip: {
    text: "wtf is nouns?",
    href: "https://nouns.wtf",
  },
  items: [
    { 
      id: 'home', 
      label: 'Home', 
      href: '/home', 
      icon: 'home',
      spaceId: '550e8400-e29b-41d4-a716-446655440000'  // ← Reference to Space
    },
    { 
      id: 'explore', 
      label: 'Explore', 
      href: '/explore', 
      icon: 'explore',
      spaceId: '550e8400-e29b-41d4-a716-446655440001'  // ← Reference to Space
    },
    { 
      id: 'notifications', 
      label: 'Notifications', 
      href: '/notifications', 
      icon: 'notifications', 
      requiresAuth: true 
      // No spaceId - not a Space-based page
    },
  ],
  showMusicPlayer: true,
  showSocials: true,
};
```

### 4. Update Database Schema

```sql
-- Remove home_page_config and explore_page_config from community_configs
ALTER TABLE "public"."community_configs"
  DROP COLUMN IF EXISTS "home_page_config",
  DROP COLUMN IF EXISTS "explore_page_config";

-- Navigation config now contains spaceId references
-- No schema changes needed - navigation_config JSONB column handles it
```

### 5. Update Build-Time Config Generation

```javascript
// next.config.mjs

async function generateConfigFile() {
  // Fetch main config (now much smaller - no homePage/explorePage!)
  const { data: config } = await supabase
    .rpc('get_active_community_config', { p_community_id: community })
    .single();
  
  // Fetch Spaces for nav items that have spaceId
  const navItems = config.navigation?.items || [];
  const spaceIds = navItems
    .filter(item => item.spaceId)
    .map(item => item.spaceId);
  
  // Fetch Spaces from database/storage
  const spaces = {};
  for (const spaceId of spaceIds) {
    // Fetch Space based on how Spaces are stored
    // (Could be from spaceRegistrations + Storage, or new table)
    const space = await fetchSpace(spaceId);
    if (space) {
      spaces[spaceId] = space;
    }
  }
  
  // Build page configs from Spaces
  const pageConfigs = {};
  navItems.forEach(item => {
    if (item.spaceId && spaces[item.spaceId]) {
      // Map Space to page config format
      pageConfigs[item.id] = convertSpaceToPageConfig(spaces[item.spaceId]);
    }
  });
  
  // Combine configs
  const fullConfig = {
    ...config,
    // Add page configs based on nav items
    pages: pageConfigs,
  };
  
  // Generate file
  await writeFile('src/config/db-config.ts', ...);
}
```

### 6. Update Config Loader

```typescript
// src/config/index.ts

export const loadSystemConfig = (): SystemConfig => {
  const config = dbConfig || staticConfig;
  
  // Get page configs from nav items
  const navItems = config.navigation?.items || [];
  const pages = {};
  
  navItems.forEach(item => {
    if (item.spaceId && config.pages?.[item.id]) {
      pages[item.id] = config.pages[item.id];
    }
  });
  
  // Map to legacy structure for backward compatibility
  return {
    ...config,
    homePage: pages['home'] || staticConfig.homePage,
    explorePage: pages['explore'] || staticConfig.explorePage,
  };
};
```

## Space Storage Options

### Option A: Use Existing Space Storage System

Spaces stored in Supabase Storage:
- Path: `spaces/{spaceId}/tabs/{tabName}`
- Encrypted/signed files
- Requires decryption at build time

**Pros:**
- Uses existing infrastructure
- No schema changes needed

**Cons:**
- Requires encryption/decryption logic at build time
- More complex fetching

### Option B: New Database Table for Nav Pages

```sql
CREATE TABLE community_nav_pages (
  id UUID PRIMARY KEY,
  community_id VARCHAR(50),
  nav_item_id VARCHAR(50),  -- 'home', 'explore', etc.
  space_config JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Pros:**
- Simple database queries
- No encryption needed (public pages)
- Easy to version

**Cons:**
- New table needed
- Duplicates Space structure

### Option C: Use spaceRegistrations + Storage

Store nav pages as Spaces in `spaceRegistrations` with `spaceType = 'navPage'`:
- Register in `spaceRegistrations` table
- Store config in Supabase Storage
- Fetch at build time

**Pros:**
- Uses existing Space infrastructure
- Consistent with other Spaces
- Can reuse Space APIs

**Cons:**
- Requires spaceRegistrations entry
- Need to handle Storage fetching

## Recommended: Option C (spaceRegistrations + Storage)

**Why:**
- ✅ Uses existing Space system
- ✅ Consistent architecture
- ✅ Can reuse Space loading logic
- ✅ No new tables needed

## Migration Steps

1. **Add 'navPage' to spaceType enum**
2. **Create Spaces for homePage/explorePage**
   - Register in `spaceRegistrations` with `spaceType = 'navPage'`
   - Store configs in Supabase Storage
3. **Update navigation configs**
   - Add `spaceId` to home/explore nav items
4. **Update build-time fetching**
   - Fetch Spaces based on nav items
   - Build page configs from Spaces
5. **Remove homePage/explorePage from community_configs**
   - Update schema
   - Update seed script

## Size Reduction

**Before:**
- Config: ~29 KB
- homePage: 19.2 KB
- explorePage: 1.4 KB

**After:**
- Config: ~8.4 KB (71% reduction!)
- Navigation: ~500 bytes (includes spaceId references)
- Spaces: Fetched separately, no size limit

**Result:** Config easily fits in env vars or generated file!

## Example: Updated Navigation Config

```typescript
export const nounsNavigation: NavigationConfig = {
  items: [
    { 
      id: 'home', 
      label: 'Home', 
      href: '/home', 
      icon: 'home',
      spaceId: 'nouns-home-space-uuid'  // ← References Space
    },
    { 
      id: 'explore', 
      label: 'Explore', 
      href: '/explore', 
      icon: 'explore',
      spaceId: 'nouns-explore-space-uuid'  // ← References Space
    },
  ],
};
```

## Benefits Summary

✅ **Solves E2BIG** - Config size reduced by 71%  
✅ **Unified architecture** - Everything is Spaces  
✅ **Navigation as source of truth** - Nav defines pages  
✅ **Flexible** - Any nav item can be a Space  
✅ **Reuses infrastructure** - Uses existing Space system  
✅ **No breaking changes** - Can maintain backward compatibility  

