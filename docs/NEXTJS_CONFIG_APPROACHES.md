# Next.js-Specific Approaches for Build-Time Config Generation

Next.js offers several clever ways to handle build-time configuration generation. Here are the most Next.js-native approaches:

## Approach 1: Generate in `next.config.mjs` (Recommended)

**Most Next.js-Native**: Since `next.config.mjs` executes at build time, you can generate files directly there.

### Implementation

```javascript
// next.config.mjs

import { generateConfigs } from './scripts/generate-configs.mjs';

// Generate configs before Next.js config is created
await generateConfigs();

import bundlerAnalyzer from "@next/bundle-analyzer";
// ... rest of your config
```

**Pros:**
- ✅ Runs automatically before every build
- ✅ No need for `prebuild` hook
- ✅ Guaranteed to run before Next.js processes files
- ✅ Can use async/await
- ✅ Native Next.js approach

**Cons:**
- ⚠️ Makes `next.config.mjs` more complex
- ⚠️ Harder to test in isolation

### Example Implementation

```javascript
// next.config.mjs

import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateConfigs() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Missing Supabase env vars, skipping config generation');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const communities = process.env.GENERATE_CONFIGS?.split(',') || ['nouns'];
  
  console.log('📦 Generating configs from database...');
  
  for (const communityId of communities) {
    try {
      const { data, error } = await supabase
        .rpc('get_active_community_config', { p_community_id: communityId })
        .single();
      
      if (error || !data) {
        console.warn(`⚠️  Failed to fetch ${communityId} config:`, error?.message);
        continue;
      }
      
      const configDir = join(__dirname, 'src', 'config', communityId);
      await mkdir(configDir, { recursive: true });
      
      // Generate config files...
      // (same as before)
      
      console.log(`✅ Generated config for ${communityId}`);
    } catch (error) {
      console.error(`❌ Error generating ${communityId} config:`, error);
    }
  }
}

// Generate configs before creating Next.js config
await generateConfigs();

// Now create Next.js config
import bundlerAnalyzer from "@next/bundle-analyzer";
// ... rest of config
```

---

## Approach 2: Webpack Plugin (Most Flexible)

**Most Flexible**: Create a custom webpack plugin that generates files during the build process.

### Implementation

```javascript
// scripts/config-generator-plugin.js

class ConfigGeneratorPlugin {
  apply(compiler) {
    compiler.hooks.beforeCompile.tapAsync(
      'ConfigGeneratorPlugin',
      async (params, callback) => {
        try {
          await generateConfigs();
          callback();
        } catch (error) {
          console.error('Config generation failed:', error);
          callback(error);
        }
      }
    );
  }
}

module.exports = ConfigGeneratorPlugin;
```

```javascript
// next.config.mjs

import ConfigGeneratorPlugin from './scripts/config-generator-plugin.js';

const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(new ConfigGeneratorPlugin());
    }
    return config;
  },
  // ... rest of config
};
```

**Pros:**
- ✅ Runs during webpack compilation
- ✅ Can access webpack context
- ✅ More control over when it runs
- ✅ Can be conditional based on build mode

**Cons:**
- ⚠️ More complex setup
- ⚠️ Requires understanding webpack hooks
- ⚠️ Runs during compilation (slightly later than `next.config.mjs`)

---

## Approach 3: Next.js Environment Variables with Build Script

**Simplest**: Use environment variables that are loaded at build time, combined with a build script.

### Implementation

```javascript
// next.config.mjs

const nextConfig = {
  env: {
    // These are loaded at build time
    NEXT_PUBLIC_CONFIG_VERSION: process.env.CONFIG_VERSION || 'static',
  },
  // ... rest of config
};
```

```json
// package.json
{
  "scripts": {
    "generate-configs": "node scripts/generate-configs.mjs",
    "build": "npm run generate-configs && next build"
  }
}
```

**Pros:**
- ✅ Simple and explicit
- ✅ Easy to understand
- ✅ Can be skipped if needed

**Cons:**
- ⚠️ Requires remembering to run script
- ⚠️ Can be forgotten in CI/CD

---

## Approach 4: Next.js Server Components (For Runtime Config)

