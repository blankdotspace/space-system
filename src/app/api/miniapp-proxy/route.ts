import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
    // Fetch the mini-app HTML
    const response = await fetch(url, {
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
          
          // Intercept module loading to ensure our SDK is used
          // This handles cases where the app uses dynamic imports
          if (typeof window !== 'undefined' && window.document) {
            // Listen for script loads and ensure SDK is available
            const originalAppendChild = Node.prototype.appendChild;
            Node.prototype.appendChild = function(child) {
              if (child.tagName === 'SCRIPT' && child.src) {
                // Ensure SDK is available before any script runs
                if (!window.farcasterMiniAppSdk) {
                  Object.defineProperty(window, 'farcasterMiniAppSdk', {
                    value: mockSdk,
                    writable: false,
                    configurable: true,
                    enumerable: true
                  });
                }
              }
              return originalAppendChild.call(this, child);
            };
          }
          
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
          
          // CRITICAL: Intercept fetch/XMLHttpRequest to add user context to API calls
          // This must happen BEFORE any mini app code runs
          // Some mini apps make API calls immediately on load
          if (hasUser && contextData.fid) {
            // Store original fetch
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
              const [url, options = {}] = args;
              // Add user context to headers for ALL API calls
              if (typeof url === 'string') {
                const headers = new Headers(options.headers || {});
                // Add Farcaster user context headers
                if (!headers.has('X-Farcaster-User-Fid')) {
                  headers.set('X-Farcaster-User-Fid', contextData.fid.toString());
                }
                if (contextData.username && !headers.has('X-Farcaster-Username')) {
                  headers.set('X-Farcaster-Username', contextData.username);
                }
                // Also add as Authorization header if app expects it
                if (!headers.has('Authorization')) {
                  headers.set('Authorization', 'Bearer farcaster:' + contextData.fid.toString());
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
              if (this._nounspaceUrl && typeof this._nounspaceUrl === 'string') {
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
          
          console.log('[Nounspace] Mini App SDK injected with context:', {
            hasUser,
            user: fullContext.user,
            contextData,
            sdkAvailable: !!window.farcasterMiniAppSdk,
            contextUser: fullContext.user,
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
          
          // Log when fetch is intercepted (for debugging)
          if (hasUser && contextData.fid) {
            console.log('[Nounspace] Fetch interception active for user:', {
              fid: contextData.fid,
              username: contextData.username
            });
          }
        } catch (err) {
          console.error('[Nounspace] Failed to inject Mini App SDK:', err);
        }
      })();
    `;

    // Inject SDK script into HTML BEFORE any other scripts
    // This is CRITICAL - the SDK must be available before the mini app loads
    // The script must execute IMMEDIATELY and SYNCHRONOUSLY
    
    try {
      // Wrap in IIFE and execute immediately
      const wrappedScript = `(function(){${sdkInjectionScript}})();`;
      const sdkScriptTag = `<script>${wrappedScript}</script>`;
      
      // CRITICAL: Inject SDK as the VERY FIRST script, before ANY other code runs
      // This ensures the SDK is available when the mini app tries to use it
      
      // Only inject if not already present (avoid duplicates)
      if (!html.includes('farcasterMiniAppSdk')) {
        // Strategy: Inject in <head> as first child (most reliable approach)
        const headMatch = html.match(/<head[^>]*>/i);
        if (headMatch && headMatch[0]) {
          const headTag = headMatch[0];
          html = html.replace(headTag, `${headTag}\n${sdkScriptTag}`);
        } else {
          // If no <head> tag, try to inject after <html> tag
          const htmlTagMatch = html.match(/<html[^>]*>/i);
          if (htmlTagMatch && htmlTagMatch[0]) {
            const htmlTag = htmlTagMatch[0];
            html = html.replace(htmlTag, `${htmlTag}\n${sdkScriptTag}`);
          } else {
            // Last resort: inject at the very beginning of HTML
            html = `${sdkScriptTag}\n${html}`;
          }
        }
      }
    } catch (injectionError) {
      console.error('[miniapp-proxy] Error injecting SDK script:', injectionError);
      // Continue even if injection fails - the app should still work
      // but without automatic login
    }

    // Return modified HTML
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error proxying mini-app:", error);
    return NextResponse.json(
      {
        error: "Failed to proxy mini-app",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


