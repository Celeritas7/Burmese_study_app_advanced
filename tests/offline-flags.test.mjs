import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { queueOfflineFlag, listOfflineFlags, exportOfflineFlags } from '../js/offline-flags.js';

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function memoryIndexedDB() {
  const stores = new Map();
  const db = {
    objectStoreNames: { contains: name => stores.has(name) },
    createObjectStore(name) { stores.set(name, new Map()); },
    close() {},
    transaction(name) {
      const records = stores.get(name);
      const tx = { oncomplete: null, onerror: null, onabort: null,
        objectStore() {
          return {
            put(value) {
              queueMicrotask(() => { records.set(value.id, structuredClone(value)); tx.oncomplete?.(); });
            },
            getAll() {
              const req = {};
              queueMicrotask(() => { req.result = [...records.values()]; req.onsuccess?.(); });
              return req;
            }
          };
        }
      };
      return tx;
    }
  };
  return { open() {
    const req = {};
    queueMicrotask(() => {
      req.result = db;
      if (!stores.size) req.onupgradeneeded?.();
      req.onsuccess?.();
    });
    return req;
  } };
}

test('Offline flag form saves multiple distinct reports across reopens, without any network calls', async () => {
  const previousDb = globalThis.indexedDB;
  const previousFetch = globalThis.fetch;
  globalThis.indexedDB = memoryIndexedDB();
  globalThis.fetch = () => { throw new Error('No network requests permitted for offline flags'); };
  try {
    const first = await queueOfflineFlag({ wordId: 25, wordText: 'မင်္ဂလာပါ', source: 'words',
      devanagari: 'मिंगलाबा', meaning: 'Hello', issueType: 'deva', comment: 'Incorrect vowel' });
    assert.equal(first.status, 'pending');
    assert.equal(first.provenance, 'device-only-unsubmitted');
    assert.equal(first.user_id, undefined);
    const second = await queueOfflineFlag({ wordId: 25, wordText: 'မင်္ဂလာပါ', source: 'words',
      issueType: 'meaning', comment: 'Different context' });
    assert.notEqual(first.id, second.id, 'each report must have a unique ID');
    const afterReopen = await listOfflineFlags();
    assert.equal(afterReopen.length, 2);
    assert.ok(afterReopen.every(flag => flag.status === 'pending'));
    assert.ok(afterReopen.some(flag => flag.comment === 'Incorrect vowel'));
    assert.ok(afterReopen.some(flag => flag.comment === 'Different context'));
    const exported = JSON.parse(exportOfflineFlags(afterReopen));
    assert.equal(exported.format, 'burmese-study-offline-flags');
    assert.equal(exported.delivery_status, 'not-confirmed');
    assert.equal(exported.flags.length, 2);
    assert.equal((await listOfflineFlags()).length, 2, 'export must not delete pending flags');
  } finally {
    if (previousDb === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = previousDb;
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test('Offline flags validate issue choice and reject invalid or oversized reports', async () => {
  const previousDb = globalThis.indexedDB;
  globalThis.indexedDB = memoryIndexedDB();
  try {
    const base = { wordId: 11, wordText: 'စာ', issueType: 'meaning', comment: '' };
    await assert.rejects(queueOfflineFlag({ ...base, issueType: '' }), /Choose an issue type/);
    await assert.rejects(queueOfflineFlag({ ...base, issueType: 'unrecognized' }), /Choose an issue type/);
    await assert.rejects(queueOfflineFlag({ ...base, comment: 'a'.repeat(1001) }), /1,000/);
    await assert.rejects(queueOfflineFlag({ ...base, wordId: null }), /valid ID/);
    assert.deepEqual(await listOfflineFlags(), []);
  } finally {
    if (previousDb === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = previousDb;
  }
});

test('Flag report UI distinguishes saved from sent and is available offline in service worker', () => {
  assert.match(source('js/study.js'), /data-submit-flag/);
  assert.match(source('js/study.js'), /await queueOfflineFlag\(/);
  assert.match(source('js/study.js'), /Pending delivery; not sent to the server/);
  assert.match(source('js/settings.js'), /Word issue flags/);
  assert.match(source('js/settings.js'), /Download flag reports/);
  assert.match(source('js/settings.js'), /Copy reports/);
  assert.match(source('sw.js'), /'js\/offline-flags\.js'/);
  assert.doesNotMatch(source('js/offline-flags.js'), /fetch\(|\.insert\(|supabase\.co/);
});
