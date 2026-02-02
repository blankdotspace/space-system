import IFrameWidthSlider from "@/common/components/molecules/IframeScaleSlider";
import TextInput from "@/common/components/molecules/TextInput";
import HTMLInput from "@/common/components/molecules/HTMLInput";
import CropControls from "@/common/components/molecules/CropControls";
import SwitchButton from "@/common/components/molecules/SwitchButton";
import { FidgetArgs, FidgetModule, FidgetProperties, type FidgetSettingsStyle } from "@/common/fidgets";
import useSafeUrl from "@/common/lib/hooks/useSafeUrl";
import { useIsMobile } from "@/common/lib/hooks/useIsMobile";
import { debounce } from "lodash";
import { isValidHttpUrl } from "@/common/lib/utils/url";
import { defaultStyleFields, ErrorWrapper, transformUrl, WithMargin } from "@/fidgets/helpers";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { BsCloud, BsCloudFill } from "react-icons/bs";
import { useMiniApp } from "@/common/utils/useMiniApp";
import { MiniAppSdkContext } from "@/common/providers/MiniAppSdkProvider";
import { AuthenticatorContext } from "@/authenticators/AuthenticatorManager";
import type { AuthenticatorManager } from "@/authenticators/AuthenticatorManager";
import { setupComlinkHandler } from "@/common/lib/services/miniAppSdkHost";
import { useNounspaceMiniAppContext } from "@/common/lib/utils/createMiniAppContext";
import { useCurrentFid } from "@/common/lib/hooks/useCurrentFid";

const PROXY_BASE_URL = "https://proxy.blank.space";
const PROXY_SDK_URL = `${PROXY_BASE_URL}/nounspace-proxy.js`;

type NounspaceProxySession = {
  sessionUrl: string;
  rootUrl: string;
};

type NounspaceProxyClient = {
  createSession: (targetUrl: string) => Promise<NounspaceProxySession>;
};

type NounspaceProxySDK = {
  create: (options: { baseUrl: string }) => NounspaceProxyClient;
};

let proxySdkPromise: Promise<void> | null = null;

const loadNounspaceProxySdk = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Nounspace proxy SDK requires a browser environment."));
  }

  if ((window as any).NounspaceProxy) {
    return Promise.resolve();
  }

  if (proxySdkPromise) {
    return proxySdkPromise;
  }

  proxySdkPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${PROXY_SDK_URL}"]`,
    );

    const handleLoad = () => resolve();
    const handleError = () => {
      proxySdkPromise = null;
      reject(new Error("Failed to load Nounspace proxy SDK."));
    };

    if (existingScript) {
      if ((window as any).NounspaceProxy) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = PROXY_SDK_URL;
    script.async = true;
    script.onload = handleLoad;
    script.onerror = handleError;
    document.head.appendChild(script);
  });

  return proxySdkPromise;
};

const DEFAULT_SANDBOX_RULES =
  "allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox";

const FALLBACK_BASE_URL = "https://nounspace.app/";

const ensureSandboxRules = (sandbox?: string) => {
  const rules = new Set(
    DEFAULT_SANDBOX_RULES.split(/\s+/).filter((token) => token.length > 0),
  );

  if (sandbox) {
    sandbox
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .forEach((token) => rules.add(token));
  }

  rules.add("allow-same-origin");

  return Array.from(rules).join(" ");
};

