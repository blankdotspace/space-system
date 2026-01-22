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
 * Matches the official SDK MiniAppContext type exactly - no custom extensions
 */
export type TransformedMiniAppContext = Context.MiniAppContext;

/**
 * URL parameters type (for backward compatibility - not used for context)
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
   * Returns a context object matching the official SDK MiniAppContext type.
   * 
   * We support both approaches for providing context:
   * 1. When Nounspace is embedded in a Farcaster client: The client provides the SDK, we use sdk.context
   * 2. When we embed mini-apps in iframes: We inject the SDK via window.__farcasterMiniappSdk
   *    so embedded mini-apps can access sdk.context (official SDK API)
   */
  static transformForEmbedded(
    hostContext: Context.MiniAppContext | null,
    nounspaceContext: NounspaceContext,
    fidgetId?: string,
    fallbackUser?: Context.UserContext,
    fallbackClient?: Context.ClientContext
  ): TransformedMiniAppContext | null {
    // Need at least user context (from host or fallback) to create transformed context
    const user = hostContext?.user || fallbackUser;
    if (!user) {
      return null;
    }

    // Client context is required by SDK - must have either host or fallback
    const client = hostContext?.client || fallbackClient;
    if (!client) {
      // Cannot create context without client (required by SDK)
      return null;
    }

    return {
      // Official SDK fields - use host context if available, otherwise fallback
      // All fields match the official SDK types from @farcaster/miniapp-core
      user: user, // Required: UserContext with fid
      location: hostContext?.location || null, // Optional in SDK
      client: client, // Required: ClientContext with clientFid and added
      features: hostContext?.features, // Optional in SDK

      // NOTE: Custom Nounspace extensions are not part of the official SDK.
      // The official SDK only supports: user, location, client, features.
      // We do not add custom fields to the context object.
    };
  }

  /**
   * Extract relevant context for URL parameters
   * 
   * NOTE: This method is kept for backward compatibility but returns empty object.
   * The official SDK does not use URL parameters for context.
   */
  static extractUrlContext(
    context: Context.MiniAppContext | null
  ): URLContextParams {
    // Official SDK does not use URL parameters for context
    // Return empty object for backward compatibility
    return {};
  }

  /**
   * Build URL with context parameters
   * 
   * NOTE: The official Farcaster mini-app SDK does NOT use URL parameters for context.
   * Context is provided exclusively via the SDK API (sdk.context).
   * The SDK uses Comlink to communicate with the parent via postMessage.
   * This method returns the base URL unchanged, as per official SDK specification.
   */
  static buildUrlWithContext(
    baseUrl: string,
    context: Context.MiniAppContext | null,
    nounspaceContext?: NounspaceContext
  ): string {
    // Official SDK does not specify URL parameters for context
    // Context is provided exclusively via the SDK API (sdk.context via Comlink)
    return baseUrl;
  }

  /**
   * Parse context from URL parameters
   * 
   * NOTE: The official Farcaster mini-app SDK does NOT use URL parameters for context.
   * Context is provided exclusively via the SDK API (sdk.context).
   * The SDK uses Comlink to communicate with the parent via postMessage.
   * This method returns empty/null values as URL parameters are not used for context.
   */
  static parseUrlContext(searchParams: URLSearchParams): ParsedContext {
    // Official SDK does not specify URL parameters for context
    // All context should be accessed via the SDK API (sdk.context via Comlink)
    return {
      from: undefined,
      castHash: null,
      channelKey: null,
      notificationId: null,
      userFid: null,
      referrerDomain: null,
    };
  }
}

