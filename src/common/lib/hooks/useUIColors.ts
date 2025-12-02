import { SystemConfig } from "@/config";
import { useMemo } from "react";

type UseUIColorsProps = {
  systemConfig?: SystemConfig;
};

/**
 * Hook to get UI colors from system config
 * 
 * @param systemConfig - Optional system config. If not provided, uses default colors.
 *                       For new code, always pass systemConfig from a parent Server Component.
 */
export const useUIColors = ({ systemConfig }: UseUIColorsProps = {}) => {
  return useMemo(() => {
    const { ui } = systemConfig || {};
    return {
      primaryColor: ui?.primaryColor || "rgb(37, 99, 235)",
      primaryHoverColor: ui?.primaryHoverColor || "rgb(29, 78, 216)",
      primaryActiveColor: ui?.primaryActiveColor || "rgb(30, 64, 175)",
      castButton: ui?.castButton || {
        backgroundColor: ui?.primaryColor || "rgb(37, 99, 235)",
        hoverColor: ui?.primaryHoverColor || "rgb(29, 78, 216)",
        activeColor: ui?.primaryActiveColor || "rgb(30, 64, 175)",
      },
    };
  }, [systemConfig]);
};
