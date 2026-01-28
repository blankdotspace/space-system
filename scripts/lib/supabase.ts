/**
 * Supabase client setup and environment loading for seed scripts
 *
 * Supports both local .env files and remote environments via --env flag.
 * When using --env, prompts for credentials interactively.
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as readline from 'readline';

// Check for --env flag
const envFlagIndex = process.argv.indexOf('--env');
const targetEnv = envFlagIndex !== -1 ? process.argv[envFlagIndex + 1] : null;

/**
 * Prompt user for input (with optional hidden input for secrets)
 */
async function prompt(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden && process.stdin.isTTY) {
      // For hidden input, we need to handle it manually
      process.stdout.write(question);
      let input = '';

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (char: string) => {
        if (char === '\n' || char === '\r') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (char === '\u0003') {
          // Ctrl+C
          process.exit();
        } else if (char === '\u007F') {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else {
          input += char;
        }
      };

      process.stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

/**
 * Get credentials for remote environment via prompts
 */
async function getRemoteCredentials(env: string): Promise<{ url: string; key: string }> {
  console.log(`\n🌐 Targeting remote environment: ${env}`);
  console.log('Please enter the Supabase credentials for this environment:\n');

  const url = await prompt('NEXT_PUBLIC_SUPABASE_URL: ');
  const key = await prompt('SUPABASE_SERVICE_KEY: ', true);

  if (!url || !key) {
    console.error('❌ Both URL and service key are required');
    process.exit(1);
  }

  return { url, key };
}

/**
 * Get credentials from local .env files
 */
function getLocalCredentials(): { url: string | undefined; key: string | undefined } {
  const envFiles = ['.env.local', '.env.development.local', '.env'];
  for (const envFile of envFiles) {
    const envPath = resolve(process.cwd(), envFile);
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`📁 Loaded environment from ${envFile}`);
      break;
    }
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
  };
}

// Initialize credentials and client
let supabaseUrl: string;
let supabaseKey: string;
let supabase: SupabaseClient;
let initialized = false;

/**
 * Initialize the Supabase client
 * Call this before using the supabase export if using --env flag
 */
export async function initializeSupabase(): Promise<void> {
  if (initialized) return;

  if (targetEnv) {
    // Remote environment - prompt for credentials
    const creds = await getRemoteCredentials(targetEnv);
    supabaseUrl = creds.url;
    supabaseKey = creds.key;
  } else {
    // Local environment - use .env files
    const creds = getLocalCredentials();
    if (!creds.url || !creds.key) {
      console.error('❌ Missing required environment variables:');
      console.error('   NEXT_PUBLIC_SUPABASE_URL');
      console.error('   SUPABASE_SERVICE_KEY');
      console.error('\nEither set these in .env or use --env <environment> to enter them interactively.');
      process.exit(1);
    }
    supabaseUrl = creds.url;
    supabaseKey = creds.key;
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  initialized = true;
}

// For backwards compatibility, initialize synchronously if not using --env
if (!targetEnv) {
  const creds = getLocalCredentials();
  if (creds.url && creds.key) {
    supabaseUrl = creds.url;
    supabaseKey = creds.key;
    supabase = createClient(supabaseUrl, supabaseKey);
    initialized = true;
  }
}

export { supabase, supabaseUrl, supabaseKey, targetEnv };
