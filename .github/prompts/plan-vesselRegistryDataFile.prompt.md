# Plan: Vessel Registry Data File + Provisional Page Table

Create a **localStorage-backed vessel registry** (`DOCKPILOT_VESSEL_REGISTRY_<companyId>`) that captures 14 form fields + 1 auto-computed Vessel ID on every save. Rebuild `provisional-page.html` as a read-only table viewer with live search, structured like fleet-registration.html with vessel-selector.html's header.

---

## Decisions

- **Storage**: localStorage key `DOCKPILOT_VESSEL_REGISTRY_<companyId>` → JSON array of 15-field records
- **Upsert key**: `imo` field (unique per vessel)
- **Provisional page role**: Read-only view
- **Search**: Live filter by vessel name or IMO as user types
- **Column headers**: Vessel ID first, then 14 form field labels (see table below)
- **companyId access**: `getSession()?.companyId` — `getSession` is already exported from `dockpilotAuthContract.js`

---

## 15 Record Fields

| # | Key | Column Header | Source |
|---|-----|---|---|
| 1 | `vesselId` | Vessel ID | `makeVesselToken(name) + "_" + makeImoToken(imo)` — reuses existing helpers |
| 2 | `vesselName` | Vessel Name | `fieldVesselName.value` |
| 3 | `imo` | IMO No. | `fieldImo.value` |
| 4 | `monthYearOfBuild` | Month-Year of Build | `monthRolodex.getLabel() + " " + yearRolodex.getLabel()` |
| 5 | `yardOfBuild` | Yard of Build | `fieldYardBuild.value` |
| 6 | `flag` | Flag | `fieldFlag.value` |
| 7 | `class` | Class | `getSelectedClassLabel()` |
| 8 | `loa` | LOA (m) | `fieldLoa.value` |
| 9 | `lbp` | LBP (m) | `fieldLbp.value` |
| 10 | `breadth` | Breadth (m) | `fieldBreadth.value` |
| 11 | `depth` | Depth (m) | `fieldDepths.value` |
| 12 | `summerDraught` | Summer Draught (m) | `fieldSummerDraught.value` |
| 13 | `dwt` | DWT (t) | `fieldDwt.value` |
| 14 | `gt` | GT | `fieldGt.value` |
| 15 | `nt` | NT | `fieldNt.value` |

---

## Steps

### Phase 1 — vessel-particulars-input.html (3 changes)

1. Add `getSession` to the existing import from `./dockpilotAuthContract.js` (line ~1330)
2. Add `pushToVesselRegistry(metadata)` function after `executeVpSave()`:
   - Gets companyId via `getSession()?.companyId`; skips silently if null
   - Builds record from `metadata.particulars` + computes `vesselId` using existing `makeVesselToken` / `makeImoToken`
   - Reads `DOCKPILOT_VESSEL_REGISTRY_<companyId>` from localStorage (default `[]`)
   - **Upserts by `imo`**: updates existing record if found, pushes new if not
   - Writes updated array back to localStorage
3. Call `pushToVesselRegistry(metadata)` inside the `try` block of `executeVpSave()`, after `await exportVpPackage(metadata)` resolves

### Phase 2 — provisional-page.html (full rebuild)

4. Complete file replacement with:

**Page structure** (grid: `auto auto minmax(0, 1fr)` — header | status note | table panel):

**Row 1 — Header Panel** (`.panel.header-panel`, from vessel-selector.html):
- Toolbar row: date badge (`.tag`) left + Return to Frontpage button right
- More-actions dropdown (See More / See Less toggle) with: Vessel Particulars, Register Fleet links
- `<h1>Vessel Registry</h1>` + muted subtitle paragraph

**Row 2 — Status Note** (`<p id="statusNote" class="status-note">`)

**Row 3 — Table Panel** (`.panel.table-panel`):
- **Table Title Band** (`div.table-title-band`) — flex row:
  - `<input id="registrySearch" type="text" maxlength="30" placeholder="Search vessel or IMO…">` (left, `flex: 1`)
  - `<button id="searchBtn" class="secondary-btn lens-btn">🔍</button>` (right)
- **Table area** (`div#tableViewport.table-area`) — overflow scroll container:
  - `<table id="registryTable"><thead id="tableHead"></thead><tbody id="tableBody"></tbody></table>`
  - Single sticky `<thead>` row, 15 `<th>` cells
  - `<tbody>` rows rendered from registry array; empty state shows "No vessels saved yet." spanning all columns
  - Vessel ID column (`th:first-child`, `td:first-child`): sticky left, `z-index: 8`, `background: var(--badge-fill)`
