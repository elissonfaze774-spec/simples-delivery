import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  'https://yovteyumpolfdztfwrhv.supabase.co';

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_R9_GkK2ItO2nZsbTuA64IA_V074J5oJ';

const globalForSupabase = globalThis as {
  __supabase_client__?: any;
};

export const supabase: any =
  globalForSupabase.__supabase_client__ ||
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

if (typeof window !== 'undefined') {
  globalForSupabase.__supabase_client__ = supabase;
}