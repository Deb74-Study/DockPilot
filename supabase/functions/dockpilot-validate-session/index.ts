import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifySessionToken } from '../_shared/session.ts';

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

function isExpired(expiryDate: string | null | undefined) {
  if (!expiryDate) return false;
  return new Date(`${expiryDate}T23:59:59`).getTime() < Date.now();
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, {
      ok: false,
      code: 'method_not_allowed',
      message: 'Only POST is supported.'
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, {
      ok: false,
      code: 'server_not_configured',
      message: 'Server auth is not configured.'
    });
  }

  let body: { loginName?: string; sessionToken?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, {
      ok: false,
      code: 'invalid_json',
      message: 'Request body must be valid JSON.'
    });
  }

  const loginName = String(body.loginName || '').trim().toLowerCase();
  const sessionToken = String(body.sessionToken || '').trim();

  if (!loginName || !sessionToken) {
    return jsonResponse(400, {
      ok: false,
      code: 'invalid_payload',
      message: 'Both loginName and sessionToken are required.'
    });
  }

  const tokenPayload = await verifySessionToken(sessionToken, serviceRoleKey);
  if (!tokenPayload) {
    return jsonResponse(401, {
      ok: false,
      code: 'invalid_session_token',
      message: 'Session token is not valid.'
    });
  }

  if (tokenPayload.login_name !== loginName) {
    return jsonResponse(401, {
      ok: false,
      code: 'session_login_mismatch',
      message: 'Session token does not match this login.'
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: account, error } = await adminClient
    .from('credentials')
    .select('login_name, full_name, role, expiry, access_groups, must_change_password, password_updated_at')
    .eq('login_name', loginName)
    .maybeSingle<CredentialRow>();

  if (error || !account) {
    return jsonResponse(401, {
      ok: false,
      code: 'invalid_credentials',
      message: 'Login credentials are not recognised.'
    });
  }

  if (isExpired(account.expiry)) {
    return jsonResponse(403, {
      ok: false,
      code: 'credential_expired',
      message: 'This credential has expired.'
    });
  }

  const currentPasswordUpdatedAt = account.password_updated_at || null;
  if (tokenPayload.password_updated_at !== currentPasswordUpdatedAt) {
    return jsonResponse(401, {
      ok: false,
      code: 'session_revoked',
      message: 'Session is no longer valid. Please sign in again.'
    });
  }

  if (tokenPayload.must_change_password !== Boolean(account.must_change_password)) {
    return jsonResponse(401, {
      ok: false,
      code: 'session_revoked',
      message: 'Session state changed. Please sign in again.'
    });
  }

  return jsonResponse(200, {
    ok: true,
    session: {
      login_name: account.login_name,
      full_name: account.full_name,
      role: account.role,
      expiry: account.expiry,
      access_groups: account.access_groups || [],
      must_change_password: Boolean(account.must_change_password),
      password_updated_at: account.password_updated_at,
      issued_at: tokenPayload.issued_at,
      session_token: sessionToken
    }
  });
});
