"use client";

import React, { useContext, useState, useEffect } from "react";
import { useMiniAppSdk } from "@/common/lib/hooks/useMiniAppSdk";
import { useEmbeddedMiniApps } from "@/common/lib/hooks/useEmbeddedMiniApps";
import { MiniAppSdkContext } from "@/common/providers/MiniAppSdkProvider";
import { AuthenticatorContext } from "@/authenticators/AuthenticatorManager";
import type { AuthenticatorManager } from "@/authenticators/AuthenticatorManager";

export function ContextDebugger() {
  const { context: sdkContext, isReady, error } = useMiniAppSdk();
  const embeddedMiniApps = useEmbeddedMiniApps();
  const contextForEmbedded = sdkContext || null;
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Get raw SDK instance for quickAuth access
  const sdkContextState = useContext(MiniAppSdkContext);
  const rawSdkInstance = sdkContextState?.sdk;
  
  // Get authenticator manager from context (may be null if not inside AuthenticatorManagerProvider)
  const authenticatorManager: AuthenticatorManager | null = useContext(AuthenticatorContext);
  
  // Quick Auth state
  const [quickAuthInfo, setQuickAuthInfo] = useState<{
    available: boolean;
    hasRealSdk: boolean;
    hasAuthenticator: boolean;
    token: string | null;
    error: string | null;
  }>({
    available: false,
    hasRealSdk: false,
    hasAuthenticator: false,
    token: null,
    error: null,
  });
  
  // Check quickAuth availability
  useEffect(() => {
    const checkQuickAuth = async () => {
      const hasRealSdk = !!(rawSdkInstance && (rawSdkInstance as any).quickAuth);
      const hasAuthenticator = !!authenticatorManager;
      const available = hasRealSdk || hasAuthenticator;
      
      let token: string | null = null;
      let error: string | null = null;
      
      if (available && hasRealSdk) {
        try {
          // Try to get token from real SDK
          const result = await (rawSdkInstance as any).quickAuth.getToken();
          token = result?.token || (rawSdkInstance as any).quickAuth.token || null;
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
        }
      }
      
      setQuickAuthInfo({
        available,
        hasRealSdk,
        hasAuthenticator,
        token,
        error,
      });
    };
    
    checkQuickAuth();
  }, [rawSdkInstance, authenticatorManager]);

  // Only show in development
  if (process.env.NODE_ENV !== "development") return null;

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyAllDebugInfo = async () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
        status: {
        sdkReady: isReady,
        error: error ? error.message : null,
        runningInMiniApp: sdkContext !== null,
        embeddedMiniAppsCount: embeddedMiniApps.length,
      },
      quickAuth: quickAuthInfo,
      context: {
        userFid: sdkContext?.user?.fid || null,
        platform: sdkContext?.client?.platformType || null,
        locationType: sdkContext?.location?.type || null,
      },
      sdkContext: sdkContext,
      contextForEmbedded: contextForEmbedded,
      embeddedMiniApps: embeddedMiniApps.map((app, index) => {
        // Try to extract target URL from bootstrap doc if available
        let extractedUrl = app.url;
        if (typeof document !== 'undefined' && app.hasBootstrapDoc) {
          const iframes = document.querySelectorAll<HTMLIFrameElement>(`iframe[data-nounspace-context]`);
          const iframe = iframes[index];
          if (iframe?.srcdoc) {
            const match = iframe.srcdoc.match(/window\.location\.replace\(["']([^"']+)["']\)/);
            if (match && match[1]) {
              extractedUrl = match[1];
            }
          }
        }
        
        return {
          index: index + 1,
          id: app.id,
          url: extractedUrl,
          hasBootstrapDoc: app.hasBootstrapDoc,
        };
      }),
    };

    const formattedText = `=== Mini-App Context Debug Info ===
Timestamp: ${debugInfo.timestamp}

--- Status ---
SDK Ready: ${debugInfo.status.sdkReady ? "✅ Yes" : "❌ No"}
Error: ${debugInfo.status.error || "None"}
Running in Mini-App: ${debugInfo.status.runningInMiniApp ? "✅ Yes" : "⚠️ No (standalone)"}
Embedded Mini-Apps: ${debugInfo.status.embeddedMiniAppsCount}

--- Quick Auth ---
Available: ${debugInfo.quickAuth.available ? "✅ Yes" : "❌ No"}
Real SDK: ${debugInfo.quickAuth.hasRealSdk ? "✅ Yes" : "❌ No"}
Authenticator Manager: ${debugInfo.quickAuth.hasAuthenticator ? "✅ Yes" : "❌ No"}
Token: ${debugInfo.quickAuth.token ? `✅ ${debugInfo.quickAuth.token.substring(0, 20)}...` : "❌ None"}${debugInfo.quickAuth.error ? `\nError: ${debugInfo.quickAuth.error}` : ""}

--- Context Summary ---
User FID: ${debugInfo.context.userFid || "N/A"}
Platform: ${debugInfo.context.platform || "N/A"}
Location Type: ${debugInfo.context.locationType || "N/A"}

--- SDK Context ---
${JSON.stringify(debugInfo.sdkContext, null, 2)}

--- Context Being Sent to Embedded Apps ---
${debugInfo.contextForEmbedded ? JSON.stringify(debugInfo.contextForEmbedded, null, 2) : "❌ NULL - No context available to send"}

--- Embedded Mini-Apps (${debugInfo.embeddedMiniApps.length}) ---
${debugInfo.embeddedMiniApps.length === 0 
  ? "No mini-apps detected" 
  : debugInfo.embeddedMiniApps.map(app => `
