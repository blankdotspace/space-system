"use client";
import React, { ReactNode, Suspense, useEffect, useState } from "react";
import Script from "next/script";
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
    };
    doNotTrack?: string;
  }
  interface Navigator {
    msDoNotTrack?: string;
  }
}

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

/**
 * Checks if the user has enabled Do-Not-Track (DNT) in their browser.
 * Respects the DNT standard and various browser implementations.
 * @returns true if DNT is enabled, false otherwise
 */
const isDoNotTrackEnabled = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  // Standard DNT check (most browsers)
  // navigator.doNotTrack can be "1", "0", or null
  if (navigator.doNotTrack === "1") {
    return true;
  }

  // Some browsers use window.doNotTrack
  if (window.doNotTrack === "1") {
    return true;
  }

  // Legacy IE/Edge support
  if ((navigator as any).msDoNotTrack === "1") {
    return true;
  }

  return false;
};

const MIXPANEL_SNIPPET = MIXPANEL_TOKEN
  ? `(function (f, b) { if (!b.__SV) { var e, g, i, h; window.mixpanel = b; b._i = []; b.init = function (e, f, c) { function g(a, d) { var b = d.split("."); 2 == b.length && ((a = a[b[0]]), (d = b[1])); a[d] = function () { a.push([d].concat(Array.prototype.slice.call(arguments, 0))); }; } var a = b; "undefined" !== typeof c ? (a = b[c] = []) : (c = "mixpanel"); a.people = a.people || []; a.toString = function (a) { var d = "mixpanel"; "mixpanel" !== c && (d += "." + c); a || (d += " (stub)"); return d; }; a.people.toString = function () { return a.toString(1) + ".people (stub)"; }; i = "disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove start_session_recording stop_session_recording".split(" "); for (h = 0; h < i.length; h++) g(a, i[h]); var j = "set set_once union unset remove delete".split(" "); a.get_group = function () { function b(c) { d[c] = function () { call2_args = arguments; call2 = [c].concat(Array.prototype.slice.call(call2_args, 0)); a.push([e, call2]); }; } for ( var d = {}, e = ["get_group"].concat( Array.prototype.slice.call(arguments, 0)), c = 0; c < j.length; c++) b(j[c]); return d; }; b._i.push([e, f, c]); }; b.__SV = 1.2; e = f.createElement("script"); e.type = "text/javascript"; e.async = !0; e.src = "undefined" !== typeof MIXPANEL_CUSTOM_LIB_URL ? MIXPANEL_CUSTOM_LIB_URL : "file:" === f.location.protocol && "//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\\/\\//) ? "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js" : "//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js"; g = f.getElementsByTagName("script")[0]; g.parentNode.insertBefore(e, g); } })(document, window.mixpanel || []); mixpanel.init("${MIXPANEL_TOKEN}", {debug:${process.env.NODE_ENV !== "production"} ,track_pageview:true,persistence:"localStorage",autocapture:true,record_replay:true,record_replay_sample_rate:1,api_host:"https://api-js.mixpanel.com"}); if(mixpanel.start_session_recording){mixpanel.start_session_recording();}`
  : "";

const analyticsReady = () =>
  typeof window !== "undefined" && typeof window.mixpanel?.track === "function";

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
};

export const AnalyticsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [shouldLoadMixpanel, setShouldLoadMixpanel] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    // Check DNT status on client side only
    const dntEnabled = isDoNotTrackEnabled();
    setShouldLoadMixpanel(!dntEnabled);
  }, []);

  return (
    <Suspense fallback={null}>
      {MIXPANEL_SNIPPET && shouldLoadMixpanel === true ? (
        <Script id="mixpanel-snippet" strategy="afterInteractive">
          {MIXPANEL_SNIPPET}
        </Script>
      ) : null}
      <AnalyticsProviderContent>{children}</AnalyticsProviderContent>
    </Suspense>
  );
};

const AnalyticsProviderContent: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const fid = useCurrentFid();
  const identityPublicKey = useCurrentSpaceIdentityPublicKey();

  useEffect(() => {
    if (identityPublicKey) {
      analytics.identify(identityPublicKey, { fid });
    }
  }, [identityPublicKey, fid]);

  return children;
};

export default AnalyticsProvider;
