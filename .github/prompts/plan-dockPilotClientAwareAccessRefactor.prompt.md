## Plan: DockPilot Client-Aware Access Refactor

Refactor fpadev DockPilot from single-tenant credential management to client-aware access management using a shared credentials table keyed by company_id, while preserving manual admin control and introducing role-based default access groups. Execute in phases: schema + edge-function contract first, UI behavior second, then controlled purge and verification.

**Steps**
1. Phase 1 - Baseline and safety gates (blocks all later phases)
1. Confirm Supabase project access, snapshot current schema, and capture current credentials row count before destructive actions.
2. Confirm purge scope: delete all existing rows from public.credentials before onboarding company-linked records.
3. Create rollback SQL/export checkpoint for credentials table data and structure.
1. Phase 2 - Data model for clients and tenant-scoped credentials (depends on Phase 1)
1. Create new companies table (UUID primary key, name, contact/admin fields, registration metadata, TBA1, TBA2, timestamps).
2. Extend credentials with company_id UUID FK to companies and create tenant-safe indexes, including uniqueness on (company_id, login_name).
3. Keep one shared credentials table (not per-client tables) and enforce logical silo by company_id filters in all queries.
4. Backfill path: because purge is approved, do not migrate legacy rows; add constraints after structure is in place.
1. Phase 3 - Access role and access-group contract update (depends on Phase 2)
1. Replace role set with exactly: Frontend Developer, Backend Developer, QA Tester, Company Admin, Technical / DD Manager, TSI / DDSI.
2. Keep access-group catalog exactly: Frontpage Files, API Config, Design Assets, User Reports, Release Notes, Admin Files.
3. Implement role-to-default-group mapping with auto-check on role change, using overwrite behavior each time role changes.
4. Preserve manual overrides after defaults are applied before submit.
1. Phase 4 - Edge function contract hardening for company context (depends on Phase 2 and 3)
1. Update dockpilot-admin-issue-credential payload to require companyId and persist company-linked credentials.
2. Update list/extend/reset admin functions to require companyId and scope reads/updates by company_id.
3. Update dockpilot-login, dockpilot-change-password, and dockpilot-validate-session to resolve and validate credentials in company scope.
4. Extend shared session token payload/validation to include companyId so page/session checks remain tenant-safe.
1. Phase 5 - fpadevDockPilot UI changes: client registration section (depends on Phase 2)
1. Add new Client Registration section with buttons: Register Client, Abort Registration, Add Client.
2. Add fields: Client/Company/DOC Name (required), Company Contact Admin Email ID (required), Contact Name, Contact Address, Client Registration No., Phone No., TBA1, TBA2.
3. Implement default state: all fields read-only/disabled; only Register Client active; Abort/Add inactive and visually disabled.
4. On Register Client click: enable section fields + Abort/Add; lock editability of other operational sections while registration is active.
5. On Abort Registration click: clear in-progress values, restore default disabled state, and re-enable other sections.
6. On Add Client click: validate required fields and email format, submit to companies endpoint/function, refresh client dropdown data source.
1. Phase 6 - fpadevDockPilot UI changes: company selector integration (depends on Phases 3, 4, 5)
1. Add Client/Company Name dropdown in Issue new credentials, Extend existing access, and Reset forgotten password sections.
2. Require client selection before login lists are populated and before action buttons are enabled.
3. When company changes, reload tenant-scoped logins from backend and reset dependent form fields.
4. Ensure Issue flow sends selected companyId in payload and applies role defaults in that tenant context.
1. Phase 7 - Purge execution and tenant bootstrap (depends on Phase 2 and before final verification)
1. Purge all rows from current public.credentials as requested and verify exact count becomes zero.
2. Seed at least one test company via new registration path and issue one credential in that company.
3. Confirm no credential appears when a different company is selected.
1. Phase 8 - Verification and rollout checks (depends on all prior phases)
1. API verification: each admin and auth function rejects missing companyId and succeeds with valid tenant-scoped payloads.
2. UI verification: role default auto-check behavior matches required matrix and still permits manual checkbox edits.
3. Workflow verification: registration mode locking/unlocking works exactly per button-state rules.
4. Data isolation verification: same login_name can exist in different companies only if allowed by uniqueness strategy and is always resolved within selected company.
5. Regression verification: existing password change/session validation flows still work with companyId in token/session.

**Relevant files**
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/fpadevDockPilot.html — add client registration section, role/default mapping logic, company dropdown wiring, section lock-state behavior.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/supabase/functions/dockpilot-admin-issue-credential/index.ts — require companyId and write tenant-scoped credentials.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/supabase/functions/dockpilot-admin-list-credentials/index.ts — list only selected company credentials.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/supabase/functions/dockpilot-admin-extend-credential/index.ts — update expiry with company filter.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/supabase/functions/dockpilot-admin-reset-password/index.ts — reset password with company filter.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/supabase/functions/dockpilot-login/index.ts — authenticate in company scope and return company context.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/supabase/functions/dockpilot-change-password/index.ts — apply company filter for password updates.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/supabase/functions/dockpilot-validate-session/index.ts — validate session token including companyId.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/supabase/functions/_shared/session.ts — extend session payload/type and signing validation for company context.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/supabase/migrations — add migration for companies table, credentials.company_id, constraints, indexes.

**Verification**
1. Run Supabase migration apply against linked project, then inspect table definitions and indexes for companies and credentials(company_id).
2. Run function-level smoke tests for all seven endpoints with and without companyId to confirm expected validation and authorization behavior.
3. In fpadev page, test each of the six roles and confirm default group matrix auto-checks correctly on every role change.
4. Confirm manual checkbox adjustments still persist to payload after role defaults are applied.
5. Validate registration button-state transitions and read-only behavior exactly match D2 requirements.
6. Confirm company dropdown is mandatory in Issue/Extend/Reset and that login options refresh per selected company.
7. Run purge confirmation query and record row count zero before onboarding test companies.
8. Validate cross-company isolation by creating same/similar users in two companies and verifying operations never cross tenant boundaries.

**Decisions**
- Include scope: Tenant model uses shared credentials table with company_id (not per-client physical tables).
- Include scope: Purge all existing credentials rows before onboarding client-specific records.
- Include scope: Client identity uses internal UUID with display name in UI.
- Include scope: Role defaults overwrite current checks whenever role changes, while still allowing manual changes before submit.
- Include scope: Client selection is mandatory before Issue/Extend/Reset actions.
- Exclude scope: No redesign requested for non-fpadev end-user pages in this phase.

**Further Considerations**
1. For auditability, consider adding created_by and updated_by columns on companies and credentials to track admin actions.
2. For stricter isolation, consider DB constraints/triggers preventing credential writes without a valid company_id even from service-role paths.
3. If future reporting across clients is needed, add a dedicated admin reporting function rather than broadening existing list endpoints.