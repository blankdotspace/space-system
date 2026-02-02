"use client";
import { useAppStore } from "@/common/data/stores/app";
import useIsMobile from "@/common/lib/hooks/useIsMobile";
import { Reorder } from "framer-motion";
import { debounce, map } from "lodash";
import React from "react";
import { FaPaintbrush, FaPlus } from "react-icons/fa6";
import { toast } from "sonner";
import { Address } from "viem";
import { Button } from "../atoms/button";
import { Tab } from "../atoms/reorderable-tab";
import { TooltipProvider } from "../atoms/tooltip";
import ClaimButtonWithModal from "../molecules/ClaimButtonWithModal";
import { useSidebarContext } from "./Sidebar";
import TokenDataHeader from "./TokenDataHeader";
import { validateTabName, generateUniqueName } from "@/common/utils/tabUtils";
import { useUIColors } from "@/common/lib/hooks/useUIColors";

interface TabBarProps {
  inHomebase: boolean;
  inEditMode: boolean;
  currentTab: string;
  tabList: string[];
  defaultTab: string;
  updateTabOrder: (newOrder: string[]) => void;
  commitTabOrder?: () => void;
  deleteTab: (tabName: string) => void;
  createTab: (tabName: string) => Promise<{ tabName: string } | undefined>;
  renameTab: (tabName: string, newName: string) => Promise<void> | void;
  commitTab: (tabName: string) => void;
  getSpacePageUrl: (tabName: string) => string;
  isTokenPage?: boolean;
  contractAddress?: Address;
  isEditable?: boolean;
}


