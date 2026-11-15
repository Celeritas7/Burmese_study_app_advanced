# Offline-1: separate edition, downloaded vocabulary and device-only practice

This is an incremental, reviewable foundation for a separately installed Burmese
Study Offline PWA. The existing GitHub Pages online site remains the default:
without an offline-edition meta marker, existing Supabase reads, Study/SRS
rating writes, Google account and song review sync behave as before.

## Build and deployment

Run `node scripts/build-offline.mjs` in the repository. Deploy only
`dist-offline/` to **a separate Cloudflare Pages project and origin**.
Cloudflare Pages configuration: Framework `None`, build command
`node scripts/build-offline.mjs`, output directory `dist-offline`.
The repo is the single source of UI, learning logic and service worker.
Do **not** set the Cloudflare output directory to `/` or point the online
GitHub Pages site at `dist-offline/`.

The generated offline index has its own PWA manifest, title and meta marker.
The code/assets, service worker, browser storage and install identity are
isolated by the separate origin. No new Cloudflare deployment has been made
or verified as part of this PR.

The build replaces the runtime GitHub Pages pronunciation imports with a
locally bundled snapshot of `Celeritas7/language-utils/burmese.js` in
`offline/vendor/burmese.js`. Its separate service worker caches that file
and the offline manifest, rather than relying on a remote pronunciation
module during offline startup. When the shared pronunciation engine changes,
review and refresh this pinned snapshot separately; it is not live-synced.

## Data and security boundaries

- **Settings → Offline** offers explicit downloads for KG Book, Main Words,
  Recipes and Colloquial Burmese packs. Public word rows are fetched in pages
  using only the existing public anon key; no account progress is downloaded.
- A complete pack replaces the prior pack atomically. A failed or truncated
  download leaves the previous completed copy intact; the user can retry.
- Study sessions, MCQ, typing and matching quiz questions use the downloaded
  words, even without a network. Local ratings and SRS mastery records are
  stored in IndexedDB within the offline origin, with **unowned-device-only**
  provenance and **no cloud upload**. Existing legacy account ownership is
  not inferred from word IDs, Google sign-in or earlier shared-table rows.
- Existing Google song-sync initialization is disabled in the separate
  offline edition to avoid confusing unsynchronized legacy progress with
  account-scoped data. Online app sync is unchanged.
- Cross-device synchronization, migration from legacy Supabase state and
  mapping to the upcoming shared vocabulary IDs are deliberately deferred to
  Offline-2 after the shared vocabulary/ownership audit.
- Other data-backed features (e.g. server-linked sentence relationships,
  cloud Speak logs and the incomplete Course SRS seeding API) are **not**
  promised offline. App-shell/audio readiness is independent of word packs.
- The offline HTML does not load Google Fonts; Burmese rendering uses the
  operating system's installed Myanmar font if Noto Sans Myanmar is absent.

## Manual acceptance checklist (Android and iPad)

- [ ] Install the separately hosted offline edition. Verify a distinct icon,
      app identity and URL from the existing online Burmese Study app.
- [ ] While online open More → Settings → Offline, download at least two word
      packs, verify counts and update one pack. Interrupt a download and check
      that the previously complete version remains usable.
- [ ] Tap Download files, confirm all required shell assets are cached, then
      enable airplane mode and **fully close/reopen** the installed app.
- [ ] Start Study, reveal meanings, rate words and finish a session. Complete
      MCQ, typing and matching quizzes using cached words. Confirm SRS shows
      device-only ratings and can review due words without internet.
- [ ] Return online; confirm offline Study/SRS ratings did **not** overwrite
      any online app records. Check the original online URL and sign-in/sync.
- [ ] With airplane mode enabled, completely relaunch and open Study, Quiz,
      SRS and Writing; confirm that the pronunciation code does not request
      the remote `language-utils` GitHub Pages module.
- [ ] Verify icons, fonts, scroll layout and touch targets on phone/iPad.
- [ ] Confirm previously saved offline packs survive a new Cloudflare build
      and app-shell update. Verify download errors never show a false success.

Automated tests cover the isolation, pack-validation and build outputs; real
device installation and airplane-mode verification remain necessary.
