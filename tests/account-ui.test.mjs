import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderAccountMarkup, renderReviewSyncMarkup, songSyncStatus } from '../js/account-ui.js';

const source = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const signedOut = { signedIn: false, status: 'local', email: '', message: '', lastSynced: null };
const signedIn = { signedIn: true, status: 'synced', email: 'ani@example.com',
  message: '', lastSynced: '2026-11-14T14:00:00Z' };

test('signed-out Settings offers optional Google sign-in with explicit limited sync scope', () => {
  const html = renderAccountMarkup(signedOut);
  assert.match(html, /Not signed in/);
  assert.match(html, /Continue with Google/);
  assert.match(html, /Song &amp; Chants reviews only/);
  assert.match(html, /Regular Study\/SRS, Speak and Course progress are not linked/);
  assert.doesNotMatch(html, /data-account-action="out"|data-account-action="sync"/);
});

test('signed-in Settings identifies account and shows sync and sign-out actions', () => {
  const html = renderAccountMarkup(signedIn);
  assert.match(html, /ani@example.com/);
  assert.match(html, /Song reviews synced/);
  assert.match(html, /Last song-review sync/);
  assert.match(html, /data-account-action="sync"/);
  assert.match(html, /data-account-action="out"/);
  assert.match(html, /Signing out keeps existing song reviews/);
  assert.doesNotMatch(html, /data-account-action="google"/);
});

test('identity, sync messages, and action failures are escaped in Settings', () => {
  const html = renderAccountMarkup({ ...signedIn, status: 'error',
    email: '<script>alert(1)</script>@example.com', message: '<img src=x>' },
  { error: '<b>failure</b>' });
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.match(html, /&lt;b&gt;failure&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x>|<b>failure<\/b>/);
});

test('syncing and pending account actions disable repeat submissions', () => {
  const syncing = renderAccountMarkup({ ...signedIn, status: 'syncing' });
  assert.match(syncing, /data-account-action="sync" disabled/);
  const pending = renderAccountMarkup(signedOut, { pending: true });
  assert.match(pending, /data-account-action="google" disabled/);
  assert.deepEqual(songSyncStatus(signedOut), { label: 'On this device only', tone: 'muted' });
  assert.deepEqual(songSyncStatus({ ...signedIn, status: 'error' }),
    { label: 'Sync needs attention', tone: 'warning' });
});

test('Review displays only a compact status and a Settings link, not account controls', () => {
  const html = renderReviewSyncMarkup(signedIn);
  assert.match(html, /Song reviews/);
  assert.match(html, /Manage in Settings/);
  assert.doesNotMatch(html, /ani@example.com|Sign out|Continue with Google|Sync now/);
  const reviewSource = source('js/srs.js');
  assert.match(reviewSource, /this\.app\.showSettings\(\)/);
  assert.doesNotMatch(reviewSource, /signInGoogle\(|signOut\(/);
});

test('Settings actions reuse the existing sync service and show errors without losing local state', async () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value)
  };
  const { SettingsPage } = await import('../js/settings.js');
  const log = [];
  let state = { ...signedOut };
  const service = {
    subscribe: () => () => {},
    getState: () => state,
    async signInGoogle() { log.push('google'); },
    async sync() { log.push('sync'); },
    async signOut() { log.push('out'); }
  };
  const panel = { innerHTML: '', querySelectorAll: () => [] };
  const settings = new SettingsPage({ songReviewSync: service });
  settings.accountContainer = {
    querySelector: selector => selector === '#settings-account-panel' ? panel : null
  };

  await settings.performAccountAction('google');
  state = { ...signedIn };
  await settings.performAccountAction('sync');
  await settings.performAccountAction('out');
  assert.deepEqual(log, ['google', 'sync', 'out']);
  assert.equal(storage.size, 0); // UI actions don't change local progress or settings.

  service.signOut = async () => { throw new Error('Connection lost'); };
  await settings.performAccountAction('out');
  assert.match(panel.innerHTML, /Connection lost/);
  assert.equal(settings.accountPending, false);
});

test('service worker caches the new account presentation module', () => {
  assert.match(source('sw.js'), /burmese-study-v16/);
  assert.match(source('sw.js'), /js\/account-ui\.js/);
  assert.match(source('js/more.js'), /Account, voice & preferences/);
});
