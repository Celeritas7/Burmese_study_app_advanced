import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { offlineCacheVersion } from '../scripts/offline-cache-version.mjs';

const compiled = path => readFileSync(new URL(`../dist-offline/${path}`, import.meta.url), 'utf8');
const origin = 'https://burmese-study-offline.pages.dev';
const scope = `${origin}/`;

test('Offline-2 shell cache identity changes with content but not input enumeration order', () => {
  const initial = [['js/app.js', 'a'], ['js/study.js', 'b']];
  const changed = [['js/app.js', 'a'], ['js/study.js', 'new text']];
  assert.match(offlineCacheVersion(initial), /^burmese-study-offline-v[a-f0-9]{12}$/);
  assert.equal(offlineCacheVersion(initial), offlineCacheVersion([...initial].reverse()));
  assert.notEqual(offlineCacheVersion(initial), offlineCacheVersion(changed));
  assert.notEqual(offlineCacheVersion(initial), offlineCacheVersion([['js/app.js', 'a']]));
});

test('Offline-2 audio download and playback reference the same isolated cache', () => {
  const worker = compiled('sw.js'), client = compiled('js/app-audio.js');
  const workerName = worker.match(/const AUDIO_CACHE = '([^']+)'/)[1];
  const clientName = client.match(/export const AUDIO_CACHE = '([^']+)'/)[1];
  assert.equal(workerName, 'burmese-audio-v1');
  assert.equal(clientName, workerName);
  assert.match(worker, /const LEGACY_AUDIO_CACHE = 'burmese-study-offline-audio-v1';/);
  assert.doesNotMatch(worker, /const CACHE_NAME = 'burmese-study-offline-v1'/);
  assert.doesNotMatch(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'),
    /LEGACY_AUDIO_CACHE/,
    'the original online worker must remain unchanged');
});

function workerHarness() {
  const listeners = {}, stores = new Map(), deleted = [];
  let skipped = false;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const cache = stores.get(name);
      return {
        async match(request, options = {}) {
          const url = typeof request === 'string' ? request : request.url;
          if (!options.ignoreSearch) return cache.get(url);
          return [...cache].find(([key]) => new URL(key).origin + new URL(key).pathname ===
            new URL(url).origin + new URL(url).pathname)?.[1];
        },
        async put(request, response) {
          cache.set(typeof request === 'string' ? request : request.url, response);
        },
        async add(request) { cache.set(request, { ok: true }); }
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { deleted.push(name); return stores.delete(name); }
  };
  const self = {
    registration: { scope }, location: { origin },
    addEventListener(name, fn) { listeners[name] = fn; },
    async skipWaiting() { skipped = true; }, clients: { async claim() {} }
  };
  const sandbox = { self, caches, URL, Response, fetch: async () => {
    throw new Error('No network stub configured');
  } };
  runInNewContext(`${compiled('sw.js')}\nself.cacheName = CACHE_NAME; self.assets = APP_ASSETS;`, sandbox);
  return { listeners, caches, deleted, sandbox, self, get skipped() { return skipped; } };
}

test('Offline-2 active shell remains coherent while a new deployment is on the server', async () => {
  const { listeners, caches, sandbox, self } = workerHarness();
  const previous = { ok: true, version: 'previous code' };
  const cache = await caches.open(self.cacheName);
  await cache.put(`${scope}js/quiz.js`, previous);
  let fetched = false;
  sandbox.fetch = async () => { fetched = true; return { ok: true, version: 'new server code' }; };
  let answer;
  listeners.fetch({ request: { method: 'GET', url: `${scope}js/quiz.js?v=6` },
    respondWith(result) { answer = result; }, waitUntil() {} });
  assert.equal(await answer, previous);
  assert.equal(fetched, false, 'the old worker must not blend in new server JS');
});

test('Offline-2 plays previously cached recordings without re-downloading them', async () => {
  const { listeners, caches, sandbox } = workerHarness();
  const clip = 'https://project.supabase.co/storage/v1/object/public/audio/m/example.mp3';
  const legacyAudio = { ok: true, recording: 'previous offline worker cache' };
  await (await caches.open('burmese-study-offline-audio-v1')).put(clip, legacyAudio);
  sandbox.fetch = async () => { throw new Error('airplane mode'); };
  let pending;
  listeners.fetch({ request: { method: 'GET', url: clip },
    respondWith(result) { pending = result; }, waitUntil() {} });
  assert.equal(await pending, legacyAudio);
});

test('Offline-2 incomplete shell upgrade retains the prior complete version and audio', async () => {
  const { listeners, caches, sandbox, self, deleted } = workerHarness();
  const oldName = 'burmese-study-offline-v000000000000';
  await (await caches.open(oldName)).put(`${scope}index.html`, { ok: true });
  await (await caches.open('burmese-study-offline-audio-v1')).put('https://example.test/voice.mp3', { ok: true });
  sandbox.fetch = async url => {
    if (String(url).endsWith('/js/settings.js')) throw new Error('offline mid-update');
    return { ok: true, clone() { return this; }, async json() { return []; } };
  };
  let pending;
  listeners.install({ waitUntil(task) { pending = task; } });
  await assert.rejects(pending, /App shell incomplete/);
  assert.equal(self.cacheName.startsWith('burmese-study-offline-v'), true);
  assert.equal((await caches.keys()).includes(oldName), true);
  assert.equal(deleted.length, 0);
});

test('Offline-2 complete upgrade activates and removes only old shell caches', async () => {
  const harness = workerHarness();
  const { listeners, caches, sandbox, self, deleted } = harness;
  const oldName = 'burmese-study-offline-v000000000000';
  for (const name of [oldName, 'burmese-study-offline-audio-v1', 'kg-chart-cache-v3'])
    await (await caches.open(name)).put(`${scope}test`, { ok: true });
  sandbox.fetch = async () => ({ ok: true, clone() { return this; }, async json() { return []; } });
  let pending;
  listeners.install({ waitUntil(task) { pending = task; } });
  await pending;
  assert.equal(harness.skipped, true);
  listeners.activate({ waitUntil(task) { pending = task; } });
  await pending;
  assert.deepEqual(deleted, [oldName]);
  assert.equal((await caches.keys()).includes('burmese-study-offline-audio-v1'), true);
  assert.equal((await caches.keys()).includes('kg-chart-cache-v3'), true);
  assert.equal((await caches.keys()).includes(self.cacheName), true);
});
