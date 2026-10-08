import { createClient } from "@supabase/supabase-js";

/**
 * Read-only access to the public study data (Bible text, dictionaries, Strong's).
 * There are no user accounts, so no session or cookies are involved.
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
