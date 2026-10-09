# Adding the Speak tab to Burmese_study_app_advanced

Live reference: `prototypes/Speak First.html` in the design system.

## Files
- `speak.js` → `js/speak.js`
- `speak-data.js` → `js/speak-data.js`
- `speak.css` → append to `css/styles.css`
- `speak.sql` → run once in the Supabase SQL editor (optional, for the answer log)

## 1. Register the tab (`js/app.js`)
```js
import { SpeakTab } from './speak.js?v=1';
```
In `init()`, next to the other tabs:
```js
this.tabs.speak = new SpeakTab(this);
```

## 2. Add the tab button
The bar already has 5 tabs. Pick one:

**A. Replace Groups** (Groups stays reachable from More → Hub Explorer):
```html
<button class="tab-btn" data-tab="speak">
  <span class="tab-icon">🗣</span><span class="tab-label">Speak</span>
</button>
```

**B. Keep 5 tabs, add a Home entry.** Add a button in `home.js` and wire it:
```js
container.querySelector('#home-speak')?.addEventListener('click', () => this.app.switchTab('speak'));
```

`switchTab` / `renderTab` need no changes: `renderTab()` calls `this.tabs.speak.render(container)`.

## 3. Point the grammar card
In `speak.js`, the `grammar` handler opens `more`. Change it to your course or sentence-patterns screen:
```js
grammar: () => this.app.switchTab('more'),   // ← here
```

## 4. Bump cache-busters
If you edit `speak-data.js` later, bump `?v=1` in the `speak.js` import.

## How it works
- **Packs:** How I feel (12), Yes/no/thanks (12), Food & dishes (18). Tap a word to hear it and mark "I said it".
- **Practice:** a situation card → you say the word out loud → reveal → Said it / Not yet. Unseen words come first, and the order is fixed for the round.
- **Ladder:**
  1. One word. Clears when every How I feel word has been said.
  2. Add me: ကျွန်တော်/ကျွန်မ + word + တယ်.
  3. Ask back: word + လား.
  4. Say no: မ + verb + ဘူး. Each feel word stores `pre` + `v`, so the မ lands correctly (ဗိုက် **မ** ဆာ ဘူး).
  Steps 2–4 clear at 8 correct tile builds and unlock in order.
- **Gender:** ♂/♀ in the How I feel header switches ကျွန်တော် ↔ ကျွန်မ everywhere.
- **Devanagari** follows your existing `showDevanagari` setting (via `toPronunciation`).
- **Storage:** `localStorage['speak_progress']`. Every answer is also inserted into `speak_log` (errors are ignored if the table is missing).

## Adding words
For a new pack, add `{ id, emoji, color, title, desc, words: [...].map(row) }` to `PACKS`. Each word is `[English, Burmese, roman, situation, emoji]`. Add `food: true` for dish-style prompts.

Feel words use `[en, pre, v, preRoman, vRoman, situation, emoji]`. Leave `pre` empty for single verbs like ပူ.

## Check before shipping
- The romanisations are hand-written hints. Have a native speaker check them.
- Burmese TTS (`my-MM`) is missing on many devices. The 🔊 buttons fail silently there.
