const DB_NAME = 'dockpilot_project_storage';
const DB_VERSION = 1;
const STORE_NAME = 'project_records';

function pad2(value) {
  return String(value).padStart(2, '0');
}

export function formatFolderDate(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad2(date.getDate())}${pad2(date.getMonth() + 1)}${date.getFullYear()}`;
}

export function buildProjectFolderName(vesselId, createdAt = new Date()) {
  const safeVesselId = String(vesselId ?? '').trim().replace(/\s+/g, '_') || 'VESSEL';
  const folderDate = formatFolderDate(createdAt) || formatFolderDate();
  return `${safeVesselId}_DP_${folderDate}`;
}

export function buildProjectFolderPath(baseFolderName, projectFolderName) {
  const base = String(baseFolderName ?? '').trim();
  const folder = String(projectFolderName ?? '').trim();
  if (base && folder) return `${base}/${folder}`;
  return folder || base;
}

export function buildProjectFileText({ payload, projectFolderName, projectFolderPath, baseFolderName, txtFileName }) {
  const selectedVesselDetails = payload?.selectedVesselDetails && typeof payload.selectedVesselDetails === 'object'
    ? payload.selectedVesselDetails
    : null;
  const sections = [
    'DockPilot Project Package',
    `Project Folder Name: ${String(projectFolderName ?? '').trim()}`,
    `Project Folder Path: ${String(projectFolderPath ?? '').trim()}`,
    `Project Data File: ${String(txtFileName ?? '').trim()}`,
    baseFolderName ? `Selected Base Folder: ${String(baseFolderName).trim()}` : '',
    '',
    'Selected Vessel Details:',
    selectedVesselDetails ? JSON.stringify(selectedVesselDetails, null, 2) : 'Data pending',
    '',
    'Selected Payload:',
    JSON.stringify(payload ?? {}, null, 2),
    ''
  ];
  return sections.filter((line) => line !== '').join('\n');
}

function openDatabase() {
  if (!window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'projectKey' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open DockPilot project storage.'));
  });
}

export async function saveProjectRecord(record) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error || new Error('Failed to store DockPilot project record.'));
      tx.onabort = () => reject(tx.error || new Error('DockPilot project storage was aborted.'));
    });
  } finally {
    db.close();
  }
}

export async function loadProjectRecord(projectKey) {
  const key = String(projectKey ?? '').trim();
  if (!key) return null;

  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Failed to load DockPilot project record.'));
    });
  } finally {
    db.close();
  }
}

export async function readProjectTextFromRecord(record) {
  if (!record) return '';
  if (record.fileHandle && typeof record.fileHandle.getFile === 'function') {
    const file = await record.fileHandle.getFile();
    return await file.text();
  }
  return String(record.fileText ?? '');
}