# Incremental Implementation Plan

## Overview

This plan breaks down the database-backed configuration system into testable phases, allowing you to validate each piece before moving to the next.

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

## Phase 1: Database Schema (Week 1, Day 1-2)

**Goal:** Create database tables and functions

**Tasks:**
1. Create migration: `community_configs` table (without homePage/explorePage columns)
2. Create migration: `community_config_history` table
3. Create migration: `community_config_admins` table
4. Add `navPage` spaceType to `spaceRegistrations`
5. Create database function: `get_active_community_config` (excludes page configs)
6. Create database function: `create_config_version`
7. Set up RLS policies
8. Seed initial data (copy from static configs, excluding themes/pages)

**Files to Create:**
```
supabase/migrations/
  └── YYYYMMDDHHMMSS_create_community_configs.sql
  └── YYYYMMDDHHMMSS_add_navpage_space_type.sql
```

**Files to Create/Update:**
```
src/config/shared/
  └── themes.ts              # NEW: Shared theme definitions
```

**Testing:**
```sql
-- Test 1: Can fetch config (should not include homePage/explorePage)
SELECT * FROM get_active_community_config('nouns');

-- Test 2: Verify navPage spaceType exists
SELECT * FROM spaceRegistrations WHERE "spaceType" = 'navPage';

-- Test 3: Can create version
SELECT create_config_version(
  'nouns',
  '{"brand": {...}, "assets": {...}}'::jsonb,
  'Initial seed'
);

-- Test 4: Can query history
SELECT * FROM community_config_history 
WHERE community_config_id = (SELECT id FROM community_configs WHERE community_id = 'nouns');
```

**Validation:**
- ✅ Database functions work
- ✅ RLS policies enforce access
- ✅ Can seed existing configs (without themes/pages)
- ✅ History tracking works
- ✅ navPage spaceType added
- ✅ Config excludes homePage/explorePage columns

**Rollback:** Drop migrations, system unchanged

**Estimated Time:** 4-6 hours

---

## Phase 2: Basic Config Loading (Week 1, Day 3-4)

**Goal:** Load config from DB at build time, fetch Spaces for nav items, fallback to static

**Tasks:**
1. Create `src/config/shared/themes.ts` - Move themes to shared file
2. Update community configs to import shared themes
3. Add build-time fetch in `next.config.mjs`:
   - Fetch main config from DB
   - Extract spaceIds from navigation items
   - Fetch Spaces for nav items with spaceId
   - Convert Spaces to page configs
4. Generate TypeScript file (not env var - avoids E2BIG)
5. Update `src/config/index.ts` to use generated file
6. Keep static configs as fallback

**Files to Create:**
```
src/config/shared/
  └── themes.ts          # NEW: Shared theme definitions
```

**Files to Modify:**
```
next.config.mjs          # Add config fetch + Space fetching
src/config/index.ts      # Add generated file reading
src/config/nouns/nouns.theme.ts    # Import from shared
src/config/clanker/clanker.theme.ts  # Import from shared
src/config/example/example.theme.ts   # Import from shared
src/config/systemConfig.ts  # Update NavigationItem interface
```

**Implementation:**

```javascript
// next.config.mjs (add at top)

import { createClient } from '@supabase/supabase-js';

async function loadConfigFromDB() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('ℹ️  No Supabase credentials, using static configs');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const community = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  try {
    const { data, error } = await supabase
      .rpc('get_active_community_config', { p_community_id: community })
      .single();
    
    if (error || !data) {
      console.log('ℹ️  No config in DB, using static configs');
      return;
    }
    
    // Store in env var
    process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG = JSON.stringify(data);
    console.log('✅ Loaded config from database');
  } catch (error) {
    console.warn('⚠️  Error loading config from DB:', error.message);
  }
}

await loadConfigFromDB();

// Continue with existing Next.js config...
```

```typescript
// src/config/index.ts (modify loadSystemConfig)

// Try to import DB config (generated at build time)
let dbConfig: SystemConfig | null = null;
try {
  const dbModule = require('./db-config');
  dbConfig = dbModule.dbConfig || null;
} catch {
  // File doesn't exist, will use static
}

export const loadSystemConfig = (): SystemConfig => {
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  // Try build-time config from generated file
  if (dbConfig) {
    // Map page configs from pages object to homePage/explorePage
    const homePage = dbConfig.pages?.['home'] || staticConfig.homePage;
    const explorePage = dbConfig.pages?.['explore'] || staticConfig.explorePage;
    
    console.log('✅ Using config from database');
    return {
      ...dbConfig,
      homePage,
      explorePage,
    };
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
1. **Test with DB available:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run build
   # Should see: "✅ Generated config file from database"
   # Should see: src/config/db-config.ts created
   ```

2. **Test without DB:**
   ```bash
   # Remove env vars
   npm run build
   # Should see: "ℹ️  Using static configs"
   # Should fall back to static configs
   ```

3. **Test app functionality:**
   - Build succeeds
   - App loads correctly
   - Config values match DB (if loaded) or static (if fallback)
   - Themes loaded from shared file
   - Pages loaded from Spaces (if nav items have spaceId)
   - No runtime errors

4. **Verify config size:**
   ```bash
   # Check generated file size
   wc -c src/config/db-config.ts
   # Should be ~2-3 KB (much smaller than before!)
   ```

