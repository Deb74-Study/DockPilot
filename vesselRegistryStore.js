import { getStoreKey, readStoreValue, writeStoreValue } from './Store.js';

const LOCAL_DB_API_URL = 'http://localhost:3001/vessel-registry';

export const VESSEL_REGISTRY_STORE_KEY = getStoreKey('vesselRegistry');

export const REGISTRY_COL_HEADERS = [
  'Vessel ID', 'Vessel Name', 'IMO No.', 'Month-Year of Build',
  'Yard of Build', 'Flag', 'Class', 'LOA (m)', 'LBP (m)',
  'Breadth (m)', 'Depth (m)', 'Summer Draught (m)', 'DWT (t)', 'GT', 'NT',
  'GA Plan', 'Midship Plan', 'Shell Exp. Plan', 'Docking Plan',
  'P/d UTM', 'P/d Blr. Boro.', 'P/d M/E LDM',
];

export const REGISTRY_COL_KEYS = [
  'vesselId', 'vesselName', 'imo', 'monthYearOfBuild',
  'yardOfBuild', 'flag', 'class', 'loa', 'lbp',
  'breadth', 'depth', 'summerDraught', 'dwt', 'gt', 'nt',
  'gaPlanStatus', 'midshipPlanStatus', 'shellExpPlanStatus', 'dockingPlanStatus',
  'pdUtmStatus', 'pdBlrBoroStatus', 'pdLdmStatus',
];

export const DOC_STATUS_KEYS = new Set([
  'gaPlanStatus',
  'midshipPlanStatus',
  'shellExpPlanStatus',
  'dockingPlanStatus',
  'pdUtmStatus',
  'pdBlrBoroStatus',
  'pdLdmStatus',
]);

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function readRegistryMap() {
  return readStoreValue(VESSEL_REGISTRY_STORE_KEY, {}) || {};
}

export function normalizeDocStatus(value) {
  const raw = String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (!raw) return 'Pending';
  if (/^pending$/i.test(raw)) return 'Pending';

  const match = raw.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) return 'Pending';

  const monthIndex = monthNames.findIndex((month) => month.toLowerCase() === match[2].toLowerCase());
  if (monthIndex < 0) return 'Pending';

  return `${match[1]}-${monthNames[monthIndex]}-${match[3]}`;
}

export function normalizeRegistryRow(row = {}) {
  const source = row && typeof row === 'object' ? row : {};
  const normalized = { ...source };

  for (const key of DOC_STATUS_KEYS) {
    normalized[key] = normalizeDocStatus(source[key]);
  }

  return normalized;
}

