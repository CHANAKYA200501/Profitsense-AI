import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Prevent crash if placeholders are not replaced
const isPlaceholder = !supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_URL') || !supabaseUrl.startsWith('http');

if (isPlaceholder) {
  console.warn('⚠️ Supabase credentials missing or invalid in .env file. Admin panel will be disabled.');
}

export const supabase = !isPlaceholder 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: { session: null, user: null }, error: { message: 'Supabase keys not configured.' } }),
        signOut: async () => ({ error: null }),
      }
    } as any; // Stub to prevent crash

export type SupabaseUser = {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  role?: string;
};
