import { SystemConfig } from '../systemConfig';

/**
 * Configuration loading strategy types
 */
export type ConfigLoadingStrategy = 'runtime';

/**
 * Context for determining which loading strategy to use
 */
export interface ConfigLoadContext {
  /** Community ID (e.g., 'nouns', 'example') */
  communityId?: string;
  /** Domain/hostname (e.g., 'nounspace.com', 'example.nounspace.com') */
  domain?: string;
  /** Whether we're in a server-side context */
  isServer?: boolean;
}

/**
 * Result of a config load operation
 */
export interface ConfigLoadResult {
  config: SystemConfig;
  strategy: ConfigLoadingStrategy;
  source: string; // e.g., 'runtime-db', etc.
}

/**
 * Interface for config loaders
 * All loaders must implement this interface
 */
export interface ConfigLoader {
  /**
   * Load the system configuration
   * @param context Context for loading (community, domain, etc.)
   * @returns The loaded system configuration
   */
  load(context: ConfigLoadContext): Promise<SystemConfig> | SystemConfig;
  
  /**
   * Check if this loader can handle the given context
   * @param context Context to check
   * @returns True if this loader can handle the context
   */
  canHandle(context: ConfigLoadContext): boolean;
  
  /**
   * Get the loading strategy this loader implements
   */
  getStrategy(): ConfigLoadingStrategy;
}

