#!/usr/bin/env tsx
/**
 * Test script for verifying config loading works correctly
 * 
 * Usage:
 *   npx tsx scripts/test-config-loading.ts
 * 
 * Or with specific community:
 *   NEXT_PUBLIC_TEST_COMMUNITY=example npx tsx scripts/test-config-loading.ts
 */

import { loadSystemConfig } from '../src/config';

async function testConfigLoading() {
  console.log('🧪 Testing Config Loading\n');
  console.log('=' .repeat(50));
  
  // Test 1: Explicit community ID
  console.log('\n📋 Test 1: Explicit community ID');
  console.log('-'.repeat(50));
  try {
    const config1 = await loadSystemConfig({ communityId: 'example' });
    console.log(`✅ Successfully loaded config`);
    console.log(`   Community: ${config1.brand?.displayName || 'Unknown'}`);
    console.log(`   Logo: ${config1.assets?.logos?.main || 'Not set'}`);
    console.log(`   Navigation items: ${config1.navigation?.items?.length || 0}`);
  } catch (error: any) {
    console.error(`❌ Failed: ${error.message}`);
  }
  
  // Test 2: Domain-based resolution
  console.log('\n📋 Test 2: Domain-based resolution');
  console.log('-'.repeat(50));
  try {
    const config2 = await loadSystemConfig({ 
      domain: 'example.localhost',
    });
    console.log(`✅ Successfully loaded config from domain`);
    console.log(`   Community: ${config2.brand?.displayName || 'Unknown'}`);
    console.log(`   Domain: example.localhost`);
  } catch (error: any) {
    console.error(`❌ Failed: ${error.message}`);
  }
  
  // Test 3: Environment-based (current setup)
  console.log('\n📋 Test 3: Environment-based (current setup)');
  console.log('-'.repeat(50));
  try {
    const config3 = await loadSystemConfig();
    console.log(`✅ Successfully loaded config from environment`);
    console.log(`   Community: ${config3.brand?.displayName || 'Unknown'}`);
    console.log(`   Source: Environment variables / domain detection`);
    
    // Show which community was resolved
    const testCommunity = process.env.NEXT_PUBLIC_TEST_COMMUNITY;
    if (testCommunity) {
      console.log(`   Resolved from: NEXT_PUBLIC_TEST_COMMUNITY=${testCommunity}`);
    } else {
      console.log(`   Resolved from: Domain detection (or explicit context)`);
    }
  } catch (error: any) {
    console.error(`❌ Failed: ${error.message}`);
  }
  
  // Test 4: Invalid community (error handling)
  console.log('\n📋 Test 4: Invalid community (error handling)');
  console.log('-'.repeat(50));
  try {
    const config4 = await loadSystemConfig({ communityId: 'nonexistent-community-12345' });
    console.log(`⚠️  Unexpectedly succeeded (should have failed)`);
  } catch (error: any) {
    console.log(`✅ Correctly failed for invalid community`);
    console.log(`   Error: ${error.message}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test suite completed');
  console.log('\n💡 Tips:');
  console.log('   - Set NEXT_PUBLIC_TEST_COMMUNITY=example to test specific community');
  console.log('   - Use localhost subdomains (example.localhost:3000) for domain testing');
  console.log('   - Check Supabase credentials if tests fail');
  console.log('');
}

// Run tests
testConfigLoading().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

