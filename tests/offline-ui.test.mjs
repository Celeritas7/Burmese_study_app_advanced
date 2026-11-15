import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { appWorkerUrl, appScopeUrl, registerAppWorker, checkAppOffline,
  sendWorkerRequest } from '../js/offline.js';

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const ORIGIN = 'https://celeritas7.github.io';
const SCOPE = `${ORIGIN}/Burmese_study_app_advanced/`;

test('UI-6 registers service workers within the GitHub Pages repo, not the origin root', async () => {
  assert.equal(appWorkerUrl(SCOPE), `${SCOPE}sw.js`);
  assert.equal(appScopeUrl(`${SCOPE}index.html`), SCOPE);
  assert.doesNotMatch(source('js/settings.js'), /register\(['"]\/sw\.js/);
  const saved = {
    navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
    window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
    document: Object.getOwnPropertyDescriptor(globalThis, 'document')
  };
  const calls = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    serviceWorker: {
      register: async (...args) => { calls.push(args); return { scope: args[1].scope }; },
      getRegistration: async () => ({ active: { scriptURL: `${ORIGIN}/sw.js` } })
    }
  } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { caches: {} } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { baseURI: SCOPE } });
  try {
    await registerAppWorker();
    assert.deepEqual(calls, [[`${SCOPE}sw.js`, { scope: SCOPE, updateViaCache: 'none' }]]);
    assert.equal((await checkAppOffline()).kind, 'not-installed',
      'an unrelated root worker must not be treated as this app');
  } finally {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test('UI-6 worker message protocol reports progress and verified readiness', async () => {
  const progress = [];
  const worker = { postMessage(message, transfer) {
    assert.equal(message.type, 'CACHE_APP');
    transfer[0].postMessage({ type: 'progress', progress: { completed: 2, total: 3, failed: 0 } });
    transfer[0].postMessage({ type: 'done', status: { ready: true, saved: 3, total: 3 } });
  } };
  const result = await sendWorkerRequest(worker, 'CACHE_APP', event => progress.push(event));
  assert.equal(result.ready, true);
  assert.deepEqual(progress, [{ completed: 2, total: 3, failed: 0 }]);
});

test('UI-6 client status differentiates partial and complete shell caches', async () => {
  const old = Object.fromEntries(['navigator', 'window', 'document'].map(k =>
    [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  let missing = true;
  const worker = { scriptURL: `${SCOPE}sw.js`, postMessage(_message, transfer) {
    transfer[0].postMessage({ type: 'done', status: {
      ready: !missing, saved: missing ? 20 : 38, total: 38,
      missing: missing ? ['js/quiz.js'] : []
    } });
  } };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    serviceWorker: { getRegistration: async () => ({ active: worker }) }
  } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { caches: {} } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { baseURI: SCOPE } });
  try {
    assert.equal((await checkAppOffline()).kind, 'partial');
    missing = false;
    assert.equal((await checkAppOffline()).kind, 'ready');
  } finally {
    for (const [name, descriptor] of Object.entries(old)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});

function createWorker() {
  const listeners = {}, entries = new Map(), deleted = [];
  const makeCache = name => ({
    async match(request, options = {}) {
      const key = typeof request === 'string' ? request : request.url;
      if (!options.ignoreSearch) return entries.get(name)?.get(key);
      return [...(entries.get(name)?.entries() || [])].find(([url]) =>
        new URL(url).origin + new URL(url).pathname === new URL(key).origin + new URL(key).pathname)?.[1];
    },
    async put(request, response) {
      if (!entries.has(name)) entries.set(name, new Map());
      entries.get(name).set(typeof request === 'string' ? request : request.url, response);
    },
    async add(request) { await this.put(request, { ok: true }); }
  });
  const caches = {
    open: async name => makeCache(name),
    keys: async () => [...entries.keys()],
    delete: async name => { deleted.push(name); return entries.delete(name); }
  };
  const self = {
    registration: { scope: SCOPE }, location: { origin: ORIGIN },
    addEventListener(name, fn) { listeners[name] = fn; },
    clients: { async claim() {} }, async skipWaiting() {}
  };
  const sandbox = {
    self, caches, URL, Response,
    fetch: async url => ({ ok: true, status: 200, url, clone() { return this; },
      async json() { return []; } })
  };
  runInNewContext(`${source('sw.js')}\nself.requiredAssets = APP_ASSETS;`, sandbox);
  return { listeners, caches, entries, deleted, sandbox, self };
}

test('UI-6 app shell includes all locally imported modules and real assets', () => {
  const { self } = createWorker();
  for (const path of self.requiredAssets) {
    if (path.startsWith('https:')) continue;
    const file = new URL(`../${path.replace(/^\.\/$/, 'index.html')}`, import.meta.url);
    assert.equal(existsSync(file), true, `${path} must exist for an offline-ready shell`);
  }
  for (const needed of ['js/offline.js', 'js/data/course.js', 'audio/speak/clips.json',
    'audio/app/clips.json', 'https://celeritas7.github.io/language-utils/burmese.js?v=8',
    'https://celeritas7.github.io/language-utils/burmese.js?v=9']) {
    assert.ok(self.requiredAssets.includes(needed), `missing ${needed}`);
  }
});

async function workerMessage(listener, type) {
  const messages = [], port = { postMessage(msg) { messages.push(msg); }, close() {} };
  let completed;
  listener({ data: { type }, ports: [port], waitUntil(task) { completed = task; } });
  await completed;
  return messages;
}

test('UI-6 reports missing files before saying ready, then retries with actual progress', async () => {
  const { listeners, sandbox } = createWorker();
  let status = (await workerMessage(listeners.message, 'OFFLINE_STATUS')).at(-1).status;
  assert.equal(status.ready, false);
  assert.equal(status.saved, 0);
  assert.ok(status.total > 30);
  let fail = true;
  sandbox.fetch = async url => {
    if (fail && String(url).endsWith('/js/quiz.js')) throw new Error('offline');
    return { ok: true, clone() { return this; } };
  };
  let messages = await workerMessage(listeners.message, 'CACHE_APP');
  status = messages.at(-1).status;
  assert.equal(status.ready, false);
  assert.equal(status.missing.length, 1);
  assert.ok(messages.some(m => m.type === 'progress' && m.progress.failed > 0));
  fail = false;
  messages = await workerMessage(listeners.message, 'CACHE_APP');
  status = messages.at(-1).status;
  assert.equal(status.ready, true);
  assert.equal(status.saved, status.total);
  assert.equal(status.missing.length, 0);
});

test('UI-6 upgrade cleanup deletes only old Burmese app-shell caches', async () => {
  const { listeners, caches, deleted } = createWorker();
  for (const name of ['burmese-study-v18', 'burmese-study-v19', 'burmese-study-v20',
    'burmese-audio-v1', 'kg-chart-cache-v3', 'another-app']) await caches.open(name).then(c =>
      c.put('https://example.test/test', { ok: true }));
  let done;
  listeners.activate({ waitUntil(task) { done = task; } });
  await done;
  assert.deepEqual(deleted.sort(), ['burmese-study-v18', 'burmese-study-v19', 'burmese-study-v20']);
});

test('UI-6 refuses an incomplete shell update, preserving the previously cached version', async () => {
  const { listeners, caches, sandbox, self } = createWorker();
  await caches.open('burmese-study-v19').then(c => c.put(`${SCOPE}index.html`, { ok: true }));
  let skipped = false;
  self.skipWaiting = async () => { skipped = true; };
  sandbox.fetch = async url => {
    if (String(url).endsWith('/js/settings.js')) throw new Error('download interrupted');
    return { ok: true, status: 200, clone() { return this; }, async json() { return []; } };
  };
  let finished;
  listeners.install({ waitUntil(task) { finished = task; } });
  await assert.rejects(finished, /App shell incomplete/);
  assert.equal(skipped, false, 'incomplete shell must not be activated');
  assert.ok((await caches.keys()).includes('burmese-study-v19'));
});

test('UI-6 cached versioned JS imports work offline, but Supabase REST is never cached', async () => {
  const { listeners, caches, sandbox } = createWorker();
  const cache = await caches.open('burmese-study-v21');
  const response = { ok: true, source: 'cached-js' };
  await cache.put(`${SCOPE}js/app.js`, response);
  sandbox.fetch = async () => { throw new Error('offline'); };
  let pending;
  const request = { method: 'GET', url: `${SCOPE}js/app.js?v=6` };
  listeners.fetch({ request, respondWith(task) { pending = task; }, waitUntil() {} });
  assert.equal(await pending, response);

  let handled = false;
  listeners.fetch({ request: { method: 'GET', url: 'https://project.supabase.co/rest/v1/words' },
    respondWith() { handled = true; }, waitUntil() {} });
  assert.equal(handled, false);
  assert.match(source('js/settings.js'), /Lessons may still (?:need|require) internet/);
  assert.match(source('sw.js'), /burmese-study-v21/);
});
