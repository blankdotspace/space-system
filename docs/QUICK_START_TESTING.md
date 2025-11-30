# Quick Start Testing Guide

## Overview

This guide walks you through testing the database-backed configuration system.

## Prerequisites

- ✅ Supabase project set up
- ✅ Environment variables configured
- ✅ Node.js and npm installed

## Step 1: Reset Database (Applies Migrations + Seed Data)

**Updated:** Database is now seeded via SQL in `supabase/seed.sql`, which runs automatically on reset.

```bash
# Reset database from scratch (applies all migrations + seed data)
supabase db reset
```

This will:
1. ✅ Apply migration: `create_community_configs.sql` (creates table without themes/pages)
2. ✅ Apply migration: `add_navpage_space_type.sql` (adds navPage spaceType)
3. ✅ Run `seed.sql` (seeds configs for nouns, example, clanker)

**Verify:**
```sql
-- Check table exists with correct columns (should NOT have theme_config, home_page_config, explore_page_config)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'community_configs';

-- Should see: brand_config, assets_config, community_config, fidgets_config, navigation_config, ui_config
-- Should NOT see: theme_config, home_page_config, explore_page_config

-- Test function (should return config without themes/pages)
SELECT get_active_community_config('nouns');

-- Verify seed data loaded
SELECT community_id FROM community_configs;
-- Should see: nouns, example, clanker

-- Verify navPage spaceType exists
SELECT DISTINCT "spaceType" FROM "spaceRegistrations";
-- Should include: 'navPage' (if constraint updated)
```

**Expected output:**
- ✅ Table created with correct columns (no themes/pages)
- ✅ Function returns config (without themes/pages)
- ✅ Seed data inserted for all 3 communities
- ✅ navPage spaceType available

## Step 2: Optional - Manual Seed Script

**Note:** The TypeScript seed script (`scripts/seed-community-configs.ts`) is now **OPTIONAL**. 
Use it only if you need to update configs without resetting the database.

If you need to use it:

```bash
# Make sure you have these env vars set:
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run seed script (optional - seed.sql already did this)
npx tsx scripts/seed-community-configs.ts
```

**Note:** The TypeScript script still includes themes/pages for backward compatibility.
The new architecture stores themes in shared file and pages as Spaces.

## Step 3: Create Shared Themes (If Not Done)

Before testing build-time loading, ensure shared themes file exists:

```typescript
// src/config/shared/themes.ts
import { nounsTheme } from '../nouns/nouns.theme';
export const themes = nounsTheme;
```

Update community configs to import from shared:
- `src/config/nouns/nouns.theme.ts` → `export { themes as nounsTheme } from '../shared/themes';`
- `src/config/clanker/clanker.theme.ts` → `export { themes as clankerTheme } from '../shared/themes';`
- `src/config/example/example.theme.ts` → `export { themes as exampleTheme } from '../shared/themes';`

## Step 4: Test Build-Time Loading

### Test with Database Available

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export NEXT_PUBLIC_COMMUNITY="nouns"

# Run build
npm run build
```

**Expected output:**
```
✅ Loaded config from database
```

**Verify in build output:**
- Should see "✅ Loaded config from database" message
- Build should complete successfully
- No errors about missing config
- Config is stored in `NEXT_PUBLIC_BUILD_TIME_CONFIG` env var (~2.8 KB)

### Test without Database (Fallback)

```bash
# Remove Supabase env vars
unset NEXT_PUBLIC_SUPABASE_URL
unset SUPABASE_SERVICE_ROLE_KEY

# Run build (should fall back to static configs)
npm run build
```

**Expected output:**
```
ℹ️  Using static configs (no DB credentials)
```

**Verify:**
- Should see "ℹ️  Using static configs" message
- Build should complete successfully
- App should work with static configs

## Step 4: Test Runtime

### Start Dev Server

```bash
# With DB config
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export NEXT_PUBLIC_COMMUNITY="nouns"
npm run dev
```

**Check browser console:**
- Should see "✅ Using config from database" message
- App should load correctly
- Brand name should match database config

### Test Different Communities

```bash
# Test with 'example' community
export NEXT_PUBLIC_COMMUNITY="example"
npm run build
npm run dev

# Test with 'clanker' community
export NEXT_PUBLIC_COMMUNITY="clanker"
npm run build
npm run dev
```

## Step 5: Manual Database Update Test

Update config directly in database:

```sql
-- Update brand display name
UPDATE community_configs
SET brand_config = jsonb_set(
  brand_config,
  '{displayName}',
  '"Nouns Updated"'
)
WHERE community_id = 'nouns';
```

Then rebuild and verify:

```bash
npm run build
npm run dev
```

**Verify:**
- Brand name should be "Nouns Updated" in the app
- Changes should be reflected after rebuild

## Troubleshooting

### Migration Fails

**Error:** `relation "community_configs" already exists`

**Solution:**
```sql
DROP TABLE IF EXISTS community_configs CASCADE;
DROP FUNCTION IF EXISTS get_active_community_config;
```
Then re-run migration.

### Seed Script Fails

**Error:** `Missing required environment variables`

**Solution:**
```bash
# Check env vars are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Set them if missing
export NEXT_PUBLIC_SUPABASE_URL="your-url"
export SUPABASE_SERVICE_ROLE_KEY="your-key"
```

**Error:** `Error seeding nouns: ...`

**Solution:**
- Check Supabase connection
- Verify service role key has permissions
- Check table exists: `SELECT * FROM community_configs LIMIT 1;`

### Build Fails

**Error:** `Cannot find module '@supabase/supabase-js'`

**Solution:**
```bash
npm install @supabase/supabase-js
```

**Error:** `Function get_active_community_config does not exist`

**Solution:**
- Re-run migration: `supabase migration up`
- Verify function exists: `SELECT * FROM pg_proc WHERE proname = 'get_active_community_config';`

### Runtime Issues

**App shows static config instead of DB config**

**Check:**
1. Build-time env vars are set
2. Database has config for community
3. Check build logs for "✅ Loaded config from database"
4. Check browser console for config source

**Config not updating after DB change**

**Solution:**
- Rebuild required: `npm run build`
- Config is loaded at build time, not runtime
- Changes require rebuild to take effect

## Success Criteria

✅ **Migration succeeds** - Table and function created  
✅ **Seed succeeds** - All configs inserted  
✅ **Build with DB** - Config loaded from database  
✅ **Build without DB** - Falls back to static configs  
✅ **Runtime works** - App loads correctly  
✅ **DB updates work** - Changes reflected after rebuild  

## Next Steps

Once testing is successful:

1. ✅ Phase 1 complete - Database schema working
2. ✅ Phase 2 complete - Build-time loading working
3. ➡️ Phase 3 - Create admin API endpoints
4. ➡️ Phase 4 - Create admin UI

## Quick Commands Reference

```bash
# Reset database (applies migrations + seed data)
supabase db reset

# Optional: Seed configs manually (seed.sql already does this)
npx tsx scripts/seed-community-configs.ts

# Build with DB
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run build

# Build without DB (fallback)
npm run build

# Dev server
npm run dev

# Test function
psql -c "SELECT get_active_community_config('nouns');"

# Verify config is loaded (check env var in build output)
# Config is stored in NEXT_PUBLIC_BUILD_TIME_CONFIG env var (~2.8 KB)
```

