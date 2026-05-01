## Plan: Fleet Composition and Vessel Particulars Flow

Implement fleet-composition as a functional companion page to fleet-registration by reusing the existing header/modal behavior, adding derived fleet selection trees from live registration state, enforcing a soft cross-tab interlock warning, and routing validated selections into a new vessel-particulars-input page cloned from fleet-analytics.

**Steps**
1. Phase 1 - Baseline shell and parity header
1.1. Replace the scaffold in fleet-composition with the same header structure/styles used in fleet-registration (date badge, return link, more-actions dropdown, modal scaffold, status note).
1.2. Keep Load Fleet and Save Fleet buttons present but intentionally non-functional (no-op handlers that show optional "coming soon" or do nothing).
1.3. In the more-actions dropdown, rename Modify Fleet to Register Fleet and wire it to fleet-registration; retain launch/edit project buttons and existing destinations.
1.4. Preserve page guard startup flow and landing redirect behavior from the current module script.

2. Phase 2 - Data derivation model for selection trees (depends on 1)
2.1. Define a shared parser in fleet-composition that reads DOCKPILOT_FLEET_REG_STATE from localStorage and normalizes headers/matrix into safe arrays.
2.2. Build derived structures from column pairs (0+1, 2+3, ...):
- Fleet group -> manager (TM/FM)
- Manager -> unique TSI list under that manager+group
- TSI -> vessel list
- Fleet group -> total vessel count under associated manager
2.3. Enforce blank filtering rules:
- Ignore blank fleet group cells for selector options
- Ignore blank vessel cells when building vessel options
- Assume TSI is non-blank when vessel exists, but still guard against malformed data
2.4. Persist computed trees in localStorage cache key for quick read and add JSON export generator (manual trigger function, no mandatory file write flow yet).

3. Phase 3 - Realtime sync and soft interlock (depends on 2)
3.1. Add live refresh via storage event listener so updates made in fleet-registration in another tab repopulate selectors in fleet-composition.
3.2. Add local heartbeat/active-page marker for composition and detect concurrent registration tab activity.
3.3. Implement soft interlock behavior (as chosen): when registration opens while composition is active, show Alert modal warning and allow continue.
3.4. Mirror warning behavior in composition if registration becomes active concurrently, without forcing redirects.

4. Phase 4 - Vessel Particulars UI blocks in fleet-composition (depends on 2, parallel with 3 except interlock hooks)
4.1. Add section container under header titled Vessel Particulars with button View / Edit Vessel Particulars.
4.2. Add second section container with four row-containers, each having left subheader and right rectangular selector/input box:
- Fleet Group: dropdown from derived fleet groups
- TM / FM: auto-populated read-only field bound to selected fleet group
- Vessel Name: dropdown filtered by selected fleet group (and optional manager context)
- TSI Name: auto-populated read-only field from selected vessel mapping
4.3. Bind cascading selection behavior:
- Fleet Group selection repopulates manager + vessel options
- Vessel selection resolves TSI field
- Clear downstream values when upstream changes
4.4. Maintain current selection state in memory and optional localStorage key to restore last-used filters.

5. Phase 5 - Validation and navigation flow (depends on 4)
5.1. On View / Edit Vessel Particulars click, validate all four criteria are populated.
5.2. If incomplete, show Alert modal with message: Please first populate the below 4 sort filter criteria. Include Continue button only; Escape and overlay-click behave as close/cancel.
5.3. If complete, navigate to vessel-particulars-input.html and pass selected context (query params or transient storage key; recommend transient storage to avoid long URLs).

6. Phase 6 - Create vessel-particulars-input page (parallel with 4 after header decisions)
6.1. Create vessel-particulars-input.html by cloning fleet-analytics structure/styles/scripts.
6.2. Change page title and visible h1 text from Fleet Analytics to Vessel Particulars.
6.3. Keep page guard import/startup identical so access control remains consistent.
6.4. Optionally render incoming selection summary banner at top for operator confidence (non-blocking enhancement).

7. Phase 7 - Verification and hardening (depends on 1-6)
7.1. Smoke test navigation links/buttons across registration/composition/particulars pages.
7.2. Verify derived tree correctness with representative matrix data including blanks and multiple column pairs.
7.3. Verify realtime sync by editing registration in tab A and observing selector updates in composition tab B.
7.4. Verify soft interlock warnings trigger in both tab-open orders and do not block usage.
7.5. Verify incomplete-filter modal text/buttons/Escape behavior exactly match requirement.

**Relevant files**
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/fleet-composition.html - primary implementation target for header parity, derived trees, selectors, modal validation, navigation, and interlock hooks.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/fleet-registration.html - source pattern for header/button/modal behavior and source state format DOCKPILOT_FLEET_REG_STATE.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/fleet-analytics.html - template to clone for vessel-particulars-input layout and guard script.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/vessel-particulars-input.html - new page to create.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/dockpilotPageGuard.js - reused auth/session guard behavior.

**Verification**
1. Open fleet-registration and fleet-composition in separate tabs; change matrix values and confirm composition selectors refresh from localStorage without reload.
2. Confirm Fleet Group dropdown contains non-blank group names from paired columns only.
3. Confirm TM / FM auto-fills and is non-dropdown.
4. Confirm Vessel dropdown filters to selected fleet group and excludes blank vessel cells.
5. Confirm TSI auto-fills from vessel pair mapping and is non-dropdown.
6. Click View / Edit Vessel Particulars with missing filters and verify exact Alert text and Continue/Escape close behavior.
7. Complete all filters and verify navigation opens vessel-particulars-input successfully.
8. Confirm Load Fleet / Save Fleet buttons exist on composition and remain intentionally non-functional in this phase.

**Decisions**
- Interlock mode: soft warning only, no forced redirect/block.
- Realtime source: localStorage live state from DOCKPILOT_FLEET_REG_STATE.
- Persistence for derived trees: both localStorage cache and JSON export path.
- Included scope: composition UI, derivation logic, interlock warning, modal validation, vessel-particulars-input creation.
- Excluded scope: backend schema/function changes, server-side locking, multi-device interlock enforcement.

**Further Considerations**
1. Data transport to vessel-particulars-input recommendation: use localStorage transient key (safer and cleaner than long query strings).
2. If future hard-lock is required, promote soft interlock to read-only lock rather than redirect to avoid accidental data loss.
3. Consider extracting shared header/modal code into a reusable module after this change to reduce duplication across pages.