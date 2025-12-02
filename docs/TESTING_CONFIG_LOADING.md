# Testing Config Loading Locally

This guide explains how to test the runtime configuration loading system locally.

## Quick Start

The easiest way to test a specific community locally is using the environment variable override:

```bash
NEXT_PUBLIC_TEST_COMMUNITY=example npm run dev
```

Then visit `http://localhost:3000` - it will load the `example` community config.

## Testing Methods

### Method 1: Environment Variable Override (Easiest)

**Best for:** Quick testing of a specific community

```bash
# Test 'example' community
NEXT_PUBLIC_TEST_COMMUNITY=example npm run dev

# Test 'clanker' community
NEXT_PUBLIC_TEST_COMMUNITY=clanker npm run dev

# Test 'nouns' community (or just omit the var)
NEXT_PUBLIC_TEST_COMMUNITY=nouns npm run dev
```

**How it works:**
- In development mode, `NEXT_PUBLIC_TEST_COMMUNITY` takes priority over domain resolution
- Visit `http://localhost:3000` - the system will load the specified community config
- Check the console logs to see which community is being loaded

**Priority order:**
1. `NEXT_PUBLIC_TEST_COMMUNITY` (development only)
2. Domain resolution

**Note:** If neither is set, the system will error when attempting to load config. Always set `NEXT_PUBLIC_TEST_COMMUNITY` in development or use localhost subdomains.

### Method 2: Localhost Subdomains (Most Realistic)

**Best for:** Testing domain-based resolution (closest to production)

**Setup:**
1. Edit your `/etc/hosts` file (macOS/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```bash
# Add these lines:
127.0.0.1 example.localhost
127.0.0.1 clanker.localhost
127.0.0.1 nouns.localhost
```

2. Start the dev server:
```bash
npm run dev
```

3. Visit the subdomain URLs:
- `http://example.localhost:3000` → loads `example` community
- `http://clanker.localhost:3000` → loads `clanker` community
- `http://nouns.localhost:3000` → loads `nouns` community
- `http://localhost:3000` → requires `NEXT_PUBLIC_TEST_COMMUNITY` to be set, otherwise will error

**How it works:**
- Middleware detects the domain from the `Host` header
- Extracts the subdomain (e.g., `example.localhost` → `example`)
- Sets `x-community-id` header for Server Components
- Config loader reads the header and loads the appropriate config

**Note:** Make sure `NEXT_PUBLIC_TEST_COMMUNITY` is NOT set when testing subdomains, as it takes priority.

### Method 3: Explicit Context (Programmatic Testing)

**Best for:** Unit tests or programmatic access

```typescript
import { loadSystemConfig } from '@/config';

// Test with explicit community ID
const config = await loadSystemConfig({
  communityId: 'example',
  domain: 'example.nounspace.com',
  isServer: true,
});

console.log(config.brand.displayName); // Should show example community name
```

## Verifying Config Loading

### Check Console Logs

In development mode, the system logs which community is being loaded:

```
✅ Loading config for community: example (domain: example.localhost)
```

### Check the UI

1. **Brand name** - Should match the community's `brand.displayName`
2. **Logo** - Should show the community's logo from `assets.logos.main`
3. **Navigation** - Should show the community's navigation items
4. **Theme** - Should use the community's theme settings

### Check Network Tab

1. Open browser DevTools → Network tab
2. Look for requests to Supabase
3. Should see a call to `get_active_community_config` RPC function
4. Check the request payload - should include `p_community_id: 'example'` (or your test community)

### Programmatic Verification

Create a test script:

```typescript
// scripts/test-config-loading.ts
import { loadSystemConfig } from '../src/config';

async function testConfigLoading() {
  console.log('Testing config loading...\n');
  
  // Test 1: Explicit community ID
  console.log('Test 1: Explicit community ID');
  const config1 = await loadSystemConfig({ communityId: 'example' });
  console.log(`✅ Loaded: ${config1.brand.displayName}`);
  console.log(`   Community ID: ${config1.communityId || 'not set'}\n`);
  
  // Test 2: Domain-based resolution
  console.log('Test 2: Domain-based resolution');
  const config2 = await loadSystemConfig({ 
    domain: 'example.localhost',
  });
  console.log(`✅ Loaded: ${config2.brand.displayName}\n`);
  
  // Test 3: Default fallback
  console.log('Test 3: Default fallback');
  const config3 = await loadSystemConfig();
  console.log(`✅ Loaded: ${config3.brand.displayName}\n`);
}

testConfigLoading().catch(console.error);
```

Run it:
```bash
npx tsx scripts/test-config-loading.ts
```

## Troubleshooting

### Config Not Loading

**Problem:** Getting error "Failed to load config from database"

**Solutions:**
1. Check Supabase credentials:
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

2. Verify the community exists in the database:
   ```sql
   SELECT community_id, is_active 
   FROM community_configs 
   WHERE community_id = 'example';
   ```

3. Check the RPC function exists:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'get_active_community_config';
   ```

### Wrong Community Loading

**Problem:** Loading 'nouns' when expecting 'example'

**Solutions:**
1. Set `NEXT_PUBLIC_TEST_COMMUNITY` environment variable (required for plain localhost)
2. Or use localhost subdomains:
   - Visit `http://example.localhost:3000` (not just `localhost:3000`)
   - Check middleware logs for detected domain
3. Verify Supabase credentials are configured

### Subdomain Not Working

**Problem:** `example.localhost:3000` not resolving to 'example'

**Solutions:**
1. Verify `/etc/hosts` entry:
   ```bash
   cat /etc/hosts | grep localhost
   ```
2. Clear browser cache/DNS cache
3. Try a different browser or incognito mode
4. Check middleware is running (should see headers in Network tab)

## Testing Checklist

- [ ] Test with `NEXT_PUBLIC_TEST_COMMUNITY` environment variable
- [ ] Test with localhost subdomains (`example.localhost:3000`)
- [ ] Verify correct community config loads (brand, logo, navigation)
- [ ] Check console logs show correct community ID
- [ ] Verify Supabase requests in Network tab
- [ ] Test error handling when no community ID can be resolved
- [ ] Test error handling (invalid community ID)
- [ ] Test both server-side and client-side loading

## Environment Variables Reference

| Variable | Purpose | Priority | Example |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_TEST_COMMUNITY` | Development override | 1 (dev only) | `example` |
| Domain resolution | From request domain | 2 | `example.localhost` → `example` |

**Note:** If no community ID can be resolved, the system will error when attempting to load config. Always set `NEXT_PUBLIC_TEST_COMMUNITY` in development or use localhost subdomains.

## Related Documentation

- [Configuration System Overview](SYSTEMS/CONFIGURATION/OVERVIEW.md) - Complete system documentation
- [Configuration Guide](CONFIGURATION.md) - General configuration guide

