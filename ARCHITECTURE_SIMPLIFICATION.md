# Architecture Simplification Proposal

## Current Problems

1. **Two Supabase Queries for Same Data**
   - `getCommunityConfigForDomain()` queries `community_configs` table → gets raw row
   - `RuntimeConfigLoader.load()` queries `get_active_community_config()` RPC → gets transformed config
   - Both get the same data, just different formats

2. **Wasted Cache**
   - Cache stores full config row but we only use it to get `communityId`
   - Then we throw away the config and query again
   - Cache doesn't help the second query

3. **Unnecessary Transformation Layer**
   - RPC function just reshapes data (brand_config → brand, etc.)
   - This transformation could happen in application code

4. **Complex Function Chain**
   - Multiple functions doing similar things
   - Hard to follow the flow

---

## Simplified Architecture

### **Key Changes**

1. **Single Query**: Query Supabase once, transform in application code
2. **Cache SystemConfig**: Cache the final transformed config, not raw rows
3. **Unified Function**: One function that does domain → SystemConfig resolution
4. **Clear Separation**: Domain resolution vs Config loading

---

## Proposed Structure

```
loadSystemConfig(domain?)
  ↓
resolveSystemConfigFromDomain(domain)
  ├─ Check cache (SystemConfig)
  ├─ If miss: Query Supabase once
  ├─ Transform row → SystemConfig
  ├─ Add themes
  └─ Cache and return SystemConfig
```

---

## Implementation

### **1. Transform Row to SystemConfig (in registry.ts)**

```typescript
function transformRowToSystemConfig(row: CommunityConfigRow): SystemConfig {
  return {
    brand: row.brand_config,
    assets: row.assets_config,
    community: row.community_config,
    fidgets: row.fidgets_config,
    navigation: row.navigation_config ?? null,
    ui: row.ui_config ?? null,
    theme: themes, // Add themes
  };
}
```

### **2. Unified Resolution Function**

```typescript
export async function resolveSystemConfigFromDomain(
  domain: string
): Promise<{ communityId: string; config: SystemConfig } | null> {
  const candidates = getCommunityIdCandidates(domain);
  
  // Check cache (now caches SystemConfig, not raw row)
  for (const candidate of candidates) {
    const cached = readSystemConfigCache(candidate);
    if (cached !== undefined) {
      if (cached) {
        return { communityId: candidate, config: cached };
      }
    }
  }
  
  // Single Supabase query
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('community_configs')
    .select('*')
    .in('community_id', candidates)
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(1);
  
  if (error || !data || data.length === 0) {
    // Cache miss
    candidates.forEach(c => writeSystemConfigCache(c, null));
    return null;
  }
  
  // Find matching candidate
  for (const candidate of candidates) {
    const matched = data.find(row => row.community_id === candidate);
    if (matched) {
      // Transform to SystemConfig
      const systemConfig = transformRowToSystemConfig(matched);
      
      // Cache SystemConfig (not raw row)
      writeSystemConfigCache(candidate, systemConfig);
      
      return { communityId: candidate, config: systemConfig };
    }
  }
  
  return null;
}
```

### **3. Simplified loadSystemConfig**

```typescript
export async function loadSystemConfig(context?: ConfigLoadContext): Promise<SystemConfig> {
  // Priority 1: Explicit communityId
  if (context?.communityId) {
    return await loadSystemConfigById(context.communityId);
  }
  
  // Priority 2: Domain resolution
  const domain = context?.domain ?? await getDomainFromHeaders();
  if (domain) {
    const resolution = await resolveSystemConfigFromDomain(domain);
    if (resolution) {
      return resolution.config;
    }
  }
  
  // Priority 3: Fallback
  return await loadSystemConfigById(DEFAULT_COMMUNITY_ID);
}

async function loadSystemConfigById(communityId: string): Promise<SystemConfig> {
  // Check cache first
  const cached = readSystemConfigCache(communityId);
  if (cached) {
    return cached;
  }
  
  // Query and transform
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('community_configs')
    .select('*')
    .eq('community_id', communityId)
    .eq('is_published', true)
    .single();
  
  if (error || !data) {
    throw new Error(`Failed to load config for ${communityId}`);
  }
  
  const systemConfig = transformRowToSystemConfig(data);
  writeSystemConfigCache(communityId, systemConfig);
  return systemConfig;
}
```

---

## Benefits

### **1. Single Query**
- ✅ Only one Supabase query per request
- ✅ 50% reduction in database load
- ✅ Faster response times

### **2. Better Caching**
- ✅ Cache stores final SystemConfig (what we actually use)
- ✅ Cache helps both domain resolution AND config loading
- ✅ No wasted queries

### **3. Simpler Code**
- ✅ Fewer functions
- ✅ Clearer flow
- ✅ Easier to understand

### **4. Better Performance**
- ✅ Cache hits return SystemConfig directly (no transformation needed)
- ✅ Single query instead of two
- ✅ Less database load

---

## Migration Path

1. **Add transformation function** (no breaking changes)
2. **Update cache to store SystemConfig** (change cache type)
3. **Update getCommunityConfigForDomain** to return SystemConfig
4. **Remove RuntimeConfigLoader** (or simplify it to just load by ID)
5. **Update loadSystemConfig** to use new flow

---

## Alternative: Keep RPC, But Cache Better

If you want to keep the RPC function (maybe for other reasons), you could:

1. **Cache SystemConfig** instead of raw rows
2. **Use RPC for direct communityId lookups** (when we already know the ID)
3. **Use table query for domain resolution** (when we need to try multiple candidates)

This keeps the RPC but still eliminates the double query for domain resolution.