**Validation:**
- ✅ Build succeeds with/without DB
- ✅ App uses DB config when available
- ✅ App falls back to static when DB unavailable
- ✅ Themes loaded from shared file
- ✅ Pages loaded from Spaces (via nav items)
- ✅ Config file generated (not env var - avoids E2BIG)
- ✅ Config size reduced (~2.8 KB vs ~29 KB)
- ✅ All existing functionality works
- ✅ No breaking changes

**Rollback:** Remove generated file reading, system back to static-only

**Estimated Time:** 2-3 hours

---

## Phase 3: Admin API Endpoints (Week 1, Day 5)

**Goal:** Create API endpoints for admin config updates

**Tasks:**
1. Create `/api/admin/config/[communityId]` - GET/PUT
2. Create `/api/admin/config/[communityId]/history` - GET
3. Create `/api/admin/spaces/[spaceId]` - GET/PUT (for nav page Spaces)
4. Add admin permission checks
5. Add request validation
6. Note: Themes are in shared file (not editable via API for now)

**Files to Create:**
```
src/app/api/admin/config/[communityId]/route.ts
src/app/api/admin/config/[communityId]/history/route.ts
src/app/api/admin/spaces/[spaceId]/route.ts  # NEW: For nav page Spaces
src/common/data/services/adminConfigService.ts
```

**Implementation:**

```typescript
// src/app/api/admin/config/[communityId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SystemConfig } from '@/config/systemConfig';

export async function GET(
  request: NextRequest,
  { params }: { params: { communityId: string } }
) {
  // Verify admin (simplified for Phase 3)
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
    .eq('community_id', params.communityId)
    .eq('admin_identity_public_key', adminIdentity)
    .eq('is_active', true)
    .single();
  
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Get config
  const { data, error } = await supabase
    .rpc('get_active_community_config', { p_community_id: params.communityId })
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ config: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { communityId: string } }
) {
  const adminIdentity = request.headers.get('x-admin-identity');
  if (!adminIdentity) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json();
  const { config, changeNotes } = body;
  
  // Validate config structure (basic)
  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'Invalid config' }, { status: 400 });
  }
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Check admin permissions
  const { data: admin } = await supabase
    .from('community_config_admins')
    .select('id')
    .eq('community_id', params.communityId)
    .eq('admin_identity_public_key', adminIdentity)
    .eq('is_active', true)
    .single();
  
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Create new version
  const { data, error } = await supabase.rpc('create_config_version', {
    p_community_id: params.communityId,
    p_config_data: config,
    p_change_notes: changeNotes || 'Updated via admin API',
    p_admin_identity: adminIdentity
  });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true, versionId: data });
}
```

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
- ✅ GET returns config
- ✅ PUT creates new version
- ✅ Permission checks work
- ✅ History is tracked
- ✅ Invalid requests are rejected

**Rollback:** Remove API routes, no impact on main app

**Estimated Time:** 3-4 hours

---

## Phase 4: Basic Admin UI (Week 2, Day 1-2)

**Goal:** Create simple admin interface to view/edit configs and nav pages

**Tasks:**
1. Create admin layout/page structure
2. Create config viewer (read-only first)
3. Add basic form for editing config
4. Add Space editor for nav pages (homePage/explorePage)
5. Add save functionality
6. Note: Themes edited in code (shared file) for now

**Files to Create:**
```
src/app/admin/config/[communityId]/page.tsx
src/app/admin/config/[communityId]/components/ConfigViewer.tsx
src/app/admin/config/[communityId]/components/ConfigEditor.tsx
src/app/admin/config/[communityId]/components/NavPageEditor.tsx  # NEW: Edit nav page Spaces
```

**Implementation:**

```typescript
// src/app/admin/config/[communityId]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SystemConfig } from '@/config/systemConfig';

export default function AdminConfigPage() {
  const params = useParams();
  const communityId = params.communityId as string;
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`/api/admin/config/${communityId}`, {
      headers: {
        'x-admin-identity': getAdminIdentity(), // Your auth
      },
    })
      .then(res => res.json())
      .then(data => {
        setConfig(data.config);
        setLoading(false);
      });
  }, [communityId]);
  
  if (loading) return <div>Loading...</div>;
  if (!config) return <div>No config found</div>;
  
  return (
    <div>
      <h1>Edit Config: {communityId}</h1>
      <ConfigEditor config={config} communityId={communityId} />
    </div>
  );
}
```

**Testing:**
1. Navigate to `/admin/config/nouns`
2. Verify config loads
3. Make a small change (e.g., brand name)
4. Save and verify it updates in DB
5. Rebuild and verify change appears

**Validation:**
- ✅ Can view config (without themes/pages)
- ✅ Can edit config
- ✅ Can edit nav page Spaces (homePage/explorePage)
- ✅ Can save changes
- ✅ Changes persist in DB/Storage
- ✅ Changes appear after rebuild

**Rollback:** Remove admin routes, no impact on main app

**Estimated Time:** 4-6 hours

---

## Phase 5: Asset Upload (Week 2, Day 3-4)

**Goal:** Add asset upload functionality

**Tasks:**
1. Create Supabase storage bucket
2. Create upload API endpoint
3. Add upload UI component
4. Update config to store asset paths

**Files to Create:**
```
src/app/api/admin/assets/upload/route.ts
src/app/admin/config/[communityId]/components/AssetUpload.tsx
```

