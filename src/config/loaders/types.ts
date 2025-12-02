import { SystemConfig } from '../systemConfig';

/**
 * Context for loading configuration
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
 * Interface for config loaders
 */
export interface ConfigLoader {
  /**
   * Load the system configuration
   * @param context Context for loading (community, domain, etc.)
   * @returns The loaded system configuration
   */
  load(context: ConfigLoadContext): Promise<SystemConfig>;
}

