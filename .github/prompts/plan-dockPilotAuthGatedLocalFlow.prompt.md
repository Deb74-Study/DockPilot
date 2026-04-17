## Plan: DockPilot Auth-Gated Local Flow

Implement a shared client-side guard plus backend token validation so every local DockPilot HTML page requires an active backend-validated login, with a 60-minute idle lock that preserves unsaved browser state. Reuse the current DockPilot landing structure (already CertMan-like) and update it with four launcher buttons.

**Steps**
1. Phase 1 - Establish shared auth/session contract (*blocks all later phases*)
1. Define session schema returned by Supabase edge login: user identity, access groups, expiry, issued-at, and signed session token.
1. Define storage keys and state model used across all pages: active session, last-activity timestamp, and optional return path.
1. Define guard outcomes: allow, lock for re-check, or redirect to landing.
1. Phase 2 - Build backend validation path (*depends on Phase 1*)
1. Add/extend edge function endpoints for token-based validation and re-check from idle lock.
1. Ensure validation endpoint is lightweight and callable from local HTML pages using anon client + RLS-safe function logic.
1. Ensure fpadev-issued credentials remain developer-only by keeping issuance flow in developer page and not exposing issuance actions in user pages.
1. Phase 3 - Create reusable client guard module (*depends on Phase 1 and 2*)
1. Add shared module to centralize: get session, validate with backend, idle tracking (events: mouse, key, touch, visibility), lock overlay lifecycle, and redirect helper.
1. Implement 60-minute idle detection using last-activity timestamp; no absolute session cap while activity continues.
1. Implement lock overlay mode for protected pages so DOM/form state remains in-memory and user can re-authenticate without page reload.
1. Implement fallback behavior: if page is opened directly without active validated session, redirect to DockPilot landing with return target.
1. Phase 4 - Apply guard to protected pages (*parallelizable per page after Phase 3*)
1. Add guard bootstrap in Frontpage page.
1. Add guard bootstrap in job index page.
1. Add guard bootstrap in spec template page.
1. Add guard bootstrap in second page and define a template snippet for future pages.
1. Ensure each protected page can restore navigation target after successful landing login.
1. Phase 5 - Update DockPilot landing UX/function buttons (*depends on Phase 1 and can run parallel with Phase 4 after interfaces are fixed*)
1. Keep CertMan-style architecture/layout/functionality baseline.
1. Replace current launch button set with four buttons titled: Launch Dock Pilot, TBD1, TBD2, TBD3.
1. Wire Launch Dock Pilot to the primary protected page entrypoint and keep TBD buttons hidden/disabled until destinations exist.
1. On landing login success, complete backend validation handshake and then route to requested protected page if return target exists.
1. Phase 6 - Developer tooling boundary hardening (*depends on Phase 2*)
1. Keep fpadev page scoped for developer machine use and verify only admin edge functions are called there.
1. Add clear environment/usage note in fpadev UI that it is non-user operational tooling.
1. Phase 7 - Hosted deployment track (*depends on Phases 2 to 5 and can begin once core guard contract is stable*)
1. Deploy DockPilot frontend to a stable hosted channel (Netlify/Vercel/GitHub Pages) while keeping Supabase as backend.
1. Configure Supabase allowed origins/redirect URLs and function CORS behavior for the hosted domain.
1. Validate full hosted flow: landing login, password reset/change, protected-page guard checks, and idle-lock transitions.
1. Phase 8 - Local one-click package track (*depends on Phases 3 to 5 and can run in parallel with Phase 7*)
1. Package the same guarded frontend into a one-click local launcher that starts a local HTTP server and opens landing page.
1. Ensure behavior parity with hosted mode: same session checks, same backend validation calls, same idle-lock UX.
1. Document machine-level setup and quick-recovery steps for restricted/field operation.
1. Phase 9 - Hybrid release and update operations (*depends on Phases 7 and 8*)
1. Establish release workflow: one source repo, hosted auto-deploy path, and packaged artifacts for local channel.
1. Add version manifest/update policy so local packages can check for and apply safe updates with rollback option.
1. Define operational runbook for support: environment checks, auth/guard diagnostics, and controlled rollback steps.
1. Verification and rollout (*depends on all phases*)
1. Verify direct-open redirects: opening each protected HTML file directly without session must send user to landing.
1. Verify login path: successful landing login returns user to originally requested page.
1. Verify idle behavior: active use past 60 minutes should stay unlocked; 60 minutes inactivity should lock overlay and require re-check.
1. Verify unsaved-state preservation: edit form fields, idle-lock, unlock, confirm values remain unchanged.
1. Verify failure behavior: invalid re-check keeps lock active without losing page state; full refresh still enforces guard.

**Relevant files**
- /Users/debdeeptochattopadhyay/Supabase A/DockPilot/DockPilot_landing.html - reuse existing login/session functions and update launcher button labels/targets and post-login routing.
- /Users/debdeeptochattopadhyay/Supabase A/DockPilot/fpadevDockPilot.html - keep developer-only issuance/admin flow; add explicit scope cues.
- /Users/debdeeptochattopadhyay/Supabase A/DockPilot/supabaseClient.js - shared Supabase initialization used by landing and protected pages.
- /Users/debdeeptochattopadhyay/Supabase A/DockPilot/Frontpage.html - add auth guard bootstrap and idle lock integration.
- /Users/debdeeptochattopadhyay/Supabase A/DockPilot/job_index.html - add auth guard bootstrap and idle lock integration preserving current in-memory edits.
- /Users/debdeeptochattopadhyay/Supabase A/DockPilot/spec_template.html - add auth guard bootstrap and idle lock integration preserving current in-memory edits.
- /Users/debdeeptochattopadhyay/Supabase A/DockPilot/2nd Page.html - add auth guard bootstrap and future-page template alignment.
- /Users/debdeeptochattopadhyay/Supabase B/newprojectProject/CertMan_landing.html - reference only for layout/interaction parity for DockPilot landing.

**Verification**
1. Manual browser matrix from local files: direct-open each protected file, confirm redirect to landing, login, return path works.
1. Manual idle test: simulate user activity and inactivity timelines around 60-minute threshold; validate lock/unlock transitions.
1. Manual state test in job/spec pages: make unsaved changes, trigger idle lock, unlock, verify no data loss unless page reload/device crash.
1. Backend validation check: confirm every unlock and initial protected-page access calls backend validation endpoint and rejects tampered local session.
1. Regression check of landing: login failure popup, password change flow, logout, and new button visibility rules.

**Decisions**
- Use signed token plus backend validation, not localStorage-only trust.
- Use in-page lock overlay after idle timeout to preserve unsaved edits.
- Protect Frontpage, job index, spec template, second page, and future DockPilot pages by default.
- Included scope now: auth architecture, guard flow, idle re-check model, and landing button architecture.
- Excluded scope now: building destination functionality for TBD1/TBD2/TBD3.

**Further Considerations**
1. Return-path allowlist should be enforced to avoid open redirects; recommended to only allow known local DockPilot page names.
2. For local-file operation, ensure all pages are served in a browser context that permits module imports and Supabase network access; if file:// restrictions appear, run a lightweight local static server.
3. Decide whether re-check requires full password re-entry or a lightweight PIN/challenge backed by the same token validation endpoint.