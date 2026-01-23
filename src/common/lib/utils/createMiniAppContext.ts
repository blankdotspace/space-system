/**
 * Utility to create a MiniAppContext from Nounspace's own data
 * 
 * Since Nounspace IS the Farcaster client, we create the context ourselves
 * from our user data, authenticator, and system state.
 */

import type { Context } from "@farcaster/miniapp-core";
import { useCurrentFid } from "@/common/lib/hooks/useCurrentFid";

/**
 * Create a MiniAppContext from Nounspace's own data
 * @param userFid - The current user's FID (from authenticator)
 * @returns A valid MiniAppContext object
 */
export function createMiniAppContext(userFid?: number | null): Context.MiniAppContext {
  const platform = typeof window !== 'undefined' 
    ? (window.navigator.userAgent.includes('Mobile') ? 'mobile' : 'web')
    : 'unknown';

  return {
    client: {
      version: "1.0.0",
      platform: platform as Context.ClientContext['platform'],
      platformType: platform === 'mobile' ? 'ios' : 'web', // Default to web for now
    },
    user: userFid ? {
      fid: userFid,
      // Additional user data can be added here if needed
    } : undefined,
    location: {
      type: "launcher",
    },
    features: {},
  };
}

/**
 * Hook to get the current MiniAppContext from Nounspace's data
 * This should be used instead of relying on SDK context when we ARE the client
 */
export function useNounspaceMiniAppContext(): Context.MiniAppContext {
  const userFid = useCurrentFid();
  return createMiniAppContext(userFid);
}

