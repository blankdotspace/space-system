# Quick Start: Incremental Implementation Guide

> **See also:** 
> - `DATABASE_CONFIG_GUIDE.md` - Architecture and overview
> - `DATABASE_CONFIG_IMPLEMENTATION.md` - Detailed implementation plan
> - `QUICK_START_TESTING.md` - Testing guide
> - `README.md` - Documentation index

## 🎯 Goal

Implement database-backed configs incrementally, testing each piece before moving forward.

**Current Architecture:**
- ✅ Configs stored in DB (without themes/pages) - ~2.8 KB
- ✅ Configs loaded at build time, stored in `NEXT_PUBLIC_BUILD_TIME_CONFIG` env var
- ✅ Themes in shared file (`src/config/shared/themes.ts`)
- ✅ Pages stored as Spaces (referenced by navigation `spaceId`)
- ✅ Config size reduced by ~90% (from ~29 KB to ~2.8 KB)

## 📋 Phase Overview

```
Phase 0: Setup          → Phase 1: DB Schema
                              ↓
Phase 2: Config Loading ← Phase 3: Admin API
                              ↓
Phase 4: Admin UI       → Phase 5: Asset Upload
                              ↓
Phase 6: Asset Download → Phase 7: Optimization
                              ↓
Phase 8: Rebuild Trigger → Phase 9: Production → Phase 10: Phase Out Static
```

## 🚀 Quick Proof of Concept (4 hours)

Want to test the concept quickly? Do these 3 phases:

### Step 1: Database Setup (1-2 hours)

**Reset database from scratch:**
```bash
# Reset Supabase database (applies all migrations + seed data)
supabase db reset
```

This will:
1. ✅ Apply migration: `create_community_configs.sql` (creates table without themes/pages)
2. ✅ Apply migration: `add_navpage_space_type.sql` (adds navPage spaceType)
3. ✅ Run `seed.sql`:
   - Seeds configs for nouns, example, clanker
   - Creates navPage space registrations (nouns-home, nouns-explore, clanker-home)
   - Links navigation items to spaces via spaceId

**Verify:**
```sql
-- Check table exists and has correct columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'community_configs';

-- Should see: brand_config, assets_config, community_config, fidgets_config, navigation_config, ui_config
-- Should NOT see: theme_config, home_page_config, explore_page_config

-- Test function
SELECT get_active_community_config('nouns');

-- Verify navPage spaceType exists
SELECT DISTINCT "spaceType" FROM "spaceRegistrations";
-- Should include: 'navPage'

-- Verify navPage spaces were created
SELECT "spaceId", "spaceName", "spaceType" 
FROM "spaceRegistrations" 
WHERE "spaceType" = 'navPage';
-- Should see: nouns-home, nouns-explore, clanker-home

-- Verify navigation configs reference spaces
SELECT "community_id", "navigation_config"->'items' as nav_items 
FROM "community_configs" 
WHERE "community_id" = 'nouns';
-- Should see spaceId references in navigation items
```

**Expected output:**
- ✅ Table created with correct columns
- ✅ Function returns config (without themes/pages)
- ✅ Seed data inserted for all 3 communities
- ✅ navPage spaceType available
- ✅ navPage space registrations created
- ✅ Navigation items reference spaceIds

### Step 2: Build-Time Loading (1 hour)

