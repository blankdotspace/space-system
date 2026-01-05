"use client";
import React, { ReactNode, Suspense, useEffect } from "react";
import Script from "next/script";
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

let mixpanelReady = false;

const initMixpanel = () => {
  if (typeof window === "undefined") return;
  if (!MIXPANEL_TOKEN) return;
  if (!window.mixpanel?.init) return;
  if (window.mixpanel.__isInitialized || mixpanelReady) return;

  window.mixpanel.init(MIXPANEL_TOKEN, {
    debug: process.env.NODE_ENV !== "production",
    track_pageview: true,
    persistence: "localStorage",
    autocapture: true,
    record_replay_sample_rate: 1,
  });
  window.mixpanel.__isInitialized = true;
  mixpanelReady = true;
  analytics.page();
};

const analyticsReady = () =>
  typeof window !== "undefined" &&
  window.mixpanel &&
  (window.mixpanel.__isInitialized || mixpanelReady);

export const analytics = {
  track: (eventName: AnalyticsEvent, properties?: Record<string, any>) => {
    if (!analyticsReady()) return;
    try {
      window.mixpanel?.track(eventName, properties);
    } catch (e) {
      console.error(e);
    }
  },
  identify: (id?: string, properties?: any) => {
    if (!analyticsReady() || !id) return;
    try {
      window.mixpanel?.identify(id);
      if (properties) {
        window.mixpanel?.people?.set?.(properties);
      }
    } catch (e) {
      console.error(e);
    }
  },
  page: () => {
    if (!analyticsReady()) return;
    try {
      window.mixpanel?.track("Page View", {
        page_url: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
      });
    } catch (e) {
      console.error(e);
    }
  },
};

export const AnalyticsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <Suspense fallback={null}>
      <Script
        id="mixpanel-loader"
        src="https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js"
        strategy="afterInteractive"
        onLoad={initMixpanel}
      />
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
    initMixpanel();
    analytics.page();
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
