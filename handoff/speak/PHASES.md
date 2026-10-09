# Speak tab — delivery plan

Live reference: `prototypes/Speak First.html`. Code: `handoff/speak/`.

## Phase 1 — Working app (today)
Goal: open the app, tap Speak, say words, see progress. ~30 minutes.

1. Copy `speak.js` → `js/speak.js`, `speak-data.js` → `js/speak-data.js`.
2. Append `speak.css` to `css/styles.css`.
3. In `js/app.js`:
   ```js
   import { SpeakTab } from './speak.js?v=1';
   // in init(), with the other tabs:
   this.tabs.speak = new SpeakTab(this);
   ```
   Add a tab button (replace Groups, or add a 6th):
   ```html
   <button class="tab-btn" data-tab="speak">
     <span class="tab-icon">🗣</span><span class="tab-label">Speak</span>
   </button>
   ```
4. Run `run-burmese-local.bat`, open the local URL, tap Speak.
5. `git add . && git commit -m "Speak tab" && git push` → GitHub Pages updates in ~1 minute.

Done when: all three packs open, practice rounds work, the ladder shows step 1 as "now", progress survives a refresh.

Nothing else is required. Photos, Supabase, and the course link are optional.

## Phase 2 — Photos for Food & dishes
1. Create `img/food/` in the app repo.
2. Add a photo per dish (JPG, ~600px square, under 150 KB). Your own photos are best; the file name is up to you.
3. In `speak-data.js`, add the path as the 6th field of the row:
   ```js
   ['Mohinga', 'မုန့်ဟင်းခါး', 'mont hin ga', 'Rice noodles in fish broth…', '🍜', 'img/food/mohinga.jpg'],
   ```
   Mohinga and Tea leaf salad already have paths; add the files or remove the paths.
4. Bump `?v=` on the `speak-data.js` import in `speak.js`.

Rows without a photo fall back to the emoji. A missing file also falls back to the emoji.

## Phase 3 — Answer history in Supabase
1. Run `speak.sql` in the Supabase SQL editor.
2. That's it: `speak.js` already inserts every answer into `speak_log`. Until the table exists the inserts fail silently.
3. Later: a Speak section in Stats reading `speak_log` (accuracy per pack, most-missed words). Misses are already tracked in the browser; this makes them visible across devices.

## Phase 4 — Grammar course link
The "Sentence patterns" card unlocks after step 2 and currently opens More. Point it at the course:
```js
grammar: () => this.app.switchTab('more'),   // ← change to your course screen
```
Then wire the empty drill steps in `course.js` to the same tile builder used by the ladder (`startBuild` in `speak.js`), feeding it your pattern sentences instead of `FEEL`.

## Phase 5 — Content
- Have a native speaker check the romanisations and the `sit` texts.
- Add packs: `{ id, emoji, color, title, desc, words: [...].map(row) }` in `PACKS`. Likely next: "At the tea shop", "Numbers & prices", "Where is…".
- Extend the ladder to new packs: today steps 2–4 drill only `FEEL`, because only feel-words carry the `pre` / `v` split that the negative needs.

## How misses work (shipped in Phase 1)
- "Not yet" in practice marks a word as missed. "Said it" clears it.
- Rounds order: unseen → missed (most-missed first) → the rest.
- Results show the words you missed with a "Retry these" button.
- Home shows "N to say again" with a Retry button that pulls misses from every pack. Pack rows show a per-pack count.
