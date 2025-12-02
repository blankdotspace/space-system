# Staging Environment Setup Guide

This guide walks you through setting up the staging environment with its own Supabase instance.

## Prerequisites

- Access to staging Supabase project
- Staging Supabase URL and Service Role Key
- Supabase CLI installed (`npm install -g supabase` or `brew install supabase/tap/supabase`)
- (Optional) ImgBB API key for asset uploads

## Step 1: Link to Remote Staging Database

**Recommended:** Link your local Supabase CLI to the remote staging project. This allows you to push migrations easily and manage the database from your local machine.

**Benefits of linking:**
- ✅ Push all migrations with a single command (`supabase db push`)
- ✅ Pull schema changes from staging (`supabase db pull`)
- ✅ Generate TypeScript types from staging schema (`supabase gen types`)
- ✅ Execute SQL files directly (`supabase db execute`)
- ✅ Manage migrations more easily

### Link to Staging Project

1. **Get your staging project reference ID:**
   - Go to your staging Supabase project dashboard
   - Navigate to **Settings** → **General**
   - Copy the **Reference ID** (looks like `abcdefghijklmnop`)

2. **Link to the remote project:**
   ```bash
   supabase link --project-ref [your-staging-project-ref]
   ```

   You'll be prompted to enter:
   - **Database password** (found in Settings → Database → Database password)
   - Or use `--password` flag: `supabase link --project-ref [ref] --password [password]`

3. **Verify the link:**
   ```bash
   supabase projects list
   ```
   You should see your staging project listed.

### Alternative: Link via Connection String

If you prefer to use a connection string:

```bash
supabase link --db-url "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

## Step 2: Run Database Migrations

Once linked, push all migrations to staging:

### Option A: Push All Migrations (Recommended)

```bash
# Push all migrations from supabase/migrations/ to staging
supabase db push
```

This will:
- ✅ Run `20251129172847_create_community_configs.sql` (community configs table)
- ✅ Run `20251129172848_add_navpage_space_type.sql` (navPage space type)
- ✅ Apply any other migrations in order

**Note:** Storage buckets need to be created separately (see below).

### Option B: Manual Migration via Dashboard

If you prefer not to link, you can run migrations manually:

1. Go to your staging Supabase project dashboard
2. Navigate to **SQL Editor**

**Migration 1: Community Configs**
3. Open `supabase/migrations/20251129172847_create_community_configs.sql`
4. Copy and paste the entire SQL into the SQL Editor
5. Click **Run**

**Migration 2: NavPage Space Type**
6. Open `supabase/migrations/20251129172848_add_navpage_space_type.sql`
7. Copy and paste the entire SQL into the SQL Editor
8. Click **Run**

## Step 3: Create Storage Buckets

Storage buckets need to be created separately. Run this SQL in the Supabase Dashboard SQL Editor:

```sql
-- Create storage buckets
INSERT INTO storage.buckets 
  ("id", "name", "created_at", "updated_at", "public", "avif_autodetection")
VALUES
  ('explore', 'explore', '2024-05-21 23:43:16.762796+00', '2024-05-21 23:43:16.762796+00', false, false),
  ('private', 'private', '2024-05-21 23:43:16.762796+00', '2024-05-21 23:43:16.762796+00', true, false),
  ('spaces', 'spaces', '2024-05-21 23:43:16.762796+00', '2024-05-21 23:43:16.762796+00', true, false)
ON CONFLICT ("id") DO NOTHING;
```

**Or if linked, you can run it via CLI:**

```bash
# Create a temporary SQL file
echo "INSERT INTO storage.buckets (id, name, created_at, updated_at, public, avif_autodetection)
VALUES
  ('explore', 'explore', '2024-05-21 23:43:16.762796+00', '2024-05-21 23:43:16.762796+00', false, false),
  ('private', 'private', '2024-05-21 23:43:16.762796+00', '2024-05-21 23:43:16.762796+00', true, false),
  ('spaces', 'spaces', '2024-05-21 23:43:16.762796+00', '2024-05-21 23:43:16.762796+00', true, false)
ON CONFLICT (id) DO NOTHING;" > /tmp/create-buckets.sql

# Execute it
supabase db execute --file /tmp/create-buckets.sql
```

**Verify Migrations:**

After running all migrations, verify they worked:

```sql
-- Check community_configs table exists
SELECT * FROM community_configs LIMIT 1;

-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'get_active_community_config';

