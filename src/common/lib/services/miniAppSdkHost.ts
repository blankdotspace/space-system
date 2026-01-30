/**
 * Comlink handler for providing Farcaster Mini App SDK to embedded mini-apps
 *
 * This service acts as the SDK host, exposing the WireMiniAppHost API via Comlink
 * so that embedded mini-apps can access context, actions, and other SDK features.
 *
 * The SDK uses Comlink's windowEndpoint to communicate with the parent window.
 * We use Comlink's expose to create an endpoint that handles postMessage communication.
 *
 * API Structure: This implements the flat WireMiniAppHost interface that the official
 * @farcaster/miniapp-sdk expects. Methods like signIn, ready, close are at the top level.
 */

import type { Context } from "@farcaster/miniapp-core";
import { expose, windowEndpoint } from "comlink";

/**
 * Extract EventSource type from Comlink's windowEndpoint function signature
 */
type EventSource = Parameters<typeof windowEndpoint>[1];

/**
 * SignIn options matching the official SDK
 */
interface SignInOptions {
  nonce: string;
  notBefore?: string;
  expirationTime?: string;
  acceptAuthAddress?: boolean;
}

/**
 * SignIn result types matching the official SDK wire format
 */
type SignInResult = {
  signature: string;
  message: string;
  authMethod: 'custody' | 'authAddress';
};

type SignInJsonResult =
  | { result: SignInResult }
  | { error: { type: 'rejected_by_user' } };

/**
 * ComposeCast options
 */
interface ComposeCastOptions {
  text?: string;
  embeds?: string[];
  parentCastHash?: string;
}

/**
 * Token info for swap/send operations
 */
interface TokenInfo {
  address: string;
  chainId: number;
}

/**
 * WireMiniAppHost - The flat API structure expected by @farcaster/miniapp-sdk
 *
 * This matches the official Farcaster Mini App host interface.
 * The SDK wraps this with Comlink and calls methods directly (e.g., miniAppHost.signIn()).
 */
export type WireMiniAppHost = {
  // Context - SDK expects this as a Promise property
  context: Promise<Context.MiniAppContext>;

  // Core lifecycle
  ready: (options?: { disableNativeGestures?: boolean }) => Promise<void>;
  close: () => Promise<void>;

  // Authentication
  signIn: (options: SignInOptions) => Promise<SignInJsonResult>;

  // Navigation & URLs
  openUrl: (url: string) => Promise<boolean>;
  viewProfile: (fid: number) => Promise<void>;
  viewCast: (hash: string) => Promise<void>;

  // Mini-app management
  addMiniApp: () => Promise<void>;
  openMiniApp: (url: string) => Promise<void>;

  // Cast composition
  composeCast: (options: ComposeCastOptions) => Promise<{ hash?: string } | null>;

  // Token operations
  sendToken: (
    options: { token: string; amount: string; recipientFid?: number }
  ) => Promise<{ transactionHash?: string } | null>;
  swapToken: (
    options: { sell: TokenInfo; buy: TokenInfo; sellAmount?: string }
  ) => Promise<{ transactionHash?: string } | null>;
  viewToken: (options: { token: string; chainId?: number }) => Promise<void>;

  // Ethereum provider (EIP-1193)
  ethProviderRequest: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  ethProviderRequestV2: (args: { method: string; params?: unknown[] }) => Promise<unknown>;

  // Solana provider
  solanaProviderRequest: (args: { method: string; params?: unknown }) => Promise<unknown>;

  // Haptics
  impactOccurred: (style: 'light' | 'medium' | 'heavy') => Promise<void>;
  notificationOccurred: (type: 'success' | 'warning' | 'error') => Promise<void>;
  selectionChanged: () => Promise<void>;

  // UI controls
  setPrimaryButton: (options: { text: string; disabled?: boolean; hidden?: boolean }) => Promise<void>;
  updateBackState: (options: { enabled: boolean }) => Promise<void>;
  requestCameraAndMicrophoneAccess: () => Promise<boolean>;

  // Capabilities
  getCapabilities: () => Promise<string[]>;
  getChains: () => Promise<string[]>;

  // Manifest signing (for app verification)
  signManifest: (
    options: { domain: string; manifest: unknown }
  ) => Promise<{ signature: string } | { error: { type: string } }>;
};

/**
 * Options for creating a mini-app SDK host
 */
export interface MiniAppSdkHostOptions {
  /** Authenticator manager for signing when standalone */
  authenticatorManager?: {
    callMethod: (
      callSignature: {
        requestingFidgetId: string;
        authenticatorId: string;
        methodName: string;
        isLookup?: boolean;
      },
      ...args: unknown[]
    ) => Promise<{ result: string; value?: unknown; reason?: string }>;
  } | null;
  /** FID of the user */
  userFid?: number;
}

