import { loadSystemConfig } from "@/config";
import { useMemo } from "react";

export const useUIColors = () => {
  return useMemo(() => {
    const { ui } = loadSystemConfig();
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
  }, []);
};
