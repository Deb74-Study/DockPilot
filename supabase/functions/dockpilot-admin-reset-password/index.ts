import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hashPassword } from '../_shared/password.ts';

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

  let body: { loginName?: string; newPassword?: string; company_id?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  const loginName = String(body.loginName || '').trim().toLowerCase();
  const newPassword = String(body.newPassword || '').trim();
  const companyId = String(body.company_id || '').trim();

  if (!loginName || !newPassword || !companyId) {
    return jsonResponse(400, { ok: false, message: 'loginName, newPassword, and company_id are required.' });
  }

  if (newPassword.length < 8) {
    return jsonResponse(400, { ok: false, message: 'The new password must be at least 8 characters long.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const passwordHash = await hashPassword(newPassword);
  const { data, error } = await adminClient
    .from('credentials')
    .update({
      password_hash: passwordHash,
      temp_password: null,
      must_change_password: true,
      password_updated_at: null
    })
    .eq('company_id', companyId)
    .eq('login_name', loginName)
    .select('login_name, full_name, email, role, expiry, access_groups, must_change_password, password_updated_at, created_at')
    .maybeSingle();

  if (error || !data) {
    return jsonResponse(404, { ok: false, message: 'Failed to reset password for the selected login.' });
  }

  return jsonResponse(200, {
    ok: true,
    account: data
  });
});