**Testing:**
1. Upload a logo
2. Verify it's in Supabase Storage
3. Verify config stores storage path
4. Rebuild and verify asset downloads
5. Verify asset appears in app

**Validation:**
- ✅ Can upload assets
- ✅ Assets stored in Supabase
- ✅ Config updated with paths
- ✅ Assets download at build time
- ✅ Assets appear correctly

**Rollback:** Remove upload functionality, use static assets

**Estimated Time:** 4-6 hours

---

## Phase 6: Build-Time Asset Download (Week 2, Day 5)

**Goal:** Download assets during build

**Tasks:**
1. Add asset download to `next.config.mjs`
2. Download assets to `public/images/{community}/`
3. Update config paths to public paths
4. Add error handling

**Files to Modify:**
```
next.config.mjs  # Add asset download
```

**Testing:**
1. Upload asset via admin UI
2. Trigger build
3. Verify asset downloads to `public/`
4. Verify config uses public path
5. Verify asset loads in app

**Validation:**
- ✅ Assets download during build
- ✅ Assets in correct location
- ✅ Config paths updated
- ✅ Assets load correctly
- ✅ Fallback works if download fails

**Rollback:** Remove download code, use static assets

**Estimated Time:** 2-3 hours

---

## Phase 7: Asset Optimization (Week 3, Day 1)

**Goal:** Optimize assets during download

**Tasks:**
1. Add Sharp optimization
2. Convert PNG/JPG to WebP
3. Resize large images
4. Add optimization logging

**Files to Modify:**
```
next.config.mjs  # Add Sharp optimization
```

**Testing:**
1. Upload large PNG (2MB+)
2. Build and verify WebP created
3. Verify file size reduced
4. Verify image quality acceptable
5. Verify load time improved

**Validation:**
- ✅ Images optimized
- ✅ File sizes reduced
- ✅ Quality maintained
- ✅ Build time acceptable
- ✅ Performance improved

**Rollback:** Remove optimization, use raw downloads

**Estimated Time:** 2-3 hours

---

## Phase 8: Rebuild Trigger (Week 3, Day 2)

**Goal:** Trigger rebuilds after config updates

**Tasks:**
1. Create rebuild trigger API
2. Integrate with CI/CD (GitHub Actions/Vercel)
3. Add rebuild status UI
4. Add webhook handling

**Files to Create:**
```
src/app/api/admin/config/[communityId]/rebuild/route.ts
.github/workflows/rebuild-on-config-change.yml (if using GitHub Actions)
```

**Testing:**
1. Update config via admin UI
2. Click "Trigger Rebuild"
3. Verify build triggered
4. Verify build completes
5. Verify changes deployed

**Validation:**
- ✅ Rebuild triggers correctly
- ✅ Build completes successfully
- ✅ Changes deployed
- ✅ Status updates correctly

**Rollback:** Remove trigger, manual rebuilds

**Estimated Time:** 3-4 hours

---

## Phase 9: Production Rollout (Week 3, Day 3-5)

**Goal:** Roll out to production gradually

**Tasks:**
1. Test with one community (e.g., 'example')
2. Monitor build times
3. Monitor performance
4. Roll out to other communities
5. Keep static configs as fallback for now

**Testing:**
1. Deploy to staging
2. Test all functionality
3. Monitor metrics
4. Deploy to production (one community)
5. Monitor for issues
6. Roll out to all communities

**Validation:**
- ✅ All communities work
- ✅ Performance acceptable
- ✅ No regressions
- ✅ Admin interface works
- ✅ Assets load correctly

**Rollback:** Revert to static configs

**Estimated Time:** 4-8 hours

---

## Phase 10: Phase Out Static Configs (Week 4)

**Goal:** Remove old static config system, make DB the single source of truth

**Prerequisites:**
- ✅ Phase 9 complete (all communities in production)
- ✅ Stable for at least 1-2 weeks
- ✅ No critical issues reported
- ✅ Admin interface fully functional
- ✅ All configs migrated to database

### Phase 10A: Remove Static Config Fallbacks (Week 4, Day 1-2)

**Goal:** Remove static config imports, keep minimal emergency fallback

**Tasks:**
1. Update `src/config/index.ts` to remove static imports
2. Keep minimal fallback (hardcoded default config)
3. Update error handling
4. Add monitoring/alerting for config load failures

**Files to Modify:**
```
src/config/index.ts          # Remove static imports
src/config/nouns/index.ts    # Mark as deprecated
src/config/clanker/index.ts  # Mark as deprecated
src/config/example/index.ts  # Mark as deprecated
```

**Implementation:**

