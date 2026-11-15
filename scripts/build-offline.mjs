// Cloudflare Pages build: node scripts/build-offline.mjs
// Output: dist-offline/ (deploy this directory on a separate Pages origin).
// Uses exactly the shared app shell's asset list to avoid a second codebase.
import { readFile, writeFile, mkdir, copyFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist-offline');
const worker = await readFile(path.join(root, 'sw.js'), 'utf8');
const list = worker.match(/const APP_ASSETS = \[([\s\S]*?)\];/);
if (!list) throw new Error('Unable to find the shared service worker asset manifest.');
const assets = [...list[1].matchAll(/'([^']+)'/g)].map(match => match[1])
  .filter(file => file !== './' && !file.startsWith('https://'));
const remotePronunciation = /https:\/\/celeritas7\.github\.io\/language-utils\/burmese\.js\?v=[89]/g;
const vendoredPronunciation = './vendor/burmese.js';
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
    const localized = original.replace(remotePronunciation, vendoredPronunciation);
    if (localized.includes('celeritas7.github.io/language-utils/'))
      throw new Error(`An external pronunciation import remains in ${file}`);
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
const offlineWorker = worker
  .replace("const CACHE_NAME = 'burmese-study-v21';", "const CACHE_NAME = 'burmese-study-offline-v1';")
  .replace("const APP_CACHE_PREFIX = 'burmese-study-v';", "const APP_CACHE_PREFIX = 'burmese-study-offline-v';")
  .replace("const AUDIO_CACHE = 'burmese-audio-v1';", "const AUDIO_CACHE = 'burmese-study-offline-audio-v1';")
  .replace(remoteAssetLines, "  'js/vendor/burmese.js', 'manifest.webmanifest'");
if (offlineWorker.includes('https://celeritas7.github.io/language-utils/'))
  throw new Error('The offline worker still depends on remote pronunciation assets.');
await writeFile(path.join(output, 'sw.js'), offlineWorker);
console.log(`Built Burmese Study Offline: ${copied.size} shared shell files and audio in dist-offline/`);
