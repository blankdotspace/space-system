"use client";

import React, { useContext, useState, useEffect } from "react";
import { useMiniAppSdk } from "@/common/lib/hooks/useMiniAppSdk";
import { useEmbeddedMiniApps } from "@/common/lib/hooks/useEmbeddedMiniApps";
import { MiniAppSdkContext } from "@/common/providers/MiniAppSdkProvider";
import { AuthenticatorContext } from "@/authenticators/AuthenticatorManager";
import type { AuthenticatorManager } from "@/authenticators/AuthenticatorManager";
import { useNounspaceMiniAppContext } from "@/common/lib/utils/createMiniAppContext";
import { useCurrentFid } from "@/common/lib/hooks/useCurrentFid";

export function ContextDebugger() {
  const { context: sdkContext, isReady, error } = useMiniAppSdk();
  const embeddedMiniApps = useEmbeddedMiniApps();
  
  // Get the actual context being sent to embedded apps (same logic as IFrame.tsx)
  const sdkContextState = useContext(MiniAppSdkContext);
  const actualSdkContext = sdkContextState?.context;
  const nounspaceContext = useNounspaceMiniAppContext();
  const contextForEmbedded = actualSdkContext || nounspaceContext;
  
  // Get user FID from our data
  const userFid = useCurrentFid();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Get raw SDK instance for quickAuth access (already have sdkContextState above)
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

  // Quick Auth verification state
  const [quickAuthTest, setQuickAuthTest] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    steps: Array<{
      step: string;
      status: 'pending' | 'success' | 'error';
      details?: string;
      error?: string;
      errorStack?: string;
      data?: any; // Actual data for this step (nonce, SIWE message, signature, etc.)
    }>;
    token?: string;
    tokenDetails?: {
      isValid: boolean;
      domain?: string;
      expiresAt?: string;
      payload?: any;
    };
  }>({
    status: 'idle',
    steps: [],
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
      quickAuthTest: quickAuthTest.status !== 'idle' ? {
        status: quickAuthTest.status,
        steps: quickAuthTest.steps.map(step => ({
          step: step.step,
          status: step.status,
          details: step.details,
          error: step.error,
          errorStack: step.errorStack,
          data: step.data,
        })),
        token: quickAuthTest.token,
        tokenDetails: quickAuthTest.tokenDetails,
      } : null,
      context: {
        userFid: userFid || contextForEmbedded?.user?.fid || null,
        platform: contextForEmbedded?.client?.platformType || null,
        locationType: contextForEmbedded?.location?.type || null,
      },
      sdkContext: sdkContext,
      contextForEmbedded: contextForEmbedded,
      embeddedMiniApps: embeddedMiniApps.map((app, index) => {
        // Use the URL directly from the iframe
        const extractedUrl = app.url;
        
        const debugInfo = iframeDebugInfo.get(app.id);
        let quickAuthDomain: string | null = null;
        if (debugInfo?.origin) {
          try {
            quickAuthDomain = new URL(debugInfo.origin).hostname;
          } catch {
            // Ignore
          }
        }
        
        return {
          index: index + 1,
          id: app.id,
          url: extractedUrl,
          hasBootstrapDoc: app.hasBootstrapDoc,
          hasContentWindow: debugInfo?.hasContentWindow ?? false,
          origin: debugInfo?.origin ?? null,
          setupError: debugInfo?.setupError ?? null,
          quickAuthDomain,
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
${debugInfo.quickAuthTest ? `\n--- Quick Auth Test Results ---\n${JSON.stringify(debugInfo.quickAuthTest, null, 2)}` : ""}

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
  Iframe Ready: ${app.hasContentWindow ? "✅ Yes" : "⚠️ No contentWindow"}
  PostMessage Origin: ${app.origin || "❌ Not determined"}
  Quick Auth Domain: ${app.quickAuthDomain || "N/A"}
  Setup Error: ${app.setupError || "None"}
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

  // Get additional debug info for each embedded app
  const [iframeDebugInfo, setIframeDebugInfo] = useState<Map<string, {
    hasContentWindow: boolean;
    origin: string | null;
    setupError: string | null;
  }>>(new Map());

  // Scan iframes for debug info
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scanIframes = () => {
      const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[data-nounspace-context]');
      const info = new Map<string, {
        hasContentWindow: boolean;
        origin: string | null;
        setupError: string | null;
      }>();

      iframes.forEach((iframe, index) => {
        const id = iframe.id || `miniapp-${index}`;
        let origin: string | null = null;
        let setupError: string | null = null;

        // Check if iframe has contentWindow
        const hasContentWindow = !!iframe.contentWindow;

        // Try to determine origin
        try {
          if (iframe.src) {
            origin = new URL(iframe.src).origin;
          } else if (iframe.srcdoc) {
            // srcdoc is present but we can't determine origin from it
            setupError = 'srcdoc present but cannot determine origin (use src instead)';
          } else {
            setupError = 'No src - cannot determine origin';
          }
        } catch (error) {
          setupError = error instanceof Error ? error.message : 'Failed to determine origin';
        }

        info.set(id, {
          hasContentWindow,
          origin,
          setupError,
        });
      });

      setIframeDebugInfo(info);
    };

    scanIframes();
    const interval = setInterval(scanIframes, 1000); // Update every second
    return () => clearInterval(interval);
  }, [embeddedMiniApps.length]);

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
                <div className="text-red-400 text-xs mt-2 p-2 bg-red-900/20 rounded">
                  <strong>Error:</strong> {error.message}
                  {error.stack && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-red-300">Stack trace</summary>
                      <pre className="mt-1 text-xs font-mono whitespace-pre-wrap break-all bg-red-950/50 p-2 rounded overflow-x-auto">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                  <div className="mt-1">
                    <strong>Error object:</strong>
                    <pre className="mt-1 text-xs font-mono whitespace-pre-wrap break-all bg-red-950/50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}
                    </pre>
                  </div>
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
                <span>{userFid || contextForEmbedded?.user?.fid || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform:</span>
                <span>{contextForEmbedded?.client?.platformType || "N/A"}</span>
              </div>
              {contextForEmbedded?.location && (
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span>{contextForEmbedded.location.type}</span>
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
                <div className="text-red-400 text-xs mt-2 p-2 bg-red-900/20 rounded">
                  <strong>Error:</strong> {quickAuthInfo.error}
                </div>
              )}
              {!quickAuthInfo.available && (
                <div className="text-yellow-400 text-xs mt-2">
                  ⚠️ Quick Auth requires either a real SDK (when embedded) or an authenticator manager (when standalone)
                </div>
              )}
              {quickAuthInfo.available && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <button
                    onClick={async () => {
                      setQuickAuthTest({ status: 'testing', steps: [] });
                      
                      const steps: typeof quickAuthTest.steps = [];
                      
                      try {
                        // Step 1: Check prerequisites
                        steps.push({ step: 'Check prerequisites', status: 'pending' });
                        setQuickAuthTest({ status: 'testing', steps: [...steps] });
                        
                        // Use userFid from our data (we create the context)
                        const testUserFid = userFid || contextForEmbedded?.user?.fid;
                        if (!testUserFid) {
                          throw new Error('User FID is required. Please sign in with Farcaster.');
                        }
                        if (!authenticatorManager && !rawSdkInstance) {
                          throw new Error('Authenticator manager or real SDK required');
                        }
                        steps[steps.length - 1] = { step: 'Check prerequisites', status: 'success', details: `User FID: ${testUserFid}` };
                        
                        // Step 2: Get first embedded iframe for testing
                        steps.push({ step: 'Get test iframe', status: 'pending' });
                        setQuickAuthTest({ status: 'testing', steps: [...steps] });
                        
                        const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[data-nounspace-context]');
                        if (iframes.length === 0) {
                          throw new Error('No embedded mini-apps found. Add an iframe fidget to test Quick Auth.');
                        }
                        const testIframe = iframes[0];
                        let testDomain: string;
                        try {
                          if (testIframe.src) {
                            testDomain = new URL(testIframe.src).hostname;
                          } else if (testIframe.srcdoc) {
                            const match = testIframe.srcdoc.match(/window\.location\.replace\(["']([^"']+)["']\)/);
                            if (match && match[1]) {
                              testDomain = new URL(match[1]).hostname;
                            } else {
                              testDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
                            }
                          } else {
                            testDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
                          }
                        } catch {
                          testDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
                        }
                        steps[steps.length - 1] = { step: 'Get test iframe', status: 'success', details: `Domain: ${testDomain}` };
                        
                        // Step 3: Test OUR Quick Auth system (generateNonce -> signIn -> verifySiwf)
                        // This is the actual system we built - test it!
                        if (!authenticatorManager) {
                          throw new Error('No authenticator manager available for Quick Auth');
                        }
                        
                        // Intercept console.log to capture Quick Auth flow details (declare outside all try blocks)
                        const originalLog = console.log;
                        const quickAuthLogs: string[] = [];
                        console.log = (...args: any[]) => {
                          const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
                          if (message.includes('[Quick Auth]')) {
                            quickAuthLogs.push(message);
                          }
                          originalLog.apply(console, args);
                        };
                        
                        try {
                          steps.push({ step: 'Test signIn API', status: 'pending' });
                          setQuickAuthTest({ status: 'testing', steps: [...steps] });

                          // Import the SDK host creator
                          const { createMiniAppSdkHost } = await import('@/common/lib/services/miniAppSdkHost');

                          // Create a mock SDK host with the same configuration as the iframe
                          // Use the actual context being sent to embedded apps
                          const testContext = contextForEmbedded || {
                            client: { clientFid: 1, added: false },
                            location: { type: 'launcher' as const },
                            features: { haptics: false },
                            user: { fid: testUserFid },
                          };

                          const mockSdkHost = createMiniAppSdkHost(
                            testContext,
                            (window as any).__nounspaceMiniAppEthProvider,
                            testIframe,
                            testDomain,
                            {
                              authenticatorManager: authenticatorManager || undefined,
                              userFid: testUserFid,
                            }
                          );

                          // Test the signIn method (used by SDK's Quick Auth internally)
                          steps[steps.length - 1] = {
                            step: 'Test signIn API',
                            status: 'pending',
                            details: 'Calling signIn() - the SDK uses this for Quick Auth',
                            data: {
                              domain: testDomain,
                              userFid: testUserFid,
                              hasEthProvider: !!(window as any).__nounspaceMiniAppEthProvider,
                            },
                          };
                          setQuickAuthTest({ status: 'testing', steps: [...steps] });

                          // Test signIn with a test nonce
                          const signInResult = await mockSdkHost.signIn({
                            nonce: 'testnonce' + Date.now(),
                            acceptAuthAddress: true,
                          });

                          // Check if signIn succeeded
                          if ('result' in signInResult && signInResult.result) {
                            const { signature, message, authMethod } = signInResult.result;

                            steps[steps.length - 1] = {
                              step: 'Test signIn API',
                              status: 'success',
                              details: `signIn succeeded! Auth method: ${authMethod}`,
                              data: {
                                signatureLength: signature.length,
                                signaturePrefix: signature.substring(0, 30) + '...',
                                messagePreview: message.substring(0, 100) + '...',
                                authMethod,
                                logs: quickAuthLogs,
                              },
                            };

                            setQuickAuthTest({
                              status: 'success',
                              steps: [...steps],
                              token: signature, // Using signature as "token" for display
                              tokenDetails: {
                                isValid: true,
                                domain: testDomain,
                              },
                            });
                            console.log = originalLog;
                            return;
                          } else if ('error' in signInResult) {
                            throw new Error(`signIn rejected: ${signInResult.error.type}`);
                          } else {
                            throw new Error('signIn returned unexpected result');
                          }
                        } catch (error) {
                          const errorObj = error instanceof Error ? error : new Error(String(error));
                          steps[steps.length - 1] = {
                            step: 'Test signIn API',
                            status: 'error',
                            error: errorObj.message,
                            errorStack: errorObj.stack,
                            data: {
                              errorType: errorObj.constructor.name,
                              errorName: errorObj.name,
                              fullError: JSON.stringify(errorObj, Object.getOwnPropertyNames(errorObj), 2),
                              logs: quickAuthLogs,
                            },
                          };
                          setQuickAuthTest({
                            status: 'error',
                            steps: [...steps],
                          });
                        } finally {
                          console.log = originalLog;
                        }
                      } catch (error) {
                        const errorObj = error instanceof Error ? error : new Error(String(error));
                        const lastStep = steps[steps.length - 1];
                        if (lastStep) {
                          lastStep.status = 'error';
                          lastStep.error = errorObj.message;
                          lastStep.errorStack = errorObj.stack;
                          lastStep.data = {
                            errorType: errorObj.constructor.name,
                            errorName: errorObj.name,
                            fullError: JSON.stringify(errorObj, Object.getOwnPropertyNames(errorObj), 2),
                          };
                        }
                        setQuickAuthTest({ 
                          status: 'error', 
                          steps: [...steps],
                        });
                      }
                    }}
                    disabled={quickAuthTest.status === 'testing' || !quickAuthInfo.available}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded transition-colors mt-2"
                  >
                    {quickAuthTest.status === 'testing' ? 'Testing...' : 'Test Quick Auth Flow'}
                  </button>
                  
                  {quickAuthTest.status !== 'idle' && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs font-semibold text-gray-200">Test Results:</div>
                      <div className="space-y-1">
                        {quickAuthTest.steps.map((step, index) => (
                          <div key={index} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span>
                                {step.status === 'pending' && '⏳'}
                                {step.status === 'success' && '✅'}
                                {step.status === 'error' && '❌'}
                              </span>
                              <span className={step.status === 'error' ? 'text-red-400' : step.status === 'success' ? 'text-green-400' : 'text-gray-400'}>
                                {step.step}
                              </span>
                            </div>
                            {step.details && (
                              <div className="ml-6 text-gray-400 text-xs">{step.details}</div>
                            )}
                            {step.error && (
                              <div className="ml-6 text-red-400 text-xs mt-1">
                                <div className="font-semibold">Error: {step.error}</div>
                                {step.errorStack && (
                                  <details className="mt-1">
                                    <summary className="cursor-pointer text-red-300">Stack trace</summary>
                                    <pre className="mt-1 text-xs font-mono whitespace-pre-wrap break-all bg-red-950/50 p-2 rounded overflow-x-auto">
                                      {step.errorStack}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            )}
                            {step.data && (
                              <details className="ml-6 mt-1">
                                <summary className="cursor-pointer text-blue-400 text-xs">View data</summary>
                                <pre className="mt-1 text-xs font-mono whitespace-pre-wrap break-all bg-gray-900 p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
                                  {JSON.stringify(step.data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                      {quickAuthTest.token && (
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <div className="text-xs text-gray-400 mb-1">Token (first 50 chars):</div>
                          <div className="text-xs font-mono bg-gray-900 p-2 rounded break-all">
                            {quickAuthTest.token.substring(0, 50)}...
                          </div>
                          {quickAuthTest.tokenDetails?.expiresAt && (
                            <div className="text-xs text-gray-400 mt-1">
                              Expires: {quickAuthTest.tokenDetails.expiresAt}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
                embeddedMiniApps.map((app, index) => {
                  const debugInfo = iframeDebugInfo.get(app.id);
                  return (
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
                        {debugInfo && (
                          <>
                            <div className="flex justify-between">
                              <span>Iframe Ready:</span>
                              <span className={debugInfo.hasContentWindow ? "text-green-400" : "text-yellow-400"}>
                                {debugInfo.hasContentWindow ? "✅ Yes" : "⚠️ No contentWindow"}
                              </span>
                            </div>
                            {debugInfo.origin && (
                              <div>
                                <strong>PostMessage Origin:</strong>
                                <div className="text-xs font-mono bg-gray-950 p-1 rounded mt-1 break-all">
                                  {debugInfo.origin}
                                </div>
                              </div>
                            )}
                            {debugInfo.setupError && (
                              <div className="text-red-400 text-xs mt-2 p-2 bg-red-900/20 rounded">
                                <strong>Setup Error:</strong> {debugInfo.setupError}
                              </div>
                            )}
                              </>
                        )}
                        <div className="text-xs text-gray-400 mt-1 pt-1 border-t border-gray-700">
                          Context provided via Comlink (sdk.context from @farcaster/miniapp-sdk)
                        </div>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-blue-400 text-xs">View full context data</summary>
                          <pre className="mt-1 text-xs font-mono whitespace-pre-wrap break-all bg-gray-950 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                            {JSON.stringify(contextForEmbedded, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  );
                })
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

        {/* Debugging Notes */}
        <div className="bg-gray-800 p-3 rounded">
          <button
            onClick={() => toggleSection('debug-notes')}
            className="w-full text-left font-semibold text-gray-200 flex items-center justify-between"
          >
            <span>Debugging Notes</span>
            <span>{expandedSections.has('debug-notes') ? '▼' : '▶'}</span>
          </button>
          {expandedSections.has('debug-notes') && (
            <div className="mt-2 space-y-2 text-xs text-gray-300">
              <div>
                <strong className="text-gray-200">What to check:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 ml-2">
                  <li>Iframe has contentWindow (required for Comlink setup)</li>
                  <li>Valid origin determined (required for secure postMessage)</li>
                  <li>No setup errors (check console for detailed errors)</li>
                  <li>Context is available (SDK context must be non-null)</li>
                </ul>
              </div>
              <div>
                <strong className="text-gray-200">To verify Comlink is working:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 ml-2">
                  <li>Open browser DevTools → Network tab</li>
                  <li>Filter by &quot;WS&quot; or check Console for Comlink messages</li>
                  <li>In the embedded mini-app console, try: <code className="bg-gray-900 px-1 rounded">await sdk.context</code></li>
                  <li>Check if the mini-app can access context successfully</li>
                </ul>
              </div>
              <div>
                <strong className="text-gray-200">To verify Quick Auth works:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 ml-2">
                  <li>Click &quot;Test Quick Auth Flow&quot; button above to test prerequisites and flow</li>
                  <li>From within an embedded mini-app, call: <code className="bg-gray-900 px-1 rounded">await sdk.quickAuth.getToken()</code></li>
                  <li>Check browser console for Quick Auth logs: <code className="bg-gray-900 px-1 rounded">[Quick Auth]</code></li>
                  <li>Verify token is a valid JWT (3 parts separated by dots)</li>
                  <li>Check token expiration (should be ~1 hour from issue time)</li>
                  <li>If CSP errors occur, ensure <code className="bg-gray-900 px-1 rounded">https://auth.farcaster.xyz</code> is allowed in CSP headers</li>
                </ul>
              </div>
              <div>
                <strong className="text-gray-200">Quick Auth Flow (matches Farcaster SDK):</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1 ml-2">
                  <li><code className="bg-gray-900 px-1 rounded">generateNonce()</code> - Get nonce from auth.farcaster.xyz</li>
                  <li><code className="bg-gray-900 px-1 rounded">signIn({`{nonce}`})</code> - Sign SIWE message with Farcaster authenticator</li>
                  <li><code className="bg-gray-900 px-1 rounded">verifySiwf()</code> - Verify signature and get JWT token</li>
                  <li>Token is cached per iframe (reused if valid)</li>
                </ol>
              </div>
              <div>
                <strong className="text-gray-200">Common issues:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 ml-2">
                  <li>No contentWindow: iframe not loaded yet, wait for load event</li>
                  <li>Origin errors: URL parsing failed, check iframe src/srcdoc</li>
                  <li>No context: SDK not initialized or not running in mini-app</li>
                  <li>CSP blocking auth.farcaster.xyz: Update Content Security Policy headers</li>
                  <li>No authenticator: AuthenticatorManager must be available for standalone mode</li>
                  <li>User not logged in: User FID required for Quick Auth</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