-- Check navPage spaceType is allowed
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'valid_space_type';

-- Check storage buckets exist
SELECT id, name, public FROM storage.buckets;
```

## Step 4: Set Environment Variables

Set the following environment variables for staging:

```bash
# Required
export NEXT_PUBLIC_SUPABASE_URL="https://[your-staging-project].supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="[your-staging-service-role-key]"

# Optional (only needed if you want to upload assets to ImgBB)
export NEXT_PUBLIC_IMGBB_API_KEY="[your-imgbb-api-key]"
```

**Note:** You can also create a `.env.staging` file or set these in your deployment platform (Vercel, etc.).

## Step 5: Seed the Database

Run the unified seed script to populate the database:

```bash
# Make sure environment variables are set
tsx scripts/seed-all.ts
```

This script will:
1. ✅ Upload Nouns brand assets to ImgBB (if `NEXT_PUBLIC_IMGBB_API_KEY` is set)
2. ✅ Create storage buckets (`spaces`, `explore`, `private`)
3. ✅ Create navPage space registrations (`nouns-home`, `nouns-explore`, etc.)
4. ✅ Seed community configs (`nouns`, `example`, `clanker`)
5. ✅ Upload navPage space configs to Supabase Storage

**What Gets Seeded:**

- **Community Configs:** `nouns`, `example`, `clanker` communities
- **NavPage Spaces:** Home and explore pages for each community
- **Storage Buckets:** `spaces`, `explore`, `private` buckets

## Step 6: Verify Setup

### Verify Community Configs

```sql
-- Check community configs were seeded
SELECT community_id, is_published, updated_at 
FROM community_configs 
ORDER BY updated_at DESC;
```

### Verify NavPage Spaces

```sql
-- Check navPage spaces were created
SELECT "spaceId", "spaceName", "spaceType" 
FROM "spaceRegistrations" 
WHERE "spaceType" = 'navPage';
```

### Verify Storage Buckets

```sql
-- Check storage buckets exist
SELECT id, name, public 
FROM storage.buckets;
```

### Test the RPC Function

```sql
-- Test get_active_community_config function
SELECT get_active_community_config('nouns');
```

## Step 7: Configure Domain Mapping

The staging domain (`staging.nounspace.com`) is already configured to map to the `nouns` community in `src/config/loaders/registry.ts`:

```typescript
const DOMAIN_TO_COMMUNITY_MAP: Record<string, string> = {
  'staging.nounspace.com': 'nouns',
};
```

**No changes needed** - this is already set up!

## Step 8: Deploy Application

Deploy your application to staging with the following environment variables:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://[your-staging-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-staging-service-role-key]

# Optional (for local testing)
NEXT_PUBLIC_TEST_COMMUNITY=nouns
```

**Note:** The `SUPABASE_SERVICE_ROLE_KEY` is only needed for server-side operations. The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is what the client uses.

## Step 9: Test Staging

1. Visit `https://staging.nounspace.com`
2. The app should load the `nouns` community config
3. Check browser console for: `✅ Loading config for community: nouns (domain: staging.nounspace.com)`
4. Verify the UI shows Nouns branding, logo, navigation, etc.

## Troubleshooting

### Migration Fails

**Error:** `relation "community_configs" already exists`

**Solution:** The table already exists. You can either:
- Drop and recreate: `DROP TABLE IF EXISTS community_configs CASCADE;`
- Or skip the migration if the table structure is correct

**Error:** `check constraint "valid_space_type" of relation "spaceRegistrations" is violated by some row`

**Solution:** This happens if `seed.sql` was run before the migration that adds `navPage` to the constraint. The updated migration should handle this automatically, but if you still see the error:

**Option 1: Using Supabase CLI (if linked)**

Create a temporary SQL file and execute it:

```bash
# Create a fix SQL file
cat > /tmp/fix-space-type.sql << 'EOF'
-- Drop the constraint that's causing the error
ALTER TABLE "public"."spaceRegistrations" 
    DROP CONSTRAINT IF EXISTS valid_space_type;

-- Temporarily convert navPage rows to profile
UPDATE "public"."spaceRegistrations"
SET "spaceType" = 'profile'
WHERE "spaceType" = 'navPage';

-- Now add the channel constraint
ALTER TABLE "public"."spaceRegistrations"
    ADD CONSTRAINT valid_space_type CHECK (
        "spaceType" IN ('profile', 'token', 'proposal', 'channel')
    );
EOF

# Execute it
supabase db execute --file /tmp/fix-space-type.sql
```

