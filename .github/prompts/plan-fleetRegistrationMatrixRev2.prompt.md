## Plan: Fleet Registration Matrix Rev.2

Implement a CertificateManager-style scrolling matrix in fleet-registration.html while preserving the existing manager shell, modal flow, auth/page guard, and vertical scroll behavior. The approach is to refactor table rendering and state logic to model paired columns (C2+C3, C4+C5, ...), keep C1 always visible during horizontal scroll, add a bottom custom horizontal slider with arrow controls, and enforce single-line 30-character cell input for R2 onward.

**Steps**
1. Baseline mapping and safe refactor boundary
- Confirm and preserve existing non-table features in fleet-registration.html: page guard, logout, modal confirm/cancel, status messaging, localStorage lifecycle.
- Isolate table-specific CSS, DOM structure, and JS state/render functions as the only refactor scope.

2. Phase A: Table layout architecture (blocks later rendering)
- Replace single-scroll table area with a split matrix layout inspired by CertificateManager:
  - Left fixed pane for C1 (Fleet Attribute).
  - Middle horizontally scrollable pane for paired data columns.
  - Optional fixed action pane retained only if current row delete UX depends on it.
- Keep table container centered with equal left/right page padding and explicit max width behavior so no container spills beyond viewport.
- Preserve vertical scrolling in body viewport and add synchronized vertical alignment across panes.
- Add visible horizontal scrollbar at bottom via custom slider + arrow controls (as selected), synchronized with middle pane scroll position.

3. Phase B: Header and row model refactor (depends on 2)
- Keep current multi-row header structure per user decision, but map semantics:
  - R1 contains Fleet Registration Matrix label (title/header band).
  - C1 header is Fleet Attribute and remains always visible.
  - R2 default entries for each pair: C2 Fleet Group Name, C3 TM / FM Name; repeat for subsequent pairs.
  - R3 default entries for each pair: C2 Vessel Name, C3 TSI Name; repeat for subsequent pairs.
  - C1 from R4 onward defaults to Vessel 1, Vessel 2, ...
- Introduce explicit paired-column metadata in state so each add/delete operation mutates two columns at once.
- Set minimum columns to C1 + one pair (C2+C3), with C1 non-deletable.

4. Phase C: Rendering and interaction logic (depends on 3)
- Update render pipeline to output synchronized left/middle (and action if retained) table segments from one source state.
- Add visual group separators between each pair using double dashed vertical divider styling at group boundaries (C1|pair1|pair2...).
- Update Add Column / Delete Column actions to operate in pairs from C2+C3 onward.
- Ensure existing Add Row / Delete Row behavior still updates all panes consistently.

5. Phase D: Input constraints and edit behavior (parallel with 4 where possible)
- Enforce single-line editing and hard max 30 characters for all editable cells in R2 onward via keydown + paste sanitization + blur normalization.
- Keep contenteditable UX and existing commit flow, while preventing newline insertion and overlength content.

6. Phase E: Persistence and migration safety (depends on 4 and 5)
- Update normalize/load/save state to support paired-column schema and new default row/header semantics.
- Add migration normalization for old saved state so existing users do not crash after refresh.
- Ensure render remains idempotent and resilient when stored data is incomplete or partially legacy.

7. Phase F: Responsive and overflow guarantees (depends on 2, 4)
- Verify centered container and equal side padding across desktop/tablet/mobile widths.
- Ensure no horizontal overflow at page level; overflow should exist only inside the matrix scroll region.
- Validate sticky C1 behavior while scrolling right.

8. Phase G: Verification and polish (depends on all prior steps)
- Run behavior checks for: sticky C1 visibility, bottom custom horizontal controls, pair separators, paired add/delete correctness, 30-char single-line enforcement, preserved vertical scrolling, and localStorage restore after reload.
- Run quick regression checks for modal confirmations, status toasts/messages, and auth/page guard flow.

**Relevant files**
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/fleet-registration.html - primary refactor target for matrix DOM, CSS layout, state model, render logic, and event wiring.
- /Users/debdeeptochattopadhyay/Supabase B/newprojectProject/CertificateManager.html - behavior reference for fixed first column, horizontal controls, pane synchronization, and separator styling.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/.github/prompts/plan-fleetRegistrationTableRefactor.prompt.md - requirement baseline to ensure no scope drift.

**Verification**
1. Manual UI check: confirm C1 remains visible while right-scrolling middle pane.
2. Manual UI check: bottom custom slider and left/right buttons move horizontal position and stay synchronized with drag/trackpad scrolling.
3. Manual UI check: columns are visually grouped as C2+C3, C4+C5, etc., with double dashed separators between groups.
4. Action check: Add Column adds two columns; Delete Column removes two columns; C1 is never removed; minimum structure preserved.
5. Content check: all R2 onward cells reject newlines and cap at 30 characters on typing and paste.
6. Defaults check: R2 and R3 pair defaults repeat correctly across all pairs; C1 R4 onward shows Vessel n sequence.
7. Layout check: container stays centered with equal side padding at common breakpoints; no page-edge spillage.
8. Persistence check: reload preserves edits and schema; legacy localStorage values normalize without errors.
9. Regression check: existing modals, status messaging, and page guard/login redirection still function.