```typescript
// src/config/index.ts

import { SystemConfig } from './systemConfig';

// Minimal emergency fallback (only used if DB completely unavailable)
const EMERGENCY_FALLBACK_CONFIG: SystemConfig = {
  brand: {
    name: "nounspace",
    displayName: "Nounspace",
    tagline: "A customizable Farcaster client",
    description: "Nounspace - Customizable Farcaster client",
    miniAppTags: [],
  },
  assets: {
    logos: {
      main: "/images/logo.png",
      icon: "/images/icon.png",
      favicon: "/images/favicon.ico",
      appleTouch: "/images/apple-touch-icon.png",
      og: "/images/og.png",
      splash: "/images/splash.png",
    },
  },
  // ... minimal required config
};

export const loadSystemConfig = (): SystemConfig => {
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  // Try build-time config from DB
  const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
  if (buildTimeConfig) {
    try {
      const dbConfig = JSON.parse(buildTimeConfig) as SystemConfig;
      
      // Validate config structure
      if (dbConfig && dbConfig.brand && dbConfig.assets) {
        return dbConfig;
      } else {
        console.error('❌ Invalid config structure from DB, using emergency fallback');
        // TODO: Alert monitoring system
      }
    } catch (error) {
      console.error('❌ Failed to parse build-time config:', error);
      // TODO: Alert monitoring system
    }
  }
  
  // Emergency fallback only (should rarely be used)
  console.error('⚠️  Using emergency fallback config - DB config unavailable!');
  console.error('⚠️  This indicates a build configuration issue.');
  // TODO: Alert monitoring system
  
  return EMERGENCY_FALLBACK_CONFIG;
};
```

**Testing:**
1. **Test with DB available:**
   ```bash
   # Should use DB config
   npm run build
   # Check logs: Should see config loaded from DB
   ```

2. **Test without DB (simulate failure):**
   ```bash
   # Remove env vars or break DB connection
   npm run build
   # Should use emergency fallback
   # Should log warnings/errors
   ```

3. **Test app with emergency fallback:**
   ```bash
   npm run dev
   # App should still load (with minimal config)
   ```

**Validation:**
- ✅ App works with DB config
- ✅ App works with emergency fallback
- ✅ Errors are logged/monitored
- ✅ No references to old static configs
- ✅ Build succeeds in both cases

**Rollback:** Re-add static config imports

**Estimated Time:** 2-3 hours

---

### Phase 10B: Remove Static Config Files (Week 4, Day 3)

**Goal:** Delete old static config files, keep only for reference

**Tasks:**
1. Archive static configs (move to `src/config/_archived/`)
2. Update imports throughout codebase
3. Remove from exports
4. Update documentation

**Files to Move:**
```
src/config/nouns/     → src/config/_archived/nouns/
src/config/clanker/   → src/config/_archived/clanker/
src/config/example/   → src/config/_archived/example/
```

**Files to Update:**
```
src/config/index.ts   # Remove exports
src/config/systemConfig.ts  # Keep (type definitions)
```

**Implementation:**

```typescript
// src/config/index.ts

import { SystemConfig } from './systemConfig';

// Static configs moved to _archived/ - no longer imported
// Only DB configs are used now

const EMERGENCY_FALLBACK_CONFIG: SystemConfig = {
  // ... minimal config
};

export const loadSystemConfig = (): SystemConfig => {
  // ... same as Phase 10A
};

// Remove all static config exports
// export { nounsSystemConfig } from './nouns/index'; // ❌ Removed
// export { clankerSystemConfig } from './clanker/index'; // ❌ Removed
```

**Testing:**
1. **Verify no broken imports:**
   ```bash
   npm run check-types
   # Should pass - no broken imports
   ```

2. **Verify build works:**
   ```bash
   npm run build
   # Should succeed
   ```

3. **Search for remaining references:**
   ```bash
   grep -r "nounsSystemConfig\|clankerSystemConfig\|exampleSystemConfig" src/
   # Should only find references in _archived/ or comments
   ```

**Validation:**
- ✅ No broken imports
- ✅ Build succeeds
- ✅ No references to old configs (except archived)
- ✅ Type checking passes

**Rollback:** Restore files from `_archived/`

**Estimated Time:** 1-2 hours

---

### Phase 10C: Update Space Creators (Week 4, Day 4)

**Goal:** Migrate initial space creators to use DB configs

**Tasks:**
1. Move space creator logic to database
2. Or keep as code but reference DB config
3. Update space creator functions
4. Test space creation

**Options:**

**Option A: Keep creators in code, reference DB config**
```typescript
// src/config/index.ts

export const createInitialProfileSpaceConfigForFid = (fid: number, username?: string) => {
  const config = loadSystemConfig(); // Uses DB config
  
  // Use config values in space creation
  return {
    // ... space config using config.community, config.brand, etc.
  };
};
```

**Option B: Store creators in DB**
```sql
-- Add to community_configs table
ALTER TABLE community_configs ADD COLUMN initial_space_creators JSONB;

-- Store creator functions/logic as JSON
```

**Testing:**
1. Create profile space
2. Create channel space
3. Create token space
4. Create proposal space
5. Create homebase
6. Verify all work correctly

**Validation:**
- ✅ All space creators work
- ✅ Spaces use DB config values
- ✅ No references to static configs

**Rollback:** Restore static space creators

**Estimated Time:** 3-4 hours

---

### Phase 10D: Cleanup & Documentation (Week 4, Day 5)

**Goal:** Final cleanup and documentation updates

**Tasks:**
1. Remove deprecated code comments
2. Update all documentation
3. Update README
4. Add migration guide
5. Update contributing guide
6. Remove unused files

**Files to Update:**
```
docs/CONFIGURATION.md              # Update for DB system
docs/COMMUNITY_CONFIG_SYSTEM.md    # Mark as legacy
docs/GETTING_STARTED.md            # Update setup steps
README.md                          # Update config section
```

