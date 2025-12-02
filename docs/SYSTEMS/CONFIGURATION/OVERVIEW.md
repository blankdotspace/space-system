# Database-Backed Configuration System

## Overview

Nounspace uses a database-backed configuration system with **domain-based multi-tenant support**. Community configurations are stored in Supabase and loaded dynamically at runtime based on the request domain, enabling a single deployment to serve multiple communities.

## Architecture

```
┌─────────────────┐
│   Browser       │
│  (Request)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Middleware     │
│  (Edge Runtime) │
│  - Detects domain│
│  - Sets headers │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ Server Component│─────▶│  Config Loader  │
│                 │      │  (Runtime)      │
└─────────────────┘      └─────────┬────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │   Database       │
                          │   (Runtime)      │
                          └──────────────────┘
```

## Configuration Storage

### Database Table

Configurations are stored in the `community_configs` table:

```sql
CREATE TABLE "public"."community_configs" (
    "id" UUID PRIMARY KEY,
    "community_id" VARCHAR(50) NOT NULL UNIQUE,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "brand_config" JSONB NOT NULL,           -- Brand identity
    "assets_config" JSONB NOT NULL,          -- Asset paths
    "community_config" JSONB NOT NULL,       -- Community integration data
    "fidgets_config" JSONB NOT NULL,         -- Enabled/disabled fidgets
    "navigation_config" JSONB,              -- Navigation items (with spaceId refs)
    "ui_config" JSONB,                      -- UI colors
    "is_published" BOOLEAN DEFAULT true
);
```

### Config Sections

- **`brand_config`**: Display name, tagline, description, mini app tags
- **`assets_config`**: Logo paths (main, icon, favicon, og image, splash)
- **`community_config`**: URLs, social handles, governance links, tokens, contracts
- **`fidgets_config`**: Enabled and disabled fidget IDs
- **`navigation_config`**: Navigation items with optional `spaceId` references
- **`ui_config`**: Primary colors, hover states, cast button colors

### What's Not in the Database

- **Themes**: Stored in `src/config/shared/themes.ts` (shared across communities)
- **Pages** (homePage/explorePage): Stored as Spaces in Supabase Storage, referenced by navigation items

## Configuration Loading

All communities use runtime loading from Supabase:

**Process:**
1. **Middleware Detects Domain**
   ```typescript
   // middleware.ts
   const domain = request.headers.get('host'); // "example.nounspace.com"
   const communityId = resolveCommunityFromDomain(domain); // "example"
   response.headers.set('x-community-id', communityId);
   ```

2. **Server Component Reads Header**
   ```typescript
   // Server Component
   const headersList = await headers();
   const communityId = headersList.get('x-community-id');
   ```

3. **Fetch Config from Database** (at request time)
   ```typescript
   // src/config/loaders/runtimeLoader.ts
   const { data } = await supabase
     .rpc('get_active_community_config', { p_community_id: communityId })
     .single();
   return data;
   ```

**Benefits:**
- Multi-tenant support (different domains → different communities)
- Single deployment serves all communities
- Config can be updated without rebuild
- Dynamic configuration updates

### Database Function

The `get_active_community_config(community_id)` function returns a combined JSON object:

```json
{
  "brand": { /* brand_config */ },
  "assets": { /* assets_config */ },
  "community": { /* community_config */ },
  "fidgets": { /* fidgets_config */ },
  "navigation": { /* navigation_config */ },
  "ui": { /* ui_config */ }
}
```

## Navigation Pages as Spaces

### Concept

Navigation pages (like `/home` and `/explore`) are stored as Spaces in Supabase Storage, not in the database config. Navigation items reference these Spaces via `spaceId`.

### Storage Structure

**Space Registration** (in `spaceRegistrations` table):
- `spaceType = 'navPage'`
- `fid = NULL` (system-owned)
- `identityPublicKey = 'system'`
- `signature = 'system-seed'`

**Space Config Files** (in Supabase Storage bucket `spaces`):
```
spaces/
  {spaceId}/
    tabOrder          ← JSON: { tabOrder: ["Nouns", "Socials", ...] }
    tabs/
      Nouns           ← SpaceConfig JSON (fidgets, layout, etc.)
      Socials         ← SpaceConfig JSON
      ...
```

**File Format** (SignedFile wrapper):
```json
{
  "fileData": "{...SpaceConfig JSON as string...}",
  "fileType": "json",
  "isEncrypted": false,
  "timestamp": "2024-01-01T00:00:00Z",
  "publicKey": "nounspace",
  "signature": "not applicable, machine generated file"
}
```

### Navigation Reference

Navigation items reference Spaces:

```typescript
{
  id: 'home',
  label: 'Home',
  href: '/home',
  icon: 'home',
  spaceId: 'uuid-of-home-space'  // ← References Space
}
```

## Dynamic Routing

### Route Handler

The `/[navSlug]/[[...tabName]]/page.tsx` route handles all navigation-backed pages:

- `/home` → redirects to `/home/{defaultTab}`
- `/home/Nouns` → renders Nouns tab
- `/explore` → redirects to `/explore/{defaultTab}`
- `/explore/Featured` → renders Featured tab

### Request Flow

1. User visits `/home`
2. Route handler finds navigation item by slug
3. If `spaceId` exists, loads Space from Storage:
   - Fetches `{spaceId}/tabOrder` to get tab order
   - Fetches each `{spaceId}/tabs/{tabName}` for tab configs
   - Reconstructs `PageConfig` format
