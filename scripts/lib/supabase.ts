/**
 * Supabase client setup and environment loading for seed scripts
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load environment variables from .env files
const envFiles = ['.env.local', '.env.development.local', '.env'];
for (const envFile of envFiles) {
  const envPath = resolve(process.cwd(), envFile);
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`📁 Loaded environment from ${envFile}`);
    break;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_KEY');
  process.exit(1);
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

export { supabaseUrl, supabaseKey };

