# Architecture Overview

## Executive Summary

This document provides a comprehensive overview of the Nounspace configuration architecture. The system has been refactored from a static, build-time TypeScript-based configuration system to a **dynamic, database-backed, multi-tenant runtime configuration system** that supports domain-based community detection.

## Core Architectural Principles

1. **Server-Only Config Loading**: `loadSystemConfig()` is server-only and uses `await headers()` API
2. **Prop-Based Config Passing**: Client components receive config via `systemConfig` prop from Server Components
3. **Runtime Configuration Loading**: All community configs are loaded from Supabase at request time
4. **Multi-Tenant Support**: Single deployment serves multiple communities via domain-based routing
5. **Separation of Concerns**: Configs, themes, and pages are stored in different locations
6. **Dynamic Navigation**: Navigation pages are stored as Spaces in Supabase Storage
7. **Simplified Space Creators**: All communities use Nouns implementations for initial space creation

---

## Architecture Layers

### 1. Request Flow & Domain Detection

```
Browser Request (example.nounspace.com)
  ↓
Next.js Middleware (middleware.ts)
  ├─ Detects domain from headers
  ├─ Resolves community ID (example.nounspace.com → "example")
  └─ Sets headers: x-community-id, x-detected-domain
  ↓
Server Component (layout.tsx, page.tsx, etc.)
  ├─ Reads headers (async headers() API)
  ├─ Calls await loadSystemConfig() ← SERVER-ONLY
  ├─ Loads config from database
  └─ Passes systemConfig as prop to Client Components
  ↓
Client Components
  ├─ Receive systemConfig prop
  └─ Use config data (brand, assets, navigation, etc.)
  ↓
Renders with community-specific config
```

**Key Point:** Config loading is **server-only**. Client components never call `loadSystemConfig()` directly - they receive config via props.

**Key Files:**
- `middleware.ts` - Domain detection and header injection
- `src/config/loaders/registry.ts` - Domain → community ID resolution
- `src/config/loaders/utils.ts` - Context building and community ID resolution

### 2. Configuration Loading System

#### Server-Only Architecture

**Important:** `loadSystemConfig()` is **server-only** and can only be called from Server Components or Server Actions. Client components receive config via props.

#### Configuration Loader Architecture

```
loadSystemConfig(context?) - SERVER-ONLY
  ↓
buildContext() - Builds ConfigLoadContext
  ├─ Reads x-community-id, x-detected-domain headers (server-only)
  └─ Falls back to env vars if needed
  ↓
resolveCommunityId(context) - Priority order:
  1. Explicit context.communityId
  2. NEXT_PUBLIC_TEST_COMMUNITY (dev only)
  3. Domain resolution (from middleware headers)
  
  Note: If no community ID can be resolved, the system will error when attempting to load config.
  ↓
RuntimeConfigLoader.load(context)
  ├─ Fetches from Supabase RPC: get_active_community_config()
  ├─ Validates config structure
  ├─ Merges with shared themes (from shared/themes.ts)
  └─ Returns SystemConfig
```

#### Prop Passing Pattern

```
Server Component (loads config)
  ↓ systemConfig prop
Client Wrapper Component
  ↓ systemConfig prop
Client Component (uses config)
  ↓ systemConfig prop (if needed)
Child Client Components
```

**Example:**
```typescript
// ✅ CORRECT: Server Component
export default async function RootLayout() {
  const systemConfig = await loadSystemConfig(); // Server-only
  return <ClientComponent systemConfig={systemConfig} />;
}

// ❌ WRONG: Client Component
"use client";
export function MyComponent() {
  const config = loadSystemConfig(); // ERROR: Can't use server APIs
}
```

**Key Files:**
- `src/config/index.ts` - Main config loading entry point
- `src/config/loaders/runtimeLoader.ts` - Database config loader
- `src/config/loaders/types.ts` - Type definitions
- `src/config/loaders/utils.ts` - Utility functions

#### Community ID Resolution Priority

1. **Explicit Context** (`context.communityId`) - Highest priority
2. **Development Override** (`NEXT_PUBLIC_TEST_COMMUNITY`) - For local testing only
3. **Domain Resolution** - From middleware headers (production or localhost subdomains)
   - **Special Domain Mappings** (checked first) - Configured in `src/config/loaders/registry.ts`
   - **Normal Domain Resolution** - Subdomain extraction (e.g., `example.nounspace.com` → `example`)

**Note:** If no community ID can be resolved, the system will error when attempting to load config. In development, always set `NEXT_PUBLIC_TEST_COMMUNITY` or use localhost subdomains (e.g., `example.localhost:3000`).

**Special Domain Mappings:**

Certain domains can be mapped to specific communities, overriding normal domain resolution. This is configured in `src/config/loaders/registry.ts`:

