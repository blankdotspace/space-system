"use client";
import React, { ReactNode, Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCurrentSpaceIdentityPublicKey } from "@/common/lib/hooks/useCurrentSpaceIdentityPublicKey";
import { useCurrentFid } from "@/common/lib/hooks/useCurrentFid";
import { AnalyticsEvent } from "@/common/constants/analyticsEvents";

declare global {
  interface Window {
    mixpanel?: {
      init: (token: string, config?: Record<string, any>) => void;
      track: (eventName: string, properties?: Record<string, any>) => void;
      identify: (id: string) => void;
      people?: {
        set?: (properties: Record<string, any>) => void;
      };
      __isInitialized?: boolean;
    };
  }
}

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const MIXPANEL_SCRIPT_ID = "mixpanel-browser";
const MIXPANEL_SRC = "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";

let mixpanelReady = false;
let mixpanelLoader: Promise<typeof window.mixpanel | null> | null = null;
const queuedActions: Array<(mp: NonNullable<typeof window.mixpanel>) => void> = [];

const loadMixpanelScript = async (): Promise<typeof window.mixpanel | null> => {
  if (typeof window === "undefined") return null;
  if (window.mixpanel?.init) return window.mixpanel;

  if (mixpanelLoader) return mixpanelLoader;

  mixpanelLoader = new Promise((resolve) => {
    const existingScript = document.getElementById(MIXPANEL_SCRIPT_ID) as
      | HTMLScriptElement
      | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.mixpanel ?? null), {
        once: true,
      });
      existingScript.addEventListener("error", () => resolve(null), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = MIXPANEL_SCRIPT_ID;
    script.src = MIXPANEL_SRC;
    script.async = true;
    script.onload = () => resolve(window.mixpanel ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return mixpanelLoader;
};

const flushQueue = (mp: NonNullable<typeof window.mixpanel>) => {
  while (queuedActions.length) {
    const action = queuedActions.shift();
    action?.(mp);
  }
};

const initMixpanel = async () => {
  if (typeof window === "undefined") return;
  if (!MIXPANEL_TOKEN) return;
  if (mixpanelReady) return;

  const mp = await loadMixpanelScript();
  if (!mp?.init) return;
  if (mp.__isInitialized) {
    mixpanelReady = true;
    flushQueue(mp);
    return;
  }

  const loadedHandler = () => {
    mixpanelReady = true;
    mp.__isInitialized = true;
    flushQueue(mp);
    analytics.page();
  };

  try {
    mp.init(MIXPANEL_TOKEN, {
      debug: process.env.NODE_ENV !== "production",
      track_pageview: false,
      persistence: "localStorage",
      autocapture: true,
      record_replay_sample_rate: 1,
      loaded: loadedHandler,
    });
    if (mp.__isInitialized && !mixpanelReady) {
      loadedHandler();
    }
  } catch (error) {
    console.error(error);
  }
};

const enqueue = (action: (mp: NonNullable<typeof window.mixpanel>) => void) => {
  queuedActions.push(action);
  void initMixpanel();
};

export const analytics = {
  track: (eventName: AnalyticsEvent, properties?: Record<string, any>) => {
    enqueue((mp) => {
      try {
        mp.track(eventName, properties);
      } catch (e) {
        console.error(e);
      }
    });
  },
  identify: (id?: string, properties?: any) => {
    if (!id) return;
    enqueue((mp) => {
      try {
        mp.identify(id);
        if (properties) {
          mp.people?.set?.(properties);
        }
      } catch (e) {
        console.error(e);
      }
    });
  },
  page: () => {
    enqueue((mp) => {
      try {
        mp.track("Page View", {
          page_url: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
        });
      } catch (e) {
        console.error(e);
      }
    });
  },
};

export const AnalyticsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <Suspense fallback={null}>
      <AnalyticsProviderContent>{children}</AnalyticsProviderContent>
    </Suspense>
  );
};

const AnalyticsProviderContent: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const fid = useCurrentFid();
  const identityPublicKey = useCurrentSpaceIdentityPublicKey();

  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    void initMixpanel();
  }, []);

  useEffect(() => {
    if (identityPublicKey) {
      analytics.identify(identityPublicKey, { fid });
    }
  }, [identityPublicKey, fid]);

  useEffect(() => {
    analytics.page();
  }, [pathname, searchParams]);

  return children;
};

export default AnalyticsProvider;
