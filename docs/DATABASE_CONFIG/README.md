# Database-Backed Configuration System

This directory contains all documentation for the database-backed configuration system.

## Documentation Files

### Getting Started
- **`QUICK_START_IMPLEMENTATION.md`** - Quick start guide for a 4-hour proof of concept
- **`QUICK_START_TESTING.md`** - Step-by-step testing guide

### Architecture & Implementation
- **`DATABASE_CONFIG_GUIDE.md`** - Architecture overview, database schema, and key design decisions
- **`DATABASE_CONFIG_IMPLEMENTATION.md`** - Detailed phase-by-phase implementation plan (Phases 0-4)
- **`INCREMENTAL_IMPLEMENTATION_PLAN.md`** - Complete implementation plan with all 10 phases

### Reference
- **`DATABASE_CONFIG_CONSOLIDATION.md`** - Summary of documentation consolidation and what changed

## Quick Navigation

**New to the system?**
1. Start with `DATABASE_CONFIG_GUIDE.md` - Understand the architecture
2. Then `QUICK_START_IMPLEMENTATION.md` - Try the quick POC
3. Then `QUICK_START_TESTING.md` - Test it

**Ready to implement?**
1. Read `DATABASE_CONFIG_IMPLEMENTATION.md` - Phases 0-4
2. Or `INCREMENTAL_IMPLEMENTATION_PLAN.md` - All 10 phases

## Current Architecture

- **Config Storage**: Supabase `community_configs` table (~2.8 KB per config)
- **Build-Time Loading**: Configs fetched during build, stored in `NEXT_PUBLIC_BUILD_TIME_CONFIG` env var
- **Shared Themes**: Stored in `src/config/shared/themes.ts` (not in DB)
- **Pages as Spaces**: homePage/explorePage stored as Spaces, referenced by navigation items
- **Space Seeding**: Space registrations created in `seed.sql`, config files uploaded via `scripts/seed-navpage-spaces.ts`
- **Zero Runtime Queries**: All configs loaded at build time

## Related Files

- **Migrations**: 
  - `supabase/migrations/20251129172847_create_community_configs.sql` - Creates config table
  - `supabase/migrations/20251129172848_add_navpage_space_type.sql` - Adds navPage spaceType
- **Seed Data**: 
  - `supabase/seed.sql` - Seeds configs and creates navPage space registrations
  - `scripts/seed-navpage-spaces.ts` - Uploads space config files to storage (run after seed.sql)
- **Build Config**: `next.config.mjs` (loads config at build time)
- **Config Loader**: `src/config/index.ts` (reads from env var)