```javascript
// next.config.mjs (add at top)

import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fetchSpaceBySpaceId(supabase, spaceId) {
  // Fetch tab order first
  const { data: tabOrderData } = await supabase.storage
    .from('spaces')
    .download(`${spaceId}/tabOrder`);
  
  if (!tabOrderData) return null;
  
  const tabOrderFile = JSON.parse(await tabOrderData.text());
  const tabOrder = tabOrderFile.tabOrder || [];
  
  // Fetch each tab config
  const tabs = {};
  for (const tabName of tabOrder) {
    try {
      const { data: tabData } = await supabase.storage
        .from('spaces')
        .download(`${spaceId}/tabs/${tabName}`);
      
      if (tabData) {
        const tabFile = JSON.parse(await tabData.text());
        const tabConfig = JSON.parse(tabFile.fileData); // Unencrypted SignedFile
        tabs[tabName] = tabConfig;
      }
    } catch (error) {
      console.warn(`Failed to fetch tab ${tabName}:`, error.message);
    }
  }
  
  if (Object.keys(tabs).length === 0) return null;
  
  // Reconstruct HomePageConfig/ExplorePageConfig format
  return {
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

function convertSpaceToPageConfig(spacePageConfig) {
  // Space is already in HomePageConfig/ExplorePageConfig format
  // (reconstructed from tabs in fetchSpaceBySpaceId)
  return spacePageConfig;
}

async function loadConfigFromDB() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
    if (!supabaseUrl || !supabaseKey) {
    console.log('ℹ️  Using static configs (no DB credentials)');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const community = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  try {
    // Fetch main config (now much smaller - no themes/pages!)
    const { data: config, error } = await supabase
      .rpc('get_active_community_config', { p_community_id: community })
      .single();
    
    if (error || !data) {
      console.log('ℹ️  No DB config found, using static configs');
      if (error) {
        console.log(`   Error: ${error.message}`);
      }
      return;
    }
    
    // Extract spaceIds from navigation items
    const navItems = config.navigation?.items || [];
    const spaceIds = navItems
      .filter(item => item.spaceId)
      .map(item => ({ navId: item.id, spaceId: item.spaceId }));
    
    // Fetch Spaces for nav items
    const pageConfigs = {};
    for (const { navId, spaceId } of spaceIds) {
      try {
        const space = await fetchSpaceBySpaceId(supabase, spaceId);
        if (space) {
          pageConfigs[navId] = convertSpaceToPageConfig(space);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to fetch Space ${spaceId}:`, error.message);
      }
    }
    
    // Import shared themes (will be created in Step 3)
    // For now, we'll add a placeholder - themes will be imported from shared file
    const themesPlaceholder = {}; // Will be replaced with import from shared/themes.ts
    
    // Combine: config + themes + pages
    const fullConfig = {
      ...config,
      theme: themesPlaceholder,  // From shared file (Step 3)
      pages: pageConfigs,  // From Spaces
    };
    
    // Store config in environment variable (now small enough at ~2.8 KB)
    process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG = JSON.stringify(fullConfig);
    console.log('✅ Loaded config from database');
  } catch (error) {
    console.warn('⚠️  Error loading config from DB:', error.message);
  }
}

// Load config before Next.js config is created
await loadConfigFromDB();

// Continue with existing Next.js config...
```

```typescript
// src/config/index.ts (modify loadSystemConfig)

import { SystemConfig } from './systemConfig';
import { nounsSystemConfig } from './nouns/index';
import { exampleSystemConfig } from './example/index';
import { clankerSystemConfig } from './clanker/index';
// Import shared themes (will be created in Step 3)
// import { themes } from './shared/themes';

export const loadSystemConfig = (): SystemConfig => {
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  // Try build-time config from database (stored in env var at build time)
  const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
  if (buildTimeConfig) {
    try {
      const dbConfig = JSON.parse(buildTimeConfig) as SystemConfig;
      
      // Map page configs from pages object to homePage/explorePage
      const homePage = dbConfig.pages?.['home'] || null;
      const explorePage = dbConfig.pages?.['explore'] || null;
      
      // Get themes from shared file (Step 3)
      // const themes = require('./shared/themes').themes;
      
      // Validate config structure
      if (dbConfig && dbConfig.brand && dbConfig.assets) {
        console.log('✅ Using config from database');
        return {
          ...dbConfig,
          homePage,
          explorePage,
          // theme: themes,  // From shared file (Step 3)
        } as SystemConfig;
      }
    } catch (error) {
      console.warn('⚠️  Failed to parse build-time config, falling back to static:', error);
    }
  }
  
  // Fall back to static configs (existing behavior)
  console.log('ℹ️  Using static configs');
  switch (communityConfig.toLowerCase()) {
    case 'nouns':
      return nounsSystemConfig;
    case 'example':
      return exampleSystemConfig;
    case 'clanker':
      return clankerSystemConfig as unknown as SystemConfig;
    default:
      return nounsSystemConfig;
  }
};
```

**Test:**
```bash
# Test with DB
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run build
# Should see: "✅ Loaded config from database"

# Test without DB
npm run build
# Should see: "ℹ️  Using static configs"
# Should fall back to static configs

# Verify app works
npm run dev
# App should load correctly
```

**Note:** Build-time loading requires space configs to be uploaded (Step 1.5). Without them, page configs won't be available.

### Step 3: Create Shared Themes (30 min)

```typescript
// src/config/shared/themes.ts

// Extract themes from nouns.theme.ts (or any community - they're all the same)
import { nounsTheme } from '../nouns/nouns.theme';

// Export shared themes (all communities use the same themes)
export const themes = nounsTheme;

// Update community configs to import from shared
// src/config/nouns/nouns.theme.ts
export { themes as nounsTheme } from '../shared/themes';

// src/config/clanker/clanker.theme.ts
export { themes as clankerTheme } from '../shared/themes';

// src/config/example/example.theme.ts
export { themes as exampleTheme } from '../shared/themes';
```

**Update next.config.mjs to import themes:**
```javascript
// In loadConfigFromDB function, replace themesPlaceholder:
import { themes } from './src/config/shared/themes';

