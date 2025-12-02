#!/usr/bin/env tsx
/**
 * OPTIONAL: Seed script to populate community_configs table from static configs
 * 
 * NOTE: This script is now OPTIONAL. The database is seeded via SQL in:
 *   - supabase/seed.sql (runs automatically on `supabase db reset`)
 * 
 * Use this script only if you need to:
 *   - Update configs without resetting the database
 *   - Seed configs in a production environment
 *   - Migrate from old schema (with themes/pages) to new schema
 * 
 * Usage:
 *   tsx scripts/seed-community-configs.ts
 * 
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 * 
 * IMPORTANT: This script still includes themes/pages for backward compatibility.
 * The new architecture stores themes in shared file and pages as Spaces.
 * Update this script if you need to exclude themes/pages.
 */

import { createClient } from '@supabase/supabase-js';
// Import configs without assets (which import SVGs)
import { nounsBrand } from '../src/config/nouns/nouns.brand';
import { nounsTheme } from '../src/config/nouns/nouns.theme';
import { nounsCommunity } from '../src/config/nouns/nouns.community';
import { nounsFidgets } from '../src/config/nouns/nouns.fidgets';
import { nounsNavigation } from '../src/config/nouns/nouns.navigation';
import { nounsUI } from '../src/config/nouns/nouns.ui';
import { nounsHomePage, nounsExplorePage, clankerHomePage } from './seed-data';

import { exampleBrand } from '../src/config/example/example.brand';
import { exampleTheme } from '../src/config/example/example.theme';
import { exampleCommunity } from '../src/config/example/example.community';
import { exampleFidgets } from '../src/config/example/example.fidgets';
import { exampleHomePage } from '../src/config/example/example.home';
import { exampleExplorePage } from '../src/config/example/example.explore';
import { exampleUI } from '../src/config/example/example.ui';
// Example doesn't have navigation config - use null
const exampleNavigation = null;

import { clankerBrand } from '../src/config/clanker/clanker.brand';
import { clankerTheme } from '../src/config/clanker/clanker.theme';
import { clankerCommunity } from '../src/config/clanker/clanker.community';
import { clankerFidgets } from '../src/config/clanker/clanker.fidgets';
import { clankerExplorePage } from '../src/config/clanker/clanker.explore';
import { clankerNavigation } from '../src/config/clanker/clanker.navigation';
import { clankerUI } from '../src/config/clanker/clanker.ui';

// Manually construct assets configs to avoid SVG imports
// These use the actual public paths that match what Next.js resolves
// For now, we'll use placeholder paths that match the static config structure
// In production, these will be replaced with actual uploaded asset paths
const nounsAssets = {
  logos: {
    main: "/images/nouns/logo.svg",  // Matches static config structure
    icon: "/images/nouns/noggles.svg",  // Matches static config structure
    favicon: "/images/favicon.ico",
    appleTouch: "/images/apple-touch-icon.png",
    og: "/images/nouns/og.svg",
    splash: "/images/nouns/splash.svg",
  },
};

const exampleAssets = {
  logos: {
    main: "/images/example_logo.png",
    icon: "/images/example_icon.png",
    favicon: "/images/example_favicon.ico",
    appleTouch: "/images/example_apple_touch.png",
    og: "/images/example_og.png",
    splash: "/images/example_splash.png",
  },
};

const clankerAssets = {
  logos: {
    main: "/images/clanker/logo.svg",  // Will be resolved from clanker assets
    icon: "/images/clanker/logo.svg",
    favicon: "/images/clanker/favicon.ico",
    appleTouch: "/images/clanker/apple.png",
    og: "/images/clanker/og.jpg",
    splash: "/images/clanker/og.jpg",
  },
};

// Construct system configs manually
const nounsSystemConfig = {
  brand: nounsBrand,
  assets: nounsAssets,
  theme: nounsTheme,
  community: nounsCommunity,
  fidgets: nounsFidgets,
  homePage: nounsHomePage,
  explorePage: nounsExplorePage,
  navigation: nounsNavigation,
  ui: nounsUI,
};

const exampleSystemConfig = {
  brand: exampleBrand,
  assets: exampleAssets,
  theme: exampleTheme,
  community: exampleCommunity,
  fidgets: exampleFidgets,
  homePage: exampleHomePage,
  explorePage: exampleExplorePage,
  navigation: exampleNavigation,
  ui: exampleUI,
};

const clankerSystemConfig = {
  brand: clankerBrand,
  assets: clankerAssets,
  theme: clankerTheme,
  community: clankerCommunity,
  fidgets: clankerFidgets,
  homePage: clankerHomePage,
  explorePage: clankerExplorePage,
  navigation: clankerNavigation,
  ui: clankerUI,
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedConfig(communityId: string, config: any) {
  console.log(`\n📦 Seeding config for: ${communityId}`);
  
  // Transform config to match database schema
  // Note: Schema excludes theme_config, home_page_config, explore_page_config
  // - Themes are in src/config/shared/themes.ts
  // - Pages are stored as Spaces (navPage type)
  const dbConfig = {
    community_id: communityId,
    is_published: true,
    brand_config: config.brand,
    assets_config: config.assets,
    community_config: config.community,
    fidgets_config: config.fidgets,
    navigation_config: config.navigation || null,
    ui_config: config.ui || null,
  };

  // Upsert (insert or update)
  const { data, error } = await supabase
    .from('community_configs')
    .upsert(dbConfig, {
      onConflict: 'community_id',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    console.error(`❌ Error seeding ${communityId}:`, error.message);
    return false;
  }

  console.log(`✅ Seeded config for ${communityId} (id: ${data.id})`);
  return true;
}

async function main() {
  console.log('🚀 Starting community config seeding...\n');

  const results = await Promise.allSettled([
    seedConfig('nouns', nounsSystemConfig),
    seedConfig('example', exampleSystemConfig),
    seedConfig('clanker', clankerSystemConfig),
  ]);

  const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const failCount = results.length - successCount;

  console.log(`\n📊 Results: ${successCount} succeeded, ${failCount} failed`);

  if (failCount > 0) {
    console.error('\n❌ Some configs failed to seed. Check errors above.');
    process.exit(1);
  }

  console.log('\n✅ All configs seeded successfully!');
  
  // Test the function
  console.log('\n🧪 Testing get_active_community_config function...');
  const { data: testConfig, error: testError } = await supabase
    .rpc('get_active_community_config', { p_community_id: 'nouns' })
    .single();

  if (testError) {
    console.error('❌ Function test failed:', testError.message);
    process.exit(1);
  }

  // Type assertion: function returns JSONB with brand, assets, community, etc.
  type ConfigFromDB = {
    brand?: { displayName?: string };
    assets?: unknown;
    community?: unknown;
    fidgets?: unknown;
    navigation?: unknown;
    ui?: unknown;
  };

  const config = testConfig as ConfigFromDB | null;

  if (config && config.brand && config.brand.displayName) {
    console.log(`✅ Function works! Retrieved config for: ${config.brand.displayName}`);
  } else {
    console.error('❌ Function returned invalid config');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

