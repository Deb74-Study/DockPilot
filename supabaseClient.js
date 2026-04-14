// supabaseClient.js
// This file initializes the Supabase client for use in DockPilot HTML files.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase project URL and anon/public key (safe for browser with RLS enabled)
export const supabase = createClient(
  'https://ypdxxecdnusgetndtlve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZHh4ZWNkbnVzZ2V0bmR0bHZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjA5MjcsImV4cCI6MjA5MTI5NjkyN30.k7ToGORn77emGhwhRIezkI9z204ZYyDaGM29KX3jeT0'
);
