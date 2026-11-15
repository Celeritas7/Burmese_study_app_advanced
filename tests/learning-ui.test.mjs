import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HomeTab } from '../js/home.js';

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('UI-5 Home makes no unverified completed-work or word-count claims', () => {
  const app = {
    tabs: { study: { selectedSource: null, mode: '', startSession() { this.started = true; } } },
    switchTab(tab) { this.opened = tab; },
    showStats() {}, showSongs() {}, showSettings() {}, contentEl: {}
  };
  const home = new HomeTab(app);
  const callbacks = new Map();
  const container = {
    innerHTML: '',
    querySelector: selector => ({ addEventListener: (_, callback) => callbacks.set(selector, callback) })
  };
  for (const focusIndex of [0, 1, 2, 3, 4]) {
    const index = focusIndex;
    // Exercise all five daily suggestions without waiting for a calendar change.
    const start = Date.now;
    Date.now = () => index * 86400000;
    try { home.render(container); } finally { Date.now = start; }
    assert.match(container.innerHTML, /Suggested practice · changes daily/);
    assert.match(container.innerHTML, /Today's suggestion/);
    assert.match(container.innerHTML, /A place to start whenever you're ready/);
    assert.doesNotMatch(container.innerHTML, /completed today|\d+ new words|\d+ letters|Set 12|Unit 7/);
    callbacks.get('#home-start')();
    assert.equal(app.opened, 'study');
    assert.equal(app.tabs.study.started, true);
  }
});

test('UI-5 preserves Study and SRS grading while making rating actions readable', () => {
  const study = source('js/study.js');
  const srs = source('js/srs.js');
  assert.match(study, /const RATING_ORDER = \[0, 1, 2, 3, 6, 4, 5\]/);
  assert.match(study, /data-rating="\$\{i\}" aria-label="\$\{r\.label\}"/);
  assert.match(study, /class="study-rating-label">\$\{r\.label\}/);
  assert.match(study, /db\.upsertUserState\(word\.id, r\)/);
  assert.match(srs, /SRS_RESPONSES\.map/);
  assert.match(srs, /class="srs-response-grid"/);
  assert.match(srs, /advanceSongReview\(this\.storage/);
  for (const page of [study, srs]) {
    assert.match(page, /role="button" tabindex="0" aria-label="Reveal/);
    assert.match(page, /addEventListener\('keydown'/);
  }
});

test('UI-5 Writing gets larger accessible controls and retains save-on-mark', () => {
  const writing = source('js/writing.js');
  assert.match(writing, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(writing, /@media \(min-width:720px\)/);
  assert.match(writing, /width:40px;height:40px/);
  assert.match(writing, /class="wr-header-actions"/);
  assert.match(writing, /aria-label="Mark drawing \$\{idx \+ 1\} correct"/);
  assert.match(writing, /aria-pressed="\$\{mark==='correct'\}"/);
  assert.match(writing, /this\.saveMark\(idx, type\)/);
  assert.match(writing, /if \(this\.originalViewport === null\)/);
  assert.match(writing, /this\.originalViewport = null;/);
});

test('UI-5 mobile and iPad layouts are scoped to learning screens', () => {
  const css = source('css/styles.css');
  assert.match(css, /#app\.learning-wide \{ max-width: 760px; \}/);
  assert.match(css, /#app\.writing-layout \{ max-width: 900px; \}/);
  assert.match(css, /\.study-rating-grid \{ display: grid; grid-template-columns: repeat\(4/);
  assert.match(css, /@media \(min-width: 390px\)/);
  assert.match(css, /\.srs-response-grid \{ display: grid; grid-template-columns: repeat\(4/);
  assert.match(css, /\.songs-search \{[^}]*font-size: 16px;/);
  assert.match(css, /\.song-form input, \.song-form select \{ font-size: 16px; \}/);
  assert.match(source('js/app.js'), /classList\.toggle\('learning-wide'/);
  assert.match(source('sw.js'), /burmese-study-v\d+/);
});
