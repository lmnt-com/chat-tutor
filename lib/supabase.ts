import {
  createClient as createSupabaseClient,
  SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

let supabaseClient: SupabaseClient | null = null;
let supabaseServerClient: SupabaseClient | null = null;

/**
 * Returns the singleton supabase client instance equipped with the anon key.
 * This is used for client-side operations.
 * Returns null if Supabase is not configured.
 */
export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    console.warn(
      "Supabase is not configured. Authentication and data persistence will be disabled.",
    );
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createSupabaseClient(supabaseUrl!, supabaseAnonKey!);
  }
  return supabaseClient;
}

/**
 * Returns the singleton supabase client instance equipped with the service role key.
 * This is used for server-side operations.
 * Returns null if Supabase is not configured.
 */
export function createServerClient(): SupabaseClient | null {
  const isServerConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!isServerConfigured) {
    console.warn(
      "Supabase is not configured for server-side operations. Database operations will be disabled.",
    );
    return null;
  }

  if (!supabaseServerClient) {
    supabaseServerClient = createSupabaseClient(
      supabaseUrl!,
      supabaseServiceKey!,
    );
  }
  return supabaseServerClient;
}

/**
 * Check if Supabase is available and configured
 */
export function isSupabaseAvailable(): boolean {
  return isSupabaseConfigured();
}
