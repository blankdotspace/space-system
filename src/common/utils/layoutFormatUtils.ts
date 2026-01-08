import {
  FidgetInstanceData,
  LayoutFidgetConfig,
  LayoutFidgetDetails
} from "@/common/fidgets";

export const hasMultipleLayouts = (
  layoutDetails: LayoutFidgetDetails<LayoutFidgetConfig<any>> | undefined
): boolean => {
  return layoutDetails !== undefined && 'layouts' in layoutDetails && layoutDetails.layouts !== undefined;
};

/**
 * Gets the layout fidget type for a specific mode
 * @param layoutDetails Layout details (now using only LayoutFidgetDetails)
 * @param mode Desired mode
 * @returns Layout fidget type (grid, tabFullScreen, etc.)
 */
export const getLayoutFidgetForMode = (
  layoutDetails: LayoutFidgetDetails<LayoutFidgetConfig<any>> | undefined,
  mode: 'mobile' | 'desktop' = 'desktop'
): string => {
  if (!layoutDetails) {
    return 'grid';
  }
  
  // Check if using multi-layout format
  if (hasMultipleLayouts(layoutDetails) && layoutDetails.layouts![mode]) {
    return layoutDetails.layouts![mode].layoutFidget;
  }
  
  return layoutDetails.layoutFidget || 'grid';
};

/**
 * Gets the fidgets order for mobile from the layout configuration
 * @param layoutDetails Layout details (now using only LayoutFidgetDetails)
 * @param fidgetInstanceDatums Fidgets data
 * @returns Array of IDs in correct order for mobile
 */
export const getMobileFidgetOrder = (
  layoutDetails: LayoutFidgetDetails<LayoutFidgetConfig<any>> | undefined,
  fidgetInstanceDatums: { [key: string]: FidgetInstanceData }
): string[] => {
  if (!layoutDetails) {
    return Object.keys(fidgetInstanceDatums || {});
  }
  
  // Check if using multi-layout format and has mobile layout defined
  if (hasMultipleLayouts(layoutDetails) && 
      layoutDetails.layouts!.mobile?.layoutConfig?.layout) {
    return layoutDetails.layouts!.mobile.layoutConfig.layout || [];
  }
  
  return Object.keys(fidgetInstanceDatums || {});
};

/**
 * Migrates legacy LayoutFidgetDetails to support multiple layouts
 * @param oldLayout Legacy layout format
 * @param fidgetInstanceDatums Fidgets data
 * @returns Extended LayoutFidgetDetails with multiple layout support
 */
export const migrateToMultipleLayouts = (
  oldLayout: LayoutFidgetDetails<LayoutFidgetConfig<any>>,
  fidgetInstanceDatums: { [key: string]: FidgetInstanceData }
): LayoutFidgetDetails<LayoutFidgetConfig<any>> => {
  // If already has layouts object, return as is
  if (hasMultipleLayouts(oldLayout)) {
    return oldLayout;
  }

  // Get mobile layout order using the centralized function
  const mobileLayout = Object.keys(fidgetInstanceDatums || {}).sort((a, b) => {
    const aOrder = fidgetInstanceDatums[a]?.config?.settings?.mobileOrder || 0;
    const bOrder = fidgetInstanceDatums[b]?.config?.settings?.mobileOrder || 0;
    return aOrder - bOrder;
  });
  
  return {
    ...oldLayout,
    layouts: {
      desktop: {
        layoutFidget: oldLayout.layoutFidget || 'grid',
        layoutConfig: oldLayout.layoutConfig
      },
      mobile: {
        layoutFidget: 'tabFullScreen',
        layoutConfig: {
          layout: mobileLayout
        }
      }
    }
  };
};

/**
 * Gets layoutConfig compatible with both legacy and multi-layout formats
 * @param layoutDetails Layout details (now using only LayoutFidgetDetails)
 * @param mode Desired mode (mobile, desktop)
 * @returns Layout configuration equivalent to old format layoutConfig
 */
export const getLayoutConfig = (
  layoutDetails: LayoutFidgetDetails<LayoutFidgetConfig<any>> | undefined,
  mode: 'mobile' | 'desktop' = 'desktop'
): any => {
  if (!layoutDetails) {
    return { layout: [] };
  }
  
  // Check if using multi-layout format
  if (hasMultipleLayouts(layoutDetails) && layoutDetails.layouts![mode]) {
    return layoutDetails.layouts![mode].layoutConfig;
  }
  
  // Fallback to original layoutConfig for backwards compatibility
  return layoutDetails.layoutConfig || { layout: [] };
};

