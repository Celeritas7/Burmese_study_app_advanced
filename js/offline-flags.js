// Offline-only word-quality reports. No Supabase request, auth identity or
// progress-event upload is performed here. A reviewed receiving endpoint is
// required before these reports can be marked as delivered.
const DATABASE = 'burmese-study-offline-flags-v1';
const STORE = 'flags';
const ISSUE_TYPES = new Set(['deva', 'meaning', 'sentence', 'notaword']);

function limitedText(value, length) {
  return String(value ?? '').trim().slice(0, length);
}

function openFlagsDatabase() {
  if (typeof indexedDB === 'undefined')
    return Promise.reject(new Error('Device storage is unavailable. Your flag was not saved.'));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DATABASE, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open the local flag outbox.'));
    req.onblocked = () => reject(new Error('Close other Burmese Study Offline tabs and retry.'));
  });
}

function newFlagId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `flag-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function queueOfflineFlag({ wordId, wordText, source, devanagari, meaning, issueType, comment }) {
  if (wordId == null || !limitedText(wordId, 128) || !limitedText(wordText, 200))
    throw new Error('This word does not have a valid ID or spelling. Flag not saved.');
  if (!ISSUE_TYPES.has(issueType))
    throw new Error('Choose an issue type before saving your flag.');
  if (String(comment ?? '').length > 1000)
    throw new Error('Keep the comment within 1,000 characters.');

  const row = {
    id: newFlagId(),
    word_id: limitedText(wordId, 128),
    word_text: limitedText(wordText, 200),
    source: limitedText(source, 60),
    devanagari: limitedText(devanagari, 200),
    meaning: limitedText(meaning, 500),
    issue_type: issueType,
    comment: limitedText(comment, 1000),
    created_at: new Date().toISOString(),
    status: 'pending',
    provenance: 'device-only-unsubmitted',
    schema_version: 1
  };
  const db = await openFlagsDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve(row);
      tx.onerror = () => reject(tx.error || new Error('Could not save the flag on this device.'));
      tx.onabort = () => reject(tx.error || new Error('Flag save was interrupted.'));
      tx.objectStore(STORE).put(row);
    });
  } finally { db.close(); }
}

export async function listOfflineFlags() {
  const db = await openFlagsDatabase();
  try {
    const rows = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not read saved flags.'));
    });
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  } finally { db.close(); }
}

export function exportOfflineFlags(flags) {
  if (!Array.isArray(flags)) throw new Error('Cannot export an invalid flag list.');
  return JSON.stringify({ format: 'burmese-study-offline-flags', version: 1,
    exported_at: new Date().toISOString(), delivery_status: 'not-confirmed', flags }, null, 2);
}
