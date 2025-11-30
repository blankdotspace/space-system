"use client";

import React, { useEffect } from "react";
import { useAppStore } from "@/common/data/stores/app";
import SpacePage, { SpacePageArgs } from "@/app/(spaces)/SpacePage";
import { SpaceConfig } from "@/app/(spaces)/Space";
import TabBar from "@/common/components/organisms/TabBar";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import type { HomePageConfig, ExplorePageConfig } from "@/config/systemConfig";

type PageConfig = HomePageConfig | ExplorePageConfig;

type NavPageClientProps = {
  pageConfig: PageConfig;
  activeTabName: string;
  navSlug: string;
};

const getTabConfig = (tabName: string, config: PageConfig): SpaceConfig => {
  return (config.tabs[tabName] || config.tabs[config.defaultTab]) as SpaceConfig;
};

const NavPageClient: React.FC<NavPageClientProps> = ({
  pageConfig,
  activeTabName,
  navSlug,
}) => {
  const { setCurrentTabName, currentTabName } = useAppStore((state) => ({
    setCurrentTabName: state.currentSpace.setCurrentTabName,
    currentTabName: state.currentSpace.currentTabName,
  }));

  const { setFrameReady, isFrameReady } = useMiniKit();

  useEffect(() => {
    if (!isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  useEffect(() => {
    setCurrentTabName(activeTabName);
  }, [activeTabName, setCurrentTabName]);

  const tabBar = (
    <TabBar
      getSpacePageUrl={(tab) => `/${navSlug}/${encodeURIComponent(tab)}`}
      inHomebase={false}
      currentTab={currentTabName ?? activeTabName}
      tabList={pageConfig.tabOrder}
      defaultTab={pageConfig.defaultTab}
      inEditMode={false}
      updateTabOrder={async () => Promise.resolve()}
      deleteTab={async () => Promise.resolve()}
      createTab={async () => Promise.resolve({ tabName: currentTabName ?? activeTabName })}
      renameTab={async () => Promise.resolve(void 0)}
      commitTab={async () => Promise.resolve()}
      commitTabOrder={async () => Promise.resolve()}
      isEditable={false}
    />
  );

  const args: SpacePageArgs = {
    config: getTabConfig(currentTabName ?? activeTabName, pageConfig) as SpaceConfig,
    saveConfig: async () => {},
    commitConfig: async () => {},
    resetConfig: async () => {},
    tabBar: tabBar,
    showFeedOnMobile: false,
  };

  return <SpacePage key={currentTabName ?? activeTabName} {...args} />;
};

export default NavPageClient;

