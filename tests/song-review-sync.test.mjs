import test from 'node:test';
import assert from 'node:assert/strict';
import { SONG_REVIEW_ACCOUNT_KEY, SONG_REVIEW_STORAGE_KEY, addMissedSongWords,
  readAllSongReviewQueue, readSongReviewQueue, mergeSongReviewRecords,
  removeSongReview, replaceSongReviewQueue, switchSongReviewAccount } from '../js/song-review-queue.js';
import { SONG_REVIEW_TABLE, syncSongReviewData, toCloudRecord } from '../js/song-review-sync.js';

const memoryStorage = () => {
  const data = new Map();
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
};

const record = (wordId, updatedAt, extras = {}) => ({
  wordId: String(wordId), songId: 'metta', dueAt: '2026-11-12T12:00:00.000Z',
  masteryLevel: 2, attempts: 1, removed: false, updatedAt, ...extras
});

function fakeCloud(seed = [], { uploadError = false, beforeFetch } = {}) {
  const data = new Map(seed.map(row => [row.word_id, row]));
  const calls = [];
  let reads = 0;
  return {
    data, calls,
    from(table) {
      calls.push(['from', table]);
      assert.equal(table, SONG_REVIEW_TABLE); // Never reads or writes shared Study/SRS tables.
      return { select() { return { async eq(field, uid) {
        assert.equal(field, 'user_id');
        assert.equal(uid, 'user-a');
        await beforeFetch?.(++reads);
        return { data: [...data.values()], error: null };
      } }; } };
    },
    async rpc(name, { p_rows }) {
      calls.push(['rpc', name]);
      assert.equal(name, 'burmese_merge_song_reviews');
      if (uploadError) return { error: { message: 'offline' } };
      for (const row of p_rows) {
        const old = data.get(row.word_id);
        if (!old || row.updated_at > old.updated_at) data.set(row.word_id, row);
      }
      return { error: null };
    }
  };
}

test('old Phase 4C entries are readable, and deletions remain as syncable tombstones', () => {
  const storage = memoryStorage();
  storage.setItem(SONG_REVIEW_STORAGE_KEY, JSON.stringify([
    { wordId: 7, songId: 'old', dueAt: '2026-11-11T12:00:00Z', masteryLevel: 3, attempts: 4 }
  ]));
  assert.equal(readSongReviewQueue(storage)[0].masteryLevel, 3);
  assert.equal(readAllSongReviewQueue(storage)[0].updatedAt, '1970-01-01T00:00:00.000Z');
  assert.equal(removeSongReview(storage, 7), true);
  assert.equal(readSongReviewQueue(storage).length, 0);
  assert.equal(readAllSongReviewQueue(storage)[0].removed, true);
  assert.equal(removeSongReview(storage, 7), false);
});

test('most recently edited device wins, including removed words', () => {
  const older = record(5, '2026-11-11T10:00:00Z');
  const newer = record(5, '2026-11-11T11:00:00Z', { removed: true });
  assert.equal(mergeSongReviewRecords([older], [newer])[0].removed, true);
  assert.equal(mergeSongReviewRecords([newer], [older])[0].removed, true);
  const equal = record(5, newer.updatedAt, { masteryLevel: 6 });
  assert.equal(mergeSongReviewRecords([newer], [equal])[0].masteryLevel, 6);
});

test('cloud sync uploads only song records and downloads another device\'s progress', async () => {
  const storage = memoryStorage();
  const local = record(5, '2026-11-11T11:00:00Z', { masteryLevel: 3 });
  const cloudOnly = record(6, '2026-11-11T12:00:00Z');
  const staleCloud = record(5, '2026-11-11T09:00:00Z', { masteryLevel: 0 });
  assert.equal(replaceSongReviewQueue(storage, [local]), true);
  const cloud = fakeCloud([staleCloud, cloudOnly].map(toCloudRecord));
  const result = await syncSongReviewData(cloud, storage, 'user-a');
  assert.equal(result.uploaded, 1);
  assert.equal(result.total, 2);
  assert.equal(result.needsRetry, false);
  assert.equal(readSongReviewQueue(storage).length, 2);
  assert.equal(readSongReviewQueue(storage).find(r => r.wordId === '5').masteryLevel, 3);
  assert.equal(cloud.data.get('5').mastery_level, 3);
  assert.equal(cloud.calls.filter(c => c[0] === 'rpc').length, 1);
});

test('failed cloud upload never overwrites offline records', async () => {
  const storage = memoryStorage();
  replaceSongReviewQueue(storage, [record(5, '2026-11-11T11:00:00Z')]);
  const before = storage.getItem(SONG_REVIEW_STORAGE_KEY);
  await assert.rejects(syncSongReviewData(fakeCloud([], { uploadError: true }), storage, 'user-a'), /offline/);
  assert.equal(storage.getItem(SONG_REVIEW_STORAGE_KEY), before);
});

test('a local review made during network sync is preserved for a retry', async () => {
  const storage = memoryStorage();
  const old = record(5, '2026-11-11T11:00:00Z');
  const edited = record(5, '2026-11-11T14:00:00Z', { masteryLevel: 7 });
  replaceSongReviewQueue(storage, [old]);
  const cloud = fakeCloud([], { beforeFetch: read => {
    if (read === 2) replaceSongReviewQueue(storage, [edited]);
  } });
  const result = await syncSongReviewData(cloud, storage, 'user-a');
  assert.equal(result.needsRetry, true);
  assert.equal(readSongReviewQueue(storage)[0].masteryLevel, 7);
  assert.equal(cloud.data.get('5').mastery_level, 2);
});

test('a changed account does not write its cloud response into local data', async () => {
  const storage = memoryStorage();
  replaceSongReviewQueue(storage, [record(5, '2026-11-11T11:00:00Z')]);
  const cloud = fakeCloud([toCloudRecord(record(6, '2026-11-11T12:00:00Z'))], {
    beforeFetch: read => { if (read === 2) switchSongReviewAccount(storage, 'user-b'); }
  });
  switchSongReviewAccount(storage, 'user-a');
  await assert.rejects(syncSongReviewData(cloud, storage, 'user-a',
    () => storage.getItem(SONG_REVIEW_ACCOUNT_KEY) === 'user-a'), /Account changed/);
  assert.deepEqual(readSongReviewQueue(storage), []);
});

test('different Google accounts have isolated offline song queues', () => {
  const storage = memoryStorage();
  addMissedSongWords(storage, [{ wordId: 5 }], 'song-a'); // Guest records claimed by A.
  assert.equal(switchSongReviewAccount(storage, 'user-a'), true);
  assert.equal(switchSongReviewAccount(storage, 'user-b'), true);
  assert.equal(readSongReviewQueue(storage).length, 0);
  addMissedSongWords(storage, [{ wordId: 9 }], 'song-b');
  assert.equal(switchSongReviewAccount(storage, 'user-a'), true);
  assert.deepEqual(readSongReviewQueue(storage).map(r => r.wordId), ['5']);
  assert.equal(switchSongReviewAccount(storage, 'user-b'), true);
  assert.deepEqual(readSongReviewQueue(storage).map(r => r.wordId), ['9']);
});
