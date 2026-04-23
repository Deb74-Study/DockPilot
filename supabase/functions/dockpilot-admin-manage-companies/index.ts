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

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  let body: {
    action?: string;
    name?: string;
    contact_admin_email?: string;
    contact_name?: string;
    contact_address?: string;
    registration_no?: string;
    phone?: string;
    tba1?: string;
    tba2?: string;
  } = {};

  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, message: 'Invalid or missing JSON body.' });
  }

  const action = String(body.action || '').trim();

  // ── LIST ──────────────────────────────────────────────────────────────────
  if (action === 'list') {
    const { data, error } = await adminClient
      .from('companies')
      .select('id, name, contact_admin_email, contact_name, contact_address, registration_no, phone, tba1, tba2, created_at')
      .order('name', { ascending: true });

    if (error) {
      return jsonResponse(500, { ok: false, message: error.message });
    }

    return jsonResponse(200, { ok: true, companies: data ?? [] });
  }

  // ── REGISTER ──────────────────────────────────────────────────────────────
  if (action === 'register') {
    const name = String(body.name || '').trim();
    const contactAdminEmail = String(body.contact_admin_email || '').trim();

    if (!name || !contactAdminEmail) {
      return jsonResponse(400, {
        ok: false,
        message: 'name and contact_admin_email are required.'
      });
    }

    const now = new Date().toISOString();

    const { data, error } = await adminClient
      .from('companies')
      .insert({
        name,
        contact_admin_email: contactAdminEmail,
        contact_name: String(body.contact_name || '').trim() || null,
        contact_address: String(body.contact_address || '').trim() || null,
        registration_no: String(body.registration_no || '').trim() || null,
        phone: String(body.phone || '').trim() || null,
        tba1: String(body.tba1 || '').trim() || null,
        tba2: String(body.tba2 || '').trim() || null,
        created_at: now,
        updated_at: now
      })
      .select('id, name, contact_admin_email, contact_name, contact_address, registration_no, phone, tba1, tba2, created_at')
      .single();

    if (error) {
      const isDuplicate = error.code === '23505';
      return jsonResponse(isDuplicate ? 409 : 500, {
        ok: false,
        message: isDuplicate
          ? `A company named "${name}" is already registered.`
          : error.message
      });
    }

    return jsonResponse(201, { ok: true, company: data });
  }

  // ── UNKNOWN ACTION ────────────────────────────────────────────────────────
  return jsonResponse(400, {
    ok: false,
    message: 'action must be "list" or "register".'
  });
});
