import CropControls from "@/common/components/molecules/CropControls";
import HTMLInput from "@/common/components/molecules/HTMLInput";
import IFrameWidthSlider from "@/common/components/molecules/IframeScaleSlider";
import TextInput from "@/common/components/molecules/TextInput";
import { FidgetArgs, FidgetModule, FidgetProperties, type FidgetSettingsStyle } from "@/common/fidgets";
import { useCurrentFid } from "@/common/lib/hooks/useCurrentFid";
import { useIsMobile } from "@/common/lib/hooks/useIsMobile";
import { useMiniAppSdk } from "@/common/lib/hooks/useMiniAppSdk";
import useSafeUrl from "@/common/lib/hooks/useSafeUrl";
import { isValidHttpUrl } from "@/common/lib/utils/url";
import { MINI_APP_PROVIDER_METADATA } from "@/common/providers/MiniAppSdkProvider";
import { useMiniApp } from "@/common/utils/useMiniApp";
import { ErrorWrapper, WithMargin, defaultStyleFields, transformUrl } from "@/fidgets/helpers";
import DOMPurify from "isomorphic-dompurify";
import { debounce } from "lodash";
import React, { useEffect, useMemo, useState } from "react";
import { BsCloud, BsCloudFill } from "react-icons/bs";

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

