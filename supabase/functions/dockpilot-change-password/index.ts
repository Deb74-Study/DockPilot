import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hashPassword, verifyPassword } from '../_shared/password.ts';
import { buildSessionTokenPayload, createSessionToken } from '../_shared/session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

type CredentialRow = {
  login_name: string;
  full_name: string;
  role: string;
  expiry: string;
  access_groups: string[] | null;
  must_change_password: boolean | null;
  password_updated_at: string | null;
  temp_password: string | null;
  password_hash: string | null;
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

  let body: { loginName?: string; currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  const loginName = String(body.loginName || '').trim().toLowerCase();
  const currentPassword = String(body.currentPassword || '').trim();
  const newPassword = String(body.newPassword || '').trim();

  if (!loginName || !currentPassword || !newPassword) {
    return jsonResponse(400, { ok: false, message: 'loginName, currentPassword, and newPassword are required.' });
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

  const { data: account, error } = await adminClient
    .from('credentials')
    .select('login_name, full_name, role, expiry, access_groups, must_change_password, password_updated_at, temp_password, password_hash')
    .eq('login_name', loginName)
    .maybeSingle<CredentialRow>();

  if (error || !account) {
    return jsonResponse(401, { ok: false, message: 'Login credentials are not recognised.' });
  }

  let credentialMatch = false;
  if (account.password_hash) {
    credentialMatch = await verifyPassword(currentPassword, account.password_hash);
  } else if (account.temp_password) {
    credentialMatch = account.temp_password === currentPassword;
  }

  if (!credentialMatch) {
    return jsonResponse(401, { ok: false, message: 'Current password is not valid.' });
  }

  const nextPasswordHash = await hashPassword(newPassword);
  const passwordUpdatedAt = new Date().toISOString();

  const { data: updated, error: updateError } = await adminClient
    .from('credentials')
    .update({
      password_hash: nextPasswordHash,
      temp_password: null,
      must_change_password: false,
      password_updated_at: passwordUpdatedAt
    })
    .eq('login_name', loginName)
    .select('login_name, full_name, role, expiry, access_groups, must_change_password, password_updated_at')
    .maybeSingle();

  if (updateError || !updated) {
    return jsonResponse(500, { ok: false, message: 'Failed to update password. Please try again.' });
  }

  const issuedAt = new Date().toISOString();
  const tokenPayload = buildSessionTokenPayload({
    login_name: updated.login_name,
    issued_at: issuedAt,
    expiry: updated.expiry,
    password_updated_at: updated.password_updated_at,
    must_change_password: Boolean(updated.must_change_password)
  });
  const sessionToken = await createSessionToken(tokenPayload, serviceRoleKey);
  if (!sessionToken) {
    return jsonResponse(500, { ok: false, message: 'Session token could not be issued.' });
  }

  return jsonResponse(200, {
    ok: true,
    session: {
      ...updated,
      issued_at: issuedAt,
      session_token: sessionToken
    }
  });
});
