#!/usr/bin/env tsx
/**
 * Orphaned Tab Cleanup Script
 *
 * Finds and deletes tab files that are not referenced in their space's tabOrder.
 * This cleans up orphaned data from tabs that were deleted but whose files
 * weren't properly removed from storage.
 *
 * Usage:
 *   tsx scripts/cleanup-orphaned-tabs.ts                    # Uses local .env
 *   tsx scripts/cleanup-orphaned-tabs.ts --env production   # Prompts for credentials
 *   tsx scripts/cleanup-orphaned-tabs.ts --dry-run          # Preview changes without deleting
 *
 * This script:
 * 1. Lists all spaces in the 'spaces' bucket
 * 2. For each space, reads the tabOrder file
 * 3. Lists all files in the space's tabs/ folder
 * 4. Deletes any tab files not referenced in tabOrder
 */

import { supabase, initializeSupabase, targetEnv } from './lib';

// CLI flags
const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  debug: args.includes('--debug'),
};

interface TabOrderFile {
  tabOrder: string[];
  timestamp?: string;
}

interface OrphanedTab {
  spaceId: string;
  tabName: string;
  path: string;
}

/**
 * List all space IDs in the bucket
 */
async function listSpaces(): Promise<string[]> {
  const spaces: string[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from('spaces')
      .list('', { limit, offset });

    if (error) {
      console.error('Error listing spaces:', error.message);
      break;
    }

    if (!data || data.length === 0) {
      if (flags.debug) {
        console.log('   No data returned from storage.list()');
      }
      break;
    }

    if (flags.debug) {
      console.log(`   Raw data from storage (first 5 items):`);
      for (const item of data.slice(0, 5)) {
        console.log(`     - name: "${item.name}", id: ${item.id}, metadata: ${JSON.stringify(item.metadata)}`);
      }
    }

    // In Supabase storage, folders are items with id: null
    // Files have a non-null id and metadata
    for (const item of data) {
      // Folder detection: id is null for folders in Supabase storage
      // Also check that it's not a placeholder file (like .emptyFolderPlaceholder)
      if (item.id === null || (item.name && !item.name.includes('.'))) {
        spaces.push(item.name);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return spaces;
}

/**
 * Get the tabOrder for a space
 */
async function getTabOrder(spaceId: string): Promise<string[] | null> {
  try {
    const { data, error } = await supabase.storage
      .from('spaces')
      .download(`${spaceId}/tabOrder`);

    if (error) {
      // tabOrder doesn't exist - this is fine for new/empty spaces
      return null;
    }

    const text = await data.text();

    // Check if it's HTML (404 error page)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      return null;
    }

    const tabOrderFile = JSON.parse(text) as TabOrderFile;
    return tabOrderFile.tabOrder || [];
  } catch (e) {
    console.error(`Error reading tabOrder for ${spaceId}:`, e);
    return null;
  }
}

/**
 * List all tab files for a space
 */
async function listTabs(spaceId: string): Promise<string[]> {
  const tabs: string[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from('spaces')
      .list(`${spaceId}/tabs`, { limit, offset });

    if (error) {
      // tabs folder doesn't exist - this is fine
      break;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      if (item.name && item.metadata) {
        // It's a file, not a directory
        tabs.push(item.name);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return tabs;
}

/**
 * Delete orphaned tab files
 */
async function deleteOrphanedTabs(orphans: OrphanedTab[]): Promise<void> {
  if (orphans.length === 0) {
    console.log('\n✅ No orphaned tabs to delete');
    return;
  }

  console.log(`\n🗑️  Deleting ${orphans.length} orphaned tab(s)...`);

  const paths = orphans.map(o => o.path);

  // Supabase allows batch delete
  const { error } = await supabase.storage
    .from('spaces')
    .remove(paths);

  if (error) {
    console.error('Error deleting orphaned tabs:', error.message);
  } else {
    console.log(`✅ Successfully deleted ${orphans.length} orphaned tab(s)`);
  }
}

/**
 * Main cleanup function
 */
async function main() {
  console.log('🧹 Orphaned Tab Cleanup Script');
  console.log('================================\n');

  if (flags.dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be deleted\n');
  }

  if (targetEnv) {
    console.log(`🌐 Target environment: ${targetEnv}\n`);
  }

  // Initialize Supabase
  await initializeSupabase();

  // Get all spaces
  console.log('📂 Listing spaces...');
  const spaces = await listSpaces();
  console.log(`   Found ${spaces.length} space(s)\n`);

  const orphanedTabs: OrphanedTab[] = [];
  let spacesProcessed = 0;
  let spacesWithOrphans = 0;

  // Process each space
  for (const spaceId of spaces) {
    spacesProcessed++;

    // Get tabOrder
    const tabOrder = await getTabOrder(spaceId);

    if (tabOrder === null) {
      // No tabOrder file - skip this space (can't determine what's orphaned)
      continue;
    }

    // Get all tab files
    const tabFiles = await listTabs(spaceId);

    if (tabFiles.length === 0) continue;

    // Find orphans (tabs not in tabOrder)
    const orphans = tabFiles.filter(tab => !tabOrder.includes(tab));

    if (orphans.length > 0) {
      spacesWithOrphans++;
      console.log(`📁 Space: ${spaceId}`);
      console.log(`   Tab order: [${tabOrder.join(', ')}]`);
      console.log(`   Tab files: [${tabFiles.join(', ')}]`);
      console.log(`   Orphaned:  [${orphans.join(', ')}]`);
      console.log('');

      for (const tab of orphans) {
        orphanedTabs.push({
          spaceId,
          tabName: tab,
          path: `${spaceId}/tabs/${tab}`,
        });
      }
    }

    // Progress indicator
    if (spacesProcessed % 100 === 0) {
      console.log(`   Processed ${spacesProcessed}/${spaces.length} spaces...`);
    }
  }

  // Summary
  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`   Spaces processed: ${spacesProcessed}`);
  console.log(`   Spaces with orphans: ${spacesWithOrphans}`);
  console.log(`   Total orphaned tabs: ${orphanedTabs.length}`);

  if (orphanedTabs.length > 0) {
    console.log('\n📋 Orphaned tabs to delete:');
    for (const orphan of orphanedTabs) {
      console.log(`   - ${orphan.path}`);
    }
  }

  // Delete orphans (unless dry run)
  if (!flags.dryRun) {
    await deleteOrphanedTabs(orphanedTabs);
  } else if (orphanedTabs.length > 0) {
    console.log('\n⚠️  Dry run - no files were deleted');
    console.log('   Run without --dry-run to delete these files');
  }

  console.log('\n✨ Done!');
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
