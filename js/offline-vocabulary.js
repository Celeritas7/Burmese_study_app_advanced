// Device-only vocabulary packs and practice state for the separate offline origin.
// Nothing here uploads learning history or assumes that legacy Supabase rows
// belong to the signed-in Google user. Shared IDs can be adopted after audit.

export const VOCABULARY_SOURCES = Object.freeze([
  { id: 'kg_book', name: 'KG Book' },
  { id: 'words', name: 'Main Words' },
  { id: 'recipes', name: 'Recipes' },
  { id: 'colloquial', name: 'Colloquial Burmese' }
]);

const DATABASE = 'burmese-study-offline-v1';
const PAGE_SIZE = 400;
const MAX_ROWS = 100000;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Offline storage request failed.'));
  });
}

export function openVocabularyStore() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable on this device.'));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DATABASE, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('packs')) db.createObjectStore('packs', { keyPath: 'source' });
      if (!db.objectStoreNames.contains('states')) db.createObjectStore('states', { keyPath: 'word_id' });
      if (!db.objectStoreNames.contains('events')) db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Offline storage could not be opened.'));
    req.onblocked = () => reject(new Error('Close other offline app tabs and retry.'));
  });
}

async function readStore(store, method = 'getAll', key) {
  const db = await openVocabularyStore();
  try {
    const tx = db.transaction(store, 'readonly');
    return await requestResult(key === undefined ? tx.objectStore(store)[method]() : tx.objectStore(store)[method](key));
  } finally { db.close(); }
}

async function writeStore(store, value) {
  const db = await openVocabularyStore();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error || new Error('Offline storage write failed.'));
      tx.onabort = () => reject(tx.error || new Error('Offline storage write was cancelled.'));
      tx.objectStore(store).put(value);
    });
  } finally { db.close(); }
}

export async function listVocabularyPacks() {
  return (await readStore('packs')).map(({ source, downloadedAt, rows }) =>
    ({ source, downloadedAt, count: rows.length }));
}

export async function getDownloadedWords({ source, categoryId, limit } = {}) {
  const records = source ? [await readStore('packs', 'get', source)] : await readStore('packs');
  let rows = records.filter(Boolean).flatMap(record => record.rows);
  if (categoryId) rows = rows.filter(row => String(row.category_id) === String(categoryId));
  // Limit only after mixing all downloaded sources, to avoid repeatedly
  // presenting the same first 10 words while disconnected.
  if (limit) rows = [...rows].sort(() => Math.random() - .5).slice(0, limit);
  return rows;
}

export async function downloadVocabularyPack(source, fetchPage, onProgress = () => {}) {
  if (!VOCABULARY_SOURCES.some(item => item.id === source)) throw new Error('Unknown vocabulary source.');
  if (typeof fetchPage !== 'function') throw new Error('A vocabulary download function is required.');

  // Build the full replacement *before* writing: a failed download must keep
  // the previously complete pack, never replace it with a partial result.
  const rows = [], ids = new Set();
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const batch = await fetchPage(source, offset, PAGE_SIZE);
    if (!Array.isArray(batch) || batch.length > PAGE_SIZE) throw new Error('Invalid vocabulary response; previous pack retained.');
    for (const row of batch) {
      if (row?.id == null || typeof row.burmese_word !== 'string' ||
          (row.source || source) !== source || ids.has(String(row.id))) {
        throw new Error('Unexpected or repeated vocabulary record; previous pack retained.');
      }
      ids.add(String(row.id)); rows.push(row);
    }
    onProgress({ source, count: rows.length, done: false });
    if (batch.length < PAGE_SIZE) {
      if (!rows.length) throw new Error('No vocabulary returned; previous pack retained.');
      await writeStore('packs', { source, rows, downloadedAt: new Date().toISOString(),
        idSystem: 'burmese_app_words.id' });
      onProgress({ source, count: rows.length, done: true });
      return rows.length;
    }
  }
  throw new Error('Vocabulary download exceeded its safety limit; previous pack retained.');
}

export async function getLocalUserState() { return readStore('states'); }

export async function saveLocalUserRating(wordId, rating) {
  if (wordId == null || !Number.isInteger(rating) || rating < 0 || rating > 6)
    throw new Error('Invalid word rating.');
  const old = await readStore('states', 'get', wordId);
  const isStrong = rating === 6;
  const correct = [1, 3].includes(rating) || isStrong;
  const level = old ? Math.max(0, Math.min(5,
    (old.mastery_level || 0) + (isStrong ? 2 : correct ? 1 : -1))) :
    (isStrong ? 2 : correct ? 1 : 0);
  const next = new Date(Date.now() + [0, 4, 8, 24, 72, 168][level] * 3600000).toISOString();
  const entry = {
    id: `device:${wordId}`, word_id: wordId, word_type: 'word',
    correct_count: (old?.correct_count || 0) + (correct ? 1 : 0),
    incorrect_count: (old?.incorrect_count || 0) + (correct ? 0 : 1),
    streak: correct ? (old?.streak || 0) + 1 : 0,
    mastery_level: level, next_review_at: next,
    last_practiced_at: new Date().toISOString(),
    provenance: 'unowned-device-only'
  };
  return writeStore('states', entry);
}

export async function updateLocalUserState(wordId, updates) {
  const old = await readStore('states', 'get', wordId);
  if (!old) throw new Error('The local review record was not found.');
  const allowed = ['correct_count', 'incorrect_count', 'streak', 'mastery_level', 'next_review_at', 'last_practiced_at'];
  return writeStore('states', { ...old,
    ...Object.fromEntries(Object.entries(updates).filter(([key]) => allowed.includes(key))) });
}

export async function logLocalProgress(event) {
  const entry = { ...event, logged_at: new Date().toISOString(),
    provenance: 'unowned-device-only' };
  const db = await openVocabularyStore();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      tx.oncomplete = () => resolve([entry]);
      tx.onerror = () => reject(tx.error || new Error('Could not save local practice.'));
      tx.objectStore('events').add(entry);
    });
  } finally { db.close(); }
}