**Decisions**
- Included scope: apply changes in fleet-registration.html only.
- Included scope: keep current multi-row header model and map new R1/R2/R3 semantics into it.
- Included scope: implement custom horizontal slider/arrow controls like CertificateManager.
- Included scope: enforce hard 30-character, single-line rule for R2 onward editable cells.
- Excluded scope: redesign of non-table page shell, auth architecture, or unrelated pages.

**Further Considerations**
1. Action column placement: if the fixed right action column visually conflicts with paired-column grouping, retain row-delete actions but move controls into the left pane row labels.
2. Accessibility: after behavior parity, consider adding aria-labels and keyboard focus styling for contenteditable matrix cells and custom slider controls.

**Execution Notes (Phase B Completed on 2026-04-25)**
- Header/row semantics locked while preserving multi-row header model:
- R1 remains the matrix title band with Fleet Registration Matrix.
- C1 remains Fleet Attribute and must stay permanently visible.
- R2 defaults by pair: C2 Fleet Group Name, C3 TM / FM Name, repeated for each pair.
- R3 defaults by pair: C2 Vessel Name, C3 TSI Name, repeated for each pair.
- C1 labels from R4 onward default to Vessel 1, Vessel 2, Vessel 3, and so on.
- Paired-column state model defined for implementation:
- Treat all data columns after C1 as ordered pairs: pair 1 = C2+C3, pair 2 = C4+C5, etc.
- Add Column must append one full pair (2 columns) with matching R2/R3 defaults.
- Delete Column must remove one full pair from the right.
- C1 is never deletable.
- Minimum column structure is C1 + one pair (C2+C3).
- State normalization/migration rules defined:
- Legacy single-column-style saved states must normalize to an even number of data columns after C1 by padding the right side when needed.
- Missing pair header defaults must be rehydrated during normalizeState so render never produces blank structural labels.
- Matrix rows must be resized to exactly match normalized column count on load.
- Rendering mapping requirements for Phase C readiness:
- Column indices should be represented as pairIndex and sideIndex (left/right within a pair) to simplify repeated default generation and separator rendering.
- Group separators should be applied at pair boundaries only: between C1 and pair 1, pair 1 and pair 2, and so forth.
- Scope guard reaffirmed:
- Phase B modifies only table schema/default semantics, state normalization, and render mapping.
- No changes to page guard, logout flow, modal system, status messaging shell, or localStorage mechanism ownership.

**Execution Notes (Phase C Completed on 2026-04-25)**
- Render responsibilities finalized for synchronized panes:
- Corner pane: C1 header and row labels.
- Header pane: matrix title plus pair-based subheaders mapped in C2+C3, C4+C5 sequence.
- Body pane: matrix data cells rendered in pair order with stable row/column indexing.
- Action pane: per-row delete actions kept aligned with body rows.
- Pair-boundary separator strategy finalized:
- Apply a double dashed vertical separator at group boundaries only.
- Boundaries occur between C1 and first pair, and between successive pairs.
- Separator class is computed from data column position in pair space and applied to both subheader and body cells.
- Pair-only interaction behavior finalized:
- Add Column appends one full pair from the right with paired defaults.
- Delete Column removes one full rightmost pair.
- Minimum retained structure remains C1 + C2+C3; C1 is never deletable.
- Row mutation consistency finalized:
- Add Row expands to current normalized column width.
- Delete Row removes label and data together and re-renders all panes from the same source state.
- Event model finalized for Phase C:
- Keep delegated events for edit commit and row delete behavior, with selectors aligned to split-pane render targets.
- Preserve existing modal-confirm flows for add/delete actions and keep status messaging semantics unchanged.
- Phase C readiness contract for next implementation pass:
- Rendering must continue from one source-of-truth state object and output synchronized pane fragments.
- Pair separator and pair mutation behavior must be validated before Phase D input constraints are layered in.

**Execution Notes (Phase D Completed on 2026-04-25)**
- Input constraint scope finalized for R2 onward editable content:
- Apply hard 30-character, single-line rules to subheader pair rows, row labels, and matrix data cells.
- Keep main matrix title cell exempt from the 30-character cap.
- Newline prevention behavior finalized across edit lifecycle:
- Keydown: block Enter-based newline insertion and force blur to commit.
- Input: strip embedded newline characters immediately if introduced.
- Paste: intercept, sanitize to single line, and truncate to 30 characters before insertion.
- Blur: perform final normalization and then commit.
- Sanitization helper contract finalized:
- Add helper to remove line breaks.
- Add helper to enforce 30-character maximum.
- Add commit wrapper that applies constraints before commit function dispatch and captures whether sanitation occurred.
- Commit integration finalized:
- `commitHeadCell` keeps unrestricted behavior for main header and constrained behavior for pair subheaders.
- `commitRowLabelCell` and `commitDataCell` commit normalized values only (single-line, max 30 chars).
- Existing success status semantics remain; warning status should surface when sanitation or truncation is applied.
- Event delegation integration finalized:
- Keep delegated listeners model and add scoped input/paste handlers aligned with editable selectors.
- Preserve existing modal-confirm and row/column action workflows without behavior drift.
- Phase D completion gate:
- Single-line and max-length behavior must be enforced for typing, paste, and blur paths consistently before moving to Phase E.

