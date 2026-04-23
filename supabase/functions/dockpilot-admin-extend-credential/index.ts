import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Only POST is supported.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { ok: false, message: 'Server auth is not configured.' });
  }

  let body: { loginName?: string; newExpiry?: string; company_id?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  const loginName = String(body.loginName || '').trim().toLowerCase();
  const newExpiry = String(body.newExpiry || '').trim();
  const companyId = String(body.company_id || '').trim();

  if (!loginName || !newExpiry || !companyId) {
    return jsonResponse(400, { ok: false, message: 'loginName, newExpiry, and company_id are required.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await adminClient
    .from('credentials')
    .update({ expiry: newExpiry })
    .eq('company_id', companyId)
    .eq('login_name', loginName)
    .select('login_name, full_name, email, role, expiry, access_groups, must_change_password, password_updated_at, created_at')
    .maybeSingle();

  if (error || !data) {
    return jsonResponse(404, { ok: false, message: 'Failed to extend access.' });
  }

  return jsonResponse(200, {
    ok: true,
    account: data
  });
});
