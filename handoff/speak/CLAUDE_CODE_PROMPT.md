# Claude Code — add the Speak tab

Paste this into Claude Code from the root of the **burmese-study app repo**, with the `speak/` folder copied next to it (or give the absolute path).

---

Add a new "Speak" tab to this app using the files in `./speak/` (read `speak/PHASES.md` first, do Phase 1 only).

Steps:
1. Copy `speak/speak.js` → `js/speak.js` and `speak/speak-data.js` → `js/speak-data.js`. Add `?v=1` cache-busters on their imports, matching how other `js/*.js` files import each other.
2. Append `speak/speak.css` to the app's main stylesheet (find it — probably `css/styles.css`).
3. In `js/app.js`: import `SpeakTab`, construct it alongside the other tabs (`this.tabs.speak = new SpeakTab(this)`), and make sure `switchTab('speak')` renders it into the same container the other tabs use. Read how an existing tab (e.g. SRS) is registered and copy that exactly.
4. Add a "Speak 🗣" button to the bottom tab bar in `index.html`, same markup as the existing buttons. Put it first.
5. `speak.js` imports `./supabase.js`, `./settings.js` and `burmese.js` from the language-utils GitHub Pages URL. Check those paths/exports exist in this repo (`db.insert`, `getSettings().showDevanagari`, `toPronunciation`). If the names differ, adapt the import lines in `speak.js` — do not change the rest.
6. Bump the `?v=` on `app.js` in `index.html` so browsers refetch it.
7. Run `run-burmese-local.bat` (or the equivalent) and open the app. Confirm: Speak tab opens, all three packs list words, a practice round runs to the results screen, Step 2 "Try" opens the tile builder, progress survives a refresh. Check the browser console for errors.
8. Don't commit. Show me a summary of every file you changed.

Don't touch the other tabs, the SRS data, or course.js. Don't run Phases 2–5.
