# Testing the Database-Backed Configuration System

This guide walks you through testing the database-backed configuration system to ensure everything is working correctly.

## Prerequisites

1. **Supabase Setup**
   - Local Supabase running (`supabase start`) OR
   - Remote Supabase project with access

2. **Environment Variables**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_COMMUNITY=nouns  # or 'example', 'clanker'
   ```

3. **Database Seeded**
   - Run migrations: `supabase db reset` (includes seed.sql)
   - Or manually seed: `tsx scripts/seed-community-configs.ts`
   - Seed navigation spaces: `tsx scripts/seed-navpage-spaces.ts`

## Testing Checklist

### 1. Verify Database Setup

**Check that configs exist in database:**

```bash
# Using Supabase CLI
supabase db reset

# Or query directly
psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT community_id, is_published FROM community_configs;"
```

**Expected:** Rows for 'nouns', 'example', 'clanker' with `is_published = true`

**Check navigation spaces exist:**

```bash
psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT \"spaceName\", \"spaceType\" FROM \"spaceRegistrations\" WHERE \"spaceType\" = 'navPage';"
```

**Expected:** Rows for 'nouns-home', 'nouns-explore', 'clanker-home', etc.

### 2. Test Build-Time Loading

**Important:** `next.config.mjs` runs both during `npm run build` AND `npm run dev`. The config is loaded when the Next.js process starts.

**Build the app and check logs:**

```bash
npm run build
```

**Or start dev server and check logs:**

```bash
npm run dev
```

**Look for these log messages in the terminal where you run the command:**

✅ **Success:**
```
✅ Loaded config from database
✅ Using config from database
```

⚠️ **Fallback (if DB unavailable):**
```
ℹ️  Using static configs (no DB credentials)
ℹ️  Using static configs
```

**Note:** The config is loaded when the dev server starts. If you update the database config, you need to **restart the dev server** (`Ctrl+C` then `npm run dev` again) to pick up changes.

### 3. Test Runtime Access

**Start the dev server (if not already running):**

```bash
npm run dev
```

**Check the terminal where you started dev server:**
- Should see: `✅ Loaded config from database` (if DB is available)
- Or: `ℹ️  Using static configs` (if DB unavailable)

**Check browser console for config loading:**

Open browser DevTools → Console, look for:
- No errors related to config loading
- Navigation items render correctly
- Brand name displays correctly

**Verify config in components:**

Add a temporary log in a component:

```typescript
// In any component
import { loadSystemConfig } from '@/config';

const config = loadSystemConfig();
console.log('Config loaded:', {
  brand: config.brand.displayName,
  hasNavigation: !!config.navigation,
  navItems: config.navigation?.items?.length || 0,
});
```

**Expected:**
- `brand.displayName` matches your community (e.g., "Nouns")
- `navigation.items` contains navigation items
- Config structure matches `SystemConfig` interface

### 4. Test Navigation Pages

**Test home page:**

1. Navigate to `/home` (should redirect to default tab)
2. Navigate to `/home/{tabName}` (e.g., `/home/Nouns`)
3. Verify:
   - Page loads without errors
   - Tabs display correctly
   - Tab bar shows correct tabs
   - Content renders for each tab

**Test explore page (if exists):**

1. Navigate to `/explore` (should redirect to default tab)
2. Navigate to `/explore/{tabName}`
3. Verify same as above

**Check browser Network tab:**

- No failed requests to Supabase Storage (for navPage spaces)
- Pages load from Storage correctly

### 5. Test Fallback Behavior

**Test without database credentials:**

```bash
# Temporarily remove/comment out Supabase env vars
unset NEXT_PUBLIC_SUPABASE_URL
unset SUPABASE_SERVICE_ROLE_KEY

npm run build
```

**Expected:**
- Build succeeds
- Logs show: `ℹ️  Using static configs (no DB credentials)`
- App still works (uses static TypeScript configs)

**Test with invalid community:**

```bash
NEXT_PUBLIC_COMMUNITY=invalid npm run build
```

**Expected:**
- Build succeeds
- Falls back to 'nouns' config
- Warning logged about invalid community

### 6. Test Different Communities

**Test Nouns:**

```bash
NEXT_PUBLIC_COMMUNITY=nouns npm run build
npm run dev
```

**Verify:**
- Brand name: "Nouns"
- Navigation items match Nouns config
- Home page tabs match Nouns config

**Test Clanker:**

```bash
NEXT_PUBLIC_COMMUNITY=clanker npm run build
npm run dev
```

**Verify:**
- Brand name: "Clanker"
- Navigation items match Clanker config
- Home page tabs match Clanker config

### 7. Test Shared Themes

**Verify themes are loaded:**

```typescript
// In any component
import { themes } from '@/config/shared/themes';

