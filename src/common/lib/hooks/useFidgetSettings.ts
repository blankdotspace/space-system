import { useAppStore } from "@/common/data/stores/app";
import { FidgetSettings } from "@/common/fidgets";
import { HOMEBASE_ID } from "@/common/data/stores/app/currentSpace";

/**
 * Subscribe directly to fidget settings from zustand.
 * This eliminates prop lag - components get immediate updates when zustand changes.
 * Automatically handles both public spaces (space.localSpaces) and homebase (homebase.tabs).
 * 
 * @param spaceId - Current space ID (null/undefined for non-space contexts, "homebase" for homebase)
 * @param tabName - Current tab name (null/undefined for non-tab contexts)
 * @param fidgetId - Fidget instance ID
 * @returns Current settings from zustand, or undefined if not found
 */
export function useFidgetSettings(
  spaceId: string | null | undefined,
  tabName: string | null | undefined,
  fidgetId: string,
): FidgetSettings | undefined {
  return useAppStore((state) => {
    if (!tabName) return undefined;
    
    // Handle homebase (private spaces)
    if (spaceId === HOMEBASE_ID) {
      return state.homebase.tabs[tabName]?.config?.fidgetInstanceDatums?.[fidgetId]?.config?.settings;
    }
    
    // Handle public spaces
    if (!spaceId) return undefined;
    
    return state.space.localSpaces[spaceId]?.tabs?.[tabName]
      ?.fidgetInstanceDatums?.[fidgetId]?.config?.settings;
  });
}

