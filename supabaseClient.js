// supabaseClient.js
// This file initializes the Supabase client for use in DockPilot HTML files.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase project URL and anon/public key (safe for browser with RLS enabled)
export const SUPABASE_URL = 'https://radrajwlerdxpuzeoqtq.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZHJhandsZXJkeHB1emVvcXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk3ODAsImV4cCI6MjA5MTkzNTc4MH0.ir_ZTfSkMDuod9AlAjEGIEWiABdk9sAGqaMo-aAHVq8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
