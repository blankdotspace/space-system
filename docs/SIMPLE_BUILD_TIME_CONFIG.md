# Simple Build-Time Config: Variable Assignment Approach

## Overview

Instead of generating multiple TypeScript files, we can simply fetch configs from the database at build time and assign them to variables. Much simpler!

## Approach 1: Single Generated Config Module (Recommended)

Create a single module that fetches and exports configs at build time.

### Implementation

```typescript
// src/config/generated.ts
// This file is generated at build time by next.config.mjs

import { SystemConfig } from './systemConfig';

// Fetch from DB at build time and assign here
// If DB fetch fails, these will be undefined and we fall back to static configs

export const generatedConfigs: Record<string, SystemConfig | undefined> = {
  // These are populated at build time by next.config.mjs
  nouns: undefined, // Will be replaced with DB config if available
  clanker: undefined,
  example: undefined,
};
```

```javascript
// next.config.mjs

import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateConfigModule() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Missing Supabase env vars, skipping config generation');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const communities = ['nouns', 'clanker', 'example'];
  const configs = {};
  
  console.log('📦 Fetching configs from database...');
  
  for (const communityId of communities) {
    try {
      const { data, error } = await supabase
        .rpc('get_active_community_config', { p_community_id: communityId })
        .single();
      
      if (error || !data) {
        console.warn(`⚠️  Failed to fetch ${communityId} config:`, error?.message);
        configs[communityId] = null; // Will use static fallback
        continue;
      }
      
      configs[communityId] = data;
      console.log(`✅ Fetched config for ${communityId}`);
    } catch (error) {
      console.error(`❌ Error fetching ${communityId} config:`, error);
      configs[communityId] = null;
    }
  }
  
  // Generate the config module
  const configModule = `// Auto-generated at build time - DO NOT EDIT
import { SystemConfig } from './systemConfig';

export const generatedConfigs: Record<string, SystemConfig | null> = ${JSON.stringify(configs, null, 2)};
`;
  
  const filePath = join(__dirname, 'src', 'config', 'generated.ts');
  await writeFile(filePath, configModule, 'utf-8');
  console.log('✅ Generated config module');
}

// Generate config module before Next.js config
await generateConfigModule().catch(error => {
  console.warn('⚠️  Config generation failed, will use static configs');
});

// Continue with Next.js config...
import bundlerAnalyzer from "@next/bundle-analyzer";
// ... rest of config
```

```typescript
// src/config/index.ts

import { SystemConfig } from './systemConfig';
import { nounsSystemConfig } from './nouns/index';
import { exampleSystemConfig } from './example/index';
import { clankerSystemConfig } from './clanker/index';

// Import generated configs (may not exist if generation failed)
let generatedConfigs: Record<string, SystemConfig | null> = {};
try {
  const generated = await import('./generated');
  generatedConfigs = generated.generatedConfigs || {};
} catch {
  // Generated file doesn't exist, use static configs
}

// Static fallbacks
const STATIC_CONFIGS: Record<string, SystemConfig> = {
  nouns: nounsSystemConfig,
  example: exampleSystemConfig,
  clanker: clankerSystemConfig as unknown as SystemConfig,
};

export const loadSystemConfig = (): SystemConfig => {
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  const community = communityConfig.toLowerCase();
  
  // Use generated config if available, otherwise fall back to static
  const config = generatedConfigs[community] || STATIC_CONFIGS[community];
  
  if (!config) {
    console.warn(
      `Invalid community configuration: "${communityConfig}". ` +
      `Falling back to "nouns" configuration.`
    );
    return STATIC_CONFIGS.nouns;
  }
  
  return config;
};
```

---

## Approach 2: Direct Assignment in `next.config.mjs`

Even simpler - assign configs directly in `next.config.mjs` and export them.

### Implementation

```javascript
// next.config.mjs

import { createClient } from '@supabase/supabase-js';

// Fetch configs at build time
let dbConfigs = {};

async function fetchConfigs() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Missing Supabase env vars, using static configs');
    return {};
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const community = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  try {
    const { data, error } = await supabase
      .rpc('get_active_community_config', { p_community_id: community })
      .single();
    
    if (error || !data) {
      console.warn('⚠️  Failed to fetch config, using static');
      return {};
    }
    
    return { [community]: data };
  } catch (error) {
    console.warn('⚠️  Error fetching config:', error.message);
    return {};
  }
}

// Fetch configs before creating Next.js config
dbConfigs = await fetchConfigs().catch(() => ({}));

// Export configs for use in the app
// We'll make them available via environment variables or a module

// Continue with Next.js config...
import bundlerAnalyzer from "@next/bundle-analyzer";
// ... rest of config

export default withBundleAnalyzer(nextConfig);
```

**Problem:** `next.config.mjs` exports Next.js config, not app config. We need a different approach.

---

## Approach 3: Environment Variables (Simplest!)