Mini-App #${app.index} (${app.id || "Unknown"})
  URL: ${app.url || "N/A"}
  Bootstrap Doc: ${app.hasBootstrapDoc ? "✅ Yes" : "❌ No"}
  Context: Provided via Comlink (sdk.context from @farcaster/miniapp-sdk)
`).join("\n")}

=== End Debug Info ===`;

    try {
      await navigator.clipboard.writeText(formattedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy debug info:", err);
      // Fallback: create a textarea and copy
      const textarea = document.createElement("textarea");
      textarea.value = formattedText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (e) {
        console.error("Fallback copy failed:", e);
      }
      document.body.removeChild(textarea);
    }
  };

  const isInMiniApp = sdkContext !== null;
  const hasEmbeddedApps = embeddedMiniApps.length > 0;

  return (
    <div
      className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg max-w-lg max-h-[80vh] overflow-auto text-xs z-50 border border-gray-700 shadow-2xl"
      data-context-debugger
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">Mini-App Context Debugger</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={copyAllDebugInfo}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            title="Copy all debug info to clipboard"
          >
            {copySuccess ? "✓ Copied!" : "Copy All"}
          </button>
          <button
            onClick={() => {
              const el = document.querySelector('[data-context-debugger]');
              if (el) {
                el.classList.toggle('hidden');
              }
            }}
            className="text-gray-400 hover:text-white text-lg leading-none"
            aria-label="Toggle debugger visibility"
          >
            &times;
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Status Summary */}
        <div className="bg-gray-800 p-3 rounded">
          <button
            onClick={() => toggleSection('summary')}
            className="w-full text-left font-semibold text-gray-200 flex items-center justify-between"
          >
            <span>Status Summary</span>
            <span>{expandedSections.has('summary') ? '▼' : '▶'}</span>
          </button>
          {expandedSections.has('summary') && (
            <div className="mt-2 space-y-1 text-gray-300">
              <div className="flex justify-between">
                <span>SDK Ready:</span>
                <span className={isReady ? "text-green-400" : "text-red-400"}>
                  {isReady ? "✅ Yes" : "❌ No"}
                </span>
              </div>
              {error && (
                <div className="text-red-400 text-xs">
                  <strong>Error:</strong> {error.message}
                </div>
              )}
              <div className="flex justify-between">
                <span>Running in Mini-App:</span>
                <span className={isInMiniApp ? "text-green-400" : "text-yellow-400"}>
                  {isInMiniApp ? "✅ Yes" : "⚠️ No (standalone)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Embedded Mini-Apps:</span>
                <span className={hasEmbeddedApps ? "text-blue-400" : "text-gray-400"}>
                  {embeddedMiniApps.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>User FID:</span>
                <span>{sdkContext?.user?.fid || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform:</span>
                <span>{sdkContext?.client?.platformType || "N/A"}</span>
              </div>
              {sdkContext?.location && (
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span>{sdkContext.location.type}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Auth Info */}
        <div className="bg-gray-800 p-3 rounded">
          <button
            onClick={() => toggleSection('quickauth')}
            className="w-full text-left font-semibold text-gray-200 flex items-center justify-between"
          >
            <span>Quick Auth ({quickAuthInfo.available ? "✅" : "❌"})</span>
            <span>{expandedSections.has('quickauth') ? '▼' : '▶'}</span>
          </button>
          {expandedSections.has('quickauth') && (
            <div className="mt-2 space-y-1 text-gray-300">
              <div className="flex justify-between">
                <span>Available:</span>
                <span className={quickAuthInfo.available ? "text-green-400" : "text-red-400"}>
                  {quickAuthInfo.available ? "✅ Yes" : "❌ No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Real SDK:</span>
                <span className={quickAuthInfo.hasRealSdk ? "text-green-400" : "text-gray-400"}>
                  {quickAuthInfo.hasRealSdk ? "✅ Yes" : "❌ No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Authenticator Manager:</span>
                <span className={quickAuthInfo.hasAuthenticator ? "text-green-400" : "text-gray-400"}>
                  {quickAuthInfo.hasAuthenticator ? "✅ Yes" : "❌ No"}
                </span>
              </div>
              {quickAuthInfo.token && (
                <div className="mt-2">
                  <div className="text-xs text-gray-400 mb-1">Token (first 40 chars):</div>
                  <div className="text-xs font-mono bg-gray-900 p-2 rounded break-all">
                    {quickAuthInfo.token.substring(0, 40)}...
                  </div>
                </div>
              )}
              {quickAuthInfo.error && (
                <div className="text-red-400 text-xs mt-2">
                  <strong>Error:</strong> {quickAuthInfo.error}
                </div>
              )}
              {!quickAuthInfo.available && (
                <div className="text-yellow-400 text-xs mt-2">
                  ⚠️ Quick Auth requires either a real SDK (when embedded) or an authenticator manager (when standalone)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Context Being Sent to Embedded Apps */}
        {hasEmbeddedApps && (
          <div className="bg-gray-800 p-3 rounded">
            <button
              onClick={() => toggleSection('context-sent')}
              className="w-full text-left font-semibold text-gray-200 flex items-center justify-between"
            >
              <span>Context Being Sent ({contextForEmbedded ? "✅" : "❌"})</span>
              <span>{expandedSections.has('context-sent') ? '▼' : '▶'}</span>
            </button>
            {expandedSections.has('context-sent') && (
              <div className="mt-2">
                {contextForEmbedded ? (
                  <pre className="whitespace-pre-wrap break-all text-xs bg-gray-900 p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
                    {JSON.stringify(contextForEmbedded, null, 2)}
                  </pre>
                ) : (
                  <p className="text-red-400 text-xs">
                    ⚠️ No context available to send. SDK context is null.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Embedded Mini-Apps */}
        <div className="bg-gray-800 p-3 rounded">
          <button
            onClick={() => toggleSection('embedded-apps')}
            className="w-full text-left font-semibold text-gray-200 flex items-center justify-between"
          >
            <span>Embedded Mini-Apps ({embeddedMiniApps.length})</span>
            <span>{expandedSections.has('embedded-apps') ? '▼' : '▶'}</span>
          </button>
          {expandedSections.has('embedded-apps') && (
            <div className="mt-2 space-y-2">
              {embeddedMiniApps.length === 0 ? (
                <p className="text-gray-400 text-xs">No mini-apps detected in page</p>
              ) : (
                embeddedMiniApps.map((app, index) => (
                  <div key={app.id || index} className="bg-gray-900 p-2 rounded text-xs">
                    <div className="font-semibold text-gray-200 mb-2">
                      #{index + 1}: {app.url || app.id || "Unknown"}
                    </div>
                    <div className="space-y-1 text-gray-300">
                      {app.url && (
                        <div>
                          <strong>URL:</strong> <span className="text-xs font-mono break-all">{app.url}</span>
                        </div>
                      )}
                      {app.hasBootstrapDoc && (
                        <div>
                          <strong>Bootstrap Doc:</strong> <span className="text-green-400">✅ Yes</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Context provided via Comlink (sdk.context from @farcaster/miniapp-sdk)
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Full Context Details (Collapsed by default) */}
        <div className="bg-gray-800 p-3 rounded">
          <button
            onClick={() => toggleSection('full-details')}
            className="w-full text-left font-semibold text-gray-200 flex items-center justify-between"
          >
            <span>Full Context Details</span>
            <span>{expandedSections.has('full-details') ? '▼' : '▶'}</span>
          </button>
          {expandedSections.has('full-details') && (
            <div className="mt-2 space-y-2">
              <div>
                <h5 className="text-gray-300 mb-1">SDK Context:</h5>
                <pre className="whitespace-pre-wrap break-all text-xs bg-gray-900 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                  {JSON.stringify(sdkContext, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


