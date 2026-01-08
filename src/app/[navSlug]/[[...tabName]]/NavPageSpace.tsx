"use client";

/**
 * NavPageSpace Component
 * 
 * Client-side space component for navigation pages (home, explore, etc.) in the public spaces pattern.
 * 
 * Responsibilities:
 * - Accepts server-side loaded nav page data (Omit<NavPageSpacePageData, 'isEditable' | 'spacePageUrl'>)
 * - Falls back to checking local stores if server didn't find the nav item (for uncommitted items)
 * - Adds client-side editability logic based on admin identity public keys
 * - Renders PublicSpace component with complete nav page space data
 * 
 * Data Flow:
 * 1. Receives serializable nav page data from server-side page component (or null if not found)
 * 2. If null, checks local navigation store to find uncommitted nav items
 * 3. Constructs space data from local stores if found
 * 4. Adds isEditable function that checks if current user identity is in admin list
 * 5. Adds spacePageUrl function for tab navigation using navSlug
 * 6. Passes complete NavPageSpacePageData to PublicSpace for rendering
 * 
 * Editability Logic:
 * - User can edit if their identityPublicKey is in adminIdentityPublicKeys
 * - This is different from other space types which use FID/wallet ownership
 * 
 * Part of: /[navSlug] route structure
 * Integrates with: PublicSpace
 */

import React, { useMemo } from "react";
import PublicSpace from "@/app/(spaces)/PublicSpace";
import { NavPageSpacePageData, SPACE_TYPES } from "@/common/types/spaceData";
import { INITIAL_SPACE_CONFIG_EMPTY } from "@/config";
import { useCurrentSpaceIdentityPublicKey } from "@/common/lib/hooks/useCurrentSpaceIdentityPublicKey";
import { useAppStore } from "@/common/data/stores/app";

export interface NavPageSpaceProps {
  spacePageData: Omit<NavPageSpacePageData, 'isEditable' | 'spacePageUrl'> | null;
  tabName: string | undefined;
  navSlug: string;
  adminIdentityPublicKeys: string[];
}

// Helper function to check if nav page space is editable
const isNavPageSpaceEditable = (
  adminIdentityPublicKeys: string[],
  currentUserIdentityPublicKey?: string
): boolean => {
  // Require user to be logged in (have an identity key)
  if (!currentUserIdentityPublicKey) {
    return false;
  }

  // Check if user's identity is in the admin list
  return adminIdentityPublicKeys.includes(currentUserIdentityPublicKey);
};

export default function NavPageSpace({
  spacePageData: serverSpaceData,
  tabName: providedTabName,
  navSlug,
  adminIdentityPublicKeys,
}: NavPageSpaceProps) {
  const currentUserIdentityPublicKey = useCurrentSpaceIdentityPublicKey();
  const localNavigation = useAppStore((state) => state.navigation.localNavigation);
  const spaceLocalSpaces = useAppStore((state) => state.space.localSpaces);

  // If server didn't find it, check local stores for uncommitted nav items
  const spaceData = useMemo(() => {
    if (serverSpaceData) {
      return serverSpaceData;
    }

    // Check local navigation items for this navSlug
    const localNavItem = localNavigation.find(
      (item) => item.href === `/${navSlug}` && item.spaceId
    );

    if (!localNavItem || !localNavItem.spaceId) {
      return null;
    }

    // Find the space in localSpaces
    const localSpace = spaceLocalSpaces[localNavItem.spaceId];
    if (!localSpace) {
      return null;
    }

    // Get default tab from local space order, or use "Home"
    const defaultTab = localSpace.order && localSpace.order.length > 0 
      ? localSpace.order[0] 
      : "Home";
    const activeTab = providedTabName || defaultTab;

    // Construct space data from local stores
    return {
      spaceId: localNavItem.spaceId,
      spaceName: navSlug,
      spaceType: SPACE_TYPES.NAV_PAGE,
      updatedAt: localSpace.updatedAt || new Date().toISOString(),
      defaultTab,
      currentTab: activeTab,
      spaceOwnerFid: undefined,
      config: INITIAL_SPACE_CONFIG_EMPTY,
      navSlug,
      adminIdentityPublicKeys, // Use admin keys from server config
    };
  }, [serverSpaceData, localNavigation, spaceLocalSpaces, navSlug, providedTabName, adminIdentityPublicKeys]);

  // Add isEditable and spacePageUrl logic on the client side
  // IMPORTANT: This hook must be called before any early returns to satisfy Rules of Hooks
  const spaceDataWithClientSideLogic = useMemo(() => {
    if (!spaceData) {
      return null;
    }
    return {
      ...spaceData,
      spacePageUrl: (tabName: string) => `/${spaceData.navSlug}/${encodeURIComponent(tabName)}`,
      // NavPage editability is based on admin keys, not FID
      // We ignore the currentUserFid parameter since we use identity keys instead
      isEditable: (_currentUserFid: number | undefined) => 
        isNavPageSpaceEditable(
          spaceData.adminIdentityPublicKeys,
          currentUserIdentityPublicKey
        ),
    };
  }, [spaceData, currentUserIdentityPublicKey]);

  // If we still don't have space data, show 404
  // This check must come AFTER all hooks are called
  if (!spaceDataWithClientSideLogic) {
    // In client components, we can't use notFound() directly
    // Return a simple error state instead
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">404</h1>
          <p className="text-gray-600">Page not found</p>
        </div>
      </div>
    );
  }

  const finalTabName = providedTabName || spaceDataWithClientSideLogic.defaultTab;

  return (
    <PublicSpace
      spacePageData={spaceDataWithClientSideLogic}
      tabName={finalTabName}
    />
  );
}
