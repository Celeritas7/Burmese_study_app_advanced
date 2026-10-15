# Phase 6: Quick fixes (offline audio)

## Finding
The service worker has never been active on GitHub Pages:
- `js/settings.js` registers `/sw.js`, but the file is at `js/sw.js` → 404.
- `/sw.js` and the `/...` asset paths also point to the domain root, not the `/<repo>/` sub-path.
- Registration only happens when the user taps the cache button in Settings.

Airplane mode only worked because of the browser's own short-lived HTTP cache.

## Changes
1. **Move the service worker to the app root.** Put the attached `sw.js` at `Burmese_study_app_advanced/sw.js` (next to `index.html`) and delete `js/sw.js`.
   - All paths are relative.
   - Precaches every file listed in `audio/speak/clips.json`, in its own `burmese-audio-v1` cache.
   - Serves `.mp3` cache-first, since clip names are content hashes.
   - Cache name bumped to `burmese-study-v3`. Speak files, `course.js` and `home.js` are added to the asset list.
2. **Register on every load.** At the end of `js/app.js`, add:
   ```js
   if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
   ```
3. **Fix the Settings button.** In `js/settings.js`, change `register('/sw.js')` to `register('sw.js')`.
4. **When new clips are generated** (new packs/words): bump `CACHE_NAME` (v3 → v4) in `sw.js`, so the install step runs again and caches the new clips. Old clips already in `burmese-audio-v1` are kept, not re-downloaded.

## Already fine (no change needed)
- **Step 1 rule:** the code and copy already agree on "tried". The home screen says "words tried", the ladder note says both answers count, and misses go to Retry.
- **Food 404s:** `speak-data.js` has no `img` paths any more, only the comment.
- **Silent audio:** `play()` already shows the off state and a toast when nothing can play.

## Test
1. Push, open the site online once, then close it and reopen it, so the new service worker takes over.
2. DevTools → Application → Service workers: `sw.js` is activated. Cache storage → `burmese-audio-v1` holds 156 entries.
3. Turn on airplane mode and tap 🔊 on a word **never played before**. It plays.
