import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NavigationState, PRIMARY_TABS } from '../js/navigation.js';

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('UI-4 offers exactly five main tabs and keeps the originating tab on subpages', () => {
  assert.deepEqual(PRIMARY_TABS, ['home', 'study', 'srs', 'speak', 'more']);
  const n = new NavigationState();
  n.open('songs');
  assert.deepEqual([n.activeTab, n.page], ['home', 'songs']);
  assert.equal(n.back(), 'home', 'Songs launched from Home must return to Home');

  n.switchTab('more');
  n.open('songs');
  assert.deepEqual([n.activeTab, n.page], ['more', 'songs']);
  assert.equal(n.back(), 'more', 'Songs launched from More must return to More');
});

test('UI-4 preserves nested Course navigation and resets history when changing main tab', () => {
  const n = new NavigationState('more');
  n.open('course');
  n.open('dialogues');
  assert.deepEqual(n.stack, ['more', 'course']);
  assert.equal(n.back(), 'course');
  assert.equal(n.back(), 'more');

  n.open('course');
  assert.equal(n.switchTab('study'), true);
  assert.deepEqual([n.page, n.activeTab, n.stack.length], ['study', 'study', 0]);
  assert.equal(n.back(), 'study', 'No stale More or Course page after switching main tabs');
  assert.equal(n.switchTab('nonexistent'), false);
  assert.equal(n.activeTab, 'study');
});

test('UI-4 replaces seven cramped nav buttons with five accessible main links', () => {
  const app = source('js/app.js');
  const tabIds = [...app.matchAll(/class="tab-btn(?: active)?" data-tab="([^"]+)"/g)].map(([, id]) => id);
  assert.deepEqual(tabIds, PRIMARY_TABS);
  assert.match(app, /<nav class="tab-bar"[^>]*aria-label="Main navigation"/);
  assert.match(app, /aria-current="page"/);
  assert.match(app, /this\.navigation\.open\(name\)/);
  assert.match(app, /this\.navigation\.back\(\)/);
  assert.match(app, /this\.updateNavHighlight\(\)/);
  assert.doesNotMatch(app, /classList\.remove\('active'\)/);
});

test('UI-4 keeps Course, Groups, Songs, and all previous More actions discoverable', () => {
  const more = source('js/more.js');
  for (const action of ['course', 'groups', 'songs', 'dialogues', 'writing', 'sentences',
    'stats', 'settings', 'audit', 'supabase']) {
    assert.match(more, new RegExp(`action: '${action}'`));
    assert.match(more, new RegExp(`case '${action}':`));
  }
  assert.match(more, /Learn & explore/);
  assert.match(more, /Tools & account/);
  assert.match(source('js/course.js'), /id="course-home-back"/);
  assert.match(source('js/course.js'), /this\.app\.goBack\(\)/);
  assert.match(source('js/speak.js'), /switchTab\('course'\)/);
});

test('UI-4 subpage Back buttons use navigation history, including from Home', () => {
  for (const path of ['settings', 'songs', 'hubexplorer', 'dialogues', 'writing', 'sentences', 'stats']) {
    const page = source(`js/${path}.js`);
    assert.match(page, /this\.app\.goBack\(\)/, `${path} should use navigation history`);
    assert.doesNotMatch(page, /this\.app\.tabs\.more\.render\(this\.app\.contentEl\)/);
  }
  assert.match(source('sw.js'), /burmese-study-v\d+/);
  assert.match(source('sw.js'), /js\/navigation\.js/);
  assert.match(source('css/styles.css'), /env\(safe-area-inset-bottom/);
});
