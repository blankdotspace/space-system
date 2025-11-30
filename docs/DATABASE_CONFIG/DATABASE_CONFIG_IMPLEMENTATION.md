# Database-Backed Configuration Implementation Plan

## Overview

This document provides a detailed, phase-by-phase implementation plan for migrating to database-backed configurations. Each phase is independently testable and can be rolled back if issues arise.

## Architecture Summary

- **Config Storage**: Supabase `community_configs` table (~2.8 KB per config)
- **Build-Time Loading**: Configs fetched during build, stored in `NEXT_PUBLIC_BUILD_TIME_CONFIG` env var
- **Shared Themes**: Stored in `src/config/shared/themes.ts` (not in DB)
- **Pages as Spaces**: homePage/explorePage stored as Spaces, referenced by navigation items
- **Zero Runtime Queries**: All configs loaded at build time

## Phase 0: Preparation & Setup

**Goal:** Set up foundation without breaking existing system

**Tasks:**
1. Create feature branch: `feature/database-configs`
2. Document current static config structure
3. Set up test database (local Supabase)
4. Create migration files structure

**Testing:**
- ✅ Verify static configs still work
- ✅ Local Supabase runs successfully
- ✅ Can connect to database

**Rollback:** Just switch back to main branch

**Estimated Time:** 1-2 hours

---

## Phase 1: Database Schema

**Goal:** Create database tables and functions

**Tasks:**
1. Create migration: `community_configs` table (without theme/home/explore columns)
2. Create migration: `add_navpage_space_type` (adds navPage spaceType)
3. Create database function: `get_active_community_config` (excludes themes/pages)
4. Set up RLS policies
5. Seed initial data via `supabase/seed.sql`:
   - Seeds configs for nouns, example, clanker
   - Creates navPage space registrations (nouns-home, nouns-explore, clanker-home)
   - Links navigation items to spaces via spaceId
6. Create space seeding script: `scripts/seed-navpage-spaces.ts`
7. Upload space configs to Supabase Storage

**Files:**
- `supabase/migrations/20251129172847_create_community_configs.sql`
- `supabase/migrations/20251129172848_add_navpage_space_type.sql`
- `supabase/seed.sql` (includes seed data and space registrations)
- `scripts/seed-navpage-spaces.ts` (uploads space config files)

**Testing:**
```sql
-- Test 1: Can fetch config (should not include themes/pages)
SELECT get_active_community_config('nouns');

-- Test 2: Verify navPage spaceType exists
SELECT DISTINCT "spaceType" FROM "spaceRegistrations";
-- Should include: 'navPage'

-- Test 3: Verify seed data loaded
SELECT community_id FROM community_configs;
-- Should see: nouns, example, clanker

-- Test 4: Verify navPage spaces created
SELECT "spaceId", "spaceName", "spaceType" 
FROM "spaceRegistrations" 
WHERE "spaceType" = 'navPage';
-- Should see: nouns-home, nouns-explore, clanker-home

-- Test 5: Verify navigation references spaces
SELECT "navigation_config"->'items' as nav_items 
FROM "community_configs" 
WHERE "community_id" = 'nouns';
-- Should see spaceId references
```

**After seed.sql, upload space configs:**
```bash
tsx scripts/seed-navpage-spaces.ts
```

**Validation:**
- ✅ Database functions work
- ✅ RLS policies enforce access
- ✅ Seed data loaded
- ✅ navPage spaceType added
- ✅ Config excludes theme/home/explore columns
- ✅ navPage space registrations created
- ✅ Space config files uploaded to storage

**Rollback:** `supabase db reset` (resets to clean state, deletes storage files)

**Estimated Time:** 4-6 hours

---

## Phase 2: Build-Time Config Loading

**Goal:** Load config from DB at build time, store in env var

**Tasks:**
1. Create `src/config/shared/themes.ts` - Move themes to shared file
2. Update community configs to import shared themes
3. Add build-time fetch in `next.config.mjs`:
   - Fetch main config from DB
   - Import shared themes
   - Extract spaceIds from navigation items
   - Fetch Spaces for nav items (if implemented)
   - Combine config + themes + pages
   - Store in `NEXT_PUBLIC_BUILD_TIME_CONFIG` env var
4. Update `src/config/index.ts` to read from env var
5. Keep static configs as fallback

**Files to Create:**
- `src/config/shared/themes.ts`

**Files to Modify:**
- `next.config.mjs` - Add config fetch
- `src/config/index.ts` - Read from env var
- `src/config/nouns/nouns.theme.ts` - Import from shared
- `src/config/clanker/clanker.theme.ts` - Import from shared
- `src/config/example/example.theme.ts` - Import from shared

**Implementation:**

```javascript
// next.config.mjs

import { createClient } from '@supabase/supabase-js';
import { themes } from './src/config/shared/themes';

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
      console.log('ℹ️  Using static configs (no DB config found)');
      return;
    }
    
    // Combine: config + shared themes + pages (if Spaces implemented)
    const fullConfig = {
      ...config,
      theme: themes,  // From shared file
      pages: {},     // Will be populated when Spaces are implemented
    };
    
    // Store in env var (now small enough at ~2.8 KB)
    process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG = JSON.stringify(fullConfig);
    console.log('✅ Loaded config from database');
  } catch (error) {
    console.warn('⚠️  Error loading config from DB:', error.message);
  }
}

await loadConfigFromDB();
```

```typescript
// src/config/index.ts

export const loadSystemConfig = (): SystemConfig => {
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  // Try build-time config from database (stored in env var)
  const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
  if (buildTimeConfig) {
    try {
      const dbConfig = JSON.parse(buildTimeConfig) as SystemConfig;
      // Validate config structure
      if (dbConfig && dbConfig.brand && dbConfig.assets) {
        console.log('✅ Using config from database');
        return dbConfig;
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

**Testing:**
```bash
# Test with DB available
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run build
# Should see: "✅ Loaded config from database"

