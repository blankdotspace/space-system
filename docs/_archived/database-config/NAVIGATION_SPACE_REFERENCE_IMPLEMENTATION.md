# Navigation-Space Reference Implementation Plan

## Architecture Overview

**Key Insight:** Navigation items reference Spaces. Pages are fetched from Spaces at build time.

```
Navigation Config (in community_configs)
  └── items: [
        { id: 'home', spaceId: 'uuid', ... },
        { id: 'explore', spaceId: 'uuid', ... }
      ]
           ↓
      Build Time:
           ↓
      Fetch Spaces by spaceId
           ↓
      Build page configs from Spaces
```

## Changes Required

### 1. Add 'navPage' Space Type

**File:** `src/common/types/spaceData.ts`

```typescript
export const SPACE_TYPES = {
  PROFILE: 'profile',
  TOKEN: 'token',
  PROPOSAL: 'proposal',
  CHANNEL: 'channel',
  NAV_PAGE: 'navPage',  // ← NEW
} as const;
```

**Migration:** `supabase/migrations/YYYYMMDDHHMMSS_add_navpage_space_type.sql`

```sql
-- Add navPage to spaceType constraint
ALTER TABLE "public"."spaceRegistrations"
  DROP CONSTRAINT IF EXISTS valid_space_type;

ALTER TABLE "public"."spaceRegistrations"
  ADD CONSTRAINT valid_space_type CHECK (
    "spaceType" IN ('profile', 'token', 'proposal', 'channel', 'navPage')
  );
```

### 2. Update NavigationItem Interface

**File:** `src/config/systemConfig.ts`

```typescript
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: 'home' | 'explore' | 'notifications' | 'search' | 'space' | 'robot' | 'custom';
  openInNewTab?: boolean;
  requiresAuth?: boolean;
  spaceId?: string;  // ← NEW: Optional reference to Space
}
```

### 3. Update Navigation Configs

**File:** `src/config/nouns/nouns.navigation.ts`

```typescript
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
      spaceId: 'nouns-home-space-id'  // ← Reference to Space
    },
    { 
      id: 'explore', 
      label: 'Explore', 
      href: '/explore', 
      icon: 'explore',
      spaceId: 'nouns-explore-space-id'  // ← Reference to Space
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

**Migration:** Remove homePage/explorePage columns

```sql
-- Remove large page config columns
ALTER TABLE "public"."community_configs"
  DROP COLUMN IF EXISTS "home_page_config",
  DROP COLUMN IF EXISTS "explore_page_config";

