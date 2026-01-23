"use client";

import { useState, useEffect } from "react";
import type { Context } from "@farcaster/miniapp-core";
import { MiniAppSdkContext } from "@/common/providers/MiniAppSdkProvider";
import { useContext } from "react";

/**
 * Create a minimal fallback context when the real SDK context is not available
 * This allows embedded mini-apps to work even when Blankspace is not embedded in a Farcaster client
 */
function createFallbackContext(): Context.MiniAppContext {
  return {
    client: {
      platformType: typeof window !== 'undefined' ? 'web' : undefined,
      clientFid: 0, // No FID when not in Farcaster client
      added: false, // Not added when not in Farcaster client
    },
    user: {
      fid: 0, // No user when not in Farcaster client
    },
    location: {
      type: "launcher",
    },
    features: {
      haptics: false, // Required field
    },
  };
}

/**
 * Hook to get the Blankspace mini app context
 * Returns the real SDK context if available, otherwise returns a fallback context
 */
export function useBlankspaceMiniAppContext(): Context.MiniAppContext | undefined {
  const sdkContextState = useContext(MiniAppSdkContext);
  const [fallbackContext] = useState<Context.MiniAppContext>(() => createFallbackContext());

  // Use real SDK context if available, otherwise use fallback
  return sdkContextState?.context || fallbackContext;
}