/**
 * Create a Comlink-exposed SDK host API
 *
 * This implements the flat WireMiniAppHost interface expected by @farcaster/miniapp-sdk.
 * The SDK calls methods directly like miniAppHost.signIn(), not miniAppHost.actions.signIn().
 */
export function createMiniAppSdkHost(
  context: Context.MiniAppContext,
  ethProvider?: unknown,
  _iframe?: HTMLIFrameElement,
  _domain?: string,
  options?: MiniAppSdkHostOptions
): WireMiniAppHost {
  return {
    // =========================================================================
    // Context - SDK expects this as a Promise property
    // =========================================================================
    context: Promise.resolve(context),

    // =========================================================================
    // Core lifecycle
    // =========================================================================
    async ready(_options?: { disableNativeGestures?: boolean }): Promise<void> {
      // In embedded context, we don't have a splash screen to hide
      // This is a no-op but must be implemented for SDK compatibility
      return;
    },

    async close(): Promise<void> {
      // In embedded context, we can't close the parent window
      // This is a no-op but must be implemented for SDK compatibility
      return;
    },

    // =========================================================================
    // Authentication - Critical for Quick Auth
    // The SDK's quickAuth.getToken() calls this method internally
    // =========================================================================
    async signIn(signInOptions: SignInOptions): Promise<SignInJsonResult> {
      if (!context.user?.fid) {
        console.warn('[MiniApp Host] signIn: No user FID in context');
        return { error: { type: 'rejected_by_user' } };
      }

      if (!options?.authenticatorManager) {
        console.warn('[MiniApp Host] signIn: No authenticator manager available');
        return { error: { type: 'rejected_by_user' } };
      }

      const authenticatorManager = options.authenticatorManager;

      try {
        const { SiweMessage } = await import('siwe');

        // Domain should be the iframe's origin (mini-app), not the host window
        // This ties the SIWE signature to the requesting mini-app's domain
        let signInDomain: string;
        let signInUri: string;
        if (_domain) {
          try {
            const domainUrl = new URL(_domain);
            signInDomain = domainUrl.hostname;
            signInUri = domainUrl.origin;
          } catch {
            // Fallback to window location if domain is invalid
            signInDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
            signInUri = typeof window !== 'undefined' ? window.location.origin : 'https://nounspace.com';
          }
        } else {
          signInDomain = typeof window !== 'undefined'
            ? window.location.hostname
            : 'localhost';
          signInUri = typeof window !== 'undefined'
            ? window.location.origin
            : 'https://nounspace.com';
        }

        // Get Ethereum address if available
        let signerAddress = '0x0000000000000000000000000000000000000000';
        const hasRequest = ethProvider &&
          typeof (ethProvider as { request?: unknown }).request === 'function';
        if (hasRequest) {
          try {
            type EthProvider = { request: (a: { method: string }) => Promise<string[]> };
            const accounts = await (ethProvider as EthProvider).request({
              method: 'eth_accounts',
            });
            if (accounts && accounts.length > 0) {
              signerAddress = accounts[0];
            }
          } catch {
            // Use placeholder address
          }
        }

        // Construct SIWE message
        const siweMessage = new SiweMessage({
          domain: signInDomain,
          address: signerAddress,
          statement: 'Sign in with Farcaster',
          uri: signInUri,
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
          console.warn(
            '[MiniApp Host] signIn: Signing failed.',
            'result:', signResult.result,
            'reason:', signResult.reason,
            'hasValue:', !!signResult.value
          );
          return { error: { type: 'rejected_by_user' } };
        }

        // Convert signature to hex string
        // Handle both Uint8Array and serialized object formats
        let signatureBytes: number[];
        const rawValue = signResult.value;
        if (rawValue instanceof Uint8Array) {
          signatureBytes = Array.from(rawValue);
        } else if (typeof rawValue === 'object' && rawValue !== null) {
          // Handle serialized Uint8Array (object with numeric keys)
          const keys = Object.keys(rawValue).map(Number).sort((a, b) => a - b);
          signatureBytes = keys.map((k) => (rawValue as Record<number, number>)[k]);
        } else {
          console.error('[MiniApp Host] signIn: Unexpected signature format', rawValue);
          return { error: { type: 'rejected_by_user' } };
        }
        const signature = signatureBytes
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        return {
          result: {
            signature: `0x${signature}`,
            message,
            authMethod: signInOptions.acceptAuthAddress ? 'authAddress' : 'custody',
          },
        };
      } catch (error) {
        console.error('[MiniApp Host] signIn error:', error);
        return { error: { type: 'rejected_by_user' } };
      }
    },

    // =========================================================================
    // Navigation & URLs
    // =========================================================================
    async openUrl(url: string): Promise<boolean> {
      try {
        if (typeof window !== 'undefined') {
          window.open(url, '_blank');
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },

    async viewProfile(fid: number): Promise<void> {
      // Navigate to profile - could integrate with app routing
      console.log('[MiniApp Host] viewProfile:', fid);
      // For now, open Warpcast profile
      if (typeof window !== 'undefined') {
        window.open(`https://warpcast.com/~/profiles/${fid}`, '_blank');
      }
    },

    async viewCast(hash: string): Promise<void> {
      // Navigate to cast - could integrate with app routing
      console.log('[MiniApp Host] viewCast:', hash);
      // For now, open Warpcast cast
      if (typeof window !== 'undefined') {
        window.open(`https://warpcast.com/~/conversations/${hash}`, '_blank');
      }
    },

    // =========================================================================
    // Mini-app management
    // =========================================================================
    async addMiniApp(): Promise<void> {
      // In embedded context, adding to favorites doesn't make sense
      console.log('[MiniApp Host] addMiniApp called (no-op in embedded context)');
    },

    async openMiniApp(url: string): Promise<void> {
      // Could navigate or open in new tab
      console.log('[MiniApp Host] openMiniApp:', url);
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
    },

    // =========================================================================
    // Cast composition
    // =========================================================================
    async composeCast(composeOptions: ComposeCastOptions): Promise<{ hash?: string } | null> {
      // Open Warpcast compose with prefilled content
      console.log('[MiniApp Host] composeCast:', composeOptions);
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams();
        if (composeOptions.text) params.set('text', composeOptions.text);
        if (composeOptions.embeds?.length) {
          composeOptions.embeds.forEach((embed) => {
            params.append('embeds[]', embed);
          });
        }
        if (composeOptions.parentCastHash) params.set('parent', composeOptions.parentCastHash);
        window.open(`https://warpcast.com/~/compose?${params.toString()}`, '_blank');
      }
      return null; // We don't get the hash back when opening external compose
    },

    // =========================================================================
    // Token operations
    // =========================================================================
    async sendToken(
      _options: { token: string; amount: string; recipientFid?: number }
    ): Promise<{ transactionHash?: string } | null> {
      console.log('[MiniApp Host] sendToken not implemented in embedded context');
      return null;
    },

    async swapToken(
      _options: { sell: TokenInfo; buy: TokenInfo; sellAmount?: string }
    ): Promise<{ transactionHash?: string } | null> {
      console.log('[MiniApp Host] swapToken not implemented in embedded context');
      return null;
    },

    async viewToken(tokenOptions: { token: string; chainId?: number }): Promise<void> {
      console.log('[MiniApp Host] viewToken:', tokenOptions);
      // Could navigate to token page in app
    },

    // =========================================================================
    // Ethereum provider (EIP-1193)
    // =========================================================================
    async ethProviderRequest(
      args: { method: string; params?: unknown[] }
    ): Promise<unknown> {
      type EthProvider = {
        request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
      const provider = ethProvider as EthProvider | undefined;
      if (!provider || typeof provider.request !== 'function') {
        throw new Error('Ethereum provider not available');
      }
      return provider.request(args);
    },

    async ethProviderRequestV2(args: { method: string; params?: unknown[] }): Promise<unknown> {
      // V2 is the same as V1 for our purposes
      return this.ethProviderRequest(args);
    },

    // =========================================================================
    // Solana provider
    // =========================================================================
    async solanaProviderRequest(_args: { method: string; params?: unknown }): Promise<unknown> {
      throw new Error('Solana provider not available');
    },

    // =========================================================================
    // Haptics
    // =========================================================================
    async impactOccurred(style: 'light' | 'medium' | 'heavy'): Promise<void> {
      // Use Vibration API if available (mobile browsers)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const duration = style === 'light' ? 10 : style === 'medium' ? 20 : 30;
        navigator.vibrate(duration);
      }
    },

    async notificationOccurred(type: 'success' | 'warning' | 'error'): Promise<void> {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const pattern = type === 'success' ? [10, 50, 10] : type === 'warning' ? [20, 100, 20] : [30, 50, 30, 50, 30];
        navigator.vibrate(pattern);
      }
    },

    async selectionChanged(): Promise<void> {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(5);
      }
    },

    // =========================================================================
    // UI controls
    // =========================================================================
    async setPrimaryButton(_options: { text: string; disabled?: boolean; hidden?: boolean }): Promise<void> {
      // No-op in embedded context - we don't control the host UI
      console.log('[MiniApp Host] setPrimaryButton not supported in embedded context');
    },

    async updateBackState(_options: { enabled: boolean }): Promise<void> {
      // No-op in embedded context
      console.log('[MiniApp Host] updateBackState not supported in embedded context');
    },

    async requestCameraAndMicrophoneAccess(): Promise<boolean> {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // Stop the stream immediately - we just wanted to request permission
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        return true;
      } catch {
        return false;
      }
    },

    // =========================================================================
    // Capabilities
    // =========================================================================
    async getCapabilities(): Promise<string[]> {
      const capabilities = [
        'context',
        'actions.ready',
        'actions.close',
        'actions.signIn',
        'actions.openUrl',
        'actions.viewProfile',
        'actions.viewCast',
        'actions.composeCast',
        'actions.addMiniApp',
        'actions.openMiniApp',
      ];

      // Add eth provider capability if available
      if (ethProvider) {
        capabilities.push('wallet.ethProvider');
      }

      // Add haptics if vibration API is available
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        capabilities.push('haptics.impactOccurred');
        capabilities.push('haptics.notificationOccurred');
        capabilities.push('haptics.selectionChanged');
      }

      return capabilities;
    },

    async getChains(): Promise<string[]> {
      // Return supported CAIP-2 chain identifiers
      // https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md
      return [
        'eip155:1',      // Ethereum Mainnet
        'eip155:10',     // Optimism
        'eip155:8453',   // Base
        'eip155:42161',  // Arbitrum One
      ];
    },

    // =========================================================================
    // Manifest signing
    // =========================================================================
    async signManifest(
      _options: { domain: string; manifest: unknown }
    ): Promise<{ signature: string } | { error: { type: string } }> {
      console.log('[MiniApp Host] signManifest not implemented');
      return { error: { type: 'not_supported' } };
    },
  };
}