**Files to Create:**
```
docs/MIGRATION_GUIDE.md            # How to migrate from static to DB
docs/ADMIN_GUIDE.md                # Admin user guide
```

**Cleanup Tasks:**
1. Remove unused imports
2. Remove commented code
3. Remove deprecated functions
4. Clean up `_archived/` folder (or keep for reference)

**Testing:**
1. **Verify documentation accuracy:**
   - All examples work
   - All links valid
   - All instructions correct

2. **Verify code cleanliness:**
   ```bash
   npm run lint
   npm run check-types
   # Should pass
   ```

3. **Verify no dead code:**
   ```bash
   # Search for unused exports
   # Check for orphaned files
   ```

**Validation:**
- ✅ Documentation updated
- ✅ No dead code
- ✅ No lint errors
- ✅ All examples work
- ✅ Migration guide complete

**Rollback:** Restore old documentation

**Estimated Time:** 2-3 hours

---

## Phase 10 Summary

**Total Time:** 8-12 hours over 1 week

**Phases:**
- **10A:** Remove static fallbacks (2-3h)
- **10B:** Remove static files (1-2h)
- **10C:** Update space creators (3-4h)
- **10D:** Cleanup & docs (2-3h)

**Final State:**
- ✅ DB is single source of truth
- ✅ No static config dependencies
- ✅ Minimal emergency fallback only
- ✅ Clean codebase
- ✅ Updated documentation

**Rollback Plan:**
- Can restore static configs from `_archived/`
- Can re-add static imports
- Can revert to Phase 9 state

---

## Complete Timeline

| Phase | Duration | Week | Risk |
|-------|----------|------|------|
| Phase 0 | 1-2h | Week 1 | Low |
| Phase 1 | 4-6h | Week 1 | Low |
| Phase 2 | 2-3h | Week 1 | Medium |
| Phase 3 | 3-4h | Week 1 | Low |
| Phase 4 | 4-6h | Week 2 | Medium |
| Phase 5 | 4-6h | Week 2 | Medium |
| Phase 6 | 2-3h | Week 2 | Medium |
| Phase 7 | 2-3h | Week 3 | Low |
| Phase 8 | 3-4h | Week 3 | Medium |
| Phase 9 | 4-8h | Week 3 | High |
| **Phase 10** | **8-12h** | **Week 4** | **Medium** |

**Total: 4-5 weeks**

---

## Phase 10: Phase Out Static Configs (Week 4)

**Goal:** Remove old static config system, make DB the single source of truth

**Prerequisites:**
- ✅ Phase 9 complete (all communities in production)
- ✅ Stable for at least 1-2 weeks
- ✅ No critical issues reported
- ✅ Admin interface fully functional
- ✅ All configs migrated to database

### Phase 10A: Remove Static Config Fallbacks (Week 4, Day 1-2)

**Goal:** Remove static config imports, keep minimal emergency fallback

**Tasks:**
1. Update `src/config/index.ts` to remove static imports
2. Keep minimal fallback (hardcoded default config)
3. Update error handling
4. Add monitoring/alerting for config load failures

**Files to Modify:**
```
src/config/index.ts          # Remove static imports
src/config/nouns/index.ts    # Mark as deprecated
src/config/clanker/index.ts  # Mark as deprecated
src/config/example/index.ts  # Mark as deprecated
```

**Implementation:**

