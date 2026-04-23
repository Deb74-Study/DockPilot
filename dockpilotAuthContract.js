export const AUTH_TEMPLATE_ID = 'FPA_DEV_DOCKPILOT';

export const AUTH_STORAGE_KEYS = {
  session: `${AUTH_TEMPLATE_ID}_session`,
  lastActivityAt: `${AUTH_TEMPLATE_ID}_last_activity_at`,
  returnTarget: `${AUTH_TEMPLATE_ID}_return_target`
};

export const AUTH_GUARD_OUTCOME = {
  allow: 'ALLOW',
  lock: 'LOCK_RECHECK',
  redirect: 'REDIRECT_TO_LANDING'
};

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function normalizeSession(rawSession) {
  if (!rawSession || typeof rawSession !== 'object') {
    return null;
  }

  const issuedAt = rawSession.issuedAt || rawSession.issued_at || null;
  const sessionToken = rawSession.sessionToken || rawSession.session_token || null;

  return {
    fullName: rawSession.fullName || rawSession.full_name || null,
    role: rawSession.role || null,
    loginName: rawSession.loginName || rawSession.login_name || null,
    companyId: rawSession.companyId || rawSession.company_id || null,
    expiry: rawSession.expiry || null,
    access: Array.isArray(rawSession.access)
      ? rawSession.access
      : Array.isArray(rawSession.access_groups)
        ? rawSession.access_groups
        : [],
    mustChangePassword: Boolean(rawSession.mustChangePassword ?? rawSession.must_change_password),
    passwordUpdatedAt: rawSession.passwordUpdatedAt || rawSession.password_updated_at || null,
    issuedAt,
    sessionToken
  };
}

export function saveSession(rawSession) {
  const session = normalizeSession(rawSession);
  if (!session) return null;
  writeJson(AUTH_STORAGE_KEYS.session, session);
  return session;
}

export function getSession() {
  const session = readJson(AUTH_STORAGE_KEYS.session);
  return normalizeSession(session);
}

export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.session);
}

export function markActivity(timestamp = Date.now()) {
  localStorage.setItem(AUTH_STORAGE_KEYS.lastActivityAt, String(timestamp));
}

export function getLastActivityAt() {
  const value = Number(localStorage.getItem(AUTH_STORAGE_KEYS.lastActivityAt));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function clearLastActivity() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.lastActivityAt);
}

export function setReturnTarget(path) {
  if (!path) {
    localStorage.removeItem(AUTH_STORAGE_KEYS.returnTarget);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEYS.returnTarget, String(path));
}

export function getReturnTarget() {
  return localStorage.getItem(AUTH_STORAGE_KEYS.returnTarget) || null;
}

export function clearReturnTarget() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.returnTarget);
}

export function isExpired(account) {
  if (!account?.expiry) return false;
  return new Date(`${account.expiry}T23:59:59`).getTime() < Date.now();
}

export function getGuardOutcome({ hasSession, isIdleLocked }) {
  if (!hasSession) return AUTH_GUARD_OUTCOME.redirect;
  if (isIdleLocked) return AUTH_GUARD_OUTCOME.lock;
  return AUTH_GUARD_OUTCOME.allow;
}