```typescript
const DOMAIN_TO_COMMUNITY_MAP: Record<string, string> = {
  'staging.nounspace.com': 'nouns',
  'staging.localhost': 'nouns', // For local testing
};
```

These mappings take priority over normal domain resolution and are useful for staging environments, preview deployments, etc.

### 3. Database Schema

#### `community_configs` Table

```sql
CREATE TABLE community_configs (
    id UUID PRIMARY KEY,
    community_id VARCHAR(50) NOT NULL UNIQUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    brand_config JSONB NOT NULL,           -- Brand identity
    assets_config JSONB NOT NULL,          -- Asset paths
    community_config JSONB NOT NULL,       -- Community integration
    fidgets_config JSONB NOT NULL,         -- Enabled/disabled fidgets
    navigation_config JSONB,              -- Navigation items (with spaceId refs)
    ui_config JSONB,                       -- UI colors
    is_published BOOLEAN DEFAULT true
);
```

#### Database Function: `get_active_community_config`

```sql
-- Returns most recently updated published config for a community
-- Orders by updated_at DESC for deterministic results
SELECT jsonb_build_object(
    'brand', brand_config,
    'assets', assets_config,
    'community', community_config,
    'fidgets', fidgets_config,
    'navigation', navigation_config,
    'ui', ui_config
)
FROM community_configs
WHERE community_id = p_community_id
  AND is_published = true
ORDER BY updated_at DESC
LIMIT 1;
```

**Key Features:**
- Deterministic ordering by `updated_at DESC`
- Only returns published configs
- Returns most recent version if multiple exist

### 4. Configuration Structure

#### SystemConfig Interface

```typescript
interface SystemConfig {
  brand: BrandConfig;           // From database
  assets: AssetConfig;          // From database
  theme: ThemeConfig;           // From shared/themes.ts (NOT in database)
  community: CommunityConfig;   // From database
  fidgets: FidgetConfig;        // From database
  navigation?: NavigationConfig; // From database (with spaceId refs)
  ui?: UIConfig;                // From database
}
```

#### What's Stored Where

| Component | Storage Location | Notes |
|-----------|-----------------|-------|
| **Brand Config** | Database (`brand_config`) | Display name, tagline, description |
| **Assets Config** | Database (`assets_config`) | Logo paths, favicon, OG images |
| **Community Config** | Database (`community_config`) | URLs, social handles, contracts, tokens |
| **Fidgets Config** | Database (`fidgets_config`) | Enabled/disabled fidget IDs |
| **Navigation Config** | Database (`navigation_config`) | Navigation items with `spaceId` refs |
| **UI Config** | Database (`ui_config`) | Primary colors, hover states |
| **Themes** | `src/config/shared/themes.ts` | Shared across all communities |
| **Navigation Pages** | Supabase Storage (`spaces` bucket) | Stored as Spaces, referenced by `spaceId` |

### 5. Navigation Pages as Spaces

#### Concept

Navigation pages (like `/home` and `/explore`) are **not** stored in the database config. Instead, they are stored as **Spaces** in Supabase Storage and referenced by navigation items via `spaceId`.

#### Navigation Item Structure

```typescript
interface NavigationItem {
  id: string;
  label: string;
  href: string;              // e.g., "/home"
  icon?: 'home' | 'explore' | ...;
  spaceId?: string;          // Reference to Space in storage
}
```

#### Space Storage Structure

```
spaces/
  {spaceId}/
    tabOrder          ← JSON: { tabOrder: ["Nouns", "Socials", ...] }
    tabs/
      Nouns           ← SpaceConfig JSON (fidgets, layout, etc.)
      Socials         ← SpaceConfig JSON
      ...
```

#### Loading Flow

```
User navigates to /home
  ↓
Middleware: Sets x-community-id header
  ↓
NavPage Server Component (page.tsx)
  ├─ Step 1: Load SystemConfig
  │   └─ Gets navigation items from database
  │   └─ Finds nav item: { href: "/home", spaceId: "abc-123-def" }
  │
  ├─ Step 2: Load Space from Storage
  │   └─ Downloads: spaces/abc-123-def/tabOrder
  │   └─ Downloads: spaces/abc-123-def/tabs/Nouns
  │   └─ Downloads: spaces/abc-123-def/tabs/Socials
  │   └─ Constructs NavPageConfig
  │
  ├─ Step 3: Redirect to default tab (if no tab specified)
  │   └─ Redirects to: /home/Nouns
  │
  └─ Step 4: Render with tab
      └─ Passes NavPageConfig to NavPageClient
  ↓
NavPageClient (Client Component)
  ├─ Receives: pageConfig, activeTabName, navSlug props
  ├─ Extracts active tab config from pageConfig.tabs
  ├─ Creates TabBar component
  └─ Renders SpacePage with tab config
```