```typescript
// src/config/index.ts

import { SystemConfig } from './systemConfig';

// Minimal emergency fallback (only used if DB completely unavailable)
const EMERGENCY_FALLBACK_CONFIG: SystemConfig = {
  brand: {
    name: "nounspace",
    displayName: "Nounspace",
    tagline: "A customizable Farcaster client",
    description: "Nounspace - Customizable Farcaster client",
    miniAppTags: [],
  },
  assets: {
    logos: {
      main: "/images/logo.png",
      icon: "/images/icon.png",
      favicon: "/images/favicon.ico",
      appleTouch: "/images/apple-touch-icon.png",
      og: "/images/og.png",
      splash: "/images/splash.png",
    },
  },
  theme: {
    default: {
      id: "default",
      name: "Default",
      properties: {
        font: "Inter",
        fontColor: "#000000",
        headingsFont: "Inter",
        headingsFontColor: "#000000",
        background: "#ffffff",
        backgroundHTML: "",
        musicURL: "",
        fidgetBackground: "#ffffff",
        fidgetBorderWidth: "1px",
        fidgetBorderColor: "#C0C0C0",
        fidgetShadow: "none",
        fidgetBorderRadius: "12px",
        gridSpacing: "16",
      },
    },
    // ... minimal required themes
  },
  community: {
    type: "nounspace",
    urls: {
      website: "https://nounspace.com",
      discord: "",
      twitter: "",
      github: "",
      forum: "",
    },
    social: {
      farcaster: "",
      discord: "",
      twitter: "",
    },
    governance: {
      proposals: "",
      delegates: "",
      treasury: "",
    },
    tokens: {},
    contracts: {},
  },
  fidgets: {
    enabled: [],
    disabled: [],
  },
  homePage: {
    defaultTab: "Home",
    tabOrder: ["Home"],
    tabs: {
      Home: {
        name: "Home",
        displayName: "Home",
        layoutID: "default",
        layoutDetails: {
          layoutConfig: { layout: [] },
          layoutFidget: "grid",
        },
        theme: {
          id: "default",
          name: "Default",
          properties: {
            font: "Inter",
            fontColor: "#000000",
            headingsFont: "Inter",
            headingsFontColor: "#000000",
            background: "#ffffff",
            backgroundHTML: "",
            musicURL: "",
            fidgetBackground: "#ffffff",
            fidgetBorderWidth: "1px",
            fidgetBorderColor: "#C0C0C0",
            fidgetShadow: "none",
            fidgetBorderRadius: "12px",
            gridSpacing: "16",
          },
        },
        fidgetInstanceDatums: {},
        fidgetTrayContents: [],
        isEditable: false,
        timestamp: new Date().toISOString(),
      },
    },
    layout: {
      defaultLayoutFidget: "grid",
      gridSpacing: 16,
      theme: {
        background: "#ffffff",
        fidgetBackground: "#ffffff",
        font: "Inter",
        fontColor: "#000000",
      },
    },
  },
  explorePage: {
    defaultTab: "Explore",
    tabOrder: ["Explore"],
    tabs: {
      Explore: {
        // ... minimal explore config
      },
    },
    layout: {
      defaultLayoutFidget: "grid",
      gridSpacing: 16,
      theme: {
        background: "#ffffff",
        fidgetBackground: "#ffffff",
        font: "Inter",
        fontColor: "#000000",
      },
    },
  },
};

export const loadSystemConfig = (): SystemConfig => {
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  // Try build-time config from DB
  const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
  if (buildTimeConfig) {
    try {
      const dbConfig = JSON.parse(buildTimeConfig) as SystemConfig;
      
      // Validate config structure
      if (dbConfig && dbConfig.brand && dbConfig.assets) {
        return dbConfig;
      } else {
        console.error('❌ Invalid config structure from DB, using emergency fallback');
        // TODO: Alert monitoring system (Sentry, etc.)
      }
    } catch (error) {
      console.error('❌ Failed to parse build-time config:', error);
      // TODO: Alert monitoring system
    }
  }
  
  // Emergency fallback only (should rarely be used)
  console.error('⚠️  Using emergency fallback config - DB config unavailable!');
  console.error('⚠️  This indicates a build configuration issue.');
  // TODO: Alert monitoring system
  
  return EMERGENCY_FALLBACK_CONFIG;
};

// Remove all static config exports
// export { nounsSystemConfig } from './nouns/index'; // ❌ Removed
// export { clankerSystemConfig } from './clanker/index'; // ❌ Removed
// export { exampleSystemConfig } from './example/index'; // ❌ Removed
```

**Testing:**
1. **Test with DB available:**
   ```bash
   npm run build
   # Should use DB config, no warnings
   ```

2. **Test without DB (simulate failure):**
   ```bash
   # Remove SUPABASE env vars
   npm run build
   # Should use emergency fallback
   # Should log warnings/errors
   ```

3. **Test app with emergency fallback:**
   ```bash
   npm run dev
   # App should still load (with minimal config)
   ```

**Validation:**
- ✅ App works with DB config
- ✅ App works with emergency fallback
- ✅ Errors are logged/monitored
- ✅ No references to old static configs in main code
- ✅ Build succeeds in both cases

**Rollback:** Re-add static config imports

**Estimated Time:** 2-3 hours

---

### Phase 10B: Archive Static Config Files (Week 4, Day 3)

**Goal:** Move static configs to archive, remove from active codebase

**Tasks:**
1. Create archive directory
2. Move static config files to archive
3. Update any remaining references
4. Add deprecation notices

**Files to Move:**
```
src/config/nouns/     → src/config/_archived/nouns/
src/config/clanker/   → src/config/_archived/clanker/
src/config/example/   → src/config/_archived/example/
```

**Implementation:**

```bash
# Create archive directory
mkdir -p src/config/_archived

# Move static configs
mv src/config/nouns src/config/_archived/
mv src/config/clanker src/config/_archived/
mv src/config/example src/config/_archived/

# Add README in archive
echo "# Archived Static Configs

These configs are kept for reference only.
All active configs are now stored in the database.

Last used: [Date]
Migrated to DB: [Date]
" > src/config/_archived/README.md
```

**Update Space Creators:**

```typescript
// src/config/index.ts

// Space creators now delegate to DB config or use minimal defaults
export const createInitialProfileSpaceConfigForFid = (fid: number, username?: string) => {
  const config = loadSystemConfig(); // Always uses DB config now
  
  // Use config values
  return {
    // ... space config using config.community, config.brand, etc.
    fidgetInstanceDatums: {
      "feed:profile": {
        config: {
          editable: false,
          settings: {
            feedType: FeedType.Filter,
            users: fid,
            filterType: FilterType.Fids,
          },
          data: {},
        },
        fidgetType: "feed",
        id: "feed:profile",
      },
    },
    // ... rest of space config
  };
};

// Similar updates for other space creators
```

**Testing:**
1. **Verify no broken imports:**
   ```bash
   npm run check-types
   # Should pass
   ```

2. **Search for remaining references:**
   ```bash
   grep -r "from './nouns\|from './clanker\|from './example" src/ --exclude-dir=_archived
   # Should find no results (or only in comments)
   ```

3. **Verify build works:**
   ```bash
   npm run build
   # Should succeed
   ```

**Validation:**
- ✅ No broken imports
- ✅ Build succeeds
- ✅ No references to old configs (except archived)
- ✅ Type checking passes
- ✅ Space creators work

