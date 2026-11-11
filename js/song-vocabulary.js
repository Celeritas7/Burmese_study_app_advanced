// Shared read-only matching helpers for the Songs & Chants vocabulary explorer.
// Never infer a meaning from a song's title or from an unrelated database entry.
export function normalizeSongWord(value) {
  return String(value ?? '').normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function indexStudyWords(rows) {
  const index = new Map();
  if (!Array.isArray(rows)) return index;
  for (const row of rows) {
    if (!row || typeof row.burmese_word !== 'string') continue;
    const key = normalizeSongWord(row.burmese_word);
    if (!key) continue;
    // Duplicate spellings can exist across sources. Prefer a non-empty meaning.
    const currentMeaning = String(index.get(key)?.english_meaning ?? '').trim();
    const nextMeaning = String(row.english_meaning ?? '').trim();
    if (!index.has(key) || (!currentMeaning && nextMeaning)) {
      index.set(key, row);
    }
  }
  return index;
}

export function matchStudyWord(index, word) {
  return index instanceof Map ? index.get(normalizeSongWord(word)) || null : null;
}
