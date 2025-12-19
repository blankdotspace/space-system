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

// Type for navPage space registration (similar to other space registration types)
interface SpaceRegistrationNavPage {
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
}

interface NavigationStoreActions {
  // Load navigation from SystemConfig (called on app load)
  loadNavigation: (navigationConfig: NavigationConfig | undefined) => void;
  
  // Navigation item operations (staged changes)
  createNavigationItem: (
    item: Omit<NavigationItem, "id"> & { createSpace?: boolean }
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
  remoteNavigation: [],
  localNavigation: [],
};

export const createNavigationStoreFunc = (
  set: StoreSet<AppStore>,
  get: StoreGet<AppStore>,
): NavigationStore => ({
  ...navigationStoreDefaults,
  
  loadNavigation: (navigationConfig) => {
    const items = navigationConfig?.items || [];
    set((draft) => {
      draft.navigation.remoteNavigation = cloneDeep(items);
      draft.navigation.localNavigation = cloneDeep(items);
    }, "loadNavigation");
  },
  
  createNavigationItem: async (itemData) => {
    const newId = uuidv4();
    const newItem: NavigationItem = {
      id: newId,
      ...itemData,
    };
    
    // If createSpace is true, generate a spaceId and create local space entry
    if (itemData.createSpace) {
      const spaceId = uuidv4();
      
      set((draft) => {
        // Add to space store's localSpaces so PublicSpace can find it
        // Initialize with empty tabOrder (will be created on commit)
        draft.space.localSpaces[spaceId] = {
          id: spaceId,
          updatedAt: moment().toISOString(),
          tabs: {},
          order: ["Home"], // Initial default tab
          changedNames: {},
          deletedTabs: [],
        };
      }, "createNavigationItem-addLocalSpace");
      
      newItem.spaceId = spaceId;
    }
    
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
    set((draft) => {
      const itemIndex = draft.navigation.localNavigation.findIndex(
        (item) => item.id === itemId
      );
      
      if (itemIndex === -1) return;
      
      // Update the item directly in localNavigation
      if (updates.label !== undefined) draft.navigation.localNavigation[itemIndex].label = updates.label;
      if (updates.href !== undefined) draft.navigation.localNavigation[itemIndex].href = updates.href;
      if (updates.icon !== undefined) draft.navigation.localNavigation[itemIndex].icon = updates.icon;
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
      const unsignedRequest = {
        communityId,
        navigationConfig: {
          items: state.localNavigation,
        },
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
      set((draft) => {
        draft.navigation.remoteNavigation = cloneDeep(draft.navigation.localNavigation);
      }, "commitNavigationChanges");
    } catch (error) {
      console.error("Failed to commit navigation changes:", error);
      throw error;
    }
  },
});

export function partializedNavigationStore(state: AppStore) {
  return {
    // Only persist minimal state if needed
    // Navigation config is loaded from SystemConfig on app start
  };
}