function TabBar({
  inHomebase,
  inEditMode,
  currentTab,
  tabList,
  defaultTab,
  updateTabOrder,
  commitTabOrder,
  deleteTab,
  createTab,
  renameTab,
  commitTab,
  getSpacePageUrl,
  isTokenPage,
  contractAddress,
  isEditable
}: TabBarProps) {
  const isMobile = useIsMobile();
  const { setEditMode } = useSidebarContext();
  const uiColors = useUIColors();
  const castButtonColors = React.useMemo(
    () => ({
      backgroundColor: uiColors.castButton.backgroundColor,
      hoverColor: uiColors.castButton.hoverColor,
      activeColor: uiColors.castButton.activeColor,
      fontColor: uiColors.castButtonFontColor,
    }),
    [
      uiColors.castButton.backgroundColor,
      uiColors.castButton.hoverColor,
      uiColors.castButton.activeColor,
      uiColors.castButtonFontColor,
    ],
  );
  const customizeButtonStyle = React.useMemo<React.CSSProperties>(
    () => ({
      "--cast-bg-color": castButtonColors.backgroundColor,
      "--cast-hover-color": castButtonColors.hoverColor,
      "--cast-active-color": castButtonColors.activeColor,
      backgroundColor: "var(--cast-bg-color)",
      color: castButtonColors.fontColor,
      fontFamily: uiColors.fontFamily,
      boxShadow: "none",
    }),
    [
      castButtonColors.activeColor,
      castButtonColors.backgroundColor,
      castButtonColors.fontColor,
      castButtonColors.hoverColor,
      uiColors.fontFamily,
    ],
  );

  const { getIsLoggedIn, getIsInitializing, homebaseLoadTab, setCurrentTabName } = useAppStore((state) => ({
    setModalOpen: state.setup.setModalOpen,
    getIsLoggedIn: state.getIsAccountReady,
    getIsInitializing: state.getIsInitializing,
    homebaseLoadTab: state.homebase.loadHomebaseTab,
    setCurrentTabName: state.currentSpace.setCurrentTabName,
  }));

  function switchTabTo(tabName: string, shouldSave: boolean = true) {
    setCurrentTabName(tabName);
    const url = getSpacePageUrl(tabName);
    window.history.replaceState(null, '', url);
  }

  // Function to calculate next tab after deletion
  const nextClosestTab = React.useCallback((tabName: string) => {
    const futureTabList = tabList.filter(tab => tab !== tabName);
    if (futureTabList.length === 0) return defaultTab;
    
    const index = tabList.indexOf(tabName);
    return futureTabList[Math.min(index, futureTabList.length - 1)];
  }, [tabList, defaultTab]);

  const debouncedCreateTab = React.useCallback(
    debounce(async (tabName: string) => {
      if (!tabName?.trim()) return;
      
      const cleanTabName = tabName.trim();
      
      // If tab already exists, just switch to it
      if (tabList.includes(cleanTabName)) {
        switchTabTo(cleanTabName, true);
        return;
      }

      // Optimistically update UI immediately
      switchTabTo(cleanTabName, false);

      try {
        // Call createTab in the background (it already optimistically adds to the order)
        const result = await createTab(cleanTabName);
        const finalTabName = result?.tabName || cleanTabName;
        
        // If the final tab name is different (e.g., due to deduplication), switch to it
        if (finalTabName !== cleanTabName) {
          switchTabTo(finalTabName, false);
        }
        
        // Tab creation is staged - commit via commitAllSpaceChanges
      } catch (error) {
        console.error("Error creating tab:", error);
        toast.error("Failed to create tab. Please try again.");
        // TODO: Rollback optimistic changes if needed
      }
    }, 300),
    [tabList, createTab, switchTabTo]
  );

  const debouncedDeleteTab = React.useCallback(
    debounce(async (tabName: string) => {
      try {
        if (tabList.length <= 1) {
          toast.error("You must have at least one tab.");
          return;
        }
        
        // Calculate next tab before deletion
        const shouldSwitch = currentTab === tabName;
        const nextTab = shouldSwitch ? nextClosestTab(tabName) : null;
        
        await deleteTab(tabName);
        
        // Switch to next tab after successful deletion
        if (shouldSwitch && nextTab) {
          switchTabTo(nextTab, true);
        }
        
        toast.success("Tab deleted successfully!");
      } catch (error) {
        console.error("Error deleting tab:", error);
        toast.error("Error deleting tab. Please try again.");
      }
    }, 300),
    [tabList, deleteTab, currentTab, nextClosestTab, switchTabTo]
  );

  const debouncedRenameTab = React.useCallback(
    debounce(async (tabName: string, newName: string) => {
      try {
        if (!newName || typeof newName !== 'string') {
          return;
        }

        const sanitizedName = newName.trim();
        if (!sanitizedName || sanitizedName === tabName) {
          return;
        }

        const validationError = validateTabName(sanitizedName);
        if (validationError) {
          console.error("Tab name validation failed:", validationError);
          return;
        }

        const uniqueName = generateUniqueTabName(sanitizedName);
        if (!uniqueName || uniqueName === tabName) {
          return;
        }
        
        // Fire off rename (optimistic update happens immediately and handles order update)
        const renamePromise = renameTab(tabName, uniqueName);
        
        // Update current tab name in store and URL
        switchTabTo(uniqueName);
        
        // Wait for rename to complete
        await renamePromise;
        // Rename is staged - commit via commitAllSpaceChanges
        
      } catch (error) {
        console.error("Error in handleRenameTab:", error);
      }
    }, 300),
    [renameTab, switchTabTo, tabList]
  );

  function generateNewTabName(): string {
    for (let i = tabList.length + 1; i < 200; i++) {
      const name = `Tab ${i}`;
      if (!tabList.includes(name)) return name;
    }
    return `Tab ${Date.now()}`; // Fallback if all numbers taken
  }

  function generateUniqueTabName(tabName: string): string | null {
    const validationError = validateTabName(tabName);
    if (validationError) {
      console.error("Invalid tab name:", validationError);
      return null;
    }

    return generateUniqueName(tabName, tabList);
  }

  const handleTabClick = React.useCallback((tabName: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (currentTab === tabName) return;
    
    switchTabTo(tabName, true);
  }, [currentTab, switchTabTo]);

  // Function to preload tab data (only for homebase tabs)
  const preloadTabData = React.useCallback((tabName: string) => {
    if (inHomebase && typeof homebaseLoadTab === 'function') {
      homebaseLoadTab(tabName);
    }
  }, [inHomebase, homebaseLoadTab]);

  // Simple debounced reorder function
  const debouncedReorder = React.useCallback(
    debounce((newOrder) => {
      updateTabOrder(newOrder);
      // Order update is staged - commit via commitAllSpaceChanges
    }, 300),
    [updateTabOrder]
  );

  const isLoggedIn = getIsLoggedIn();

  return (
    <TooltipProvider>
      <div
        className="flex flex-col md:flex-row justify-start md:h-16 z-30 w-full"
        style={{ backgroundColor: uiColors.backgroundColor }}
      > 
        {isTokenPage && contractAddress && (
          <div
            className="flex flex-row justify-start h-16 w-full md:w-fit z-20"
            style={{ backgroundColor: uiColors.backgroundColor }}
          >
            <TokenDataHeader />
          </div>
        )}
        <div
          className="flex w-full h-16 items-center justify-between"
          style={{ backgroundColor: uiColors.backgroundColor }}
        > 
          {/* Tabs Section - grows until it hits buttons */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <Reorder.Group
                as="ol"
                axis="x"
                onReorder={debouncedReorder}
                className="flex flex-nowrap gap-5 md:gap-4 items-start ml-2 my-4 mr-4 tabs"
                values={tabList}
              >
                {map(
                  tabList,
                  (tabName: string) => (
                    <Tab
                      key={`tab-${tabName}`}
                      getSpacePageUrl={getSpacePageUrl}
                      tabName={tabName}
                      inEditMode={inEditMode}
                      isSelected={currentTab === tabName}
                      onClick={() => handleTabClick(tabName)}
                      removeable={tabList.length > 1}
                      draggable={inEditMode}
                      renameable={true}
                      onRemove={() => debouncedDeleteTab(tabName)}
                      renameTab={(tab, newName) => debouncedRenameTab(tab, newName)}
                      preloadTabData={preloadTabData}
                    />
                  )
                )}
              </Reorder.Group>
            </div>
          </div>

          {/* Action Buttons - pushed to right side */}
          {(isEditable) && (
            <div className="flex items-center gap-2 px-2 flex-shrink-0">
              {!inEditMode && (
                <Button
                  onClick={() => setEditMode(true)}
                  className="flex items-center rounded-md p-2 font-semibold transition-colors bg-[var(--cast-bg-color)] hover:bg-[var(--cast-hover-color)] active:bg-[var(--cast-active-color)] focus:bg-[var(--cast-hover-color)] focus-visible:outline-none focus-visible:ring-0"
                  style={customizeButtonStyle}
                >
                  <FaPaintbrush />
                  {!isMobile && (
                    <span className="ml-2">
                      Customize
                    </span>
                  )}
                </Button>
              )}
              {(inEditMode) && (
                <Button
                  onClick={() => debouncedCreateTab(generateNewTabName())}
                  className="flex items-center rounded-xl p-2 bg-[#F3F4F6] hover:bg-sky-100 text-[#1C64F2] font-semibold shadow-md"
                >
                  <FaPlus />
                  <span className="ml-1">Tab</span>
                </Button>
              )}
            </div>
          )}
        </div>
        {isTokenPage && !getIsInitializing() && !isLoggedIn && !isMobile && (
          <ClaimButtonWithModal contractAddress={contractAddress} />
        )}
      </div>
    </TooltipProvider>
  );
}

export default TabBar;