**Option 2: Using Supabase Dashboard**

1. Go to your staging Supabase project dashboard
2. Navigate to **SQL Editor**
3. Paste the SQL:
   ```sql
   -- Drop the constraint that's causing the error
   ALTER TABLE "public"."spaceRegistrations" 
       DROP CONSTRAINT IF EXISTS valid_space_type;
   
   -- Temporarily convert navPage rows to profile
   UPDATE "public"."spaceRegistrations"
   SET "spaceType" = 'profile'
   WHERE "spaceType" = 'navPage';
   
   -- Now add the channel constraint
   ALTER TABLE "public"."spaceRegistrations"
       ADD CONSTRAINT valid_space_type CHECK (
           "spaceType" IN ('profile', 'token', 'proposal', 'channel')
       );
   ```
4. Click **Run**

**Option 3: Using psql (if you have direct access)**

```bash
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" -c "
ALTER TABLE \"public\".\"spaceRegistrations\" DROP CONSTRAINT IF EXISTS valid_space_type;
UPDATE \"public\".\"spaceRegistrations\" SET \"spaceType\" = 'profile' WHERE \"spaceType\" = 'navPage';
ALTER TABLE \"public\".\"spaceRegistrations\" ADD CONSTRAINT valid_space_type CHECK (\"spaceType\" IN ('profile', 'token', 'proposal', 'channel'));
"
```

After running the fix, continue with migrations:
```bash
supabase db push
```

### Seed Script Fails

**Error:** `Missing required environment variables`

**Solution:** Make sure both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://[your-project].supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="[your-key]"
```

### Assets Not Uploading

**Warning:** `⚠️ NEXT_PUBLIC_IMGBB_API_KEY not set, skipping upload`

**Solution:** This is optional. If you want to upload assets to ImgBB:
1. Get an ImgBB API key from https://api.imgbb.com/
2. Set `NEXT_PUBLIC_IMGBB_API_KEY` environment variable
3. Re-run the seed script

**Note:** If you skip ImgBB uploads, the seed script will use local asset paths (`/images/nouns/...`). Make sure these assets exist in your `public/images/` directory.

### Config Not Loading

**Error:** `❌ Community ID is required for runtime config loading`

**Solution:** 
1. Verify domain mapping in `src/config/loaders/registry.ts`
2. Check middleware is running (should see `x-community-id` header in Network tab)
3. Verify `staging.nounspace.com` resolves correctly

### Storage Buckets Missing

**Error:** `Bucket not found`

**Solution:** The seed script should create buckets automatically. If not, create them manually:

```sql
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES 
  ('spaces', 'spaces', true, false),
  ('explore', 'explore', false, false),
  ('private', 'private', true, false)
ON CONFLICT (id) DO NOTHING;
```

## Quick Reference

### Linking to Remote Database
```bash
# Link to staging project
supabase link --project-ref [staging-project-ref]

# Push all migrations
supabase db push
```

### Required Migrations
- `supabase/migrations/20251129172847_create_community_configs.sql`
- `supabase/migrations/20251129172848_add_navpage_space_type.sql`
- Storage buckets (run SQL from seed.sql)

### Seed Scripts
- `scripts/seed-all.ts` - Unified script (recommended)
- `scripts/seed-community-configs.ts` - Community configs only
- `scripts/seed-navpage-spaces.ts` - NavPage spaces only

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL          # Staging Supabase URL
SUPABASE_SERVICE_ROLE_KEY         # Staging service role key
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Staging anon key (for app)
NEXT_PUBLIC_IMGBB_API_KEY        # Optional: for asset uploads
```

### Domain Mapping
- `staging.nounspace.com` → `nouns` (configured in `src/config/loaders/registry.ts`)

## Next Steps

After setup is complete:

1. ✅ Verify staging domain loads correctly
2. ✅ Test navigation pages (`/home`, `/explore`)
3. ✅ Verify assets load (logos, icons, etc.)
4. ✅ Test community switching (if multiple communities are seeded)
5. ✅ Set up CI/CD to automatically run migrations on deploy (optional)

## Related Documentation

- [Configuration System Overview](SYSTEMS/CONFIGURATION/ARCHITECTURE_OVERVIEW.md)
- [Testing Config Loading](TESTING_CONFIG_LOADING.md)
- [Configuration Guide](CONFIGURATION.md)

