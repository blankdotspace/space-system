"use client";

/**
 * NavPageSpace Component
 * 
 * Client-side space component for navigation pages (home, explore, etc.) in the public spaces pattern.
 * 
 * Responsibilities:
 * - Accepts server-side loaded nav page data (Omit<NavPageSpacePageData, 'isEditable' | 'spacePageUrl'>)
 * - Adds client-side editability logic based on admin identity public keys
 * - Renders PublicSpace component with complete nav page space data
 * 
 * Data Flow:
 * 1. Receives serializable nav page data from server-side page component
 * 2. Adds isEditable function that checks if current user identity is in admin list
 * 3. Adds spacePageUrl function for tab navigation using navSlug
 * 4. Passes complete NavPageSpacePageData to PublicSpace for rendering
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
import { NavPageSpacePageData } from "@/common/types/spaceData";
import { useCurrentSpaceIdentityPublicKey } from "@/common/lib/hooks/useCurrentSpaceIdentityPublicKey";

export interface NavPageSpaceProps {
  spacePageData: Omit<NavPageSpacePageData, 'isEditable' | 'spacePageUrl'>;
  tabName: string;
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
  spacePageData: spaceData,
  tabName,
}: NavPageSpaceProps) {
  const currentUserIdentityPublicKey = useCurrentSpaceIdentityPublicKey();

  // Add isEditable and spacePageUrl logic on the client side
  const spaceDataWithClientSideLogic = useMemo(() => ({
    ...spaceData,
    spacePageUrl: (tabName: string) => `/${spaceData.navSlug}/${encodeURIComponent(tabName)}`,
    // NavPage editability is based on admin keys, not FID
    // We ignore the currentUserFid parameter since we use identity keys instead
    isEditable: (_currentUserFid: number | undefined) => 
      isNavPageSpaceEditable(
        spaceData.adminIdentityPublicKeys,
        currentUserIdentityPublicKey
      ),
  }), [spaceData, currentUserIdentityPublicKey]);

  return (
    <PublicSpace
      spacePageData={spaceDataWithClientSideLogic}
      tabName={tabName}
    />
  );
}
