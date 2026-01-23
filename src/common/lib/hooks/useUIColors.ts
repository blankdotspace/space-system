import { SystemConfig } from "@/config";
import { useMemo } from "react";
import { resolveUiFontFamily } from "../utils/fontUtils";

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
    let cssCastButtonBackgroundColor: string | undefined;
    let cssCastButtonHoverColor: string | undefined;
    let cssCastButtonActiveColor: string | undefined;
    let cssBackgroundColor: string | undefined;

    if (typeof document !== "undefined") {
      const styles = getComputedStyle(document.body);
      cssFontColor = styles.getPropertyValue("--ns-nav-font-color")?.trim() || undefined;
      cssFontFamily = styles.getPropertyValue("--ns-nav-font")?.trim() || undefined;
      cssCastButtonFontColor =
        styles.getPropertyValue("--ns-cast-button-font-color")?.trim() || undefined;
      cssCastButtonBackgroundColor =
        styles.getPropertyValue("--ns-cast-button-background-color")?.trim() || undefined;
      cssCastButtonHoverColor =
        styles.getPropertyValue("--ns-cast-button-hover-color")?.trim() || undefined;
      cssCastButtonActiveColor =
        styles.getPropertyValue("--ns-cast-button-active-color")?.trim() || undefined;
      cssBackgroundColor =
        styles.getPropertyValue("--ns-background-color")?.trim() || undefined;
    }

    const resolvedFontFamily = resolveUiFontFamily(ui?.font);
    const castButton = {
      ...(ui?.castButton || {}),
      backgroundColor:
        ui?.castButton?.backgroundColor ??
        cssCastButtonBackgroundColor ??
        ui?.primaryColor ??
        "rgb(37, 99, 235)",
      hoverColor:
        ui?.castButton?.hoverColor ??
        cssCastButtonHoverColor ??
        ui?.primaryHoverColor ??
        "rgb(29, 78, 216)",
      activeColor:
        ui?.castButton?.activeColor ??
        cssCastButtonActiveColor ??
        ui?.primaryActiveColor ??
        "rgb(30, 64, 175)",
    };

    return {
      fontColor: ui?.fontColor || cssFontColor || "#0f172a",
      castButtonFontColor:
        ui?.castButton?.fontColor ||
        ui?.castButtonFontColor ||
        cssCastButtonFontColor ||
        "#ffffff",
      fontFamily: resolvedFontFamily
        ? `${resolvedFontFamily}, var(--font-sans, sans-serif)`
        : cssFontFamily || "var(--font-sans, Inter, system-ui, -apple-system, sans-serif)",
      backgroundColor: ui?.backgroundColor || cssBackgroundColor || "#ffffff",
      primaryColor: ui?.primaryColor || "rgb(37, 99, 235)",
      primaryHoverColor: ui?.primaryHoverColor || "rgb(29, 78, 216)",
      primaryActiveColor: ui?.primaryActiveColor || "rgb(30, 64, 175)",
      castButton,
    };
  }, [systemConfig]);
};
