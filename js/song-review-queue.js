// Phase 4C: opt-in, per-device song review queue. Never writes Supabase state.
export const SONG_REVIEW_STORAGE_KEY = 'burmese_song_review_queue_v1';

const validId = value => value !== null && value !== undefined && String(value).trim() !== '';
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const clampLevel = level => Math.max(0, Math.min(7, Number.isFinite(Number(level)) ? Math.floor(Number(level)) : 0));

export function readSongReviewQueue(storage) {
  try {
    const rows = JSON.parse(storage.getItem(SONG_REVIEW_STORAGE_KEY) || '[]');
    if (!Array.isArray(rows)) return [];
    const seen = new Set();
    return rows.filter(row => {
      if (!row || !validId(row.wordId) || !validTime(row.dueAt)) return false;
      const id = String(row.wordId);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }).map(row => ({
      wordId: String(row.wordId),
      songId: String(row.songId || ''),
      dueAt: row.dueAt,
      masteryLevel: clampLevel(row.masteryLevel),
      attempts: Math.max(0, Number(row.attempts) || 0)
    }));
  } catch {
    return [];
  }
}

function writeSongReviewQueue(storage, rows) {
  try {
    storage.setItem(SONG_REVIEW_STORAGE_KEY, JSON.stringify(rows));
    return true;
  } catch {
    return false;
  }
}

export function addMissedSongWords(storage, wordRecords, songId, now = Date.now()) {
  const existing = readSongReviewQueue(storage);
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
    } else {
      existing.push({ wordId, songId: String(songId || ''), dueAt: time, masteryLevel: 0, attempts: 0 });
      index.set(wordId, existing.length - 1);
    }
    queued++;
  }
  return { saved: writeSongReviewQueue(storage, existing), queued };
}

export function advanceSongReview(storage, wordId, masteryLevel, nextReviewAt) {
  if (!validId(wordId) || !validTime(nextReviewAt)) return false;
  const rows = readSongReviewQueue(storage);
  const row = rows.find(item => item.wordId === String(wordId));
  if (!row) return false;
  row.masteryLevel = clampLevel(masteryLevel);
  row.dueAt = nextReviewAt;
  row.attempts++;
  return writeSongReviewQueue(storage, rows);
}

export function removeSongReview(storage, wordId) {
  const rows = readSongReviewQueue(storage);
  const next = rows.filter(row => row.wordId !== String(wordId));
  return rows.length !== next.length && writeSongReviewQueue(storage, next);
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
