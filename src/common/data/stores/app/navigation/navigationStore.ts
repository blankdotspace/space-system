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
  spaceName: string;
  spaceType: typeof SPACE_TYPES.NAV_PAGE;
  identityPublicKey: string;
  timestamp: string;
  fid: null;
}

interface NavigationStoreState {
  // Remote navigation config from database (SystemConfig)
  // Stores the full NavigationConfig to preserve fields like logoTooltip, showMusicPlayer, showSocials
  remoteNavigationConfig: NavigationConfig | null;
  
  // Remote navigation items (derived from remoteNavigationConfig for convenience)
  remoteNavigation: NavigationItem[];
  
  // Local (staged) navigation items
  localNavigation: NavigationItem[];
}

interface NavigationStoreActions {
  // Load navigation from SystemConfig (called on app load)
  loadNavigation: (navigationConfig: NavigationConfig | undefined) => void;
  
  // Navigation item operations (staged changes)
  createNavigationItem: (
    item: Omit<NavigationItem, "id" | "href"> & { href?: string }
  ) => Promise<NavigationItem>;
  deleteNavigationItem: (itemId: string) => void;
  renameNavigationItem: (itemId: string, updates: { label?: string; href?: string; icon?: NavigationItem["icon"] }) => void;
  updateNavigationOrder: (newOrder: NavigationItem[]) => void;
  
  // Commit all staged changes to database
  commitNavigationChanges: (communityId: string) => Promise<void>;
  
  // Reset local changes to match remote
  resetNavigationChanges: () => void;
  
  // Check if there are uncommitted changes
  hasUncommittedChanges: () => boolean;
}

export type NavigationStore = NavigationStoreState & NavigationStoreActions;

export const navigationStoreDefaults: NavigationStoreState = {
  remoteNavigationConfig: null,
  remoteNavigation: [],
  localNavigation: [],
};

