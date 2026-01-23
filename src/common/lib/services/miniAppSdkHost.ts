/**
 * Comlink handler for providing Farcaster Mini App SDK to embedded mini-apps
 * 
 * This service acts as the SDK host, exposing the full SDK API via Comlink
 * so that embedded mini-apps can access context, actions, and other SDK features.
 * 
 * The SDK uses Comlink's windowEndpoint to communicate with the parent window.
 * We use Comlink's expose to create an endpoint that handles postMessage communication.
 */

import type { Context } from "@farcaster/miniapp-core";
import { expose, windowEndpoint } from "comlink";

/**
 * Create a minimal fallback context when the real SDK context is not available
 * This allows embedded mini-apps to work even when Nounspace is not embedded in a Farcaster client
 */
function createFallbackContext(): Context.MiniAppContext {
  return {
    client: {
      version: "1.0.0",
      platform: typeof window !== 'undefined' ? 'web' : 'unknown',
    },
    user: undefined, // No user when not in Farcaster client
    location: {
      type: "launcher",
    },
    features: {},
  };
}

/**
 * Extract EventSource type from Comlink's windowEndpoint function signature
 * windowEndpoint(context: EventSource, ...) uses EventSource as its second parameter
 * This is the proper way to get the type since it's not directly exported
 */
type EventSource = Parameters<typeof windowEndpoint>[1];

/**
 * Quick Auth token cache
 * Stores token and expiration time to avoid unnecessary requests
 */
interface QuickAuthTokenCache {
  token: string;
  expiresAt: number; // Timestamp in milliseconds
}

/**
 * Quick Auth state per iframe
 * Each iframe gets its own token cache
 */
const quickAuthCache = new WeakMap<HTMLIFrameElement, QuickAuthTokenCache>();

export type MiniAppSdkHostAPI = {
  // Context access - the SDK expects this as a property, not a method
  context: Promise<Context.MiniAppContext>;
  
  // Detection
  isInMiniApp: () => Promise<boolean>;
  
  // Actions
  actions: {
    ready: (options?: { disableNativeGestures?: boolean }) => Promise<void>;
    close: () => Promise<void>;
    signIn: (options: { nonce: string; acceptAuthAddress?: boolean }) => Promise<{ result: { signature: string; message: string; authMethod: 'custody' | 'authAddress' } } | { error: { type: 'rejected_by_user' } }>;
    addFrame: () => Promise<boolean>;
    openUrl: (url: string) => Promise<boolean>;
    viewProfile: (fid: number) => Promise<boolean>;
    openMiniApp: (url: string) => Promise<boolean>;
  };
  
  // Quick Auth - lightweight authentication service
  quickAuth: {
    getToken: () => Promise<{ token: string }>;
    fetch: (url: string, init?: RequestInit) => Promise<Response>;
    token: string | null;
  };
  
  // Wallet
  wallet: {
    ethProvider: unknown | null;
  };
  
  // Events (stubs - full event system would require more complex setup)
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  
  // Capabilities
  getCapabilities: () => Promise<string[]>;
};

/**
 * Options for creating a mini-app SDK host
 */
export interface MiniAppSdkHostOptions {
  /** Real SDK instance if Nounspace is embedded in a Farcaster client */
  realSdk?: {
    quickAuth?: {
      getToken: () => Promise<{ token: string }>;
      fetch: (url: string, init?: RequestInit) => Promise<Response>;
      token: string | null;
    };
  } | null;
  /** Authenticator manager for signing when standalone */
  authenticatorManager?: {
    callMethod: (
      callSignature: {
        requestingFidgetId: string;
        authenticatorId: string;
        methodName: string;
        isLookup?: boolean;
      },
      ...args: any[]
    ) => Promise<{ result: string; value?: any; reason?: string }>;
  } | null;
  /** FID of the user for Quick Auth */
  userFid?: number;
}

/**
 * Create a Comlink-exposed SDK host API
 * This matches the structure expected by @farcaster/miniapp-sdk
 */