// Then use:
const fullConfig = {
  ...config,
  theme: themes,  // From shared file
  pages: pageConfigs,  // From Spaces
};

// Store in env var
process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG = JSON.stringify(fullConfig);
```

**Update src/config/index.ts to use shared themes:**
```typescript
import { themes } from './shared/themes';

// In loadSystemConfig, when using dbConfig:
return {
  ...dbConfig,
  theme: themes,  // Always use shared themes
  homePage,
  explorePage,
} as SystemConfig;
```

**Test:**
```bash
npm run build
# Should see: "✅ Loaded config from database"
# Config is now ~2.8 KB (much smaller!), stored in env var
```

**✅ Proof of Concept Complete!**

If this works, you've validated:
- ✅ Database storage works (without themes/pages)
- ✅ Space registrations created in database
- ✅ Space configs uploaded to storage
- ✅ Build-time loading works
- ✅ Shared themes work
- ✅ Space-based pages work (loaded from storage)
- ✅ Fallback works
- ✅ Config size reduced by ~90%

---

## 📊 Full Implementation Phases

### Phase 1: Database Foundation (Week 1, Days 1-2)

**What:** Create tables, functions, seed data

**Files:**
- `supabase/migrations/20251129172847_create_community_configs.sql` - Creates table (no themes/pages)
- `supabase/migrations/20251129172848_add_navpage_space_type.sql` - Adds navPage spaceType
- `supabase/seed.sql` - Seeds configs and creates navPage space registrations
- `scripts/seed-navpage-spaces.ts` - Uploads space config files to storage

**Test:**
- ✅ Can query configs from DB
- ✅ Functions work correctly
- ✅ Config excludes themes/pages
- ✅ navPage spaceType exists
- ✅ Seed data loaded
- ✅ navPage space registrations created
- ✅ Space config files uploaded to storage

**Rollback:** `supabase db reset` (resets to clean state)

---

### Phase 2: Config Loading (Week 1, Days 3-4)

**What:** Load config from DB at build time, fetch Spaces for nav items

**Files:**
- `next.config.mjs` - Build-time config generation
- `src/config/index.ts` - Config loader
- `src/config/shared/themes.ts` - Shared themes

**Test:**
- ✅ Build succeeds with/without DB
- ✅ App uses DB config when available
- ✅ Themes loaded from shared file
- ✅ Pages loaded from Spaces (when space configs uploaded)
- ✅ App falls back to static
- ✅ Config size ~2.8 KB

**Note:** Pages require space configs to be uploaded (via `scripts/seed-navpage-spaces.ts`) before they can be loaded at build time.

**Rollback:** Remove env var reading

---

### Phase 3: Admin API (Week 1, Day 5)

**What:** Create API endpoints for updates

**Test:**
- ✅ Can fetch config via API (without themes/pages)
- ✅ Can update config via API
- ✅ Can fetch/update nav page Spaces
- ✅ Permission checks work

**Rollback:** Remove API routes

---

### Phase 4: Admin UI (Week 2, Days 1-2)

**What:** Create admin interface

**Test:**
- ✅ Can view config (without themes/pages)
- ✅ Can edit config
- ✅ Can edit nav page Spaces
- ✅ Can save changes

**Rollback:** Remove admin pages

---

### Phase 5: Asset Upload (Week 2, Days 3-4)

**What:** Upload assets to Supabase Storage

**Test:**
- ✅ Can upload assets
- ✅ Assets stored correctly
- ✅ Config updated with paths

**Rollback:** Remove upload functionality

---

### Phase 6: Asset Download (Week 2, Day 5)

**What:** Download assets during build

**Test:**
- ✅ Assets download to public/
- ✅ Config paths updated
- ✅ Assets load correctly

**Rollback:** Remove download code

---

### Phase 7: Optimization (Week 3, Day 1)

**What:** Optimize images with Sharp

**Test:**
- ✅ Images optimized
- ✅ File sizes reduced
- ✅ Quality maintained

**Rollback:** Remove optimization

---

### Phase 8: Rebuild Trigger (Week 3, Day 2)

**What:** Trigger rebuilds after updates

**Test:**
- ✅ Rebuild triggers correctly
- ✅ Build completes successfully
- ✅ Changes deployed

**Rollback:** Remove trigger

---

### Phase 9: Production (Week 3, Days 3-5)

**What:** Roll out to production

**Test:**
- ✅ All communities work
- ✅ Performance acceptable
- ✅ No regressions

**Rollback:** Revert to static configs

---

## 🧪 Testing Checklist Per Phase

### Phase 1: Database
- [ ] Tables created (without theme/home/explore columns)
- [ ] Functions work (exclude themes/pages)
- [ ] Seed data loaded
- [ ] navPage spaceType exists
- [ ] navPage space registrations created
- [ ] Space config files uploaded to storage
- [ ] RLS policies work

### Phase 2: Config Loading
- [ ] Build succeeds with DB
- [ ] Build succeeds without DB
- [ ] App uses DB config
- [ ] Themes loaded from shared file
- [ ] Pages loaded from Spaces (when available)
- [ ] App falls back to static
- [ ] Config size ~2.8 KB
- [ ] No breaking changes

### Phase 3: Admin API
- [ ] GET returns config (without themes/pages)
- [ ] PUT updates config
- [ ] GET/PUT for nav page Spaces
- [ ] Permission checks work
- [ ] Invalid requests rejected

### Phase 4: Admin UI
- [ ] Can view config (without themes/pages)
- [ ] Can edit config
- [ ] Can edit nav page Spaces
- [ ] Can save changes
- [ ] Changes persist

### Phase 5: Asset Upload
- [ ] Can upload assets
- [ ] Assets in storage
- [ ] Config updated

### Phase 6: Asset Download
- [ ] Assets download
- [ ] Assets in public/
- [ ] Config paths updated
- [ ] Assets load correctly

### Phase 7: Optimization
- [ ] Images optimized
- [ ] File sizes reduced
- [ ] Quality maintained

### Phase 8: Rebuild Trigger
- [ ] Rebuild triggers
- [ ] Build completes
- [ ] Changes deployed

### Phase 9: Production
- [ ] All communities work
- [ ] Performance good
- [ ] No regressions

---

## 🎯 Success Metrics

### Phase 2 (Config Loading)
- Build time: < 30s
- App loads: < 2s
- Config size: ~2.8 KB (down from ~29 KB)
- Config matches: DB or static

### Phase 6 (Asset Download)
- Asset download: < 5s per community
- Asset sizes: < 500KB each
- Assets load: < 500ms

### Phase 7 (Optimization)
- File size reduction: > 50%
- Build time increase: < 5s
- Quality: Acceptable

### Phase 9 (Production)
- All communities: Working
- Performance: No degradation
- Errors: < 0.1%

---

## 🚨 Risk Mitigation

### High Risk Phases
- **Phase 2** - Could break builds
  - **Mitigation:** Extensive fallback testing
  - **Rollback:** Remove env var reading

- **Phase 6** - Could break asset loading
  - **Mitigation:** Fallback to static assets
  - **Rollback:** Remove download code

- **Phase 9** - Production rollout
  - **Mitigation:** Gradual rollout, monitor closely
  - **Rollback:** Revert to static configs

### Low Risk Phases
- **Phase 1** - Database only, no app changes
- **Phase 3** - API only, no app changes
- **Phase 4** - Admin UI only, no app changes
- **Phase 7** - Optimization only, improves performance

---

## 📝 Implementation Notes

### Environment Variables Needed

```bash
# Required for all phases
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Required for build-time loading (Phase 2+)
SUPABASE_SERVICE_ROLE_KEY=...

