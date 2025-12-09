"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import { useAppStore } from "@/common/data/stores/app";
import SpacePage, { SpacePageArgs } from "@/app/(spaces)/SpacePage";
import { SpaceConfig, SpaceConfigSaveDetails } from "@/app/(spaces)/Space";
import TabBar from "@/common/components/organisms/TabBar";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useSidebarContext } from "@/common/components/organisms/Sidebar";
import { INITIAL_SPACE_CONFIG_EMPTY } from "@/config";
import { isNil, mapValues } from "lodash";
import type { NavPageConfig } from "@/config/systemConfig";

type NavPageClientProps = {
  pageConfig: NavPageConfig;
  activeTabName: string;
  navSlug: string;
  spaceId: string;
  adminIdentityPublicKeys: string[];
};

const getTabConfig = (tabName: string, config: NavPageConfig): SpaceConfig => {
  return (config.tabs[tabName] || config.tabs[config.defaultTab]) as SpaceConfig;
};

const NavPageClient: React.FC<NavPageClientProps> = ({
  pageConfig,
  activeTabName,
  navSlug,
  spaceId,
  adminIdentityPublicKeys,
}) => {
  // Get current identity and space store methods
  const {
    currentIdentityPublicKey,
    setCurrentSpaceId,
    setCurrentTabName,
    currentTabName,
    localSpaces,
    loadSpaceTab,
    loadSpaceTabOrder,
    saveLocalSpaceTab,
    commitSpaceTab,
    updateSpaceTabOrder,
    commitSpaceTabOrder,
    createSpaceTab,
    deleteSpaceTab,
    renameSpaceTab,
  } = useAppStore((state) => ({
    currentIdentityPublicKey: state.account.currentSpaceIdentityPublicKey,
    setCurrentSpaceId: state.currentSpace.setCurrentSpaceId,
    setCurrentTabName: state.currentSpace.setCurrentTabName,
    currentTabName: state.currentSpace.currentTabName,
    localSpaces: state.space.localSpaces,
    loadSpaceTab: state.space.loadSpaceTab,
    loadSpaceTabOrder: state.space.loadSpaceTabOrder,
    saveLocalSpaceTab: state.space.saveLocalSpaceTab,
    commitSpaceTab: state.space.commitSpaceTabToDatabase,
    updateSpaceTabOrder: state.space.updateLocalSpaceOrder,
    commitSpaceTabOrder: state.space.commitSpaceOrderToDatabase,
    createSpaceTab: state.space.createSpaceTab,
    deleteSpaceTab: state.space.deleteSpaceTab,
    renameSpaceTab: state.space.renameSpaceTab,
  }));

  const { setFrameReady, isFrameReady } = useMiniKit();
  const { editMode } = useSidebarContext();

  // Check if current user is an admin
  const isAdmin = useMemo(() => {
    return (
      currentIdentityPublicKey !== undefined &&
      currentIdentityPublicKey !== "" &&
      adminIdentityPublicKeys.includes(currentIdentityPublicKey)
    );
  }, [currentIdentityPublicKey, adminIdentityPublicKeys]);

  // Initialize frame ready state
  useEffect(() => {
    if (!isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  // Set current space and tab on mount
  useEffect(() => {
    setCurrentSpaceId(spaceId);
    setCurrentTabName(activeTabName);
  }, [spaceId, activeTabName, setCurrentSpaceId, setCurrentTabName]);

  // Load space data when admin (to enable editing)
  useEffect(() => {
    if (isAdmin && spaceId) {
      loadSpaceTabOrder(spaceId);
      loadSpaceTab(spaceId, activeTabName);
    }
  }, [isAdmin, spaceId, activeTabName, loadSpaceTabOrder, loadSpaceTab]);

  // Get config from local store if admin and loaded, otherwise use pageConfig
  const config = useMemo(() => {
    if (isAdmin && localSpaces[spaceId]?.tabs?.[activeTabName]) {
      return {
        ...localSpaces[spaceId].tabs[activeTabName],
        isEditable: true,
      };
    }
    return {
      ...getTabConfig(currentTabName ?? activeTabName, pageConfig),
      isEditable: isAdmin,
    };
  }, [isAdmin, localSpaces, spaceId, activeTabName, currentTabName, pageConfig]);

  // Get tab list from local store if admin, otherwise from pageConfig
  const tabList = useMemo(() => {
    if (isAdmin && localSpaces[spaceId]?.order?.length > 0) {
      return localSpaces[spaceId].order;
    }
    return pageConfig.tabOrder;
  }, [isAdmin, localSpaces, spaceId, pageConfig.tabOrder]);

  // Save config handler
  const saveConfig = useCallback(
    async (spaceConfig: SpaceConfigSaveDetails) => {
      if (!isAdmin || isNil(spaceId)) return;
      
      const saveableConfig = {
        ...spaceConfig,
        fidgetInstanceDatums: spaceConfig.fidgetInstanceDatums
          ? mapValues(spaceConfig.fidgetInstanceDatums, (datum) => ({
              ...datum,
              config: {
                settings: datum.config.settings,
                editable: datum.config.editable,
                data: datum.config.data ?? {},
              },
            }))
          : undefined,
        isPrivate: false,
      };
      return saveLocalSpaceTab(spaceId, currentTabName ?? activeTabName, saveableConfig);
    },
    [isAdmin, spaceId, currentTabName, activeTabName, saveLocalSpaceTab]
  );

  // Commit config handler
  const commitConfig = useCallback(async () => {
    if (!isAdmin || isNil(spaceId)) return;
    return commitSpaceTab(spaceId, currentTabName ?? activeTabName);
  }, [isAdmin, spaceId, currentTabName, activeTabName, commitSpaceTab]);

  // Reset config handler (reloads from remote)
  const resetConfig = useCallback(async () => {
    if (!isAdmin || isNil(spaceId)) return;
    await loadSpaceTab(spaceId, currentTabName ?? activeTabName);
  }, [isAdmin, spaceId, currentTabName, activeTabName, loadSpaceTab]);

  const tabBar = (
    <TabBar
      getSpacePageUrl={(tab) => `/${navSlug}/${encodeURIComponent(tab)}`}
      inHomebase={false}
      currentTab={currentTabName ?? activeTabName}
      tabList={tabList}
      defaultTab={pageConfig.defaultTab}
      inEditMode={isAdmin && editMode}
      isEditable={isAdmin}
      updateTabOrder={
        isAdmin
          ? async (newOrder) => updateSpaceTabOrder(spaceId, newOrder)
          : async () => Promise.resolve()
      }
      deleteTab={
        isAdmin
          ? async (tabName) => deleteSpaceTab(spaceId, tabName)
          : async () => Promise.resolve()
      }
      createTab={
        isAdmin
          ? async (tabName) => createSpaceTab(spaceId, tabName, INITIAL_SPACE_CONFIG_EMPTY)
          : async () => Promise.resolve({ tabName: currentTabName ?? activeTabName })
      }
      renameTab={
        isAdmin
          ? async (oldName, newName) => renameSpaceTab(spaceId, oldName, newName, config)
          : async () => Promise.resolve(void 0)
      }
      commitTab={
        isAdmin
          ? async (tabName) => commitSpaceTab(spaceId, tabName)
          : async () => Promise.resolve()
      }
      commitTabOrder={
        isAdmin
          ? async () => commitSpaceTabOrder(spaceId)
          : async () => Promise.resolve()
      }
    />
  );

  const args: SpacePageArgs = {
    config: config as SpaceConfig,
    saveConfig: isAdmin ? saveConfig : async () => {},
    commitConfig: isAdmin ? commitConfig : async () => {},
    resetConfig: isAdmin ? resetConfig : async () => {},
    tabBar: tabBar,
    showFeedOnMobile: false,
  };

  return <SpacePage key={currentTabName ?? activeTabName} {...args} />;
};

export default NavPageClient;
