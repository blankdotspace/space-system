# Configuration Guide

Nounspace uses a **database-backed configuration system** that allows community configurations to be stored in Supabase and loaded at build time. This provides admin-editable configs with zero runtime database queries.

## Database-Backed Configuration System

For complete documentation on how the configuration system works, see:
- **[Configuration System Overview](SYSTEMS/CONFIGURATION/OVERVIEW.md)** - Complete description of the database-backed configuration system

## Environment Variables

The application uses environment variables to configure community-specific settings and external services.

### Community Configuration

The most important environment variable for whitelabeling is:

```bash
NEXT_PUBLIC_COMMUNITY=nouns
```

This determines which community configuration to load. Available options:
- `nouns` (default) - Uses the Nouns community configuration
- `example` - Uses the example community configuration template
- `clanker` - Uses the Clanker community configuration

### Required Environment Variables

```bash
# Community Configuration
NEXT_PUBLIC_COMMUNITY=nouns

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

The application loads configurations in the following order:

1. **Database Config** (if available): Fetched from Supabase during build, stored in `NEXT_PUBLIC_BUILD_TIME_CONFIG` env var
2. **Static Config Fallback**: Falls back to static TypeScript configs if database is unavailable

See [Configuration System Overview](SYSTEMS/CONFIGURATION/OVERVIEW.md) for details on the build-time loading process.

## Configuration Structure

Configurations are stored in Supabase and loaded at build time. Static TypeScript configs serve as fallback. The structure is organized into community-specific folders:

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
├── systemConfig.ts           # System configuration interface
├── initialSpaceConfig.ts     # Base space configuration
└── index.ts                  # Main configuration loader (reads from DB or static)
```

**Note:** Themes are stored in `shared/themes.ts` and pages (homePage/explorePage) are stored as Spaces in Supabase Storage. See [Configuration System Overview](SYSTEMS/CONFIGURATION/OVERVIEW.md) for details.

## Build-Time Configuration

The system uses build-time configuration to determine which community configuration to use. This means:

1. **Environment Variable**: Set `NEXT_PUBLIC_COMMUNITY` at build time
2. **Build Process**: The configuration is baked into the build
3. **No Runtime Switching**: The configuration cannot be changed after build

### Building Different Communities

**For Nouns community (default):**
```bash
npm run build
# or explicitly
NEXT_PUBLIC_COMMUNITY=nouns npm run build
```

**For Example community:**
```bash
NEXT_PUBLIC_COMMUNITY=example npm run build
```

**For Clanker community:**
```bash
NEXT_PUBLIC_COMMUNITY=clanker npm run build
```

### Development

**For Nouns development:**
```bash
npm run dev
# or explicitly
NEXT_PUBLIC_COMMUNITY=nouns npm run dev
```

**For Example development:**
```bash
NEXT_PUBLIC_COMMUNITY=example npm run dev
```

### What Gets Configured

When you set `NEXT_PUBLIC_COMMUNITY=example` (or `clanker`), the system will:

1. **Load that community's system config** from Supabase (brand, assets, community settings, fidgets, navigation, UI)
2. **Load shared themes** from `src/config/shared/themes.ts`
3. **Load navigation pages** as Spaces from Supabase Storage (referenced by navigation items)
4. **Use that community's initial space templates** (profile, channel, token, proposal, homebase)

If the database is unavailable, the system falls back to static TypeScript configs.

## Adding New Community Configurations

To add a new community configuration:

1. **Create database entry**: Insert a new row in the `community_configs` table with your community's configuration
2. **Create static fallback** (optional): Create a new folder under `src/config/` (e.g., `src/config/mycommunity/`) as a fallback
3. **Add to available configs**: Add the new configuration to the `AVAILABLE_CONFIGURATIONS` array in `src/config/index.ts`
4. **Create navigation spaces**: If your community has navigation pages, create `navPage` type spaces in `spaceRegistrations` and upload their configs to Storage
5. **Update seed data**: Add seed data in `supabase/seed.sql` for the new community

See [Configuration System Overview](SYSTEMS/CONFIGURATION/OVERVIEW.md) for detailed instructions.

## Development vs Production

- **Development**: Uses local environment variables from `.env.local` or `.env`
- **Production**: Uses environment variables set in your deployment platform (Vercel, etc.)

## Configuration Validation

The system includes built-in validation that:
- Checks if the provided community configuration is valid
- Logs warnings for invalid configurations
- Provides helpful error messages with available options
- Always falls back to a working configuration (nouns)