#### Detailed Navigation Page Flow

**When user visits `/home`:**

1. **Middleware runs first:**
   - Detects domain: `example.nounspace.com`
   - Sets header: `x-community-id: "example"`

2. **NavPage Server Component:**
   - Loads `SystemConfig` → gets navigation items
   - Finds nav item with `href="/home"` → extracts `spaceId`
   - Loads Space from Supabase Storage:
     - Downloads `tabOrder` file
     - Downloads each tab config file
   - Constructs `NavPageConfig` object
   - If no tab specified → redirects to `/home/{defaultTab}`

3. **NavPage runs again with tab:**
   - Loads `SystemConfig` again
   - Loads Space from Storage again
   - Validates tab exists
   - Passes `NavPageConfig` to `NavPageClient`

4. **NavPageClient (Client Component):**
   - Receives `pageConfig` prop (NavPageConfig)
   - Extracts active tab config
   - Renders `SpacePage` with tab content

**Storage Structure:**
```
Supabase Storage (spaces bucket):
  spaces/
    {spaceId}/
      tabOrder          ← SignedFile: { tabOrder: ["Nouns", "Socials"] }
      tabs/
        Nouns           ← SignedFile: SpaceConfig JSON
        Socials         ← SignedFile: SpaceConfig JSON
```

**Database References:**
```json
// In community_configs.navigation_config:
{
  "items": [
    {
      "id": "home",
      "href": "/home",
      "spaceId": "abc-123-def"  ← References Space in storage
    }
  ]
}
```

**Key Files:**
- `src/app/[navSlug]/[[...tabName]]/page.tsx` - Dynamic navigation page handler
- `src/app/[navSlug]/[[...tabName]]/NavPageClient.tsx` - Client component for rendering
- `src/config/systemConfig.ts` - `NavPageConfig` type definition

### 6. Space Creators

#### Simplified Architecture

All communities now use **Nouns implementations** for initial space creation. The space creator functions are synchronous and directly re-export Nouns implementations.

```typescript
// All communities use Nouns implementations
export const createInitialProfileSpaceConfigForFid = nounsCreateInitialProfileSpaceConfigForFid;
export const createInitialChannelSpaceConfig = nounsCreateInitialChannelSpaceConfig;
export const createInitialTokenSpaceConfigForAddress = nounsCreateInitialTokenSpaceConfigForAddress;
export const createInitalProposalSpaceConfigForProposalId = nounsCreateInitalProposalSpaceConfigForProposalId;
export const INITIAL_HOMEBASE_CONFIG = nounsINITIAL_HOMEBASE_CONFIG;
```

**Key Files:**
- `src/config/index.ts` - Re-exports Nouns implementations
- `src/config/nouns/initialSpaces/` - Nouns space creator implementations

---

## Key Architectural Changes

### Removed Components

1. **Build-Time Config Loading** - All configs now load at runtime
2. **Static Config Fallbacks** - No fallback to TypeScript configs
3. **Community-Specific Space Creators** - All use Nouns implementations
4. **HomePageConfig/ExplorePageConfig in SystemConfig** - Moved to Spaces
5. **Factory Pattern for Config Loaders** - Simplified to single runtime loader

### Added Components

1. **Middleware-Based Domain Detection** - Centralized domain resolution
2. **Runtime Database Loading** - All configs from Supabase
3. **Navigation-Space References** - Pages stored as Spaces
4. **NavPageConfig Type** - Unified type for navigation pages
5. **Deterministic Database Function** - Orders by `updated_at DESC`

### Simplified Components

1. **Config Loading** - Single `RuntimeConfigLoader` (no factory)
2. **Space Creators** - Synchronous, Nouns-only implementations
3. **Type System** - `NavPageConfig` replaces `HomePageConfig | ExplorePageConfig`
4. **Community Resolution** - Clear priority order

---

## Data Flow Examples

### Example 1: Loading Config for `example.nounspace.com`

```
1. Request arrives at middleware.ts
   └─ Domain: "example.nounspace.com"
   └─ Resolves to: "example"
   └─ Sets header: x-community-id = "example"

2. Server Component calls loadSystemConfig()
   └─ Reads x-community-id header: "example"
   └─ Calls RuntimeConfigLoader.load({ communityId: "example" })

3. RuntimeConfigLoader
   └─ Calls Supabase RPC: get_active_community_config("example")
   └─ Receives JSONB config from database
   └─ Merges with themes from shared/themes.ts
   └─ Returns SystemConfig

4. Component renders with example community config
```

### Example 2: Navigating to `/home` Page

