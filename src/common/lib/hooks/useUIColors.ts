import { SystemConfig } from "@/config";
import { useMemo } from "react";
import { extractFontFamilyFromUrl } from "../utils/fontUtils";

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
    let cssFontColor: string | undefined;
    let cssFontFamily: string | undefined;
    let cssCastButtonFontColor: string | undefined;
    let cssBackgroundColor: string | undefined;

    if (typeof document !== "undefined") {
      const styles = getComputedStyle(document.body);
      cssFontColor = styles.getPropertyValue("--ns-nav-font-color")?.trim() || undefined;
      cssFontFamily = styles.getPropertyValue("--ns-nav-font")?.trim() || undefined;
      cssCastButtonFontColor =
        styles.getPropertyValue("--ns-cast-button-font-color")?.trim() || undefined;
      cssBackgroundColor =
        styles.getPropertyValue("--ns-background-color")?.trim() || undefined;
    }

    const parsedFontFamily = extractFontFamilyFromUrl(ui?.url);

    return {
      fontColor: ui?.fontColor || cssFontColor || "#0f172a",
      castButtonFontColor: ui?.castButtonFontColor || cssCastButtonFontColor || "#ffffff",
      fontFamily: parsedFontFamily
        ? `${parsedFontFamily}, var(--font-sans, sans-serif)`
        : cssFontFamily || "var(--font-sans, Inter, system-ui, -apple-system, sans-serif)",
      fontUrl: ui?.url,
      backgroundColor: ui?.backgroundColor || cssBackgroundColor || "#ffffff",
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