-- Update function to exclude page configs
CREATE OR REPLACE FUNCTION "public"."get_active_community_config"(
    p_community_id VARCHAR(50)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config JSONB;
BEGIN
    SELECT jsonb_build_object(
        'brand', "brand_config",
        'assets', "assets_config",
        'theme', "theme_config",
        'community', "community_config",
        'fidgets', "fidgets_config",
        'navigation', "navigation_config",  -- Contains spaceId references
        'ui', "ui_config"
    )
    INTO v_config
    FROM "public"."community_configs"
    WHERE "community_id" = p_community_id
    AND "is_active" = true
    AND "is_published" = true
    ORDER BY "version" DESC
    LIMIT 1;
    
    RETURN v_config;
END;
$$;
```

### 5. Update Build-Time Config Generation

**File:** `next.config.mjs`

```javascript
async function generateConfigFile() {
  // Fetch main config (now much smaller!)
  const { data: config } = await supabase
    .rpc('get_active_community_config', { p_community_id: community })
    .single();
  
  if (!config) return;
  
  // Extract spaceIds from navigation items
  const navItems = config.navigation?.items || [];
  const spaceIds = navItems
    .filter(item => item.spaceId)
    .map(item => ({ navId: item.id, spaceId: item.spaceId }));
  
  // Fetch Spaces for nav items
  const pageConfigs = {};
  for (const { navId, spaceId } of spaceIds) {
    try {
      // Fetch Space from spaceRegistrations + Storage
      const space = await fetchSpaceBySpaceId(spaceId);
      if (space) {
        // Convert Space config to page config format
        pageConfigs[navId] = convertSpaceToPageConfig(space);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to fetch Space ${spaceId} for nav item ${navId}:`, error.message);
    }
  }
  
  // Combine configs
  const fullConfig = {
    ...config,
    pages: pageConfigs,  // Add page configs
  };
  
  // Generate TypeScript file
  const configFile = `// Auto-generated at build time
import { SystemConfig } from './systemConfig';

export const dbConfig: SystemConfig | null = ${JSON.stringify(fullConfig, null, 2)} as SystemConfig;
`;
  
  await writeFile('src/config/db-config.ts', configFile, 'utf-8');
}

async function fetchSpaceBySpaceId(spaceId: string) {
  // Option 1: Fetch from spaceRegistrations + Storage
  const { data: registration } = await supabase
    .from('spaceRegistrations')
    .select('*')
    .eq('spaceId', spaceId)
    .eq('spaceType', 'navPage')
    .single();
  
  if (!registration) return null;
  
  // Fetch Space config from Storage
  const { data } = await supabase.storage
    .from('spaces')
    .download(`${spaceId}/tabs/default`);  // Or fetch all tabs
  
  if (!data) return null;
  
  // Parse and return Space config
  const fileData = JSON.parse(await data.text());
  return fileData;  // Return SpaceConfig
}

function convertSpaceToPageConfig(space: SpaceConfig): HomePageConfig {
  // Convert Space config to HomePageConfig/ExplorePageConfig format
  // This maps Space tabs to page tabs
  return {
    defaultTab: space.defaultTab || 'Home',
    tabOrder: Object.keys(space.tabs || {}),
    tabs: space.tabs || {},
    layout: {
      defaultLayoutFidget: space.layout?.defaultLayoutFidget || 'grid',
      gridSpacing: space.layout?.gridSpacing || 16,
      theme: space.theme || {},
    },
  };
}
```

### 6. Update Config Loader

**File:** `src/config/index.ts`

```typescript
export const loadSystemConfig = (): SystemConfig => {
  const config = dbConfig || staticConfig;
  
  // Extract page configs from pages object (built from nav items)
  const homePage = config.pages?.['home'] || staticConfig.homePage;
  const explorePage = config.pages?.['explore'] || staticConfig.explorePage;
  
  return {
    ...config,
    homePage,  // Map from pages['home']
    explorePage,  // Map from pages['explore']
  };
};
```

## Space Storage Strategy

### How Nav Pages Are Stored

1. **Register in spaceRegistrations:**
   ```sql
   INSERT INTO spaceRegistrations (
     "spaceId",
     "spaceName",
     "spaceType",
     "identityPublicKey",
     "signature",
     "timestamp"
   ) VALUES (
     'nouns-home-space-id',
     'nouns-home',
     'navPage',
     'system-identity-key',
     'signature',
     NOW()
   );
   ```

2. **Store config in Supabase Storage:**
   - Path: `spaces/{spaceId}/tabs/{tabName}`
   - Format: Same as other Spaces (SpaceConfig JSON)

3. **Fetch at build time:**
   - Query `spaceRegistrations` for `spaceType = 'navPage'`
   - Download from Storage
   - Parse and convert to page config format

## Size Reduction

**Before:**
- Config: ~29 KB
- homePage: 19.2 KB (66.5%)
- explorePage: 1.4 KB (4.8%)

**After:**
- Config: ~8.4 KB (71% reduction!)
- Navigation: ~500 bytes (includes spaceId strings)
- Spaces: Fetched separately, no size limit

**Result:** Config easily fits in env vars or generated file!

## Migration Path

1. **Add navPage spaceType** - Migration + TypeScript constants
2. **Create Spaces for existing pages** - Register homePage/explorePage as Spaces
3. **Update navigation configs** - Add spaceId to nav items
4. **Update build-time fetching** - Fetch Spaces based on nav items
5. **Remove page configs from schema** - Drop home_page_config/explore_page_config columns
6. **Update seed script** - Don't seed page configs, seed Spaces instead

## Benefits

✅ **Solves E2BIG** - Config size reduced by 71%  
✅ **Unified architecture** - Everything is Spaces  
✅ **Navigation as source of truth** - Nav defines what pages exist  
✅ **Flexible** - Any nav item can reference a Space  
✅ **Reuses infrastructure** - Uses existing Space system  
✅ **No breaking changes** - Can maintain backward compatibility during migration  

## Example: Complete Flow

### 1. Navigation Config (in DB)
```json
{
  "navigation": {
    "items": [
      { "id": "home", "label": "Home", "href": "/home", "spaceId": "uuid-1" },
      { "id": "explore", "label": "Explore", "href": "/explore", "spaceId": "uuid-2" }
    ]
  }
}
```

### 2. Build Time
```javascript
// Fetch nav config → see spaceIds
// Fetch Spaces: uuid-1, uuid-2
// Convert Spaces to page configs
// Generate:
{
  ...config,
  pages: {
    'home': { /* Space config converted */ },
    'explore': { /* Space config converted */ }
  }
}
```

### 3. Runtime
```typescript
// Load config
const config = loadSystemConfig();
// config.homePage comes from config.pages['home']
// config.explorePage comes from config.pages['explore']
```

