#!/usr/bin/env tsx
/**
 * Seed script to upload navPage space configs to Supabase Storage
 * 
 * This script:
 * 1. Reads space registrations from the database (created by seed.sql)
 * 2. Imports page configs (homePage, explorePage) from TypeScript configs
 * 3. Converts page configs to SpaceConfig format
 * 4. Uploads each tab to Supabase Storage as SignedFile
 * 5. Uploads tabOrder to Supabase Storage
 * 
 * Note: Not all communities have explore pages (e.g., Clanker only has home)
 * 
 * Usage:
 *   tsx scripts/seed-navpage-spaces.ts
 * 
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 * 
 * Run this AFTER running seed.sql to upload the actual space config files.
 */

import { createClient } from '@supabase/supabase-js';
import stringify from 'fast-json-stable-stringify';
import moment from 'moment';
import { SignedFile } from '../src/common/lib/signedFiles';
import { SpaceConfig } from '../src/app/(spaces)/Space';

// Import page configs
import { nounsHomePage, nounsExplorePage, clankerHomePage } from './seed-data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Creates a SignedFile wrapper for system-generated files
 * 
 * Note: These files are stored unencrypted (isEncrypted: false) so they can be
 * read by anyone. The decryptEncryptedSignedFile function handles unencrypted
 * files by returning fileData directly without attempting decryption.
 * Signature validation is only performed on write/update, not read, so the
 * placeholder signature is acceptable.
 */
function createSystemSignedFile(fileData: string): SignedFile {
  return {
    fileData,
    fileType: 'json',
    isEncrypted: false,
    timestamp: moment().toISOString(),
    publicKey: 'nounspace',
    signature: 'not applicable, machine generated file',
  };
}

/**
 * Creates a SignedFile for tab order
 */
function createTabOrderSignedFile(spaceId: string, tabOrder: string[]): SignedFile {
  const tabOrderData = {
    spaceId,
    timestamp: moment().toISOString(),
    tabOrder,
    publicKey: 'nounspace',
    signature: 'not applicable, machine generated file',
  };
  return createSystemSignedFile(stringify(tabOrderData));
}

/**
 * Uploads a single tab config to Supabase Storage
 */
async function uploadTab(
  spaceId: string,
  tabName: string,
  tabConfig: SpaceConfig,
): Promise<boolean> {
  const signedFile = createSystemSignedFile(stringify(tabConfig));
  const filePath = `${spaceId}/tabs/${tabName}`;

  const { error } = await supabase.storage
    .from('spaces')
    .upload(filePath, new Blob([stringify(signedFile)], { type: 'application/json' }), {
      upsert: true,
    });

  if (error) {
    console.error(`  ❌ Failed to upload tab ${tabName}:`, error.message);
    return false;
  }

  console.log(`  ✅ Uploaded tab: ${tabName}`);
  return true;
}

/**
 * Uploads tab order to Supabase Storage
 */
async function uploadTabOrder(spaceId: string, tabOrder: string[]): Promise<boolean> {
  const signedFile = createTabOrderSignedFile(spaceId, tabOrder);
  const filePath = `${spaceId}/tabOrder`;

  const { error } = await supabase.storage
    .from('spaces')
    .upload(filePath, new Blob([stringify(signedFile)], { type: 'application/json' }), {
      upsert: true,
    });

  if (error) {
    console.error(`  ❌ Failed to upload tab order:`, error.message);
    return false;
  }

  console.log(`  ✅ Uploaded tab order: [${tabOrder.join(', ')}]`);
  return true;
}

/**
 * Gets spaceId from database by spaceName
 */
async function getSpaceId(spaceName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('spaceRegistrations')
    .select('spaceId')
    .eq('spaceName', spaceName)
    .eq('spaceType', 'navPage')
    .single();

  if (error || !data) {
    console.error(`  ❌ Space not found: ${spaceName}`, error?.message);
    return null;
  }

  return data.spaceId;
}

/**
 * Type for page configs with tabs - accepts any structure where tabs contain SpaceConfig-like objects
 * The actual configs may have extra properties that we'll extract at runtime
 */
type PageConfigWithSpaceTabs = {
  defaultTab: string;
  tabOrder: string[];
  tabs: Record<string, any>; // Tabs contain SpaceConfig properties (and possibly extras)
};

/**
 * Uploads a page config (homePage or explorePage) as a Space
 * Extracts SpaceConfig from tabs which may have additional properties
 */
async function uploadPageConfig(
  spaceName: string,
  pageConfig: PageConfigWithSpaceTabs,
): Promise<boolean> {
  console.log(`\n📦 Uploading space: ${spaceName}`);

  const spaceId = await getSpaceId(spaceName);
  if (!spaceId) {
    return false;
  }

  console.log(`  📍 Space ID: ${spaceId}`);

  // Upload each tab
  const tabNames = Object.keys(pageConfig.tabs);
  console.log(`  📄 Uploading ${tabNames.length} tabs...`);

  const tabResults = await Promise.all(
    tabNames.map((tabName) => {
      const tabConfig = pageConfig.tabs[tabName];
      // Tabs are already SpaceConfig objects (they may have extra properties like name/displayName)
      // Extract just the SpaceConfig properties for upload
      const spaceConfig: SpaceConfig = {
        fidgetInstanceDatums: tabConfig.fidgetInstanceDatums,
        layoutID: tabConfig.layoutID,
        layoutDetails: tabConfig.layoutDetails,
        isEditable: tabConfig.isEditable ?? false,
        fidgetTrayContents: tabConfig.fidgetTrayContents,
        theme: tabConfig.theme,
        timestamp: tabConfig.timestamp,
        tabNames: tabConfig.tabNames,
        fid: tabConfig.fid,
      };
      return uploadTab(spaceId, tabName, spaceConfig);
    }),
  );

  const allTabsUploaded = tabResults.every((result) => result);
  if (!allTabsUploaded) {
    console.error(`  ❌ Some tabs failed to upload for ${spaceName}`);
    return false;
  }

  // Upload tab order
  const tabOrderUploaded = await uploadTabOrder(spaceId, pageConfig.tabOrder);
  if (!tabOrderUploaded) {
    console.error(`  ❌ Failed to upload tab order for ${spaceName}`);
    return false;
  }

  console.log(`  ✅ Successfully uploaded ${spaceName}`);
  return true;
}

/**
 * Main seeding function
 */
async function main() {
  console.log('🚀 Starting navPage space config seeding...\n');

  // Map of spaceName -> page config
  // Note: Using PageConfigWithSpaceTabs type that accepts configs with SpaceConfig tabs
  // Note: Clanker doesn't have an explore page, only home
  const spaceConfigs: Array<{ spaceName: string; config: PageConfigWithSpaceTabs }> = [
    { spaceName: 'nouns-home', config: nounsHomePage },
    { spaceName: 'nouns-explore', config: nounsExplorePage },
    { spaceName: 'clanker-home', config: clankerHomePage },
  ];

  const results = await Promise.allSettled(
    spaceConfigs.map(({ spaceName, config }) => uploadPageConfig(spaceName, config)),
  );

  const successCount = results.filter((r) => r.status === 'fulfilled' && r.value).length;
  const failCount = results.length - successCount;

  console.log(`\n📊 Results: ${successCount} succeeded, ${failCount} failed`);

  if (failCount > 0) {
    console.error('\n❌ Some spaces failed to seed. Check errors above.');
    process.exit(1);
  }

  console.log('\n✅ All navPage spaces seeded successfully!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

