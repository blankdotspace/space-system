# Space Reference Approach for Page Configs

## The Idea

Instead of storing `homePage` and `explorePage` configs (71% of total size) directly in `community_configs`, store them as Spaces and reference them by ID.

## Current Problem

- `homePage`: 19.2 KB (66.5% of config)
- `explorePage`: 1.4 KB (4.8% of config)
- **Combined: 20.6 KB (71.3% of total)**

## Proposed Solution

### Option A: Store as Spaces in Supabase Storage

**How it works:**
1. Create Spaces for `homePage` and `explorePage` in Supabase Storage
2. Store Space IDs in `community_configs`:
   ```json
   {
     "homePageSpaceId": "uuid-here",
     "explorePageSpaceId": "uuid-here"
   }
   ```
3. Fetch Spaces at build time along with config

**Pros:**
- ✅ Uses existing Space infrastructure
- ✅ Dramatically reduces config size (~71% reduction)
- ✅ Spaces can be edited independently
- ✅ Reuses Space storage/retrieval logic

**Cons:**
- ⚠️ Requires fetching Spaces at build time (additional DB calls)
- ⚠️ Spaces stored in Storage, not database (need to check how they're accessed)
- ⚠️ More complex build-time logic

### Option B: Store in Separate Database Table

**How it works:**
1. Create `community_page_configs` table:
   ```sql
   CREATE TABLE community_page_configs (
     id UUID PRIMARY KEY,
     community_id VARCHAR(50),
     page_type VARCHAR(20), -- 'homePage' or 'explorePage'
     config JSONB NOT NULL,
     version INTEGER DEFAULT 1,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```
2. Store page configs there
3. Reference by ID in `community_configs`:
   ```json
   {
     "homePageConfigId": "uuid-here",
     "explorePageConfigId": "uuid-here"
   }
   ```
4. Fetch at build time with a JOIN or separate query

**Pros:**
- ✅ Database-backed (easier to query/manage)
- ✅ Version history possible
- ✅ Dramatically reduces config size
- ✅ Can use JOINs for efficient fetching

**Cons:**
- ⚠️ Requires new table
- ⚠️ Additional build-time query

### Option C: Store in Same Table, Separate Columns (Simplest)

**How it works:**
1. Keep `home_page_config` and `explore_page_config` columns
2. But fetch them separately at build time
3. Only include IDs in the main config JSONB

**Pros:**
- ✅ Simplest implementation
- ✅ No schema changes needed
- ✅ Still reduces size if we only store IDs

**Cons:**
- ⚠️ Still stores full configs in database (just separately)
- ⚠️ Doesn't solve the E2BIG issue if we're putting them in env vars

## Size Reduction Analysis

### Current:
```json
{
  "homePage": { /* 19.2 KB */ },
  "explorePage": { /* 1.4 KB */ }
}
```
**Total: 20.6 KB**

### With References:
```json
{
  "homePageSpaceId": "550e8400-e29b-41d4-a716-446655440000",  // ~36 bytes
  "explorePageSpaceId": "550e8400-e29b-41d4-a716-446655440001"  // ~36 bytes
}
```
**Total: ~72 bytes**

**Reduction: 99.6%** (from 20.6 KB to 72 bytes)

### New Total Config Size:
- Current: ~29 KB
- With references: ~8.4 KB (29 KB - 20.6 KB + 72 bytes)
- **Reduction: 71%**

## Implementation Considerations

### Build-Time Fetching

```javascript
// next.config.mjs

async function generateConfigFile() {
  // Fetch main config
  const { data: config } = await supabase
    .rpc('get_active_community_config', { p_community_id: community })
    .single();
  
  // Fetch page configs separately
  const { data: homePage } = await supabase
    .from('community_page_configs')
    .select('config')
    .eq('community_id', community)
    .eq('page_type', 'homePage')
    .single();
  
  const { data: explorePage } = await supabase
    .from('community_page_configs')
    .select('config')
    .eq('community_id', community)
    .eq('page_type', 'explorePage')
    .single();
  
  // Combine
  const fullConfig = {
    ...config,
    homePage: homePage?.config,
    explorePage: explorePage?.config,
  };
  
  // Generate file (now much smaller!)
  await writeFile('src/config/db-config.ts', ...);
}
```

### Database Function Update

```sql
-- Updated function that excludes page configs
CREATE OR REPLACE FUNCTION get_active_community_config(...)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'brand', brand_config,
    'assets', assets_config,
    'theme', theme_config,
    'community', community_config,
    'fidgets', fidgets_config,
    'homePageSpaceId', home_page_space_id,  -- Just the ID
    'explorePageSpaceId', explore_page_space_id,  -- Just the ID
    'navigation', navigation_config,
    'ui', ui_config
  )
  FROM community_configs
  WHERE ...
$$;
```

## Recommendation

**Option B (Separate Table)** because:
1. ✅ Database-backed (easier to manage)
2. ✅ Can add versioning/history
3. ✅ Efficient queries
4. ✅ Dramatically reduces config size
5. ✅ Clear separation of concerns

## Migration Path

1. Create `community_page_configs` table
2. Migrate existing `homePage` and `explorePage` configs to new table
3. Update `community_configs` to store IDs instead
4. Update build-time fetching to include page configs
5. Update `get_active_community_config` function

## Benefits

- ✅ **Solves E2BIG** - Config now ~8.4 KB (well under limits)
- ✅ **Better organization** - Page configs separate from community config
- ✅ **Easier editing** - Admins can edit pages independently
- ✅ **Versioning** - Can version page configs separately
- ✅ **Reusability** - Page configs could be shared/referenced

