// Cloudflare Pages build: node scripts/build-offline.mjs
// Output: dist-offline/ (deploy this directory on a separate Pages origin).
// Uses exactly the shared app shell's asset list to avoid a second codebase.
import { readFile, writeFile, mkdir, copyFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { offlineCacheVersion } from './offline-cache-version.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist-offline');
const worker = await readFile(path.join(root, 'sw.js'), 'utf8');
const list = worker.match(/const APP_ASSETS = \[([\s\S]*?)\];/);
if (!list) throw new Error('Unable to find the shared service worker asset manifest.');
const assets = [...list[1].matchAll(/'([^']+)'/g)].map(match => match[1])
  .filter(file => file !== './' && !file.startsWith('https://'));
const remotePronunciation = /https:\/\/celeritas7\.github\.io\/language-utils\/burmese\.js\?v=[89]/g;
const vendoredPronunciation = './vendor/burmese.js';
// Settings previously saved downloaded recordings in this cache. The offline
// service worker must use it too, so a deployment never forces re-downloads.
const offlineAudioCache = 'burmese-audio-v1';
const previousOfflineAudioCache = 'burmese-study-offline-audio-v1';
const copied = new Set();
for (const file of [...assets, 'sw.js']) {
  if (copied.has(file)) continue;
  if (!/^(index\.html|sw\.js|(js|css|audio|icons)\/[\w./-]+)$/.test(file) || file.includes('..'))
    throw new Error(`Unsafe asset path: ${file}`);
  await mkdir(path.dirname(path.join(output, file)), { recursive: true });
  await copyFile(path.join(root, file), path.join(output, file));
  if (file.startsWith('js/') && file.endsWith('.js')) {
    // Do not change the online edition. Only the separate deployed build has
    // local imports; it must not depend on a network cache of GitHub Pages.
    const original = await readFile(path.join(root, file), 'utf8');
    let localized = original.replace(remotePronunciation, vendoredPronunciation);
    if (localized.includes('celeritas7.github.io/language-utils/'))
      throw new Error(`An external pronunciation import remains in ${file}`);
    if (file === 'js/app.js') {
      const registration = 'registerAppWorker().catch(() => {});';
      if (!localized.includes(registration))
        throw new Error('The app worker registration changed. Audit the offline build.');
      // Check published versions when the offline edition launches or regains
      // connectivity. Do not wait for this check before showing saved lessons.
      localized = localized.replace(registration, `registerAppWorker().then(reg => {
  if (navigator.onLine) reg.update().catch(() => {});
}).catch(() => {});
window.addEventListener('online', () => {
  registerAppWorker().then(reg => reg.update()).catch(() => {});
});`);
    }
    if (original !== localized) await writeFile(path.join(output, file), localized);
  }
  copied.add(file);
}

await mkdir(path.join(output, 'js/vendor'), { recursive: true });
await copyFile(path.join(root, 'offline/vendor/burmese.js'),
  path.join(output, 'js/vendor/burmese.js'));

// Audio paths are content-addressed and already bundled in the repository.
// They remain optional for runtime and can be fetched with the audio controls.
await cp(path.join(root, 'audio'), path.join(output, 'audio'), { recursive: true, force: true });

