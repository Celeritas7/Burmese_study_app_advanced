// ═══ SERVICE WORKER ═══
// Lives at the app ROOT (next to index.html) so its scope covers the whole app.
// All paths are relative, so it works under GitHub Pages' /<repo>/ sub-path.
const CACHE_NAME = 'burmese-study-v5';   // bump whenever new clips are generated, so install re-runs
const AUDIO_CACHE = 'burmese-audio-v1';   // separate: survives app-code cache bumps
const ASSETS = [
  './', 'index.html', 'css/styles.css',
  'js/app.js', 'js/study.js', 'js/quiz.js', 'js/srs.js', 'js/more.js', 'js/modal.js',
  'js/supabase.js', 'js/dialogues.js', 'js/hubexplorer.js', 'js/stats.js', 'js/writing.js',
  'js/sentences.js', 'js/settings.js', 'js/course.js', 'js/home.js',
  'js/speak.js', 'js/speak-data.js', 'js/speak-audio.js',
  'https://celeritas7.github.io/language-utils/burmese.js?v=9'
];

// Add one by one so a single missing file doesn't abort the whole install.
const addEach = (cache, urls) => Promise.all(urls.map(u => cache.add(u).catch(() => {})));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await addEach(await caches.open(CACHE_NAME), ASSETS);
    // Precache every generated clip (~2 MB) so all 🔊 work offline, not just ones played before.
    try {
      const list = await (await fetch('audio/speak/clips.json', { cache: 'no-cache' })).json();
      const audio = await caches.open(AUDIO_CACHE);
      const have = new Set((await audio.keys()).map(r => new URL(r.url).pathname));
      await addEach(audio, list.filter(f => !have.has(new URL(f, self.registration.scope).pathname)));
    } catch {}
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME && k !== AUDIO_CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.hostname.includes('supabase.co')) return;

  // Clips are content-hashed (file name = hash of the text), so they never change: cache first.
  if (url.pathname.includes('/audio/speak/') && url.pathname.endsWith('.mp3')) {
    event.respondWith(caches.open(AUDIO_CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  // Everything else: network first, cache as fallback (offline).
  event.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req))
  );
});
