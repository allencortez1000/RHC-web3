import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key) : null;

export function requireSupabase() {
  if (!supabase) throw new Error('Authentication is unavailable because the public Supabase configuration is missing.');
  return supabase;
}
