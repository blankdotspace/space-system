import { ConfigLoader, ConfigLoadContext } from './types';
import { SystemConfig } from '../systemConfig';
import { themes } from '../shared/themes';
import { createClient } from '@supabase/supabase-js';

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
      const { data, error } = await this.supabase
        .rpc('get_active_community_config', { 
          p_community_id: context.communityId 
        })
        .single();

      if (error || !data) {
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

      // Map pages object to homePage/explorePage for backward compatibility
      // Add themes from shared file (themes are not in database)
      const mappedConfig: SystemConfig = {
        ...dbConfig,
        theme: themes, // Themes come from shared file
        homePage: dbConfig.pages?.['home'] || dbConfig.homePage || null,
        explorePage: dbConfig.pages?.['explore'] || dbConfig.explorePage || null,
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

