import { StoreGet, StoreSet } from "../../createStore";
import { AppStore } from "..";
import { NavigationItem, NavigationConfig } from "@/config/systemConfig";
import { cloneDeep } from "lodash";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import axiosBackend from "@/common/data/api/backend";
import { signSignable } from "@/common/lib/signedFiles";
import { RegisterNewSpaceResponse } from "@/pages/api/space/registry";
import { SPACE_TYPES } from "@/common/types/spaceData";
import { INITIAL_SPACE_CONFIG_EMPTY } from "@/config";
import {
  validateNavItemLabel,
  validateNavItemHref,
  isDuplicateNavLabel,
  isDuplicateNavHref,
  generateUniqueNavLabel,
  generateUniqueHrefFromLabel,
} from "@/common/utils/navUtils";

// Type for navPage space registration (similar to other space registration types)
interface SpaceRegistrationNavPage {
  spaceId: string;
  spaceName: string;
  spaceType: typeof SPACE_TYPES.NAV_PAGE;
  identityPublicKey: string;
  timestamp: string;
  fid: null;
}

interface NavigationStoreState {
  // Remote navigation items from database (SystemConfig)
  remoteNavigation: NavigationItem[];
  
  // Local (staged) navigation items
  localNavigation: NavigationItem[];
  
  // Temporary mapping of old href -> new href during rename transitions
  // Used to prevent 404 flashes when Next.js re-resolves routes
  // Format: { [oldHref]: newHref }
  hrefMappings: Record<string, string>;
}

interface NavigationStoreActions {
  // Load navigation from SystemConfig (called on app load)
  loadNavigation: (navigationConfig: NavigationConfig | undefined) => void;
  
  // Navigation item operations (staged changes)
  createNavigationItem: (
    item: Omit<NavigationItem, "id" | "href"> & { href?: string }
  ) => Promise<NavigationItem>;
  deleteNavigationItem: (itemId: string) => void;
  renameNavigationItem: (itemId: string, updates: { label?: string; href?: string; icon?: NavigationItem["icon"] }) => string | undefined;
  updateNavigationOrder: (newOrder: NavigationItem[]) => void;
  
  // Commit all staged changes to database
  // Accepts existingNavigationConfig to preserve fields like logoTooltip, showMusicPlayer, showSocials
  commitNavigationChanges: (communityId: string, existingNavigationConfig?: NavigationConfig | null) => Promise<void>;
  
  // Reset local changes to match remote
  resetNavigationChanges: () => void;
  
  // Check if there are uncommitted changes
  hasUncommittedChanges: () => boolean;
  
  // Clear href mappings (used after navigation completes)
  clearHrefMappings: (oldHrefs?: string[]) => void;
}

export type NavigationStore = NavigationStoreState & NavigationStoreActions;

export const navigationStoreDefaults: NavigationStoreState = {
  remoteNavigation: [],
  localNavigation: [],
  hrefMappings: {},
};

