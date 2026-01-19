"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import type { Context } from "@farcaster/miniapp-core";
import { MiniAppSdkContext } from "../../providers/MiniAppSdkProvider";

/**
 * Hook to access the Farcaster Mini App SDK
 * 
 * Provides a fully-typed interface to interact with the Farcaster Mini App SDK:
 * - Get user & app context
 * - Access all SDK actions
 * - Subscribe to events
 * - Use wallet integration
 */
export function useMiniAppSdk() {
  const { isInitializing, isReady, error, sdk: sdkInstance } = useContext(MiniAppSdkContext);
  const [frameContext, setFrameContext] = useState<
    Context.MiniAppContext | undefined
  >(
    undefined,
  );

  // Fetch context when SDK is available
  useEffect(() => {
    if (sdkInstance) {
      const fetchContext = async () => {
        try {
          // Context is a promise in the SDK
          const context = await sdkInstance.context;
          setFrameContext(context);
        } catch (err) {
          console.error("Error fetching context:", err);
        }
      };

      fetchContext();
    }
  }, [sdkInstance]);

  /**
   * Mark the app as ready to hide the splash screen
   * @param options - Optional configuration
   */
  const ready = useCallback(async (options?: { disableNativeGestures?: boolean }) => {
    if (sdkInstance) {
      try {
        await sdkInstance.actions.ready(options);
        return true;
      } catch (err) {
        console.error("Error calling ready:", err);
        return false;
      }
    }
    return false;
  }, [sdkInstance]);

  /**
   * Close the mini app
   */
  const close = useCallback(async () => {
    if (sdkInstance) {
      try {
        await sdkInstance.actions.close();
        return true;
      } catch (err) {
        console.error("Error closing mini app:", err);
        return false;
      }
    }
    return false;
  }, [sdkInstance]);

  /**
   * Prompt the user to sign in with Farcaster
   * @param nonce - A cryptographically secure random string
   */
  const signIn = useCallback(async (nonce: string) => {
    if (sdkInstance) {
      try {
        return await sdkInstance.actions.signIn({ nonce });
      } catch (err) {
        console.error("Error signing in:", err);
        return null;
      }
    }
    return null;
  }, [sdkInstance]);

  /**
   * Prompt the user to add the mini app
   */
  const addFrame = useCallback(async () => {
    if (sdkInstance) {
      try {
        return await sdkInstance.actions.addFrame();
      } catch (err) {
        console.error("Error adding frame:", err);
        return false;
      }
    }
    return false;
  }, [sdkInstance]);

  /**
   * Prompt the user to compose a cast
   */
  // const composeCast = useCallback(async (options: Parameters<typeof sdk.actions.composeCast>[0]) => {
  //   if (sdkInstance) {
  //     try {
  //       return await sdkInstance.actions.composeCast(options);
  //     } catch (err) {
  //       console.error("Error composing cast:", err);
  //       return false;
  //     }
  //   }
  //   return false;
  // }, [sdkInstance]);

  /**
   * Open an external URL
   */
  const openUrl = useCallback(async (url: string) => {
    if (sdkInstance) {
      try {
        return await sdkInstance.actions.openUrl(url);
      } catch (err) {
        console.error("Error opening URL:", err);
        return false;
      }
    }
    return false;
  }, [sdkInstance]);

  /**
   * View a Farcaster profile
   */
  const viewProfile = useCallback(async (fid: number) => {
    if (sdkInstance) {
      try {
        return await sdkInstance.actions.viewProfile({ fid });
      } catch (err) {
        console.error("Error viewing profile:", err);
        return false;
      }
    }
    return false;
  }, [sdkInstance]);

  /**
   * Get Ethereum provider for wallet interactions
   */
  const getEthereumProvider = useCallback(() => {
    if (sdkInstance) {
      return sdkInstance.wallet.ethProvider;
    }
    return null;
  }, [sdkInstance]);

  return {
    // States
    isInitializing,
    isReady,
    error,

    // SDK instance
    sdk: sdkInstance,

    // Context - properly typed based on context.d.ts
    context: frameContext,

    // Typed context properties for easier access
    clientContext: frameContext?.client,
    userContext: frameContext?.user,
    locationContext: frameContext?.location,

    // Access specific location context types if needed
    castEmbedContext: frameContext?.location?.type === "cast_embed"
      ? (frameContext.location as Context.CastEmbedLocationContext)
      : undefined,
    notificationContext: frameContext?.location?.type === "notification"
      ? (frameContext.location as Context.NotificationLocationContext)
      : undefined,
    launcherContext: frameContext?.location?.type === "launcher"
      ? (frameContext.location as Context.LauncherLocationContext)
      : undefined,
    channelContext: frameContext?.location?.type === "channel"
      ? (frameContext.location as Context.ChannelLocationContext)
      : undefined,

    // Actions
    actions: {
      ready,
      close,
      signIn,
      addFrame,
      // composeCast,
      openUrl,
      viewProfile,
    },

    // Events (subscribe via the SDK directly)
    on: sdkInstance?.on?.bind(sdkInstance),
    off: sdkInstance?.off?.bind(sdkInstance),

    // Wallet
    wallet: {
      ethProvider: getEthereumProvider(),
    }
  };
}

export default useMiniAppSdk;
