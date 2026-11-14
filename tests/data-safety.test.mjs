import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDeviceBackup, DEVICE_BACKUP_FIELDS, DEVICE_BACKUP_EXCLUSIONS } from '../js/data-backup.js';

const settingsSource = readFileSync(new URL('../js/settings.js', import.meta.url), 'utf8');
const workerSource = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

const memoryStorage = initial => {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    writes,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { writes.push(key); values.set(key, value); }
  };
};

test('device backup includes only allowlisted local data, without reading credentials or other accounts', () => {
  const saved = {
    burmese_app_settings: JSON.stringify({ voice: 'f' }),
    speak_progress: JSON.stringify({ days: { '2026-11-14': 1 } }),
    burmese_course_progress: JSON.stringify({ u1: { dialogue: true } }),
    dialogue_voices: JSON.stringify({ '1_2': { A: 'f', B: 'm' } }),
    burmese_song_library_v1: JSON.stringify([{ id: 'my-song' }]),
    burmese_song_review_queue_v1: JSON.stringify([{ wordId: '7' }]),
    'burmese_song_review_queue_v1:account:other': JSON.stringify([{ wordId: 'private' }]),
    burmese_supabase_key: JSON.stringify('secret-key'),
    'sb-example-auth-token': JSON.stringify('secret-token')
  };
  const storage = memoryStorage(saved);
  const backup = createDeviceBackup(storage, new Date('2026-11-14T10:00:00.000Z'));
  const serialized = JSON.stringify(backup);

  assert.equal(backup.app, 'burmese_study');
  assert.equal(backup.version, 2);
  assert.equal(backup.scope, 'device_only');
  assert.equal(backup.restoreSupported, false);
  assert.equal(backup.exportDate, '2026-11-14T10:00:00.000Z');
  assert.deepEqual(Object.keys(backup.data), Object.keys(DEVICE_BACKUP_FIELDS));
  assert.deepEqual(backup.data.settings, { voice: 'f' });
  assert.deepEqual(backup.data.songReviews, [{ wordId: '7' }]);
  assert.equal(storage.writes.length, 0);
  for (const secret of ['secret-key', 'secret-token', 'private']) {
    assert.equal(serialized.includes(secret), false);
  }
  assert.ok(DEVICE_BACKUP_EXCLUSIONS.some(item => item.includes('Study/SRS')));
});

test('absent local data is identified as absent, never fabricated or read from cloud', () => {
  const backup = createDeviceBackup(memoryStorage({}));
  assert.ok(Object.values(backup.data).every(value => value === null));
});

test('a corrupt local section stops the download instead of claiming a complete backup', () => {
  const storage = memoryStorage({ speak_progress: '{invalid' });
  assert.throws(() => createDeviceBackup(storage), /damaged local data \(speakProgress\)/);
});

test('Settings contains no shared-table import, export, or unscoped reset code', () => {
  assert.doesNotMatch(settingsSource, /getUserState\s*\(/);
  assert.doesNotMatch(settingsSource, /burmese_app_user_state/);
  assert.doesNotMatch(settingsSource, /burmese_app_progress_events/);
  assert.doesNotMatch(settingsSource, /method\s*:\s*['"]DELETE['"]/);
  assert.doesNotMatch(settingsSource, /id=gt\.0/);
  assert.doesNotMatch(settingsSource, /file-import|btn-reset/);
  assert.match(settingsSource, /Restore backup/);
  assert.match(settingsSource, /Reset All Progress/);
  assert.match(settingsSource, /disabled aria-describedby="import-help"/);
  assert.match(settingsSource, /disabled aria-describedby="reset-help"/);
});

test('service worker precaches the backup module to keep Settings working offline', () => {
  assert.match(workerSource, /js\/data-backup\.js/);
  assert.match(workerSource, /burmese-study-v\d+/);
});
