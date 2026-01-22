import type { Context } from "@farcaster/miniapp-core";

/**
 * Nounspace-specific context information
 */
export type NounspaceContext = {
  spaceId: string;
  spaceHandle?: string;
  tabName?: string;
  spaceType?: string;
  isEditable?: boolean;
  ownerFid?: number;
  fidgetId?: string;
};

/**
 * Transformed context for embedded mini-apps
 * Combines official SDK context with Nounspace-specific extensions
 */
export type TransformedMiniAppContext = {
  // Official SDK fields
  user: Context.MiniAppContext["user"];
  location: Context.MiniAppContext["location"] | null;
  client: Context.MiniAppContext["client"];
  features: Context.MiniAppContext["features"];

  // Custom Nounspace extensions (NOT in official SDK)
  nounspace?: {
    referrerDomain: string;
    spaceContext: {
      spaceId: string;
      spaceHandle?: string;
      tabName?: string;
      fidgetId?: string;
    };
  };
};

/**
 * URL parameters for context propagation
 */
export type URLContextParams = {
  from?: "cast_embed" | "cast_share" | "channel" | "notification" | "launcher" | "open_miniapp";
  castHash?: string;
  channelKey?: string;
  notificationId?: string;
  userFid?: string;
  referrerDomain?: string;
};

/**
 * Parsed context from URL parameters
 */
export type ParsedContext = {
  from: URLContextParams["from"];
  castHash: string | null;
  channelKey: string | null;
  notificationId: string | null;
  userFid: number | null;
  referrerDomain: string | null;
};

/**
 * Service for transforming context between layers in the mini-app hierarchy
 */
export class ContextTransformer {
  private static readonly NOUNSPACE_DOMAIN = "nounspace.app";
  private static readonly NOUNSPACE_NAME = "Nounspace";
  private static readonly NOUNSPACE_VERSION = "1.0.0";

  /**
   * Transform host context + Nounspace context into context for embedded mini-apps
   * 
   * Returns a custom context object that includes:
   * - Official SDK fields (user, location, client, features)
   * - Custom Nounspace extensions (space context, referrer info)
   * 
   * NOTE: Embedded mini-apps must access this via URL params, postMessage, or window.nounspaceContext.
   * They will NOT receive this through the official `sdk.context` API.
   */
  static transformForEmbedded(
    hostContext: Context.MiniAppContext,
    nounspaceContext: NounspaceContext,
    fidgetId?: string
  ): TransformedMiniAppContext {
    return {
      // Official SDK fields - pass through as-is
      user: hostContext.user,
      location: hostContext.location || null,
      client: hostContext.client,
      features: hostContext.features,

      // Custom Nounspace extensions (NOT in official SDK)
      nounspace: {
        referrerDomain: this.NOUNSPACE_DOMAIN,
        spaceContext: {
          spaceId: nounspaceContext.spaceId,
          spaceHandle: nounspaceContext.spaceHandle,
          tabName: nounspaceContext.tabName,
          fidgetId: fidgetId || nounspaceContext.fidgetId,
        },
      },
    };
  }

  /**
   * Extract relevant context for URL parameters
   */
  static extractUrlContext(
    context: Context.MiniAppContext | null
  ): URLContextParams {
    if (!context?.location) {
      return {};
    }
    const params: URLContextParams = {};
    switch (context.location.type) {
      case "cast_embed":
        params.from = "cast_embed";
        params.castHash = context.location.cast.hash;
        break;
      case "cast_share":
        params.from = "cast_share";
        params.castHash = context.location.cast.hash;
        break;
      case "channel":
        params.from = "channel";
        params.channelKey = context.location.channel.key;
        break;
      case "notification":
        params.from = "notification";
        params.notificationId = context.location.notification.notificationId;
        break;
      case "launcher":
        params.from = "launcher";
        break;
      case "open_miniapp":
        params.from = "open_miniapp";
        params.referrerDomain = context.location.referrerDomain;
        break;
    }
    if (context.user?.fid) {
      params.userFid = context.user.fid.toString();
    }
    return params;
  }

  /**
   * Build URL with context parameters
   */
  static buildUrlWithContext(
    baseUrl: string,
    context: Context.MiniAppContext | null,
    nounspaceContext?: NounspaceContext
  ): string {
    const url = new URL(baseUrl);
    const urlContext = this.extractUrlContext(context);

    // Add location context params
    if (urlContext.from) {
      url.searchParams.set("nounspace:from", urlContext.from);
    }
    if (urlContext.castHash) {
      url.searchParams.set("nounspace:castHash", urlContext.castHash);
    }
    if (urlContext.channelKey) {
      url.searchParams.set("nounspace:channelKey", urlContext.channelKey);
    }
    if (urlContext.notificationId) {
      url.searchParams.set("nounspace:notificationId", urlContext.notificationId);
    }
    if (urlContext.referrerDomain) {
      url.searchParams.set("nounspace:referrerDomain", urlContext.referrerDomain);
    }

    // Add user context
    if (urlContext.userFid) {
      url.searchParams.set("nounspace:userFid", urlContext.userFid);
    }

    // Add Nounspace context
    if (nounspaceContext) {
      if (nounspaceContext.spaceId) {
        url.searchParams.set("nounspace:spaceId", nounspaceContext.spaceId);
      }
      if (nounspaceContext.spaceHandle) {
        url.searchParams.set("nounspace:spaceHandle", nounspaceContext.spaceHandle);
      }
      if (nounspaceContext.tabName) {
        url.searchParams.set("nounspace:tabName", nounspaceContext.tabName);
      }
    }

    return url.toString();
  }

  /**
   * Parse context from URL parameters
   */
  static parseUrlContext(searchParams: URLSearchParams): ParsedContext {
    return {
      from: (searchParams.get("nounspace:from") || undefined) as ParsedContext["from"],
      castHash: searchParams.get("nounspace:castHash") || null,
      channelKey: searchParams.get("nounspace:channelKey") || null,
      notificationId: searchParams.get("nounspace:notificationId") || null,
      userFid: searchParams.get("nounspace:userFid")
        ? parseInt(searchParams.get("nounspace:userFid")!, 10)
        : null,
      referrerDomain: searchParams.get("nounspace:referrerDomain") || null,
    };
  }
}