# Required for admin features (Phase 3+)
# (Admin identity from your auth system)
```

### Database Reset

To reset database from scratch:
```bash
supabase db reset
```

This will:
1. Drop all tables
2. Apply all migrations (including community_configs)
3. Run seed.sql (seeds configs and creates navPage space registrations)

**After reset, upload space configs:**
```bash
tsx scripts/seed-navpage-spaces.ts
```

This uploads the actual space config files (tabs and tabOrder) to Supabase Storage.

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/database-configs

# Work on Phase 1
git commit -m "Phase 1: Database schema"

# Work on Phase 2
git commit -m "Phase 2: Config loading"

# Test each phase before moving on
# Merge when all phases complete
```

### Testing Strategy

1. **Local testing** - Test each phase locally first
2. **Staging testing** - Deploy to staging after each phase
3. **Production testing** - Test with one community first
4. **Full rollout** - Roll out to all communities

---

## 🎓 Learning Path

If you're new to any part:

1. **Supabase** - Start with local Supabase, test queries
2. **Next.js build** - Understand `next.config.mjs` execution
3. **Environment variables** - Learn Next.js env var system
4. **Sharp** - Test image optimization separately first

---

## 📞 Support

If you get stuck on any phase:

1. Check the detailed plan in `INCREMENTAL_IMPLEMENTATION_PLAN.md`
2. Review the specific phase documentation
3. Test the rollback procedure
4. Ask for help before proceeding

---

## ✅ Quick Validation

After each phase, verify:

1. **Build succeeds** - `npm run build` works
2. **App works** - `npm run dev` loads correctly
3. **No regressions** - Existing features still work
4. **Can rollback** - Know how to revert if needed

If all ✅, proceed to next phase!