export const createNavigationStoreFunc = (
  set: StoreSet<AppStore>,
  get: StoreGet<AppStore>,
): NavigationStore => ({
  ...navigationStoreDefaults,
  
  loadNavigation: (navigationConfig) => {
    // Filter out notifications - it's hardcoded and not managed as a config item
    const items = (navigationConfig?.items || []).filter(item => item.id !== 'notifications');
    
    // Store the full config, but with filtered items (without notifications)
    const configWithoutNotifications: NavigationConfig | null = navigationConfig
      ? {
          ...navigationConfig,
          items: items,
        }
      : null;
    
    set((draft) => {
      draft.navigation.remoteNavigationConfig = configWithoutNotifications;
      draft.navigation.remoteNavigation = cloneDeep(items);
      draft.navigation.localNavigation = cloneDeep(items);
    }, "loadNavigation");
  },
  
  createNavigationItem: async (itemData) => {
    const state = get().navigation;
    
    // Validate label
    const labelError = validateNavItemLabel(itemData.label);
    if (labelError) {
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
    }, "createNavigationItem-addLocalSpace");
    
    set((draft) => {
      draft.navigation.localNavigation.push(cloneDeep(newItem));
    }, "createNavigationItem");
    
    return newItem;
  },
  
  deleteNavigationItem: (itemId) => {
    set((draft) => {
      // Remove from local navigation
      draft.navigation.localNavigation = draft.navigation.localNavigation.filter(
        (item) => item.id !== itemId
      );
    }, "deleteNavigationItem");
  },
  
  renameNavigationItem: (itemId, updates) => {
    const state = get().navigation;
    const itemIndex = state.localNavigation.findIndex(
      (item) => item.id === itemId
    );
    
    if (itemIndex === -1) return;
    
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
    
    // Apply updates
    set((draft) => {
      if (updates.label !== undefined) {
        draft.navigation.localNavigation[itemIndex].label = newLabel;
      }
      // Update href if it changed (either explicitly or auto-generated from label)
      if (updates.href !== undefined || (updates.label !== undefined && newHref !== currentItem.href)) {
        draft.navigation.localNavigation[itemIndex].href = newHref;
      }
      if (updates.icon !== undefined) {
        draft.navigation.localNavigation[itemIndex].icon = updates.icon;
      }
    }, "renameNavigationItem");
  },
  
  updateNavigationOrder: (newOrder) => {
    set((draft) => {
      draft.navigation.localNavigation = cloneDeep(newOrder);
    }, "updateNavigationOrder");
  },
  
  resetNavigationChanges: () => {
    set((draft) => {
      draft.navigation.localNavigation = cloneDeep(draft.navigation.remoteNavigation);
    }, "resetNavigationChanges");
  },
  
  hasUncommittedChanges: () => {
    const state = get().navigation;
    // Compare arrays directly - check length, order, and content
    if (state.localNavigation.length !== state.remoteNavigation.length) {
      return true;
    }
    
    // Check if order changed or any item properties changed
    return state.localNavigation.some((localItem, index) => {
      const remoteItem = state.remoteNavigation[index];
      return !remoteItem || 
        localItem.id !== remoteItem.id ||
        localItem.label !== remoteItem.label ||
        localItem.href !== remoteItem.href ||
        localItem.icon !== remoteItem.icon ||
        localItem.spaceId !== remoteItem.spaceId;
    });
  },
  
  commitNavigationChanges: async (communityId: string) => {
    const state = get().navigation;
    const publicKey = get().account.currentSpaceIdentityPublicKey;
    
    if (!publicKey) {
      throw new Error("No identity public key available");
    }
    
    // communityId is passed as parameter from the component
    
    try {
      // Step 1: Create spaces for new items that require them
      // Derive added items by comparing localNavigation with remoteNavigation
      const remoteItemIds = new Set(state.remoteNavigation.map(item => item.id));
      const addedItems = state.localNavigation.filter(item => !remoteItemIds.has(item.id));
      
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
      
      for (const space of spacesToCreate) {
        // Register space in database - API generates spaceId
        const unsignedRegistration: SpaceRegistrationNavPage = {
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
        
        // TODO: For local testing, skip space registration if API fails
        let actualSpaceId = space.spaceId;
        try {
          const { data: registrationResponse } = await axiosBackend.post<RegisterNewSpaceResponse>("/api/space/registry", signedRegistration);
          
          if (registrationResponse.result !== "success" || !registrationResponse.value?.spaceId) {
            throw new Error(`Failed to register space for nav item ${space.itemId}`);
          }
          
          actualSpaceId = registrationResponse.value!.spaceId;
          
          // Update the navigation item and space store with the actual spaceId from the API
          set((draft) => {
            const itemIndex = draft.navigation.localNavigation.findIndex(
              (item) => item.id === space.itemId
            );
            if (itemIndex !== -1) {
              draft.navigation.localNavigation[itemIndex].spaceId = actualSpaceId;
            }
            // Move the localSpaces entry to the new spaceId (if spaceId changed)
            if (space.spaceId !== actualSpaceId && draft.space.localSpaces[space.spaceId]) {
              draft.space.localSpaces[actualSpaceId] = draft.space.localSpaces[space.spaceId];
              draft.space.localSpaces[actualSpaceId].id = actualSpaceId;
              delete draft.space.localSpaces[space.spaceId];
            } else if (space.spaceId === actualSpaceId) {
              // Ensure the spaceId is set correctly
              draft.space.localSpaces[actualSpaceId].id = actualSpaceId;
            }
          }, "commitNavigationChanges-updateSpaceId");
          
          // Use spaceStore's commitAllSpaceChanges to commit the tab order and sync state
          // This handles tab commits, deletions, and order updates, and syncs remoteSpaces
          await get().space.commitAllSpaceChanges(actualSpaceId);
        } catch (spaceError: any) {
          // For local testing, continue even if space registration fails
          console.warn(`Space registration failed for nav item ${space.itemId} - continuing with local spaceId:`, spaceError);
        }
      }
      
      // Step 2: Space cleanup for deleted items is handled server-side in the navigation config API endpoint
      // The endpoint compares old vs new navigation config to identify deleted spaces and cleans them up
      
      // Step 3: Update navigation config in database
      // Filter out notifications - it's hardcoded and not stored in config
      const itemsToCommit = state.localNavigation.filter(item => item.id !== 'notifications');
      
      // Build full navigation config by merging updated items with existing config
      // This preserves other fields like logoTooltip, showMusicPlayer, showSocials
      const baseConfig = state.remoteNavigationConfig || {};
      const navigationConfigToCommit: NavigationConfig = {
        ...baseConfig,
        items: itemsToCommit,
      };
      
      // Debug: log what we're about to send
      console.log("Committing navigation config:", {
        items: itemsToCommit.map(item => ({ id: item.id, label: item.label, href: item.href })),
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
      await axiosBackend.put("/api/navigation/config", signedRequest);
      
      // Step 4: Update local state to reflect committed changes
      // Update both remoteNavigationConfig (full config) and remoteNavigation (items only)
      set((draft) => {
        draft.navigation.remoteNavigationConfig = cloneDeep(navigationConfigToCommit);
        draft.navigation.remoteNavigation = cloneDeep(itemsToCommit);
        // Also update localNavigation to remove notifications if it exists
        draft.navigation.localNavigation = draft.navigation.localNavigation.filter(item => item.id !== 'notifications');
      }, "commitNavigationChanges");
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

