/**
 * Tab management utilities
 * Shared validation, error handling, and optimistic update patterns for tab operations
 */

import { createSupabaseServerClient } from "@/common/data/database/supabase/clients/server";

/**
 * Validates a tab name according to application rules
 * @param tabName The tab name to validate
 * @returns Error message string if invalid, null if valid
 */
export function validateTabName(tabName: string): string | null {
  if (/[^a-zA-Z0-9-_ ]/.test(tabName)) {
    return "The tab name contains invalid characters. Only letters, numbers, hyphens, underscores, and spaces are allowed.";
  }
  return null;
}

/**
 * Checks if the new tab name would create a duplicate (case-insensitive)
 * @param newName New tab name to check
 * @param existingNames List of existing tab names
 * @param currentName Current name (to exclude from duplicate check)
 * @returns Boolean indicating if duplicate exists
 */
export function isDuplicateTabName(
  newName: string,
  existingNames: string[],
  currentName?: string
): boolean {
  const normalizedNewName = newName.toLowerCase().trim();
  return existingNames
    .filter((name) => name !== currentName)
    .some((name) => name.toLowerCase() === normalizedNewName);
}

/**
 * Generates a unique name by appending numbers if duplicates exist
 * Used for both tabs and navigation items
 * @param baseName Base name to make unique
 * @param existingNames List of existing names to check against
 * @param maxIterations Maximum number of iterations before giving up
 * @returns Unique name, or null if max iterations exceeded
 */
export function generateUniqueName(
  baseName: string,
  existingNames: string[],
  maxIterations: number = 100
): string | null {
  const trimmedBase = baseName.trim();
  let uniqueName = trimmedBase;
  let iter = 1;
  
  while (existingNames.includes(uniqueName) && iter <= maxIterations) {
    uniqueName = `${trimmedBase} - ${iter++}`;
  }
  
  return iter > maxIterations ? null : uniqueName;
}

/**
 * Helper for handling optimistic updates with automatic rollback on error
 * This pattern is used across both public and private space tab operations
 *
 * @param updateFn Function that performs the optimistic state update
 * @param commitFn Async function that commits the change to backend/persistence
 * @param rollbackFn Function to revert state if commit fails
 * @param errorConfig Error message configuration
 * @returns Promise resolving to the commit result or rejecting with error
 */
export async function withOptimisticUpdate<T>({
  updateFn,
  commitFn,
  rollbackFn,
  errorConfig = { title: "Error", message: "The operation failed" },
}: {
  updateFn: () => void;
  commitFn: () => Promise<T>;
  rollbackFn: () => void;
  errorConfig?: { title: string; message: string };
}): Promise<T> {
  // Perform optimistic update
  updateFn();

  try {
    // Attempt to commit the change
    const result = await commitFn();
    return result;
  } catch (error) {
    // Log error for debugging
    console.error(errorConfig.title, error);

    // Roll back the optimistic update
    rollbackFn();

    // Re-throw for caller to handle if needed
    throw error;
  }
}

/**
 * Loads the default tab for a space from its tab order storage
 * Returns the first tab in the tabOrder array, or the fallback if not found/empty
 * 
 * This ensures spaces always have at least one tab (as enforced by TabBar)
 * 
 * @param spaceId The space ID to load tab order for
 * @param fallbackTab The default tab name to use if tab order is not found or empty
 * @returns The default tab name (first tab in order, or fallback)
 */
export async function loadSpaceDefaultTab(
  spaceId: string | undefined,
  fallbackTab: string
): Promise<string> {
  if (!spaceId) {
    return fallbackTab;
  }

  try {
    const { data: tabOrderData, error: storageError } = await createSupabaseServerClient()
      .storage
      .from("spaces")
      .download(`${spaceId}/tabOrder`);

    if (storageError || !tabOrderData) {
      // No tab order found - use fallback
      return fallbackTab;
    }

    const tabOrderText = await tabOrderData.text();
    const tabOrderJson = JSON.parse(tabOrderText) as { tabOrder?: string[] };
    const tabOrder = tabOrderJson.tabOrder || [];
    
    // Return first tab if available, otherwise fallback
    // TabBar ensures at least one tab remains, so this should always have at least one
    return tabOrder.length > 0 ? tabOrder[0] : fallbackTab;
  } catch (e) {
    console.warn(`Error fetching tab order for space ${spaceId}:`, e);
    return fallbackTab;
  }
}

