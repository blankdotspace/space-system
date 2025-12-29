import { ConfigLoader, ConfigLoadContext } from './types';
import { SystemConfig } from '../systemConfig';
import { loadSystemConfigById } from './registry';

/**
 * Runtime config loader
 * 
 * Simplified loader that uses the unified cache and loadSystemConfigById function.
 * This eliminates the redundant RPC query since we now transform rows in application code.
 */
export class RuntimeConfigLoader implements ConfigLoader {
  async load(context: ConfigLoadContext): Promise<SystemConfig> {
    if (!context.communityId) {
      throw new Error(
        `❌ Community ID is required for runtime config loading. ` +
        `Provide communityId in the load context.`
      );
    }

    // Use the unified loadSystemConfigById which handles caching and transformation
    return await loadSystemConfigById(context.communityId);
  }
}

