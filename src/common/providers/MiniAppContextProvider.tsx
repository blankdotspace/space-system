"use client";

import React, { createContext, useCallback, useContext, useMemo } from "react";
import type { Context } from "@farcaster/miniapp-core";
import { useMiniAppSdk } from "@/common/lib/hooks/useMiniAppSdk";
import { ContextTransformer, type NounspaceContext, type ParsedContext, type TransformedMiniAppContext, type URLContextParams } from "@/common/lib/services/contextTransformer";

/**
 * Combined context: host context + Nounspace context
 */
export type CombinedContext = {
  user: Context.MiniAppContext["user"];
  location: Context.MiniAppContext["location"] | undefined;
  client: Context.MiniAppContext["client"];
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

  // Combine contexts
  const combinedContext = useMemo<CombinedContext | null>(() => {
    if (!hostContext || !nounspaceContext) return null;

    return {
      user: hostContext.user,
      location: hostContext.location || undefined,
      client: hostContext.client,
      features: hostContext.features,
      nounspace: nounspaceContext,
    };
  }, [hostContext, nounspaceContext]);

  // Transform context for embedded apps
  const transformForEmbedded = useCallback(
    (fidgetId?: string) => {
      if (!hostContext || !nounspaceContext) return null;
      return ContextTransformer.transformForEmbedded(hostContext, nounspaceContext, fidgetId);
    },
    [hostContext, nounspaceContext]
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