console.log('Available themes:', Object.keys(themes));
```

**Expected:**
- Themes object exists
- Contains theme definitions (default, nounish, etc.)
- Themes are shared across all communities

### 8. Test Database Updates

**Update a config in database:**

```sql
UPDATE community_configs
SET brand_config = jsonb_set(
  brand_config,
  '{displayName}',
  '"Nouns Updated"'
)
WHERE community_id = 'nouns';
```

**Rebuild and verify:**

```bash
npm run build
npm run dev
```

**Expected:**
- New build picks up updated config
- Brand name shows "Nouns Updated"
- No need to change code

### 9. Test Navigation Space References

**Verify navigation items reference spaces:**

```sql
SELECT 
  n.id,
  n.label,
  n."spaceId",
  sr."spaceName",
  sr."spaceType"
FROM jsonb_array_elements(
  (SELECT "navigation_config"->'items' FROM community_configs WHERE community_id = 'nouns')
) AS n
LEFT JOIN "spaceRegistrations" sr ON sr."spaceId"::text = n->>'spaceId';
```

**Expected:**
- Navigation items with `spaceId` reference valid `navPage` spaces
- Space names match (e.g., 'nouns-home', 'nouns-explore')

**Verify space configs in Storage:**

Check that space configs exist in Supabase Storage:
- `spaces/{spaceId}/tabOrder`
- `spaces/{spaceId}/tabs/{tabName}`

### 10. Integration Test

**Full flow test:**

1. **Reset database:**
   ```bash
   supabase db reset
   tsx scripts/seed-navpage-spaces.ts
   ```

2. **Build:**
   ```bash
   npm run build
   ```

3. **Start:**
   ```bash
   npm run dev
   ```

4. **Navigate through app:**
   - Visit `/` (should redirect to `/home/{defaultTab}`)
   - Visit `/home` (should redirect to default tab)
   - Visit `/home/Nouns` (or other tabs)
   - Visit `/explore` (if exists)
   - Click navigation items
   - Verify brand header shows correct logo/name

5. **Verify in browser:**
   - No console errors
   - All pages load correctly
   - Navigation works
   - Branding is correct
   - Themes apply correctly

## Common Issues

### Issue: "Using static configs" when DB is available

**Check:**
- `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Database is running and accessible
- `community_configs` table has data with `is_published = true`

### Issue: Navigation pages return 404

**Check:**
- `navPage` spaces exist in `spaceRegistrations`
- Space configs uploaded to Storage via `seed-navpage-spaces.ts`
- Navigation items have correct `spaceId` references

### Issue: Config not updating after DB change

**Solution:**
- **For dev mode:** Restart the dev server (`Ctrl+C` then `npm run dev` again)
- **For production:** Rebuild the app (`npm run build`)
- Config is loaded when the Next.js process starts (both dev and build)
- Changes require restarting the process

### Issue: Build fails with "supabaseKey is required"

**Check:**
- `SUPABASE_SERVICE_ROLE_KEY` is set in environment
- Not `SUPABASE_SERVICE_KEY` (wrong name)
- Key has service role permissions

## Quick Test Script

Create a test script to verify everything:

```typescript
// scripts/test-config.ts
import { createClient } from '@supabase/supabase-js';
import { loadSystemConfig } from '../src/config';

async function testConfig() {
  // Test 1: Database connection
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test 2: Config exists in DB
  const { data: config, error } = await supabase
    .rpc('get_active_community_config', { p_community_id: 'nouns' })
    .single();
  
  if (error || !config) {
    console.log('❌ Config not found in database:', error?.message);
    return;
  }
  
  console.log('✅ Config found in database');
  console.log('   Brand:', config.brand?.displayName);
  console.log('   Navigation items:', config.navigation?.items?.length || 0);
  
  // Test 3: Runtime config loading
  const runtimeConfig = loadSystemConfig();
  console.log('✅ Runtime config loaded');
  console.log('   Brand:', runtimeConfig.brand.displayName);
  console.log('   Has navigation:', !!runtimeConfig.navigation);
  
  // Test 4: Navigation spaces
  const { data: navSpaces } = await supabase
    .from('spaceRegistrations')
    .select('spaceName, spaceType')
    .eq('spaceType', 'navPage');
  
  console.log('✅ Navigation spaces:', navSpaces?.length || 0);
  
  console.log('\n✅ All tests passed!');
}

testConfig();
```

Run with:
```bash
tsx scripts/test-config.ts
```

## Summary

The testing process verifies:

1. ✅ Database has configs
2. ✅ Build loads config from DB
3. ✅ Runtime accesses config correctly
4. ✅ Navigation pages load as Spaces
5. ✅ Fallback works when DB unavailable
6. ✅ Different communities work
7. ✅ Shared themes work
8. ✅ DB updates require rebuild
9. ✅ Navigation spaces are linked correctly
10. ✅ Full integration works

If all tests pass, the database-backed configuration system is working correctly!

