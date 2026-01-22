"use client";

import React, { createContext, useCallback, useContext, useMemo } from "react";
import type { Context } from "@farcaster/miniapp-core";
import { useMiniAppSdk } from "@/common/lib/hooks/useMiniAppSdk";
import { ContextTransformer, type NounspaceContext, type ParsedContext, type TransformedMiniAppContext, type URLContextParams } from "@/common/lib/services/contextTransformer";
import { useCurrentFid } from "@/common/lib/hooks/useCurrentFid";
import { useIsMobile } from "@/common/lib/hooks/useIsMobile";

/**
 * Combined context: host context + Nounspace context
 * Fields from host context are optional to support running outside mini-app environments
 */
export type CombinedContext = {
  user: Context.MiniAppContext["user"] | undefined;
  location: Context.MiniAppContext["location"] | undefined;
  client: Context.MiniAppContext["client"] | undefined;
  features: Context.MiniAppContext["features"] | undefined;
  nounspace: NounspaceContext;
};

type MiniAppContextProviderProps = {
  children: React.ReactNode;
  spaceId: string;
  spaceHandle?: string;
  tabName?: string;
  spaceType?: string;
  isEditable?: boolean;
  ownerFid?: number;
};

type MiniAppContextValue = {
  combinedContext: CombinedContext | null;
  hostContext: Context.MiniAppContext | null;
  nounspaceContext: NounspaceContext | null;
  transformForEmbedded: (fidgetId?: string) => TransformedMiniAppContext | null;
  getUrlContext: () => URLContextParams;
  buildUrlWithContext: (baseUrl: string, nounspaceContext?: NounspaceContext) => string;
  parseUrlContext: (searchParams: URLSearchParams) => ParsedContext;
};

const MiniAppContextContext = createContext<MiniAppContextValue>({
  combinedContext: null,
  hostContext: null,
  nounspaceContext: null,
  transformForEmbedded: () => null,
  getUrlContext: () => ({}),
  buildUrlWithContext: (url) => url,
  parseUrlContext: () => ({
    from: undefined,
    castHash: null,
    channelKey: null,
    notificationId: null,
    userFid: null,
    referrerDomain: null,
  }),
});

/**
 * Provider that combines host mini-app context with Nounspace-specific context
 * 
 * This provider wraps the existing MiniAppSdkProvider and adds Nounspace-specific
 * context information (space, tab, etc.) that can be used throughout the app
 * and passed to embedded mini-apps.
 * 
 * Use this provider at the Space level to provide context to all fidgets and
 * embedded mini-apps within that space.
 * 
 * @see useMiniAppContext - Hook to access the combined context
 * @see useMiniAppSdk - For direct SDK access (actions, wallet, events)
 */
export const MiniAppContextProvider: React.FC<MiniAppContextProviderProps> = ({
  children,
  spaceId,
  spaceHandle,
  tabName,
  spaceType,
  isEditable = false,
  ownerFid,
}) => {
  const { context: hostContext } = useMiniAppSdk();
  const currentFid = useCurrentFid();
  const isMobile = useIsMobile();
  
  // Build Nounspace context from props using useMemo (derived state, no need for useState + useEffect)
  const nounspaceContext = useMemo<NounspaceContext>(
    () => ({
      spaceId,
      spaceHandle,
      tabName,
      spaceType,
      isEditable,
      ownerFid,
    }),
    [spaceId, spaceHandle, tabName, spaceType, isEditable, ownerFid]
  );

  // Build fallback user context from our own sources when host doesn't provide it
  const fallbackUserContext = useMemo<Context.UserContext | undefined>(() => {
    if (hostContext?.user) return undefined; // Host provides user, no fallback needed
    if (!currentFid) return undefined; // No FID available
    
    return {
      fid: currentFid,
      // username, displayName, pfpUrl can be fetched later if needed
      // For now, just provide the FID
    };
  }, [hostContext?.user, currentFid]);

  // Build fallback client context from our own sources when host doesn't provide it
  const fallbackClientContext = useMemo<Context.ClientContext | undefined>(() => {
    if (hostContext?.client) return undefined; // Host provides client, no fallback needed
    if (!currentFid) return undefined; // Need FID for clientFid
    
    return {
      platformType: isMobile ? 'mobile' : 'web',
      clientFid: currentFid, // Use current user's FID as client FID
      added: false, // We don't know if the mini-app is added
    };
  }, [hostContext?.client, currentFid, isMobile]);

  // Combine contexts
  // Use host context when available, otherwise use fallback from our own sources
  const combinedContext = useMemo<CombinedContext | null>(() => {
    if (!nounspaceContext) return null;

    return {
      user: hostContext?.user || fallbackUserContext,
      location: hostContext?.location || undefined,
      client: hostContext?.client || fallbackClientContext,
      features: hostContext?.features,
      nounspace: nounspaceContext,
    };
  }, [hostContext, nounspaceContext, fallbackUserContext, fallbackClientContext]);

  // Transform context for embedded apps
  const transformForEmbedded = useCallback(
    (fidgetId?: string) => {
      if (!nounspaceContext) return null;
      // Use fallback context when hostContext is null (standalone mode)
      return ContextTransformer.transformForEmbedded(
        hostContext,
        nounspaceContext,
        fidgetId,
        fallbackUserContext,
        fallbackClientContext
      );
    },
    [hostContext, nounspaceContext, fallbackUserContext, fallbackClientContext]
  );

  // Get URL context
  const getUrlContext = useCallback(() => {
    return ContextTransformer.extractUrlContext(hostContext || null);
  }, [hostContext]);

  // Build URL with context
  const buildUrlWithContext = useCallback(
    (baseUrl: string, additionalNounspaceContext?: NounspaceContext) => {
      return ContextTransformer.buildUrlWithContext(
        baseUrl,
        hostContext || null,
        additionalNounspaceContext || nounspaceContext || undefined
      );
    },
    [hostContext, nounspaceContext]
  );

  // Parse URL context
  const parseUrlContext = useCallback((searchParams: URLSearchParams) => {
    return ContextTransformer.parseUrlContext(searchParams);
  }, []);

  const value: MiniAppContextValue = useMemo(
    () => ({
      combinedContext,
      hostContext: hostContext || null,
      nounspaceContext,
      transformForEmbedded,
      getUrlContext,
      buildUrlWithContext,
      parseUrlContext,
    }),
    [
      combinedContext,
      hostContext,
      nounspaceContext,
      transformForEmbedded,
      getUrlContext,
      buildUrlWithContext,
      parseUrlContext,
    ]
  );

  return (
    <MiniAppContextContext.Provider value={value}>
      {children}
    </MiniAppContextContext.Provider>
  );
};

/**
 * Hook to access the combined mini-app context
 * 
 * Provides access to:
 * - Combined context (host + Nounspace)
 * - Host context (from Farcaster client)
 * - Nounspace context (space, tab, etc.)
 * - Context transformation utilities
 */
export function useMiniAppContext() {
  return useContext(MiniAppContextContext);
}