const sanitizeMiniAppNavigationTarget = (targetUrl: string) => {
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

const createMiniAppBootstrapSrcDoc = (
  targetUrl: string,
  fid?: number | null,
  userContext?: any
) => {
  const safeTargetUrl = sanitizeMiniAppNavigationTarget(targetUrl);
  const iconPath = MINI_APP_PROVIDER_METADATA.iconPath;
  
  // Add FID to URL if provided (for optimistic sign-in support)
  let finalUrl = safeTargetUrl;
  if (fid && safeTargetUrl && safeTargetUrl !== "about:blank") {
    try {
      const url = new URL(safeTargetUrl);
      // Only add fid if not already present
      if (!url.searchParams.has('fid')) {
        url.searchParams.set('fid', fid.toString());
      }
      finalUrl = url.toString();
    } catch (e) {
      // If URL parsing fails, use original
      finalUrl = safeTargetUrl;
    }
  }

  const providerInfoScript = `
        var providerInfo = parentWindow.__nounspaceMiniAppProviderInfo;
        if (!providerInfo) {
          var icon;
          try {
            icon = new URL(${JSON.stringify(iconPath)}, (window.parent && window.parent.location ? window.parent.location.origin : window.location.origin)).toString();
          } catch (err) {
            icon = ${JSON.stringify(iconPath)};
          }
          providerInfo = {
            uuid: ${JSON.stringify(MINI_APP_PROVIDER_METADATA.uuid)},
            name: ${JSON.stringify(MINI_APP_PROVIDER_METADATA.name)},
            icon: icon,
            rdns: ${JSON.stringify(MINI_APP_PROVIDER_METADATA.rdns)}
          };
        }
      `;

  // Script to expose user context via postMessage
  const userContextScript = userContext || fid
    ? `
        // Expose user context for mini-apps that support optimistic sign-in
        var userContext = {
          ${fid ? `fid: ${fid},` : ''}
          ${userContext ? `context: ${JSON.stringify(userContext)},` : ''}
          timestamp: Date.now()
        };
        
        // Make context available on window for direct access
        window.__farcasterUserContext = userContext;
        
        // Also expose via postMessage for cross-origin communication
        if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage({
              type: 'farcaster:userContext',
              data: userContext
            }, '*');
          } catch (e) {
            console.warn('Failed to post user context:', e);
          }
        }
      `
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><script>(function(){
      try {
        var parentWindow = window.parent;
        if (!parentWindow) {
          return;
        }
        
        // Setup Ethereum provider for wallet interactions
        var provider = parentWindow.__nounspaceMiniAppEthProvider;
        if (provider) {
          // Make provider available globally
          window.ethereum = provider;
          
          ${providerInfoScript}
          
          // EIP-6963 provider announcement for wallet discovery
          var announce = function() {
            try {
              var detail = Object.freeze({
                info: Object.freeze(providerInfo),
                provider: provider
              });
              window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: detail }));
            } catch (e) {
              console.warn("Failed to announce provider:", e);
            }
          };
          
          // Initialize Ethereum provider
          window.dispatchEvent(new Event("ethereum#initialized"));
          announce();
          
          // Listen for provider requests
          window.addEventListener("eip6963:requestProvider", announce);
          
          // Also listen for legacy ethereum requests
          window.addEventListener("ethereum#requestProvider", announce);
        }
        
        ${userContextScript}
        
        // Expose helper function for mini-apps to check if wallet is available
        window.__nounspaceHasWallet = !!provider;
        
      } catch (err) {
        console.error("Mini app provider bootstrap failed", err);
      }
      
      // Navigate to target URL after setup
      setTimeout(function(){
        var target = ${JSON.stringify(finalUrl)};
        if (target && target !== "about:blank") {
          window.location.replace(target);
        }
      }, 0);
    })();</script></body></html>`;
};

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
    isScrollable = false
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

  const [debouncedUrl, setDebouncedUrl] = useState(url);

  const debouncedSetUrl = useMemo(() => debounce((value: string) => setDebouncedUrl(value), 300), []);

  const { isInMiniApp } = useMiniApp();
  const isMiniAppEnvironment = isInMiniApp === true;
  
  // Get FID and user context for mini-apps
  const currentFid = useCurrentFid();
  const { userContext, context: miniAppContext } = useMiniAppSdk();
  
  // Get FID from SDK context if available (when running as mini-app), otherwise use current FID
  // The SDK context provides the FID when the app is running inside a Farcaster client
  const fidForMiniApp = miniAppContext?.user?.fid || currentFid;
  
  // Prepare user context data for passing to mini-apps
  // Only include fields that are available in the UserContext type
  const userContextData = userContext ? {
    fid: userContext.fid,
    ...(userContext.username && { username: userContext.username }),
    ...(userContext.displayName && { displayName: userContext.displayName }),
  } : (fidForMiniApp ? { fid: fidForMiniApp } : null);

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
        safeSrc,
        bootstrapDoc: createMiniAppBootstrapSrcDoc(safeSrc, fidForMiniApp, userContextData),
        allowFullScreen: "allowfullscreen" in iframelyEmbedAttributes,
        sandboxRules: ensureSandboxRules(iframelyEmbedAttributes.sandbox),
        widthAttr: iframelyEmbedAttributes.width,
        heightAttr: iframelyEmbedAttributes.height,
      };
    } catch (error) {
      console.warn("Rejected unsupported IFramely iframe src", error);
      return null;
    }
  }, [isMiniAppEnvironment, iframelyEmbedAttributes, fidForMiniApp, userContextData]);

  const isValid = isValidHttpUrl(debouncedUrl);
  const sanitizedUrl = useSafeUrl(debouncedUrl);
  const transformedUrl = transformUrl(sanitizedUrl || "");
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

  const sanitizedEmbedSrc = sanitizedEmbedAttributes?.src ?? null;
  const resolvedSanitizedMiniAppSrc = useMemo(() => {
    if (!isMiniAppEnvironment || !sanitizedEmbedSrc) {
      return undefined;
    }

    return resolveAllowedEmbedSrc(sanitizedEmbedSrc);
  }, [isMiniAppEnvironment, sanitizedEmbedSrc]);

  const sanitizedMiniAppBootstrapDoc = useMemo(() => {
    if (!resolvedSanitizedMiniAppSrc) {
      return null;
    }

    return createMiniAppBootstrapSrcDoc(resolvedSanitizedMiniAppSrc, fidForMiniApp, userContextData);
  }, [resolvedSanitizedMiniAppSrc, fidForMiniApp, userContextData]);

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
      sanitizedMiniAppBootstrapDoc &&
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
            key={`miniapp-sanitized-${resolvedSanitizedMiniAppSrc}`}
            srcDoc={sanitizedMiniAppBootstrapDoc}
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
    const miniAppBootstrapDoc = isMiniAppEnvironment
      ? createMiniAppBootstrapSrcDoc(transformedUrl, fidForMiniApp, userContextData)
      : null;

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
              key={`iframe-miniapp-${transformedUrl}`}
              src={miniAppBootstrapDoc ? undefined : transformedUrl}
              srcDoc={miniAppBootstrapDoc || undefined}
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
                key={`iframe-miniapp-${transformedUrl}`}
                src={miniAppBootstrapDoc ? undefined : transformedUrl}
                srcDoc={miniAppBootstrapDoc || undefined}
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
          bootstrapDoc,
          allowFullScreen,
          sandboxRules,
          widthAttr,
          heightAttr,
        } = iframelyMiniAppConfig;

        return (
          <div style={{ overflow: "hidden", width: "100%", height: "100%" }}>
            <iframe
              key={`miniapp-iframely-${safeSrc}`}
              srcDoc={bootstrapDoc}
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
