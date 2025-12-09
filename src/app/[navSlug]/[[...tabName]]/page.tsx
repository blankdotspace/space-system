import React from "react";
import { notFound } from "next/navigation";
import { loadSystemConfig } from "@/config";
import NavPageSpace from "./NavPageSpace";
import { createSupabaseServerClient } from "@/common/data/database/supabase/clients/server";
import { NavPageSpacePageData, SPACE_TYPES } from "@/common/types/spaceData";
import { INITIAL_SPACE_CONFIG_EMPTY } from "@/config";

/**
 * Get the default tab for a space from its tab order
 * Tab order is stored directly (not wrapped in SignedFile)
 * Similar to how ProfileSpace's getTabList works in utils.ts
 */
async function getDefaultTab(spaceId: string): Promise<string | null> {
  try {
    const { data: tabOrderData, error } = await createSupabaseServerClient()
      .storage
      .from('spaces')
      .download(`${spaceId}/tabOrder`);

    if (error || !tabOrderData) {
      return null;
    }

    const tabOrderJson = JSON.parse(await tabOrderData.text());
    return tabOrderJson.tabOrder?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Create NavPage space data in the same pattern as ProfileSpace's createProfileSpaceData
 * PublicSpace handles loading the actual tab config from storage
 */
function createNavPageSpaceData(
  spaceId: string,
  navSlug: string,
  tabName: string,
  adminIdentityPublicKeys: string[]
): Omit<NavPageSpacePageData, 'isEditable' | 'spacePageUrl'> {
  return {
    spaceId,
    spaceName: navSlug,
    spaceType: SPACE_TYPES.NAV_PAGE,
    updatedAt: new Date().toISOString(),
    defaultTab: tabName,
    currentTab: tabName,
    spaceOwnerFid: undefined, // NavPages don't have FID owners
    config: INITIAL_SPACE_CONFIG_EMPTY, // PublicSpace loads actual config from storage
    navSlug,
    adminIdentityPublicKeys,
  };
}

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic';

export default async function NavPage({
  params,
}: {
  params: Promise<{ navSlug: string; tabName?: string[] }>;
}) {
  const { navSlug, tabName } = await params;

  // Early rejection for known non-nav routes
  const reservedRoutes = ['api', 'notifications', 'privacy', 'terms', 'pwa', 'manifest', '.well-known'];
  if (reservedRoutes.includes(navSlug)) {
    notFound();
  }

  const config = await loadSystemConfig();

  // Find navigation item by href
  const navItems = config.navigation?.items || [];
  const navItem = navItems.find(item => item.href === `/${navSlug}`);

  if (!navItem) {
    notFound();
  }

  // Nav item must have a spaceId
  if (!navItem.spaceId) {
    console.error(`[NavPage] Navigation item "${navSlug}" has no spaceId`);
    notFound();
  }

  // Decode tab name if provided, otherwise get default tab
  let activeTabName: string;
  if (tabName && tabName.length > 0) {
    activeTabName = decodeURIComponent(tabName[0]);
  } else {
    // Get default tab from tab order (same pattern as ProfileSpace)
    const defaultTab = await getDefaultTab(navItem.spaceId);
    if (!defaultTab) {
      console.error(`[NavPage] No tabs found for spaceId: ${navItem.spaceId}`);
      notFound();
    }
    activeTabName = defaultTab;
  }

  // Create space data - PublicSpace handles loading actual tab config
  const spaceData = createNavPageSpaceData(
    navItem.spaceId,
    navSlug,
    activeTabName,
    config.adminIdentityPublicKeys ?? []
  );

  return (
    <NavPageSpace
      spacePageData={spaceData}
      tabName={activeTabName}
    />
  );
}

