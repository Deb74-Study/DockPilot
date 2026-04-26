# Plan: Fleet Registration Table Refactor

## Objective
Update Fleet Registration to align with the CertificateManager interaction pattern and table behavior, while excluding due-date edit pop-up behavior.

## Requirements (as-is)
1. Move the header band to the top.
2. Insert a table array with 5 columns.
3. Refer to code in CertificateManager.html as the behavior/style reference.
4. The table array should start with one header row and two subheader rows.
5. Buttons for Add Row, Add Column, Delete Last Column, and Delete Row must match CertificateManager behaviors and pop-up notifications, except for due-date cell pop-ups.

## Notes for Refinement
- Keep page guard and auth flow intact.
- Reuse interaction patterns from CertificateManager where applicable.
- Do not introduce due-date format alert pop-ups in Fleet Registration.

## Continued Review (after prior stop point)

### Structural gaps to close
- Fleet Registration currently has only a simple content card; it needs a full manager shell layout with a top header band and a table panel below.
- The table currently does not exist; target should be a matrix style layout with fixed left label area and scrollable data area.
- Column count must initialize to 5 data columns.
- Header design needs 3 rows total:
	1. Main header row
	2. Subheader row A
	3. Subheader row B
- Row-level delete actions are currently absent and must be rendered as action buttons aligned with each body row.

### Behavior parity required from CertificateManager
- Add Row button flow:
	- Show Alert confirmation modal.
	- On Yes, add one row and show success status message.
- Add Column button flow:
	- Show Alert confirmation modal.
	- On Yes, append one rightmost column and show success status message.
- Delete Last Column button flow:
	- Show Alert confirmation modal with equivalent wording intent.
	- On Yes, remove the rightmost column and show success status message.
- Delete Row button flow:
	- Per-row Delete Row button in action column.
	- Show Alert confirmation modal.
	- On Yes, remove that row and show success status message.
- Modal interaction behavior:
	- Same Continue/Yes/No flow style as CertificateManager.
	- Same overlay click and Esc-to-close behavior.

### Explicit exclusions to preserve
- No due-date format alert modal when editing data cells.
- No certificate import workflow and related controls.
- No JSON load/save workflow.
- No DMT editor flow.
- No Event Log UI or popup flow.

## Target UI Composition for Fleet Registration

### Header band (top)
- Place at top of page container.
- Include page title and short support text.
- Include Return to Frontpage action in header band area.

### Table panel
- Include matrix grid with:
	- Left label/corner section.
	- 5 data columns at initial render.
	- Right action section for row delete controls.
- Header area should render 3 stacked header rows before data rows.
- Support horizontal and vertical scrolling if content overflows.

### Footer/controls
- Provide only the required table controls:
	- Add Row
	- Add Column
	- Delete Last Column
	- Delete Row (per row, not global)

## Data Model Plan
- Keep state in memory + localStorage for page persistence.
- Suggested state shape:
	- mainHeaderText
	- subHeaderRow1 array (length = column count)
	- subHeaderRow2 array (length = column count)
	- rowLabels array
	- matrixData 2D array
- Ensure matrix expansion/contraction rules:
	- Add Column appends an empty cell to every row and appends empty subheader cells.
	- Delete Last Column trims the final cell from every row and both subheader arrays.
	- Add Row appends one row label and one new matrix row of empty cells.
	- Delete Row removes both label and matrix row at selected index.

## Implementation Sequence
1. Replace simple scaffold markup with manager shell structure and top header band.
2. Add modal components and status note area.
3. Add table wrappers and segmented DOM regions for corner/header/body/action sections.
4. Implement initial state with 5 columns and 3 header rows (1 main + 2 sub).
5. Implement render function for:
	 - 3 header rows
	 - body rows
	 - per-row action buttons
6. Wire Add Row, Add Column, Delete Last Column, Delete Row using confirmation modals.
7. Add scroll syncing and pane height syncing only as needed for alignment.
8. Keep DockPilot guard startup intact and verify redirect behavior unchanged.
9. Run manual behavior checks and update status/wording polish.

## Manual Validation Checklist
- Header band is visually at the top and includes Return to Frontpage action.
- Table first renders with exactly 5 data columns.
- Header section shows exactly 3 rows before body rows.
- Add Row shows confirmation and appends one row after Yes.
- Add Column shows confirmation and appends one column after Yes.
- Delete Last Column shows confirmation and removes rightmost column after Yes.
- Delete Row button exists on each row and removes only that row after Yes.
- No due-date pop-up appears when editing table cells.
- No Load/Save/DMT/Event Log/CSV import controls are visible.
- Page guard still enforces authenticated access.

## Risks and Mitigations
- Risk: Header row alignment drift between fixed and scrollable panes.
	- Mitigation: Keep shared row height sync logic after each render and resize.
- Risk: Column delete could break when only one column remains.
	- Mitigation: Add lower-bound guard and status warning.
- Risk: Partial reuse from CertificateManager may accidentally pull excluded features.
	- Mitigation: Copy only required modal + table control patterns; do not include excluded handlers or controls.
