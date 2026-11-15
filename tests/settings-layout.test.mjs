import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('UI-3 Settings keeps Account visible and groups all preferences and safety controls', async () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value)
  };
  globalThis.window = {};
  globalThis.document = { addEventListener() {} }; // app-audio registers a delegated click handler.
  const { SettingsPage, getSettings } = await import('../js/settings.js');
  const service = {
    subscribe: () => () => {},
    getState: () => ({ signedIn: false, status: 'local', email: '', message: '', lastSynced: null })
  };
  const page = new SettingsPage({ songReviewSync: service });
  page.checkServiceWorker = () => {}; // UI layout test must not register a service worker.
  let sections = [];
  let optionButtons = [];
  const stubButton = () => ({ style: {}, addEventListener() {} });
  const panel = { innerHTML: '', querySelectorAll: () => [] };
  const container = {
    innerHTML: '',
    querySelector: selector => selector === '#settings-account-panel' ? panel : stubButton(),
    querySelectorAll(selector) {
      if (selector === '[data-settings-section]') return sections;
      if (selector === '.set-opt') return optionButtons;
      if (selector === '.set-toggle') return [];
      return [];
    }
  };
  const render = async () => {
    await page.render(container);
    sections = [...container.innerHTML.matchAll(/<details\b[^>]*data-settings-section="([^"]+)"([^>]*)>/g)]
      .map(([, key, attributes]) => ({
        dataset: { settingsSection: key },
        open: /\bopen\b/.test(attributes),
        isConnected: true,
        addEventListener(event, listener) { if (event === 'toggle') this.toggle = listener; }
      }));
    // Render attaches listeners before this test rebuilds its virtual section objects.
    // Trigger each section's listener by re-rendering with the current generated fixtures.
    await page.render(container);
  };

  await render();
  assert.deepEqual(sections.map(s => s.dataset.settingsSection),
    ['learning', 'display', 'data', 'offline']);
  assert.ok(container.innerHTML.indexOf('settings-account-panel') < container.innerHTML.indexOf('settings-fold-list'));
  assert.match(panel.innerHTML, /Continue with Google/);
  assert.equal(sections[0].open, true, 'learning defaults to open');
  assert.ok(sections.slice(1).every(section => !section.open), 'secondary sections default to collapsed');

  for (const id of ['set-back', 'btn-export', 'btn-cache', 'btn-audio-dl',
    'import-help', 'reset-help', 'sw-status', 'audio-status']) {
    assert.match(container.innerHTML, new RegExp(`id="${id}"`));
  }
  for (const key of ['voice', 'autoPlay', 'fontSize', 'showDevanagari', 'showPlayful', 'showRomanization']) {
    assert.match(container.innerHTML, new RegExp(`data-key="${key}"`));
  }
  assert.match(container.innerHTML, /disabled aria-describedby="import-help"/);
  assert.match(container.innerHTML, /disabled aria-describedby="reset-help"/);
  assert.match(container.innerHTML, /role="switch" aria-label="Play sound on reveal"/);

  for (const tag of ['div', 'details', 'section', 'summary']) {
    const starts = [...container.innerHTML.matchAll(new RegExp(`<${tag}(?=[\\s>])`, 'g'))].length;
    const ends = [...container.innerHTML.matchAll(new RegExp(`</${tag}>`, 'g'))].length;
    assert.equal(starts, ends, `${tag} elements must be balanced`);
  }

  const display = sections.find(s => s.dataset.settingsSection === 'display');
  display.open = true;
  display.toggle();
  assert.ok(page.expandedSections.has('display'));

  optionButtons = [{ dataset: { key: 'fontSize', val: 'large' },
    addEventListener(event, handler) { if (event === 'click') this.click = handler; } }];
  await page.render(container);
  assert.match(container.innerHTML, /data-settings-section="display" open/);
  optionButtons[0].click();
  assert.equal(getSettings().fontSize, 'large');
  assert.ok(page.expandedSections.has('display'), 'changing a preference keeps the section expanded');
  assert.equal(storage.size, 1, 'only the selected preference is stored');
});

test('UI-3 styles and offline cache include the Settings redesign', () => {
  const css = source('css/styles.css');
  assert.match(css, /\.settings-fold-summary:focus-visible/);
  assert.match(css, /@media \(max-width: 380px\)/);
  assert.match(css, /\.settings-row-choices \{ flex-direction: column/);
  assert.match(source('sw.js'), /burmese-study-v\d+/);
});
