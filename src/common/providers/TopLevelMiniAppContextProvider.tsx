"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/common/data/stores/app";
import { HOMEBASE_ID } from "@/common/data/stores/app/currentSpace";
import { SPACE_TYPES } from "@/common/types/spaceData";
import { MiniAppContextProvider } from "./MiniAppContextProvider";
import { useLocationAwareNavigation } from "@/common/lib/hooks/useLocationAwareNavigation";
import { useEffect } from "react";

/**
 * Top-level wrapper that provides mini-app context based on current route and app store
 * This component detects the current space from the URL pathname and app store state
 */
export function TopLevelMiniAppContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentSpaceId = useAppStore((state) => state.currentSpace.currentSpaceId);
  const currentTabName = useAppStore((state) => state.currentSpace.currentTabName);

  // Derive space context from pathname and store
  const spaceContext = useMemo(() => {
    // Determine space ID
    let spaceId = currentSpaceId || "unknown";
    
    // Determine space handle from pathname
    let spaceHandle: string | undefined;
    let spaceType = SPACE_TYPES.PROFILE;
    
    if (pathname?.startsWith("/homebase")) {
      spaceId = HOMEBASE_ID;
      spaceHandle = "homebase";
      spaceType = SPACE_TYPES.PROFILE;
    } else if (pathname?.startsWith("/s/")) {
      // Profile space: /s/[handle]/[tab]
      const match = pathname.match(/^\/s\/([^/]+)/);
      spaceHandle = match ? match[1] : undefined;
      spaceType = SPACE_TYPES.PROFILE;
    } else if (pathname?.startsWith("/t/")) {
      // Token space: /t/[network]/[contractAddress]/[tab]
      const match = pathname.match(/^\/t\/[^/]+\/([^/]+)/);
      spaceHandle = match ? match[1] : undefined;
      spaceType = SPACE_TYPES.TOKEN;
    } else if (pathname?.startsWith("/p/")) {
      // Proposal space: /p/[proposalId]/[tab]
      const match = pathname.match(/^\/p\/([^/]+)/);
      spaceHandle = match ? match[1] : undefined;
      spaceType = SPACE_TYPES.PROPOSAL;
    } else if (pathname?.startsWith("/c/")) {
      // Channel space: /c/[channelId]/[tab]
      const match = pathname.match(/^\/c\/([^/]+)/);
      spaceHandle = match ? match[1] : undefined;
      spaceType = SPACE_TYPES.CHANNEL;
    } else if (pathname && pathname !== "/" && !pathname.startsWith("/api")) {
      // Nav page: /[navSlug]/[tab]
      const match = pathname.match(/^\/([^/]+)/);
      spaceHandle = match ? match[1] : undefined;
      spaceType = SPACE_TYPES.NAV_PAGE;
    }

    return {
      spaceId,
      spaceHandle,
      tabName: currentTabName || undefined,
      spaceType,
      isEditable: false, // Will be determined by space-specific logic if needed
    };
  }, [pathname, currentSpaceId, currentTabName]);

  return (
    <MiniAppContextProvider
      spaceId={spaceContext.spaceId}
      spaceHandle={spaceContext.spaceHandle}
      tabName={spaceContext.tabName}
      spaceType={spaceContext.spaceType}
      isEditable={spaceContext.isEditable}
    >
      <LocationAwareNavigationHandler />
      {children}
    </MiniAppContextProvider>
  );
}

/**
 * Component that handles location-aware navigation (must be inside MiniAppContextProvider)
 */
function LocationAwareNavigationHandler() {
  const { navigateFromContext } = useLocationAwareNavigation();

  // Navigate based on location context
  useEffect(() => {
    navigateFromContext();
  }, [navigateFromContext]);

  return null;
}

