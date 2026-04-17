import {
  clearLastActivity,
  clearReturnTarget,
  clearSession,
  getLastActivityAt,
  getSession,
  markActivity,
  normalizeSession,
  saveSession,
  setReturnTarget
} from './dockpilotAuthContract.js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseClient.js';

const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_IDLE_POLL_MS = 30 * 1000;

async function invokeEdgeJson(functionName, payload) {
  let response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {})
    });
  } catch {
    return { ok: false, message: 'Unable to reach login service. Check network connectivity.' };
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      message: data?.message || data?.error || `Request failed (${response.status}).`
    };
  }

  return { ok: true, data };
}

function buildReturnTarget() {
  const fileName = window.location.pathname.split('/').filter(Boolean).pop() || 'DockPilot_landing.html';
  const suffix = `${window.location.search || ''}${window.location.hash || ''}`;
  return `./${fileName}${suffix}`;
}

function redirectToLanding(landingPage) {
  window.location.href = landingPage;
}

function isSessionExpired(expiryDate) {
  if (!expiryDate) return false;
  return new Date(`${expiryDate}T23:59:59`).getTime() < Date.now();
}

function createIdleOverlay() {
  const wrapper = document.createElement('div');
  wrapper.id = 'dockpilot-idle-lock';
  wrapper.style.position = 'fixed';
  wrapper.style.inset = '0';
  wrapper.style.zIndex = '99999';
  wrapper.style.display = 'none';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.padding = '20px';
  wrapper.style.background = 'rgba(2, 8, 23, 0.82)';

  const card = document.createElement('div');
  card.style.width = 'min(460px, 100%)';
  card.style.background = '#0f172a';
  card.style.color = '#e2e8f0';
  card.style.border = '1px solid rgba(148, 163, 184, 0.4)';
  card.style.borderRadius = '14px';
  card.style.padding = '20px';
  card.style.boxShadow = '0 16px 44px rgba(15, 23, 42, 0.55)';

  const title = document.createElement('h2');
  title.textContent = 'Session locked after idle timeout';
  title.style.margin = '0 0 8px';
  title.style.fontSize = '1.1rem';

  const note = document.createElement('p');
  note.textContent = 'Re-enter your password to continue. Unsaved changes remain on this page while locked.';
  note.style.margin = '0 0 14px';
  note.style.fontSize = '0.95rem';
  note.style.color = '#cbd5e1';

  const password = document.createElement('input');
  password.type = 'password';
  password.placeholder = 'Enter your password';
  password.autocomplete = 'current-password';
  password.style.width = '100%';
  password.style.borderRadius = '10px';
  password.style.border = '1px solid rgba(148, 163, 184, 0.45)';
  password.style.background = 'rgba(15, 23, 42, 0.7)';
  password.style.color = '#e2e8f0';
  password.style.padding = '11px 12px';

  const feedback = document.createElement('p');
  feedback.style.minHeight = '1.2em';
  feedback.style.margin = '10px 0 0';
  feedback.style.fontSize = '0.9rem';
  feedback.style.color = '#fda4af';

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '10px';
  actions.style.marginTop = '12px';

  const signOutBtn = document.createElement('button');
  signOutBtn.type = 'button';
  signOutBtn.textContent = 'Sign out';
  signOutBtn.style.borderRadius = '10px';
  signOutBtn.style.border = '1px solid rgba(148, 163, 184, 0.45)';
  signOutBtn.style.background = 'transparent';
  signOutBtn.style.color = '#e2e8f0';
  signOutBtn.style.padding = '10px 12px';
  signOutBtn.style.cursor = 'pointer';

  const unlockBtn = document.createElement('button');
  unlockBtn.type = 'button';
  unlockBtn.textContent = 'Re-check access';
  unlockBtn.style.borderRadius = '10px';
  unlockBtn.style.border = '0';
  unlockBtn.style.background = '#22d3ee';
  unlockBtn.style.color = '#082f49';
  unlockBtn.style.padding = '10px 12px';
  unlockBtn.style.fontWeight = '700';
  unlockBtn.style.cursor = 'pointer';

  actions.append(signOutBtn, unlockBtn);
  card.append(title, note, password, feedback, actions);
  wrapper.appendChild(card);
  document.body.appendChild(wrapper);

  return {
    wrapper,
    password,
    feedback,
    signOutBtn,
    unlockBtn,
    show() {
      feedback.textContent = '';
      password.value = '';
      wrapper.style.display = 'flex';
      setTimeout(() => password.focus(), 0);
    },
    hide() {
      wrapper.style.display = 'none';
      feedback.textContent = '';
      password.value = '';
    },
    destroy() {
      wrapper.remove();
    }
  };
}

