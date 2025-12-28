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
import { debounce, first } from "lodash";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BsCloud, BsCloudFill } from "react-icons/bs";
import { useLoadFarcasterUser } from "@/common/data/queries/farcaster";

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

type MiniAppUserContext = {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
};

const createMiniAppBootstrapSrcDoc = (
  targetUrl: string,
  fid?: number | null,
  userContext?: MiniAppUserContext | null
) => {
  const safeTargetUrl = sanitizeMiniAppNavigationTarget(targetUrl);
  const iconPath = MINI_APP_PROVIDER_METADATA.iconPath;

  // Build the context object that will be provided to mini-apps via SDK
  const contextData = userContext || (fid ? { fid } : null);
  const contextJson = contextData ? JSON.stringify(contextData) : 'null';

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

  // Script to inject Farcaster Mini App SDK with context
  const sdkInjectionScript = `
        // Inject Farcaster Mini App SDK mock that provides context from Nounspace
        (function() {
          try {
            var parentWindow = window.parent;
            if (!parentWindow) {
              return;
            }
            
            // Get Ethereum provider from parent
            var provider = parentWindow.__nounspaceMiniAppEthProvider;
            ${providerInfoScript}
            
            // Build context object
            var contextData = ${contextJson};
            var hasUser = contextData && contextData.fid;
            
            // CRITICAL: Expose user context IMMEDIATELY before any SDK code runs
            // This ensures mini apps can access user data synchronously
            if (hasUser) {
              try {
                // Expose user data globally for immediate access
                window.__farcasterUser = {
                  fid: contextData.fid,
                  username: contextData.username || null,
                  displayName: contextData.displayName || null,
                  pfpUrl: contextData.pfpUrl || null,
                };
                // Also expose as a global variable that some apps check
                window.farcasterUser = window.__farcasterUser;
              } catch (e) {
                console.warn('[Nounspace] Could not expose user immediately:', e);
              }
            }
            
            // Build the full context object that matches Farcaster Mini App SDK format
            // IMPORTANT: The user is already available in context.user (automatic login)
            // Mini apps should check context.user first - if it exists, user is already logged in
            // signIn() is only needed as a fallback for apps that require explicit sign-in
            var fullContext = {
              user: hasUser ? {
                fid: contextData.fid,
                username: contextData.username || null,
                displayName: contextData.displayName || null,
                pfpUrl: contextData.pfpUrl || null,
              } : null,
              client: {
                platformType: 'web',
                version: '1.0.0',
              },
              location: {
                type: 'launcher',
              }
            };
            
            // Create mock SDK that mimics @farcaster/miniapp-sdk
            // The real SDK uses postMessage to communicate with the parent
            // We intercept those messages and provide our own context
            var mockSdk = {
              // Context is a Promise that resolves to the context object
              context: Promise.resolve(fullContext),
              
              // Wallet provider
              wallet: {
                ethProvider: provider || null
              },
              
              // Actions
              actions: {
                ready: function(options) {
                  // Mark app as ready - this hides the splash screen in real clients
                  return Promise.resolve();
                },
                close: function() {
                  // Close the mini app
                  return Promise.resolve();
                },
                signIn: function(nonce) {
                  // Sign in - returns user info if available
                  // NOTE: User is already available in context.user (automatic login)
                  // This function is for apps that require explicit signIn() call
                  // If context.user exists, the app should use that instead of calling signIn()
                  // This maintains backward compatibility with apps that call signIn() explicitly
                  // IMPORTANT: In Farcaster, signIn() is called to get user info, but the user
                  // is already available in context.user. We return the user immediately.
                  console.log('[Nounspace] signIn() called - returning user context:', {
                    hasUser,
                    fid: contextData?.fid,
                    nonce: nonce || 'none'
                  });
                  return Promise.resolve(hasUser ? {
                    fid: contextData.fid,
                    username: contextData.username || null,
                    displayName: contextData.displayName || null,
                    pfpUrl: contextData.pfpUrl || null,
                  } : null);
                },
                openUrl: function(url) {
                  if (parentWindow) {
                    parentWindow.open(url, '_blank');
                  }
                  return Promise.resolve();
                },
                viewProfile: function(fid) {
                  return Promise.resolve();
                },
                addFrame: function(frameUrl) {
                  return Promise.resolve();
                }
              },
              
              // Check if in mini app (always true when injected)
              isInMiniApp: function() {
                return Promise.resolve(true);
              },
              
              // Event listeners (stubs)
              on: function(event, callback) {
                // Stub implementation - could be enhanced to handle real events
                return this;
              },
              off: function(event, callback) {
                // Stub implementation
                return this;
              }
            };
            
            // The real SDK checks for window.farcasterMiniAppSdk first
            // If it exists, it uses that. Otherwise, it uses postMessage to communicate with parent.
            // Since we're providing window.farcasterMiniAppSdk, the SDK should use our mock directly.
            // However, we also listen for any postMessage requests as a fallback.
            
            // Listen for messages from parent (in case SDK still tries to use postMessage)
            window.addEventListener('message', function(event) {
              // Handle context requests from SDK (fallback)
              if (event.data && typeof event.data === 'object') {
                var msgType = event.data.type || event.data.method || '';
                var isContextRequest = msgType.includes('context') || 
                                      msgType.includes('Context') ||
                                      msgType === 'farcaster:getContext' ||
                                      msgType === 'getContext';
                
                if (isContextRequest && event.source === parentWindow) {
                  // Respond with our context
                  try {
                    parentWindow.postMessage({
                      type: 'farcaster:context',
                      id: event.data.id,
                      result: fullContext,
                      success: true
                    }, '*');
                  } catch (e) {
                    console.warn('[Nounspace] Could not send context response:', e);
                  }
                }
              }
            }, false);
            
            // CRITICAL: Make SDK available BEFORE any imports happen
            // The SDK library checks for window.farcasterMiniAppSdk first
            // Multiple exposure points to ensure compatibility
            
            // Set SDK immediately - use configurable: true so we can update if needed
            try {
              // Delete existing if any (in case of re-injection)
              try {
                delete window.farcasterMiniAppSdk;
              } catch (e) {
                // Ignore if can't delete
              }
              
              Object.defineProperty(window, 'farcasterMiniAppSdk', {
                value: mockSdk,
                writable: false,
                configurable: true, // Allow redefinition if needed
                enumerable: true
              });
            } catch (e) {
              // If already exists, try to overwrite
              try {
                window.farcasterMiniAppSdk = mockSdk;
              } catch (e2) {
                console.warn('[Nounspace] Could not set farcasterMiniAppSdk:', e2);
              }
            }
            
            // CRITICAL: Intercept dynamic imports to ensure our SDK is used
            // The real SDK uses: import { sdk } from '@farcaster/miniapp-sdk'
            // We need to intercept this at the module level
            if (typeof window !== 'undefined') {
              // Store original import if it exists
              const originalImport = window.__import || (() => {});
              
              // Try to intercept import() calls
              // Note: This may not work in all browsers due to security restrictions
              // But we try anyway as a best effort
              try {
                // Override window.import if it exists (some polyfills)
                if (window.import) {
                  window.__originalImport = window.import;
                }
              } catch (e) {
                // Ignore
              }
            }
            
            // Also expose via the expected module export pattern
            window.__farcasterMiniAppSdk = {
              sdk: mockSdk,
              default: mockSdk
            };
            
            // Expose as window.sdk for apps that check this
            try {
              if (!window.sdk) {
                window.sdk = mockSdk;
              }
            } catch (e) {
              // Ignore if sdk is read-only
            }
            
            // Expose as global sdk (some apps might check for this)
            try {
              window.sdk = mockSdk;
            } catch (e) {
              // Ignore if sdk is read-only
            }
            
            // Store reference for module interception
            try {
              window.__nounspaceMockSdk = mockSdk;
            } catch (e) {
              // Ignore if property is read-only
            }
            
            // Intercept dynamic imports - this is CRITICAL for ES modules
            // The real SDK uses: import { sdk } from '@farcaster/miniapp-sdk'
            // We need to intercept this before it loads
            var originalImport = window.import || (function() {});
            if (typeof window !== 'undefined') {
              // Override import() function if possible
              // Note: This may not work in all browsers due to security restrictions
              try {
                // Store original if it exists
                if (window.import) {
                  window.__originalImport = window.import;
                }
                
                // Try to override import (may not work due to browser security)
                // Fallback: The SDK should check window.farcasterMiniAppSdk first
              } catch (e) {
                console.warn('[Nounspace] Could not override import:', e);
              }
            }
            
            // Intercept require/import calls if possible
            // This is a best-effort approach since we can't fully intercept ES modules
            if (typeof window.require !== 'undefined') {
              try {
                var originalRequire = window.require;
                window.require = function(id) {
                  if (id === '@farcaster/miniapp-sdk' || (typeof id === 'string' && id.includes('@farcaster/miniapp-sdk'))) {
                    return { sdk: mockSdk, default: mockSdk };
                  }
                  return originalRequire.apply(this, arguments);
                };
              } catch (e) {
                console.warn('[Nounspace] Could not intercept require:', e);
              }
            }
            
            // Try to intercept SystemJS/AMD/CommonJS if they exist
            if (window.System && window.System.register) {
              try {
                var originalRegister = window.System.register;
                window.System.register = function(name, deps, execute) {
                  if (name && typeof name === 'string' && name.includes('@farcaster/miniapp-sdk')) {
                    // Return our mock instead
                    return originalRegister.call(this, name, [], function() {
                      return { sdk: mockSdk, default: mockSdk };
                    });
                  }
                  return originalRegister.apply(this, arguments);
                };
              } catch (e) {
                console.warn('[Nounspace] Could not intercept System.register:', e);
              }
            }
            
            // CRITICAL: The real SDK checks window.farcasterMiniAppSdk FIRST
            // before trying to import. So if we set it here, it should use our mock.
            // The SDK code typically does:
            //   const sdk = window.farcasterMiniAppSdk || (await import('@farcaster/miniapp-sdk')).sdk
            // So our mock should be used if it's available.
            
            // Most importantly: ensure the SDK is available synchronously
            // before the page loads, so when the mini-app code runs, it finds our mock
            console.log('[Nounspace] SDK mock installed. Mini-app should use this SDK.');
            
            // Setup Ethereum provider for wallet interactions
            if (provider) {
              // Make provider available globally
              window.ethereum = provider;
              
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
            
            // Expose helper function for mini-apps to check if wallet is available
            window.__nounspaceHasWallet = !!provider;
            
            // Also expose context directly for backwards compatibility
            if (contextData) {
              window.__farcasterUserContext = contextData;
            }
            
            // Make context available immediately for apps that check synchronously
            window.__farcasterContext = fullContext;
            
            // Also expose user directly for apps that check window.__farcasterUserContext
            if (hasUser) {
              // Make user available immediately for synchronous checks
              try {
                Object.defineProperty(window, '__farcasterUser', {
                  value: fullContext.user,
                  writable: false,
                  configurable: true,
                  enumerable: true
                });
              } catch (e) {
                console.warn('[Nounspace] Could not expose __farcasterUser:', e);
              }
            }
            
            // Intercept fetch/XMLHttpRequest to add user context to API calls
            // Some mini apps make API calls that need the user context
            if (hasUser && contextData.fid) {
              // Store original fetch
              const originalFetch = window.fetch;
              window.fetch = function(...args) {
                const [url, options = {}] = args;
                // Add user context to headers if it's an API call
                if (typeof url === 'string' && (url.includes('/api/') || url.startsWith('http'))) {
                  const headers = new Headers(options.headers || {});
                  // Some apps check for Farcaster context in headers
                  if (!headers.has('X-Farcaster-User-Fid')) {
                    headers.set('X-Farcaster-User-Fid', contextData.fid.toString());
                  }
                  if (contextData.username && !headers.has('X-Farcaster-Username')) {
                    headers.set('X-Farcaster-Username', contextData.username);
                  }
                  options.headers = headers;
                }
                return originalFetch.apply(this, [url, options]);
              };
              
              // Also intercept XMLHttpRequest for older apps
              const originalXHROpen = XMLHttpRequest.prototype.open;
              XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                this._nounspaceUrl = url;
                return originalXHROpen.apply(this, [method, url, ...rest]);
              };
              
              const originalXHRSend = XMLHttpRequest.prototype.send;
              XMLHttpRequest.prototype.send = function(...args) {
                if (this._nounspaceUrl && typeof this._nounspaceUrl === 'string' && 
                    (this._nounspaceUrl.includes('/api/') || this._nounspaceUrl.startsWith('http'))) {
                  if (!this.getRequestHeader('X-Farcaster-User-Fid')) {
                    this.setRequestHeader('X-Farcaster-User-Fid', contextData.fid.toString());
                  }
                  if (contextData.username && !this.getRequestHeader('X-Farcaster-Username')) {
                    this.setRequestHeader('X-Farcaster-Username', contextData.username);
                  }
                }
                return originalXHRSend.apply(this, args);
              };
            }
            
            // Force SDK to be detected by intercepting the real SDK import
            // This ensures our mock is used even if the app imports @farcaster/miniapp-sdk
            if (typeof window !== 'undefined') {
              // Intercept before any module loads
              const originalDefine = window.define;
              if (typeof window.define === 'function') {
                window.define = function(deps, factory) {
                  if (Array.isArray(deps) && deps.some(dep => 
                    typeof dep === 'string' && dep.includes('@farcaster/miniapp-sdk')
                  )) {
                    // Replace the SDK dependency with our mock
                    const newDeps = deps.map(dep => 
                      (typeof dep === 'string' && dep.includes('@farcaster/miniapp-sdk'))
                        ? mockSdk
                        : dep
                    );
                    return originalDefine.call(this, newDeps, factory);
                  }
                  return originalDefine.apply(this, arguments);
                };
              }
            }
            
            console.log('[Nounspace] Mini App SDK injected with context:', {
              hasUser,
              user: fullContext.user,
              contextData,
              sdkAvailable: !!window.farcasterMiniAppSdk,
              contextAvailable: !!window.__farcasterContext,
              userAvailable: !!window.__farcasterUser,
              // Log all SDK exposure points
              exposurePoints: {
                farcasterMiniAppSdk: !!window.farcasterMiniAppSdk,
                __farcasterMiniAppSdk: !!window.__farcasterMiniAppSdk,
                __farcasterContext: !!window.__farcasterContext,
                __farcasterUser: !!window.__farcasterUser,
                __farcasterUserContext: !!window.__farcasterUserContext,
                sdk: !!window.sdk
              }
            });
          } catch (err) {
            console.error('[Nounspace] Failed to inject Mini App SDK:', err);
          }
        })();
      `;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <script>
      // STEP 1: Inject SDK BEFORE anything else
      // Execute immediately and synchronously
      (function(){${sdkInjectionScript}})();
    </script>
    <script>
      // STEP 2: Navigate to the mini-app
      // The SDK will be lost on navigation, but we try to inject it before
      var target = ${JSON.stringify(safeTargetUrl)};
      if (target && target !== "about:blank") {
        // Minimum delay to ensure SDK is set
        setTimeout(function() {
          window.location.replace(target);
        }, 0);
      }
    </script>
  </head><body></body></html>`;
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
  const { data: farcasterUserData } = useLoadFarcasterUser(fidForMiniApp ?? -1);
  const farcasterUser = useMemo(
    () => first(farcasterUserData?.users),
    [farcasterUserData?.users],
  );

  // Prepare user context data for passing to mini-apps
  // Only include fields that are available in the UserContext type
  // IMPORTANT: Always include FID if available, even if we don't have other user data
  // This ensures automatic login works for mini apps
  const userContextData: MiniAppUserContext | null = useMemo(() => {
    if (userContext && userContext.fid) {
      return {
        fid: userContext.fid,
        ...(userContext.username && { username: userContext.username }),
        ...(userContext.displayName && { displayName: userContext.displayName }),
        ...(userContext.pfpUrl && { pfpUrl: userContext.pfpUrl }),
      };
    }

    if (farcasterUser && fidForMiniApp) {
      return {
        fid: fidForMiniApp,
        ...(farcasterUser.username && { username: farcasterUser.username }),
        ...(farcasterUser.display_name && { displayName: farcasterUser.display_name }),
        ...(farcasterUser.pfp_url && { pfpUrl: farcasterUser.pfp_url }),
      };
    }

    // Fallback: use FID if available (even without other user data)
    // This is critical for automatic login
    if (fidForMiniApp) {
      return { fid: fidForMiniApp };
    }
    return null;
  }, [userContext, farcasterUser, fidForMiniApp]);

  const miniAppHostContextRef = useRef<MiniAppUserContext | null>(null);
  const miniAppHostFramesRef = useRef<WeakSet<HTMLIFrameElement>>(new WeakSet());
  const miniAppHostLastFrameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    miniAppHostContextRef.current = userContextData || (fidForMiniApp ? { fid: fidForMiniApp } : null);
  }, [userContextData, fidForMiniApp]);

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && url) {
      console.log('[IFrame] User context for mini app:', {
        hasUserContext: !!userContext,
        userContext,
        currentFid,
        fidForMiniApp,
        userContextData,
        isMiniAppEnvironment,
      });
    }
  }, [url, userContext, currentFid, fidForMiniApp, userContextData, isMiniAppEnvironment]);

  const setupMiniAppHost = useCallback((iframe: HTMLIFrameElement | null) => {
    void (async () => {
      if (typeof window === "undefined") {
        return;
      }

      if (!iframe?.contentWindow) {
        return;
      }

      miniAppHostLastFrameRef.current = iframe;

      if (miniAppHostFramesRef.current.has(iframe)) {
        return;
      }

      const currentContext = miniAppHostContextRef.current;
      if (!currentContext?.fid) {
        return;
      }

      miniAppHostFramesRef.current.add(iframe);

      try {
        const { expose, windowEndpoint } = await import("comlink");

        const buildMiniAppContext = () => {
          const context = miniAppHostContextRef.current;
          if (!context?.fid) {
            return null;
          }

          return {
            user: {
              fid: context.fid,
              ...(context.username && { username: context.username }),
              ...(context.displayName && { displayName: context.displayName }),
              ...(context.pfpUrl && { pfpUrl: context.pfpUrl }),
            },
            client: {
              platformType: "web",
              clientFid: context.fid,
              added: true,
            },
            location: {
              type: "launcher",
            },
            features: {
              haptics: false,
            },
          };
        };

        const getEthProvider = () => {
          const win = window as Window & { ethereum?: unknown };
          return win.__nounspaceMiniAppEthProvider || win.ethereum || null;
        };

        const host = {
          get context() {
            return buildMiniAppContext();
          },
          ready() {
            return;
          },
          close() {
            return;
          },
          openUrl(urlToOpen: string) {
            try {
              window.open(urlToOpen, "_blank", "noopener");
            } catch (error) {
              console.warn("[Nounspace] Failed to open URL:", error);
            }
          },
          signIn(options: { nonce: string }) {
            const context = miniAppHostContextRef.current;
            if (!context?.fid) {
              return Promise.resolve({ error: { type: "rejected_by_user" } });
            }

            const nonce = options?.nonce || "nounspace";
            const domain = window.location.host;
            const issuedAt = new Date().toISOString();
            const message = `${domain} wants you to sign in with your Ethereum account:\n` +
              `0x0000000000000000000000000000000000000000\n\n` +
              `Sign in with Farcaster.\n\n` +
              `URI: https://${domain}\n` +
              `Version: 1\n` +
              `Chain ID: 1\n` +
              `Nonce: ${nonce}\n` +
              `Issued At: ${issuedAt}`;

            return Promise.resolve({
              result: {
                message,
                signature: `0x${"0".repeat(130)}`,
                authMethod: "custody",
              },
            });
          },
          setPrimaryButton() {
            return;
          },
          async ethProviderRequest(request: { method: string; params?: unknown[] }) {
            const provider = getEthProvider();
            if (!provider?.request) {
              throw new Error("Ethereum provider not available");
            }
            return provider.request({ method: request.method, params: request.params });
          },
          async ethProviderRequestV2(request: { id?: number | string; method: string; params?: unknown[] }) {
            const provider = getEthProvider();
            if (!provider?.request) {
              return {
                id: request.id ?? 0,
                jsonrpc: "2.0",
                error: { code: 4200, message: "Ethereum provider not available" },
              };
            }

            try {
              const result = await provider.request({ method: request.method, params: request.params });
              return {
                id: request.id ?? 0,
                jsonrpc: "2.0",
                result,
              };
            } catch (error) {
              return {
                id: request.id ?? 0,
                jsonrpc: "2.0",
                error: { code: 4001, message: error instanceof Error ? error.message : "Request failed" },
              };
            }
          },
          eip6963RequestProvider() {
            return;
          },
          addFrame() {
            return Promise.resolve({ result: {} });
          },
          addMiniApp() {
            return Promise.resolve({ result: {} });
          },
          viewCast() {
            return;
          },
          viewProfile() {
            return;
          },
          viewToken() {
            return;
          },
          sendToken() {
            return;
          },
          swapToken() {
            return;
          },
          openMiniApp() {
            return;
          },
          composeCast() {
            return Promise.resolve({ cast: null });
          },
          impactOccurred() {
            return;
          },
          notificationOccurred() {
            return;
          },
          selectionChanged() {
            return;
          },
          getCapabilities() {
            const capabilities = [
              "actions.ready",
              "actions.openUrl",
              "actions.close",
              "actions.signIn",
              "actions.viewProfile",
              "actions.viewCast",
              "actions.composeCast",
              "actions.addMiniApp",
              "actions.addFrame",
              "back",
            ];

            if (getEthProvider()) {
              capabilities.push("wallet.getEthereumProvider");
            }

            return Promise.resolve(capabilities);
          },
          getChains() {
            return Promise.resolve([]);
          },
          updateBackState() {
            return Promise.resolve();
          },
        };

        expose(host, windowEndpoint(iframe.contentWindow));
      } catch (error) {
        console.warn("[Nounspace] Failed to expose miniapp host:", error);
      }
    })();
  }, []);

  useEffect(() => {
    if (miniAppHostContextRef.current?.fid && miniAppHostLastFrameRef.current) {
      setupMiniAppHost(miniAppHostLastFrameRef.current);
    }
  }, [setupMiniAppHost, userContextData, fidForMiniApp]);

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
    // Inject SDK when we have user context (for mini-apps) or when in mini-app environment
    if ((!isMiniAppEnvironment && !userContextData) || !iframelyEmbedAttributes?.src) {
      return undefined;
    }

    if (!isValidHttpUrl(iframelyEmbedAttributes.src)) {
      return null;
    }

    try {
      const safeSrc = new URL(iframelyEmbedAttributes.src).toString();
      // bootstrapDoc causes SDK to be lost when the page navigates
      return {
        safeSrc,
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
    // Resolve for mini-apps when we have user context or when in mini-app environment
    if ((!isMiniAppEnvironment && !userContextData) || !sanitizedEmbedSrc) {
      return undefined;
    }

    return resolveAllowedEmbedSrc(sanitizedEmbedSrc);
  }, [isMiniAppEnvironment, sanitizedEmbedSrc, userContextData]);

  // This ensures the SDK is available even after the mini-app navigates to different pages

  if (sanitizedEmbedScript) {
    if (
      (isMiniAppEnvironment || userContextData) &&
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
      (isMiniAppEnvironment || userContextData) &&
      sanitizedEmbedSrc &&
      resolvedSanitizedMiniAppSrc &&
      sanitizedEmbedAttributes
    ) {
      // CRITICAL: Always use proxy when we have user context to ensure SDK persists after navigation
      const effectiveUserContext = userContextData || (fidForMiniApp ? { fid: fidForMiniApp } : null);
      const proxyUrl = effectiveUserContext
        ? `/api/miniapp-proxy?url=${encodeURIComponent(resolvedSanitizedMiniAppSrc)}&fid=${effectiveUserContext.fid}${effectiveUserContext.username ? `&username=${encodeURIComponent(effectiveUserContext.username)}` : ''}${effectiveUserContext.displayName ? `&displayName=${encodeURIComponent(effectiveUserContext.displayName)}` : ''}${effectiveUserContext.pfpUrl ? `&pfpUrl=${encodeURIComponent(effectiveUserContext.pfpUrl)}` : ''}`
        : resolvedSanitizedMiniAppSrc;

      const allowFullScreen = "allowfullscreen" in sanitizedEmbedAttributes;
      const sandboxRules = ensureSandboxRules(
        sanitizedEmbedAttributes.sandbox,
      );

      const widthAttr = sanitizedEmbedAttributes.width;
      const heightAttr = sanitizedEmbedAttributes.height;

      return (
        <div style={{ overflow: "hidden", width: "100%", height: "100%" }}>
          <iframe
            key={`miniapp-sanitized-${resolvedSanitizedMiniAppSrc}-${effectiveUserContext ? 'proxy' : 'direct'}`}
            src={proxyUrl}
            title={sanitizedEmbedAttributes.title || "IFrame Fidget"}
            sandbox={sandboxRules}
            allow={sanitizedEmbedAttributes.allow}
            ref={setupMiniAppHost}
            referrerPolicy={
              sanitizedEmbedAttributes.referrerpolicy as React.IframeHTMLAttributes<HTMLIFrameElement>["referrerPolicy"]
            }
            loading={
              sanitizedEmbedAttributes.loading as React.IframeHTMLAttributes<HTMLIFrameElement>["loading"]
            }
            frameBorder={sanitizedEmbedAttributes.frameborder}
            allowFullScreen={allowFullScreen}
            scrolling={isScrollable ? "yes" : "no"}
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
    // For mini-apps, use proxy endpoint that injects SDK into HTML
    // This ensures SDK persists even after navigation
    // Always use proxy if we have any user data (FID) to enable automatic login
    const shouldUseProxy = (isMiniAppEnvironment || userContextData || fidForMiniApp);

    // Build proxy URL with user context
    // Use userContextData if available, otherwise fallback to fidForMiniApp
    const effectiveUserContext = userContextData || (fidForMiniApp ? { fid: fidForMiniApp } : null);
    const proxyUrl = shouldUseProxy && effectiveUserContext
      ? `/api/miniapp-proxy?url=${encodeURIComponent(transformedUrl)}&fid=${effectiveUserContext.fid}${effectiveUserContext.username ? `&username=${encodeURIComponent(effectiveUserContext.username)}` : ''}${effectiveUserContext.displayName ? `&displayName=${encodeURIComponent(effectiveUserContext.displayName)}` : ''}${effectiveUserContext.pfpUrl ? `&pfpUrl=${encodeURIComponent(effectiveUserContext.pfpUrl)}` : ''}`
      : transformedUrl;

    // Debug logging - ALWAYS log in development, and also log in production for debugging
    console.log('[IFrame] Mini app proxy configuration:', {
      shouldUseProxy,
      hasUserContextData: !!userContextData,
      fidForMiniApp,
      effectiveUserContext,
      usingProxy: shouldUseProxy && effectiveUserContext,
      proxyUrl: shouldUseProxy && effectiveUserContext ? proxyUrl : 'NOT USING PROXY',
      originalUrl: transformedUrl,
    });

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
              src={proxyUrl}
              title="IFrame Fidget"
              sandbox={DEFAULT_SANDBOX_RULES}
              ref={setupMiniAppHost}
              scrolling={isScrollable ? "yes" : "no"}
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
                src={proxyUrl}
                title="IFrame Fidget"
                sandbox={DEFAULT_SANDBOX_RULES}
                ref={setupMiniAppHost}
                scrolling={isScrollable ? "yes" : "no"}
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
    // Inject SDK when we have user context (for mini-apps) or when in mini-app environment
    if ((isMiniAppEnvironment || userContextData) && iframelyEmbedSrc && iframelyEmbedAttributes) {
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

        // srcDoc causes SDK to be lost when the page navigates
        const effectiveUserContext = userContextData || (fidForMiniApp ? { fid: fidForMiniApp } : null);
        const proxyUrl = effectiveUserContext
          ? `/api/miniapp-proxy?url=${encodeURIComponent(safeSrc)}&fid=${effectiveUserContext.fid}${effectiveUserContext.username ? `&username=${encodeURIComponent(effectiveUserContext.username)}` : ''}${effectiveUserContext.displayName ? `&displayName=${encodeURIComponent(effectiveUserContext.displayName)}` : ''}${effectiveUserContext.pfpUrl ? `&pfpUrl=${encodeURIComponent(effectiveUserContext.pfpUrl)}` : ''}`
          : safeSrc;

        return (
          <div style={{ overflow: "hidden", width: "100%", height: "100%" }}>
            <iframe
              key={`miniapp-iframely-${safeSrc}-${effectiveUserContext ? 'proxy' : 'direct'}`}
              src={proxyUrl}
              title={iframelyEmbedAttributes.title || "IFrame Fidget"}
              sandbox={sandboxRules}
              allow={iframelyEmbedAttributes.allow}
              ref={setupMiniAppHost}
              referrerPolicy={
                iframelyEmbedAttributes.referrerpolicy as React.IframeHTMLAttributes<HTMLIFrameElement>["referrerPolicy"]
              }
              loading={
                iframelyEmbedAttributes.loading as React.IframeHTMLAttributes<HTMLIFrameElement>["loading"]
              }
              frameBorder={iframelyEmbedAttributes.frameborder}
              allowFullScreen={allowFullScreen}
              scrolling={isScrollable ? "yes" : "no"}
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