/**
 * Create a filtered EventSource that only receives messages from a specific iframe
 */
function createFilteredEventSource(iframe: HTMLIFrameElement): EventSource {
  // Store wrapped listeners for cleanup
  const listenerMap = new WeakMap<EventListenerOrEventListenerObject, EventListener>();

  const eventTarget: EventSource = {
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'message') {
        const wrappedListener: EventListener = (event: Event) => {
          // Only handle messages from this specific iframe
          const messageEvent = event as MessageEvent;
          if (messageEvent.source === iframe.contentWindow) {
            if (typeof listener === 'function') {
              listener(messageEvent);
            } else {
              listener.handleEvent(messageEvent);
            }
          }
        };
        listenerMap.set(listener, wrappedListener);
        window.addEventListener('message', wrappedListener);
      }
    },
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'message') {
        const wrappedListener = listenerMap.get(listener);
        if (wrappedListener) {
          window.removeEventListener('message', wrappedListener);
          listenerMap.delete(listener);
        }
      }
    },
  };
  return eventTarget;
}

/**
 * Set up Comlink handler for an iframe
 *
 * This exposes the WireMiniAppHost API to the embedded mini-app via postMessage.
 * The mini-app's SDK (using Comlink) will call methods like miniAppHost.signIn() directly.
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

  // Determine target origin - never use '*' as it's unsafe
  let origin: string;

  if (targetOrigin) {
    try {
      new URL(targetOrigin);
      origin = targetOrigin;
    } catch {
      throw new Error(`Invalid targetOrigin: ${targetOrigin}. Must be a valid URL.`);
    }
  } else if (iframe.src) {
    try {
      origin = new URL(iframe.src).origin;
    } catch {
      throw new Error(`Cannot determine origin from iframe.src: ${iframe.src}. Provide targetOrigin explicitly.`);
    }
  } else {
    throw new Error('Cannot determine origin for postMessage. Either provide targetOrigin or ensure iframe has a valid src.');
  }

  if (!origin || origin === '*') {
    throw new Error('Origin cannot be null or "*". This is unsafe for postMessage.');
  }

  // Create the SDK host API
  const sdkHost = createMiniAppSdkHost(context, ethProvider, iframe, origin, options);

  // Create endpoint with filtered context for this specific iframe
  if (!iframe.contentWindow) {
    throw new Error('Cannot create endpoint: iframe.contentWindow is not available');
  }

  const filteredContext = createFilteredEventSource(iframe);
  const endpoint = windowEndpoint(iframe.contentWindow, filteredContext, origin);

  // Expose the SDK API via Comlink
  expose(sdkHost, endpoint);

  // Return cleanup function
  return () => {
    // Cleanup is handled by Comlink when the iframe is removed
  };
}
