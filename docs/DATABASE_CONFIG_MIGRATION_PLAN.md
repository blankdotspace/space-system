# Database-Backed Configuration System Migration Plan

## Overview

This document outlines the approach for migrating the community configuration system from build-time static files to a database-backed system that can be updated by admins in real-time.

## Current State

- **Build-time configuration** via `NEXT_PUBLIC_COMMUNITY` environment variable
- **Static TypeScript files** in `src/config/{community}/`
- **No runtime updates** - requires rebuild to change configuration
- **No admin interface** - changes require code deployment

## Target State

- **Database-backed configuration** stored in Supabase
- **Admin interface** for updating configurations
- **Versioning/history** for configuration changes
- **Caching layer** for performance
- **Backward compatibility** with existing code
- **Multi-community support** with active/inactive states

## Database Schema Design

### 1. Core Tables

#### `community_configs` - Main Configuration Table

```sql
CREATE TABLE "public"."community_configs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "community_id" VARCHAR(50) NOT NULL UNIQUE, -- 'nouns', 'clanker', etc.
    "is_active" BOOLEAN DEFAULT true,
    "version" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "created_by" VARCHAR(255), -- Admin identity/public key
    "updated_by" VARCHAR(255), -- Admin identity/public key
    
    -- Configuration sections as JSONB columns
    "brand_config" JSONB NOT NULL,
    "assets_config" JSONB NOT NULL,
    "theme_config" JSONB NOT NULL,
    "community_config" JSONB NOT NULL,
    "fidgets_config" JSONB NOT NULL,
    "home_page_config" JSONB NOT NULL,
    "explore_page_config" JSONB NOT NULL,
    "navigation_config" JSONB,
    "ui_config" JSONB,
    
    -- Metadata
    "notes" TEXT, -- Admin notes about this version
    "is_published" BOOLEAN DEFAULT false -- Draft vs published
);

CREATE INDEX "idx_community_configs_community_id" ON "public"."community_configs"("community_id");
CREATE INDEX "idx_community_configs_active" ON "public"."community_configs"("is_active") WHERE "is_active" = true;
CREATE INDEX "idx_community_configs_published" ON "public"."community_configs"("is_published") WHERE "is_published" = true;
```

#### `community_config_history` - Version History

```sql
CREATE TABLE "public"."community_config_history" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "community_config_id" UUID NOT NULL REFERENCES "public"."community_configs"("id") ON DELETE CASCADE,
    "version" INTEGER NOT NULL,
    "config_snapshot" JSONB NOT NULL, -- Full config snapshot
    "changed_sections" TEXT[], -- Array of section names that changed
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "created_by" VARCHAR(255),
    "change_notes" TEXT
);

CREATE INDEX "idx_config_history_community_config_id" ON "public"."community_config_history"("community_config_id");
CREATE INDEX "idx_config_history_version" ON "public"."community_config_history"("community_config_id", "version");
```

#### `community_config_admins` - Admin Permissions

```sql
CREATE TABLE "public"."community_config_admins" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "community_id" VARCHAR(50) NOT NULL,
    "admin_identity_public_key" VARCHAR(255) NOT NULL, -- Cryptographic identity
    "admin_fid" BIGINT, -- Optional Farcaster ID
    "permissions" TEXT[] DEFAULT ARRAY['read', 'write'], -- 'read', 'write', 'publish', 'delete'
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "created_by" VARCHAR(255),
    "is_active" BOOLEAN DEFAULT true,
    
    UNIQUE("community_id", "admin_identity_public_key")
);

CREATE INDEX "idx_config_admins_community" ON "public"."community_config_admins"("community_id");
CREATE INDEX "idx_config_admins_identity" ON "public"."community_config_admins"("admin_identity_public_key");
```

#### `community_config_cache` - Cache Table (Optional)

