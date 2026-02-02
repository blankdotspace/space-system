# Architecture Overview

## Executive Summary

This document provides a comprehensive overview of the Nounspace configuration architecture. The system has been refactored from a static, build-time TypeScript-based configuration system to a **dynamic, database-backed, multi-tenant runtime configuration system** that supports domain-based community detection.

## Quick Reference: Accessing SystemConfig

This is the most common question: "How do I access the system config?"

### Server Components

```typescript
// ✅ Server components can load config directly
import { loadSystemConfig } from "@/config";

export default async function MyServerComponent() {
  const systemConfig = await loadSystemConfig();
  return <ClientComponent systemConfig={systemConfig} />;
}
```

### Client Components

```typescript
// ✅ Client components receive config as a prop
"use client";

type Props = {
  systemConfig: SystemConfig;
};

export function MyClientComponent({ systemConfig }: Props) {
  const discordUrl = systemConfig.community?.urls?.discord;
  // ...
}
```

### Pattern Summary

| Context | How to Access Config |
|---------|---------------------|
| Server Component | `await loadSystemConfig()` |
| Client Component | Receive via `systemConfig` prop from parent |
| API Route (pages/api) | `await loadSystemConfig()` |
| App Router API Route | `await loadSystemConfig()` |

---

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
Server Component (layout.tsx, page.tsx, etc.)
  ├─ Calls await loadSystemConfig() ← SERVER-ONLY
  │   ├─ Reads host header directly (async headers() API)
  │   ├─ Normalizes domain
  │   ├─ Resolves community ID via community_domains table or domain fallback
  │   └─ Loads config from database
  ├─ Passes systemConfig as prop to Client Components
  ↓
Client Components
  ├─ Receive systemConfig prop
  └─ Use config data (brand, assets, navigation, etc.)
  ↓
Renders with community-specific config
```

**Key Point:** Config loading is **server-only**. Client components never call `loadSystemConfig()` directly - they receive config via props.

**Note:** There is no Next.js middleware file. Domain detection happens directly in `loadSystemConfig()` using Next.js `headers()` API, which reads request headers.

**Key Files:**
- `src/config/index.ts` - Main config loader entry point
- `src/config/loaders/registry.ts` - Domain → community ID resolution and database queries
- `src/config/loaders/runtimeLoader.ts` - Runtime config loader implementation

### 2. Configuration Loading System

#### Server-Only Architecture

**Important:** `loadSystemConfig()` is **server-only** and can only be called from Server Components or Server Actions. Client components receive config via props.

#### Configuration Loader Architecture

```
loadSystemConfig(context?) - SERVER-ONLY
  ↓
Priority 1: Explicit context.communityId (if provided)
  └─ Directly loads config for that community ID
  ↓
Priority 2: Domain resolution (if domain provided or detected from headers)
  ├─ Reads host header using Next.js headers() API
  ├─ Normalizes domain
  ├─ Resolves community ID via resolveCommunityIdFromDomain():
  │   ├─ Checks community_domains table (database mapping)
  │   └─ Falls back to domain as community_id (legacy)
  └─ Loads config for resolved community ID
  ↓
Priority 3: Development override (NEXT_PUBLIC_TEST_COMMUNITY)
  └─ Loads config for test community (dev only)
  ↓
Priority 4: Default fallback
  └─ Loads config for DEFAULT_COMMUNITY_ID ('nounspace.com')
  ↓
RuntimeConfigLoader.load(context)
  ├─ Queries community_configs table
  ├─ Transforms database row to SystemConfig format
  ├─ Loads domain mappings from community_domains table
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

1. **Explicit Context** (`context.communityId`) - Highest priority, directly loads config
2. **Domain Resolution** - Reads host header using Next.js `headers()` API
   - **Database Domain Mappings** (checked first) - `community_domains` table lookup
     - Supports `blank_subdomain` (e.g., `example.blank.space`)
     - Supports `custom` domains (e.g., `example.com`)
   - **Legacy Fallback** - Domain as community_id (e.g., `example.nounspace.com` → `example.nounspace.com`)
