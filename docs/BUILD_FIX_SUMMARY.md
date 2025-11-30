# Build Error Fix Summary

## Issues Fixed

### 1. ✅ Removed Old Route Files

The following old route files were removed (they conflicted with the new dynamic routing):

- `src/app/explore/[slug]/page.tsx` - Was trying to access `config.explorePage.tabOrder` which doesn't exist in DB config
- `src/app/explore/page.tsx` - Was trying to access `config.explorePage.defaultTab`
- `src/app/home/[tabname]/page.tsx` - Old home route handler
- `src/app/home/page.tsx` - Old home redirect

These are all replaced by the dynamic route: `src/app/[navSlug]/[[...tabName]]/page.tsx`

### 2. ✅ Cleaned Up Empty Directories

Removed empty directories:
- `src/app/explore/[slug]/`
- `src/app/home/[tabname]/`

## Remaining Issue

### ⚠️ Space Config Files Not Uploaded to Storage

The errors you're seeing:
```
Failed to load tabOrder for space a68308a2-9dae-4ff6-9d46-fe165623be79: Error [StorageUnknownError]: {}
```

This means the space config files haven't been uploaded to Supabase Storage yet. The database has the space registrations (created by `seed.sql`), but the actual config files need to be uploaded.

## Solution: Upload Space Configs

Run the seed script to upload space config files:

```bash
# Make sure you have environment variables set
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Upload space configs to Supabase Storage
tsx scripts/seed-navpage-spaces.ts
```

This script will:
1. Read space registrations from the database
2. Import page configs from TypeScript (`nounsHomePage`, `nounsExplorePage`, etc.)
3. Upload each tab as `{spaceId}/tabs/{tabName}` to Supabase Storage
4. Upload tab order as `{spaceId}/tabOrder` to Supabase Storage

**Expected output:**
```
🚀 Starting navPage space config seeding...

📦 Uploading space: nouns-home
  📍 Space ID: a68308a2-9dae-4ff6-9d46-fe165623be79
  📄 Uploading 6 tabs...
  ✅ Uploaded tab: Nouns
  ✅ Uploaded tab: Social
  ...
  ✅ Uploaded tab order
  ✅ Successfully uploaded nouns-home

📦 Uploading space: nouns-explore
  ...
  
✅ All navPage spaces seeded successfully!
```

## After Uploading

Once the space configs are uploaded, the build should succeed. The dynamic route will be able to:
- Load spaces from Storage at build time (for static generation)
- Load spaces from Storage at runtime (for dynamic rendering)

## Verify Upload

You can verify the files were uploaded by:

1. **Supabase Dashboard**: Check the `spaces` bucket in Storage
2. **Via SQL**: The files are in Storage, not the database
3. **Build test**: Try building again - errors should be gone

## Note

The `loadSpaceAsPageConfig()` function gracefully handles missing files:
- If files don't exist, it returns `null`
- `generateStaticParams()` skips static generation for that space
- Pages will still render at runtime (with a small delay to fetch from Storage)

But for best performance, upload the files before building!