export function createMiniAppSdkHost(
  context: Context.MiniAppContext,
  ethProvider?: unknown,
  iframe?: HTMLIFrameElement,
  domain?: string,
  options?: MiniAppSdkHostOptions
): MiniAppSdkHostAPI {
  // Token cache for Quick Auth (not used directly, but kept for potential future use)
  // const tokenCache: QuickAuthTokenCache | undefined = iframe ? quickAuthCache.get(iframe) : undefined;
  
  // Create actions object first so we can reference signIn from quickAuth
  // Wrap signIn to ensure it always returns a valid response, even if there's an unexpected error
  const signInImpl = async (signInOptions: { nonce: string; acceptAuthAddress?: boolean; notBefore?: string; expirationTime?: string }): Promise<{ result: { signature: string; message: string; authMethod: 'custody' | 'authAddress' } } | { error: { type: 'rejected_by_user' } }> => {
        // Implement signIn to return SIWE message and signature for Quick Auth
        // This matches what the SDK expects from miniAppHost.signIn()
        // The SDK's quickAuth.getToken() calls this to get a SIWE message and signature
        
        console.log('[Quick Auth] signIn called with options:', {
          nonce: signInOptions.nonce,
          acceptAuthAddress: signInOptions.acceptAuthAddress,
          hasUserFid: !!context.user?.fid,
          hasAuthenticatorManager: !!options?.authenticatorManager,
        });
        
        if (!context.user?.fid) {
          console.warn('[Quick Auth] signIn: No user FID in context');
          return { error: { type: 'rejected_by_user' } };
        }
        
        if (!options?.authenticatorManager) {
          console.warn('[Quick Auth] signIn: No authenticator manager available');
          return { error: { type: 'rejected_by_user' } };
        }
        
        const authenticatorManager = options.authenticatorManager;
        
        try {
          const { SiweMessage } = await import('siwe');
          
          // For Quick Auth, the domain should be OUR domain (where the user is signing in),
          // NOT the embedded app's domain. The token will be scoped to our domain.
          const signInDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
          
          // Get Ethereum address if available
          let signerAddress = '0x0000000000000000000000000000000000000000';
          if (ethProvider && typeof (ethProvider as any).request === 'function') {
            try {
              const accounts = await (ethProvider as any).request({ method: 'eth_accounts' });
              if (accounts && accounts.length > 0) {
                signerAddress = accounts[0];
              }
            } catch {
              // Use placeholder address
            }
          }
          
          // Construct SIWE message
          // Domain should be OUR domain (where user is signing in), not the embedded app's domain
          const siweMessage = new SiweMessage({
            domain: signInDomain,
            address: signerAddress,
            statement: 'Sign in with Farcaster',
            uri: typeof window !== 'undefined' ? window.location.origin : 'https://nounspace.xyz',
            version: '1',
            chainId: 1,
            nonce: signInOptions.nonce,
            issuedAt: new Date().toISOString(),
            notBefore: signInOptions.notBefore,
            expirationTime: signInOptions.expirationTime,
          });
          
          const message = siweMessage.prepareMessage();
          const messageBytes = new TextEncoder().encode(message);
          
          // Sign with Farcaster authenticator
          const signResult = await authenticatorManager.callMethod(
            {
              requestingFidgetId: 'nounspace-miniapp-host',
              authenticatorId: 'farcaster:nounspace',
              methodName: 'signMessage',
              isLookup: false,
            },
            messageBytes
          );
          
          if (signResult.result !== 'success' || !signResult.value) {
            return { error: { type: 'rejected_by_user' } };
          }
          
          // Convert signature to hex string
          const signature = Array.from(signResult.value as Uint8Array)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          
          return {
            result: {
              signature: `0x${signature}`,
              message,
              authMethod: signInOptions.acceptAuthAddress ? 'authAddress' : 'custody',
            },
          };
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          console.error('[Quick Auth] Sign in error:', {
            message: errorObj.message,
            name: errorObj.name,
            stack: errorObj.stack,
            fullError: errorObj,
            signInOptions,
            domain: signInDomain,
            signerAddress,
          });
          // Always return a valid error response - never throw or return undefined
          return { error: { type: 'rejected_by_user' } };
        }
  };
  
  const actions = {
    async ready(options?: { disableNativeGestures?: boolean }): Promise<void> {
        // Stub - in a real implementation, this would hide splash screen
        // For embedded apps, we don't have a splash screen to hide
        return Promise.resolve();
      },
      
      async close(): Promise<void> {
        // Stub - in a real implementation, this would close the mini-app
        // For embedded apps, we can't close the parent window
        return Promise.resolve();
      },
      
      async signIn(signInOptions: { nonce: string; acceptAuthAddress?: boolean; notBefore?: string; expirationTime?: string }): Promise<{ result: { signature: string; message: string; authMethod: 'custody' | 'authAddress' } } | { error: { type: 'rejected_by_user' } }> {
        // Wrap the implementation to ensure it always returns a valid response
        // This prevents undefined from being returned, which would cause the SDK to fail
        try {
          const result = await signInImpl(signInOptions);
          // Ensure we never return undefined
          if (!result) {
            console.error('[Quick Auth] signIn wrapper: signInImpl returned undefined');
            return { error: { type: 'rejected_by_user' } };
          }
          return result;
        } catch (error) {
          console.error('[Quick Auth] signIn wrapper: Unexpected error', error);
          // Always return a valid error response - never throw or return undefined
          return { error: { type: 'rejected_by_user' } };
        }
      },
      
      async addFrame(): Promise<boolean> {
        // Stub - in a real implementation, this would add the mini-app to the client
        // For embedded apps, this doesn't make sense
        return false;
      },
      
      async openUrl(url: string): Promise<boolean> {
        // Open URL in parent window
        try {
          if (typeof window !== 'undefined' && window.parent) {
            window.parent.open(url, '_blank');
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      
      async viewProfile(fid: number): Promise<boolean> {
        // Stub - in a real implementation, this would navigate to profile
        // For embedded apps, we could navigate the parent window
        return false;
      },
      
      async openMiniApp(url: string): Promise<boolean> {
        // Stub - in a real implementation, this would open another mini-app
        // For embedded apps, we could navigate the parent window
        return false;
      },
  };
  
  return {
    // Context access - SDK expects this as a Promise property
    context: Promise.resolve(context),
    
    // Detection
    async isInMiniApp(): Promise<boolean> {
      return true; // If we're providing the SDK, we're in a mini-app context
    },
    
    // Actions (defined above)
    actions,
    
    // Quick Auth - lightweight authentication service
    // See: https://miniapps.farcaster.xyz/docs/sdk/quick-auth
    // Uses the SDK's exact pattern: generateNonce -> signIn -> verifySiwf
    quickAuth: {
      async getToken(): Promise<{ token: string }> {
        const userFid = context.user?.fid || options?.userFid;
        if (!userFid) {
          throw new Error('User FID is required for Quick Auth');
        }
        
        if (!iframe || !domain) {
          throw new Error('Quick Auth requires iframe and domain information');
        }
        
        // Check if we have a valid cached token
        const cached = quickAuthCache.get(iframe);
        const now = Date.now();
        
        if (cached && cached.expiresAt > now + 60000) {
          // Token is still valid (with 1 minute buffer)
          return { token: cached.token };
        }
        
        // Determine if we're getting a token for ourselves (Nounspace) or for an embedded mini-app
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : null;
        const isTokenForEmbeddedApp = currentDomain && domain !== currentDomain;
        
        if (isTokenForEmbeddedApp) {
          console.log(`[Quick Auth] Getting token for embedded app domain: ${domain} (current: ${currentDomain})`);
        }
        
        // Strategy 1: If we have the real SDK AND we're getting a token for ourselves (not an embedded app)
        // Only use the real SDK when the domain matches, because it will generate a token for the current domain
        if (options?.realSdk?.quickAuth && !isTokenForEmbeddedApp) {
          console.log('[Quick Auth] Using real SDK for token (domain matches)');
          try {
            const result = await options.realSdk.quickAuth.getToken();
            // Cache the token
            if (iframe && result.token) {
              quickAuthCache.set(iframe, {
                token: result.token,
                expiresAt: now + (60 * 60 * 1000), // Assume 1 hour expiration
              });
            }
            return result;
          } catch (error) {
            console.warn('Failed to get token from real SDK, falling back to standalone:', error);
            // Fall through to standalone implementation
          }
        }
        
        // Strategy 2: Use SDK's pattern with our signIn implementation
        // This follows the exact same flow as the SDK: generateNonce -> signIn -> verifySiwf
        console.log(`[Quick Auth] Using SDK pattern with our signIn implementation for domain: ${domain}`);
        try {
          const { createLightClient } = await import('@farcaster/quick-auth/light');
          const { SiweMessage } = await import('siwe');
          
          const quickAuthClient = createLightClient({
            origin: 'https://auth.farcaster.xyz',
          });
          
          // Step 1: Generate nonce (same as SDK)
          console.log('[Quick Auth] Step 1: Generating nonce from auth.farcaster.xyz');
          const { nonce } = await quickAuthClient.generateNonce();
          console.log('[Quick Auth] Step 1: Nonce generated:', nonce);
          
          // Step 2: Call our signIn implementation (same as SDK calls miniAppHost.signIn)
          console.log('[Quick Auth] Step 2: Calling signIn with nonce:', nonce);
          let signInResponse: Awaited<ReturnType<typeof actions.signIn>>;
          try {
            signInResponse = await actions.signIn({
              nonce,
              acceptAuthAddress: true,
            });
          } catch (error) {
            console.error('[Quick Auth] Step 2: signIn threw an error (should not happen)', error);
            throw new Error(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          // Defensive check: ensure signInResponse is defined
          if (!signInResponse) {
            console.error('[Quick Auth] Step 2: signIn returned undefined');
            throw new Error('Sign in failed: no response from signIn');
          }
          
          // Type guard for discriminated union: check if 'error' property exists
          if ('error' in signInResponse) {
            console.error('[Quick Auth] Step 2: Sign in rejected:', signInResponse.error);
            throw new Error('Sign in rejected');
          }
          
          // Defensive check: ensure result property exists
          if (!signInResponse.result) {
            console.error('[Quick Auth] Step 2: signIn response missing result property', signInResponse);
            throw new Error('Sign in failed: response missing result property');
          }
          
          console.log('[Quick Auth] Step 2: Sign in successful', {
            messageLength: signInResponse.result.message.length,
            signatureLength: signInResponse.result.signature.length,
            authMethod: signInResponse.result.authMethod,
            messagePreview: signInResponse.result.message.substring(0, 100) + '...',
          });
          
          // TypeScript now knows signInResponse has result property
          // Step 3: Parse SIWE message to get domain (same as SDK)
          // SiweMessage constructor can parse a message string
          console.log('[Quick Auth] Step 3: Parsing SIWE message');
          const parsedSiwe = new SiweMessage(signInResponse.result.message);
          
          if (!parsedSiwe.domain) {
            console.error('[Quick Auth] Step 3: Missing domain on SIWE message', parsedSiwe);
            throw new Error('Missing domain on SIWE message');
          }
          
          console.log('[Quick Auth] Step 3: SIWE message parsed', {
            domain: parsedSiwe.domain,
            address: parsedSiwe.address,
            uri: parsedSiwe.uri,
            nonce: parsedSiwe.nonce,
          });
          
          // Step 4: Verify SIWE and get token (same as SDK)
          console.log('[Quick Auth] Step 4: Verifying SIWF and getting token', {
            domain: parsedSiwe.domain,
            messageLength: signInResponse.result.message.length,
            signatureLength: signInResponse.result.signature.length,
            fullMessage: signInResponse.result.message,
            fullSignature: signInResponse.result.signature,
          });
          const verifyResult = await quickAuthClient.verifySiwf({
            domain: parsedSiwe.domain,
            message: signInResponse.result.message,
            signature: signInResponse.result.signature,
          });
          console.log('[Quick Auth] Step 4: Token received', {
            tokenLength: verifyResult.token.length,
            tokenPrefix: verifyResult.token.substring(0, 50) + '...',
          });
          
          // Cache the token
          if (iframe) {
            quickAuthCache.set(iframe, {
              token: verifyResult.token,
              expiresAt: now + (60 * 60 * 1000), // Assume 1 hour expiration
            });
          }
          
          return { token: verifyResult.token };
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          
          // Try to extract more details from the error
          const errorDetails: any = {
            message: errorObj.message,
            name: errorObj.name,
            stack: errorObj.stack,
          };
          
          // Check if error has response property (common in fetch-based errors)
          if ((error as any).response) {
            errorDetails.response = {
              status: (error as any).response.status,
              statusText: (error as any).response.statusText,
              url: (error as any).response.url,
            };
            // Try to get response body if available
            try {
              if ((error as any).response.body) {
                errorDetails.responseBody = await (error as any).response.text();
              }
            } catch {
              // Ignore errors reading response body
            }
          }
          
          // Check for other common error properties
          if ((error as any).status) errorDetails.status = (error as any).status;
          if ((error as any).statusText) errorDetails.statusText = (error as any).statusText;
          if ((error as any).url) errorDetails.url = (error as any).url;
          if ((error as any).body) errorDetails.body = (error as any).body;
          
          // Log all error properties
          console.error('[Quick Auth] Token fetch failed:', {
            ...errorDetails,
            allErrorProperties: Object.keys(error),
            fullError: errorObj,
          });
          
          throw new Error(
            `Failed to get Quick Auth token: ${errorObj.message}${errorObj.stack ? `\nStack: ${errorObj.stack}` : ''}`
          );
        }
      },
      
      async fetch(url: string, init?: RequestInit): Promise<Response> {
        // Determine if we're fetching for an embedded mini-app or for ourselves
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : null;
        let isFetchForEmbeddedApp = false;
        
        if (currentDomain && domain) {
          try {
            const urlDomain = new URL(url).hostname;
            // If the URL domain matches the embedded app's domain (not our domain), use standalone
            isFetchForEmbeddedApp = urlDomain === domain && urlDomain !== currentDomain;
          } catch {
            // If URL parsing fails, fall back to checking if domain is different
            isFetchForEmbeddedApp = domain !== currentDomain;
          }
        }
        
        // Strategy 1: If we have the real SDK AND we're fetching for ourselves (not an embedded app)
        // Only use the real SDK when fetching for our own domain
        if (options?.realSdk?.quickAuth && !isFetchForEmbeddedApp) {
          try {
            return await options.realSdk.quickAuth.fetch(url, init);
          } catch (error) {
            console.warn('Failed to fetch via real SDK, falling back to standalone:', error);
            // Fall through to standalone implementation
          }
        }
        
        // Strategy 2: Standalone - get token and make request
        // This is used when:
        // - We don't have the real SDK
        // - We're fetching for an embedded mini-app (different domain)
        // - The real SDK failed
        const { token } = await this.getToken();
        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${token}`);
        
        return fetch(url, {
          ...init,
          headers,
        });
      },
      
      get token(): string | null {
        // Strategy 1: If we have the real SDK, use its token
        if (options?.realSdk?.quickAuth?.token) {
          return options.realSdk.quickAuth.token;
        }
        
        // Strategy 2: Return cached token if present and not expired
        if (!iframe) return null;
        
        const cached = quickAuthCache.get(iframe);
        if (cached && cached.expiresAt > Date.now()) {
          return cached.token;
        }
        
        return null;
      },
    },
    
    // Wallet
    wallet: {
      ethProvider: ethProvider || null,
    },
    
    // Events (stubs)
    on(event: string, callback: (...args: any[]) => void): void {
      // Stub - full event system would require more complex setup
      // For now, we don't support events
    },
    
    off(event: string, callback?: (...args: any[]) => void): void {
      // Stub - full event system would require more complex setup
    },
    
    // Capabilities
    async getCapabilities(): Promise<string[]> {
      // Return list of supported capabilities
      // Based on what we can actually support
      return [
        'context',
        'isInMiniApp',
        'actions.ready',
        'actions.close',
        'actions.signIn',
        'actions.openUrl',
        'quickAuth.getToken', // Stub implementation
        'quickAuth.fetch', // Stub implementation
        // Note: Some actions may not be fully supported in embedded context
      ];
    },
  };
}

/**
 * Create a filtered EventSource that only receives messages from a specific iframe
 * This is used with Comlink's windowEndpoint to filter messages when multiple iframes are present
 */
function createFilteredEventSource(iframe: HTMLIFrameElement): EventSource {
  // Create an event target that filters messages from this specific iframe
  const eventTarget: EventSource = {
    addEventListener: (type: string, listener: EventListener) => {
      if (type === 'message') {
        const wrappedListener = (event: MessageEvent) => {
          // Only handle messages from this specific iframe
          if (event.source === iframe.contentWindow) {
            (listener as (event: MessageEvent) => void)(event);
          }
        };
        window.addEventListener('message', wrappedListener);
        // Store the wrapped listener for cleanup
        (listener as any).__wrappedListener = wrappedListener;
      }
    },
    removeEventListener: (type: string, listener: EventListener) => {
      if (type === 'message') {
        const wrappedListener = (listener as any).__wrappedListener || listener;
        window.removeEventListener('message', wrappedListener);
      }
    },
  };
  return eventTarget;
}

/**
 * Set up Comlink handler for an iframe
 * This exposes the SDK API to the embedded mini-app via postMessage
 */
export function setupComlinkHandler(
  iframe: HTMLIFrameElement,
  context: Context.MiniAppContext,
  ethProvider?: unknown,
  targetOrigin?: string,
  options?: MiniAppSdkHostOptions
): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op on server
  }

  // Determine target origin and domain for Quick Auth
  // Never use '*' as origin - it's unsafe and allows any origin to receive messages
  let origin: string | null = null;
  
  if (targetOrigin) {
    // Validate targetOrigin is a valid URL
    try {
      new URL(targetOrigin); // Validate it's a valid URL
      origin = targetOrigin;
    } catch {
      console.error('[MiniApp SDK Host] Invalid targetOrigin provided:', targetOrigin);
      throw new Error(`Invalid targetOrigin: ${targetOrigin}. Must be a valid URL.`);
    }
  } else if (iframe.src) {
    // Try to extract origin from iframe.src
    try {
      origin = new URL(iframe.src).origin;
    } catch (error) {
      console.error('[MiniApp SDK Host] Cannot parse iframe.src to extract origin:', iframe.src, error);
      throw new Error(`Cannot determine origin from iframe.src: ${iframe.src}. Provide targetOrigin explicitly.`);
    }
  } else {
    // No targetOrigin and no iframe.src - cannot determine origin safely
    console.error('[MiniApp SDK Host] Cannot determine origin: no targetOrigin and no iframe.src');
    throw new Error('Cannot determine origin for postMessage. Either provide targetOrigin or ensure iframe has a valid src.');
  }
  
  if (!origin || origin === '*') {
    throw new Error('Origin cannot be null or "*". This is unsafe for postMessage.');
  }
  
  const domain = (() => {
    try {
      if (iframe.src) {
        const hostname = new URL(iframe.src).hostname;
        console.log(`[Quick Auth] Extracted domain from iframe.src: ${hostname}`);
        return hostname;
      }
      if (targetOrigin) {
        const hostname = new URL(targetOrigin).hostname;
        console.log(`[Quick Auth] Extracted domain from targetOrigin: ${hostname}`);
        return hostname;
      }
      // Fallback to current window's hostname
      const fallback = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      console.log(`[Quick Auth] Using fallback domain: ${fallback}`);
      return fallback;
    } catch (error) {
      const fallback = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      console.warn(`[Quick Auth] Failed to extract domain, using fallback: ${fallback}`, error);
      return fallback;
    }
  })();

  // Create the SDK host API with Quick Auth support
  const sdkHost = createMiniAppSdkHost(context, ethProvider, iframe, domain, options);
  
  // Create endpoint using Comlink's windowEndpoint with filtered context
  // We use a filtered EventSource to only receive messages from this specific iframe
  // This is necessary when multiple iframes are present on the page
  if (!iframe.contentWindow) {
    throw new Error('Cannot create endpoint: iframe.contentWindow is not available');
  }
  const filteredContext = createFilteredEventSource(iframe);
  const endpoint = windowEndpoint(iframe.contentWindow, filteredContext, origin);
  
  // Expose the SDK API via Comlink
  expose(sdkHost, endpoint);
  
  // Return cleanup function
  return () => {
    // Clean up token cache
    quickAuthCache.delete(iframe);
    // Cleanup is handled by Comlink and the endpoint
    // The endpoint's message handler will be cleaned up when the iframe is removed
  };
}

