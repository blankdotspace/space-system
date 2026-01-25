import { createClient } from '@supabase/supabase-js';
import { Database } from '@/supabase/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL! || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

/**
 * Create Supabase server client with Edge Runtime compatibility.
 * Uses global fetch instead of axios to work in Edge Runtime.
 */
export const createSupabaseServerClient = () => {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    global: {
      // Use global fetch (available in Edge Runtime) instead of axios
      fetch: typeof fetch !== 'undefined' ? fetch : undefined,
    },
  });
};

export default createSupabaseServerClient;



