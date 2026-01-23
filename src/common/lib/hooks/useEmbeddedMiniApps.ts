"use client";

import { useEffect, useState } from "react";
import type { Context } from "@farcaster/miniapp-core";

export type EmbeddedMiniAppInfo = {
  id: string;
  url: string | null;
  srcDoc: string | null;
  contextProvided: Context.MiniAppContext | null;
  hasBootstrapDoc: boolean;
};

/**
 * Hook to track all embedded mini-apps
 * 
 * Scans the DOM for iframes with data-nounspace-context attribute.
 * 
 * Note: Context is provided via the official SDK API (sdk.context).
 * The SDK uses Comlink to communicate with the parent via postMessage.
 * We cannot directly extract the context that mini-apps receive, as it's
 * provided through the SDK's Comlink communication layer.
 */
export function useEmbeddedMiniApps() {
  const [embeddedApps, setEmbeddedApps] = useState<EmbeddedMiniAppInfo[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const scanForMiniApps = () => {
      const iframes = document.querySelectorAll<HTMLIFrameElement>(
        'iframe[data-nounspace-context]'
      );

      const apps: EmbeddedMiniAppInfo[] = Array.from(iframes).map((iframe, index) => {
        const id = iframe.id || `miniapp-${index}`;
        const url = iframe.src || null;
        const srcDoc = iframe.srcdoc || null;

        // Context is provided via the official SDK API (sdk.context)
        // The SDK uses Comlink to communicate with the parent via postMessage
        // We cannot directly extract context from the iframe
        const hasBootstrapDoc = !!srcDoc;

        // Normalize URL with error handling for malformed/relative URLs
        let normalizedUrl: string;
        if (url) {
          try {
            normalizedUrl = new URL(url).origin + new URL(url).pathname;
          } catch {
            normalizedUrl = "N/A (invalid URL)";
          }
        } else {
          normalizedUrl = "N/A (no src)";
        }

        return {
          id,
          url: normalizedUrl,
          srcDoc: srcDoc ? "Present" : null,
          contextProvided: null, // Cannot extract - context is provided via SDK API
          hasBootstrapDoc,
        };
      });

      setEmbeddedApps(apps);
    };

    // Initial scan
    scanForMiniApps();

    // Watch for new iframes being added
    const observer = new MutationObserver(() => {
      scanForMiniApps();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-nounspace-context", "src", "srcdoc"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return embeddedApps;
}

