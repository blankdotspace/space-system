# Configuration Guide

Nounspace uses a **database-backed configuration system** with **domain-based multi-tenant support**. Community configurations are stored in Supabase and loaded dynamically based on the request domain, enabling a single deployment to serve multiple communities.

## Database-Backed Configuration System

For complete documentation on how the configuration system works, see:
- **[Architecture Overview](SYSTEMS/CONFIGURATION/ARCHITECTURE_OVERVIEW.md)** - Complete description of the database-backed configuration system

## Environment Variables

The application uses environment variables to configure community-specific settings and external services.

### Community Configuration

The system automatically detects the community from the request domain via middleware. For local development, you can set:

```bash
NEXT_PUBLIC_TEST_COMMUNITY=nouns
```

**Available communities:**
- `nouns`
- `example`
- `clanker`

**Note:** In production, the community is automatically detected from the domain (e.g., `example.nounspace.com` → `example`). For local development, use `NEXT_PUBLIC_TEST_COMMUNITY` or localhost subdomains (e.g., `example.localhost:3000`).

### Required Environment Variables

```bash
# Community Configuration (for local development only)
# NEXT_PUBLIC_TEST_COMMUNITY=nouns  # Optional: override community for local testing

# Database Configuration (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Authentication Configuration (Privy)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here

# Blockchain Configuration
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# Neynar API Configuration
NEYNAR_API_KEY=your_neynar_api_key_here

# Application URLs
NEXT_PUBLIC_WEBSITE_URL=http://localhost:3000
```

## Configuration Loading

The application uses **server-only runtime loading** from Supabase. Config is fetched from the database at runtime based on the request domain, enabling multi-tenant support.

### Server-Only Architecture

**Important:** `loadSystemConfig()` is **server-only** and can only be called from Server Components. Client components receive config via the `systemConfig` prop.

**Pattern:**
```typescript
// ✅ Server Component
export default async function MyServerComponent() {
  const systemConfig = await loadSystemConfig();
  return <ClientComponent systemConfig={systemConfig} />;
}

// ✅ Client Component
"use client";
type Props = { systemConfig: SystemConfig };
export function MyClientComponent({ systemConfig }: Props) {
  const { brand, assets } = systemConfig;
  // Use config...
}
```

See [Architecture Overview](SYSTEMS/CONFIGURATION/ARCHITECTURE_OVERVIEW.md) for complete details.

## Configuration Structure

Configurations are stored in Supabase and loaded dynamically. Static TypeScript configs serve as fallback. The structure is organized into community-specific folders:

```
src/config/
├── nouns/                    # Nouns community configuration (fallback)
│   ├── nouns.brand.ts        # Brand identity
│   ├── nouns.assets.ts       # Visual assets
│   ├── nouns.community.ts    # Community integration
│   ├── nouns.fidgets.ts      # Fidget management
│   ├── nouns.home.ts         # Home page configuration (legacy)
│   ├── nouns.explore.ts      # Explore page configuration (legacy)
│   ├── nouns.navigation.ts   # Navigation config
│   ├── nouns.theme.ts        # Theme config (references shared)
│   ├── nouns.ui.ts           # UI colors
│   ├── initialSpaces/        # Initial space templates
│   └── index.ts              # Configuration export
├── clanker/                  # Clanker community configuration (fallback)
├── example/                  # Example community configuration (fallback)
├── shared/                   # Shared configuration
│   └── themes.ts            # Shared theme definitions (all communities)
├── loaders/                  # Configuration loading
│   ├── types.ts             # Loader interfaces
│   ├── registry.ts          # Domain resolution
│   ├── runtimeLoader.ts     # Runtime config loader
│   ├── factory.ts           # Loader factory
│   └── index.ts             # Public API
├── systemConfig.ts           # System configuration interface
├── initialSpaceConfig.ts     # Base space configuration
└── index.ts                  # Main configuration loader
```

**Note:** Themes are stored in `shared/themes.ts` and pages (homePage/explorePage) are stored as Spaces in Supabase Storage. See [Architecture Overview](SYSTEMS/CONFIGURATION/ARCHITECTURE_OVERVIEW.md) for details.

## Domain-Based Multi-Tenant Configuration

The system uses **middleware-based domain detection** to automatically determine which community configuration to load:

1. **Middleware** detects the domain from request headers (e.g., `example.nounspace.com`)
2. **Resolves community ID** from domain (e.g., `example.nounspace.com` → `example`)
3. **Sets headers** for Server Components to read (`x-community-id`, `x-detected-domain`)
4. **Loads config** from database at runtime

### How It Works

**Request Flow:**
```
Browser Request (example.nounspace.com)
  ↓
Middleware (detects domain, sets x-community-id header)
  ↓
Server Component (reads header, loads config)
  ├─ Calls: await loadSystemConfig() ← SERVER-ONLY
  └─ Passes systemConfig as prop to Client Components
  ↓
Client Components receive systemConfig prop
  ↓
Renders with correct community config
```

**For All Communities:**
- Config loaded from Supabase database at runtime
- Supports multi-tenant (different domains → different communities)
- Single deployment serves all communities

### Development

**Testing Runtime Communities Locally:**

1. **Use localhost subdomains:**
   ```bash
   # Visit: example.localhost:3000
   # System detects 'example' from subdomain
   ```

2. **Or use environment variable override:**
   ```bash
   NEXT_PUBLIC_TEST_COMMUNITY=example npm run dev
   ```

**Testing Specific Communities:**
```bash
NEXT_PUBLIC_TEST_COMMUNITY=nouns npm run dev
```

### What Gets Configured

For each community, the system loads:

1. **System config** from Supabase (brand, assets, community settings, fidgets, navigation, UI)
2. **Shared themes** from `src/config/shared/themes.ts`
3. **Navigation pages** as Spaces from Supabase Storage (referenced by navigation items)
4. **Initial space templates** (profile, channel, token, proposal, homebase)

## Adding New Community Configurations

To add a new community configuration:

1. **Create database entry**: Insert a new row in the `community_configs` table with your community's configuration
2. **Create static fallback** (optional): Create a new folder under `src/config/` (e.g., `src/config/mycommunity/`) as a fallback
3. **Add to available configs**: Add the new configuration to the `AVAILABLE_CONFIGURATIONS` array in `src/config/index.ts`
4. **Create navigation spaces**: If your community has navigation pages, create `navPage` type spaces in `spaceRegistrations` and upload their configs to Storage
5. **Update seed data**: Add seed data in `supabase/seed.sql` for the new community

See [Architecture Overview](SYSTEMS/CONFIGURATION/ARCHITECTURE_OVERVIEW.md) for detailed instructions.

## Development vs Production

- **Development**: Uses local environment variables from `.env.local` or `.env`
- **Production**: Uses environment variables set in your deployment platform (Vercel, etc.)

## Configuration Validation

The system includes built-in validation that:
- Checks if the provided community configuration is valid
- Logs warnings for invalid configurations
- Provides helpful error messages with available options
- Always falls back to a working configuration (nouns)