export async function loadCompanyVesselRegistry(companyId, legacyKeyPrefix = null) {
  if (!companyId) return [];

  // Read local store / legacy store first so existing data is never lost
  const store = readRegistryMap();
  let localRows = Array.isArray(store[companyId]) ? store[companyId] : [];

  if (!localRows.length && legacyKeyPrefix) {
    try {
      const legacyRaw = localStorage.getItem(`${legacyKeyPrefix}${companyId}`);
      const legacyRows = legacyRaw ? JSON.parse(legacyRaw) : [];
      if (Array.isArray(legacyRows) && legacyRows.length) {
        localRows = legacyRows;
        store[companyId] = localRows;
        writeStoreValue(VESSEL_REGISTRY_STORE_KEY, store);
      }
    } catch (error) {
      console.warn('[vesselRegistryStore] Failed to migrate legacy registry entries:', error);
    }
  }

  if (!localRows.length) {
    const directStoreKey = getStoreKey('vesselRegistry', companyId);
    const directRows = readStoreValue(directStoreKey, []);
    if (Array.isArray(directRows) && directRows.length) {
      localRows = directRows;
      store[companyId] = localRows;
      writeStoreValue(VESSEL_REGISTRY_STORE_KEY, store);
    }
  }

  try {
    const response = await fetch(`${LOCAL_DB_API_URL}?company_id=${encodeURIComponent(companyId)}`);
    if (response.ok) {
      const payload = await response.json();
      const rows = Array.isArray(payload?.rows) ? payload.rows : [];
      if (rows.length > 0) {
        const normalized = rows.map((row) => ({
          vesselId: row.vessel_id || row.vesselId || '',
          vesselName: row.vessel_name || row.vesselName || '',
          imo: row.imo || '',
          monthYearOfBuild: row.month_year_of_build || row.monthYearOfBuild || '',
          yardOfBuild: row.yard_of_build || row.yardOfBuild || '',
          flag: row.flag || '',
          class: row.class || '',
          loa: row.loa ?? '',
          lbp: row.lbp ?? '',
          breadth: row.breadth ?? '',
          depth: row.depth ?? '',
          summerDraught: row.summer_draught ?? row.summerDraught ?? '',
          dwt: row.dwt ?? '',
          gt: row.gt ?? '',
          nt: row.nt ?? '',
          gaPlanStatus: row.ga_plan_status || row.gaPlanStatus || 'Pending',
          midshipPlanStatus: row.midship_plan_status || row.midshipPlanStatus || 'Pending',
          shellExpPlanStatus: row.shell_exp_plan_status || row.shellExpPlanStatus || 'Pending',
          dockingPlanStatus: row.docking_plan_status || row.dockingPlanStatus || 'Pending',
          pdUtmStatus: row.pd_utm_status || row.pdUtmStatus || 'Pending',
          pdBlrBoroStatus: row.pd_blr_boro_status || row.pdBlrBoroStatus || 'Pending',
          pdLdmStatus: row.pd_ldm_status || row.pdLdmStatus || 'Pending'
        })).map(normalizeRegistryRow);

        store[companyId] = normalized;
        writeStoreValue(VESSEL_REGISTRY_STORE_KEY, store);
        return normalized;
      } else if (localRows.length > 0) {
        // Database is empty for this company but local storage has records — auto-upload to PostgreSQL
        saveCompanyVesselRegistry(companyId, localRows).catch(() => {});
        return localRows.map(normalizeRegistryRow);
      }
    }
  } catch (error) {
    console.warn('[vesselRegistryStore] Remote local DB load failed, using local cache:', error);
  }

  return localRows.map(normalizeRegistryRow);
}

export async function saveCompanyVesselRegistry(companyId, rows, legacyKeyPrefix = null) {
  if (!companyId) return;

  const normalizedRows = (Array.isArray(rows) ? rows : []).map(normalizeRegistryRow);
  const store = readRegistryMap();
  store[companyId] = normalizedRows;
  writeStoreValue(VESSEL_REGISTRY_STORE_KEY, store);

  try {
    const response = await fetch(LOCAL_DB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId,
        rows: normalizedRows.map((row) => ({
          vesselId: row.vesselId || '',
          vesselName: row.vesselName || '',
          imo: row.imo || '',
          monthYearOfBuild: row.monthYearOfBuild || '',
          yardOfBuild: row.yardOfBuild || '',
          flag: row.flag || '',
          class: row.class || '',
          loa: row.loa ?? null,
          lbp: row.lbp ?? null,
          breadth: row.breadth ?? null,
          depth: row.depth ?? null,
          summerDraught: row.summerDraught ?? null,
          dwt: row.dwt ?? null,
          gt: row.gt ?? null,
          nt: row.nt ?? null,
          gaPlanStatus: row.gaPlanStatus || 'Pending',
          midshipPlanStatus: row.midshipPlanStatus || 'Pending',
          shellExpPlanStatus: row.shellExpPlanStatus || 'Pending',
          dockingPlanStatus: row.dockingPlanStatus || 'Pending',
          pdUtmStatus: row.pdUtmStatus || 'Pending',
          pdBlrBoroStatus: row.pdBlrBoroStatus || 'Pending',
          pdLdmStatus: row.pdLdmStatus || 'Pending'
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Local DB save failed: ${response.status}`);
    }
  } catch (error) {
    console.warn('[vesselRegistryStore] Remote local DB save failed; local cache preserved:', error);
  }

  if (legacyKeyPrefix) {
    try {
      localStorage.removeItem(`${legacyKeyPrefix}${companyId}`);
    } catch (error) {
      console.warn('[vesselRegistryStore] Failed to clear legacy registry key:', error);
    }
  }
}