**Execution Notes (Phase E Completed on 2026-04-25)**
- Persistence normalization contract finalized for paired schema safety:
- `normalizeState` must always return a fully shaped object with `mainHeader`, `subHeaderRowA`, `subHeaderRowB`, `rowLabels`, and `matrixData`.
- Data columns after C1 must normalize to complete pairs only.
- Header/default arrays must be rehydrated to match normalized pair count before render.
- Matrix row widths must be resized to normalized column count with empty-string fill for missing cells.
- Legacy migration behavior finalized:
- Handle malformed, partial, or legacy saved payloads in one pass without throwing.
- Repair missing arrays and misaligned lengths using deterministic defaults.
- Preserve valid user data while trimming invalid trailing partial-pair columns.
- Load/save idempotency contract finalized:
- Repeated normalize-load-save cycles must converge to a stable state shape.
- `loadState(normalizedSavedState)` must not introduce additional schema drift on subsequent refreshes.
- Save failures (for example, quota or storage exceptions) must not crash UI interaction flow.
- Failure handling and resilience finalized:
- Parse and type guards around localStorage payloads must safely fall back to normalized defaults.
- Render path must tolerate partial/misaligned state and continue with safe fallbacks rather than throw.
- Commit and event handlers should retain defensive checks for missing dataset/index alignment during repaired-state sessions.
- Scope guard reaffirmed for Phase E:
- Modify only normalization, load/save safety, and render-state resilience behavior.
- Keep modal/page-guard/logout/status shell behavior and table interaction semantics from earlier phases intact.

**Execution Notes (Phase F Completed on 2026-04-25)**
- Responsive centering contract finalized:
- Keep the manager container horizontally centered with equal left/right edge padding across breakpoints.
- Maintain width constraints so layout scales fluidly from mobile through desktop without shell drift.
- Overflow containment contract finalized:
- Prevent page-level horizontal spillage by confining horizontal overflow to the matrix scroll region only.
- Keep fixed panes (C1 and optional action pane) width-constrained while middle pane owns horizontal scrolling.
- Remove dependence on global table minimum width as a page-level constraint; enforce scrollability inside the matrix viewport instead.
- Sticky C1 validation contract finalized:
- C1 remains visible during right-scroll at all supported viewport sizes.
- Sticky offsets and row heights must remain synchronized with header/body/action panes after render and on resize.
- Pair-boundary visuals remain aligned while horizontal scroll position changes.
- Responsive pane sizing finalized:
- Left pane stays fixed for Fleet Attribute visibility.
- Middle pane uses shrinkable width behavior with internal horizontal scroll.
- Optional right action pane stays fixed without forcing container overflow.
- Mobile usability contract finalized:
- Horizontal controls and scroll affordances remain reachable and operable on touch devices.
- Vertical scrolling remains intact while horizontal scrolling is isolated to the matrix body region.
- Phase F completion gate:
- Verify centered shell, no page-edge spill, sticky C1 persistence, and confined overflow behavior on representative mobile/tablet/desktop widths before Phase G verification.

**Execution Notes (Phase G Completed on 2026-04-25)**
- Verification gate finalized as explicit pass or fail checklist:
- Sticky C1 remains visible during right-scroll with header/body/action pane synchronization.
- Bottom horizontal slider and arrow controls stay synchronized with manual and programmatic scrolling.
- Pair boundaries render consistently with double dashed separators across header and body.
- Add/Delete Column enforce pair-only mutation with minimum structure guard (C1 + C2+C3).
- Add/Delete Row preserve cross-pane alignment and modal confirm flow.
- R2 onward edits enforce single-line and 30-character cap for typing, paste, and blur paths.
- Persistence reload restores edits and structure; legacy payloads normalize safely without crashes.
- Modal, status messaging, page guard, and return/logout navigation remain regression-free.
- Viewport validation matrix finalized:
- Mobile baseline around 375 to 480 width for touch controls, sticky visibility, and overflow isolation.
- Tablet baseline around 768 to 1024 width for separator clarity, sync behavior, and centering stability.
- Desktop baseline around 1280 and above for full-width stress validation and no shell drift.
- Acceptance criteria finalized:
- All checklist items must pass across mobile, tablet, and desktop before release signoff.
- Any failure in sticky behavior, pair mutation logic, sanitization rules, persistence safety, or non-table regressions blocks completion.
- Evidence expectation finalized:
- Capture manual test outcomes per viewport and confirm no critical failures before implementation closeout.