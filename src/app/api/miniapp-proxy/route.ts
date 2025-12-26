import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const normalizeProxyRoot = (proxyRoot: string) =>
  proxyRoot.endsWith("/") ? proxyRoot.slice(0, -1) : proxyRoot;

const rewriteHtmlUrls = (html: string, proxyRoot: string) => {
  const normalizedProxyRoot = normalizeProxyRoot(proxyRoot);

  const rewriteRootPath = (value: string) => {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
      return value;
    }
    if (
      value === normalizedProxyRoot ||
      value.startsWith(`${normalizedProxyRoot}/`)
    ) {
      return value;
    }
    return `${normalizedProxyRoot}${value}`;
  };

  let updated = html.replace(
    /(\s(?:src|href|action|poster)=["'])([^"']+)(["'])/gi,
    (_match, prefix, value, suffix) => {
      const rewritten = rewriteRootPath(value);
      return `${prefix}${rewritten}${suffix}`;
    },
  );

  updated = updated.replace(
    /(\ssrcset=["'])([^"']*)(["'])/gi,
    (_match, prefix, value, suffix) => {
      const rewritten = value
        .split(",")
        .map((entry) => {
          const trimmed = entry.trim();
          if (!trimmed) {
            return entry;
          }
          const firstSpace = trimmed.search(/\s/);
          const url =
            firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
          const descriptor =
            firstSpace === -1 ? "" : trimmed.slice(firstSpace).trim();
          const nextUrl = rewriteRootPath(url);
          return descriptor ? `${nextUrl} ${descriptor}` : nextUrl;
        })
        .join(", ");
      return `${prefix}${rewritten}${suffix}`;
    },
  );

  updated = updated.replace(
    /url\(\s*(['"]?)(\/(?!\/)[^'")]+)\1\s*\)/gi,
    (_match, quote, path) => {
      const rewritten = rewriteRootPath(path);
      return `url(${quote}${rewritten}${quote})`;
    },
  );

  return updated;
};

/**
 * Proxy endpoint that injects Farcaster Mini App SDK into HTML before serving
 * This allows the SDK to persist even after navigation
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const fid = searchParams.get("fid");
  const username = searchParams.get("username");
  const displayName = searchParams.get("displayName");
  const pfpUrl = searchParams.get("pfpUrl");

  // Debug logging
  console.log('[miniapp-proxy] Request received:', {
    url,
    fid,
    username,
    hasFid: !!fid,
  });

  if (!url) {
    return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 });
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const targetUrl = url;
    const targetOrigin = new URL(targetUrl).origin;
    const proxyRoot = `/api/miniapp-proxy/${encodeURIComponent(targetOrigin)}`;
    const targetBasePath = new URL(".", targetUrl).pathname;
    const proxyBaseHref = `${proxyRoot}${targetBasePath}`;

    // Fetch the mini-app HTML
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    let html = await response.text();

    // Validate HTML is not empty
    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { error: "Invalid HTML response from mini-app" },
        { status: 500 }
      );
    }

    // Build user context
    const contextData = fid
      ? {
          fid: parseInt(fid, 10),
          ...(username && { username }),
          ...(displayName && { displayName }),
          ...(pfpUrl && { pfpUrl }),
        }
      : null;

    // Safely stringify context data for injection into JavaScript
    // We need to escape it properly to avoid breaking the script
    let contextJson = "null";
    try {
      contextJson = contextData ? JSON.stringify(contextData) : "null";
    } catch (jsonError) {
      console.error('[miniapp-proxy] Error stringifying context data:', jsonError);
      contextJson = "null";
    }
    
    const hasUser = contextData && contextData.fid && !isNaN(contextData.fid);

    // Build the SDK injection script
    // IMPORTANT: contextJson is already JSON.stringify'd, so it's safe to inject
    const sdkInjectionScript = `
      (function() {
        try {
          var parentWindow = window.parent;
          if (!parentWindow) {
            return;
          }
          
          // Get Ethereum provider from parent
          var provider = parentWindow.__nounspaceMiniAppEthProvider;
          
          // Provider info
          var providerInfo = parentWindow.__nounspaceMiniAppProviderInfo;
          if (!providerInfo) {
            var iconPath = "/nounspace-icon.png";
            var icon;
            try {
              icon = new URL(iconPath, window.location.origin).toString();
            } catch (err) {
              icon = iconPath;
            }
            providerInfo = {
              uuid: "nounspace-miniapp-provider",
              name: "Nounspace",
              icon: icon,
              rdns: "com.nounspace"
            };
          }
          
          var miniAppOrigin = ${JSON.stringify(targetOrigin)};
          var miniAppBaseUrl = ${JSON.stringify(targetUrl)};
          var miniAppProxyRoot = ${JSON.stringify(proxyRoot)};
          
          // Build context object - safely parse JSON string
          var contextData = null;
          try {
            contextData = ${contextJson};
          } catch (e) {
            console.warn('[Nounspace] Failed to parse context data:', e);
            contextData = null;
          }
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
          
          // Build the full context object
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
          
          // Create mock SDK
          var mockSdk = {
            context: Promise.resolve(fullContext),
            wallet: {
              ethProvider: provider || null
            },
            actions: {
              ready: function(options) {
                return Promise.resolve();
              },
              close: function() {
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
            isInMiniApp: function() {
              return Promise.resolve(true);
            },
            on: function(event, callback) {
              return this;
            },
            off: function(event, callback) {
              return this;
            }
          };
          
          // Make SDK available BEFORE any imports
          // CRITICAL: The real SDK checks window.farcasterMiniAppSdk first
          // We need to set this BEFORE the mini app code runs
          Object.defineProperty(window, 'farcasterMiniAppSdk', {
            value: mockSdk,
            writable: false,
            configurable: true,
            enumerable: true
          });
          
          window.__farcasterMiniAppSdk = {
            sdk: mockSdk,
            default: mockSdk
          };
          
          // Also expose as window.sdk for apps that check this
          try {
            if (!window.sdk) {
              window.sdk = mockSdk;
            }
          } catch (e) {
            // Ignore if sdk is read-only
          }
          
          // Note: We don't intercept appendChild anymore as it can break mini apps
          // The SDK is already available synchronously before any scripts run
          // Mini apps should check window.farcasterMiniAppSdk first before importing
          
          // Setup Ethereum provider
          if (provider) {
            window.ethereum = provider;
            
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
            
            window.dispatchEvent(new Event("ethereum#initialized"));
            announce();
            window.addEventListener("eip6963:requestProvider", announce);
            window.addEventListener("ethereum#requestProvider", announce);
          }
          
          // Expose context - CRITICAL for automatic login
          // Mini apps check these globals first before calling signIn()
          if (contextData) {
            window.__farcasterUserContext = contextData;
          }
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
          
          // CRITICAL: Intercept fetch/XMLHttpRequest to route relative calls through the proxy
          // This must happen BEFORE any mini app code runs
          // Some mini apps make API calls immediately on load
          function toProxyUrl(inputUrl) {
            if (!inputUrl || typeof inputUrl !== 'string') {
              return inputUrl;
            }
            if (inputUrl.startsWith(miniAppProxyRoot) || inputUrl.startsWith('/api/miniapp-proxy/')) {
              return inputUrl;
            }
            try {
              var parsedAbsolute = new URL(inputUrl);
              if (
                parsedAbsolute.origin === window.location.origin &&
                parsedAbsolute.pathname.startsWith('/api/miniapp-proxy/')
              ) {
                return parsedAbsolute.pathname + parsedAbsolute.search + parsedAbsolute.hash;
              }
            } catch (e) {
              // Not an absolute URL, continue.
            }
            try {
              var isAbsolute = /^[a-zA-Z][\\w+.-]*:/.test(inputUrl);
              var resolvedUrl = isAbsolute ? new URL(inputUrl) : new URL(inputUrl, miniAppBaseUrl);
              if (resolvedUrl.pathname && resolvedUrl.pathname.startsWith(miniAppProxyRoot)) {
                return resolvedUrl.pathname + resolvedUrl.search + resolvedUrl.hash;
              }
              if (resolvedUrl.origin === miniAppOrigin || resolvedUrl.origin === window.location.origin) {
                return miniAppProxyRoot + resolvedUrl.pathname + resolvedUrl.search + resolvedUrl.hash;
              }
            } catch (e) {
              return inputUrl;
            }
            return inputUrl;
          }

          function shouldAttachHeaders(resolvedUrl) {
            if (!hasUser || !contextData || !contextData.fid || typeof resolvedUrl !== 'string') {
              return false;
            }
            try {
              var urlObj = new URL(resolvedUrl, window.location.origin);
              return urlObj.pathname.startsWith(miniAppProxyRoot) || urlObj.origin === miniAppOrigin;
            } catch (e) {
              return false;
            }
          }

          // Store original fetch
          const originalFetch = window.fetch;
          window.fetch = function(...args) {
            const [url, options = {}] = args;
            const resolvedUrl = typeof url === 'string' ? toProxyUrl(url) : url;

            if (typeof resolvedUrl === 'string' && shouldAttachHeaders(resolvedUrl)) {
              const headers = new Headers(options.headers || {});
              if (!headers.has('X-Farcaster-User-Fid')) {
                headers.set('X-Farcaster-User-Fid', contextData.fid.toString());
              }
              if (contextData.username && !headers.has('X-Farcaster-Username')) {
                headers.set('X-Farcaster-Username', contextData.username);
              }
              if (!headers.has('Authorization')) {
                headers.set('Authorization', 'Bearer farcaster:' + contextData.fid.toString());
              }
              options.headers = headers;
            }

            return originalFetch.apply(this, [resolvedUrl, options]);
          };

          // Also intercept XMLHttpRequest for older apps
          const originalXHROpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            const resolvedUrl = typeof url === 'string' ? toProxyUrl(url) : url;
            this._nounspaceUrl = resolvedUrl;
            return originalXHROpen.apply(this, [method, resolvedUrl, ...rest]);
          };

          const originalXHRSend = XMLHttpRequest.prototype.send;
          XMLHttpRequest.prototype.send = function(...args) {
            if (this._nounspaceUrl && typeof this._nounspaceUrl === 'string' && shouldAttachHeaders(this._nounspaceUrl)) {
              if (!this.getRequestHeader('X-Farcaster-User-Fid')) {
                this.setRequestHeader('X-Farcaster-User-Fid', contextData.fid.toString());
              }
              if (contextData.username && !this.getRequestHeader('X-Farcaster-Username')) {
                this.setRequestHeader('X-Farcaster-Username', contextData.username);
              }
              if (!this.getRequestHeader('Authorization')) {
                this.setRequestHeader('Authorization', 'Bearer farcaster:' + contextData.fid.toString());
              }
            }
            return originalXHRSend.apply(this, args);
          };
          
          // Note: We don't intercept window.define anymore as it can break AMD/RequireJS modules
          // The SDK should check window.farcasterMiniAppSdk first before importing
          // This is the standard pattern used by the Farcaster SDK
          
          // Dispatch custom event to notify mini apps that SDK is ready
          // This allows mini apps to wait for SDK before making API calls
          try {
            window.dispatchEvent(new CustomEvent('farcaster:sdkready', {
              detail: {
                sdk: mockSdk,
                context: fullContext,
                user: fullContext.user
              }
            }));
          } catch (e) {
            console.warn('[Nounspace] Could not dispatch SDK ready event:', e);
          }
          
          // Minimal logging to avoid console spam
          if (hasUser && contextData.fid) {
            console.log('[Nounspace] SDK ready:', {
              hasUser: true,
              fid: contextData.fid,
              sdkAvailable: !!window.farcasterMiniAppSdk
            });
          }
        } catch (err) {
          console.error('[Nounspace] Failed to inject Mini App SDK:', err);
        }
      })();
    `;

    // Inject <base> and SDK script into HTML BEFORE any other scripts
    // This is CRITICAL - the SDK must be available before the mini app loads
    // The script must execute IMMEDIATELY and SYNCHRONOUSLY
    try {
      const hasSdk = html.includes('farcasterMiniAppSdk');
      const baseHref = proxyBaseHref;
      const headInsertions: string[] = [];
      const existingBaseMatch = html.match(/<base[^>]*>/i);
      const baseTargetMatch = existingBaseMatch
        ? existingBaseMatch[0].match(/\starget\s*=\s*["']([^"']+)["']/i)
        : null;
      const baseTarget = baseTargetMatch?.[1];

      headInsertions.push(
        `<base href="${baseHref}"${baseTarget ? ` target="${baseTarget}"` : ""}>`,
      );

      if (!hasSdk) {
        // Wrap in IIFE and execute immediately
        // IMPORTANT: Use non-blocking script injection to avoid breaking mini app loading
        const wrappedScript = `(function(){${sdkInjectionScript}})();`;
        // Use proper script tag with defer to ensure it doesn't block page load
        // But we need it to run early, so we use async=false and inject at the start
        const sdkScriptTag = `<script>${wrappedScript}</script>`;
        headInsertions.push(sdkScriptTag);
      }

      if (headInsertions.length > 0) {
        const injection = headInsertions.join('\n');

        // CRITICAL: Inject at the VERY START of <head> before ANY other code runs.
        const headMatch = html.match(/<head[^>]*>/i);
        if (headMatch && headMatch[0]) {
          const headTag = headMatch[0];
          const firstHeadIndex = html.indexOf(headTag);
          if (firstHeadIndex !== -1) {
            html =
              html.slice(0, firstHeadIndex + headTag.length) +
              '\n' +
              injection +
              html.slice(firstHeadIndex + headTag.length);
          }
        } else {
          const htmlTagMatch = html.match(/<html[^>]*>/i);
          if (htmlTagMatch && htmlTagMatch[0]) {
            const firstHtmlIndex = html.indexOf(htmlTagMatch[0]);
            if (firstHtmlIndex !== -1) {
              html =
                html.slice(0, firstHtmlIndex + htmlTagMatch[0].length) +
                '\n' +
                injection +
                html.slice(firstHtmlIndex + htmlTagMatch[0].length);
            }
          } else {
            html = `${injection}\n${html}`;
          }
        }
      }
    } catch (injectionError) {
      console.error('[miniapp-proxy] Error injecting SDK script:', injectionError);
      // Continue even if injection fails - the app should still work
      // but without automatic login
    }

    html = rewriteHtmlUrls(html, proxyRoot);

    // Return modified HTML
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[miniapp-proxy] Error proxying mini-app:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: searchParams.get("url"),
    });
    return NextResponse.json(
      {
        error: "Failed to proxy mini-app",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
