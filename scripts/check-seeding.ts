#!/usr/bin/env tsx
/**
 * Quick script to check if community_configs are seeded
 * 
 * Usage:
 *   tsx scripts/check-seeding.ts
 * 
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSeeding() {
  console.log('🔍 Checking if community_configs are seeded...\n');

  // Check if table exists and has data
  const { data, error, count } = await supabase
    .from('community_configs')
    .select('community_id, is_published, updated_at', { count: 'exact' });

  if (error) {
    console.error('❌ Error checking community_configs:', error.message);
    console.error('   The table might not exist. Run migrations first.');
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No community configs found in database.');
    console.log('\n📋 Next steps:');
    console.log('   1. Set environment variables:');
    console.log('      export NEXT_PUBLIC_SUPABASE_URL="https://[your-project].supabase.co"');
    console.log('      export SUPABASE_SERVICE_ROLE_KEY="[your-key]"');
    console.log('   2. Run the seed script:');
    console.log('      tsx scripts/seed-all.ts');
    process.exit(1);
  }

  console.log(`✅ Found ${count} community config(s):\n`);
  data.forEach((config) => {
    console.log(`   - ${config.community_id} (published: ${config.is_published}, updated: ${config.updated_at})`);
  });

  // Test the RPC function
  console.log('\n🧪 Testing get_active_community_config function...');
  const { data: testConfig, error: testError } = await supabase
    .rpc('get_active_community_config', { p_community_id: 'nouns' })
    .single();

  if (testError) {
    console.error('❌ Function test failed:', testError.message);
    process.exit(1);
  }

  if (testConfig && (testConfig as any).brand) {
    console.log('✅ Function works! Retrieved config successfully.');
  } else {
    console.error('❌ Function returned invalid config');
    process.exit(1);
  }

  console.log('\n✅ Community configs are properly seeded!');
}

checkSeeding().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