```sql
CREATE TABLE "public"."community_config_cache" (
    "community_id" VARCHAR(50) PRIMARY KEY,
    "config_data" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "cached_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX "idx_config_cache_expires" ON "public"."community_config_cache"("expires_at");
```

### 2. Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE "public"."community_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_config_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_config_admins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_config_cache" ENABLE ROW LEVEL SECURITY;

-- Public read access for active, published configs
CREATE POLICY "public_read_active_configs" ON "public"."community_configs"
    FOR SELECT
    USING ("is_active" = true AND "is_published" = true);

-- Admin read access (can see drafts)
CREATE POLICY "admin_read_all_configs" ON "public"."community_configs"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "public"."community_config_admins" cca
            WHERE cca."community_id" = "community_configs"."community_id"
            AND cca."admin_identity_public_key" = current_setting('app.current_identity_public_key', true)
            AND cca."is_active" = true
            AND 'read' = ANY(cca."permissions")
        )
    );

-- Admin write access
CREATE POLICY "admin_write_configs" ON "public"."community_configs"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."community_config_admins" cca
            WHERE cca."community_id" = "community_configs"."community_id"
            AND cca."admin_identity_public_key" = current_setting('app.current_identity_public_key', true)
            AND cca."is_active" = true
            AND 'write' = ANY(cca."permissions")
        )
    );

CREATE POLICY "admin_update_configs" ON "public"."community_configs"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "public"."community_config_admins" cca
            WHERE cca."community_id" = "community_configs"."community_id"
            AND cca."admin_identity_public_key" = current_setting('app.current_identity_public_key', true)
            AND cca."is_active" = true
            AND 'write' = ANY(cca."permissions")
        )
    );

-- History is readable by admins
CREATE POLICY "admin_read_history" ON "public"."community_config_history"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "public"."community_config_admins" cca
            JOIN "public"."community_configs" cc ON cc."id" = "community_config_history"."community_config_id"
            WHERE cca."community_id" = cc."community_id"
            AND cca."admin_identity_public_key" = current_setting('app.current_identity_public_key', true)
            AND cca."is_active" = true
            AND 'read' = ANY(cca."permissions")
        )
    );

-- Cache is publicly readable
CREATE POLICY "public_read_cache" ON "public"."community_config_cache"
    FOR SELECT
    USING ("expires_at" > now());
