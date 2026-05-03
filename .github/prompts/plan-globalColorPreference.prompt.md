## Plan: Global Colour Preference System

Recommended approach is executable and low-risk: add the control UI only on [Frontpage.html](Frontpage.html), centralize theme logic in one shared module, then apply saved mode on every page during startup so child/grandchild pages inherit consistently through navigation.

**Execution readiness**
1. Fully executable without breaking current flows if we keep layout untouched and only add an absolute top-right control layer in [Frontpage.html](Frontpage.html).
2. Main regression risk is hardcoded per-page colors not bound to variables; mitigated by first-pass token overrides and targeted patching only where needed.
3. Your requested requirement to include revert point + sync before execution is included as a hard gate.

**Proposed theme definitions**
1. Theme Colour: preserve current palette as-is.
2. Light Mode:
1. Background base: #f6f7f9
2. Surface/panel: #ffffff / #eef1f5
3. Border/line: #cdd3dc / #b9c2cf
4. Primary text: #151922
5. Muted text: #4f5a6b
6. Accent pair: #3a6fb0 and #6f8db6
3. Dark Mode:
1. Background base: #050608
2. Surface/panel: #111317 / #1a1d22
3. Border/line: #2c3138 / #3a4048
4. Primary text: #f4f6fa
5. Muted text: #c2c9d4
6. Accent pair: #8ea4c2 and #b8c4d6
4. Traffic-light colors: keep existing greens/oranges/reds unchanged in all modes.

**Phased implementation plan**
1. Phase 0: Revert + sync gate before any edits
1. Confirm clean/known git state.
2. Create revert point as commit + tag (and optional backup branch).
3. Run local launcher smoke test with current baseline.
4. Run bundle verification path via [scripts/build_bundle.sh](scripts/build_bundle.sh) and wrapper commands.
5. Confirm GitHub publish constraints using [publish_client_pages.command](publish_client_pages.command).
6. Confirm Supabase project connectivity/status (no migration/function drift).
2. Phase 1: Shared theming foundation
1. Add a new shared theme module (recommended: theme manager JS in repo root).
2. Implement three modes with CSS variable maps and persistence key.
3. Apply theme immediately on load before page guard bootstraps to avoid flash.
3. Phase 2: Frontpage UI
1. Add a top-right semi-transparent container in [Frontpage.html](Frontpage.html) with default 4px padding around the button.
2. Add Colour Preference button with transparent fill, 1px rounded border, centered single-line text, color bound to active scheme.
3. Expand state shows Theme Colour, Light Mode, Dark Mode buttons with identical size/style.
4. Expanded behavior: primary button disabled/dimmed; option clicks do not collapse; outside click collapses and re-enables primary.
4. Phase 3: Cross-page propagation
1. Initialize saved theme on every page during existing module startup flow (most pages already use the same guard bootstrap pattern).
2. Patch pages with hardcoded backgrounds/text where variables are not yet consumed.
3. Verify continuity across parent-child-grandchild navigation paths.
5. Phase 4: Verification + sync closure
1. Validate button states and outside-click behavior on Frontpage.
2. Validate persistence across reload and cross-page navigation.
3. Validate Light/Dark readability and unchanged traffic-light indicators.
4. Re-run local + bundle checks, finalize commit, then GitHub and Supabase checks.

**Relevant files**
1. [Frontpage.html](Frontpage.html): control container, buttons, behavior wiring.
2. [dockpilotPageGuard.js](dockpilotPageGuard.js): best hook for early theme apply across pages.
3. [vessel-particulars-input.html](vessel-particulars-input.html): representative indicator page for traffic-light validation.
4. [scripts/build_bundle.sh](scripts/build_bundle.sh): pre/post implementation verification.
5. [publish_client_pages.command](publish_client_pages.command): GitHub sync/publish gate.
6. [LOCAL_LAUNCHER.md](LOCAL_LAUNCHER.md): local verification flow.

If you approve this proposal, I’ll proceed to implementation in this exact order, starting with the revert-point and sync gate first.