const html = await readFile(path.join(root, 'index.html'), 'utf8');
const offlineHtml = html
  .replace('<title>မြန်မာစာ Burmese Study</title>', '<title>မြန်မာစာ Burmese Study Offline</title>')
  .replace(/^.*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*\n/m, '')
  .replace(/^.*<link href="https:\/\/fonts\.googleapis\.com[^\n]*\n/m, '')
  .replace('</head>', '  <meta name="burmese-edition" content="offline">\n' +
    '  <meta name="theme-color" content="#131F24">\n' +
    '  <link rel="manifest" href="manifest.webmanifest">\n</head>');
if (!offlineHtml.includes('name="burmese-edition"') || offlineHtml.includes('fonts.googleapis.com'))
  throw new Error('Failed to produce an isolated offline document.');
await writeFile(path.join(output, 'index.html'), offlineHtml);
await copyFile(path.join(root, 'offline/manifest.webmanifest'), path.join(output, 'manifest.webmanifest'));
const remoteAssetLines = "  'https://celeritas7.github.io/language-utils/burmese.js?v=8',\n" +
  "  'https://celeritas7.github.io/language-utils/burmese.js?v=9'";
if (!worker.includes(remoteAssetLines))
  throw new Error('The shared pronunciation dependency list has changed. Audit the offline build.');

const networkFirstStart = '  event.respondWith(fetch(req).then(response => {';
if (!worker.includes(networkFirstStart))
  throw new Error('The shared shell fetch strategy changed. Audit the offline build.');
const networkFirstBlock = worker.slice(worker.indexOf(networkFirstStart));
if (!networkFirstBlock.trimEnd().endsWith('});'))
  throw new Error('Unexpected shell fetch handler. Audit the offline build.');
const cacheFirstBlock = `  // An active offline build serves one coherent version, even if Cloudflare
  // publishes new JS while an older worker is still controlling the page.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(req, { ignoreSearch: url.origin === self.location.origin });
    if (hit) return hit;
    const response = await fetch(req);
    if (response.ok) await cache.put(req, response.clone());
    return response;
  })());
});
`;
const cacheVersionPlaceholder = '__OFFLINE_SHELL_VERSION__';
const offlineWorkerTemplate = worker
  .replace("const CACHE_NAME = 'burmese-study-v21';", `const CACHE_NAME = '${cacheVersionPlaceholder}';`)
  .replace("const APP_CACHE_PREFIX = 'burmese-study-v';", "const APP_CACHE_PREFIX = 'burmese-study-offline-v';")
  .replace("const AUDIO_CACHE = 'burmese-audio-v1';",
    `const AUDIO_CACHE = '${offlineAudioCache}';\nconst LEGACY_AUDIO_CACHE = '${previousOfflineAudioCache}';`)
  .replace(remoteAssetLines, "  'js/vendor/burmese.js', 'manifest.webmanifest'")
  .replace('if (!result.ready) throw new Error(', 'if (!result.ready || result.failed.length) throw new Error(')
  // Existing users may have played clips through the former offline worker.
  // Read from that cache on a miss without copying, evicting or renaming it.
  .replace('const hit = await cache.match(url.href);',
    'const hit = await cache.match(url.href) || await (await caches.open(LEGACY_AUDIO_CACHE)).match(url.href);')
  .replace('const hit = await cache.match(req);',
    'const hit = await cache.match(req) || await (await caches.open(LEGACY_AUDIO_CACHE)).match(req);')
  .replace(networkFirstBlock, cacheFirstBlock);

// Hash the *generated* worker template as well as every required compiled
// asset. Changes to build-only cache logic must also produce a new cache name.
const cacheInputs = [['offline-service-worker-template', offlineWorkerTemplate]];
for (const file of [...copied].filter(file => file !== 'sw.js'))
  cacheInputs.push([file, await readFile(path.join(output, file))]);
for (const file of ['js/vendor/burmese.js', 'manifest.webmanifest'])
  cacheInputs.push([file, await readFile(path.join(output, file))]);
const cacheName = offlineCacheVersion(cacheInputs);
const offlineWorker = offlineWorkerTemplate.replace(cacheVersionPlaceholder, cacheName);
if (offlineWorker.includes('https://celeritas7.github.io/language-utils/') ||
    !offlineWorker.includes(`const CACHE_NAME = '${cacheName}';`) ||
    !offlineWorker.includes(`const LEGACY_AUDIO_CACHE = '${previousOfflineAudioCache}';`) ||
    !offlineWorker.includes('if (!result.ready || result.failed.length)') ||
    !offlineWorker.includes('An active offline build serves one coherent version'))
  throw new Error('The offline worker update contract could not be generated.');
await writeFile(path.join(output, 'sw.js'), offlineWorker);
console.log(`Built Burmese Study Offline: ${copied.size} shared shell files and audio in dist-offline/`);
