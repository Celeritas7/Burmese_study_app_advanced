# Phase UI-6 — Offline controls and final verification

## What was fixed

1. **GitHub Pages scope**: App startup and Settings both register the worker beside the app's `index.html`. A root `/sw.js` points outside `/Burmese_study_app_advanced/` and is not used. An unrelated root-level worker is not treated as a successful Burmese Study installation.
2. **Honest readiness**: The Settings Offline section distinguishes unsupported, unregistered, installing, unknown, incomplete and verified app-shell states. A worker registration alone is never called “cached for offline use.” Readiness checks actual Cache Storage entries for every required shell asset.
3. **Progress and retry**: **Download files** reports checked/saved/failed app files, allows a retry when files are missing and shows errors instead of silently succeeding. **Download all** audio shows saved/total, incomplete catalogs, failed clips and a retry action.
4. **Safer cache updates**: The v20 worker updates the app shell but preserves the downloaded audio cache and leaves caches owned by other GitHub Pages apps alone. An incomplete new app shell cannot replace an older active worker. Versioned CSS/JS requests can use cached files when the network is unavailable.
5. **Safety boundaries**: No app-data backup, restore, reset, account storage, Supabase schema, RLS, Study/SRS grading or song-review synchronization code is changed. No learning records are deleted. The worker deliberately does not cache Supabase REST responses containing account or progress data.

## What “ready offline” means — and does not mean

The green status **App files ready offline** means the current app shell (HTML, JavaScript, CSS, required remote language utilities, manifests and icons) is stored locally and the correct worker responds. It does **not** mean all server-backed vocabulary, Study/SRS progress, generated audio, YouTube videos or Google authentication are available offline. Study/SRS still fetch live Supabase records; they may only work with what a running session already has. Local song reviews and existing local data remain available on the device.

Recorded audio has its **own separate saved/total counter**. A failed or incomplete clip manifest is not counted as all audio being saved. The optional Google web font can fall back to an installed system font when the network is unavailable.

## Automated verification

Run from the repository root:

```bash
node --test tests/*.test.mjs
node --check sw.js
node --check js/offline.js
node --check js/settings.js
node --check js/app-audio.js
git diff --check
```

The UI-6 tests cover Pages-relative worker registration and rejection of unrelated root workers, readiness-versus-registration, progress and retry after a failed file, source-only cache deletion, versioned import fallback, and excluding Supabase REST responses. Earlier account, navigation, local backup, Study, SRS and song tests still run.

## Manual release gate — test on the actual deployed origin

The automated suite does not simulate real browser storage limits, device fonts or Android/iPad installation. Before calling UI-6 fully verified:

- [ ] On `https://celeritas7.github.io/Burmese_study_app_advanced/`, inspect the worker in browser developer tools. Confirm its scope and script URL end with `/Burmese_study_app_advanced/` and `/Burmese_study_app_advanced/sw.js`.
- [ ] With the network connected, open **More → Settings → Offline → Download files**. Confirm the counter reaches the complete asset total and the green status only appears after all required app files exist. Simulate one unavailable asset and verify the incomplete/red status and **Retry** action.
- [ ] Use **Download all** audio; confirm saved/total, retry of failed clips and persistence across a page reload. Verify an interrupted download does not erase clips already stored.
- [ ] Switch to airplane mode and close/reopen the app on Android; repeat on iPad. Confirm the shell opens and local Songs/settings/reviews are available. **Do not assume remote Study/SRS data is downloaded**; confirm the UI handles unavailable server data honestly.
- [ ] Return online; verify signed-in identity and manual song-review sync still work, then sign out/in or change accounts and verify queues stay isolated. Confirm ordinary Study/SRS ratings remain intact on the server.
- [ ] Navigate Home → Study → SRS → Speak → More → Settings → Back; confirm UI-4 history works, Writing zoom restores, and the app responds after installing a new code cache.
- [ ] Check another app on the same `celeritas7.github.io` origin still has its own cache and loads normally. Verify no localStorage, IndexedDB or user-specific Cache Storage entries were deleted.
- [ ] At small Android and iPad widths, confirm no Offline button/text overlap and that live progress/errors remain legible.

## Rollback

Do not delete device data or purge all origin caches. Roll back the code deployment if needed; the new worker only retires obsolete cache names starting with `burmese-study-v`, not audio or other app caches. The existing data remains on the device/server. The UI-5 PR was merged before this branch; this phase should be reviewed as a separate PR.