- **Horizontal scroll controls** — same range slider + arrow button pattern as fleet-registration.html

**JavaScript logic**:
- Imports: `supabase`, `startDockPilotPageGuard`, `loadSavedTheme` from `./dockpilotTheme.js`, `getSession` from `./dockpilotAuthContract.js`
- Constants: `REGISTRY_KEY_PREFIX = 'DOCKPILOT_VESSEL_REGISTRY_'`, `COL_HEADERS` array (15 entries matching field table above)
- `loadRegistry(companyId)`: reads `DOCKPILOT_VESSEL_REGISTRY_${companyId}` from localStorage, returns parsed array or `[]`
- `renderTable(rows)`: builds `<thead>` (once on first call) and full `<tbody>` from rows array; includes empty state row
- `applyFilter(query)`: filters `allRows` where `vesselName` or `imo` contains query (case-insensitive), calls `renderTable(filtered)`
- `registrySearch` input event → `applyFilter(input.value.trim())`
- `searchBtn` click → `applyFilter(registrySearch.value.trim())`
- Date badge update on load
- Guard `.then()`: get session → get companyId → `allRows = loadRegistry(companyId)` → `renderTable(allRows)` → `setStatus('Loaded N vessel(s).', 'success')`
- `syncScrollControls()` + range/arrow wiring (same pattern as fleet-registration.html)

**CSS**:
- Full `:root` variable block matching other pages
- `.manager-shell`, `.panel`, `.header-panel`, `.toolbar-row`, `.toolbar-actions` — same as vessel-selector.html
- `.status-note`, `.status-note.success`, `.status-note.warn` — same as vessel-selector.html
- `.table-title-band`: `display: flex; align-items: center; gap: 8px; padding: 6px 12px;`
- `#registrySearch`: flex input, `max-width: 30ch` cap enforced by `maxlength="30"`, rounded border, matching form-input style
- `.lens-btn`: compact secondary-btn with no text padding
- `thead th`: `position: sticky; top: 0; z-index: 4; background: var(--badge-fill); color: var(--accent); font-weight: 700;`
- `tbody td`: `text-align: center; color: var(--blue-text); background: #ffffff;`
- Alternating column gradient: even indices (0, 2, 4, 6…) → `linear-gradient(90deg, #E0E8EF 0%, #ffffff 100%)` — matching fleet-registration pattern
- Sticky Vessel ID column: `position: sticky; left: 0; z-index: 8; background: var(--badge-fill); color: var(--accent);`
- Light Mode overrides: inherited from `dockpilotTheme.js` via `data-theme="light"` selectors; add specific overrides for registry table if needed

---

## Relevant Files

- [vessel-particulars-input.html](vessel-particulars-input.html) — import at line 1330, `executeVpSave()` at ~line 2340, `makeVesselToken` at line 1748, `makeImoToken` at line 1756
- [provisional-page.html](provisional-page.html) — full rebuild (currently ~60-line placeholder)
- [dockpilotAuthContract.js](dockpilotAuthContract.js) — `getSession` export (companyId at line 39)
- [fleet-registration.html](fleet-registration.html) — table CSS/structure template
- [vessel-selector.html](vessel-selector.html) — header panel + status note HTML/CSS template
- [dockpilotTheme.js](dockpilotTheme.js) — Light Mode overrides (may need additions for registry table)

---

## Verification

1. Save a vessel on vessel-particulars-input.html → inspect `DOCKPILOT_VESSEL_REGISTRY_<companyId>` in DevTools → confirm 15-field record present
2. Save same vessel again → confirm array still has 1 record (upserted, not duplicated)
3. Save a second vessel → confirm array has 2 records
4. Open provisional-page.html → 15-column table renders with correct headers and data
5. Type partial vessel name in search box → rows filter live to matching rows only
6. Type partial IMO number → filtering works on IMO field too
7. Clear search → all rows restore
8. Toggle Light Mode → header and gradient columns render correctly
9. No console errors on either page
10. Horizontal scroll controls sync with table scroll position

---

## Excluded Scope

- No edit/delete capability on provisional-page.html (read-only per decision)
- No Supabase sync (localStorage only per decision)
- No pagination or export from provisional-page.html
- No Dark Mode specific overrides (inherited defaults are sufficient)
