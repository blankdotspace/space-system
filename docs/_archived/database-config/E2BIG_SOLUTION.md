# E2BIG Error Solution: File-Based Config Instead of Env Var

## Problem

The `NEXT_PUBLIC_BUILD_TIME_CONFIG` environment variable is too large (E2BIG error). Environment variables have size limits:
- **Linux/macOS**: ~128KB - 2MB (varies by system)
- **Windows**: ~32KB

Our config includes:
- Multiple theme definitions with HTML/CSS
- Home page configs with fidget instances
- Explore page configs
- All can easily exceed 100KB+

## Solution: Generate TypeScript File Instead

Instead of storing config in an environment variable, generate a TypeScript file at build time.

### Approach 1: Single Generated Config File (Recommended)

Generate `src/config/db-config.ts` at build time, import it at runtime.

**Pros:**
- ✅ No size limits
- ✅ Type-safe
- ✅ Simple to implement
- ✅ Works with Next.js build system

**Cons:**
- ⚠️ Generates one file

### Approach 2: Compress Config

Compress the JSON before storing in env var.

**Pros:**
- ✅ Keeps env var approach
- ✅ Reduces size significantly

**Cons:**
- ⚠️ Still has limits
- ⚠️ Requires decompression
- ⚠️ More complex

### Approach 3: Split Config

Store different parts in separate env vars.

**Pros:**
- ✅ Keeps env var approach

**Cons:**
- ⚠️ Complex to manage
- ⚠️ Still has limits
- ⚠️ Harder to maintain

## Recommended: File-Based Approach

Generate a TypeScript file at build time:

```javascript
// next.config.mjs

async function generateConfigFile() {
  // Fetch config from DB
  const config = await fetchConfigFromDB();
  
  if (!config) return; // Fall back to static
  
  // Generate TypeScript file
  const content = `// Auto-generated at build time
import { SystemConfig } from './systemConfig';

export const dbConfig: SystemConfig | null = ${JSON.stringify(config, null, 2)} as SystemConfig;
`;
  
  await writeFile('src/config/db-config.ts', content);
}
```

```typescript
// src/config/index.ts

let dbConfig: SystemConfig | null = null;
try {
  const dbModule = require('./db-config');
  dbConfig = dbModule.dbConfig;
} catch {
  // File doesn't exist, use static
}

export const loadSystemConfig = (): SystemConfig => {
  if (dbConfig) {
    return dbConfig;
  }
  // Fall back to static...
};
```

