# Administrative Scripts

This document describes the scripts available in the `scripts/` directory for database seeding, migrations, and maintenance tasks.

## Overview

```
scripts/
├── lib/                      # Shared utilities
│   ├── index.ts             # Exports all utilities
│   ├── supabase.ts          # Supabase client setup
│   ├── storage.ts           # Storage upload utilities
│   ├── images.ts            # Image/asset upload utilities
│   └── explore-config.ts    # Explore page configuration
├── seed-data/               # Seed data files
│   └── ...
├── seed.ts                  # Main seeding script
├── migrate-assets.ts        # Asset migration script
└── cleanup-orphaned-tabs.ts # Orphaned tab cleanup
```

## Running Scripts

All scripts use `tsx` for TypeScript execution:

```bash
# Run with local .env
tsx scripts/seed.ts

# Run against production (prompts for credentials)
tsx scripts/seed.ts --env production

# Preview changes without executing
tsx scripts/cleanup-orphaned-tabs.ts --dry-run
```

## Environment Configuration

### Local Development

Scripts automatically load credentials from `.env` files in this order:
1. `.env.local`
2. `.env.development.local`
3. `.env`

Required variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### Remote Environments

Use the `--env` flag to target remote environments:

```bash
tsx scripts/seed.ts --env production
```

This will prompt for credentials interactively:
```
🌐 Targeting remote environment: production
Please enter the Supabase credentials for this environment:

NEXT_PUBLIC_SUPABASE_URL: https://prod.supabase.co
SUPABASE_SERVICE_KEY: ****
```

## Available Scripts

### seed.ts

Seeds the database with initial data including navigation pages, explore page, and default configurations.

```bash
# Seed local database
tsx scripts/seed.ts

# Seed production
tsx scripts/seed.ts --env production
```

**What it does:**
1. Creates `spaceRegistrations` entries for navigation pages (home, explore)
2. Uploads navigation page configurations to storage
3. Sets up default tab orders
4. Uploads any required assets

### migrate-assets.ts

Migrates assets between storage buckets or environments.

```bash
tsx scripts/migrate-assets.ts
tsx scripts/migrate-assets.ts --env production
```

**Use cases:**
- Moving assets from development to production
- Reorganizing storage structure
- Batch asset updates

### cleanup-orphaned-tabs.ts

Finds and deletes tab files that are not referenced in their space's `tabOrder`.

```bash
# Preview what would be deleted
tsx scripts/cleanup-orphaned-tabs.ts --dry-run

# Preview with debug output
tsx scripts/cleanup-orphaned-tabs.ts --dry-run --debug

# Actually delete orphaned tabs (local)
tsx scripts/cleanup-orphaned-tabs.ts

# Clean up production
tsx scripts/cleanup-orphaned-tabs.ts --env production
```

**Flags:**
- `--dry-run` - Preview changes without deleting
- `--debug` - Show detailed debug output
- `--env <name>` - Target a specific environment

**How it works:**
1. Queries `spaceRegistrations` table for all space IDs
2. For each space, reads the `tabOrder` file
3. Lists all files in the space's `tabs/` folder
4. Identifies tabs not in `tabOrder` (orphaned)
5. Deletes orphaned tab files (unless `--dry-run`)

**Output example:**
```
🧹 Orphaned Tab Cleanup Script
================================

🔍 DRY RUN MODE - No files will be deleted

📂 Listing spaces...
   Found 150 space(s)

📁 Space: abc-123-def
   Tab order: [Home, Gallery]
   Tab files: [Home, Gallery, OldTab]
   Orphaned:  [OldTab]

📊 Summary
==========
   Spaces processed: 150
   Spaces with orphans: 3
   Total orphaned tabs: 5

📋 Orphaned tabs to delete:
   - abc-123-def/tabs/OldTab
   - ...

⚠️  Dry run - no files were deleted
   Run without --dry-run to delete these files
```

## Shared Utilities (scripts/lib/)

### supabase.ts

Provides Supabase client initialization with support for local and remote environments.

```typescript
import { supabase, initializeSupabase, targetEnv } from './lib';

// Must call before using supabase if using --env flag
await initializeSupabase();

// Now safe to use
const { data } = await supabase.from('spaces').select('*');
```

### storage.ts

Utilities for uploading space configurations to storage.

```typescript
import { uploadPageConfig, createNavPageSpace, getSpaceId } from './lib';

// Create a navigation page space registration
const spaceId = await createNavPageSpace('explore');

// Upload tab configurations
await uploadPageConfig('explore', {
  defaultTab: 'Home',
  tabOrder: ['Home', 'Trending'],
  tabs: {
    Home: { /* SpaceConfig */ },
    Trending: { /* SpaceConfig */ },
  },
});
```

### images.ts

Utilities for uploading images and assets.

```typescript
import { uploadToSupabaseStorage, ensureImagesBucket } from './lib';

// Ensure the images bucket exists
await ensureImagesBucket();

// Upload an image
const url = await uploadToSupabaseStorage(
  'images',
  'logos/community-logo.png',
  imageBuffer
);
```

## Creating New Scripts

Template for a new administrative script:

```typescript
#!/usr/bin/env tsx
/**
 * Script Description
 *
 * Usage:
 *   tsx scripts/my-script.ts
 *   tsx scripts/my-script.ts --env production
 *   tsx scripts/my-script.ts --dry-run
 */

import { supabase, initializeSupabase, targetEnv } from './lib';

// Parse CLI flags
const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  debug: args.includes('--debug'),
};

async function main() {
  console.log('🚀 My Script');
  console.log('============\n');

  if (flags.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  if (targetEnv) {
    console.log(`🌐 Target environment: ${targetEnv}\n`);
  }

  // Initialize Supabase (required for --env flag)
  await initializeSupabase();

  // Your script logic here
  // ...

  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

## Best Practices

1. **Always use `--dry-run` first** - Preview changes before executing destructive operations

2. **Use `--debug` for troubleshooting** - When scripts don't behave as expected

3. **Back up before production runs** - Especially for cleanup/migration scripts

4. **Test locally first** - Run against local Supabase before production

5. **Check output carefully** - Review the summary before confirming destructive actions

## Troubleshooting

### "Missing required environment variables"

Ensure your `.env` file contains:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

### "Error listing spaces from database"

Check that:
- Your Supabase credentials are correct
- The `spaceRegistrations` table exists
- Your service key has appropriate permissions

### Script hangs on credential prompt

When using `--env`, the script waits for interactive input. Make sure you're running in a terminal that supports input.

## Related Documentation

- [Supabase Integration](../INTEGRATIONS/SUPABASE.md) - Database and storage details
- [Tab Operations](../SYSTEMS/SPACES/TAB_OPERATIONS.md) - How tabs work
- [Development Guide](../DEVELOPMENT/DEVELOPMENT_GUIDE.md) - Local setup