**Rollback:** Restore files from archive

**Estimated Time:** 1-2 hours

---

### Phase 10C: Update Space Creators (Week 4, Day 4)

**Goal:** Ensure space creators use DB configs, not static

**Tasks:**
1. Review all space creator functions
2. Update to use `loadSystemConfig()` (which uses DB)
3. Remove any direct static config references
4. Test all space creation flows

**Files to Update:**
```
src/config/index.ts  # Space creator functions
```

**Implementation:**

```typescript
// src/config/index.ts

// All space creators now use loadSystemConfig() which gets from DB
export const createInitialProfileSpaceConfigForFid = (fid: number, username?: string) => {
  const config = loadSystemConfig(); // Uses DB config
  
  // Use config values
  return {
    // ... space config
    theme: config.theme.default, // Use theme from DB config
    // ... rest uses config values
  };
};

// Similar pattern for all creators
export const createInitialChannelSpaceConfig = (channelId: string) => {
  const config = loadSystemConfig();
  // ... use config values
};

export const createInitialTokenSpaceConfigForAddress = (...args: any[]) => {
  const config = loadSystemConfig();
  // ... use config values
};

export const createInitalProposalSpaceConfigForProposalId = (...args: any[]) => {
  const config = loadSystemConfig();
  // ... use config values
};

export const INITIAL_HOMEBASE_CONFIG = (() => {
  const config = loadSystemConfig();
  return {
    // ... use config.homePage values
  };
})();
```

**Testing:**
1. Create profile space → Verify uses DB config
2. Create channel space → Verify uses DB config
3. Create token space → Verify uses DB config
4. Create proposal space → Verify uses DB config
5. Create homebase → Verify uses DB config

**Validation:**
- ✅ All space creators work
- ✅ Spaces use DB config values
- ✅ No references to static configs
- ✅ Themes/styles match DB config

**Rollback:** Restore static space creators

**Estimated Time:** 3-4 hours

---

### Phase 10D: Final Cleanup & Documentation (Week 4, Day 5)

**Goal:** Complete cleanup and update all documentation

**Tasks:**
1. Remove deprecated code comments
2. Update all documentation
3. Update README
4. Create migration guide
5. Update contributing guide
6. Clean up archived files (optional)

**Files to Update:**
```
docs/CONFIGURATION.md              # Update for DB system
docs/COMMUNITY_CONFIG_SYSTEM.md    # Mark as legacy, add DB section
docs/GETTING_STARTED.md            # Update setup steps
README.md                          # Update config section
docs/CONTRIBUTING.MD               # Update for DB configs
```

**Files to Create:**
```
docs/MIGRATION_GUIDE.md            # Static → DB migration guide
docs/ADMIN_GUIDE.md                # Admin user guide
docs/LEGACY_STATIC_CONFIGS.md      # Reference for archived configs
```

**Cleanup Tasks:**
1. Remove unused imports
2. Remove commented code
3. Remove deprecated functions
4. Update `.gitignore` if needed
5. Clean up test files

**Documentation Updates:**

```markdown
# docs/CONFIGURATION.md (updated)

## Configuration System

Nounspace now uses a **database-backed configuration system**. Configurations are stored in Supabase and loaded at build time.

### For Developers

Configs are automatically loaded from the database during build. No manual configuration needed.

### For Admins

Use the admin interface at `/admin/config/[communityId]` to update configurations.

### Legacy Static Configs

Static configs have been archived to `src/config/_archived/`. They are kept for reference only and are no longer used.
```

**Testing:**
1. **Verify documentation:**
   - All examples work
   - All links valid
   - All instructions correct

2. **Verify code cleanliness:**
   ```bash
   npm run lint
   npm run check-types
   # Should pass with no errors
   ```

3. **Verify no dead code:**
   ```bash
   # Search for unused exports
   # Check for orphaned files
   ```

**Validation:**
- ✅ Documentation updated and accurate
- ✅ No dead code
- ✅ No lint errors
- ✅ All examples work
- ✅ Migration guide complete
- ✅ Admin guide complete

**Rollback:** Restore old documentation

**Estimated Time:** 2-3 hours

---

## Phase 10 Summary

**Total Time:** 8-12 hours over 1 week

**Sub-Phases:**
- **10A:** Remove static fallbacks (2-3h)
- **10B:** Archive static files (1-2h)
- **10C:** Update space creators (3-4h)
- **10D:** Cleanup & docs (2-3h)

**Final State:**
- ✅ DB is single source of truth
- ✅ No static config dependencies in active code
- ✅ Minimal emergency fallback only
- ✅ Static configs archived for reference
- ✅ Clean codebase
- ✅ Complete documentation
- ✅ Migration guide available

**Success Criteria:**
- ✅ App works entirely from DB configs
- ✅ No static config imports in active code
- ✅ Emergency fallback works if DB unavailable
- ✅ All documentation updated
- ✅ Codebase is clean

**Rollback Plan:**
- Can restore static configs from archive
- Can re-add static imports
- Can revert to Phase 9 state (DB + static fallback)

---

## Testing Strategy Per Phase