async function validateWithBackend(supabase, session) {
  if (!session?.loginName || !session?.sessionToken) {
    return { ok: false, message: 'Session token missing.' };
  }

  const result = await invokeEdgeJson('dockpilot-validate-session', {
    loginName: session.loginName,
    sessionToken: session.sessionToken
  });

  if (!result.ok) {
    return { ok: false, message: result.message || 'Session validation failed.' };
  }

  const data = result.data;

  if (!data?.ok || !data?.session) {
    return { ok: false, message: data?.message || 'Session validation failed.' };
  }

  return { ok: true, session: normalizeSession(data.session) };
}

async function recheckWithPassword(supabase, loginName, password) {
  const result = await invokeEdgeJson('dockpilot-login', {
    loginName,
    password
  });

  if (!result.ok) {
    return { ok: false, message: result.message || 'Access re-check failed.' };
  }

  const data = result.data;

  if (!data?.ok || !data?.session) {
    return { ok: false, message: data?.message || 'Access re-check failed.' };
  }

  return { ok: true, session: normalizeSession(data.session) };
}

export async function startDockPilotPageGuard({
  supabase,
  landingPage = './DockPilot_landing.html',
  idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
  idlePollMs = DEFAULT_IDLE_POLL_MS
} = {}) {
  if (!supabase) {
    throw new Error('Supabase client is required for DockPilot guard.');
  }

  const returnTarget = buildReturnTarget();
  let session = getSession();

  if (!session || isSessionExpired(session.expiry)) {
    clearSession();
    clearLastActivity();
    setReturnTarget(returnTarget);
    redirectToLanding(landingPage);
    return null;
  }

  const validation = await validateWithBackend(supabase, session);
  if (!validation.ok || !validation.session) {
    clearSession();
    clearLastActivity();
    setReturnTarget(returnTarget);
    redirectToLanding(landingPage);
    return null;
  }

  session = saveSession(validation.session) || validation.session;
  markActivity();

  const overlay = createIdleOverlay();
  let isLocked = false;

  const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
  const activityHandler = () => {
    if (isLocked) return;
    markActivity();
  };

  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, activityHandler, { passive: true });
  });

  const visibilityHandler = () => {
    if (document.visibilityState === 'visible' && !isLocked) {
      markActivity();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  async function lockSession() {
    if (isLocked) return;
    isLocked = true;
    overlay.show();
  }

  function unlockSession(nextSession) {
    isLocked = false;
    session = saveSession(nextSession) || nextSession;
    markActivity();
    overlay.hide();
  }

  async function signOutAndRedirect() {
    clearSession();
    clearLastActivity();
    clearReturnTarget();
    setReturnTarget(returnTarget);
    redirectToLanding(landingPage);
  }

  overlay.unlockBtn.addEventListener('click', async () => {
    if (!session?.loginName) {
      overlay.feedback.textContent = 'Session identity missing. Please sign in again.';
      return;
    }

    const password = overlay.password.value;
    if (!password.trim()) {
      overlay.feedback.textContent = 'Enter your password to continue.';
      return;
    }

    const result = await recheckWithPassword(supabase, session.loginName, password);
    if (!result.ok || !result.session) {
      overlay.feedback.textContent = result.message || 'Access re-check failed.';
      return;
    }

    if (isSessionExpired(result.session.expiry)) {
      overlay.feedback.textContent = 'Credential has expired. Sign in again.';
      return;
    }

    unlockSession(result.session);
  });

  overlay.signOutBtn.addEventListener('click', async () => {
    await signOutAndRedirect();
  });

  const idleInterval = window.setInterval(() => {
    if (isLocked) return;
    const lastActivityAt = getLastActivityAt() || Date.now();
    if (Date.now() - lastActivityAt >= idleTimeoutMs) {
      lockSession();
    }
  }, idlePollMs);

  return {
    session,
    async revalidateNow() {
      const latest = await validateWithBackend(supabase, getSession());
      if (!latest.ok || !latest.session) {
        await signOutAndRedirect();
        return { ok: false };
      }
      saveSession(latest.session);
      markActivity();
      return { ok: true, session: latest.session };
    },
    async lockNow() {
      await lockSession();
    },
    stop() {
      clearInterval(idleInterval);
      overlay.destroy();
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, activityHandler);
      });
      document.removeEventListener('visibilitychange', visibilityHandler);
    }
  };
}