```

### 3. Database Functions

#### Function to Get Active Config

```sql
CREATE OR REPLACE FUNCTION "public"."get_active_community_config"(
    p_community_id VARCHAR(50)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config JSONB;
BEGIN
    SELECT jsonb_build_object(
        'brand', "brand_config",
        'assets', "assets_config",
        'theme', "theme_config",
        'community', "community_config",
        'fidgets', "fidgets_config",
        'homePage', "home_page_config",
        'explorePage', "explore_page_config",
        'navigation', "navigation_config",
        'ui', "ui_config"
    )
    INTO v_config
    FROM "public"."community_configs"
    WHERE "community_id" = p_community_id
    AND "is_active" = true
    AND "is_published" = true
    ORDER BY "version" DESC
    LIMIT 1;
    
    RETURN v_config;
END;
$$;
```

#### Function to Create Config Version

```sql
CREATE OR REPLACE FUNCTION "public"."create_config_version"(
    p_community_id VARCHAR(50),
    p_config_data JSONB,
    p_change_notes TEXT DEFAULT NULL,
    p_admin_identity VARCHAR(255) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config_id UUID;
    v_new_version INTEGER;
    v_old_config JSONB;
BEGIN
    -- Get current version
    SELECT "id", "version", jsonb_build_object(
        'brand', "brand_config",
        'assets', "assets_config",
        'theme', "theme_config",
        'community', "community_config",
        'fidgets', "fidgets_config",
        'homePage', "home_page_config",
        'explorePage', "explore_page_config",
        'navigation', "navigation_config",
        'ui', "ui_config"
    )
    INTO v_config_id, v_new_version, v_old_config
    FROM "public"."community_configs"
    WHERE "community_id" = p_community_id
    AND "is_active" = true
    ORDER BY "version" DESC
    LIMIT 1;
    
    -- Increment version
    v_new_version := COALESCE(v_new_version, 0) + 1;
    
    -- If config exists, archive old version
    IF v_config_id IS NOT NULL THEN
        INSERT INTO "public"."community_config_history" (
            "community_config_id",
            "version",
            "config_snapshot",
            "created_by",
            "change_notes"
        ) VALUES (
            v_config_id,
            v_new_version - 1,
            v_old_config,
            p_admin_identity,
            p_change_notes
        );
        
        -- Deactivate old version
        UPDATE "public"."community_configs"
        SET "is_active" = false
        WHERE "id" = v_config_id;
    END IF;
    
    -- Create new version
    INSERT INTO "public"."community_configs" (
        "community_id",
        "version",
        "brand_config",
        "assets_config",
        "theme_config",
        "community_config",
        "fidgets_config",
        "home_page_config",
        "explore_page_config",
        "navigation_config",
        "ui_config",
        "created_by",
        "updated_by",
        "notes",
        "is_published"
    ) VALUES (
        p_community_id,
        v_new_version,
        p_config_data->'brand',
        p_config_data->'assets',
        p_config_data->'theme',
        p_config_data->'community',
        p_config_data->'fidgets',
        p_config_data->'homePage',
        p_config_data->'explorePage',
        p_config_data->'navigation',
        p_config_data->'ui',
        p_admin_identity,
        p_admin_identity,
        p_change_notes,
        true -- Auto-publish for now, can be made configurable
    )
    RETURNING "id" INTO v_config_id;
    
    -- Update cache
    INSERT INTO "public"."community_config_cache" (
        "community_id",
        "config_data",
        "version",
        "expires_at"
    ) VALUES (
        p_community_id,
        p_config_data,
        v_new_version,
        now() + INTERVAL '1 hour'
    )
    ON CONFLICT ("community_id") DO UPDATE SET
        "config_data" = EXCLUDED."config_data",
        "version" = EXCLUDED."version",
        "cached_at" = now(),
        "expires_at" = now() + INTERVAL '1 hour';
    
    RETURN v_config_id;
END;
$$;
```

## Application Architecture

### Build-Time Configuration Generation

**Key Principle**: Configs are fetched from the database at build time and generated as static TypeScript files. Runtime uses these static files with zero database queries.

### 1. Build-Time Config Generator Script

Create a script that runs before the Next.js build to fetch configs from the database and generate static TypeScript files:

```typescript
// scripts/generate-configs.ts

import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { SystemConfig } from '../src/config/systemConfig';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch active config from database
 */
async function fetchConfigFromDB(communityId: string): Promise<SystemConfig | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_active_community_config', { p_community_id: communityId })
      .single();
    
    if (error) {
      console.error(`Failed to fetch config for ${communityId}:`, error);
      return null;
    }
    
    return data as SystemConfig;
  } catch (error) {
    console.error(`Error fetching config for ${communityId}:`, error);
    return null;
  }
}

/**
 * Generate TypeScript file for a config section
 */
function generateConfigFile(
  sectionName: string,
  data: any,
  communityId: string
): string {
  const exportName = `${communityId}${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`;
  return `export const ${exportName} = ${JSON.stringify(data, null, 2)} as const;\n`;
}

/**
 * Generate the main index file for a community
 */
