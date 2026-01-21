# Sync Local Migration State with Remote

## Method 1: Repair Migration History (Recommended)

This syncs your local migration history table to match what's actually applied on remote:

```bash
# Link to production (if not already)
supabase link --project-ref <your-project-ref>

# Repair migration history to match remote
supabase migration repair --linked --status applied <version1> <version2> ...
```

**For all your migrations:**
```bash
supabase migration repair --linked --status applied \
  20240614000356 \
  20240813232936 \
  20240821215436 \
  20240822082236 \
  20241224001632 \
  20250925135025 \
  20250925191024 \
  20250929120000 \
  20251129172847 \
  20251129172848 \
  20251209000000 \
  20251209000001 \
  20260115213458 \
  20260115220000
```

This marks all these migrations as "applied" in your local migration history, matching remote.

## Method 2: Fetch Migrations from Remote

If migrations exist in remote but not locally:

```bash
# Fetch migration files from remote history
supabase migration fetch --linked
```

This will download any migration files that exist in the remote history but not locally.

## Method 3: Pull Current Schema and Create Baseline

If you want to start fresh:

```bash
# Pull current remote schema as a migration
supabase db pull --linked baseline_from_remote

# This creates a new migration file with the current remote state
# Then you can apply your new migrations on top
```

## Method 4: Reset Local and Replay Everything

For local development, reset and replay all migrations:

```bash
# Reset local database (applies all migrations from scratch)
supabase db reset

# This will:
# 1. Drop all tables
# 2. Apply all migrations in order
# 3. Run seed.sql
```

## Recommended Workflow

### Step 1: Sync Migration History

```bash
# Check current status
supabase migration list --linked

# Repair history to match remote (mark all as applied)
supabase migration repair --linked --status applied \
  20240614000356 20240813232936 20240821215436 20240822082236 \
  20241224001632 20250925135025 20250925191024 20250929120000 \
  20251129172847 20251129172848 20251209000000 20251209000001 \
  20260115213458 20260115220000
```

### Step 2: Verify Sync

```bash
# Check that local and remote are now in sync
supabase migration list --linked
```

Both should show the same migrations as applied.

### Step 3: Apply Any New Migrations Locally

```bash
# If you have new migrations not yet applied
supabase migration up --local
```

Or reset local to replay everything:

```bash
# Reset local and replay all migrations
supabase db reset
```

## Quick One-Liner

To mark all migrations as applied (matching remote):

```bash
supabase migration repair --linked --status applied \
  20240614000356 20240813232936 20240821215436 20240822082236 \
  20241224001632 20250925135025 20250925191024 20250929120000 \
  20251129172847 20251129172848 20251209000000 20251209000001 \
  20260115213458 20260115220000
```

Then verify:
```bash
supabase migration list --linked
```

## Troubleshooting

### If repair fails

You can manually update the migration history table:

```sql
-- Connect to production database
-- Supabase Dashboard → SQL Editor

-- Check current migration history
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;

-- Manually insert missing migrations (if needed)
INSERT INTO supabase_migrations.schema_migrations (version, name, inserted_at)
VALUES 
  ('20260115220000', '20260115220000_restore_community_configs', now())
ON CONFLICT (version) DO NOTHING;
```

### If migrations are out of order

The repair command will handle this, but if you need to manually fix:

```bash
# Mark specific migration as applied
supabase migration repair --linked --status applied 20260115220000

# Or mark as reverted (if it shouldn't be applied)
supabase migration repair --linked --status reverted 20260115220000
```



