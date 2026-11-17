import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { queueOfflineFlag, listOfflineFlags, listPendingOfflineFlags,
  recordOfflineFlagServerReceipt, exportOfflineFlags } from '../js/offline-flags.js';

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function memoryIndexedDB() {
  const stores = new Map();
  const db = {
    objectStoreNames: { contains: name => stores.has(name) },
    createObjectStore(name) { stores.set(name, new Map()); },
    close() {},
    transaction(name) {
      const records = stores.get(name);
      let completed = false;
      const tx = { oncomplete: null, onerror: null, onabort: null,
        objectStore() {
          return {
            put(value) {
              queueMicrotask(() => {
                records.set(value.id, structuredClone(value));
                if (!completed) { completed = true; tx.oncomplete?.(); }
              });
            },
            getAll() {
              const req = {};
              queueMicrotask(() => { req.result = [...records.values()]; req.onsuccess?.(); });
              return req;
            },
            get(key) {
              const req = {};
              queueMicrotask(() => {
                req.result = structuredClone(records.get(key));
                req.onsuccess?.();
                // If onSuccess queues a write, let that write complete first.
                queueMicrotask(() => {
                  if (!completed) { completed = true; tx.oncomplete?.(); }
                });
              });
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

test('Offline-2C preserves pending flags unless a valid matching server receipt is recorded', async () => {
  const previousDb = globalThis.indexedDB;
  const previousFetch = globalThis.fetch;
  globalThis.indexedDB = memoryIndexedDB();
  globalThis.fetch = () => { throw new Error('No network calls before backend approval'); };
  try {
    const first = await queueOfflineFlag({ wordId: 12, wordText: 'စာ', source: 'words',
      issueType: 'meaning', comment: 'Check this meaning' });
    const second = await queueOfflineFlag({ wordId: 13, wordText: 'ခွေး', source: 'words',
      issueType: 'deva', comment: 'Check the transliteration' });
    assert.deepEqual((await listPendingOfflineFlags()).map(f => f.id).sort(),
      [first.id, second.id].sort());

    await assert.rejects(recordOfflineFlagServerReceipt({ client_id: first.id,
      server_report_id: 'report-1', status: 'sending', received_at: new Date().toISOString() }),
    /Invalid server receipt/);
    await assert.rejects(recordOfflineFlagServerReceipt({ client_id: first.id,
      server_report_id: '', status: 'received', received_at: new Date().toISOString() }),
    /Invalid server receipt/);
    assert.equal((await listPendingOfflineFlags()).length, 2);

    const acknowledgement = { client_id: first.id, server_report_id: 'report-1',
      status: 'received', received_at: '2026-11-16T12:00:00Z' };
    const received = await recordOfflineFlagServerReceipt(acknowledgement);
    assert.equal(received.status, 'received');
    assert.equal(received.server_report_id, 'report-1');
    assert.equal((await listPendingOfflineFlags()).length, 1);
    assert.equal((await listPendingOfflineFlags())[0].id, second.id);
    assert.deepEqual(await recordOfflineFlagServerReceipt({ ...acknowledgement,
      received_at: '2026-11-16T12:30:00Z' }), received, 'retries must not replace receipts');

    await assert.rejects(recordOfflineFlagServerReceipt({ ...acknowledgement,
      server_report_id: 'different-report' }), /Conflicting receipt/);
    await assert.rejects(recordOfflineFlagServerReceipt({ ...acknowledgement,
      client_id: 'missing-on-device' }), /unknown flag/);
    const stored = await listOfflineFlags();
    assert.equal(stored.length, 2, 'a server receipt must not erase a report');
    const exported = JSON.parse(exportOfflineFlags(stored));
    assert.equal(exported.delivery_status, 'partially-received');
    assert.equal(exported.flags.length, 2,
      'received and pending reports remain exportable');

    await recordOfflineFlagServerReceipt({ client_id: second.id, server_report_id: 'report-2',
      status: 'received', received_at: '2026-11-16T12:01:00Z' });
    assert.equal((await listPendingOfflineFlags()).length, 0);
    assert.equal(JSON.parse(exportOfflineFlags(await listOfflineFlags())).delivery_status,
      'all-received');
  } finally {
    if (previousDb === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = previousDb;
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});