function generateIndexFile(communityId: string, sections: string[]): string {
  const imports = sections.map(section => {
    const importName = `${communityId}${section.charAt(0).toUpperCase() + section.slice(1)}`;
    return `import { ${importName} } from './${communityId}.${section}';`;
  }).join('\n');
  
  const exports = sections.map(section => {
    const varName = `${communityId}${section.charAt(0).toUpperCase() + section.slice(1)}`;
    return `  ${section}: ${varName},`;
  }).join('\n');
  
  const exportName = `${communityId}SystemConfig`;
  
  return `${imports}

export const ${exportName} = {
${exports}
};

// Re-export individual sections
${sections.map(section => {
  const varName = `${communityId}${section.charAt(0).toUpperCase() + section.slice(1)}`;
  return `export { ${varName} } from './${communityId}.${section}';`;
}).join('\n')}
`;
}

/**
 * Generate initial space creator files (if needed)
 * These can be kept as static or also generated from DB
 */
async function generateInitialSpaceFiles(communityId: string, config: SystemConfig) {
  // For now, we'll keep initial space files as static
  // They can be migrated to DB later if needed
  console.log(`Skipping initial space files for ${communityId} (keeping static)`);
}

/**
 * Main generation function
 */
async function generateConfigFiles(communityId: string) {
  console.log(`Generating config files for ${communityId}...`);
  
  // Fetch config from database
  const config = await fetchConfigFromDB(communityId);
  
  if (!config) {
    console.warn(`No config found in DB for ${communityId}, skipping generation`);
    return false;
  }
  
  const configDir = join(process.cwd(), 'src', 'config', communityId);
  
  // Ensure directory exists
  await mkdir(configDir, { recursive: true });
  
  // Generate individual section files
  const sections = [
    'brand',
    'assets',
    'theme',
    'community',
    'fidgets',
    'home',
    'explore',
    'navigation',
    'ui'
  ];
  
  for (const section of sections) {
    const sectionData = config[section as keyof SystemConfig];
    if (sectionData !== undefined) {
      const content = generateConfigFile(section, sectionData, communityId);
      const filePath = join(configDir, `${communityId}.${section}.ts`);
      await writeFile(filePath, content, 'utf-8');
      console.log(`  ✓ Generated ${filePath}`);
    }
  }
  
  // Generate index file
  const indexContent = generateIndexFile(
    communityId,
    sections.filter(s => config[s as keyof SystemConfig] !== undefined)
  );
  const indexPath = join(configDir, 'index.ts');
  await writeFile(indexPath, indexContent, 'utf-8');
  console.log(`  ✓ Generated ${indexPath}`);
  
  // Generate initial space files (optional, can keep static)
  await generateInitialSpaceFiles(communityId, config);
  
  console.log(`✓ Successfully generated config files for ${communityId}`);
  return true;
}

/**
 * Update main config index to include generated configs
 */
async function updateMainConfigIndex(communityIds: string[]) {
  const indexPath = join(process.cwd(), 'src', 'config', 'index.ts');
  
  // Read existing file
  const fs = await import('fs/promises');
  let content = await fs.readFile(indexPath, 'utf-8');
  
  // Add imports for generated configs
  const imports = communityIds.map(id => {
    const configName = `${id}SystemConfig`;
    return `import { ${configName} } from './${id}/index';`;
  }).join('\n');
  
  // Update switch statement
  const switchCases = communityIds.map(id => {
    return `    case '${id}':\n      return ${id}SystemConfig;`;
  }).join('\n');
  
  // This is a simplified version - actual implementation would need
  // more sophisticated parsing/updating of the existing file
  console.log('Note: Main config index may need manual updates');
}

/**
 * Main execution
 */
async function main() {
  const communities = process.env.GENERATE_CONFIGS?.split(',') || 
                      ['nouns', 'clanker', 'example'];
  
  console.log('Starting config generation from database...');
  console.log(`Communities: ${communities.join(', ')}`);
  
  const results = await Promise.all(
    communities.map(id => generateConfigFiles(id))
  );
  
  const successCount = results.filter(Boolean).length;
  console.log(`\n✓ Generated ${successCount}/${communities.length} configs`);
  
  if (successCount < communities.length) {
    console.warn('Some configs failed to generate. Build will use static fallbacks.');
    process.exit(0); // Don't fail build, allow fallback
  }
}

