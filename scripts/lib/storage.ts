/**
 * Supabase Storage utilities for uploading space configs
 */

import stringify from 'fast-json-stable-stringify';
import moment from 'moment';
import { supabase } from './supabase';
import type { SignedFile } from '../../src/common/lib/signedFiles';
import type { SpaceConfig } from '../../src/app/(spaces)/Space';

/**
 * Creates a SignedFile wrapper for system-generated files
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
 * Creates tab order data in the format expected by the app
 * NOTE: Tab order is NOT wrapped in a SignedFile like tabs are.
 */
function createTabOrderData(spaceId: string, tabOrder: string[]) {
  return {
    spaceId,
    timestamp: moment().toISOString(),
    tabOrder,
  };
}

/**
 * Uploads a single tab config to Supabase Storage
 */
async function uploadTab(spaceId: string, tabName: string, tabConfig: SpaceConfig): Promise<boolean> {
  const signedFile = createSystemSignedFile(stringify(tabConfig));
  const filePath = `${spaceId}/tabs/${tabName}`;

  const { error } = await supabase.storage
    .from('spaces')
    .upload(filePath, new Blob([stringify(signedFile)], { type: 'application/json' }), {
      upsert: true,
    });

  if (error) {
    console.error(`    ❌ Failed to upload tab ${tabName}:`, error.message);
    return false;
  }

  console.log(`    ✅ Uploaded tab: ${tabName}`);
  return true;
}

/**
 * Uploads tab order to Supabase Storage
 */
async function uploadTabOrder(spaceId: string, tabOrder: string[]): Promise<boolean> {
  const tabOrderData = createTabOrderData(spaceId, tabOrder);
  const filePath = `${spaceId}/tabOrder`;

  const { error } = await supabase.storage
    .from('spaces')
    .upload(filePath, new Blob([stringify(tabOrderData)], { type: 'application/json' }), {
      upsert: true,
    });

  if (error) {
    console.error(`    ❌ Failed to upload tab order:`, error.message);
    return false;
  }

  console.log(`    ✅ Uploaded tab order: [${tabOrder.join(', ')}]`);
  return true;
}

/**
 * Gets spaceId from database by spaceName
 */
export async function getSpaceId(spaceName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('spaceRegistrations')
    .select('spaceId')
    .eq('spaceName', spaceName)
    .eq('spaceType', 'navPage')
    .single();

  if (error || !data) {
    console.error(`    ❌ Space not found: ${spaceName}`, error?.message);
    return null;
  }

  return data.spaceId;
}

/**
 * Type for page configs with tabs
 */
export type PageConfigWithTabs = {
  defaultTab: string;
  tabOrder: string[];
  tabs: Record<string, any>;
};

/**
 * Uploads a page config (homePage or explorePage) as a Space
 */
export async function uploadPageConfig(
  spaceName: string,
  pageConfig: PageConfigWithTabs,
): Promise<boolean> {
  const spaceId = await getSpaceId(spaceName);
  if (!spaceId) {
    return false;
  }

  console.log(`  📦 Uploading ${spaceName} (${spaceId})`);

  // Upload each tab
  const tabNames = Object.keys(pageConfig.tabs);
  const tabResults = await Promise.all(
    tabNames.map((tabName) => {
      const tabConfig = pageConfig.tabs[tabName];
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
    console.error(`    ❌ Some tabs failed to upload for ${spaceName}`);
    return false;
  }

  // Upload tab order
  const tabOrderUploaded = await uploadTabOrder(spaceId, pageConfig.tabOrder);
  if (!tabOrderUploaded) {
    console.error(`    ❌ Failed to upload tab order for ${spaceName}`);
    return false;
  }

  return true;
}

/**
 * Creates a navPage space registration in the database
 */
export async function createNavPageSpace(spaceName: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('spaceRegistrations')
    .select('spaceId')
    .eq('spaceName', spaceName)
    .eq('spaceType', 'navPage')
    .single();

  if (existing) {
    console.log(`  ✅ Space already exists: ${spaceName} (${existing.spaceId})`);
    return existing.spaceId;
  }

  const { data, error } = await supabase
    .from('spaceRegistrations')
    .insert({
      fid: null,
      spaceName,
      spaceType: 'navPage',
      identityPublicKey: 'system',
      signature: 'system-seed',
      timestamp: new Date().toISOString(),
    })
    .select('spaceId')
    .single();

  if (error) {
    console.error(`  ❌ Failed to create ${spaceName}:`, error.message);
    return null;
  }

  console.log(`  ✅ Created space: ${spaceName} (${data.spaceId})`);
  return data.spaceId;
}