**Note**: This is for runtime config, not build-time, but worth mentioning.

If you wanted runtime config (not recommended for your use case), you could use Server Components:

```typescript
// app/config-provider.tsx (Server Component)

import { createClient } from '@supabase/supabase-js';

export async function ConfigProvider({ children }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data } = await supabase
    .rpc('get_active_community_config', { 
      p_community_id: process.env.NEXT_PUBLIC_COMMUNITY || 'nouns' 
    })
    .single();
  
  return (
    <ConfigContext.Provider value={data}>
      {children}
    </ConfigContext.Provider>
  );
}
```

**Pros:**
- ✅ No build-time generation needed
- ✅ Always up-to-date

**Cons:**
- ❌ Runtime database queries (not what you want)
- ❌ Slower page loads
- ❌ Requires database connection

---

## Approach 5: Next.js `generateStaticParams` Pattern (For Routes)

**For Route-Based Configs**: If configs were route-specific, you could use `generateStaticParams`:

```typescript
// app/[community]/layout.tsx

export async function generateStaticParams() {
  // Fetch all communities from DB at build time
  const communities = await fetchCommunitiesFromDB();
  return communities.map(community => ({
    community: community.id,
  }));
}

export default async function CommunityLayout({ params }) {
  // This runs at build time for each community
  const config = await fetchConfigForCommunity(params.community);
  return <ConfigProvider config={config}>...</ConfigProvider>;
}
```

**Pros:**
- ✅ Native Next.js pattern
- ✅ Build-time generation
- ✅ Per-route optimization

**Cons:**
- ⚠️ Only works for route-based configs
- ⚠️ Not ideal for global configs

---

## Recommended Approach: Hybrid

**Best of Both Worlds**: Combine `next.config.mjs` generation with a fallback script.

```javascript
// next.config.mjs

import { generateConfigs } from './scripts/generate-configs.mjs';

// Try to generate configs, but don't fail build if it fails
try {
  await generateConfigs();
} catch (error) {
  console.warn('⚠️  Config generation failed, using static configs:', error.message);
}

// Continue with Next.js config...
```

```json
// package.json
{
  "scripts": {
    "generate-configs": "node scripts/generate-configs.mjs",
    "prebuild": "npm run generate-configs || true", // Don't fail if generation fails
    "build": "next build"
  }
}
```

**Benefits:**
- ✅ Automatic generation in `next.config.mjs`
- ✅ Fallback script for manual runs
- ✅ Build doesn't fail if DB unavailable
- ✅ Works in all environments

---

## Comparison Table

| Approach | When It Runs | Complexity | Next.js Native | Recommended |
|----------|--------------|------------|----------------|-------------|
| `next.config.mjs` | Before config load | Low | ✅ Yes | ⭐⭐⭐⭐⭐ |
| Webpack Plugin | During compilation | Medium | ✅ Yes | ⭐⭐⭐⭐ |
| Prebuild Script | Before build | Low | ⚠️ No | ⭐⭐⭐ |
| Server Components | Runtime | Low | ✅ Yes | ❌ No (runtime) |
| `generateStaticParams` | Build time | Medium | ✅ Yes | ⭐⭐ (route-specific) |

---

## Recommended Implementation

For your use case, I recommend **Approach 1** (`next.config.mjs`) because:

1. ✅ **Most Next.js-native** - Uses Next.js's build-time execution
2. ✅ **Automatic** - Runs before every build without extra scripts
3. ✅ **Simple** - No webpack plugins or complex setup
4. ✅ **Reliable** - Guaranteed to run before Next.js processes files
5. ✅ **Flexible** - Can easily add error handling and fallbacks

### Final Implementation

```javascript
// next.config.mjs

import { generateConfigs } from './scripts/generate-configs.mjs';

// Generate configs at build time
await generateConfigs().catch(error => {
  console.warn('⚠️  Config generation failed, using static configs');
  console.warn(error.message);
});

// Continue with your existing Next.js config
import bundlerAnalyzer from "@next/bundle-analyzer";
// ... rest of config
```

This gives you the best of both worlds: automatic generation with graceful fallback to static configs.

