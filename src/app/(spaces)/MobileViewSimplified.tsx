import {
  FidgetInstanceData,
} from "@/common/fidgets"
import { UserTheme } from "@/common/lib/theme"
import { LayoutFidgets } from "@/fidgets"
import React, { useMemo } from "react"

type MobileViewSimplifiedProps = {
  theme: UserTheme
  fidgetInstanceDatums: { [key: string]: FidgetInstanceData }
  fidgetTrayContents: FidgetInstanceData[]
  saveConfig: (config: any) => Promise<void>
  inEditMode: boolean
  saveExitEditMode: () => void
  cancelExitEditMode: () => void
  portalRef: React.RefObject<HTMLDivElement | null>
  hasProfile: boolean
  hasFeed: boolean
  feed?: React.ReactNode
  tabNames?: string[]
  fid?: number
  layoutFidgetIds: string[]
  isHomebasePath?: boolean
}

// Handle layout configuration for mobile tabs
const useLayoutConfigManager = (layoutFidgetIds: string[], isHomebasePath: boolean, hasFeed: boolean) => {
  // Start with the fidgets we have
  let layout = [...layoutFidgetIds];
  
  // Add feed to homebase if it's not already there
  if (isHomebasePath && hasFeed && !layout.includes("feed")) {
    layout = ["feed", ...layout];
  }
  
  return {
    layout,
    layoutFidget: "tabFullScreen",
  };
};

// Build props for the layout component
const useLayoutPropsBuilder = (props: MobileViewSimplifiedProps, layoutConfig: any) => {
  return {
    layoutConfig,
    theme: props.theme,
    fidgetInstanceDatums: props.fidgetInstanceDatums,
    fidgetTrayContents: props.fidgetTrayContents,
    saveConfig: props.saveConfig,
    inEditMode: props.inEditMode,
    saveExitEditMode: props.saveExitEditMode,
    cancelExitEditMode: props.cancelExitEditMode,
    portalRef: props.portalRef,
    hasProfile: props.hasProfile,
    hasFeed: props.hasFeed,
    feed: props.feed,
    tabNames: props.tabNames,
    fid: props.fid,
    isHomebasePath: props.isHomebasePath,
  };
};
const MobileViewSimplified: React.FC<MobileViewSimplifiedProps> = ({
  theme,
  fidgetInstanceDatums,
  fidgetTrayContents,
  saveConfig,
  inEditMode,
  saveExitEditMode,
  cancelExitEditMode,
  portalRef,
  hasProfile,
  hasFeed,
  feed,
  tabNames,
  fid,
  layoutFidgetIds,
  isHomebasePath = false,
}) => {
  // Get the tab layout component
  const LayoutFidget = useMemo(() => LayoutFidgets["tabFullScreen"], []);
  
  // Figure out what tabs to show
  const layoutConfig = useLayoutConfigManager(layoutFidgetIds, isHomebasePath, hasFeed);
  
  // Bundle up props for the layout
  const layoutProps = useLayoutPropsBuilder({
    theme,
    fidgetInstanceDatums,
    fidgetTrayContents,
    saveConfig,
    inEditMode,
    saveExitEditMode,
    cancelExitEditMode,
    portalRef,
    hasProfile,
    hasFeed,
    feed,
    tabNames,
    fid,
    layoutFidgetIds,
    isHomebasePath,
  }, layoutConfig);

  if (layoutConfig.layout.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full text-gray-500">
        <div className="text-center p-4">
          <h3 className="text-lg font-medium mb-2">No fidgets available</h3>
          <p className="text-sm text-gray-400">Add some fidgets to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <LayoutFidget {...layoutProps} />
    </div>
  );
};

export default MobileViewSimplified;