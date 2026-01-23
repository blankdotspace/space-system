# Getting Started

This guide walks you through setting up Blankspace for local development, including database setup and seeding.

## Prerequisites

- **Node.js** v22.11.0 or later
- **yarn** package manager
- **Git**
- **Docker** (for local Supabase instance)
- **Supabase CLI** (install with `brew install supabase/tap/supabase` or `npm install -g supabase`)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/blankdotspace/space-system.git
cd space-system

# Install dependencies
yarn install
```

## Step 2: Start Local Supabase

Start the local Supabase instance (this will start Docker containers):

```bash
supabase start
```

This will:
- Start PostgreSQL database
- Start Supabase API server
- Start Supabase Studio (admin UI)
- Display connection credentials

**Note:** The first time you run `supabase start`, it will download Docker images and may take a few minutes.

### Access Local Supabase

After starting, you'll see output like:

```
API URL: http://localhost:54321
GraphQL URL: http://localhost:54321/graphql/v1
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- **Supabase Studio**: http://localhost:54323 (admin UI)
- **API URL**: http://localhost:54321

## Step 3: Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

### Required Environment Variables

Configure the following in `.env.local` using the credentials from `supabase start`:

```bash
# Supabase Local (Required - use values from `supabase start` output)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_KEY=your-local-service-role-key

# Authentication (Required)
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id

# Farcaster (Required)
NEXT_PUBLIC_NEYNAR_API_KEY=your-neynar-api-key

# Community Override (Optional - for local testing)
NEXT_PUBLIC_TEST_COMMUNITY=nouns

# ImgBB (Optional - only needed for asset uploads during seeding)
NEXT_PUBLIC_IMGBB_API_KEY=your-imgbb-api-key
```

### Getting Local Supabase Credentials

After running `supabase start`, the credentials are displayed in the terminal output. You can also get them anytime with:

```bash
supabase status
```

Copy the `anon key` and `service_role key` to your `.env.local` file.

## Step 4: Run Migrations

With the local Supabase instance running, apply database migrations:

```bash
# Apply all migrations
supabase db reset
```

This will:
1. Reset the database (clears all data)
2. Run all migrations in `supabase/migrations/`
3. Run the seed SQL from `supabase/seed.sql`

**Note:** `supabase db reset` is safe for local development - it resets your local database and applies all migrations and seeds.

Alternatively, if you want to apply migrations without resetting:

```bash
# Apply migrations only (without reset)
supabase migration up
```

## Step 5: Seed the Database

After migrations are complete, seed the database with community configs and navigation pages:

```bash
# Full seeding (uploads assets, seeds configs, uploads navPage spaces)
yarn seed

# Or use tsx directly
tsx scripts/seed.ts
```

### Seeding Options

```bash
# Check if database is already seeded
yarn seed:check
# or
tsx scripts/seed.ts --check

# Skip asset upload (use existing URLs)
tsx scripts/seed.ts --skip-assets
```

### What the Seed Script Does

1. **Uploads Nouns assets to ImgBB** (if `NEXT_PUBLIC_IMGBB_API_KEY` is set)
2. **Creates storage buckets** (if needed)
3. **Creates navPage space registrations** (home, explore pages)
4. **Seeds community configs** (nouns, example, clanker)
5. **Uploads navPage space configs** to Supabase Storage

## Step 6: Start Development Server

```bash
yarn dev
```

The app will be available at `http://localhost:3000`

### Testing Different Communities

By default, the app loads the community specified in `NEXT_PUBLIC_TEST_COMMUNITY` (or defaults to `nouns`).

To test a different community:

```bash
# Test 'example' community
NEXT_PUBLIC_TEST_COMMUNITY=example yarn dev

# Test 'clanker' community
NEXT_PUBLIC_TEST_COMMUNITY=clanker yarn dev
```

Or use localhost subdomains:

```bash
# Visit example.localhost:3000 (requires /etc/hosts setup)
# Or use a tool like localhost.run for subdomain support
```

## Step 7: Verify Setup

1. **Check seeding status:**
   ```bash
   yarn seed:check
   ```

