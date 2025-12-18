import { NavPageSpacePageData, SPACE_TYPES } from "@/common/types/spaceData";
import { INITIAL_SPACE_CONFIG_EMPTY } from "@/config";
import { createSupabaseServerClient } from "@/common/data/database/supabase/clients/server";

/**
 * Get the default tab for a space from its tab order
 * Returns the first tab in the list, or "Home" if the list is empty or not found
 */
async function getDefaultTabFromStorage(spaceId: string): Promise<string> {
  try {
    const { data: tabOrderData, error } = await createSupabaseServerClient()
      .storage
      .from('spaces')
      .download(`${spaceId}/tabOrder`);
    
    if (error || !tabOrderData) {
      return "Home";
    }
    
    const tabOrderText = await tabOrderData.text();
    const tabOrderJson = JSON.parse(tabOrderText) as { tabOrder?: string[] };
    const tabOrder = tabOrderJson.tabOrder || [];
    
    // Return first tab if available, otherwise "Home"
    return tabOrder.length > 0 ? tabOrder[0] : "Home";
  } catch (error) {
    console.warn(`Failed to load tabOrder for space ${spaceId}:`, error);
    return "Home";
  }
}

/**
 * Create NavPage space data
 * PublicSpace handles loading the actual tab config from storage
 */
export const createNavPageSpaceData = async (
  spaceId: string,
  navSlug: string,
  tabName: string | undefined,
  adminIdentityPublicKeys: string[]
): Promise<Omit<NavPageSpacePageData, 'isEditable' | 'spacePageUrl'>> => {
  // Get default tab from storage (first tab in list, or "Home" if empty)
  const defaultTab = await getDefaultTabFromStorage(spaceId);
  const activeTab = tabName || defaultTab;

  return {
    spaceId,
    spaceName: navSlug,
    spaceType: SPACE_TYPES.NAV_PAGE,
    updatedAt: new Date().toISOString(),
    defaultTab,
    currentTab: activeTab,
    spaceOwnerFid: undefined, // NavPages don't have FID owners
    config: INITIAL_SPACE_CONFIG_EMPTY, // PublicSpace loads actual config from storage
    navSlug,
    adminIdentityPublicKeys,
  };
};

export const loadNavPageSpaceData = async (
  navSlug: string,
  tabNameParam?: string
): Promise<Omit<NavPageSpacePageData, 'isEditable' | 'spacePageUrl'> | null> => {
  const { loadSystemConfig } = await import("@/config");
  const config = await loadSystemConfig();

  // Find navigation item by href
  const navItems = config.navigation?.items || [];
  const navItem = navItems.find(item => item.href === `/${navSlug}`);

  if (!navItem || !navItem.spaceId) {
    return null;
  }

  return await createNavPageSpaceData(
    navItem.spaceId,
    navSlug,
    tabNameParam, // Already decoded in page.tsx
    config.adminIdentityPublicKeys ?? []
  );
};
