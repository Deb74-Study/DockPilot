// supabaseClient.js
// This file initializes the Supabase client for use in DockPilot HTML files.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase project URL and anon/public key (safe for browser with RLS enabled)
export const SUPABASE_URL = 'https://radrajwlerdxpuzeoqtq.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_WraKnqlvQU6ZMUEMrTmkOg_aXjUZyEL';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
