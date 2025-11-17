"use client";

import React, { useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";

import { useAppStore } from "@/common/data/stores/app";
import TabBar from "@/common/components/organisms/TabBar";
import SpacePage, { type SpacePageArgs } from "@/app/(spaces)/SpacePage";
import { type SpaceConfig } from "@/app/(spaces)/Space";
import type { ExplorePageConfig } from "@/config/systemConfig";

const getTabConfig = (
  tabName: string,
  config: ExplorePageConfig,
): SpaceConfig =>
  (config.tabs[tabName] || config.tabs[config.defaultTab]) as SpaceConfig;

type ExploreTabPageProps = {
  tabName: string;
  explorePage: ExplorePageConfig;
};

const ExploreTabPage: React.FC<ExploreTabPageProps> = ({ tabName, explorePage }) => {
  const { setCurrentTabName, currentTabName } = useAppStore((state) => ({
    setCurrentTabName: state.currentSpace.setCurrentTabName,
    currentTabName: state.currentSpace.currentTabName,
  }));

  const { setFrameReady, isFrameReady } = useMiniKit();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

  useEffect(() => {
    setCurrentTabName(tabName);
  }, [tabName, setCurrentTabName]);

  const activeTabName = currentTabName ?? explorePage.defaultTab;

  const tabBar = (
    <TabBar
      getSpacePageUrl={(tab) => `/explore/${encodeURIComponent(tab)}`}
      inHomebase={false}
      currentTab={activeTabName}
      tabList={explorePage.tabOrder}
      defaultTab={explorePage.defaultTab}
      inEditMode={false}
      updateTabOrder={async () => Promise.resolve()}
      deleteTab={async () => Promise.resolve()}
      createTab={async () => Promise.resolve({ tabName: activeTabName })}
      renameTab={async () => Promise.resolve()}
      commitTab={async () => Promise.resolve()}
      commitTabOrder={async () => Promise.resolve()}
      isEditable={false}
    />
  );

  const args: SpacePageArgs = {
    config: getTabConfig(activeTabName, explorePage),
    saveConfig: async () => {},
    commitConfig: async () => {},
    resetConfig: async () => {},
    tabBar,
    showFeedOnMobile: false,
  };

  return <SpacePage key={activeTabName} {...args} />;
};

export default ExploreTabPage;