main().catch(error => {
  console.error('Config generation failed:', error);
  process.exit(1);
});
```

### 2. Package.json Scripts

Add scripts to run the generator before build:

```json
{
  "scripts": {
    "generate-configs": "tsx scripts/generate-configs.ts",
    "prebuild": "npm run generate-configs",
    "build": "next build",
    "dev": "next dev",
    "dev:with-configs": "npm run generate-configs && next dev"
  }
}
```

### 3. Updated Configuration Loader

The loader remains mostly the same, but now uses the generated files:

```typescript
// src/config/index.ts

// Import generated configs (these are created at build time)
import { nounsSystemConfig } from './nouns/index';
import { exampleSystemConfig } from './example/index';
import { clankerSystemConfig } from './clanker/index';
import { SystemConfig } from './systemConfig';

// Fallback to static configs if generated ones don't exist
// This provides safety if DB fetch fails during build
const STATIC_FALLBACKS = {
  nouns: nounsSystemConfig,
  example: exampleSystemConfig,
  clanker: clankerSystemConfig as unknown as SystemConfig,
};

export const loadSystemConfig = (): SystemConfig => {
  const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
  
  // Use generated config (from build-time DB fetch)
  // Falls back to static if generation failed
  const config = STATIC_FALLBACKS[communityConfig.toLowerCase() as keyof typeof STATIC_FALLBACKS];
  
  if (!config) {
    console.warn(
      `Invalid community configuration: "${communityConfig}". ` +
      `Available options: ${Object.keys(STATIC_FALLBACKS).join(', ')}. ` +
      `Falling back to "nouns" configuration.`
    );
    return STATIC_FALLBACKS.nouns;
  }
  
  return config;
};
```

### 4. Admin Service (Runtime - For Admin Interface Only)

Create a service for admin operations (only used in admin interface, not in main app):

```typescript
// src/common/data/services/adminConfigService.ts

import { createClient } from '@supabase/supabase-js';
import { SystemConfig } from '@/config/systemConfig';

/**
 * Admin-only service for updating configs in database
 * This is NOT used by the main application at runtime
 */
