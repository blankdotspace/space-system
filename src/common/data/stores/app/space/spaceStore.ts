import {
  SpaceConfig,
  SpaceConfigSaveDetails,
} from "@/app/(spaces)/Space";
import { FidgetConfig, FidgetInstanceData } from "@/common/fidgets";
import { SignedFile, signSignable } from "@/common/lib/signedFiles";
import { EtherScanChainName } from "@/constants/etherscanChainIds";
import { SPACE_TYPES } from "@/common/types/spaceData";
import { 
  INITIAL_SPACE_CONFIG_EMPTY,
  createInitialProfileSpaceConfigForFid,
  createInitialChannelSpaceConfig
} from "@/config";
import {
  ModifiableSpacesResponse,
  RegisterNewSpaceResponse,
  SpaceRegistrationContract,
  SpaceRegistrationFid,
  SpaceRegistrationProposer,
  SpaceRegistrationChannel,
} from "@/pages/api/space/registry";
import {
  UnsignedUpdateTabOrderRequest,
  UpdateTabOrderRequest,
} from "@/pages/api/space/registry/[spaceId]";
import {
  RegisterNewSpaceTabResponse,
  UnsignedSpaceTabRegistration,
} from "@/pages/api/space/registry/[spaceId]/tabs";
import { UnsignedDeleteSpaceTabRequest } from "@/pages/api/space/registry/[spaceId]/tabs/[tabId]";
import axios from "axios";
import stringify from "fast-json-stable-stringify";
import {
  cloneDeep,
  debounce,
  filter,
  fromPairs,
  isArray,
  isNil,
  isUndefined,
  map,
  mergeWith
} from "lodash";
import moment from "moment";
import { AppStore } from "..";
import axiosBackend from "../../../api/backend";
import { createClient } from "../../../database/supabase/clients/component";
import { StoreGet, StoreSet } from "../../createStore";
import { AnalyticsEvent } from "@/common/constants/analyticsEvents";
import { analytics } from "@/common/providers/AnalyticsProvider";
import {
  validateTabName,
  isDuplicateTabName,
  withOptimisticUpdate,
} from "@/common/utils/tabUtils";
type SpaceId = string;

// SpaceConfig includes all of the Fidget Config
// Spaces saved in the DB store the full FidgetConfig (including data and editable),
// but we omit isEditable at the SpaceConfig level.
// Note: Fidget data (config.data) IS persisted to the database.
export type DatabaseWritableSpaceConfig = Omit<
  SpaceConfig,
  "fidgetInstanceDatums" | "isEditable"
> & {
  fidgetInstanceDatums: {
    [key: string]: Omit<FidgetInstanceData, "config"> & {
      config: FidgetConfig;
    };
  };
};

export type DatabaseWritableSpaceSaveConfig = Partial<
  Omit<SpaceConfigSaveDetails, "fidgetInstanceDatums" | "isEditable">
> & {
  fidgetInstanceDatums?: {
    [key: string]: Omit<FidgetInstanceData, "config"> & {
      config: FidgetConfig;
    };
  };
};

export type UpdatableDatabaseWritableSpaceSaveConfig =
  DatabaseWritableSpaceSaveConfig & {
    isPrivate?: boolean;
  };

export type UpdatableSpaceConfig = DatabaseWritableSpaceConfig & {
  isPrivate: boolean;
};

interface CachedSpace {
  // Machine generated ID, immutable
  id: SpaceId;
  updatedAt: string;
  tabs: {
    [tabName: string]: UpdatableSpaceConfig;
  };
  order: string[];
  orderUpdatedAt?: string;
  contractAddress?: string | null;
  network?: string | null;
  proposalId?: string | null;
}

interface LocalSpace extends CachedSpace {
  changedNames: {
    [newName: string]: string;
  };
  fid?: number | null;
  channelId?: string | null;
}

interface SpaceState {
  remoteSpaces: Record<string, CachedSpace>;
  editableSpaces: Record<SpaceId, string>;
  localSpaces: Record<string, LocalSpace>;
}

export interface SpaceLookupInfo {
  spaceId: string;
  name: string;
}

interface SpaceActions {
  commitSpaceTabToDatabase: (
    spaceId: string,
    tabName: string,
    network?: string,
    isInitialCommit?: boolean,
  ) => Promise<void> | undefined;
  saveLocalSpaceTab: (
    spaceId: string,
    tabName: string,
    config: UpdatableDatabaseWritableSpaceSaveConfig,
  ) => Promise<void>;
  renameSpaceTab: (
    spaceId: string,
    tabName: string,
    newName: string,
    config?: UpdatableDatabaseWritableSpaceSaveConfig,
    network?: EtherScanChainName,
  ) => Promise<void>;
  loadEditableSpaces: () => Promise<Record<SpaceId, string>>;
  loadSpaceTabOrder: (spaceId: string) => Promise<void>;
  loadSpaceTab: (
    spaceId: string,
    tabName: string,
    fid?: number,
  ) => Promise<void>;
  deleteSpaceTab: (
    spaceId: string,
    tabName: string,
    network?: EtherScanChainName,
  ) => Promise<void> | undefined;
  createSpaceTab: (
    spaceId: string,
    tabName: string,
    initialConfig?: Omit<SpaceConfig, "isEditable">,
    network?: EtherScanChainName,
  ) => Promise<{ tabName: string }> | undefined;
  updateLocalSpaceOrder: (
    spaceId: string,
    newOrder: string[],
    network?: string,
  ) => Promise<void>;
  commitSpaceOrderToDatabase: (
    spaceId: string,
    network?: EtherScanChainName,
  ) => Promise<void> | undefined;
  registerSpaceFid: (
    fid: number,
    name: string,
    path: string,
  ) => Promise<string | undefined>;
  registerSpaceContract: (
    address: string,
    name: string,
    fid: number,
    initialConfig: Omit<SpaceConfig, "isEditable">,
    network: EtherScanChainName,
  ) => Promise<string | undefined>;
  registerProposalSpace: (
    proposalId: string,
    initialConfig: Omit<SpaceConfig, "isEditable">,
  ) => Promise<string | undefined>;
  registerChannelSpace: (
    channelId: string,
    channelName: string,
    moderatorFid: number,
    path: string,
    moderatorFids?: number[],
  ) => Promise<string | undefined>;
  clear: () => void;
}