export const createNavigationStoreFunc = (
  set: StoreSet<AppStore>,
  get: StoreGet<AppStore>,
): NavigationStore => ({
  ...navigationStoreDefaults,
  
  loadNavigation: (navigationConfig) => {
    // Filter out notifications - it's hardcoded and not managed as a config item
    const items = (navigationConfig?.items || []).filter(item => item.id !== 'notifications');
    console.log('[navigationStore] Loading navigation:', {
      itemCount: items.length,
      items: items.map(i => ({ id: i.id, label: i.label, href: i.href, spaceId: i.spaceId }))
    });
    set((draft) => {
      draft.navigation.remoteNavigation = cloneDeep(items);
      draft.navigation.localNavigation = cloneDeep(items);
    }, "loadNavigation");
  },
  
  createNavigationItem: async (itemData) => {
    console.log('[navigationStore] Creating navigation item:', {
      label: itemData.label,
      href: itemData.href,
      icon: itemData.icon
    });
    const state = get().navigation;
    
    // Validate label
    const labelError = validateNavItemLabel(itemData.label);
    if (labelError) {
      console.error('[navigationStore] Label validation failed:', labelError);
      throw new Error(labelError);
    }
    
    // Check for duplicate label and auto-generate unique if needed
    let uniqueLabel = itemData.label.trim();
    if (isDuplicateNavLabel(uniqueLabel, state.localNavigation)) {
      uniqueLabel = generateUniqueNavLabel(uniqueLabel, state.localNavigation);
      console.warn(`Duplicate label "${itemData.label}", using "${uniqueLabel}" instead`);
    }
    
    // Generate href from label if not provided, or use provided href
    let trimmedHref: string;
    if (itemData.href) {
      trimmedHref = itemData.href.trim();
      // Validate provided href
      const hrefError = validateNavItemHref(trimmedHref);
      if (hrefError) {
        throw new Error(hrefError);
      }
      // Check for duplicate href - fail if duplicate (user provided it, so don't auto-fix)
      if (isDuplicateNavHref(trimmedHref, state.localNavigation)) {
        throw new Error(`A navigation item with href "${trimmedHref}" already exists.`);
      }
    } else {
      // Auto-generate href from label, ensuring uniqueness
      trimmedHref = generateUniqueHrefFromLabel(uniqueLabel, state.localNavigation);
      // Validate generated href (should always be valid, but check anyway)
      const hrefError = validateNavItemHref(trimmedHref);
      if (hrefError) {
        // This shouldn't happen with our generator, but handle it gracefully
        trimmedHref = `/item-${Date.now()}`;
      }
    }
    
    const newId = uuidv4();
    const spaceId = uuidv4();
    const timestamp = moment().toISOString();
    
    // All navigation items get a space created for them
    const newItem: NavigationItem = {
      id: newId,
      ...itemData,
      label: uniqueLabel,
      href: trimmedHref,
      spaceId: spaceId,
    };
      
    // Atomically add both the local space and navigation item in a single set call
    set((draft) => {
      // Add to space store's localSpaces so PublicSpace can find it
      // Initialize with default "Home" tab so the space can be viewed immediately
      draft.space.localSpaces[spaceId] = {
        id: spaceId,
        updatedAt: timestamp,
        tabs: {
          Home: {
            ...INITIAL_SPACE_CONFIG_EMPTY,
            theme: {
              ...INITIAL_SPACE_CONFIG_EMPTY.theme,
              id: `${spaceId}-Home-theme`,
              name: `${spaceId}-Home-theme`,
            },
            isPrivate: false,
            timestamp: timestamp,
          },
        },
        order: ["Home"], // Initial default tab
        changedNames: {},
        deletedTabs: [],
      };
      // Add to local navigation
      draft.navigation.localNavigation.push(cloneDeep(newItem));
    }, "createNavigationItem");
    
    console.log('[navigationStore] Navigation item created:', {
      id: newItem.id,
      label: newItem.label,
      href: newItem.href,
      spaceId: newItem.spaceId,
      totalItems: get().navigation.localNavigation.length
    });
    
    return newItem;
  },
  
  deleteNavigationItem: (itemId) => {
    const item = get().navigation.localNavigation.find(i => i.id === itemId);
    console.log('[navigationStore] Deleting navigation item:', {
      itemId,
      label: item?.label,
      href: item?.href,
      spaceId: item?.spaceId
    });
    set((draft) => {
      // Remove from local navigation
      draft.navigation.localNavigation = draft.navigation.localNavigation.filter(
        (item) => item.id !== itemId
      );
      // Remove associated local space if it exists
      if (item?.spaceId && draft.space.localSpaces[item.spaceId]) {
        delete draft.space.localSpaces[item.spaceId];
        console.log('[navigationStore] Deleted associated local space:', item.spaceId);
      }
    }, "deleteNavigationItem");
    console.log('[navigationStore] Navigation item deleted, remaining items:', get().navigation.localNavigation.length);
  },
  
  renameNavigationItem: (itemId, updates) => {
    console.log('[navigationStore] Renaming navigation item:', {
      itemId,
      updates,
      currentItem: get().navigation.localNavigation.find(i => i.id === itemId)
    });
    const state = get().navigation;
    const itemIndex = state.localNavigation.findIndex(
        (item) => item.id === itemId
      );
      
    if (itemIndex === -1) {
      console.warn('[navigationStore] Rename failed: item not found', itemId);
      return;
    }
    
    const currentItem = state.localNavigation[itemIndex];
    let newLabel = updates.label ?? currentItem.label;
    let newHref = updates.href ?? currentItem.href;
    
    // Validate label
    if (updates.label !== undefined) {
      const sanitizedLabel = updates.label.trim();
      const labelError = validateNavItemLabel(sanitizedLabel);
      if (labelError) {
        console.error("Invalid navigation label:", labelError);
        throw new Error(labelError);
      }
      
      // Check for duplicate labels (case-insensitive) and auto-generate unique if needed
      if (isDuplicateNavLabel(sanitizedLabel, state.localNavigation, itemId)) {
        newLabel = generateUniqueNavLabel(sanitizedLabel, state.localNavigation, itemId);
        console.warn(`Duplicate label "${sanitizedLabel}", using "${newLabel}" instead`);
      } else {
        newLabel = sanitizedLabel;
      }
      
      // Auto-generate href from new label if href wasn't explicitly provided
      if (updates.href === undefined && newLabel !== currentItem.label) {
        newHref = generateUniqueHrefFromLabel(newLabel, state.localNavigation, itemId);
        console.log(`Auto-generated href "${newHref}" from label "${newLabel}"`);
      }
    }
    
    // Validate href (if explicitly provided or auto-generated)
    if (updates.href !== undefined || (updates.label !== undefined && newHref !== currentItem.href)) {
      const sanitizedHref = newHref.trim();
      const hrefError = validateNavItemHref(sanitizedHref);
      if (hrefError) {
        console.error("Invalid navigation href:", hrefError);
        throw new Error(hrefError);
      }
      
      // Check for duplicate hrefs (case-sensitive for URLs) - fail hard
      if (isDuplicateNavHref(sanitizedHref, state.localNavigation, itemId)) {
        throw new Error(`A navigation item with href "${sanitizedHref}" already exists.`);
      }
      
      newHref = sanitizedHref;
    }
    
    // Save old href before updating
    const oldHref = currentItem.href;
    
    // Apply updates
    set((draft) => {
      if (updates.label !== undefined) {
        draft.navigation.localNavigation[itemIndex].label = newLabel;
      }
      // Update href if it changed (either explicitly or auto-generated from label)
      if (updates.href !== undefined || (updates.label !== undefined && newHref !== currentItem.href)) {
        draft.navigation.localNavigation[itemIndex].href = newHref;
        // Store temporary mapping of old href -> new href to prevent 404 flashes
        // during route re-resolution
        if (oldHref !== newHref) {
          draft.navigation.hrefMappings[oldHref] = newHref;
        }
      }
      if (updates.icon !== undefined) {
        draft.navigation.localNavigation[itemIndex].icon = updates.icon;
      }
    }, "renameNavigationItem");
    
    console.log('[navigationStore] Navigation item renamed:', {
      itemId,
      oldLabel: currentItem.label,
      newLabel,
      oldHref: currentItem.href,
      newHref
    });
    
    // Return the new href so callers can update the URL immediately
    return newHref;
  },
  
  updateNavigationOrder: (newOrder) => {
    console.log('[navigationStore] Updating navigation order:', {
      itemCount: newOrder.length,
      order: newOrder.map(i => ({ id: i.id, label: i.label }))
    });
    set((draft) => {
      draft.navigation.localNavigation = cloneDeep(newOrder);
    }, "updateNavigationOrder");
  },
  
  resetNavigationChanges: () => {
    const state = get().navigation;
    console.log('[navigationStore] Resetting navigation changes:', {
      remoteItemCount: state.remoteNavigation.length,
      localItemCount: state.localNavigation.length,
      remoteItems: state.remoteNavigation.map(i => ({ id: i.id, label: i.label, href: i.href }))
    });
    set((draft) => {
      draft.navigation.localNavigation = cloneDeep(draft.navigation.remoteNavigation);
    }, "resetNavigationChanges");
    console.log('[navigationStore] Navigation changes reset, localNavigation now matches remoteNavigation');
  },
  
  hasUncommittedChanges: () => {
    const state = get().navigation;
    const spaceState = get().space;
    
    // Check navigation item changes
    // Compare arrays directly - check length, order, and content
    if (state.localNavigation.length !== state.remoteNavigation.length) {
      return true;
    }
    
    // Check if order changed or any item properties changed
    const hasNavChanges = state.localNavigation.some((localItem, index) => {
      const remoteItem = state.remoteNavigation[index];
      return !remoteItem || 
        localItem.id !== remoteItem.id ||
        localItem.label !== remoteItem.label ||
        localItem.href !== remoteItem.href ||
        localItem.icon !== remoteItem.icon ||
        localItem.spaceId !== remoteItem.spaceId;
    });
    
    if (hasNavChanges) {
      return true;
    }
    
    // Check if any navigation item's space has uncommitted changes
    // This handles the case where a user customizes a space in nav edit mode
    // without changing the navigation items themselves
    const hasSpaceChanges = state.localNavigation.some((item) => {
      if (!item.spaceId) {
        return false;
      }
      
      const localSpace = spaceState.localSpaces[item.spaceId];
      const remoteSpace = spaceState.remoteSpaces[item.spaceId];
      
      // If local space doesn't exist, no changes
      if (!localSpace) {
        return false;
      }
      
      // Check if space has uncommitted changes:
      // 1. changedNames or deletedTabs are non-empty
      // 2. Tabs differ from remote
      // 3. Order differs from remote
      if (Object.keys(localSpace.changedNames || {}).length > 0) {
        return true;
      }
      
      if ((localSpace.deletedTabs || []).length > 0) {
        return true;
      }
      
      // Compare tabs
      const localTabNames = Object.keys(localSpace.tabs || {});
      const remoteTabNames = Object.keys(remoteSpace?.tabs || {});
      
      if (localTabNames.length !== remoteTabNames.length) {
        return true;
      }
      
      // Compare order
      const localOrder = localSpace.order || [];
      const remoteOrder = remoteSpace?.order || [];
      
      if (localOrder.length !== remoteOrder.length) {
        return true;
      }
      
      if (localOrder.some((tab, index) => tab !== remoteOrder[index])) {
        return true;
      }
      
      // Compare individual tab configs by checking timestamps
      // If a local tab has a newer timestamp than the remote tab, or doesn't exist remotely,
      // it means there are uncommitted changes
      for (const tabName of localTabNames) {
        const localTab = localSpace.tabs[tabName];
        const remoteTab = remoteSpace?.tabs?.[tabName];
        
        // If local tab exists but remote doesn't, it's a new tab (uncommitted)
        if (!remoteTab) {
          return true;
        }
        
        // Compare timestamps - if local timestamp is newer, there are uncommitted changes
        if (localTab.timestamp && remoteTab.timestamp) {
          const localTimestamp = moment(localTab.timestamp);
          const remoteTimestamp = moment(remoteTab.timestamp);
          
          if (localTimestamp.isAfter(remoteTimestamp)) {
            return true;
          }
        } else if (localTab.timestamp && !remoteTab.timestamp) {
          // Local has timestamp but remote doesn't - uncommitted
          return true;
        }
      }
      
      return false;
    });
    
    return hasSpaceChanges;
  },
  
  clearHrefMappings: (oldHrefs) => {
    if (!oldHrefs) {
      // Clear all mappings
      set((draft) => {
        draft.navigation.hrefMappings = {};
      }, "clearHrefMappings");
      return;
    }
    
    // Clear specific mappings
    set((draft) => {
      oldHrefs.forEach((oldHref) => {
        delete draft.navigation.hrefMappings[oldHref];
      });
    }, "clearHrefMappings");
  },
  
  commitNavigationChanges: async (communityId: string, existingNavigationConfig?: NavigationConfig | null) => {
    console.log('[navigationStore] Starting commitNavigationChanges:', {
      communityId,
      remoteItemCount: get().navigation.remoteNavigation.length,
      localItemCount: get().navigation.localNavigation.length,
      hasExistingConfig: !!existingNavigationConfig
    });
    
    const state = get().navigation;
    const publicKey = get().account.currentSpaceIdentityPublicKey;
    
    if (!publicKey) {
      console.error('[navigationStore] Commit failed: no identity public key');
      throw new Error("No identity public key available");
    }
    
    // communityId is passed as parameter from the component
    
    try {
      // Step 1: Create spaces for new items that require them
      // Derive added items by comparing localNavigation with remoteNavigation
      const remoteItemIds = new Set(state.remoteNavigation.map(item => item.id));
      const addedItems = state.localNavigation.filter(item => !remoteItemIds.has(item.id));
      
      console.log('[navigationStore] Identified new items requiring spaces:', {
        addedItemCount: addedItems.length,
        addedItems: addedItems.map(i => ({ id: i.id, label: i.label, href: i.href, spaceId: i.spaceId }))
      });
      
      // Derive spaceName from the nav item's label or href
      const spacesToCreate = addedItems
        .filter((item) => item.spaceId)
        .map((item) => {
          // Extract spaceName from label (convert to slug) or from href
          const spaceName = item.href.startsWith('/') 
            ? item.href.slice(1) // Remove leading slash
            : item.label.toLowerCase().replace(/\s+/g, "-");
          
          return {
            itemId: item.id,
            spaceId: item.spaceId!,
            spaceName,
          };
        });
      
      const currentIdentity = get().account.getCurrentIdentity();
      if (!currentIdentity) {
        throw new Error("No current identity available");
      }
      
      // Track successful registrations to update spaceIds
      const successfulRegistrations: Array<{ itemId: string; spaceId: string; actualSpaceId: string }> = [];
      
      console.log('[navigationStore] Registering spaces for new nav items:', {
        spaceCount: spacesToCreate.length,
        spaces: spacesToCreate.map(s => ({ itemId: s.itemId, spaceId: s.spaceId, spaceName: s.spaceName }))
      });
      
      for (const space of spacesToCreate) {
        console.log('[navigationStore] Registering space:', {
          itemId: space.itemId,
          spaceId: space.spaceId,
          spaceName: space.spaceName
        });
        
        // Register space in database with the client-generated spaceId
        const unsignedRegistration: SpaceRegistrationNavPage = {
          spaceId: space.spaceId,
          spaceName: space.spaceName,
          spaceType: SPACE_TYPES.NAV_PAGE,
          identityPublicKey: publicKey,
          timestamp: moment().toISOString(),
          fid: null,
        };
        
        const signedRegistration = signSignable(
          unsignedRegistration,
          currentIdentity.rootKeys.privateKey
        );
        
        try {
          console.log('[navigationStore] Sending space registration request for item:', space.itemId);
          const { data: registrationResponse } = await axiosBackend.post<RegisterNewSpaceResponse>("/api/space/registry", signedRegistration);
          
          if (registrationResponse.result !== "success" || !registrationResponse.value?.spaceId) {
            throw new Error(`Failed to register space for nav item ${space.itemId}: API returned failure`);
          }
          
          const actualSpaceId = registrationResponse.value!.spaceId;
          
          console.log('[navigationStore] Space registration successful:', {
            itemId: space.itemId,
            expectedSpaceId: space.spaceId,
            actualSpaceId,
            matches: actualSpaceId === space.spaceId
          });
          
          // Verify that the API returned the same spaceId we sent
          if (actualSpaceId !== space.spaceId) {
            console.warn(`[navigationStore] Space registration returned different spaceId: expected ${space.spaceId}, got ${actualSpaceId}`);
          }
          
          // Use spaceStore's commitAllSpaceChanges to commit the tab order and sync state
          // This handles tab commits, deletions, and order updates, and syncs remoteSpaces
          console.log('[navigationStore] Committing space changes for spaceId:', actualSpaceId);
          await get().space.commitAllSpaceChanges(actualSpaceId);
          console.log('[navigationStore] Space changes committed successfully for spaceId:', actualSpaceId);
          
          // Only track successful registration after both registration AND commit succeed
          // This ensures we only update state if the entire space setup is successful
          successfulRegistrations.push({
            itemId: space.itemId,
            spaceId: space.spaceId,
            actualSpaceId,
          });
          console.log('[navigationStore] Space registration and commit completed for item:', space.itemId);
        } catch (spaceError: any) {
          // Fail the entire commit if space registration fails
          // This prevents navigation items from pointing to non-existent spaces
          const errorMessage = spaceError?.response?.data?.error?.message 
            || spaceError?.message 
            || `Unknown error registering space for nav item ${space.itemId}`;
          
          console.error(`Space registration failed for nav item ${space.itemId}:`, spaceError);
          
          throw new Error(
            `Failed to register space for navigation item "${space.itemId}": ${errorMessage}. ` +
            `Navigation commit aborted to maintain data consistency.`
          );
        }
      }
      
      // Update navigation items with actual spaceIds after all registrations succeeded
      console.log('[navigationStore] Updating navigation items with actual spaceIds:', {
        successfulRegistrations: successfulRegistrations.length
      });
      for (const registration of successfulRegistrations) {
        set((draft) => {
          const itemIndex = draft.navigation.localNavigation.findIndex(
            (item) => item.id === registration.itemId
          );
          if (itemIndex !== -1) {
            draft.navigation.localNavigation[itemIndex].spaceId = registration.actualSpaceId;
          }
          // Ensure the spaceId is set correctly in localSpaces
          if (draft.space.localSpaces[registration.spaceId]) {
            if (registration.spaceId !== registration.actualSpaceId) {
              // Move the localSpaces entry to the actual spaceId (shouldn't happen, but handle it)
              console.log('[navigationStore] Moving localSpace entry:', {
                from: registration.spaceId,
                to: registration.actualSpaceId
              });
              draft.space.localSpaces[registration.actualSpaceId] = draft.space.localSpaces[registration.spaceId];
              draft.space.localSpaces[registration.actualSpaceId].id = registration.actualSpaceId;
              delete draft.space.localSpaces[registration.spaceId];
            } else {
              // Ensure the spaceId is set correctly
              draft.space.localSpaces[registration.actualSpaceId].id = registration.actualSpaceId;
        }
          }
        }, "commitNavigationChanges-updateSpaceId");
      }
      
      // Step 2: Commit space changes for ALL navigation items (not just new ones)
      // This handles the case where a user customizes a space in nav edit mode
      // We need to commit space changes for existing spaces, not just new ones
      console.log('[navigationStore] Committing space changes for all navigation items');
      
      const allSpaceIds = new Set(
        state.localNavigation
          .map(item => item.spaceId)
          .filter((spaceId): spaceId is string => !!spaceId)
      );
      
      // Commit space changes for all spaces (including existing ones that were customized)
      // Skip spaces that were just registered (already committed above)
      const existingSpaceIds = Array.from(allSpaceIds).filter(
        spaceId => !spacesToCreate.some(s => s.spaceId === spaceId)
      );
      
      console.log('[navigationStore] Committing changes for existing spaces:', {
        existingSpaceCount: existingSpaceIds.length,
        existingSpaceIds
      });
      
      for (const spaceId of existingSpaceIds) {
        const localSpace = get().space.localSpaces[spaceId];
        
        // Only commit if local space exists and has changes
        if (localSpace) {
          const remoteSpace = get().space.remoteSpaces[spaceId];
          const hasChanges = 
            Object.keys(localSpace.changedNames || {}).length > 0 ||
            (localSpace.deletedTabs || []).length > 0 ||
            Object.keys(localSpace.tabs || {}).length > 0; // At least has some tabs
          
          if (hasChanges) {
            try {
              console.log('[navigationStore] Committing space changes for existing space:', spaceId);
              await get().space.commitAllSpaceChanges(spaceId);
              console.log('[navigationStore] Space changes committed successfully for existing space:', spaceId);
            } catch (spaceError: any) {
              // Fail the entire commit if space commit fails
              const errorMessage = spaceError?.response?.data?.error?.message 
                || spaceError?.message 
                || `Unknown error committing space changes for ${spaceId}`;
              
              console.error(`Space commit failed for ${spaceId}:`, spaceError);
              
              throw new Error(
                `Failed to commit space changes for navigation item space "${spaceId}": ${errorMessage}. ` +
                `Navigation commit aborted to maintain data consistency.`
              );
            }
          }
        }
      }
      
      // Step 3: Space cleanup for deleted items is handled server-side in the navigation config API endpoint
      // The endpoint compares old vs new navigation config to identify deleted spaces and cleans them up
      
      // Step 4: Update navigation config in database
      // Filter out notifications - it's hardcoded and not stored in config
      const itemsToCommit = state.localNavigation.filter(item => item.id !== 'notifications');
      
      // Build full navigation config by merging updated items with existing config
      // This preserves other fields like logoTooltip, showMusicPlayer, showSocials
      // Use existingNavigationConfig if provided, otherwise fall back to empty object
      const baseConfig = existingNavigationConfig || {};
      const navigationConfigToCommit: NavigationConfig = {
        ...baseConfig,
        items: itemsToCommit,
      };
      
      // Debug: log what we're about to send
      console.log('[navigationStore] Committing navigation config:', {
        communityId,
        itemCount: itemsToCommit.length,
        items: itemsToCommit.map(item => ({ id: item.id, label: item.label, href: item.href, spaceId: item.spaceId })),
        logoTooltip: navigationConfigToCommit.logoTooltip,
        showMusicPlayer: navigationConfigToCommit.showMusicPlayer,
        showSocials: navigationConfigToCommit.showSocials,
      });
      
      const unsignedRequest = {
        communityId,
        navigationConfig: navigationConfigToCommit,
        publicKey,
        timestamp: moment().toISOString(),
      };
      
      const signedRequest = signSignable(
        unsignedRequest,
        currentIdentity.rootKeys.privateKey
      );
      
      // Update navigation config in database
      console.log('[navigationStore] Sending navigation config update request');
      await axiosBackend.put("/api/navigation/config", signedRequest);
      console.log('[navigationStore] Navigation config update request successful');
      
      // Step 5: Update local state to reflect committed changes
      set((draft) => {
        draft.navigation.remoteNavigation = cloneDeep(itemsToCommit);
        // Also update localNavigation to remove notifications if it exists
        draft.navigation.localNavigation = draft.navigation.localNavigation.filter(item => item.id !== 'notifications');
      }, "commitNavigationChanges");
      
      console.log('[navigationStore] Commit completed successfully:', {
        committedItemCount: itemsToCommit.length,
        remoteNavigationCount: get().navigation.remoteNavigation.length,
        localNavigationCount: get().navigation.localNavigation.length
      });
    } catch (error: any) {
      console.error("Failed to commit navigation changes:", error);
      // Log full error response for debugging
      if (error?.response) {
        console.error("API error response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      } else if (error?.message) {
        console.error("Error message:", error.message);
      }
      console.error("Full error object:", JSON.stringify(error, null, 2));
      throw error;
    }
  },
});

