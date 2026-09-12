const APP_STORE_NAMESPACE = 'DOCKPILOT_APP';

export const APP_STORE_REGISTRY = Object.freeze({
  auth: {
    key: `${APP_STORE_NAMESPACE}_AUTH`,
    scope: 'global',
    description: 'Authentication and session state'
  },
  vesselRegistry: {
    key: `${APP_STORE_NAMESPACE}_VESSEL_REGISTRY`,
    scope: 'company',
    description: 'Canonical vessel registry workspace records'
  },
  fleetRegistration: {
    key: `${APP_STORE_NAMESPACE}_FLEET_REGISTRATION`,
    scope: 'company',
    description: 'Fleet registration and selector state'
  },
  projectContext: {
    key: `${APP_STORE_NAMESPACE}_PROJECT_CONTEXT`,
    scope: 'company',
    description: 'Project navigation and active context snapshots'
  },
  defaults: {
    key: `${APP_STORE_NAMESPACE}_DEFAULTS`,
    scope: 'global',
    description: 'Shared app defaults and configuration'
  }
});

export function getStoreEntry(name) {
  return APP_STORE_REGISTRY[name] || null;
}

export function getStoreKey(name, companyId = null, suffix = null) {
  const entry = getStoreEntry(name);
  if (!entry) {
    const base = `${APP_STORE_NAMESPACE}_${String(name || 'unknown').toUpperCase()}`;
    return suffix ? `${base}_${String(suffix)}` : base;
  }

  let key = entry.key;

  if (companyId) {
    key = `${key}__${String(companyId)}`;
  }

  if (suffix) {
    key = `${key}__${String(suffix)}`;
  }

  return key;
}

export function readStoreValue(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (error) {
    console.warn(`[Store] Failed to read ${key}:`, error);
    return fallback;
  }
}

export function writeStoreValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[Store] Failed to write ${key}:`, error);
    return false;
  }
}

export function removeStoreValue(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[Store] Failed to remove ${key}:`, error);
    return false;
  }
}

export function readModuleState(moduleName, fallback = null, companyId = null, suffix = null) {
  return readStoreValue(getStoreKey(moduleName, companyId, suffix), fallback);
}

export function writeModuleState(moduleName, value, companyId = null, suffix = null) {
  return writeStoreValue(getStoreKey(moduleName, companyId, suffix), value);
}

export function readJsonState(moduleName, fallback = null, companyId = null, suffix = null) {
  return readModuleState(moduleName, fallback, companyId, suffix);
}

export function writeJsonState(moduleName, value, companyId = null, suffix = null) {
  return writeModuleState(moduleName, value, companyId, suffix);
}

export function clearModuleState(moduleName, companyId = null, suffix = null) {
  return removeStoreValue(getStoreKey(moduleName, companyId, suffix));
}

export function readObjectMap(moduleName, fallback = {}, companyId = null) {
  const value = readModuleState(moduleName, fallback, companyId);
  return value && typeof value === 'object' ? value : fallback;
}

export function writeObjectMap(moduleName, value, companyId = null) {
  return writeModuleState(moduleName, value, companyId);
}

export const Store = Object.freeze({
  APP_STORE_REGISTRY,
  getStoreEntry,
  getStoreKey,
  readStoreValue,
  writeStoreValue,
  removeStoreValue,
  readModuleState,
  writeModuleState,
  clearModuleState,
  readObjectMap,
  writeObjectMap
});

export default Store;
