# Porting the new UI into Burmese_study_app_advanced

Your app is vanilla JS (class-per-tab, `render(container)` + `innerHTML`). The
design-system kit is React — but it was modeled on *your* CSS, so every token
already exists in `css/styles.css`. This port is mostly additive.

Files in this folder:
- `home.js` → copy to `js/home.js`
- `home-and-setup.css` → paste at the end of `css/styles.css`

Do the 4 steps below. Nothing here touches your study **session** flow, SRS,
Stats, Settings, or Hub Explorer — they already work.

---

## 1. Add the files
1. Copy `home.js` → `js/home.js`.
2. Append `home-and-setup.css` to `css/styles.css`.

## 2. Wire Home + Groups into the tab bar (`js/app.js`)

**a) Import + register Home.** Near the other imports:
```js
import { HomeTab } from './home.js';
```
In `init()`, after `this.tabs.study = new StudyTab(this);` add:
```js
this.tabs.home = new HomeTab(this);
```

**b) Default to Home.** In the constructor change:
```js
this.activeTab = 'home';   // was 'study'
```

**c) Replace the tab bar markup** in `init()` (the `<div class="tab-bar">…`)
with 5 tabs. You already have a `hubExplorer` tab class, so Groups is just a new
button pointing at it:
```html
<div class="tab-bar" id="tab-bar">
  <button class="tab-btn active" data-tab="home">
    <span class="tab-icon">🏠</span><span class="tab-label">Home</span>
  </button>
  <button class="tab-btn" data-tab="study">
    <span class="tab-icon">📖</span><span class="tab-label">Study</span>
  </button>
  <button class="tab-btn" data-tab="srs">
    <span class="tab-icon">🔄</span><span class="tab-label">SRS</span>
  </button>
  <button class="tab-btn" data-tab="hubExplorer">
    <span class="tab-icon">🏷️</span><span class="tab-label">Groups</span>
  </button>
  <button class="tab-btn" data-tab="more">
    <span class="tab-icon">⋯</span><span class="tab-label">More</span>
  </button>
</div>
```
(Your `switchTab` already toggles `.active` by `data-tab`, and `renderTab()`
looks up `this.tabs[this.activeTab]` — `hubExplorer` is already registered, so
the Groups button works with no extra code.)

**d) Start on Home.** At the end of `init()` you call `this.renderTab()` —
since `activeTab` is now `'home'`, it renders Home automatically. Keep
`await this.tabs.study.init();` so word counts still preload.

## 3. Restyle the Study setup (`js/study.js` → `renderSetup`)

Only the **markup** changes — keep the same `data-mode`, `data-num`,
`data-source`, `#start-btn`, `#quiz-btn` hooks so your existing event listeners
keep working untouched. Replace the `container.innerHTML = \`…\`` inside
`renderSetup` with:

```js
const TEST_TYPES = [
  { id: 'burmese', glyph: 'မ',  label: 'Myanmar' },
  { id: 'deva',    glyph: 'द',  label: 'Reading' },
  { id: 'writing', glyph: '✍', label: 'Writing' },
];

container.innerHTML = `
  <div class="pad">
    <div class="setup-header">
      <button class="setup-back" id="setup-back">‹</button>
      <div>
        <div class="setup-h1">Study session</div>
        <div class="setup-h2">Set up your session</div>
      </div>
    </div>

    <div class="section-label" style="color:var(--text-muted);">Test type</div>
    <div class="test-grid">
      ${TEST_TYPES.map(t => `
        <button class="test-card ${this.mode === t.id ? 'active' : ''}" data-mode="${t.id}">
          <div class="tc-glyph">${t.glyph}</div>
          <div class="tc-label">${t.label}</div>
        </button>`).join('')}
    </div>

    <div class="balance-row">
      <button class="balance-btn active" data-balance="equal">⚡ All Equal</button>
      <button class="balance-btn" data-balance="custom">🎚 Custom</button>
    </div>

    <div class="section-label" style="color:var(--text-muted);">Words per level</div>
    <div class="num-row">
      ${[5,10,15,20,30].map(n => `
        <button class="num-btn ${this.wordsPerSession === n ? 'active' : ''}" data-num="${n}">${n}</button>`).join('')}
    </div>

    ${SOURCES.map(s => {
      const count = this.wordCounts[s.id] || (s.disabled ? 0 : '...');
      const active = this.selectedSource === s.id;
      return `
        <button class="source-card ${active ? 'active' : ''}" data-source="${s.id}"
          style="${active ? `color:${s.color};` : ''}">
          <div class="sc-badge" style="background:${s.color};">${s.icon}</div>
          <div class="flex-1">
            <div class="sc-name">${s.name}</div>
            <div class="sc-avail">${s.disabled ? 'Coming soon' : `${count} words available`}</div>
          </div>
          <div class="sc-count" style="${active ? `color:${s.color};` : ''}">${count || '—'}</div>
        </button>`;
    }).join('')}

    <button class="btn-primary" id="start-btn" style="background:var(--green);margin-top:8px;">▶ Start Session</button>
    <button class="btn-primary" id="quiz-btn" style="background:var(--purple);margin-top:8px;">🧠 Quiz Mode →</button>
  </div>`;
```

Then, in your existing setup event-binding, add two small things:
```js
// Back button → go Home
container.querySelector('#setup-back')?.addEventListener('click', () => this.app.switchTab('home'));

// All Equal / Custom toggle (visual for now)
container.querySelectorAll('[data-balance]').forEach(btn => {
  btn.addEventListener('click', () => {
    container.querySelectorAll('[data-balance]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // TODO: when 'custom', reveal per-source count inputs
  });
});
```
Your existing `[data-mode]`, `[data-num]`, `[data-source]`, `#start-btn`,
`#quiz-btn` listeners need **no changes**.

## 4. (Optional) Mark today's focus done
`HomeTab` shows `✓ <prev focus> completed today`. To make it real, after a
session finishes set a flag (e.g. `localStorage['focus_done_' + dayKey] = 1`)
and have `render()` show the check only when it's set.

---

### Notes
- `--focus` is the per-day accent; `HomeTab` sets it inline on `.home`, so the
  glyph tile, label, and play button recolor automatically each day.
- The watermark uses two extra Burmese glyphs (`စာ`, `ကျ`) purely as texture —
  swap or remove freely.
- I dropped the 4th mode (`meaning`, EN→Myanmar) from the *setup cards* to match
  the 3-card reference. To keep it, add it to `TEST_TYPES` and change
  `.test-grid` to `repeat(4, 1fr)` (or `repeat(2, 1fr)` in two rows).
- Live, interactive React reference for all of this:
  `ui_kits/burmese-study/` in the design system.