3. **Development Override** (`NEXT_PUBLIC_TEST_COMMUNITY`) - For local testing only
4. **Default Fallback** - Falls back to `DEFAULT_COMMUNITY_ID` ('nounspace.com')

**Note:** The system uses a database table (`community_domains`) for domain mappings, not hardcoded maps. This allows dynamic domain configuration without code changes.

**Domain Resolution Process:**

```typescript
// 1. Normalize domain
const normalizedDomain = normalizeDomain(host);

// 2. Check community_domains table
const { data } = await supabase
  .from('community_domains')
  .select('community_id')
  .eq('domain', normalizedDomain)
  .maybeSingle();

// 3. Use mapped community_id or fall back to domain as community_id
const communityId = data?.community_id || normalizedDomain;
```

**Database Domain Mappings:**

Domain mappings are stored in the `community_domains` table:
- Each community can have one `blank_subdomain` (e.g., `example.blank.space`)
- Each community can have one `custom` domain (e.g., `example.com`)
- Domains are normalized before lookup
- Falls back to using domain as community_id if no mapping exists

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
    admin_identity_public_keys TEXT[],     -- Admin public keys for navigation editing
    is_published BOOLEAN DEFAULT true,
    custom_domain_authorized BOOLEAN DEFAULT false,  -- Custom domain authorization flag
    admin_email TEXT                       -- Admin contact email
);
```

#### `community_domains` Table

```sql
CREATE TABLE community_domains (
    id UUID PRIMARY KEY,
    community_id VARCHAR(50) NOT NULL REFERENCES community_configs(community_id) ON DELETE CASCADE,
    domain TEXT NOT NULL UNIQUE,
    domain_type TEXT NOT NULL CHECK (domain_type IN ('blank_subdomain', 'custom')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(community_id, domain_type)  -- One blank_subdomain and one custom per community
);
```

**Key Features:**
- Maps domains to community IDs (replaces hardcoded mappings)
- Supports both blank subdomains (`*.blank.space`) and custom domains
- Each community can have one of each domain type
- Used for domain-based community resolution
- Public read access for domain resolution

#### Config Loading Process

The system no longer uses an RPC function. Instead, config loading happens in application code:

1. Query `community_configs` table directly
2. Transform database row to `SystemConfig` format in application code
3. Load domain mappings from `community_domains` table
4. Merge with shared themes from `shared/themes.ts`
5. Return complete `SystemConfig`

**Key Features:**
- Deterministic ordering by `updated_at DESC`
- Only returns published configs
- Returns most recent version if multiple exist
- Domain mappings loaded separately and merged into config

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
  adminIdentityPublicKeys?: string[]; // From database (admin public keys)
  communityId: string;          // Database community_id (added for API operations)
}
```

#### What's Stored Where

| Component | Storage Location | Notes |
|-----------|-----------------|-------|
| **Brand Config** | Database (`brand_config`) | Display name, description, mini-app tags |
| **Assets Config** | Database (`assets_config`) | Logo paths, favicon, OG images |
| **Community Config** | Database (`community_config`) | URLs, social handles, governance identifiers, tokens |
| **Fidgets Config** | Database (`fidgets_config`) | Enabled/disabled fidget IDs |
| **Navigation Config** | Database (`navigation_config`) | Navigation items with `spaceId` refs |
| **UI Config** | Database (`ui_config`) | Primary colors, hover states, font colors, font URL |
| **Themes** | `src/config/shared/themes.ts` | Shared across all communities |
| **Navigation Pages** | Supabase Storage (`spaces` bucket) | Stored as Spaces, referenced by `spaceId` |
| **Community ID** | SystemConfig (runtime) | Database `community_id` passed through for API operations |

**Note:** The `communityId` field in `SystemConfig` is the database `community_id` (e.g., "nounspace.com", "nouns") used for API operations. This is different from `community.type` which is a semantic descriptor (e.g., "nouns", "token_platform") stored in the `community_config` JSONB field.

### 5. Navigation Pages as Spaces

#### Concept

Navigation pages (like `/home` and `/explore`) are **not** stored in the database config. Instead, they are stored as **Spaces** in Supabase Storage and referenced by navigation items via `spaceId`.

#### Navigation Item Structure

```typescript
interface NavigationItem {
  id: string;
  label: string;
  href: string;              // e.g., "/home"
  icon?: string;             // react-icons name (e.g., "FaHome") or custom URL
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
- `src/app/[navSlug]/[[...tabName]]/NavPageSpace.tsx` - Client component for rendering
- `src/config/systemConfig.ts` - `NavPageConfig` type definition

**Related Documentation:**
- See [Navigation System](../NAVIGATION/OVERVIEW.md) for details on the navigation editor
- See [Space Architecture](../SPACES/SPACE_ARCHITECTURE.md) for details on how Spaces work
- See [Public Spaces Pattern](../SPACES/PUBLIC_SPACES_PATTERN.md) for the server/client separation pattern

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

1. **Direct Header-Based Domain Detection** - Domain resolution using Next.js `headers()` API
2. **Runtime Database Loading** - All configs from Supabase
3. **Navigation-Space References** - Pages stored as Spaces
4. **NavPageConfig Type** - Unified type for navigation pages
5. **community_domains Table** - Database-backed domain mappings (replaces hardcoded maps)
6. **Application-Level Config Transformation** - Config transformation in code, not RPC function

### Simplified Components

1. **Config Loading** - Single `RuntimeConfigLoader` (no factory)
2. **Space Creators** - Synchronous, Nouns-only implementations
3. **Type System** - `NavPageConfig` replaces `HomePageConfig | ExplorePageConfig`
4. **Community Resolution** - Clear priority order

---

## Data Flow Examples

### Example 1: Loading Config for `example.nounspace.com`

```
1. Server Component calls loadSystemConfig()
   └─ Reads host header: "example.nounspace.com"
   └─ Normalizes domain: "example.nounspace.com"

2. Domain Resolution
   └─ Checks community_domains table for "example.nounspace.com"
   └─ If not found, uses domain as community_id: "example.nounspace.com"
   └─ If found, uses mapped community_id from table

3. Config Loading
   └─ Queries community_configs table for resolved community_id
   └─ Transforms database row to SystemConfig format
   └─ Loads domain mappings from community_domains table
   └─ Merges with themes from shared/themes.ts
   └─ Returns SystemConfig

4. Component renders with example community config
```

### Example 2: Navigating to `/home` Page

```
1. Request: example.nounspace.com/home
   └─ Server Component reads host header: "example.nounspace.com"

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
- `SUPABASE_SERVICE_KEY` - Service role key (for seeding/admin operations)

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
- `src/app/[navSlug]/[[...tabName]]/page.tsx` - Dynamic navigation (Server Component)
- `src/app/[navSlug]/[[...tabName]]/NavPageSpace.tsx` - Client component for rendering
- `src/app/layout.tsx` - Root layout that loads config and passes to client components
- `src/common/components/organisms/ClientSidebarWrapper.tsx` - Client wrapper for Sidebar
- `src/common/components/organisms/ClientMobileHeaderWrapper.tsx` - Client wrapper for MobileHeader
- `src/common/components/organisms/navigation/NavigationEditor.tsx` - Navigation editor UI
- `src/common/components/organisms/navigation/useNavigation.ts` - Navigation management hook
- `src/common/data/stores/app/navigation/navigationStore.ts` - Navigation Zustand store
- `src/pages/api/navigation/config.ts` - Navigation config API endpoint

### Database
- `supabase/migrations/20251129172847_create_community_configs.sql` - Community configs schema
- `supabase/migrations/20260215000000_add_community_domains_and_domain_fields.sql` - Domain mappings schema
- `scripts/seed.ts` - Unified seeding script (replaces all individual seed scripts)

### Space Creators
- `src/config/nouns/initialSpaces/` - Nouns implementations
- `src/config/index.ts` - Re-exports

---

## Future Considerations

1. **Versioning**: Database function supports multiple versions (orders by `updated_at`)
2. **Admin UI**: Navigation editor provides admin interface for navigation config updates (see [Navigation System](../NAVIGATION/OVERVIEW.md))
4. **Validation**: Could add JSON schema validation for configs
5. **Rollback**: Could add version history and rollback capabilities
