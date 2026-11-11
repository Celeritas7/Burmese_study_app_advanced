// Phase 4B: self-contained song vocabulary practice. No SRS or database writes.
import { matchStudyWord, normalizeSongWord } from './song-vocabulary.js';

const meaningKey = value => String(value ?? '').normalize('NFC').trim().toLocaleLowerCase();

export function getSongPracticeWords(prompts, studyIndex) {
  const seen = new Set();
  const result = [];
  for (const prompt of Array.isArray(prompts) ? prompts : []) {
    const key = normalizeSongWord(prompt);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const record = matchStudyWord(studyIndex, key);
    const meaning = typeof record?.english_meaning === 'string' ? record.english_meaning.trim() : '';
    if (meaning) result.push({ word: key, meaning });
  }
  return result;
}

export function shuffleSongItems(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const n = Number(random());
    const j = Math.min(i, Math.max(0, Math.floor((Number.isFinite(n) ? n : 0) * (i + 1))));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function makeSongPracticeQuestions(prompts, studyIndex, studyRows, random = Math.random) {
  const targets = getSongPracticeWords(prompts, studyIndex);
  const otherMeanings = [...targets.map(item => item.meaning),
    ...(Array.isArray(studyRows) ? studyRows.map(item => item?.english_meaning) : [])]
    .filter(value => typeof value === 'string' && value.trim())
    .map(value => value.trim());

  const questions = targets.map(({ word, meaning }) => {
    const seen = new Set([meaningKey(meaning)]);
    const alternatives = [];
    for (const candidate of shuffleSongItems(otherMeanings, random)) {
      const key = meaningKey(candidate);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      alternatives.push(candidate);
      if (alternatives.length === 3) break;
    }
    if (!alternatives.length) {
      return { type: 'recall', word, meaning, options: [], correctIndex: -1 };
    }
    const options = shuffleSongItems([meaning, ...alternatives], random);
    return { type: 'choice', word, meaning, options, correctIndex: options.indexOf(meaning) };
  });

  return shuffleSongItems(questions, random);
}
