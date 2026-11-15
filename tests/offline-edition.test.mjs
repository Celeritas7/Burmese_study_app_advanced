import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { downloadVocabularyPack, getDownloadedWords, getLocalUserState,
  listVocabularyPacks, saveLocalUserRating, updateLocalUserState,
  logLocalProgress } from '../js/offline-vocabulary.js';

const source = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

function memoryIndexedDB() {
  const tables = new Map();
  let nextEvent = 1;
  const db = {
    objectStoreNames: { contains: name => tables.has(name) },
    createObjectStore(name) { tables.set(name, new Map()); },
    close() {},
    transaction(table) {
      const map = tables.get(table);
      const tx = { oncomplete: null, onerror: null, onabort: null,
        objectStore() {
          const respond = value => {
            const req = {};
            queueMicrotask(() => { req.result = value; req.onsuccess?.(); });
            return req;
          };
          return {
            get: key => respond(map.get(key)),
            getAll: () => respond([...map.values()]),
            put(value) {
              queueMicrotask(() => { map.set(value[table === 'packs' ? 'source' : 'word_id'], value); tx.oncomplete?.(); });
            },
            add(value) {
              queueMicrotask(() => { map.set(nextEvent++, value); tx.oncomplete?.(); });
            }
          };
        }
      };
      return tx;
    }
  };
  return { open() {
    const req = {};
    queueMicrotask(() => { req.result = db; req.onupgradeneeded?.(); req.onsuccess?.(); });
    return req;
  } };
}

const row = (id, source = 'words') => ({ id, source, burmese_word: `စကား${id}`, english_meaning: `Word ${id}` });

test('Offline-1 downloads all public word pages and retries without losing the previous pack', async () => {
  const original = globalThis.indexedDB;
  globalThis.indexedDB = memoryIndexedDB();
  try {
    const progress = [];
    const total = await downloadVocabularyPack('words', (_source, offset, limit) => {
      assert.equal(limit, 400);
      return Promise.resolve(offset ? [row(401)] : Array.from({ length: 400 }, (_, i) => row(i + 1)));
    }, event => progress.push(event));
    assert.equal(total, 401);
    assert.deepEqual(progress.map(e => e.count), [400, 401, 401]);
    assert.equal((await getDownloadedWords({ source: 'words' })).length, 401);
    assert.equal((await getDownloadedWords({ source: 'recipes' })).length, 0);
    assert.equal((await getDownloadedWords({ limit: 12 })).length, 12);
    assert.equal((await listVocabularyPacks())[0].count, 401);

    await assert.rejects(downloadVocabularyPack('words', async (_s, offset) => {
      if (offset) throw new Error('airplane mode');
      return Array.from({ length: 400 }, (_, i) => row(i + 1000));
    }), /airplane mode/);
    assert.equal((await getDownloadedWords({ source: 'words' })).length, 401,
      'a partial replacement must not overwrite the old complete pack');
    await assert.rejects(downloadVocabularyPack('recipes', async () => []), /No vocabulary/);
    await assert.rejects(downloadVocabularyPack('unknown', async () => []), /Unknown/);
    await assert.rejects(downloadVocabularyPack('words', async () => [row(1), row(1)]), /repeated/);
    assert.equal((await listVocabularyPacks()).length, 1);
  } finally {
    if (original === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = original;
  }
});

test('Offline-1 SRS saves device-only ratings and never invents cloud ownership', async () => {
  const original = globalThis.indexedDB;
  globalThis.indexedDB = memoryIndexedDB();
  try {
    const updated = await saveLocalUserRating(565, 6);
    assert.equal(updated.mastery_level, 2);
    assert.equal(updated.provenance, 'unowned-device-only');
    assert.equal(updated.user_id, undefined);
    await saveLocalUserRating(565, 5);
    assert.equal((await getLocalUserState())[0].mastery_level, 1);
    await updateLocalUserState(565, { mastery_level: 4, user_id: 'not-allowed' });
    assert.equal((await getLocalUserState())[0].mastery_level, 4);
    assert.equal((await getLocalUserState())[0].user_id, undefined);
    assert.deepEqual((await logLocalProgress({ event_type: 'rating', word_id: 565 }))[0].provenance,
      'unowned-device-only');
  } finally {
    if (original === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = original;
  }
});

test('Offline-1 build has a separate PWA identity and shares unchanged learning modules', () => {
  const root = path.dirname(fileURLToPath(new URL('../index.html', import.meta.url)));
  const out = path.join(root, 'dist-offline');
  assert.ok(existsSync(path.join(out, 'index.html')), 'run node scripts/build-offline.mjs');
  const html = readFileSync(path.join(out, 'index.html'), 'utf8');
  const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.webmanifest'), 'utf8'));
  assert.match(html, /name="burmese-edition" content="offline"/);
  assert.doesNotMatch(source('index.html'), /burmese-edition/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com/);
  assert.equal(manifest.name, 'Burmese Study Offline');
  assert.equal(manifest.display, 'standalone');
  for (const file of ['js/study.js', 'js/quiz.js', 'js/srs.js', 'js/supabase.js',
    'js/offline-vocabulary.js', 'js/speak.js', 'js/writing.js']) {
    const compiled = readFileSync(path.join(out, file), 'utf8');
    assert.equal(compiled,
      source(file).replace(/https:\/\/celeritas7\.github\.io\/language-utils\/burmese\.js\?v=[89]/g,
        './vendor/burmese.js'), `${file} must share logic, only localize imports`);
    assert.doesNotMatch(compiled, /https:\/\/celeritas7\.github\.io\/language-utils\//);
  }
  assert.match(readFileSync(path.join(out, 'js/vendor/burmese.js'), 'utf8'),
    /export function toPronunciation/);
  const worker = readFileSync(path.join(out, 'sw.js'), 'utf8');
  assert.match(worker, /burmese-study-offline-v1/);
  assert.match(worker, /'js\/vendor\/burmese.js', 'manifest.webmanifest'/);
  assert.doesNotMatch(worker, /https:\/\/celeritas7\.github\.io\/language-utils\//);
  assert.doesNotMatch(source('sw.js'), /burmese-study-offline-v1/);
  assert.match(source('js/app.js'), /isOfflineEdition \? null : new SongReviewCloudSync/);
  assert.match(source('js/supabase.js'), /Offline edition cannot write to shared Supabase tables/);
  assert.match(source('sw.js'), /'js\/offline-vocabulary.js'/);
});