# Test without DB
npm run build
# Should see: "ℹ️  Using static configs"

# Verify app works
npm run dev
# App should load correctly
```

**Validation:**
- ✅ Build succeeds with/without DB
- ✅ App uses DB config when available
- ✅ Themes loaded from shared file
- ✅ App falls back to static when unavailable
- ✅ Config size ~2.8 KB
- ✅ All existing functionality works
- ✅ No breaking changes

**Rollback:** Remove env var reading, system back to static-only

**Estimated Time:** 2-3 hours

---

## Phase 3: Admin API Endpoints

**Goal:** Create API endpoints for admin config updates

**Tasks:**
1. Create `/api/admin/config/[communityId]` - GET/PUT
2. Create `/api/admin/config/[communityId]/history` - GET
3. Create `/api/admin/spaces/[spaceId]` - GET/PUT (for nav page Spaces)
4. Add admin permission checks
5. Add request validation

**Files to Create:**
- `src/app/api/admin/config/[communityId]/route.ts`
- `src/app/api/admin/config/[communityId]/history/route.ts`
- `src/app/api/admin/spaces/[spaceId]/route.ts`
- `src/common/data/services/adminConfigService.ts`

**Testing:**
```bash
# Test GET
curl -H "x-admin-identity: test-admin" \
  http://localhost:3000/api/admin/config/nouns

# Test PUT
curl -X PUT \
  -H "x-admin-identity: test-admin" \
  -H "Content-Type: application/json" \
  -d '{"config": {...}, "changeNotes": "Test update"}' \
  http://localhost:3000/api/admin/config/nouns
```

**Validation:**
- ✅ GET returns config (without themes/pages)
- ✅ PUT updates config
- ✅ GET/PUT for Spaces (nav pages)
- ✅ Permission checks work
- ✅ History tracked
- ✅ Invalid requests rejected

**Rollback:** Remove API routes, no impact on main app

**Estimated Time:** 3-4 hours

---

## Phase 4: Basic Admin UI

**Goal:** Create simple admin interface to view/edit configs

**Tasks:**
1. Create admin layout/page structure
2. Create config viewer (read-only first)
3. Add basic form for editing config
4. Add Space editor for nav pages (homePage/explorePage)
5. Add save functionality

**Files to Create:**
- `src/app/admin/config/[communityId]/page.tsx`
- `src/app/admin/config/[communityId]/components/ConfigViewer.tsx`
- `src/app/admin/config/[communityId]/components/ConfigEditor.tsx`
- `src/app/admin/config/[communityId]/components/NavPageEditor.tsx`

**Testing:**
1. Navigate to `/admin/config/nouns`
2. Verify config loads
3. Make a small change (e.g., brand name)
4. Save and verify it updates in DB
5. Rebuild and verify change appears

**Validation:**
- ✅ Can view config (without themes/pages)
- ✅ Can edit config
- ✅ Can edit nav page Spaces
- ✅ Can save changes
- ✅ Changes persist in DB/Storage
- ✅ Changes appear after rebuild

**Rollback:** Remove admin routes, no impact on main app

**Estimated Time:** 4-6 hours

---

## Phase 5-10: Additional Features

See `INCREMENTAL_IMPLEMENTATION_PLAN.md` for detailed phases covering:
- Phase 5: Asset Upload
- Phase 6: Build-Time Asset Download
- Phase 7: Asset Optimization
- Phase 8: Rebuild Trigger
- Phase 9: Production Rollout
- Phase 10: Phase Out Static Configs

---

## Testing Checklist

### Phase 1: Database
- [ ] Tables created (without theme/home/explore columns)
- [ ] Functions work (exclude themes/pages)
- [ ] Seed data loaded
- [ ] navPage spaceType exists
- [ ] RLS policies work

### Phase 2: Config Loading
- [ ] Build succeeds with DB
- [ ] Build succeeds without DB
- [ ] App uses DB config
- [ ] Themes loaded from shared file
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

---

## Rollback Procedures

### Phase 1 Rollback
```bash
supabase db reset  # Resets to clean state
```

### Phase 2 Rollback
Remove env var reading from `src/config/index.ts`, system uses static configs

### Phase 3 Rollback
Remove API routes, no impact on main app

### Phase 4 Rollback
Remove admin routes, no impact on main app

---

## Success Criteria

### Phase 1
- ✅ Database functions work
- ✅ Seed data loaded
- ✅ navPage spaceType exists

### Phase 2
- ✅ Build succeeds with/without DB
- ✅ App uses DB config when available
- ✅ Themes loaded from shared file
- ✅ Config size reduced to ~2.8 KB
- ✅ No breaking changes

### Phase 3
- ✅ Admin can fetch/update configs
- ✅ Permission checks work
- ✅ History tracked

### Phase 4
- ✅ Admin can view/edit configs
- ✅ Changes persist and appear after rebuild

---

## Quick Start Path

For a quick proof-of-concept:

1. **Phase 1** - Create DB schema (2h)
2. **Phase 2** - Basic config loading (2h)
3. **Manual testing** - Update DB directly, rebuild, verify

This gives you a working POC in ~4 hours!

---

## Related Documentation

- `DATABASE_CONFIG_GUIDE.md` - Architecture and overview
- `QUICK_START_IMPLEMENTATION.md` - Quick start guide
- `QUICK_START_TESTING.md` - Testing guide
- `INCREMENTAL_IMPLEMENTATION_PLAN.md` - Complete phase-by-phase plan (all 10 phases)
- `README.md` - Documentation index

