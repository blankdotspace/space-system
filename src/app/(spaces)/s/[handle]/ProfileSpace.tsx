"use client";

/**
 * ProfileSpace Component
 * 
 * Client-side space component for user profile spaces in the public spaces pattern.
 * 
 * Responsibilities:
 * - Accepts server-side loaded profile data (Omit<ProfileSpaceData, 'isEditable' | 'spacePageUrl'>)
 * - Adds client-side editability logic based on Farcaster FID matching
 * - Renders PublicSpace component with complete profile space data
 * 
 * Data Flow:
 * 1. Receives serializable profile data from server-side page component
 * 2. Adds isEditable function that checks if current user FID matches profile FID
 * 3. Adds spacePageUrl function for tab navigation using profile handle
 * 4. Passes complete ProfileSpaceData to PublicSpace for rendering
 * 
 * Editability Logic:
 * - User can edit their own profile space (FID comparison)
 * - Simple FID matching for ownership verification
 * 
 * Part of: /s/[handle] route structure
 * Integrates with: PublicSpace
 */

import React, { useMemo } from "react";
import PublicSpace from "@/app/(spaces)/PublicSpace";
import { ProfileSpacePageData } from "@/common/types/spaceData";
import { useCurrentSpaceIdentityPublicKey } from "@/common/lib/hooks/useCurrentSpaceIdentityPublicKey";

export interface ProfileSpaceProps {
  spacePageData: Omit<ProfileSpacePageData, 'isEditable' | 'spacePageUrl'>;
  tabName: string;
}

// Helper function to check if profile space is editable
const isProfileSpaceEditable = (
  spaceOwnerFid: number | undefined,
  currentUserFid: number | undefined,
  spaceId: string | undefined,
  spaceIdentityPublicKey?: string,
  currentUserIdentityPublicKey?: string
): boolean => {
  // Require user to be logged in (have an identity key)
  if (!currentUserIdentityPublicKey) {
    console.log('[ProfileSpace] User not logged in - not editable');
    return false;
  }

  // Check FID ownership (original logic)
  const hasFidOwnership = 
    currentUserFid !== undefined && 
    spaceOwnerFid !== undefined && 
    currentUserFid === spaceOwnerFid;

  // Check identity key ownership (only if space is registered)
  const hasIdentityOwnership = !!(spaceId && spaceIdentityPublicKey && 
    spaceIdentityPublicKey === currentUserIdentityPublicKey);

  console.log('[ProfileSpace] Editability check details:', {
    spaceOwnerFid,
    currentUserFid,
    spaceId,
    spaceIdentityPublicKey,
    currentUserIdentityPublicKey,
    hasFidOwnership,
    hasIdentityOwnership,
    isEditable: hasFidOwnership || hasIdentityOwnership
  });

  return hasFidOwnership || hasIdentityOwnership;
};

export default function ProfileSpace({
  spacePageData: spaceData,
  tabName,
}: ProfileSpaceProps) {
  const currentUserIdentityPublicKey = useCurrentSpaceIdentityPublicKey();

  // Guard against undefined spaceName - this should show SpaceNotFound
  if (!spaceData.spaceName) {
    return <div>Profile space data incomplete. Please try again.</div>;
  }

  // Add isEditable and spacePageUrl logic on the client side
  const spaceDataWithClientSideLogic = useMemo(() => ({
    ...spaceData,
    spacePageUrl: (tabName: string) => `/s/${spaceData.spaceName}/${encodeURIComponent(tabName)}`,
    isEditable: (currentUserFid: number | undefined) => 
      isProfileSpaceEditable(
        spaceData.spaceOwnerFid, 
        currentUserFid,
        spaceData.spaceId,
        spaceData.identityPublicKey,
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
