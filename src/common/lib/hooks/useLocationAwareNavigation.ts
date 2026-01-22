"use client";

import { useCallback } from "react";
import { useMiniAppContext } from "@/common/providers/MiniAppContextProvider";

/**
 * Hook for location-aware navigation based on mini-app context
 * 
 * Provides functions to navigate based on how the mini-app was opened:
 * - cast_embed: Nounspace embedded in a cast (display containing cast)
 * - cast_share: User shared a cast (navigate to cast view)
 * - channel: Opened from channel (navigate to channel content)
 * - notification: Opened from notification (navigate to notification content)
 * - open_miniapp: Opened from another mini-app (track referrer)
 * - launcher: Opened from launcher (no special navigation)
 */
export const useLocationAwareNavigation = () => {
  const { combinedContext } = useMiniAppContext();

  /**
   * Navigate based on the current location context
   */
  const navigateFromContext = useCallback(() => {
    if (!combinedContext?.location) return;
    const location = combinedContext.location;
    
    switch (location.type) {
      case "cast_embed": {
        // NOTE: cast_embed means Nounspace is embedded IN a cast, not viewing a cast
        // The cast object contains full data (author, text, embeds, etc.)
        // We should display this cast, not navigate to it
        if (process.env.NODE_ENV === "development") {
          console.log("Nounspace embedded in cast:", {
            castHash: location.cast.hash,
            castAuthor: location.cast.author,
            castText: location.cast.text,
          });
        }
        // TODO: Display containing cast in space header or cast fidget (no API call needed!)
        // TODO: Provide "View full cast" link
        break;
      }
      case "cast_share": {
        // User shared a cast to Nounspace
        // Full cast data is available in context
        if (process.env.NODE_ENV === "development") {
          console.log("Cast shared to Nounspace:", {
            castHash: location.cast.hash,
            castAuthor: location.cast.author,
            castText: location.cast.text,
          });
        }
        // TODO: Navigate to cast view or pre-populate cast fidget
        break;
      }
      case "open_miniapp": {
        // Opened from another mini app
        if (process.env.NODE_ENV === "development") {
          console.log("Opened from mini app:", {
            referrerDomain: location.referrerDomain,
          });
        }
        // TODO: Track referrer for analytics or special handling
        break;
      }
      case "channel": {
        // Opened from a channel
        if (process.env.NODE_ENV === "development") {
          console.log("Opened from channel:", {
            channelKey: location.channel.key,
            channelName: location.channel.name,
          });
        }
        // TODO: Navigate to channel-specific content
        break;
      }
      case "notification": {
        // Opened from a notification
        if (process.env.NODE_ENV === "development") {
          console.log("Opened from notification:", {
            notificationId: location.notification.notificationId,
            title: location.notification.title,
            body: location.notification.body,
          });
        }
        // TODO: Navigate to notification-related content
        break;
      }
      case "launcher": {
        // Opened from launcher/home
        // No special navigation needed
        break;
      }
    }
  }, [combinedContext]);

  /**
   * Get navigation target for the current location context
   */
  const getNavigationTarget = useCallback((): string | null => {
    if (!combinedContext?.location) return null;
    const location = combinedContext.location;

    switch (location.type) {
      case "cast_embed":
        // Don't navigate - we're embedded in the cast
        return null;
      case "cast_share":
        // Could navigate to cast view
        return `/cast/${location.cast.hash}`;
      case "channel":
        // Could navigate to channel page
        return `/channel/${location.channel.key}`;
      case "notification":
        // Could navigate to notification detail
        return `/notification/${location.notification.notificationId}`;
      case "open_miniapp":
      case "launcher":
        return null;
    }
  }, [combinedContext]);

  /**
   * Get human-readable summary of location context
   */
  const getLocationSummary = useCallback((): string => {
    if (!combinedContext?.location) return "Unknown";
    const location = combinedContext.location;

    switch (location.type) {
      case "cast_embed":
        return `Embedded in cast by ${location.cast.author.displayName || location.cast.author.username || `FID ${location.cast.author.fid}`}`;
      case "cast_share":
        return `Cast shared by ${location.cast.author.displayName || location.cast.author.username || `FID ${location.cast.author.fid}`}`;
      case "channel":
        return `Opened from channel: ${location.channel.name}`;
      case "notification":
        return `Opened from notification: ${location.notification.title}`;
      case "open_miniapp":
        return `Opened from mini-app: ${location.referrerDomain}`;
      case "launcher":
        return "Opened from launcher";
    }
  }, [combinedContext]);

  return {
    navigateFromContext,
    getNavigationTarget,
    getLocationSummary,
  };
};

