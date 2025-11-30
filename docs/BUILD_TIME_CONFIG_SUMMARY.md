# Build-Time Configuration System - Quick Summary

## Overview

Configurations are stored in the database for admin updates, but fetched at **build time** and generated as static TypeScript files. Runtime has zero database queries.

## Architecture Flow

```
┌─────────────────┐
│   Admin UI      │
│  (Updates DB)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Database      │
│  (Stores Config)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Build Process  │─────▶│ Generate TS Files │
│ (prebuild hook) │      │  from DB Configs  │
└─────────────────┘      └─────────┬──────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  Static TS Files  │
                          │  (in src/config/) │
                          └─────────┬──────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │   Runtime App    │
                          │ (Uses Static Files│
                          │  Zero DB Queries) │
                          └──────────────────┘
```

## Key Components

### 1. Database Tables
- `community_configs` - Active configs
- `community_config_history` - Version history
- `community_config_admins` - Admin permissions

### 2. Build Script
- `scripts/generate-configs.ts` - Fetches from DB, generates TS files
- Runs before every build via `prebuild` hook
- Falls back to static configs if DB unavailable

### 3. Generated Files
- `src/config/{community}/{community}.{section}.ts` - Generated from DB
- `src/config/{community}/index.ts` - Main export
- Structure matches existing static configs exactly

### 4. Runtime
- Uses generated static files (same as before)
- Zero database queries
- Fallback to static configs if generation failed

## Workflow

### Admin Updates Config
1. Admin edits config in admin UI
2. Changes saved to database
3. Admin clicks "Trigger Rebuild"
4. CI/CD rebuilds application
5. Build process fetches latest configs from DB
6. Generates static TypeScript files
7. Next.js build uses generated files
8. Deploy with new configs

### Build Process
```bash
npm run build
  ↓
prebuild hook runs
  ↓
scripts/generate-configs.ts
  ↓
Fetches configs from Supabase
  ↓
Generates src/config/{community}/*.ts files
  ↓
next build (uses generated files)
```

## Benefits

✅ **Zero Runtime Overhead** - No database queries in production  
✅ **Admin Updates** - Changes made through database UI  
✅ **Type Safety** - Generated TypeScript files maintain type safety  
✅ **Fast Runtime** - Static file imports are instant  
✅ **Safe Fallback** - Static configs always available  
✅ **Version History** - Full audit trail in database  
✅ **Easy Rollback** - Remove prebuild hook to use static configs  

## Migration Steps

1. **Create database schema** (migration files)
2. **Seed existing configs** to database
3. **Create generator script** (`scripts/generate-configs.ts`)
4. **Add prebuild hook** to package.json
5. **Test build process** with generated configs
6. **Create admin interface** for updates
7. **Set up rebuild trigger** (CI/CD integration)
8. **Roll out gradually** (one community at a time)

## Environment Variables

**Required for Build:**
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  # Or SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_COMMUNITY=nouns  # Which community to build
```

**Optional:**
```bash
GENERATE_CONFIGS=nouns,clanker,example  # Which configs to generate
```

## File Structure

```
src/config/
├── {community}/              # Generated from DB at build time
│   ├── {community}.brand.ts
│   ├── {community}.assets.ts
│   ├── {community}.theme.ts
│   ├── ...
│   └── index.ts
├── index.ts                  # Main loader (uses generated files)
└── systemConfig.ts           # Type definitions

scripts/
└── generate-configs.ts       # Build-time generator
```

## Rollback

If issues arise:
1. Remove `prebuild` hook from package.json
2. Build uses static configs directly
3. No runtime impact

## Next Steps

See `DATABASE_CONFIG_MIGRATION_PLAN.md` for complete implementation details.