```
1. Request: example.nounspace.com/home
   └─ Middleware detects domain → sets x-community-id: "example"

2. NavPage Server Component loads
   └─ Calls: await loadSystemConfig()
   └─ Gets navigation items from database
   └─ Finds: { href: "/home", spaceId: "abc-123-def" }

3. NavPage loads Space from Supabase Storage
   └─ Downloads: spaces/abc-123-def/tabOrder
   └─ Downloads: spaces/abc-123-def/tabs/Nouns
   └─ Downloads: spaces/abc-123-def/tabs/Socials
   └─ Constructs NavPageConfig:
      {
        defaultTab: "Nouns",
        tabOrder: ["Nouns", "Socials"],
        tabs: { "Nouns": {...}, "Socials": {...} }
      }

4. Redirects to default tab: /home/Nouns

5. NavPage runs again with tab
   └─ Loads SystemConfig and Space again
   └─ Validates "Nouns" tab exists
   └─ Passes NavPageConfig to NavPageClient

6. NavPageClient (Client Component) renders
   └─ Receives pageConfig prop
   └─ Extracts tab config: pageConfig.tabs["Nouns"]
   └─ Creates TabBar component
   └─ Renders SpacePage with tab content
```

### Example 3: Component Hierarchy & Prop Flow

```
RootLayout (Server Component)
├─ await loadSystemConfig() ← SERVER-ONLY
├─ ClientMobileHeaderWrapper (Client)
│  └─ systemConfig prop
│  └─ MobileHeader (Client)
│     ├─ systemConfig prop
│     ├─ BrandHeader (Client) ← uses systemConfig.assets
│     └─ Navigation (Client) ← uses systemConfig.navigation
│
└─ ClientSidebarWrapper (Client)
   └─ systemConfig prop
   └─ Sidebar (Client)
      └─ systemConfig prop
      └─ Navigation (Client) ← uses systemConfig.navigation
```

---

## Environment Variables

### Required

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (for runtime loading)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for seeding/admin operations)

### Optional

- `NEXT_PUBLIC_TEST_COMMUNITY` - Override for local testing (development only)

---

## Testing & Development

### Local Testing

1. **Localhost Subdomains**: `example.localhost:3000` → detects "example"
2. **Environment Override**: `NEXT_PUBLIC_TEST_COMMUNITY=example npm run dev`

**Note:** If neither method is used, the system will error when attempting to load config. Always set `NEXT_PUBLIC_TEST_COMMUNITY` or use localhost subdomains in development.

### Production

- Domain-based detection: `example.nounspace.com` → "example"
- Requires valid domain resolution (no fallback)

---

## Benefits

1. **Multi-Tenant Support** - Single deployment serves multiple communities
2. **Dynamic Updates** - Config changes without rebuild
3. **Domain-Based Routing** - Automatic community detection
4. **Unified Architecture** - Pages are Spaces, consistent with existing system
5. **Shared Themes** - Single source of truth, no duplication
6. **Simplified Codebase** - Removed build-time complexity
7. **Deterministic Loading** - Database function orders by `updated_at DESC`
8. **Server-Client Separation** - Clear boundaries, no client-side server API calls
9. **Type Safety** - SystemConfig type flows through props
10. **Performance** - Config loaded once at root, reused throughout app
11. **No Hydration Issues** - No client-side domain detection

---

## Related Files

### Core Configuration
- `src/config/index.ts` - Main config loader
- `src/config/systemConfig.ts` - Type definitions
- `src/config/loaders/runtimeLoader.ts` - Database loader
- `src/config/loaders/utils.ts` - Utility functions
- `src/config/loaders/registry.ts` - Domain resolution
- `src/config/shared/themes.ts` - Shared themes

### Routing & Navigation
- `middleware.ts` - Domain detection and header injection
- `src/app/[navSlug]/[[...tabName]]/page.tsx` - Dynamic navigation (Server Component)
- `src/app/[navSlug]/[[...tabName]]/NavPageClient.tsx` - Client component for rendering
- `src/app/layout.tsx` - Root layout that loads config and passes to client components
- `src/common/components/organisms/ClientSidebarWrapper.tsx` - Client wrapper for Sidebar
- `src/common/components/organisms/ClientMobileHeaderWrapper.tsx` - Client wrapper for MobileHeader

### Database
- `supabase/migrations/20251129172847_create_community_configs.sql` - Schema
- `scripts/seed-community-configs.ts` - Seeding script
- `scripts/seed-navpage-spaces.ts` - Navigation page seeding

### Space Creators
- `src/config/nouns/initialSpaces/` - Nouns implementations
- `src/config/index.ts` - Re-exports

---

## Future Considerations

1. **Versioning**: Database function supports multiple versions (orders by `updated_at`)
2. **Caching**: Could add caching layer for frequently accessed configs
3. **Admin UI**: Could build admin interface for config updates
4. **Validation**: Could add JSON schema validation for configs
5. **Rollback**: Could add version history and rollback capabilities

