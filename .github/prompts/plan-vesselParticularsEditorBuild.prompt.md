## Plan: Vessel Particulars Editor Build

Build vessel-particulars-input into a production-ready editor page by reusing fleet-registration header/modal patterns, adding a two-column data-entry and document-upload workspace, enforcing strict field/file validation, and implementing browser-local draft persistence with downloadable package export on Save.

**Steps**
1. Phase 1 - Header and top-panel parity (foundation)
1.1. Replace the current minimal top section with the fleet-registration header shell pattern (manager-shell + panel + toolbar-row + status-note + modal scaffold).
1.2. Apply the required button changes:
- Remove Load Fleet button.
- Rename Save Fleet to Save Vessel Particulars.
- Insert Return to Vessel Selector between Save Vessel Particulars and Return to Frontpage.
1.3. Keep the status/action update container immediately below the top section as-is in behavior (reuse setStatus tone classes and transitions).
1.4. Expand the top panel height to host Selected Vessel Context and progress area under the button row.
1.5. Reuse the existing DOCKPILOT_VP_CONTEXT reader and render the context block inside this top section.

2. Phase 2 - Main two-column layout and form model (depends on 1)
2.1. Create the lower workspace area as two equal-width vertical containers with a fixed 5px center gap and responsive collapse rules for smaller screens.
2.2. Left container: title Vessel Details and 14-row form grid.
2.3. Field model and constraints:
- Vessel Name: auto-filled from context and read-only.
- IMO Number: digits only, exactly 7 characters.
- Month-Year of Build: month selector + year selector using rolodex-style wheel/list controls (visible center selection with 3 previous and 3 next items when available).
- Yard Build / Flag / Class: uppercase enforced, max 30 chars, max two-line visual wrap.
- LOA / LBP / Breadth / Depths / Summer Draught: numeric only, max 4 digits before decimal, max 2 digits after decimal; on blur normalize to X.XX m; placeholder in metres.
- DWT / GT / NT: numeric with optional one decimal digit; placeholder in tonnes.
2.4. Add centralized input sanitization and normalization helpers reused by all applicable fields.

3. Phase 3 - Upload panel and file lifecycle (depends on 2)
3.1. Right container: header Upload 4 required Files - formats accepted are pdf, jpg, jpeg, png, tiff.
3.2. Add four rows for GAP/MSP/SEP/DP each with:
- label
- Upload File button (initial light amber)
- hidden file input restricted to accepted MIME/extensions.
3.3. Disable all upload buttons until both Vessel Name and valid IMO Number are present.
3.4. On file choose:
- validate extension/type
- if file size > 1 MB then resize/compress to target 500-600 KB where technically feasible
- if resized, show Alert modal: The uploaded file was resized as per file size restrictions. with Continue button.
3.5. Generate standardized file names:
- GAP_<vessel-token>_<imo-token>.<ext>
- MSP_<vessel-token>_<imo-token>.<ext>
- SEP_<vessel-token>_<imo-token>.<ext>
- DP_<vessel-token>_<imo-token>.<ext>
3.6. Vessel token rule: first 2 chars of first word + last 2 chars of final word/segment, spaces converted to hyphen in normalization path.
3.7. IMO token rule: first 2 digits + last 2 digits.
3.8. Persist uploaded blobs in IndexedDB temporary draft store tied to page/session draft key.
3.9. After successful upload: button turns light green and show File uploaded: with clickable preview link opening in new tab via object URL.

4. Phase 4 - Progress engine and save gating (depends on 2 and 3)
4.1. Add top-section rectangular progress bar under action buttons.
4.2. Compute completion as equal-weight checkpoints: 18 total (14 fields + 4 files).
4.3. Display numeric percent inside the bar; amber until 99%, green only at 100%.
4.4. Keep Save Vessel Particulars disabled until progress reaches 100%.
4.5. Recompute progress on every field normalization, upload success/replacement, and file removal.

5. Phase 5 - Save workflow and output strategy (depends on 4)
5.1. Implement Save Vessel Particulars to execute two outputs together:
- Browser-local canonical draft save (IndexedDB metadata + blobs).
- Downloadable package export for easy access/portability.
5.2. Export structure:
- JSON metadata file containing all 14 particulars, context, timestamps, normalized filenames, and validation stamp.
- Four files emitted with normalized names.
5.3. Package mechanism:
- Preferred: generate ZIP in browser containing JSON + 4 files.
- Fallback if ZIP utility not introduced: sequential downloads with deterministic naming and manifest JSON.
5.4. Status-note success and error states mirror existing page conventions.

6. Phase 6 - Verification and hardening (depends on 1-5)
6.1. Validate all UI requirements against pixel/layout constraints (header parity, context placement, two equal columns, 5px gap).
6.2. Validate each field rule, including uppercase transforms, numeric masks, and unit suffix normalization.
6.3. Validate month/year rolodex ranges (month centered on current month initially, year 1980-2050 centered around current year where possible).
6.4. Validate upload enablement gating on Vessel Name + valid IMO.
6.5. Validate file type filters and resizing modal behavior.
6.6. Validate progress percentages across partial and complete states, including color transition at 100%.
6.7. Validate save disabled/enabled transitions and verify generated local records + exported package contents.

**Relevant files**
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/vessel-particulars-input.html - primary implementation target for layout, validation, uploads, progress, and save flow.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/fleet-registration.html - source of reusable header, status-note, modal markup, and showModal/closeModal/setStatus conventions.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/vessel-selector.html - upstream context writer and naming compatibility reference for DOCKPILOT_VP_CONTEXT fields.
- /Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject/spec_template.html - reusable upload/compression and attachment-size handling patterns.

**Verification**
1. Open vessel-particulars-input via vessel-selector and confirm context vessel auto-fills Vessel Name as read-only.
2. Enter invalid and valid IMO values; verify upload buttons remain disabled until exactly 7 digits.
3. Exercise month/year rolodex controls and confirm visible +/-3 item windows and range limits.
4. For LOA/LBP/Breadth/Depths/Summer Draught, test integer and decimal input; verify blur normalization to X.XX m and rejection of symbols/letters.
5. For DWT/GT/NT, verify numeric with optional one decimal place and in tonnes placeholder behavior.
6. Upload each required document with allowed and disallowed formats; verify filters and error handling.
7. Upload files >1 MB and confirm resize attempt + Alert modal + resulting stored file in target band where feasible.
8. Confirm each successful upload row shows hyperlink preview and button color change to light green.
9. Confirm progress bar percentage increments by 1/18 per completed checkpoint and Save button enables only at 100%.
10. Click Save and verify both outputs are produced: local persisted draft and downloadable package with JSON + 4 renamed files.

**Decisions**
- Accepted resize target clarification: 500-600 KB for oversized files.
- Temporary file storage: IndexedDB (browser-local blob storage).
- Save destination preference: combine local persistent storage with downloadable package export (Hybrid Local).
- Progress rule: equal-weight checkpoints (18 total).
- Vessel Name: read-only once derived from selected context.
- Included scope: frontend-only implementation in vessel-particulars-input with local draft/package workflow.
- Excluded scope: immediate Supabase Storage/database persistence (can be added in a future phase).

**Further Considerations**
1. ZIP export library choice: native compression stream support (where available) vs small client ZIP utility for consistent cross-browser output.
2. If a file cannot be compressed into 500-600 KB without severe degradation, retain best-effort compressed result and present explicit modal notice.
3. Optional next phase: add one-click sync of saved package metadata/files to Supabase Storage + table records for centralized team access.
