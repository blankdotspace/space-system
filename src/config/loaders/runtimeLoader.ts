import { createClient } from '@supabase/supabase-js';
import { themes } from '../shared/themes';
import { SystemConfig } from '../systemConfig';
import { ConfigLoadContext, ConfigLoader } from './types';

/**
 * Runtime config loader
 * Fetches configuration from database at runtime based on domain/community
 */
export class RuntimeConfigLoader implements ConfigLoader {
  private supabase: ReturnType<typeof createClient> | null = null;

  constructor() {
    // Initialize Supabase client if credentials are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                       process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  async load(context: ConfigLoadContext): Promise<SystemConfig> {
    if (!this.supabase) {
      throw new Error(
        `❌ Supabase credentials not configured. ` +
        `NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required for runtime config loading.`
      );
    }

    if (!context.communityId) {
      throw new Error(
        `❌ Community ID is required for runtime config loading. ` +
        `Provide communityId in the load context.`
      );
    }

    try {
      // Fetch config from database
      // Type assertion needed because Supabase RPC types are not generated
      const { data, error } = await (this.supabase.rpc as any)(
        'get_active_community_config', 
        { p_community_id: context.communityId }
      );

      if (error || !data) {
        // Check if the error is about missing function
        if (error?.message?.includes('Could not find the function') || 
            error?.message?.includes('function') && error?.message?.includes('not found')) {
          throw new Error(
            `❌ Database function 'get_active_community_config' not found. ` +
            `Please run migrations: supabase db reset or supabase migration up`
          );
        }
        
        throw new Error(
          `❌ Failed to load config from database for community: ${context.communityId}. ` +
          `Error: ${error?.message || 'No data returned'}`
        );
      }

      // Type assertion for database response
      const dbConfig = data as any;

      // Validate config structure
      if (!dbConfig.brand || !dbConfig.assets) {
        throw new Error(
          `❌ Invalid config structure from database. ` +
          `Missing required fields: brand, assets. ` +
          `Ensure database is seeded correctly.`
        );
      }

      // Add themes from shared file (themes are not in database)
      const mappedConfig: SystemConfig = {
        ...dbConfig,
        theme: themes, // Themes come from shared file
      };

      return mappedConfig as SystemConfig;
    } catch (error: any) {
      if (error.message) {
        throw error;
      }
      throw new Error(
        `❌ Unexpected error loading runtime config: ${error.message || 'Unknown error'}`
      );
    }
  }
}

