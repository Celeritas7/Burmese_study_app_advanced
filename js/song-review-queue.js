// Phase 4D: offline-first song reviews. Sync is separate and always optional.
export const SONG_REVIEW_STORAGE_KEY = 'burmese_song_review_queue_v1';
export const SONG_REVIEW_ACCOUNT_KEY = 'burmese_song_review_account_v1';

const validId = value => value !== null && value !== undefined && String(value).trim() !== '';
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const clampLevel = level => Math.max(0, Math.min(7, Number.isFinite(Number(level)) ? Math.floor(Number(level)) : 0));

const timestamp = (now, previous) => new Date(Math.max(Number(now) || Date.now(),
  (Date.parse(previous || '') || 0) + 1)).toISOString();

function normalizeRecord(row) {
  if (!row || !validId(row.wordId) || !validTime(row.dueAt)) return null;
  return {
    wordId: String(row.wordId),
    songId: String(row.songId || ''),
    dueAt: new Date(row.dueAt).toISOString(),
    masteryLevel: clampLevel(row.masteryLevel),
    attempts: Math.max(0, Math.floor(Number(row.attempts) || 0)),
    // A pre-4D local row is older than a record carrying a real edit timestamp.
    updatedAt: validTime(row.updatedAt) ? new Date(row.updatedAt).toISOString() : '1970-01-01T00:00:00.000Z',
    removed: row.removed === true
  };
}

export function readAllSongReviewQueue(storage) {
  try {
    const rows = JSON.parse(storage.getItem(SONG_REVIEW_STORAGE_KEY) || '[]');
    if (!Array.isArray(rows)) return [];
    const seen = new Set();
    return rows.map(normalizeRecord).filter(row => {
      if (!row) return false;
      const id = row.wordId;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  } catch {
    return [];
  }
}

export function readSongReviewQueue(storage) {
  return readAllSongReviewQueue(storage).filter(row => !row.removed);
}

export function replaceSongReviewQueue(storage, rows) {
  try {
    if (!Array.isArray(rows) || rows.some(row => !normalizeRecord(row))) return false;
    storage.setItem(SONG_REVIEW_STORAGE_KEY, JSON.stringify(rows.map(normalizeRecord)));
    return true;
  } catch {
    return false;
  }
}

// Keep edits made by the most recently edited device, including removals.
// On identical timestamps, prefer the second collection (the server snapshot).
export function mergeSongReviewRecords(first, second) {
  const rows = new Map();
  for (const raw of [...first, ...second]) {
    const row = normalizeRecord(raw);
    if (!row) continue;
    const current = rows.get(row.wordId);
    if (!current || row.updatedAt >= current.updatedAt) rows.set(row.wordId, row);
  }
  return [...rows.values()];
}

// Prevent one Google account's device records from uploading to another account.
// The first sign-in claims existing guest records; later account switches isolate them.
export function switchSongReviewAccount(storage, userId) {
  if (!validId(userId)) return false;
  try {
    const previous = storage.getItem(SONG_REVIEW_ACCOUNT_KEY);
    if (previous === String(userId)) return true;
    if (previous) {
      const backupKey = `${SONG_REVIEW_STORAGE_KEY}:account:${previous}`;
      storage.setItem(backupKey, JSON.stringify(readAllSongReviewQueue(storage)));
      const currentKey = `${SONG_REVIEW_STORAGE_KEY}:account:${userId}`;
      const backup = storage.getItem(currentKey);
      if (!replaceSongReviewQueue(storage, backup ? JSON.parse(backup) : [])) return false;
    }
    storage.setItem(SONG_REVIEW_ACCOUNT_KEY, String(userId));
    return true;
  } catch {
    return false;
  }
}

export function addMissedSongWords(storage, wordRecords, songId, now = Date.now()) {
  const existing = readAllSongReviewQueue(storage);
  const index = new Map(existing.map((row, i) => [row.wordId, i]));
  const time = new Date(now).toISOString();
  let queued = 0;
  for (const row of Array.isArray(wordRecords) ? wordRecords : []) {
    if (!validId(row?.wordId)) continue;
    const wordId = String(row.wordId);
    const current = index.get(wordId);
    if (current !== undefined) {
      // A new miss makes an existing song-review item due, but never erases its level.
      existing[current].dueAt = time;
      existing[current].songId = String(songId || '');
      existing[current].removed = false;
      existing[current].updatedAt = timestamp(now, existing[current].updatedAt);
    } else {
      existing.push({ wordId, songId: String(songId || ''), dueAt: time, masteryLevel: 0,
        attempts: 0, updatedAt: time, removed: false });
      index.set(wordId, existing.length - 1);
    }
    queued++;
  }
  return { saved: replaceSongReviewQueue(storage, existing), queued };
}

export function advanceSongReview(storage, wordId, masteryLevel, nextReviewAt) {
  if (!validId(wordId) || !validTime(nextReviewAt)) return false;
  const rows = readAllSongReviewQueue(storage);
  const row = rows.find(item => !item.removed && item.wordId === String(wordId));
  if (!row) return false;
  row.masteryLevel = clampLevel(masteryLevel);
  row.dueAt = nextReviewAt;
  row.attempts++;
  row.updatedAt = timestamp(Date.now(), row.updatedAt);
  return replaceSongReviewQueue(storage, rows);
}

export function removeSongReview(storage, wordId) {
  const rows = readAllSongReviewQueue(storage);
  const row = rows.find(item => item.wordId === String(wordId) && !item.removed);
  if (!row) return false;
  // Keep a tombstone so an offline iPad cannot restore a removed Android reminder.
  row.removed = true;
  row.updatedAt = timestamp(Date.now(), row.updatedAt);
  return replaceSongReviewQueue(storage, rows);
}

const dueLabel = (dueAt, now) => {
  const diff = dueAt - now;
  if (diff <= 0) return 'Now';
  if (diff < 3600000) return `${Math.round(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h`;
  return `${Math.round(diff / 86400000)}d`;
};

export function combineSongReviewQueue(coreQueue, songRows, wordMap, now = Date.now()) {
  const results = coreQueue.map(item => ({ ...item, srsDue: !!item.isDue, songDue: false }));
  const byId = new Map(results.map(item => [String(item.wordId), item]));
  for (const row of songRows) {
    const word = wordMap[row.wordId];
    if (!word) continue; // Keep the local record; the Study word may load later.
    const dueAt = Date.parse(row.dueAt);
    if (!Number.isFinite(dueAt)) continue;
    const songDue = dueAt <= now;
    let item = byId.get(String(row.wordId));
    if (item) {
      item.songQueued = true;
      item.songDue = songDue;
      item.songLevel = row.masteryLevel;
      item.srsLevel = item.level;
      // When a song is due but normal Study is not, show the song's own level.
      if (songDue && !item.srsDue) item.level = row.masteryLevel;
      item.isDue = item.srsDue || songDue;
      if (dueAt < item.dueAt) {
        item.dueAt = dueAt;
        item.due = dueLabel(dueAt, now);
      }
      continue;
    }
    item = { wordId: word.id, word: word.burmese_word, meaning: word.english_meaning || '',
      dueAt, due: dueLabel(dueAt, now), isDue: songDue,
      level: row.masteryLevel, songLevel: row.masteryLevel, songQueued: true, songDue, srsDue: false };
    results.push(item);
    byId.set(String(row.wordId), item);
  }
  return results.sort((a, b) => a.dueAt - b.dueAt);
}
