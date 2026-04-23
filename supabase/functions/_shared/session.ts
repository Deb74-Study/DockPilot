const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type SessionTokenPayload = {
  v: number;
  login_name: string;
  company_id: string;
  issued_at: string;
  expiry: string;
  password_updated_at: string | null;
  must_change_password: boolean;
};

function toBase64Url(input: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < input.length; i += 1) {
    binary += String.fromCharCode(input[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return new Uint8Array(signature);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function getSigningSecret(serviceRoleKey?: string | null): string | null {
  return (
    Deno.env.get('DOCKPILOT_SESSION_SECRET') ||
    Deno.env.get('SESSION_TOKEN_SECRET') ||
    serviceRoleKey ||
    null
  );
}

export function buildSessionTokenPayload(input: {
  login_name: string;
  company_id: string;
  issued_at?: string;
  expiry: string;
  password_updated_at?: string | null;
  must_change_password?: boolean | null;
}): SessionTokenPayload {
  return {
    v: 1,
    login_name: String(input.login_name || '').trim().toLowerCase(),
    company_id: String(input.company_id || '').trim(),
    issued_at: input.issued_at || new Date().toISOString(),
    expiry: String(input.expiry || '').trim(),
    password_updated_at: input.password_updated_at || null,
    must_change_password: Boolean(input.must_change_password)
  };
}

export async function createSessionToken(
  payload: SessionTokenPayload,
  serviceRoleKey?: string | null
): Promise<string | null> {
  const secret = getSigningSecret(serviceRoleKey);
  if (!secret) return null;

  const header = { alg: 'HS256', typ: 'DPSESS', v: 1 };
  const encodedHeader = toBase64Url(encoder.encode(JSON.stringify(header)));
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSha256(secret, message);
  const encodedSignature = toBase64Url(signature);

  return `${message}.${encodedSignature}`;
}

export async function verifySessionToken(
  token: string,
  serviceRoleKey?: string | null
): Promise<SessionTokenPayload | null> {
  const secret = getSigningSecret(serviceRoleKey);
  if (!secret) return null;

  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const message = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = await hmacSha256(secret, message);
  const actualSignature = fromBase64Url(encodedSignature);
  if (!timingSafeEqual(expectedSignature, actualSignature)) {
    return null;
  }

  let payload: SessionTokenPayload;
  try {
    payload = JSON.parse(decoder.decode(fromBase64Url(encodedPayload)));
  } catch {
    return null;
  }

  if (!payload || payload.v !== 1) return null;
  if (!payload.login_name || !payload.issued_at || !payload.expiry || !payload.company_id) return null;

  return {
    v: 1,
    login_name: String(payload.login_name).trim().toLowerCase(),
    company_id: String(payload.company_id).trim(),
    issued_at: String(payload.issued_at),
    expiry: String(payload.expiry),
    password_updated_at: payload.password_updated_at || null,
    must_change_password: Boolean(payload.must_change_password)
  };
}
