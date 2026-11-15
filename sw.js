// Burmese Study app shell. This worker lives alongside index.html, including
// when the site is deployed under GitHub Pages' /<repository>/ path.
const CACHE_NAME = 'burmese-study-v21';
const APP_CACHE_PREFIX = 'burmese-study-v';
const AUDIO_CACHE = 'burmese-audio-v1'; // Keep downloaded audio on app updates.

// Required shell files. Online edition caches legacy remote pronunciation
// imports; the separate offline build rewrites these to one pinned local module.
const APP_ASSETS = [
  './', 'index.html', 'css/styles.css', 'icons/apple-touch-icon.png', 'icons/icon-192.png',
  'js/app.js', 'js/navigation.js', 'js/study.js', 'js/quiz.js', 'js/srs.js',
  'js/more.js', 'js/modal.js', 'js/supabase.js', 'js/dialogues.js',
  'js/hubexplorer.js', 'js/stats.js', 'js/writing.js', 'js/data-backup.js',
  'js/sentences.js', 'js/settings.js', 'js/account-ui.js', 'js/course.js',
  'js/data/course.js', 'js/home.js', 'js/songs.js', 'js/song-vocabulary.js',
  'js/song-practice.js', 'js/song-review-queue.js', 'js/song-review-sync.js',
  'js/burmese.js', 'js/speak.js', 'js/speak-data.js', 'js/speak-audio.js',
  'js/app-audio.js', 'js/offline.js', 'js/edition.js', 'js/offline-vocabulary.js', 'js/offline-flags.js', 'audio/app/clips.json',
  'audio/speak/clips.json',
  'https://celeritas7.github.io/language-utils/burmese.js?v=8',
  'https://celeritas7.github.io/language-utils/burmese.js?v=9'
];

const absolute = asset => new URL(asset, self.registration.scope).href;

async function appStatus() {
  const cache = await caches.open(CACHE_NAME);
  const available = await Promise.all(APP_ASSETS.map(async asset => {
    const response = await cache.match(absolute(asset));
    return !!(response && response.ok);
  }));
  const missing = APP_ASSETS.filter((_, index) => !available[index]);
  const saved = APP_ASSETS.length - missing.length;
  return { ready: missing.length === 0, saved, total: APP_ASSETS.length,
    missing, version: CACHE_NAME };
}

async function cacheAppFiles({ onProgress = () => {}, refresh = false } = {}) {
  const cache = await caches.open(CACHE_NAME);
  let completed = 0, index = 0;
  const failed = [];
  // Limit concurrent downloads on mobile connections.
  const fetchNext = async () => {
    while (index < APP_ASSETS.length) {
      const asset = APP_ASSETS[index++], url = absolute(asset);
      try {
        const existing = await cache.match(url);
        if (refresh || !existing || !existing.ok) {
          const response = await fetch(url, { cache: 'reload' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          await cache.put(url, response);
        }
      } catch (error) {
        failed.push({ asset, message: String(error.message || error) });
      }
      onProgress({ completed: ++completed, total: APP_ASSETS.length,
        failed: failed.length });
    }
  };
  await Promise.all(Array.from({ length: 5 }, fetchNext));
  return { ...(await appStatus()), failed };
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const result = await cacheAppFiles({ refresh: true });
    // Keep the old worker and cache if the update is incomplete.
    if (!result.ready) throw new Error(`App shell incomplete: ${result.missing.length} files missing`);
    // Generated Speak clips are independent: missing audio can be retried later.
    try {
      const response = await fetch(absolute('audio/speak/clips.json'), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const list = await response.json(), audio = await caches.open(AUDIO_CACHE);
      await Promise.all(list.map(async path => {
        const url = absolute(path);
        if (!(await audio.match(url))) {
          try { await audio.add(url); } catch { /* Retry via Settings. */ }
        }
      }));
    } catch { /* Do not block shell activation on optional audio. */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Cache Storage is origin-wide. Never delete another Pages app's cache,
    // or this app's separately downloaded audio.
    await Promise.all(keys.filter(k => k.startsWith(APP_CACHE_PREFIX) && k !== CACHE_NAME)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (!event.ports?.[0] || !['OFFLINE_STATUS', 'CACHE_APP'].includes(event.data?.type)) return;
  const port = event.ports[0];
  event.waitUntil((async () => {
    try {
      if (event.data.type === 'OFFLINE_STATUS') {
        port.postMessage({ type: 'done', status: await appStatus() });
      } else {
        const status = await cacheAppFiles({ onProgress: progress =>
          port.postMessage({ type: 'progress', progress }) });
        port.postMessage({ type: 'done', status });
      }
    } catch (error) {
      port.postMessage({ type: 'error', message: String(error.message || error) });
    } finally { port.close(); }
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET') return;

  // Supabase Storage public recordings are immutable, content-hashed clips.
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/v1/object/public/audio/')) {
    event.respondWith(caches.open(AUDIO_CACHE).then(async cache => {
      const hit = await cache.match(url.href);
      if (hit) return hit;
      const response = await fetch(url.href, { mode: 'cors' });
      if (response.ok) await cache.put(url.href, response.clone());
      return response;
    }));
    return;
  }
  // Never cache account, progress or other Supabase REST responses.
  if (url.hostname.includes('supabase.co')) return;

  if (url.origin === self.location.origin &&
      url.pathname.startsWith(new URL(self.registration.scope).pathname) &&
      url.pathname.includes('/audio/speak/') && url.pathname.endsWith('.mp3')) {
    event.respondWith(caches.open(AUDIO_CACHE).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const response = await fetch(req);
      if (response.ok) await cache.put(req, response.clone());
      return response;
    }));
    return;
  }

  // Restrict code caching to this app's known shell assets.
  const knownAsset = APP_ASSETS.some(path => absolute(path).split('?')[0] === url.href.split('?')[0]);
  if (!knownAsset) return;

  event.respondWith(fetch(req).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(req, copy)));
    }
    return response;
  }).catch(async () => {
    const cache = await caches.open(CACHE_NAME);
    // Versioned JS imports and stylesheet URLs may use ?v=... at runtime.
    return (await cache.match(req, { ignoreSearch: url.origin === self.location.origin }))
      || Response.error();
  }));
});