### Unit Tests
```typescript
// tests/config-loader.test.ts
describe('Config Loader', () => {
  it('should load from DB when available', () => {
    process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG = JSON.stringify(testConfig);
    const config = loadSystemConfig();
    expect(config.brand.name).toBe('Test');
  });
  
  it('should fallback to static when DB unavailable', () => {
    delete process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
    const config = loadSystemConfig();
    expect(config.brand.name).toBe('Nouns');
  });
});
```

### Integration Tests
```typescript
// tests/admin-api.test.ts
describe('Admin API', () => {
  it('should require admin authentication', async () => {
    const res = await fetch('/api/admin/config/nouns');
    expect(res.status).toBe(401);
  });
  
  it('should update config', async () => {
    const res = await fetch('/api/admin/config/nouns', {
      method: 'PUT',
      headers: {
        'x-admin-identity': 'test-admin',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config: testConfig }),
    });
    expect(res.status).toBe(200);
  });
});
```

### E2E Tests
```typescript
// tests/admin-ui.e2e.test.ts
describe('Admin UI', () => {
  it('should load and display config', async () => {
    await page.goto('/admin/config/nouns');
    await expect(page.locator('h1')).toContainText('Edit Config: nouns');
  });
  
  it('should save config changes', async () => {
    await page.fill('[name="brand.name"]', 'New Name');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success')).toBeVisible();
  });
});
```

---

## Rollback Plan Per Phase

Each phase can be rolled back independently:

1. **Phase 1 (DB Schema)** - Drop migrations
2. **Phase 2 (Config Loading)** - Remove env var reading
3. **Phase 3 (Admin API)** - Remove API routes
4. **Phase 4 (Admin UI)** - Remove admin pages
5. **Phase 5 (Asset Upload)** - Remove upload functionality
6. **Phase 6 (Asset Download)** - Remove download code
7. **Phase 7 (Optimization)** - Remove optimization
8. **Phase 8 (Rebuild Trigger)** - Remove trigger
9. **Phase 9 (Production)** - Revert to static configs

---

## Success Criteria Per Phase

### Phase 1: Database Schema
- ✅ Tables created successfully (without page/theme columns)
- ✅ Functions work correctly
- ✅ RLS policies enforce access
- ✅ Can seed initial data (without themes/pages)
- ✅ navPage spaceType added

### Phase 2: Config Loading
- ✅ Shared themes file created
- ✅ Build succeeds with/without DB
- ✅ App uses DB config when available
- ✅ Themes loaded from shared file
- ✅ Pages loaded from Spaces (via nav items)
- ✅ Config file generated (not env var)
- ✅ Config size reduced (~2.8 KB)
- ✅ App falls back to static when unavailable
- ✅ No breaking changes

### Phase 3: Admin API
- ✅ Can fetch config (without themes/pages)
- ✅ Can update config
- ✅ Can fetch/update nav page Spaces
- ✅ Permission checks work
- ✅ History tracked

### Phase 4: Admin UI
- ✅ Can view config (without themes/pages)
- ✅ Can edit config
- ✅ Can edit nav page Spaces
- ✅ Can save changes
- ✅ Changes persist

### Phase 5: Asset Upload
- ✅ Can upload assets
- ✅ Assets stored correctly
- ✅ Config updated with paths

### Phase 6: Asset Download
- ✅ Assets download at build time
- ✅ Assets in correct location
- ✅ Config paths updated
- ✅ Assets load correctly

### Phase 7: Asset Optimization
- ✅ Images optimized
- ✅ File sizes reduced
- ✅ Quality maintained
- ✅ Performance improved

### Phase 8: Rebuild Trigger
- ✅ Rebuild triggers correctly
- ✅ Build completes successfully
- ✅ Changes deployed

### Phase 9: Production
- ✅ All communities work
- ✅ Performance acceptable
- ✅ No regressions

### Phase 10: Phase Out Static Configs
- ✅ No static config dependencies
- ✅ DB is single source of truth
- ✅ Emergency fallback works
- ✅ Documentation updated
- ✅ Codebase cleaned

---

## Timeline Summary

| Phase | Duration | Dependencies | Risk Level |
|-------|----------|--------------|------------|
| Phase 0 | 1-2h | None | Low |
| Phase 1 | 4-6h | Phase 0 | Low |
| Phase 2 | 2-3h | Phase 1 | Medium |
| Phase 3 | 3-4h | Phase 1 | Low |
| Phase 4 | 4-6h | Phase 3 | Medium |
| Phase 5 | 4-6h | Phase 1 | Medium |
| Phase 6 | 2-3h | Phase 5 | Medium |
| Phase 7 | 2-3h | Phase 6 | Low |
| Phase 8 | 3-4h | Phase 4 | Medium |
| Phase 9 | 4-8h | All phases | High |
| **Phase 10** | **8-12h** | **Phase 9** | **Medium** |

**Total Estimated Time:** 4-5 weeks

---

## Quick Start: Minimal Viable Implementation

If you want to test the concept quickly:

1. **Phase 1** - Create DB schema (2h)
2. **Phase 2** - Basic config loading (2h)
3. **Manual testing** - Update DB directly, rebuild, verify

This gives you a working proof-of-concept in ~4 hours!

---

## Next Steps

1. **Start with Phase 0** - Set up test environment
2. **Complete Phase 1** - Database foundation
3. **Test Phase 2** - Verify config loading works
4. **Iterate** - Add phases incrementally

Each phase is independently testable and can be rolled back if issues arise.