4. If no tab specified, redirects to default tab
5. Renders `NavPageClient` with tabs

### Space Loading Function

```typescript
async function loadSpaceAsPageConfig(spaceId: string): Promise<PageConfig | null> {
  // 1. Fetch tab order
  const { data: tabOrderData } = await supabase.storage
    .from('spaces')
    .download(`${spaceId}/tabOrder`);
  
  const tabOrderFile = JSON.parse(await tabOrderData.text()) as SignedFile;
  const tabOrderObj = JSON.parse(tabOrderFile.fileData);
  const tabOrder = tabOrderObj.tabOrder;
  
  // 2. Fetch each tab config
  const tabs = {};
  for (const tabName of tabOrder) {
    const { data: tabData } = await supabase.storage
      .from('spaces')
      .download(`${spaceId}/tabs/${tabName}`);
    
    const tabFile = JSON.parse(await tabData.text()) as SignedFile;
    const tabConfig = JSON.parse(tabFile.fileData);
    tabs[tabName] = tabConfig;
  }
  
  // 3. Reconstruct PageConfig
  return {
    defaultTab: tabOrder[0],
    tabOrder,
    tabs,
    layout: { /* defaults */ }
  };
}
```

## Shared Themes

Themes are stored in `src/config/shared/themes.ts` and shared across all communities:

```typescript
export const themes = {
  default: { /* ... */ },
  nounish: { /* ... */ },
  gradientAndWave: { /* ... */ },
  // ... all 10 themes
};
```

All communities import from this shared file, reducing duplication and config size.

## Configuration Size

The database config is ~2.8 KB (down from ~29 KB) by:
- Moving themes to shared file (5.5 KB saved)
- Moving pages to Spaces (20.6 KB saved)

This size reduction makes the environment variable approach viable.

## Request Flow

### Complete Flow Example

**User visits:** `https://example.nounspace.com/home`

1. **Middleware** (Edge Runtime)
   - Extracts domain: `example.nounspace.com`
   - Resolves community ID: `example`
   - Sets headers: `x-community-id: example`, `x-detected-domain: example.nounspace.com`

2. **Server Component**
   - Reads `x-community-id` header
   - Calls `await loadSystemConfig()`
   - Fetches config from database for the detected community
   - Renders page with correct config

3. **Client Component**
   - Uses `window.location.hostname` for domain detection
   - Config loading is always async (from database)

### Config Loader

```typescript
// src/config/index.ts
export async function loadSystemConfig(context?: ConfigLoadContext): Promise<SystemConfig> {
  // Server-side: reads from middleware-set headers
  // Client-side: uses window.location.hostname
  
  const factory = getConfigLoaderFactory();
  const loader = factory.getLoader(context);
  
  // Always uses runtime loader (fetches from database)
  return await loader.load(context);
}
```

### Component Usage

**Server Components** (must await):
```typescript
// Server Component
import { loadSystemConfig } from '@/config';

export default async function Layout() {
  const config = await loadSystemConfig();
  return <div>{config.brand.displayName}</div>;
}
```

**Client Components** (always async):
```typescript
// Client Component
import { loadSystemConfig } from '@/config';

function Navigation() {
  const config = await loadSystemConfig(); // Always async (from database)
}
```

**React Hook**:
```typescript
import { useSystemConfig } from '@/common/lib/hooks/useSystemConfig';

function Navigation() {
  const config = useSystemConfig();
  // Use config.brand, config.navigation, etc.
}
```

## Environment Variables

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (for runtime loading)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for seeding)

**Optional:**
- `NEXT_PUBLIC_COMMUNITY` - Community ID (defaults to 'nouns', used as fallback)
- `NEXT_PUBLIC_TEST_COMMUNITY` - Override for local testing (development only)

## Domain Resolution

The system automatically resolves community ID from domain:

- `example.nounspace.com` → `example`
- `clanker.nounspace.com` → `clanker`
- `example.localhost:3000` → `example` (for local testing)

**Priority order:**
1. Middleware-set header (`x-community-id`)
2. Development override (`NEXT_PUBLIC_TEST_COMMUNITY`)
3. Domain resolution
4. Environment variable (`NEXT_PUBLIC_COMMUNITY`)

## Benefits

- **Multi-Tenant Support** - Single deployment serves multiple communities
- **Domain-Based Routing** - Automatic community detection from domain
- **Admin Updates** - Configs can be updated via database
- **Dynamic Updates** - Config changes without rebuild
- **Small Config** - Only ~2.8 KB
- **Unified Architecture** - Pages are Spaces, consistent with existing system
- **Shared Themes** - Single source of truth, no duplication

## Related Files

- **Database**: `supabase/migrations/20251129172847_create_community_configs.sql`
- **Middleware**: `middleware.ts` - Domain detection and header setting
- **Build Config**: `next.config.mjs` - Downloads assets at build time
- **Config Loaders**: `src/config/loaders/` - Strategy pattern implementation
- **Config Loader**: `src/config/index.ts` - Main config loading function
- **Route Handler**: `src/app/[navSlug]/[[...tabName]]/page.tsx` - Dynamic navigation
- **Space Seeding**: `scripts/seed-all.ts` - Unified seeding script
- **Shared Themes**: `src/config/shared/themes.ts` - Theme definitions

