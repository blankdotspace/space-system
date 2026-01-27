/**
 * Supabase client setup and environment loading for seed scripts
 *
 * Usage:
 *   tsx scripts/seed.ts                    # Uses local .env files
 *   tsx scripts/seed.ts --env staging      # Prompts for staging credentials
 *   tsx scripts/seed.ts --env production   # Prompts for production credentials
 */

import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { createInterface } from 'readline';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Parse --env flag from command line
function getEnvFromArgs(): string | null {
  const args = process.argv.slice(2);
  const envIndex = args.indexOf('--env');
  if (envIndex !== -1 && args[envIndex + 1]) {
    return args[envIndex + 1];
  }
  return null;
}

// Prompt user for input
async function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Initialize credentials - either from env files or user input
async function initCredentials(): Promise<{ url: string; key: string }> {
  const targetEnv = getEnvFromArgs();

  if (targetEnv) {
    // Prompt for credentials when targeting a specific environment
    console.log(`\n🔐 Enter credentials for ${targetEnv} environment:\n`);

    const url = await prompt('   NEXT_PUBLIC_SUPABASE_URL: ');
    const key = await prompt('   SUPABASE_SERVICE_KEY: ');

    if (!url || !key) {
      console.error('\n❌ Both URL and service key are required');
      process.exit(1);
    }

    console.log(`\n📡 Targeting ${targetEnv}: ${url}\n`);
    return { url, key };
  }

  // Default behavior: load from local env files
  const envFiles = ['.env.local', '.env.development.local', '.env'];

  for (const envFile of envFiles) {
    const envPath = resolve(process.cwd(), envFile);
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`📁 Loaded environment from ${envFile}`);
      break;
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  return { url, key };
}

// Credentials and client - initialized asynchronously
let supabaseUrl: string;
let supabaseKey: string;
let supabase: SupabaseClient;

// Initialize function that must be called before using the client
export async function initSupabase(): Promise<void> {
  const creds = await initCredentials();
  supabaseUrl = creds.url;
  supabaseKey = creds.key;
  supabase = createClient(supabaseUrl, supabaseKey);
}

export { supabase, supabaseUrl, supabaseKey };

