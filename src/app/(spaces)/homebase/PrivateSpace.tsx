"use client";

import React, { useEffect, useMemo, useCallback, lazy } from "react";
import { useAppStore } from "@/common/data/stores/app";
import SpacePage, { SpacePageArgs } from "@/app/(spaces)/SpacePage";
import FeedModule, { FilterType } from "@/fidgets/farcaster/Feed";
import { isNil, noop } from "lodash";
import { useSidebarContext } from "@/common/components/organisms/Sidebar";
import { INITIAL_SPACE_CONFIG_EMPTY } from "@/config";
import { HOMEBASE_ID } from "@/common/data/stores/app/currentSpace";
import { HOMEBASE_DEFAULT_TAB } from "@/common/data/stores/app/homebase/homebaseTabsStore";
import { FeedType } from "@neynar/nodejs-sdk/build/api";

// Lazy load the TabBar component to improve performance
const TabBar = lazy(() => import('@/common/components/organisms/TabBar'));

// Main component for the private space
function PrivateSpace({ tabName, castHash }: { tabName: string; castHash?: string }) {
  
  // Destructure and retrieve various state and actions from the app store
  const {
    tabConfigs,
    homebaseConfig,
    tabOrdering,
    currentTabName,
    loadTab,
    saveTab,
    commitTab,
    resetTab,
    saveConfig,
    loadFeedConfig,
    commitConfig,
    resetConfig,
    setCurrentSpaceId,
    setCurrentTabName,
    loadTabNames,
    getIsAccountReady,
    loadTabOrder,
    updateTabOrder,
    createTab: originalCreateTab,
    deleteTab,
    renameTab,
    commitTabOrder,
    setModalOpen,
  } = useAppStore((state) => ({
    tabConfigs: state.homebase.tabs,
    homebaseConfig: state.homebase.homebaseConfig,
    currentSpaceId: state.currentSpace.currentSpaceId,
    currentTabName: state.currentSpace.currentTabName,
    tabOrdering: state.homebase.tabOrdering,
    loadTab: state.homebase.loadHomebaseTab,
    saveTab: state.homebase.saveHomebaseTabConfig,
    commitTab: state.homebase.commitHomebaseTabToDatabase,
    resetTab: state.homebase.resetHomebaseTabConfig,
    saveConfig: state.homebase.saveHomebaseConfig,
    loadFeedConfig: state.homebase.loadHomebase,
    commitConfig: state.homebase.commitHomebaseToDatabase,
    resetConfig: state.homebase.resetHomebaseConfig,
    getIsAccountReady: state.getIsAccountReady,
    setCurrentSpaceId: state.currentSpace.setCurrentSpaceId,
    setCurrentTabName: state.currentSpace.setCurrentTabName,
    loadTabNames: state.homebase.loadTabNames,
    loadTabOrder: state.homebase.loadTabOrdering,
    updateTabOrder: state.homebase.updateTabOrdering,
    commitTabOrder: state.homebase.commitTabOrderingToDatabase,
    createTab: state.homebase.createTab,
    deleteTab: state.homebase.deleteTab,
    renameTab: state.homebase.renameTab,
    setModalOpen: state.setup.setModalOpen,
  }));

  const isLoggedIn = getIsAccountReady(); // Check if the user is logged in

  const { editMode } = useSidebarContext(); // Get the edit mode status from the sidebar context

  // Effect to handle login modal when user is not logged in
  // If a specific cast is being viewed, allow it without forcing a login
  useEffect(() => {
    if (!isLoggedIn && !castHash) {
      // Open the login modal if user is not logged in
      setModalOpen(true);
    }
  }, [isLoggedIn, setModalOpen, castHash]);

  // Sync URL params to store when they change
  useEffect(() => {
    setCurrentSpaceId(HOMEBASE_ID);
    setCurrentTabName(tabName);
  }, [tabName, setCurrentSpaceId, setCurrentTabName]);

  // Load tab ordering when component mounts
  useEffect(() => {
    loadTabOrder().catch(error => {
      console.error("Error loading tab order:", error);
    });
    loadTabNames().catch(error => {
      console.error("Error loading tab names:", error);
    });
  }, [loadTabOrder, loadTabNames]);

  // Load tab configuration when store values are set
  useEffect(() => {
    if (!isNil(currentTabName)) {
      if (currentTabName === HOMEBASE_DEFAULT_TAB && !homebaseConfig) {
        loadFeedConfig().then(() => loadTab(currentTabName));
      } else {
        loadTab(currentTabName);
      }
    }
  }, [currentTabName, homebaseConfig, loadFeedConfig, loadTab]);


  // Function to get the URL for a given tab
  function getSpacePageUrl(tabName: string) {
    if (tabName === HOMEBASE_DEFAULT_TAB) {
      return `/homebase`;
    }
    return `/homebase/${encodeURIComponent(tabName)}`;
  }

  // Handler to reset the configuration for the current tab
  const resetConfigHandler = async () => {
    const activeTabName = currentTabName || HOMEBASE_DEFAULT_TAB;
    if (activeTabName === HOMEBASE_DEFAULT_TAB) {
      return resetConfig();
    } else {
      return resetTab(activeTabName);
    }
  };

  // Handler to commit the configuration for the current tab
  const commitConfigHandler = async () => {
    const activeTabName = currentTabName || HOMEBASE_DEFAULT_TAB;
    if (activeTabName === HOMEBASE_DEFAULT_TAB) {
      return commitConfig();
    } else {
      return commitTab(activeTabName);
    }
  };

  // Handler to save the configuration for the current tab
  const saveConfigHandler = async (configToSave) => {
    const activeTabName = currentTabName || HOMEBASE_DEFAULT_TAB;
    if (activeTabName === HOMEBASE_DEFAULT_TAB) {
      await saveConfig(configToSave);
    } else {
      await saveTab(activeTabName, configToSave);
    }
  };

  // Wrap createTab to return the expected type
  // THIS IS A HACK TO FIX THE TYPE ERROR
  // TODO: UPDATE PRIVATE SPACE TO USE THE OPTIMISTIC UPDATES THAT ARE IN PUBLIC SPACE
  const createTab = async (tabName: string) => {
    await originalCreateTab(tabName);
    return { tabName };
  };

  // Wrap updateTabOrder to ensure it commits changes
  const updateTabOrderWithCommit = useCallback((newOrder: string[]) => {
    updateTabOrder(newOrder, true); // Force commit when called from TabBar drag-and-drop
  }, [updateTabOrder]);

  // Memoize the TabBar component to prevent unnecessary re-renders
  const tabBar = useMemo(() => (
    <TabBar
      getSpacePageUrl={getSpacePageUrl}
      inHomebase={true}
      currentTab={currentTabName || HOMEBASE_DEFAULT_TAB}
      tabList={tabOrdering.local}
      defaultTab={HOMEBASE_DEFAULT_TAB}
      updateTabOrder={updateTabOrderWithCommit}
      inEditMode={editMode}
      deleteTab={deleteTab}
      createTab={createTab}
      renameTab={renameTab}
      commitTabOrder={commitTabOrder}
      commitTab={commitTab}
      isEditable={true}
    />
  ), [currentTabName, tabOrdering.local, editMode, updateTabOrderWithCommit]);

  // Define the arguments for the SpacePage component
  const args: SpacePageArgs = useMemo(() => ({
    config: (() => {
      const activeTabName = currentTabName || HOMEBASE_DEFAULT_TAB;
      const sourceConfig =
        activeTabName === HOMEBASE_DEFAULT_TAB
          ? homebaseConfig
          : tabConfigs[activeTabName]?.config;
      
      // This prevents overwriting custom configurations with the default
      const baseConfig = sourceConfig || INITIAL_SPACE_CONFIG_EMPTY;
      
      // Debug logging to help track configuration issues
      if (process.env.NODE_ENV === 'development' && !sourceConfig) {
        console.warn(`[PrivateSpace] No source config found for tab: ${activeTabName}`, {
          activeTabName,
          homebaseConfigExists: !!homebaseConfig,
          tabConfigExists: !!tabConfigs[activeTabName]?.config,
          tabConfigs: Object.keys(tabConfigs)
        });
      }
      
      const { ...restConfig } = {
        ...baseConfig,
        isEditable: true,
      };
      return restConfig;
    })(),
    saveConfig: saveConfigHandler,
    commitConfig: commitConfigHandler,
    resetConfig: resetConfigHandler,
    tabBar: tabBar,
    feed: (currentTabName || HOMEBASE_DEFAULT_TAB) === HOMEBASE_DEFAULT_TAB ? (
      <FeedModule.fidget
        settings={{
          feedType: FeedType.Following,
          users: "",
          filterType: FilterType.Users,
          selectPlatform: { name: "Farcaster", icon: "/platforms/farcaster.jpeg" },
          Xhandle: "",
          style: "",
          fontFamily: "var(--user-theme-font)",
          fontColor: "var(--user-theme-font-color)" as any,
        }}
        saveData={async () => noop()}
        data={{ initialHash: castHash, updateUrl: true }}
      />
    ) : undefined,
    showFeedOnMobile: Boolean(castHash),
  }), [
    currentTabName,
    (currentTabName || HOMEBASE_DEFAULT_TAB) === HOMEBASE_DEFAULT_TAB
      ? homebaseConfig
      : tabConfigs[currentTabName || HOMEBASE_DEFAULT_TAB]?.config,
    tabOrdering.local,
    editMode,
    castHash,
  ]);


  // Render the SpacePage component with the defined arguments
  return <SpacePage key={currentTabName || HOMEBASE_DEFAULT_TAB} {...args} />;
}

export default PrivateSpace;