const _sanitizeMiniAppNavigationTarget = (targetUrl: string) => {
  const fallback = "about:blank";

  if (!targetUrl) {
    return fallback;
  }

  try {
    const base =
      typeof window !== "undefined" && window.location
        ? window.location.href
        : FALLBACK_BASE_URL;
    const parsed = new URL(targetUrl, base);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch (error) {
    console.warn("Blocked unsupported mini app navigation target", error);
  }

  return fallback;
};

const resolveAllowedEmbedSrc = (src?: string | null): string | null => {
  if (!src) {
    return null;
  }

  try {
    const base =
      typeof window !== "undefined" && window.location
        ? window.location.href
        : FALLBACK_BASE_URL;
    const parsed = new URL(src, base);

    if (parsed.protocol === "https:") {
      return parsed.toString();
    }

    if (parsed.protocol === "about:" && parsed.href === "about:blank") {
      return parsed.href;
    }
  } catch (error) {
    console.warn("Rejected unsupported iframe src", error);
    return null;
  }

  return null;
};

type IframeAttributeMap = Record<string, string>;


const parseIframeAttributes = (html: string | null): IframeAttributeMap | null => {
  if (typeof window === "undefined" || !html) {
    return null;
  }

  try {
    const parser = new DOMParser();
    const document = parser.parseFromString(html, "text/html");
    const iframe = document.querySelector("iframe");
    if (!iframe) {
      return null;
    }

    const attributes: IframeAttributeMap = {};
    Array.from(iframe.attributes).forEach((attr) => {
      attributes[attr.name.toLowerCase()] = attr.value;
    });

    return attributes;
  } catch (error) {
    console.error("Failed to parse iframe embed code", error);
    return null;
  }
};

export type IFrameFidgetSettings = {
  url: string;
  embedScript?: string;
  size: number;
  cropOffsetX: number;
  cropOffsetY: number;
  isScrollable: boolean;
  loadViaProxy: boolean;
} & FidgetSettingsStyle;

const frameConfig: FidgetProperties = {
  fidgetName: "Web Embed",
  mobileFidgetName: "Site",
  icon: 0x1f310, // 🌐
  mobileIcon: <BsCloud size={24} />,
  mobileIconSelected: <BsCloudFill size={24} />,
  fields: [
    {
      fieldName: "url",
      displayName: "URL",
      displayNameHint: "Paste the URL of the webpage you'd like to embed",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "loadViaProxy",
      displayName: "Load via proxy",
      displayNameHint:
        "May not work for all sites, but if a site isn't loading correctly, try loading via proxy. If this doesn't work, you'll need to contact the site owner to request domain whitelisting.",
      default: false,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <SwitchButton {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "embedScript",
      displayName: "Embed Script",
      displayNameHint: "Paste an iframe embed code instead of a URL",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <HTMLInput {...props} />
        </WithMargin>
      ),
      group: "code",
    },
    {
      fieldName: "size",
      displayName: "Zoom Level",
      displayNameHint: "Drag the slider to adjust the zoom level of the iframe content",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <IFrameWidthSlider {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "cropOffsetX",
      displayName: "Horizontal Position",
      displayNameHint: "Adjust the horizontal position of the iframe content",
      required: false,
      default: 0,
      inputSelector: (props) => (
        <WithMargin>
          <CropControls offsetX={props.value || 0} onOffsetXChange={props.onChange} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "cropOffsetY",
      displayName: "Vertical Position",
      displayNameHint: "Adjust the vertical position of the iframe content",
      required: false,
      default: 0,
      inputSelector: (props) => (
        <WithMargin>
          <CropControls offsetY={props.value || 0} onOffsetYChange={props.onChange} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "isScrollable",
      displayName: "Allow Scrolling",
      displayNameHint: "Enable or disable scrolling within the iframe",
      required: false,
      default: false,
      inputSelector: (props) => (
        <WithMargin>
          <CropControls isScrollable={props.value || false} onScrollableChange={props.onChange} />
        </WithMargin>
      ),
      group: "settings",
    },
    ...defaultStyleFields,
  ],
  size: {
    minHeight: 2,
    maxHeight: 36,
    minWidth: 2,
    maxWidth: 36,
  },
};

// Cache for iframe embed information
const embedCache = new Map<
  string,
  {
    data: {
      directEmbed: boolean;
      url?: string;
      iframelyHtml?: string | null;
    };
    timestamp: number;
    expiresAt: number;
  }
>();

// Cache duration: 1 hour
const CACHE_DURATION = 60 * 60 * 1000;

const IFrame: React.FC<FidgetArgs<IFrameFidgetSettings>> = ({
  settings: {
    url,
    embedScript,
    size = 1,
    cropOffsetX = 0,
    cropOffsetY = 0,
    isScrollable = false,
    loadViaProxy = false,
  },
}) => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [embedInfo, setEmbedInfo] = useState<{
    directEmbed: boolean;
    url?: string;
    iframelyHtml?: string | null;
  } | null>(null);

  const [proxyClient, setProxyClient] = useState<NounspaceProxyClient | null>(null);
  const [proxySession, setProxySession] = useState<NounspaceProxySession | null>(null);
  const [proxyError, setProxyError] = useState<string | null>(null);
  const [proxyLoading, setProxyLoading] = useState<boolean>(false);

  const [debouncedUrl, setDebouncedUrl] = useState(url);

  const debouncedSetUrl = useMemo(() => debounce((value: string) => setDebouncedUrl(value), 300), []);

  const { isInMiniApp } = useMiniApp();
  const isMiniAppEnvironment = isInMiniApp === true;

  // Get real SDK instance for Quick Auth (if we're embedded in a Farcaster client)
  const sdkContextState = useContext(MiniAppSdkContext);
  const rawSdkInstance = sdkContextState?.sdk;
  const sdkContext = sdkContextState?.context;
  
  // Get authenticator manager from context (may be null if not inside AuthenticatorManagerProvider)
  const authenticatorManager: AuthenticatorManager | null = useContext(AuthenticatorContext);
  
  // Get current user FID from our own data
  const userFid = useCurrentFid();
  
  // Create context from our own data - WE ARE THE FARCASTER CLIENT
  // Always call the hook (Rules of Hooks), then use SDK context if available
  // (we're embedded), otherwise use our created context
  const nounspaceContext = useNounspaceMiniAppContext();
  const contextForEmbedded = sdkContext || nounspaceContext;

  // Calculate transformedUrl early so it can be used in useCallback dependencies
  const isValid = isValidHttpUrl(debouncedUrl);
  const sanitizedUrl = useSafeUrl(debouncedUrl);
  const transformedUrl = transformUrl(sanitizedUrl || "");
  const shouldUseProxy = loadViaProxy && embedInfo?.directEmbed === true;
  const finalIframeSrc =
    shouldUseProxy && proxySession && !proxyLoading && !proxyError
      ? proxySession.sessionUrl
      : transformedUrl;

  // Track cleanup functions for Comlink handlers
  const comlinkCleanups = useRef<Map<HTMLIFrameElement, () => void>>(new Map());
  
  // Callback to set up Comlink handler when iframe is mounted
  const setupIframeComlink = useCallback((iframe: HTMLIFrameElement | null) => {
    if (!iframe || typeof window === 'undefined') {
      return;
    }
    
    // Always set up handler, even with fallback context
    // This allows embedded apps to detect they're in a mini-app environment

    // Clean up existing handler for this iframe if any
    const existingCleanup = comlinkCleanups.current.get(iframe);
    if (existingCleanup) {
      existingCleanup();
      comlinkCleanups.current.delete(iframe);
    }

    // Get ethProvider from window
    const ethProvider = (window as any).__nounspaceMiniAppEthProvider;
    
    // Determine target origin - must be a valid URL origin for security
    // Never use '*' as it's unsafe and allows any origin to receive messages
    let targetOrigin: string | undefined;
    const candidates = [
      iframe.getAttribute("src"),
      finalIframeSrc,
      transformedUrl,
      iframe.src,
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      try {
        const parsed = new URL(candidate, window.location.href);
        if (parsed.origin && parsed.origin !== "null") {
          targetOrigin = parsed.origin;
          break;
        }
      } catch (error) {
        console.warn("Skipping invalid iframe origin candidate:", candidate, error);
      }
    }
    
    if (!targetOrigin) {
      console.error('No valid origin available for iframe. Cannot set up Comlink handler safely. transformedUrl:', transformedUrl, 'iframe.src:', iframe.src);
      return;
    }
    
    // Set up Comlink handler for this iframe
    // Wait a bit for iframe to be ready (especially if using srcDoc)
    const setupHandler = () => {
      try {
        // Host options - the SDK handles Quick Auth internally by calling signIn
        const hostOptions = {
          // Use authenticator manager for signing
          authenticatorManager: authenticatorManager || undefined,
          // User FID from our own data (we create the context)
          userFid: userFid || contextForEmbedded?.user?.fid,
        };

        const cleanup = setupComlinkHandler(
          iframe,
          contextForEmbedded,
          ethProvider,
          targetOrigin,
          hostOptions
        );
        comlinkCleanups.current.set(iframe, cleanup);
      } catch (error) {
        console.error('Failed to set up Comlink handler for iframe:', error);
      }
    };
    
    // If iframe has contentWindow, set up immediately
    // Otherwise wait for load event
    if (iframe.contentWindow) {
      setupHandler();
    } else {
      iframe.addEventListener('load', setupHandler, { once: true });
    }
  }, [contextForEmbedded, finalIframeSrc, transformedUrl, rawSdkInstance, authenticatorManager]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      comlinkCleanups.current.forEach((cleanup) => {
        cleanup();
      });
      comlinkCleanups.current.clear();
    };
  }, []);

  const [sanitizedEmbedAttributes, setSanitizedEmbedAttributes] =
    useState<IframeAttributeMap | null>(null);
  const [iframelyEmbedAttributes, setIframelyEmbedAttributes] =
    useState<IframeAttributeMap | null>(null);

  const sanitizedEmbedScript = useMemo(() => {
    if (!embedScript) return null;
    const clean = DOMPurify.sanitize(embedScript, {
      ALLOWED_TAGS: ["iframe"],
      ALLOWED_ATTR: [
        "src",
        "width",
        "height",
        "frameborder",
        "allow",
        "allowfullscreen",
        "loading",
        "referrerpolicy",
      ],
    });
    return clean.trim() ? clean : null;
  }, [embedScript]);

  const sanitizedEmbedMarkup = useMemo(
    () =>
      sanitizedEmbedScript
        ? ({ __html: sanitizedEmbedScript } as { __html: string })
        : undefined,
    [sanitizedEmbedScript],
  );

  useEffect(() => {
    debouncedSetUrl(url);
    return () => {
      debouncedSetUrl.cancel();
    };
  }, [url, debouncedSetUrl]);

  useEffect(() => {
    if (!sanitizedEmbedScript) {
      setSanitizedEmbedAttributes(null);
      return;
    }

    setSanitizedEmbedAttributes(parseIframeAttributes(sanitizedEmbedScript));
  }, [sanitizedEmbedScript]);

  useEffect(() => {
    if (!embedInfo?.iframelyHtml) {
      setIframelyEmbedAttributes(null);
      return;
    }

    setIframelyEmbedAttributes(parseIframeAttributes(embedInfo.iframelyHtml));
  }, [embedInfo?.iframelyHtml]);

  // Context is provided via Comlink - no need to serialize for bootstrap

  const iframelyMiniAppConfig = useMemo(() => {
    if (!isMiniAppEnvironment || !iframelyEmbedAttributes?.src) {
      return undefined;
    }

    if (!isValidHttpUrl(iframelyEmbedAttributes.src)) {
      return null;
    }

    try {
      const safeSrc = new URL(iframelyEmbedAttributes.src).toString();
      return {
        safeSrc: safeSrc,
        allowFullScreen: "allowfullscreen" in iframelyEmbedAttributes,
        sandboxRules: ensureSandboxRules(iframelyEmbedAttributes.sandbox),
        widthAttr: iframelyEmbedAttributes.width,
        heightAttr: iframelyEmbedAttributes.height,
      };
    } catch (error) {
      console.warn("Rejected unsupported IFramely iframe src", error);
      return null;
    }
  }, [isMiniAppEnvironment, iframelyEmbedAttributes]);

  // Scale value is set from size prop
  const _scaleValue = size;

  const iframelyEmbedMarkup = useMemo(
    () =>
      embedInfo?.iframelyHtml
        ? ({ __html: embedInfo.iframelyHtml } as { __html: string })
        : undefined,
    [embedInfo?.iframelyHtml],
  );


  useEffect(() => {
    if (sanitizedEmbedScript) return;
    async function checkEmbedInfo() {
      if (!isValid || !sanitizedUrl) return;

      // Check cache first
      const cached = embedCache.get(sanitizedUrl);
      const now = Date.now();

      if (cached && now < cached.expiresAt) {
        // Use cached data
        setEmbedInfo(cached.data);
        return;
      }

      // Clear expired cache entry
      if (cached && now >= cached.expiresAt) {
        embedCache.delete(sanitizedUrl);
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/iframely?url=${encodeURIComponent(sanitizedUrl)}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to get embed information");
        }

        const data = await response.json();

        // Cache the result
        embedCache.set(sanitizedUrl, {
          data,
          timestamp: now,
          expiresAt: now + CACHE_DURATION,
        });

        setEmbedInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        console.error("Error fetching embed info:", err);
      } finally {
        setLoading(false);
      }
    }

    checkEmbedInfo();
  }, [sanitizedUrl, isValid, sanitizedEmbedScript]);

  useEffect(() => {
    let isActive = true;

    if (!shouldUseProxy) {
      setProxyClient(null);
      setProxySession(null);
      setProxyError(null);
      setProxyLoading(false);
      return;
    }

    setProxyLoading(true);
    setProxyError(null);

    loadNounspaceProxySdk()
      .then(() => {
        if (!isActive) return;
        const sdk = (window as any).NounspaceProxy as NounspaceProxySDK | undefined;
        if (!sdk?.create) {
          throw new Error("Nounspace proxy SDK is unavailable.");
        }
        setProxyClient(sdk.create({ baseUrl: PROXY_BASE_URL }));
      })
      .catch((err) => {
        if (!isActive) return;
        const message =
          err instanceof Error ? err.message : "Failed to initialize proxy client.";
        setProxyError(message);
        setProxyClient(null);
        console.error("Failed to initialize proxy client:", err);
      })
      .finally(() => {
        if (!isActive) return;
        setProxyLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [shouldUseProxy]);

  useEffect(() => {
    let isActive = true;

    if (!shouldUseProxy || !proxyClient || !transformedUrl) {
      setProxySession(null);
      return;
    }

    setProxySession(null);
    setProxyLoading(true);
    setProxyError(null);

    proxyClient
      .createSession(transformedUrl)
      .then((session) => {
        if (!isActive) return;
        setProxySession(session);
      })
      .catch((err) => {
        if (!isActive) return;
        const message =
          err instanceof Error ? err.message : "Failed to create proxy session.";
        setProxyError(message);
        setProxySession(null);
        console.error("Proxy session error:", err);
      })
      .finally(() => {
        if (!isActive) return;
        setProxyLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [shouldUseProxy, proxyClient, transformedUrl]);

  const sanitizedEmbedSrc = sanitizedEmbedAttributes?.src ?? null;
  const resolvedSanitizedMiniAppSrc = useMemo(() => {
    if (!isMiniAppEnvironment || !sanitizedEmbedSrc) {
      return undefined;
    }

    return resolveAllowedEmbedSrc(sanitizedEmbedSrc);
  }, [isMiniAppEnvironment, sanitizedEmbedSrc]);


  if (sanitizedEmbedScript) {
    if (
      isMiniAppEnvironment &&
      sanitizedEmbedSrc &&
      resolvedSanitizedMiniAppSrc === null
    ) {
      return (
        <ErrorWrapper
          icon="🔒"
          message="This embed source is not allowed in the mini app."
        />
      );
    }

    if (
      isMiniAppEnvironment &&
      sanitizedEmbedSrc &&
      resolvedSanitizedMiniAppSrc &&
      sanitizedEmbedAttributes
    ) {
      const allowFullScreen = "allowfullscreen" in sanitizedEmbedAttributes;
      const sandboxRules = ensureSandboxRules(
        sanitizedEmbedAttributes.sandbox,
      );

      const widthAttr = sanitizedEmbedAttributes.width;
      const heightAttr = sanitizedEmbedAttributes.height;

      return (
        <div style={{ overflow: "hidden", width: "100%", height: "100%" }}>
          <iframe
            ref={setupIframeComlink}
            data-nounspace-context
            key={`miniapp-sanitized-${resolvedSanitizedMiniAppSrc}`}
            src={resolvedSanitizedMiniAppSrc}
            title={sanitizedEmbedAttributes.title || "IFrame Fidget"}
            sandbox={sandboxRules}
            allow={sanitizedEmbedAttributes.allow}
            referrerPolicy={
              sanitizedEmbedAttributes.referrerpolicy as React.IframeHTMLAttributes<HTMLIFrameElement>["referrerPolicy"]
            }
            loading={
              sanitizedEmbedAttributes.loading as React.IframeHTMLAttributes<HTMLIFrameElement>["loading"]
            }
            frameBorder={sanitizedEmbedAttributes.frameborder}
            allowFullScreen={allowFullScreen}
            width={widthAttr}
            height={heightAttr}
            style={{
              border: "0",
              width: widthAttr ? undefined : "100%",
              height: heightAttr ? undefined : "100%",
              overflow: isScrollable ? "auto" : "hidden",
            }}
            className="size-full"
          />
        </div>
      );
    }

    return (
      <div
        dangerouslySetInnerHTML={sanitizedEmbedMarkup}
        style={{ overflow: "hidden", width: "100%", height: "100%" }}
      />
    );
  }

  if (!url) {
    return (
      <ErrorWrapper
        icon="➕"
        message="Provide a URL or embed script to display here."
      />
    );
  }

  if (!isValid) {
    return <ErrorWrapper icon="❌" message={`This URL is invalid (${url}).`} />;
  }

  if (loading) {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "16px",
          gap: "12px",
        }}
      >
        {/* Header skeleton */}
        <div
          style={{
            height: "24px",
            width: "60%",
            backgroundColor: "#e5e7eb",
            borderRadius: "4px",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />

        {/* Content skeleton squares */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "12px",
            flex: 1,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                height: "80px",
                backgroundColor: "#f3f4f6",
                borderRadius: "8px",
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {/* Bottom content skeleton */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginTop: "8px",
          }}
        >
          <div
            style={{
              height: "16px",
              width: "100%",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
          <div
            style={{
              height: "16px",
              width: "80%",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: .5;
            }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return <ErrorWrapper icon="⚠️" message={error} />;
  }

  if (!embedInfo) {
    return <ErrorWrapper icon="🔍" message="Checking embeddability..." />;
  }

  if (embedInfo.directEmbed && transformedUrl) {
    // Context is provided via Comlink - use direct iframe src
    return (
      <div
        style={{
          overflow: "hidden",
          width: "100%",
          height: isMobile ? "100vh" : "100%",
          position: "relative",
        }}
      >
        {isMobile ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              transform: `translate(${cropOffsetX}%, ${cropOffsetY * 1.6}%)`,
            }}
          >
            <iframe
              ref={setupIframeComlink}
              data-nounspace-context
              key={`iframe-miniapp-${transformedUrl}`}
              src={finalIframeSrc}
              title="IFrame Fidget"
              sandbox={DEFAULT_SANDBOX_RULES}
              style={{
                width: "100%",
                height: "100%",
                overflow: isScrollable ? "auto" : "hidden",
              }}
              className="size-full"
            />
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${size})`,
              transformOrigin: "0 0",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${100 / size}%`,
                height: `${100 / size}vh`,
                transform: `translate(${cropOffsetX}%, ${cropOffsetY * 1.8}%)`,
              }}
            >
              <iframe
                ref={setupIframeComlink}
                data-nounspace-context
                key={`iframe-miniapp-${transformedUrl}`}
                src={finalIframeSrc}
                title="IFrame Fidget"
                sandbox={DEFAULT_SANDBOX_RULES}
                style={{
                  width: "100%",
                  height: "100%",
                  overflow: isScrollable ? "auto" : "hidden",
                }}
                className="size-full"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  const iframelyEmbedSrc = iframelyEmbedAttributes?.src ?? null;

  if (!embedInfo.directEmbed && embedInfo.iframelyHtml) {
    if (isMiniAppEnvironment && iframelyEmbedSrc && iframelyEmbedAttributes) {
      if (iframelyMiniAppConfig === null) {
        return (
          <div
            dangerouslySetInnerHTML={iframelyEmbedMarkup}
            style={{ overflow: "hidden", width: "100%", height: "100%" }}
          />
        );
      }

      if (iframelyMiniAppConfig) {
        const {
          safeSrc,
          allowFullScreen,
          sandboxRules,
          widthAttr,
          heightAttr,
        } = iframelyMiniAppConfig;

        return (
          <div style={{ overflow: "hidden", width: "100%", height: "100%" }}>
            <iframe
              ref={setupIframeComlink}
              data-nounspace-context
              key={`miniapp-iframely-${safeSrc}`}
              src={safeSrc}
              title={iframelyEmbedAttributes.title || "IFrame Fidget"}
              sandbox={sandboxRules}
              allow={iframelyEmbedAttributes.allow}
              referrerPolicy={
                iframelyEmbedAttributes.referrerpolicy as React.IframeHTMLAttributes<HTMLIFrameElement>["referrerPolicy"]
              }
              loading={
                iframelyEmbedAttributes.loading as React.IframeHTMLAttributes<HTMLIFrameElement>["loading"]
              }
              frameBorder={iframelyEmbedAttributes.frameborder}
              allowFullScreen={allowFullScreen}
              width={widthAttr}
              height={heightAttr}
              style={{
                border: "0",
                width: widthAttr ? undefined : "100%",
                height: heightAttr ? undefined : "100%",
                overflow: isScrollable ? "auto" : "hidden",
              }}
              className="size-full"
            />
          </div>
        );
      }
    }

    return (
      <div
        dangerouslySetInnerHTML={iframelyEmbedMarkup}
        style={{ overflow: "hidden", width: "100%", height: "100%" }}
      />
    );
  }

  return <ErrorWrapper icon="🔒" message={`This URL cannot be displayed due to security restrictions (${url}).`} />;
};

export default {
  fidget: IFrame,
  properties: frameConfig,
} as FidgetModule<FidgetArgs<IFrameFidgetSettings>>;
