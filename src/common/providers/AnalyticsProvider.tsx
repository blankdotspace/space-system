"use client";
import React, { ReactNode, useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCurrentSpaceIdentityPublicKey } from "@/common/lib/hooks/useCurrentSpaceIdentityPublicKey";
import { useCurrentFid } from "@/common/lib/hooks/useCurrentFid";
import { AnalyticsEvent } from "@/common/constants/analyticsEvents";

type Mixpanel = {
  init: (token: string, config?: Record<string, any>) => void;
  track: (eventName: string, properties?: Record<string, any>) => void;
  identify: (id: string) => void;
  register?: (properties: Record<string, any>) => void;
  people?: {
    set?: (properties: Record<string, any>) => void;
  };
};

declare global {
  interface Window {
    mixpanel?: Mixpanel & { __loaded?: boolean };
  }
}

const MIXPANEL_SCRIPT_ID = "mixpanel-browser";
const MIXPANEL_LIB_URL = "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let mixpanel: Mixpanel | null = null;
let mixpanelLoader: Promise<Mixpanel | null> | null = null;
const mixpanelQueue: Array<(mp: Mixpanel) => void> = [];

const flushMixpanelQueue = (instance: Mixpanel) => {
  while (mixpanelQueue.length) {
    const action = mixpanelQueue.shift();
    action?.(instance);
  }
};

const loadMixpanelScript = async (): Promise<Mixpanel | null> => {
  if (typeof window === "undefined") return null;
  if (window.mixpanel?.init) return window.mixpanel;

  if (document.getElementById(MIXPANEL_SCRIPT_ID)) {
    return new Promise((resolve) => {
      const existingScript = document.getElementById(MIXPANEL_SCRIPT_ID);
      existingScript?.addEventListener("load", () => resolve(window.mixpanel ?? null));
      existingScript?.addEventListener("error", () => resolve(null));
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.id = MIXPANEL_SCRIPT_ID;
    script.src = MIXPANEL_LIB_URL;
    script.async = true;
    script.onload = () => resolve(window.mixpanel ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
};

const loadMixpanel = async (token?: string) => {
  if (!token || typeof window === "undefined") return null;
  if (mixpanel) return mixpanel;
  if (mixpanelLoader) return mixpanelLoader;

  mixpanelLoader = loadMixpanelScript()
    .then((instance) => {
      if (!instance) return null;
      instance.init(token, {
        api_host: "https://api-js.mixpanel.com",
        track_pageview: false,
      });
      mixpanel = instance;
      flushMixpanelQueue(instance);
      return instance;
    })
    .catch((error) => {
      console.error(error);
      return null;
    });

  return mixpanelLoader;
};

const enqueueMixpanelAction = (action: (instance: Mixpanel) => void) => {
  if (!MIXPANEL_TOKEN) return;
  if (mixpanel) {
    action(mixpanel);
    return;
  }
  mixpanelQueue.push(action);
  void loadMixpanel(MIXPANEL_TOKEN);
};

export const analytics = {
  track: (eventName: AnalyticsEvent, properties?: Record<string, any>) => {
    enqueueMixpanelAction((instance) => {
      try {
        instance.track(eventName, properties);
      } catch (e) {
        console.error(e);
      }
    });
  },
  identify: (id?: string, properties?: any) => {
    if (!id) return;
    enqueueMixpanelAction((instance) => {
      try {
        instance.identify(id);
        if (properties) {
          instance.register?.(properties);
          instance.people?.set?.(properties);
        }
      } catch (e) {
        console.error(e);
      }
    });
  },
  page: () => {
    enqueueMixpanelAction((instance) => {
      try {
        instance.track("Page Viewed", {
          pathname: window.location.pathname,
          search: window.location.search,
        });
      } catch (e) {
        console.error(e);
      }
    });
  },
  initialize: () => {
    if (!MIXPANEL_TOKEN) return;
    void loadMixpanel(MIXPANEL_TOKEN);
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
    analytics.initialize();
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