2. **Visit the app:**
   - Open `http://localhost:3000`
   - You should see the Nouns community homepage

3. **Check navigation:**
   - Home page should load (`/home`)
   - Explore page should load (`/explore`)
   - No 404 errors

## Common Issues

### "Community ID is required for runtime config loading"

**Solution:** Set `NEXT_PUBLIC_TEST_COMMUNITY` in your `.env.local`:
```bash
NEXT_PUBLIC_TEST_COMMUNITY=nouns
```

### "Failed to load config from database"

**Possible causes:**
1. Local Supabase not running - Run `supabase start`
2. Database not seeded - Run `yarn seed`
3. Wrong Supabase credentials - Verify in `.env.local` (should use local values from `supabase start`)
4. Migrations not run - Run `supabase db reset`

**Solution:**
```bash
# Check if seeded
yarn seed:check

# Re-seed if needed
yarn seed
```

### Navigation pages return 404

**Solution:** Ensure navPage spaces are uploaded:
```bash
# Re-run seeding (will skip existing data)
yarn seed
```

### Build errors about missing config

**Solution:** The app requires a seeded database. Ensure:
1. Migrations are run
2. Database is seeded (`yarn seed`)
3. `NEXT_PUBLIC_TEST_COMMUNITY` is set

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (spaces)/          # Space-related routes
│   ├── [navSlug]/         # Dynamic navigation pages (home, explore, etc.)
│   ├── api/               # API routes
│   ├── notifications/     # Notifications
│   ├── privacy/           # Privacy page
│   ├── pwa/               # PWA configuration
│   └── terms/             # Terms page
├── authenticators/         # Authentication system
├── common/                # Shared code
│   ├── components/        # UI components (atomic design)
│   ├── data/              # State management
│   ├── fidgets/           # Core fidget functionality
│   ├── lib/               # Utilities and helpers
│   └── providers/         # React context providers
├── constants/             # Application constants
├── contracts/             # Blockchain contract interfaces
├── fidgets/               # Mini-applications
├── pages/                 # Legacy Next.js pages
└── styles/                # Global styles
```

## Key Concepts

### Spaces
Spaces are customizable hubs that users can personalize with themes, tabs, and fidgets.

### Fidgets
Mini-applications that can be added to spaces to provide specific functionality.

### Themes
Visual customization system that allows users to personalize their spaces.

### Authentication
The app uses Privy for authentication with Farcaster integration for social features.

## Development Workflow

1. **Make changes** to the codebase
2. **Run linting** with `yarn lint`
3. **Check types** with `yarn check-types`
4. **Test changes** with `yarn test`
5. **Create a PR** following the [Contributing](CONTRIBUTING.md) guidelines

## Managing Local Supabase

```bash
# Start Supabase
supabase start

# Check status
supabase status

# Stop Supabase
supabase stop

# Reset database (clears data, runs migrations + seed.sql)
supabase db reset

# View logs
supabase logs
```

## Quick Reference

```bash
# Setup (one-time)
yarn install
cp .env.example .env.local
supabase start  # Start local Supabase (Docker)
# Copy credentials from supabase start output to .env.local
supabase db reset  # Run migrations and seed SQL
yarn seed  # Seed community configs and navPage spaces

# Development (daily)
supabase start  # Start Supabase if not running
yarn dev

# Check seeding
yarn seed:check

# Re-seed (if needed)
yarn seed

# Stop Supabase (when done)
supabase stop
```

## Next Steps

- Read the [Architecture Overview](ARCHITECTURE/OVERVIEW.md) to understand the system
- Check out [Fidget Development Guide](SYSTEMS/FIDGETS/DEVELOPMENT_GUIDE.md) to create fidgets
- Review [Component Architecture](DEVELOPMENT/COMPONENT_ARCHITECTURE.md) for UI development
- Check [Configuration System](SYSTEMS/CONFIGURATION/ARCHITECTURE_OVERVIEW.md) for how configs work
- Review [Project Structure](PROJECT_STRUCTURE.md) to understand the codebase