Set configs as environment variables at build time.

### Implementation

```javascript
// next.config.mjs

import { createClient } from '@supabase/supabase-js';

async function setConfigEnvVars() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return; // Use static configs
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const community = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  try {
    const { data, error } = await supabase
      .rpc('get_active_community_config', { p_community_id: community })
      .single();
    
    if (!error && data) {
      // Set as environment variable (available at build time)
      process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG = JSON.stringify(data);
      console.log('✅ Loaded config from database');
    }
  } catch (error) {
    console.warn('⚠️  Failed to load config from DB:', error.message);
  }
}

await setConfigEnvVars();

// Continue with Next.js config...
```

```typescript
// src/config/index.ts

import { SystemConfig } from './systemConfig';
import { nounsSystemConfig } from './nouns/index';
// ... other static configs

export const loadSystemConfig = (): SystemConfig => {
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  // Try to use build-time config from env var
  const buildTimeConfig = process.env.NEXT_PUBLIC_BUILD_TIME_CONFIG;
  if (buildTimeConfig) {
    try {
      const config = JSON.parse(buildTimeConfig) as SystemConfig;
      if (config) return config;
    } catch (error) {
      console.warn('Failed to parse build-time config:', error);
    }
  }
  
  // Fall back to static configs
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

**Pros:**
- ✅ Simplest approach
- ✅ No file generation
- ✅ No new modules
- ✅ Works with Next.js env var system

**Cons:**
- ⚠️ Large configs in env vars (but Next.js handles this fine)
- ⚠️ Need to parse JSON

---

## Approach 4: Single Config Module with Direct Import (Best!)

Create a single module that's generated at build time, but keep it simple.

### Implementation

```javascript
// next.config.mjs

import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return; // Will use static configs
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const community = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  try {
    const { data, error } = await supabase
      .rpc('get_active_community_config', { p_community_id: community })
      .single();
    
    if (error || !data) {
      console.warn('⚠️  No config found in DB, using static');
      return;
    }
    
    // Generate simple module with just the config
    const moduleContent = `// Auto-generated at build time
import { SystemConfig } from './systemConfig';

export const dbConfig: SystemConfig | null = ${JSON.stringify(data, null, 2)} as SystemConfig;
`;
    
    const filePath = join(__dirname, 'src', 'config', 'db-config.ts');
    await writeFile(filePath, moduleContent, 'utf-8');
    console.log('✅ Generated config from database');
  } catch (error) {
    console.warn('⚠️  Error generating config:', error.message);
  }
}

await generateConfig();

// Continue with Next.js config...
```

```typescript
// src/config/index.ts

import { SystemConfig } from './systemConfig';
import { nounsSystemConfig } from './nouns/index';
import { exampleSystemConfig } from './example/index';
import { clankerSystemConfig } from './clanker/index';

// Try to import DB config (may not exist)
let dbConfig: SystemConfig | null = null;
try {
  const dbModule = require('./db-config');
  dbConfig = dbModule.dbConfig;
} catch {
  // File doesn't exist, will use static
}

// Static fallbacks
const STATIC_CONFIGS: Record<string, SystemConfig> = {
  nouns: nounsSystemConfig,
  example: exampleSystemConfig,
  clanker: clankerSystemConfig as unknown as SystemConfig,
};

export const loadSystemConfig = (): SystemConfig => {
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  // Use DB config if available and matches current community
  if (dbConfig) {
    return dbConfig;
  }
  
  // Fall back to static configs
  const config = STATIC_CONFIGS[communityConfig.toLowerCase()];
  return config || STATIC_CONFIGS.nouns;
};
```

**Pros:**
- ✅ Single file generation (simple)
- ✅ Direct variable assignment
- ✅ Type-safe
- ✅ Easy to understand
- ✅ Clean fallback

---

## Comparison

| Approach | Files Generated | Complexity | Type Safety | Recommended |
|----------|----------------|------------|-------------|-------------|
| **Single Module** | 1 file | Low | ✅ Yes | ⭐⭐⭐⭐⭐ |
| **Env Variables** | 0 files | Very Low | ⚠️ Manual | ⭐⭐⭐⭐ |
| **Multiple Files** | Many files | High | ✅ Yes | ⭐⭐⭐ |

---

## Recommended: Approach 4 (Single Config Module)

**Why:**
- ✅ Generates only ONE file (`db-config.ts`)
- ✅ Simple variable assignment (`dbConfig`)
- ✅ Type-safe (imports `SystemConfig`)
- ✅ Easy to understand
- ✅ Clean fallback to static configs
- ✅ No complex file structure

**Implementation:**

1. **`next.config.mjs`** - Fetches config, generates single `db-config.ts` file
2. **`src/config/index.ts`** - Imports `dbConfig`, falls back to static if not available
3. **That's it!** - Much simpler than generating multiple files

This gives you all the benefits with minimal complexity!

