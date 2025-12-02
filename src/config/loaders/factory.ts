import { ConfigLoader, ConfigLoadContext, ConfigLoadingStrategy } from './types';
import { RuntimeConfigLoader } from './runtimeLoader';
import {
  resolveCommunityFromDomain,
} from './registry';

/**
 * Factory for creating the config loader
 * All communities use runtime loading
 */
export class ConfigLoaderFactory {
  private runtimeLoader: RuntimeConfigLoader;

  constructor() {
    this.runtimeLoader = new RuntimeConfigLoader();
  }

  /**
   * Get the loader for the given context
   * Always returns the runtime loader
   */
  getLoader(context: ConfigLoadContext): ConfigLoader {
    // Priority order for community ID resolution:
    // 1. Explicit context.communityId
    // 2. Development override (NEXT_PUBLIC_TEST_COMMUNITY) - for local testing
    // 3. Domain resolution (production or localhost subdomains)
    // 4. Environment variable (NEXT_PUBLIC_COMMUNITY) - fallback
    
    let communityId = context.communityId;
    
    // Development override: allows testing communities locally
    // Set NEXT_PUBLIC_TEST_COMMUNITY=example to test 'example' community
    if (!communityId && process.env.NODE_ENV === 'development') {
      communityId = process.env.NEXT_PUBLIC_TEST_COMMUNITY || undefined;
    }
    
    // Resolve from domain if still no community ID
    if (!communityId && context.domain) {
      communityId = resolveCommunityFromDomain(context.domain) || undefined;
    }

    // Final fallback to env var
    if (!communityId) {
      communityId = process.env.NEXT_PUBLIC_COMMUNITY || undefined;
    }

    // Always use runtime loader
    return this.runtimeLoader;
  }

  /**
   * Get the loading strategy for a given context
   */
  getStrategy(_context: ConfigLoadContext): ConfigLoadingStrategy {
    return 'runtime';
  }
}

// Singleton instance
let factoryInstance: ConfigLoaderFactory | null = null;

/**
 * Get the global config loader factory instance
 */
export function getConfigLoaderFactory(): ConfigLoaderFactory {
  if (!factoryInstance) {
    factoryInstance = new ConfigLoaderFactory();
  }
  return factoryInstance;
}

/**
 * Get domain and community ID from middleware-set headers (server-side) or window (client-side)
 * 
 * Server-side: Reads x-community-id and x-detected-domain headers set by middleware
 * Client-side: Uses window.location.hostname
 * 
 * Returns undefined if domain cannot be determined (build time, etc.)
 */
export async function getDomainFromContext(): Promise<string | undefined>;
export function getDomainFromContext(): string | undefined | Promise<string | undefined> {
  // Server-side: read from middleware-set headers
  if (typeof window === 'undefined') {
    try {
      // Dynamic import to avoid issues when headers() isn't available (build time)
      const { headers } = await import('next/headers');
      const headersList = await headers();
      
      // Read domain from middleware-set header (preferred)
      const domain = headersList.get('x-detected-domain');
      if (domain) {
        return domain;
      }
      
      // Fallback: read directly from headers if middleware didn't set it
      const forwardedHost = headersList.get('x-forwarded-host');
      if (forwardedHost) {
        return forwardedHost.split(':')[0]; // Remove port
      }
      
      const host = headersList.get('host');
      if (host) {
        return host.split(':')[0]; // Remove port
      }
    } catch (error) {
      // Not in request context (static generation, etc.)
      // Return undefined to fall back to env vars
      return undefined;
    }
    
    return undefined;
  }
  
  // Client-side: use window.location.hostname
  return window.location.hostname;
}

/**
 * Get community ID from middleware-set header (server-side only)
 * Returns undefined if not available
 */
export async function getCommunityIdFromHeaders(): Promise<string | undefined> {
  if (typeof window === 'undefined') {
    try {
      const { headers } = await import('next/headers');
      const headersList = await headers();
      return headersList.get('x-community-id') || undefined;
    } catch (error) {
      return undefined;
    }
  }
  return undefined;
}