export type SpaceStore = SpaceState & SpaceActions;

export const spaceStoreprofiles: SpaceState = {
  remoteSpaces: {},
  editableSpaces: {},
  localSpaces: {},
};

export const createSpaceStoreFunc = (
  set: StoreSet<AppStore>,
  get: StoreGet<AppStore>,
): SpaceStore => ({
  ...spaceStoreprofiles,
  commitSpaceTabToDatabase: async (spaceId: string, tabName: string, network?: string, isInitialCommit = false) => {
    const localCopy = cloneDeep(
      get().space.localSpaces[spaceId].tabs[tabName],
    );
    
    if (!localCopy) {
      console.warn(`Tab ${tabName} not found in localSpaces for space ${spaceId}`);
      return;
    }

    // Determine storage file name (handles edge case: new tab renamed before commit)
    const localSpace = get().space.localSpaces[spaceId];
    const remoteSpace = get().space.remoteSpaces[spaceId];
    const storageFileName = (() => {
      const oldName = localSpace.changedNames[tabName];
      
      // No rename - use current name
      if (!oldName) {
        return tabName;
      }
      
      // Check if old file exists in storage (via remoteSpaces)
      const oldFileExists = remoteSpace?.tabs?.[oldName] !== undefined;
      
      if (oldFileExists) {
        // Real rename: file exists at old name, use old name for move operation
        return oldName;
      } else {
        // Edge case: new tab that was renamed - use new name (nothing to move)
        return tabName;
      }
    })();
    
    const file = await get().account.createSignedFile(
      stringify(localCopy),
      "json",
      { fileName: tabName },
    );
    
    try {
      await axiosBackend.post(
        `/api/space/registry/${spaceId}/tabs/${storageFileName}`,
        { ...file, network },
      );

      set((draft) => {
        // Update remoteSpaces with new name
        draft.space.remoteSpaces[spaceId].tabs[tabName] = localCopy;
        
        // Remove old name from remoteSpaces (if it was a rename)
        if (storageFileName !== tabName) {
          delete draft.space.remoteSpaces[spaceId].tabs[storageFileName];
        }
        
        // Clear rename tracking
        delete draft.space.localSpaces[spaceId].changedNames[tabName];
      }, "commitSpaceTabToDatabase");
    } catch (e) {
      console.error("Failed to commit space tab:", e);
      throw e;
    }
  },
  saveLocalSpaceTab: async (spaceId, tabName, config) => {
    const newTimestamp = moment().toISOString();
    let localCopy;

    const existingTab = get().space.localSpaces[spaceId]?.tabs?.[tabName];

    if (!existingTab) {
      localCopy = {
        ...cloneDeep(config),
        timestamp: newTimestamp,
      };
    } else {
      localCopy = cloneDeep(existingTab);
      mergeWith(localCopy, config, (objValue, srcValue) => {
        if (isArray(srcValue)) return srcValue;
        if (typeof srcValue === "object" && srcValue !== null) {
          return srcValue;
        }
      });
      localCopy.timestamp = newTimestamp;
    }

    set((draft) => {
      if (!draft.space.localSpaces[spaceId]) {
        draft.space.localSpaces[spaceId] = {
          id: spaceId,
          updatedAt: moment().toISOString(),
          tabs: {},
          order: [],
          changedNames: {},
        };
      }

      const spaceDraft = draft.space.localSpaces[spaceId];
      spaceDraft.tabs[tabName] = localCopy;
      spaceDraft.updatedAt = newTimestamp;
    }, "saveLocalSpaceTab");
  },
  renameSpaceTab: async (
    spaceId,
    tabName,
    newName,
    config,
    network,
  ) => {
    const existingSpace = get().space.localSpaces[spaceId];
    if (!existingSpace) {
      console.warn("Attempted to rename tab for unknown space", {
        spaceId,
        tabName,
        newName,
      });
      return;
    }

    const sanitizedNewName = newName.trim();
    if (!sanitizedNewName || sanitizedNewName === tabName) {
      return;
    }

    // Validate tab name using shared utility
    const validationError = validateTabName(sanitizedNewName);
    if (validationError) {
      console.error("Invalid tab name characters:", sanitizedNewName);
      return;
    }

    const baselineOrder = existingSpace.order.length
      ? cloneDeep(existingSpace.order)
      : Object.keys(existingSpace.tabs || {});

    // Check for duplicates - should not happen since UI ensures uniqueness
    // but log a warning just in case
    const allTabNames = [
      ...baselineOrder,
      ...Object.keys(existingSpace.tabs || {}),
    ];
    const uniqueTabNames = [...new Set(allTabNames)];
    
    if (isDuplicateTabName(sanitizedNewName, uniqueTabNames, tabName)) {
      console.warn(`Tab name "${sanitizedNewName}" already exists - UI should have ensured uniqueness`);
      return; // Exit gracefully instead of throwing
    }

    const previousTabState = existingSpace.tabs?.[tabName];
    if (!previousTabState) {
      console.error("Attempted to rename missing tab", {
        spaceId,
        tabName,
        newName,
      });
      return;
    }

    const previousOrder = cloneDeep(baselineOrder);
    const previousChangedNames = cloneDeep(existingSpace.changedNames);

    const mergedConfig = cloneDeep(previousTabState);
    if (config) {
      mergeWith(mergedConfig, config, (objValue, srcValue) => {
        if (isArray(srcValue)) return srcValue;
        if (typeof srcValue === "object" && srcValue !== null) {
          return srcValue;
        }
      });
    }
    const newTimestamp = moment().toISOString();
    mergedConfig.timestamp = newTimestamp;

    const orderWithoutOldName = previousOrder.filter((name) => name !== tabName);
    const previousIndex = previousOrder.indexOf(tabName);
    if (previousIndex >= 0) {
      orderWithoutOldName.splice(previousIndex, 0, sanitizedNewName);
    } else if (!orderWithoutOldName.includes(sanitizedNewName)) {
      orderWithoutOldName.push(sanitizedNewName);
    }

    const previousRemoteName =
      existingSpace.changedNames?.[tabName] || tabName;

    const resolvedNetworkCandidate =
      network ?? existingSpace.network ?? get().space.remoteSpaces[spaceId]?.network;
    const resolvedNetwork = resolvedNetworkCandidate ?? undefined;

    // Use shared optimistic update pattern
    return withOptimisticUpdate({
      updateFn: () => {
        set((draft) => {
          const spaceDraft = draft.space.localSpaces[spaceId];
          if (!spaceDraft) {
            return;
          }

          spaceDraft.tabs[sanitizedNewName] = cloneDeep(mergedConfig);
          delete spaceDraft.tabs[tabName];

          spaceDraft.changedNames[sanitizedNewName] = previousRemoteName;
          delete spaceDraft.changedNames[tabName];

          spaceDraft.order = orderWithoutOldName;
          spaceDraft.updatedAt = newTimestamp;
          spaceDraft.orderUpdatedAt = newTimestamp;

          if (draft.currentSpace.currentTabName === tabName) {
            draft.currentSpace.currentTabName = sanitizedNewName;
          }
        }, "renameSpaceTabOptimistic");
      },
      commitFn: async () => {
        const commitPromise = get().space.commitSpaceTabToDatabase(
          spaceId,
          sanitizedNewName,
          resolvedNetwork,
        );
        if (commitPromise) {
          await commitPromise;
        }
      },
      rollbackFn: () => {
        set((draft) => {
          const spaceDraft = draft.space.localSpaces[spaceId];
          if (!spaceDraft) {
            return;
          }

          spaceDraft.tabs[tabName] = cloneDeep(previousTabState);
          delete spaceDraft.tabs[sanitizedNewName];

          spaceDraft.changedNames = cloneDeep(previousChangedNames);
          spaceDraft.order = previousOrder;

          const rollbackTimestamp = moment().toISOString();
          spaceDraft.updatedAt = rollbackTimestamp;
          spaceDraft.orderUpdatedAt = rollbackTimestamp;
        }, "renameSpaceTabRollback");

        set((draft) => {
          if (draft.currentSpace.currentTabName === sanitizedNewName) {
            draft.currentSpace.currentTabName = tabName;
          }
        }, "renameSpaceTabRollbackCurrentTab");
      },
      errorConfig: {
        title: "Error Renaming Tab",
        message: "We couldn't rename this tab. Your original tab name has been restored.",
      },
    });
  },
  deleteSpaceTab: async (
    spaceId,
    tabName,
    network?: EtherScanChainName,
  ) => {
      // This deletes locally and remotely at the same time
      // We can separate these out, but I think deleting feels better as a single decisive action
      const unsignedDeleteTabRequest: UnsignedDeleteSpaceTabRequest = {
        publicKey: get().account.currentSpaceIdentityPublicKey!,
        timestamp: moment().toISOString(),
        spaceId,
        tabName,
        network,
      };
      const signedRequest = signSignable(
        unsignedDeleteTabRequest,
        get().account.getCurrentIdentity()!.rootKeys.privateKey,
      );
      try {
        await axiosBackend.delete(
          `/api/space/registry/${spaceId}/tabs/${tabName}`,
          { data: signedRequest },
        );
        set((draft) => {
          delete draft.space.localSpaces[spaceId].tabs[tabName];
          delete draft.space.remoteSpaces[spaceId].tabs[tabName];

          // Update order arrays with new arrays to ensure state updates
          draft.space.localSpaces[spaceId].order = filter(
            draft.space.localSpaces[spaceId].order,
            (x) => x !== tabName,
          );
          draft.space.remoteSpaces[spaceId].order = filter(
            draft.space.localSpaces[spaceId].order,
            (x) => x !== tabName,
          );
          
          // Update timestamps
          const timestamp = moment().toISOString();
          draft.space.localSpaces[spaceId].updatedAt = timestamp;
          draft.space.localSpaces[spaceId].orderUpdatedAt = timestamp;
          draft.space.remoteSpaces[spaceId].updatedAt = timestamp;
        }, "deleteSpaceTab");
        return get().space.commitSpaceOrderToDatabase(spaceId, network);
      } catch (e) {
        console.error(e);
      }
    },
  createSpaceTab: async (
    spaceId: string,
    tabName: string,
    initialConfig?: Omit<SpaceConfig, "isEditable">,
    network?: EtherScanChainName,
  ) => {
    // Validate the tab name before proceeding
    const validationError = validateTabName(tabName);
    if (validationError) {
      console.error("Invalid tab name:", tabName, validationError);
      // Use a safe fallback name instead of throwing
      tabName = `Tab ${Date.now()}`;
    }

    if (isNil(initialConfig)) {
      initialConfig = INITIAL_SPACE_CONFIG_EMPTY;
    }

    set((draft) => {
      if (isUndefined(draft.space.localSpaces[spaceId])) {
        draft.space.localSpaces[spaceId] = {
          tabs: {},
          order: [],
          updatedAt: moment().toISOString(),
          changedNames: {},
          id: spaceId,
        };
      }

      draft.space.localSpaces[spaceId].tabs[tabName] = {
        ...cloneDeep(initialConfig!),
        theme: {
          ...cloneDeep(initialConfig!.theme),
          id: `${spaceId}-${tabName}-theme`,
          name: `${spaceId}-${tabName}-theme`,
        },
        isPrivate: false,
        timestamp: moment().toISOString(),
      };

      draft.space.localSpaces[spaceId].order.push(tabName);
      const timestampNow = moment().toISOString();
      draft.space.localSpaces[spaceId].orderUpdatedAt = timestampNow;
      draft.space.localSpaces[spaceId].updatedAt = timestampNow;
    }, "createSpaceTab");
    analytics.track(AnalyticsEvent.CREATE_NEW_TAB);

    // Return the tabName immediately so UI can switch to it
    const result = { tabName };

    // Then make the remote API call in the background
    const unsignedRequest: UnsignedSpaceTabRegistration = {
      identityPublicKey: get().account.currentSpaceIdentityPublicKey!,
      timestamp: moment().toISOString(),
      spaceId,
      tabName,
      initialConfig,
      network,
    };
    const signedRequest = signSignable(
      unsignedRequest,
      get().account.getCurrentIdentity()!.rootKeys.privateKey,
    );

    try {
      await axiosBackend.post<RegisterNewSpaceTabResponse>(
        `/api/space/registry/${spaceId}/tabs`,
        signedRequest,
      );
      
      // Create a signed file for the initial configuration
      const localCopy = cloneDeep(get().space.localSpaces[spaceId].tabs[tabName]);
      const file = await get().account.createSignedFile(
        stringify(localCopy),
        "json",
        { fileName: tabName },
      );
      
      // Commit both the order and the tab content immediately
      await Promise.all([
        get().space.commitSpaceOrderToDatabase(spaceId, network),
        axiosBackend.post(
          `/api/space/registry/${spaceId}/tabs/${tabName}`,
          { ...file, network },
        )
      ]);
      
      return result;
    } catch (e) {
      console.error("Failed to create space tab:", {
        error: e,
        spaceId,
        tabName,
        network,
        request: {
          identityPublicKey: unsignedRequest.identityPublicKey,
          timestamp: unsignedRequest.timestamp,
          initialConfig: initialConfig,
          network: network
        },
        response: axios.isAxiosError(e) ? {
          status: e.response?.status,
          statusText: e.response?.statusText,
          data: e.response?.data,
          headers: e.response?.headers
        } : null,
        stack: e instanceof Error ? e.stack : undefined,
        localState: {
          tabs: get().space.localSpaces[spaceId]?.tabs,
          order: get().space.localSpaces[spaceId]?.order,
          changedNames: get().space.localSpaces[spaceId]?.changedNames
        }
      });
      
      // Check if it's a rate limit error
      if (axios.isAxiosError(e) && e.response?.status === 429) {
        console.warn("Rate limit hit, attempting retry after delay", {
          spaceId,
          tabName,
          network,
          retryAfter: e.response?.headers?.['retry-after'],
          rateLimitRemaining: e.response?.headers?.['x-ratelimit-remaining']
        });
        
        // If it's a rate limit error, we'll retry after a delay
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        try {
          await axiosBackend.post<RegisterNewSpaceTabResponse>(
            `/api/space/registry/${spaceId}/tabs`,
            signedRequest,
          );
          await get().space.commitSpaceOrderToDatabase(spaceId, network);
          return result;
        } catch (retryError) {
          console.error("Failed to create space tab after retry:", {
            error: retryError,
            spaceId,
            tabName,
            network,
            originalError: e
          });
          // If retry fails, we'll keep the local state but show an error
          throw new Error("Failed to create tab due to rate limiting. Please try again in a few seconds.");
        }
      }
      
      // For other errors, roll back local changes
      console.error("Rolling back local changes due to error:", {
        error: e,
        spaceId,
        tabName,
        network,
        localState: {
          tabs: get().space.localSpaces[spaceId]?.tabs,
          order: get().space.localSpaces[spaceId]?.order
        }
      });
      
      throw e; // Re-throw to allow error handling in the UI
    }
  },
  updateLocalSpaceOrder: async (spaceId, newOrder) => {
    set((draft) => {
      draft.space.localSpaces[spaceId].order = newOrder;
      const timestampNow = moment().toISOString();
      draft.space.localSpaces[spaceId].orderUpdatedAt = timestampNow;
      draft.space.localSpaces[spaceId].updatedAt = timestampNow;
    });
  },
  commitSpaceOrderToDatabase: debounce(
    async (spaceId, network?: EtherScanChainName) => {
      // console.debug("debug", "Commiting space order to database");
      const timestamp = moment().toISOString();

      const unsignedReq: UnsignedUpdateTabOrderRequest = {
        spaceId,
        tabOrder: get().space.localSpaces[spaceId].order,
        publicKey: get().account.currentSpaceIdentityPublicKey!,
        timestamp,
        network,
      };
      const signedRequest = signSignable(
        unsignedReq,
        get().account.getCurrentIdentity()!.rootKeys.privateKey,
      );
      try {
        await axiosBackend.post<RegisterNewSpaceTabResponse>(
          `/api/space/registry/${spaceId}`,
          signedRequest,
        );
        set((draft) => {
          if (isUndefined(draft.space.remoteSpaces[spaceId])) {
            draft.space.remoteSpaces[spaceId] = {
              tabs: {},
              order: [],
              updatedAt: moment(0).toISOString(),
              id: spaceId,
            };
          }

          draft.space.remoteSpaces[spaceId].order = cloneDeep(
            get().space.localSpaces[spaceId].order,
          );

          draft.space.remoteSpaces[spaceId].orderUpdatedAt = timestamp;
          draft.space.localSpaces[spaceId].orderUpdatedAt = timestamp;
        }, "commitSpaceOrderToDatabase");
        analytics.track(AnalyticsEvent.SAVE_SPACE_THEME);
      } catch (e) {
        console.error(e);
      }
    },
    1000,
  ),
  loadSpaceTab: async (spaceId, tabName) => {
    const supabase = createClient();
    try {
      // Fetch the public URL for the space tab file
      const {
        data: { publicUrl },
      } = await supabase.storage
        .from("spaces")
        .getPublicUrl(`${spaceId}/tabs/${tabName}`);

      const t = Math.random().toString(36).substring(2);
      const urlWithParam = `${publicUrl}?t=${t}`;

      // Download the file content, ensuring no caching
      const { data } = await axios.get<Blob>(urlWithParam, {
        responseType: "blob",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      // Parse the file data and decrypt it
      const fileData = JSON.parse(await data.text()) as SignedFile;
      const remoteSpaceConfig = JSON.parse(
        await get().account.decryptEncryptedSignedFile(fileData),
      ) as DatabaseWritableSpaceConfig;

      // Prepare the remote space config for updating, including privacy status
      const remoteUpdatableSpaceConfig = {
        ...remoteSpaceConfig,
        isPrivate: fileData.isEncrypted,
      };

      set((draft) => {
        // Initialize local and remote spaces if they don't exist
        if (isUndefined(draft.space.localSpaces[spaceId])) {
          draft.space.localSpaces[spaceId] = {
            tabs: {},
            order: [],
            updatedAt: moment().toISOString(),
            changedNames: {},
            id: spaceId,
          };
        }
        if (isUndefined(draft.space.remoteSpaces[spaceId])) {
          draft.space.remoteSpaces[spaceId] = {
            tabs: {},
            order: [],
            updatedAt: moment().toISOString(),
            id: spaceId,
          };
        }

        const localTab = draft.space.localSpaces[spaceId].tabs[tabName];

        // Compare timestamps if local tab exists
        if (
          !isUndefined(localTab) &&
          localTab.timestamp &&
          remoteUpdatableSpaceConfig.timestamp
        ) {
          const localTimestamp = moment(localTab.timestamp);
          const remoteTimestamp = moment(remoteUpdatableSpaceConfig.timestamp);

          if (remoteTimestamp.isAfter(localTimestamp)) {
            // Remote is newer, update both local and remote
            draft.space.remoteSpaces[spaceId].tabs[tabName] =
              remoteUpdatableSpaceConfig;
            draft.space.localSpaces[spaceId].tabs[tabName] = cloneDeep(
              remoteUpdatableSpaceConfig,
            );
          } else {
            // Local is newer or same age, keep local data but update remote to reflect actual database state
            draft.space.remoteSpaces[spaceId].tabs[tabName] =
              remoteUpdatableSpaceConfig;
            // Keep localTab unchanged - it already has the newer local changes
          }
        } else {
          // No local tab, create it with remote data
          draft.space.remoteSpaces[spaceId].tabs[tabName] =
            remoteUpdatableSpaceConfig;
          draft.space.localSpaces[spaceId].tabs[tabName] = cloneDeep(
            remoteUpdatableSpaceConfig,
          );
        }
      }, "loadSpaceTab");
    } catch (e) {
      console.error(`Error loading space tab ${spaceId}/${tabName}:`, e);
    }
  },
  loadSpaceTabOrder: async (spaceId: string) => {
    try {
      // Fetch the remote tab order data
      const supabase = createClient();
      const {
        data: { publicUrl },
      } = await supabase.storage
        .from("spaces")
        .getPublicUrl(`${spaceId}/tabOrder`);

      const t = Math.random().toString(36).substring(2);
      const urlWithParam = `${publicUrl}?t=${t}`;

      const { data } = await axios.get<Blob>(urlWithParam, {
        responseType: "blob",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
      const tabOrderReq = JSON.parse(
        await data.text(),
      ) as UpdateTabOrderRequest;

      // Compare local and remote timestamps
      const localSpace = get().space.localSpaces[spaceId];
      const remoteTimestamp = moment(tabOrderReq.timestamp);
      const localTimestamp = localSpace?.orderUpdatedAt
        ? moment(localSpace.orderUpdatedAt)
        : moment(0);
      const remoteIsNew = remoteTimestamp.isAfter(localTimestamp);
      const _diff = moment.duration(remoteTimestamp.diff(localTimestamp));
      // console.debug("debug", {
      //   remoteIsNew,
      //   remote: remoteTimestamp.toISOString(),
      //   remoteTabs: tabOrderReq.tabOrder,
      //   local: localTimestamp.toISOString(),
      //   localTabs: localSpace?.order,
      //   diff: diff.asSeconds(),
      // });

      if (remoteIsNew) {
        // Remote data is newer, update the store
        set((draft) => {
          // Initialize local space if it doesn't exist
          if (isUndefined(draft.space.localSpaces[spaceId])) {
            draft.space.localSpaces[spaceId] = {
              tabs: {},
              order: [],
              updatedAt: remoteTimestamp.toISOString(),
              changedNames: {},
              id: spaceId,
            };
          }
          // Initialize remote space if it doesn't exist
          if (isUndefined(draft.space.remoteSpaces[spaceId])) {
            draft.space.remoteSpaces[spaceId] = {
              tabs: {},
              order: [],
              updatedAt: remoteTimestamp.toISOString(),
              id: spaceId,
            };
          }

          // Update both local and remote spaces with new tab order
          draft.space.localSpaces[spaceId].order = tabOrderReq.tabOrder;
          draft.space.localSpaces[spaceId].updatedAt =
            remoteTimestamp.toISOString();
          draft.space.localSpaces[spaceId].orderUpdatedAt =
            remoteTimestamp.toISOString();

          draft.space.remoteSpaces[spaceId].order = tabOrderReq.tabOrder;
          draft.space.remoteSpaces[spaceId].updatedAt =
            remoteTimestamp.toISOString();
          draft.space.remoteSpaces[spaceId].orderUpdatedAt =
            remoteTimestamp.toISOString();
        }, "loadSpaceInfo");
      }
    } catch (e) {
      console.debug("Error loading space tab order:", e);
    }
  },
  registerSpaceFid: async (fid, name, path) => {
    // First check if a space already exists for this FID
    try {
      const { data: existingSpaces } = await axiosBackend.get<ModifiableSpacesResponse>(
        "/api/space/registry",
        {
          params: {
            identityPublicKey: get().account.currentSpaceIdentityPublicKey,
          },
        },
      );
      
      if (existingSpaces.value) {
        const existingSpace = existingSpaces.value.spaces.find(space => space.fid === fid);
        if (existingSpace) {
          return existingSpace.spaceId;
        }
      }
    } catch (e) {
      console.error("Error checking for existing space:", e);
    }

    const unsignedRegistration: Omit<SpaceRegistrationFid, "signature"> = {
      identityPublicKey: get().account.currentSpaceIdentityPublicKey!,
      spaceName: name,
      timestamp: moment().toISOString(),
      fid,
      spaceType: SPACE_TYPES.PROFILE,
    };
    const registration = signSignable(
      unsignedRegistration,
      get().account.getCurrentIdentity()!.rootKeys.privateKey,
    );

    try {
      const { data } = await axiosBackend.post<RegisterNewSpaceResponse>(
        "/api/space/registry",
        registration,
      );
      const newSpaceId = data.value!.spaceId;
      
      // Initialize the space with proper structure
      set((draft) => {
        draft.space.editableSpaces[newSpaceId] = name;
        draft.space.localSpaces[newSpaceId] = {
          id: newSpaceId,
          updatedAt: moment().toISOString(),
          tabs: {},
          order: [],
          changedNames: {},
          fid: fid
        };
      });

      // Create and commit the initial Profile tab
      await get().space.createSpaceTab(
        newSpaceId,
        "Profile",
        createInitialProfileSpaceConfigForFid(fid),
      );
      analytics.track(AnalyticsEvent.SPACE_REGISTERED, {
        type: "user",
        spaceId: newSpaceId,
        path: path,
      });

      return newSpaceId;
    } catch (e) {
      console.error("Failed to register space:", e);
      throw e;
    }
  },
  registerChannelSpace: async (
    channelId,
    channelName,
    moderatorFid,
    path,
    moderatorFids,
  ) => {
    try {
      const existingLocalSpace = Object.values(get().space.localSpaces).find(
        (space) => space.channelId === channelId,
      );

      if (existingLocalSpace) {
        return existingLocalSpace.id;
      }

      try {
        const { data } = await axiosBackend.get(
          "/api/space/registry",
          {
            params: { channelId },
          },
        );

        const existingSpaceId = data?.value?.spaceId;

        if (existingSpaceId) {
          return existingSpaceId;
        }
      } catch (lookupError: any) {
        if (lookupError?.response?.status !== 404) {
          console.error("Error checking existing channel space:", lookupError);
        }
      }

      const { data: modifiableSpaces } = await axiosBackend.get<ModifiableSpacesResponse>(
        "/api/space/registry",
        {
          params: {
            identityPublicKey: get().account.currentSpaceIdentityPublicKey,
          },
        },
      );

      if (modifiableSpaces.value) {
        const existingSpace = modifiableSpaces.value.spaces.find(
          (space) => space.channelId === channelId,
        );

        if (existingSpace) {
          return existingSpace.spaceId;
        }
      }

      if (moderatorFids && !moderatorFids.includes(moderatorFid)) {
        console.warn(
          "Attempted to register channel space with moderator FID not in moderators list",
          { channelId, moderatorFid },
        );
      }

      const unsignedRegistration: Omit<SpaceRegistrationChannel, "signature"> = {
        identityPublicKey: get().account.currentSpaceIdentityPublicKey!,
        spaceName: channelName || channelId,
        timestamp: moment().toISOString(),
        fid: moderatorFid,
        channelId,
        spaceType: SPACE_TYPES.CHANNEL,
      };

      const registration = signSignable(
        unsignedRegistration,
        get().account.getCurrentIdentity()!.rootKeys.privateKey,
      );

      const { data } = await axiosBackend.post<RegisterNewSpaceResponse>(
        "/api/space/registry",
        registration,
      );

      const newSpaceId = data.value!.spaceId;

      set((draft) => {
        draft.space.editableSpaces[newSpaceId] = channelName || channelId;
        draft.space.localSpaces[newSpaceId] = {
          id: newSpaceId,
          updatedAt: moment().toISOString(),
          tabs: {},
          order: [],
          changedNames: {},
          fid: moderatorFid,
          channelId,
        };
      });

      await get().space.createSpaceTab(
        newSpaceId,
        "Channel",
        createInitialChannelSpaceConfig(channelId),
      );

      analytics.track(AnalyticsEvent.SPACE_REGISTERED, {
        type: "channel",
        spaceId: newSpaceId,
        path,
      });

      return newSpaceId;
    } catch (error) {
      console.error("Failed to register channel space:", error);
      throw error;
    }
  },
  registerSpaceContract: async (
    address,
    name,
    tokenOwnerFid,
    initialConfig,
    network,
  ) => {
    try {
      // First check local spaces for matching contract
      const existingSpace = Object.values(get().space.localSpaces).find(
        space => space.contractAddress === address && space.network === network
      );
      
      if (existingSpace) {
        // console.log('Found existing space in local cache:', {
        //   spaceId,
        //   network,
        //   space: existingSpace,
        // });
        return existingSpace.id;
      }

      // Check if a space already exists for this contract that the current
      // identity can modify. We query all modifiable spaces for the identity
      // and then search for one matching the contract address and network.
      
      // Guard against missing currentSpaceIdentityPublicKey
      const currentIdentityKey = get().account.currentSpaceIdentityPublicKey;
      if (!currentIdentityKey) {
        console.error("No current space identity public key available");
        return undefined;
      }
      
      let existingSpaces: ModifiableSpacesResponse | undefined;
      try {
        const { data } = await axiosBackend.get<ModifiableSpacesResponse>(
          "/api/space/registry",
          {
            params: {
              identityPublicKey: currentIdentityKey,
            },
            timeout: 5000, // 5 second timeout
          },
        );
        existingSpaces = data;
        // console.debug("Nounspace existing spaces response:", existingSpaces);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(
            "Nounspace existing spaces error:",
            error.response?.status,
            error.response?.data,
          );
        } else {
          console.error("Nounspace existing spaces error:", error);
        }
      }

      if (existingSpaces?.value) {
        const existingSpace = existingSpaces.value.spaces.find(
          space => space.contractAddress === address && space.network === network
        );
        if (existingSpace) {
          // console.log('Found existing space:', {
          //   spaceId,
          //   network,
          //   space: existingSpace,
          // });
          // Cache the space info in local state
          set((draft) => {
            draft.space.editableSpaces[existingSpace.spaceId] = name;
            draft.space.localSpaces[existingSpace.spaceId] = {
              id: existingSpace.spaceId,
              updatedAt: moment().toISOString(),
              tabs: {},
              order: [],
              changedNames: {},
              contractAddress: address,
              network: network
            };
          });
          return existingSpace.spaceId;
        }
      }

      // console.log('No existing space found, registering new space:', {
      //   spaceId,
      //   network,
      // });

      const unsignedRegistration: Omit<SpaceRegistrationContract, "signature"> = {
        identityPublicKey: get().account.currentSpaceIdentityPublicKey!,
        spaceName: name,
        timestamp: moment().toISOString(),
        contractAddress: address,
        tokenOwnerFid,
        network: network as EtherScanChainName,
        spaceType: SPACE_TYPES.TOKEN,
      };
      const registration = signSignable(
        unsignedRegistration,
        get().account.getCurrentIdentity()!.rootKeys.privateKey,
      );

      try {
        const { data } = await axiosBackend.post<RegisterNewSpaceResponse>(
          "/api/space/registry",
          registration,
        );
        console.log("Nounspace registration response:", data);
        const newSpaceId = data.value!.spaceId;
        
        // Initialize both local and remote spaces with proper structure
        set((draft) => {
          draft.space.editableSpaces[newSpaceId] = name;
          draft.space.localSpaces[newSpaceId] = {
            id: newSpaceId,
            updatedAt: moment().toISOString(),
            tabs: {},
            order: [],
            changedNames: {},
            contractAddress: address,
            network: network
          };
          draft.space.remoteSpaces[newSpaceId] = {
            id: newSpaceId,
            updatedAt: moment().toISOString(),
            tabs: {},
            order: [],
            contractAddress: address,
            network: network
          };
        }, "registerSpace");

        // Create and commit the initial Token tab
        await get().space.createSpaceTab(
          newSpaceId,
          "Token",
          initialConfig,
          network,
        );

        analytics.track(AnalyticsEvent.SPACE_REGISTERED, {
        type: "token",
        spaceId: newSpaceId,
        path: `/t/${network}/${address}/Token`,
      });
      return newSpaceId;
      } catch (e) {
        console.error("Failed to register contract space:", e);
        if (axios.isAxiosError(e)) {
          console.error("Nounspace error response:", e.response?.data);
        }
        throw e;
      }
    } catch (e) {
      console.error("Error in registerSpaceContract:", e);
      throw e;
    }
  },
  registerProposalSpace: async (proposalId, initialConfig) => {
    try {
      let existingSpaceId: string | undefined;

      // Check if a space already exists for this proposal
      try {
        const { data: existingSpaces } = await axiosBackend.get<ModifiableSpacesResponse>(
          "/api/space/registry",
          {
            params: {
              identityPublicKey: get().account.currentSpaceIdentityPublicKey,
            },
          },
        );

        if (existingSpaces.value) {
          const existingSpace = existingSpaces.value.spaces.find(
            (space) => space.proposalId === proposalId
          );
          if (existingSpace) {
            existingSpaceId = existingSpace.spaceId;
          }
        }
      } catch (checkError) {
        console.error("Error checking for existing proposal space:", checkError);
      }

      if (existingSpaceId) {
        return existingSpaceId;
      }

      // Register a new space for the proposal
      const unsignedRegistration: Omit<SpaceRegistrationProposer, "signature"> = {
        identityPublicKey: get().account.currentSpaceIdentityPublicKey!,
        spaceName: `Nouns-Prop-${proposalId}`,
        timestamp: moment().toISOString(),
        proposalId,
        spaceType: SPACE_TYPES.PROPOSAL,
      };
      
      console.log("[registerProposalSpace] unsignedRegistration:", unsignedRegistration);
      
      const registration = signSignable(
        unsignedRegistration,
        get().account.getCurrentIdentity()!.rootKeys.privateKey,
      );

      console.log("[registerProposalSpace] Making API call to /api/space/registry");
      const { data } = await axiosBackend.post<RegisterNewSpaceResponse>(
        "/api/space/registry",
        registration,
      );
      console.log("[registerProposalSpace] API response:", data);
      const newSpaceId = data.value!.spaceId;
      console.log("[registerProposalSpace] New space ID:", newSpaceId);

      // Initialize the space with proper structure
      set((draft) => {
        draft.space.editableSpaces[newSpaceId] = `Proposal-${proposalId}`;
        draft.space.localSpaces[newSpaceId] = {
          id: newSpaceId,
          updatedAt: moment().toISOString(),
          tabs: {},
          order: [],
          changedNames: {},
          proposalId,
        };
      });
      console.log("[registerProposalSpace] Space initialized in store");

      // Create and commit the initial Overview tab
      console.log("[registerProposalSpace] Creating Overview tab...");
      try {
        await get().space.createSpaceTab(
          newSpaceId,
          "Overview",
          initialConfig
        );
        console.log("[registerProposalSpace] Overview tab created successfully");
      } catch (tabError) {
        console.error("[registerProposalSpace] Tab creation failed:", tabError);
        throw new Error(`Failed to create Overview tab: ${tabError instanceof Error ? tabError.message : String(tabError)}`);
      }


      // TODO: Install analytics again after proposal space is working 
      // analytics.track(AnalyticsEvent.SPACE_REGISTERED, {
      //   type: "proposal",
      //   spaceId: newSpaceId,
      //   proposalId,
      // });

      return newSpaceId;
    } catch (e) {
      console.error("Failed to register proposal space:", e);
      throw e;
    }
  },
  loadEditableSpaces: async () => {
    try {
      const { data } = await axiosBackend.get<ModifiableSpacesResponse>(
        "/api/space/registry",
        {
          params: {
            identityPublicKey: get().account.currentSpaceIdentityPublicKey,
          },
        },
      );
      if (data.value) {
        const editableSpaces = fromPairs(
          map(data.value.spaces, (si) => [si.spaceId, si.spaceName]),
        );
        set((draft) => {
          draft.space.editableSpaces = {
            ...draft.space.editableSpaces,
            ...editableSpaces,
          };
          
          // Also populate localSpaces with metadata for contract spaces
          if (data.value) {
            data.value.spaces.forEach((spaceInfo) => {
              // Only create entry if it doesn't exist or if it's missing contract metadata
              if (!draft.space.localSpaces[spaceInfo.spaceId] || 
                  (!draft.space.localSpaces[spaceInfo.spaceId].contractAddress && spaceInfo.contractAddress)) {
                draft.space.localSpaces[spaceInfo.spaceId] = {
                  id: spaceInfo.spaceId,
                  updatedAt: moment().toISOString(),
                  tabs: draft.space.localSpaces[spaceInfo.spaceId]?.tabs || {},
                  order: draft.space.localSpaces[spaceInfo.spaceId]?.order || [],
                  changedNames:
                    draft.space.localSpaces[spaceInfo.spaceId]?.changedNames || {},
                  contractAddress: spaceInfo.contractAddress,
                  network: spaceInfo.network,
                  fid: spaceInfo.fid,
                  proposalId: spaceInfo.proposalId,
                  channelId: spaceInfo.channelId,
                };
              }
            });
        }
        }, "loadEditableSpaces");
        return editableSpaces;
      }
      return {};
    } catch (e) {
      console.error(e);
      return {};
    }
  },
  clear: () => {
    set(
      (draft) => {
        draft.space.localSpaces = {};
        draft.space.editableSpaces = {};
        draft.space.remoteSpaces = {};
      },
      "clearSpaces",
      true,
    );
  },
});

export const partializedSpaceStore = (state: AppStore): SpaceState => ({
  remoteSpaces: state.space.remoteSpaces,
  editableSpaces: state.space.editableSpaces,
  localSpaces: state.space.localSpaces,
});