export class AdminConfigService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin operations
  );
  
  /**
   * Update configuration (admin only)
   */
  async updateConfig(
    communityId: string,
    config: Partial<SystemConfig>,
    adminIdentity: string,
    changeNotes?: string
  ): Promise<boolean> {
    // Get current config
    const { data: currentData } = await this.supabase
      .rpc('get_active_community_config', { p_community_id: communityId })
      .single();
    
    if (!currentData) {
      throw new Error('Current config not found');
    }
    
    const currentConfig = currentData as SystemConfig;
    
    // Merge with new config
    const updatedConfig: SystemConfig = {
      ...currentConfig,
      ...config,
      brand: { ...currentConfig.brand, ...config.brand },
      assets: { ...currentConfig.assets, ...config.assets },
      theme: { ...currentConfig.theme, ...config.theme },
      community: { ...currentConfig.community, ...config.community },
      fidgets: { ...currentConfig.fidgets, ...config.fidgets },
      homePage: { ...currentConfig.homePage, ...config.homePage },
      explorePage: { ...currentConfig.explorePage, ...config.explorePage },
      navigation: config.navigation ?? currentConfig.navigation,
      ui: config.ui ?? currentConfig.ui,
    };
    
    // Create new version
    const { error } = await this.supabase.rpc('create_config_version', {
      p_community_id: communityId,
      p_config_data: updatedConfig,
      p_change_notes: changeNotes,
      p_admin_identity: adminIdentity
    });
    
    if (error) {
      console.error('Failed to update config:', error);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get config history
   */
  async getConfigHistory(communityId: string, limit: number = 10): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('community_configs')
      .select(`
        id,
        version,
        created_at,
        created_by,
        notes
      `)
      .eq('community_id', communityId)
      .order('version', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Failed to fetch history:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Trigger rebuild (webhook or manual)
   */
  async triggerRebuild(communityId: string): Promise<boolean> {
    // This would trigger your CI/CD to rebuild
    // Implementation depends on your deployment setup
    // Could use GitHub Actions API, Vercel API, etc.
    console.log(`Rebuild triggered for ${communityId}`);
    return true;
  }
}
```

### 5. Updated Hook (No Changes Needed)

The hook remains simple since it's using static files:

```typescript
// src/common/lib/hooks/useSystemConfig.ts

import { useMemo } from 'react';
import { loadSystemConfig, SystemConfig } from '@/config';

let cachedConfig: SystemConfig | null = null;

export const useSystemConfig = (): SystemConfig => {
  return useMemo(() => {
    if (cachedConfig) {
      return cachedConfig;
    }
    
    cachedConfig = loadSystemConfig();
    return cachedConfig;
  }, []);
};

export { loadSystemConfig };
```

## Migration Strategy

### Phase 1: Database Setup (Week 1)

1. **Create migration files**
   - Create tables: `community_configs`, `community_config_history`, `community_config_admins`
   - Set up RLS policies
   - Create database functions (`get_active_community_config`, `create_config_version`)

2. **Seed initial data**
   - Migrate existing static configs to database
   - Create admin accounts for each community
   - Set up initial published versions

### Phase 2: Build-Time Generator (Week 1-2)

1. **Create config generator script**
   - `scripts/generate-configs.ts` - Fetches from DB and generates TypeScript files
   - Add `generate-configs` script to package.json
   - Add `prebuild` hook to run generator before build

2. **Test generator**
   - Test fetching from database
   - Test file generation
   - Test fallback to static configs if DB unavailable

### Phase 3: Update Build Process (Week 2)

1. **Update package.json scripts**
   - Add `prebuild` hook
   - Update CI/CD to run generator before build
   - Ensure environment variables are available during build

2. **Update config loader**
   - Keep existing structure (uses generated files)
   - Maintain fallback to static configs
   - No runtime changes needed

### Phase 4: Admin Interface (Week 2-3)

1. **Create admin pages**
   - Config editor UI
   - Section-by-section editing
   - Preview functionality
   - History viewer

2. **API endpoints**
   - `/api/admin/config/[communityId]` - GET/PUT config
   - `/api/admin/config/[communityId]/history` - GET history
   - `/api/admin/config/[communityId]/rebuild` - Trigger rebuild

3. **Rebuild trigger**
   - Webhook or manual trigger to rebuild after config updates
   - Integration with CI/CD (GitHub Actions, Vercel, etc.)

### Phase 5: Testing & Rollout (Week 3-4)

1. **Testing**
   - Test config generator script
   - Test build process with generated configs
   - Test admin interface updates
   - Test rebuild trigger

2. **Gradual rollout**
   - Start with one community (e.g., 'example')
   - Monitor build process and generated files
   - Roll out to other communities

### Phase 6: Cleanup & Optimization (Week 4+)

1. **Keep static configs as fallback**
   - Always maintain static configs as safety net
   - Generated configs take precedence
   - Static configs used if generation fails

2. **Optimization**
   - Add validation to generator
   - Add error handling and logging
   - Monitor build times
   - Consider caching generated files in CI/CD

## Admin Interface Design

### Pages Needed

1. **Config Dashboard** (`/admin/config`)
   - List all communities
   - Active/published status
   - Quick actions
   - Rebuild status/triggers

2. **Config Editor** (`/admin/config/[communityId]`)
   - Section tabs (Brand, Assets, Theme, etc.)
   - Form inputs for each section
   - Preview pane
   - Save/Publish buttons
   - "Trigger Rebuild" button after saving

3. **Config History** (`/admin/config/[communityId]/history`)
   - Version list
   - Diff viewer
   - Rollback functionality
   - Rebuild trigger for any version

4. **Admin Management** (`/admin/config/[communityId]/admins`)
   - Add/remove admins
   - Permission management

### Rebuild Trigger Options

**Option 1: Manual Trigger (Recommended for MVP)**
- Admin clicks "Trigger Rebuild" button
- Calls API endpoint that triggers CI/CD rebuild
- Shows build status/link

**Option 2: Automatic Trigger**
- Webhook from database (PostgreSQL triggers)
- Calls CI/CD API automatically on config update
- More complex but seamless

**Option 3: Scheduled Rebuilds**
- Daily/hourly rebuilds to pick up changes
- Simple but less immediate

**Implementation Example (GitHub Actions):**
```typescript
// API endpoint: /api/admin/config/[communityId]/rebuild
export async function POST(request: Request) {
  const { communityId } = await request.json();
  
  // Trigger GitHub Actions workflow
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          community: communityId,
        },
      }),
    }
  );
  
  return Response.json({ success: response.ok });
}
```

## Security Considerations

1. **Authentication**
   - Use existing identity system (cryptographic keys)
   - Verify admin permissions before allowing edits

2. **Authorization**
   - RLS policies enforce database-level security
   - Application-level checks as backup

3. **Validation**
   - Validate config structure before saving
   - Type checking against `SystemConfig` interface
   - Sanitize JSON inputs

4. **Audit Trail**
   - All changes logged in history table
   - Track who made changes and when

## Performance Considerations

1. **Build-Time Generation**
   - Configs fetched once during build (not at runtime)
   - Zero database queries in production
   - Generated files are static TypeScript (fast imports)
   - No runtime caching needed

2. **Database Optimization**
   - Indexes on frequently queried columns (for admin interface)
   - Build-time queries are infrequent (only during builds)
   - Admin queries are lightweight (only used in admin interface)

3. **Build Process**
   - Generator runs in parallel for multiple communities
   - Failed generations don't break build (fallback to static)
   - Generated files can be cached in CI/CD
   - Build time impact is minimal (~1-2 seconds per community)

## Rollback Plan

If issues arise:

1. **Immediate**: Remove `prebuild` hook, build uses static configs directly
2. **Short-term**: Fix generator script or database issues, re-enable generation
3. **Long-term**: Keep static configs as permanent fallback (always available)

**Advantages of this approach:**
- Static configs are always available as fallback
- No runtime dependencies on database
- Build failures don't affect runtime
- Easy to rollback by simply removing prebuild hook

## Future Enhancements

1. **Draft/Preview System**
   - Save drafts without publishing
   - Preview changes before publishing
   - Scheduled publishing

2. **Multi-environment Support**
   - Dev/staging/production configs
   - Environment-specific overrides

3. **Config Templates**
   - Save configs as templates
   - Clone configs for new communities

4. **API for External Tools**
   - REST API for config management
   - Webhook notifications on changes

5. **Advanced Permissions**
   - Section-level permissions
   - Read-only admins
   - Approval workflows

## Summary

This migration plan provides:

- ✅ **Database schema** for storing configs with versioning
- ✅ **Admin permission system** using existing identity infrastructure
- ✅ **Build-time generation** - Zero runtime database queries
- ✅ **Backward compatibility** - Static configs always available as fallback
- ✅ **Migration path** with phased rollout
- ✅ **Security** through RLS and validation
- ✅ **Audit trail** for all changes
- ✅ **Performance** - Static files at runtime, DB only at build time

**Key Benefits:**
- **Zero runtime overhead** - Configs are static files at runtime
- **Admin updates** - Changes made in database, reflected in next build
- **Safe fallback** - Static configs always available if generation fails
- **Fast builds** - Generator runs in parallel, minimal build time impact
- **Easy rollback** - Simply remove prebuild hook to use static configs

The system maintains backward compatibility while enabling admin updates through the database, with changes reflected in builds rather than at runtime.

