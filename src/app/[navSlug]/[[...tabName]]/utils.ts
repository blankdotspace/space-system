import { NavPageSpacePageData, SPACE_TYPES } from "@/common/types/spaceData";
import { INITIAL_SPACE_CONFIG_EMPTY } from "@/config";
import { loadSpaceDefaultTab } from "@/common/utils/tabUtils";

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
  const defaultTab = await loadSpaceDefaultTab(spaceId, "Home");
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
