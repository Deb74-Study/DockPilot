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

  let body: {
    login_name?: string;
    full_name?: string;
    email?: string;
    role?: string;
    temp_password?: string;
    expiry?: string;
    access_groups?: string[];
    must_change_password?: boolean;
    password_updated_at?: string | null;
    created_at?: string;
    company_id?: string;
  };

  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  const loginName = String(body.login_name || '').trim().toLowerCase();
  const fullName = String(body.full_name || '').trim();
  const email = String(body.email || '').trim();
  const role = String(body.role || 'Frontend Developer').trim();
  const tempPassword = String(body.temp_password || '').trim();
  const expiry = String(body.expiry || '').trim();
  const accessGroups = Array.isArray(body.access_groups) ? body.access_groups : [];
  const companyId = String(body.company_id || '').trim();

  if (!loginName || !fullName || !tempPassword || !expiry || !companyId) {
    return jsonResponse(400, { ok: false, message: 'Missing required credential fields.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const passwordHash = await hashPassword(tempPassword);

  const { data, error } = await adminClient
    .from('credentials')
    .insert([
      {
        company_id: companyId,
        login_name: loginName,
        full_name: fullName,
        email,
        role,
        temp_password: null,
        password_hash: passwordHash,
        must_change_password: body.must_change_password ?? true,
        password_updated_at: body.password_updated_at ?? null,
        expiry,
        access_groups: accessGroups,
        created_at: body.created_at || new Date().toISOString()
      }
    ])
    .select('login_name, full_name, email, role, expiry, access_groups, must_change_password, password_updated_at, created_at')
    .maybeSingle();

  if (error) {
    return jsonResponse(409, {
      ok: false,
      message: 'Failed to issue credential. Login name may already exist.'
    });
  }

  return jsonResponse(200, {
    ok: true,
    account: data
  });
});
