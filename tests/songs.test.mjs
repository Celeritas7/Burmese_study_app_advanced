import test from 'node:test';
import assert from 'node:assert/strict';
import { SONG_CATEGORIES, STARTER_SONGS, escapeSongHTML, filterSongs, loadSongs, SongsPage,
  validatedYouTubeUrl, youtubeSearchUrl } from '../js/songs.js';
import { indexStudyWords, matchStudyWord, normalizeSongWord } from '../js/song-vocabulary.js';
import { getSongPracticeWords, makeSongPracticeQuestions, shuffleSongItems } from '../js/song-practice.js';
import { SONG_REVIEW_STORAGE_KEY, addMissedSongWords, advanceSongReview,
  combineSongReviewQueue, readSongReviewQueue, removeSongReview } from '../js/song-review-queue.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

test('the original song and verified category starters are available by default', () => {
  const songs = loadSongs(memoryStorage());
  assert.equal(songs.length, 24);
  assert.equal(songs[0].artist, 'အဆိုတော် အာဇာနည်');
  assert.equal(songs[0].title, 'ယဉ်ယဉ်လေးရူး');
  assert.equal(songs[0].category, 'pop');
  assert.equal(songs[0].videoUrl, '');
  assert.equal(songs[1].category, 'kids');
  assert.equal(songs[2].category, 'love');
  assert.equal(songs[2].videoUrl, 'https://www.youtube.com/watch?v=t7Tlvi03syQ');
  assert.equal(songs[3].category, 'nature');
  assert.equal(songs[4].category, 'festival');
  assert.equal(songs[5].category, 'spiritual');
  assert.equal(songs[5].videoUrl, 'https://www.youtube.com/watch?v=VvpeNTrV5ak');
  assert.equal(songs[5].channelUrl, 'https://www.youtube.com/@dhammablossom');
  assert.equal(songs[6].category, 'spiritual');
  assert.equal(songs[6].videoUrl, 'https://www.youtube.com/watch?v=M3U4OamBis8');
  assert(SONG_CATEGORIES.some(item => item.id === 'festival'));
  assert(SONG_CATEGORIES.some(item => item.id === 'spiritual'));
});

test('song links and new songs persist without duplicating the starter', () => {
  const storage = memoryStorage();
  const page = new SongsPage({}, storage);
  page.songs[0].videoUrl = 'https://www.youtube.com/watch?v=abcdef12345';
  page.songs.push({ id: 'custom-one', artist: 'Test artist', title: 'Test title',
    category: 'nature', learningWords: ['မိုး', 'ပန်း'], videoUrl: '', channelUrl: '' });
  assert.equal(page.save(), true);
  const loaded = loadSongs(storage);
  assert.equal(loaded.length, STARTER_SONGS.length + 1);
  assert.equal(loaded[0].videoUrl, 'https://www.youtube.com/watch?v=abcdef12345');
  assert.equal(loaded.at(-1).title, 'Test title');
  assert.deepEqual(loaded.at(-1).learningWords, ['မိုး', 'ပန်း']);
  assert.equal(STARTER_SONGS[0].videoUrl, '');
});

test('old saved songs and user-edited URLs survive addition of new curated songs', () => {
  const storage = memoryStorage();
  storage.setItem('burmese_song_library_v1', JSON.stringify([
    { id: 'arzani-yin-yin-lay-yuu', artist: 'အဆိုတော် အာဇာနည်',
      title: 'ယဉ်ယဉ်လေးရူး', videoUrl: 'https://youtu.be/abcdef12', channelUrl: '' },
    { id: 'custom-before-categories', artist: 'Old artist', title: 'Old song',
      videoUrl: '', channelUrl: '' }
  ]));
  const loaded = loadSongs(storage);
  assert.equal(loaded.length, STARTER_SONGS.length + 1);
  assert.equal(loaded[0].videoUrl, 'https://youtu.be/abcdef12');
  assert.equal(loaded[0].category, 'pop');
  assert.equal(loaded.at(-1).category, 'other');
  assert.deepEqual(loaded.at(-1).learningWords, []);
});

test('category filters and word search find the right songs', () => {
  const songs = loadSongs(memoryStorage());
  assert.equal(filterSongs(songs, 'kids').length, 3);
  assert.equal(filterSongs(songs, 'love')[0].title, 'မနှုတ်ဆက်ချင်ဘူး');
  assert.equal(filterSongs(songs, 'love', 'နှုတ်ဆက်').length, 1);
  assert.equal(filterSongs(songs, 'all', 'နှုတ်ဆက်').length, 2);
  assert.equal(filterSongs(songs, 'nature').length, 3);
  assert.equal(filterSongs(songs, 'festival').length, 3);
  assert.equal(filterSongs(songs, 'spiritual').length, 3);
  assert.equal(filterSongs(songs, 'spiritual', 'မေတ္တာ').length, 3);
  assert.equal(filterSongs(songs, 'daily').length, 3);
  assert.equal(filterSongs(songs, 'folk').length, 3);
  assert.equal(filterSongs(songs, 'pop').length, 3);
  assert.equal(filterSongs(songs, 'other').length, 0);
});

test('curated tracks have unique IDs, accepted links and useful topic prompts', () => {
  assert.equal(new Set(STARTER_SONGS.map(song => song.id)).size, STARTER_SONGS.length);
  for (const song of STARTER_SONGS) {
    assert(SONG_CATEGORIES.some(category => category.id === song.category));
    assert(song.title.trim().length > 0 && song.artist.trim().length > 0);
    assert(song.learningWords.length >= 1 && song.learningWords.length <= 12);
    assert(song.videoUrl === '' || validatedYouTubeUrl(song.videoUrl, 'video') === song.videoUrl);
    assert(song.channelUrl === '' || validatedYouTubeUrl(song.channelUrl, 'channel') === song.channelUrl);
  }
});

test('external links are limited to real HTTPS YouTube videos and channels', () => {
  assert.equal(validatedYouTubeUrl('https://youtu.be/abcdef12', 'video'), 'https://youtu.be/abcdef12');
  assert.equal(validatedYouTubeUrl('https://youtube.com/@singer/videos', 'channel'), 'https://youtube.com/@singer/videos');
  assert.equal(validatedYouTubeUrl('https://youtube.com/playlist?list=PL123', 'video'), 'https://youtube.com/playlist?list=PL123');
  assert.equal(validatedYouTubeUrl('https://youtube.com.evil.test/watch?v=x', 'video'), null);
  assert.equal(validatedYouTubeUrl('javascript:alert(1)', 'video'), null);
  assert.equal(validatedYouTubeUrl('http://youtube.com/watch?v=x', 'video'), null);
  assert.equal(validatedYouTubeUrl('https://youtube.com/watch?v=x', 'channel'), null);
  assert.equal(validatedYouTubeUrl('', 'channel'), '');
});

test('search phrases are URL encoded and saved text is escaped', () => {
  const url = youtubeSearchUrl('အဆိုတော် အာဇာနည် ယဉ်ယဉ်လေးရူး');
  assert.equal(new URL(url).searchParams.get('search_query'), 'အဆိုတော် အာဇာနည် ယဉ်ယဉ်လေးရူး');
  assert.equal(escapeSongHTML('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
});

test('Study word lookup uses exact normalized Burmese text and prefers a recorded meaning', () => {
  const rows = [
    { burmese_word: ' မေတ္တာ ', english_meaning: ' ' },
    { burmese_word: 'မေတ္တာ', english_meaning: 'loving-kindness' },
    { burmese_word: 'ချစ်', english_meaning: 'love' },
    { burmese_word: 'မေတ္တာပို့', english_meaning: 'send loving-kindness' }
  ];
  const index = indexStudyWords(rows);
  assert.equal(normalizeSongWord('  မေတ္တာ  '), 'မေတ္တာ');
  assert.equal(index.size, 3);
  assert.equal(matchStudyWord(index, ' မေတ္တာ ').english_meaning, 'loving-kindness');
  assert.equal(matchStudyWord(index, 'မေတ္တာပို့').english_meaning, 'send loving-kindness');
  assert.equal(matchStudyWord(index, 'မေတ္တာ ပို့'), null);
  assert.equal(matchStudyWord(index, 'ချစ်တယ်'), null);
});

test('vocabulary explorer loads Study rows once without modifying records or song storage', async () => {
  const storage = memoryStorage();
  const originalRows = [{ burmese_word: 'မေတ္တာ', english_meaning: 'loving-kindness' }];
  const rowsBefore = JSON.stringify(originalRows);
  let requests = 0;
  const page = new SongsPage({}, storage, async () => {
    requests++;
    return originalRows;
  });
  await Promise.all([page.loadStudyVocabulary(), page.loadStudyVocabulary()]);
  await page.loadStudyVocabulary();
  assert.equal(requests, 1);
  assert.equal(page.studyWordsState, 'ready');
  assert.equal(JSON.stringify(originalRows), rowsBefore);
  assert.equal(storage.getItem('burmese_song_library_v1'), null);
  assert.match(page.renderVocabulary(page.songs[5], ['မေတ္တာ']), /loving-kindness/);
  assert.match(page.renderVocabulary(page.songs[5], ['မေတ္တာ']), /Pali chant/);
  assert.match(page.renderVocabulary(page.songs[5], ['မေတ္တာ']), /Devanagari hint/);
  assert.match(page.renderVocabulary(page.songs[5], ['မေတ္တာ']), /Nothing here changes your Study progress/);
  assert.match(page.renderVocabulary(page.songs[0], ['unknown']), /meaning not guessed/);
});

test('vocabulary lookup can be retried after a connection failure', async () => {
  let requests = 0;
  const page = new SongsPage({}, memoryStorage(), async () => {
    if (++requests === 1) throw new Error('Network unavailable');
    return [{ burmese_word: 'ရူး', english_meaning: 'crazy' }];
  });
  await page.loadStudyVocabulary();
  assert.equal(page.studyWordsState, 'error');
  assert.match(page.renderVocabulary(page.songs[0], ['ရူး']), /Retry lookup/);
  await page.loadStudyVocabulary();
  assert.equal(page.studyWordsState, 'ready');
  assert.equal(requests, 2);
  assert.match(page.renderVocabulary(page.songs[0], ['ရူး']), /crazy/);
});

test('song practice uses only unique exact Study matches with real meanings', () => {
  const rows = [
    { burmese_word: 'မေတ္တာ', english_meaning: 'loving-kindness' },
    { burmese_word: 'ရူး', english_meaning: 'crazy' },
    { burmese_word: 'မိုး', english_meaning: 'rain' },
    { burmese_word: 'အေး', english_meaning: 'cold' },
    { burmese_word: 'ပန်း', english_meaning: 'flower' },
    { burmese_word: 'သုတ်', english_meaning: ' ' }
  ];
  const index = indexStudyWords(rows);
  assert.deepEqual(getSongPracticeWords([' မေတ္တာ ', 'မေတ္တာ', 'မေတ္တာပို့', 'သုတ်'], index),
    [{ word: 'မေတ္တာ', meaning: 'loving-kindness' }]);
  const questions = makeSongPracticeQuestions(['မေတ္တာ', 'ရူး', 'မေတ္တာ', 'missing'], index, rows, () => 0);
  assert.equal(questions.length, 2);
  for (const question of questions) {
    assert.equal(question.type, 'choice');
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options.map(s => s.toLowerCase())).size, 4);
    assert.equal(question.options[question.correctIndex], question.meaning);
  }
  assert.deepEqual(shuffleSongItems([1, 2, 3], () => 0), [2, 3, 1]);
});

test('practice falls back to reveal and self-grade when distractors are unavailable', () => {
  const rows = [{ burmese_word: 'မေတ္တာ', english_meaning: 'loving-kindness' }];
  const index = indexStudyWords(rows);
  const questions = makeSongPracticeQuestions(['မေတ္တာ'], index, rows, () => 0);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].type, 'recall');
  assert.deepEqual(questions[0].options, []);
});

test('song quiz scores each answer once, hides hints, and never saves Study progress', async () => {
  const rows = [
    { burmese_word: 'ယဉ်ယဉ်', english_meaning: 'gently' },
    { burmese_word: 'ရူး', english_meaning: 'crazy' },
    { burmese_word: 'မိုး', english_meaning: 'rain' },
    { burmese_word: 'အေး', english_meaning: 'cold' }
  ];
  const originalRows = JSON.stringify(rows);
  const storage = memoryStorage();
  const page = new SongsPage({}, storage, async () => rows);
  await page.loadStudyVocabulary();
  const song = page.songs[0];
  page.openVocabularyId = song.id;
  page.startPractice(song.id);
  assert.equal(page.practice.questions.length, 2);
  const first = page.practice.questions[0];
  assert.doesNotMatch(page.renderVocabulary(song, song.learningWords), /song-vocab-item-main/);
  page.nextPractice(); // Cannot skip an unanswered question.
  assert.equal(page.practice.index, 0);
  page.answerPractice(first.correctIndex);
  page.answerPractice(first.correctIndex); // Cannot score again.
  assert.equal(page.practice.correct, 1);
  assert.match(page.renderPractice(song), /Correct!/);
  page.nextPractice();
  const second = page.practice.questions[1];
  const wrong = second.options.findIndex((_, index) => index !== second.correctIndex);
  page.answerPractice(wrong);
  assert.equal(page.practice.correct, 1);
  assert.match(page.renderPractice(song), /Not quite/);
  page.nextPractice();
  assert.equal(page.practice.index, 2);
  assert.match(page.renderPractice(song), /1 \/ 2/);
  assert.equal(JSON.stringify(rows), originalRows);
  assert.equal(storage.getItem('burmese_song_library_v1'), null);
  page.startPractice(song.id);
  assert.equal(page.practice.index, 0);
  assert.equal(page.practice.correct, 0);
});

test('recall mode requires reveal before grading and escapes dictionary text', async () => {
  const rows = [{ burmese_word: 'မေတ္တာ', english_meaning: '<love & kindness>' }];
  const page = new SongsPage({}, memoryStorage(), async () => rows);
  await page.loadStudyVocabulary();
  const song = page.songs[5];
  page.openVocabularyId = song.id;
  page.startPractice(song.id);
  assert.equal(page.practice.questions.length, 1);
  page.gradePractice(true);
  assert.equal(page.practice.answered, null);
  page.revealPractice();
  assert.match(page.renderPractice(song), /&lt;love &amp; kindness&gt;/);
  assert.doesNotMatch(page.renderPractice(song), /<love & kindness>/);
  page.gradePractice(false);
  assert.equal(page.practice.correct, 0);
  page.nextPractice();
  assert.match(page.renderPractice(song), /0 \/ 1/);
});

test('missed song words enter a separate local review queue only after opt-in', async () => {
  const rows = [
    { id: 101, burmese_word: 'ယဉ်ယဉ်', english_meaning: 'gently' },
    { id: 102, burmese_word: 'ရူး', english_meaning: 'crazy' },
    { id: 103, burmese_word: 'မိုး', english_meaning: 'rain' }
  ];
  const storage = memoryStorage();
  const page = new SongsPage({}, storage, async () => rows);
  await page.loadStudyVocabulary();
  const song = page.songs[0];
  page.openVocabularyId = song.id;
  page.startPractice(song.id);
  assert.equal(readSongReviewQueue(storage).length, 0);
  while (page.practice.index < page.practice.questions.length) {
    const question = page.practice.questions[page.practice.index];
    const wrong = question.options.findIndex((_, i) => i !== question.correctIndex);
    page.answerPractice(wrong);
    page.nextPractice();
  }
  assert.match(page.renderPractice(song), /Add missed words to Review/);
  assert.equal(storage.getItem(SONG_REVIEW_STORAGE_KEY), null);
  page.queueMissedPractice();
  assert.equal(page.practice.reviewAdded, true);
  assert.deepEqual(readSongReviewQueue(storage).map(row => row.wordId).sort(), ['101', '102']);
  assert.match(page.renderPractice(song), /Open Review tab/);
  page.queueMissedPractice(); // Button cannot re-queue the same session.
  assert.equal(readSongReviewQueue(storage).length, 2);
  assert.equal(storage.getItem('burmese_song_library_v1'), null);
});

test('local song-review queue deduplicates words and preserves review history on a new miss', () => {
  const storage = memoryStorage();
  const now = Date.parse('2026-11-11T12:00:00Z');
  assert.deepEqual(addMissedSongWords(storage, [{ wordId: 5 }, { wordId: 6 }, { wordId: 5 }], 'song-a', now),
    { saved: true, queued: 3 });
  assert.equal(readSongReviewQueue(storage).length, 2);
  const next = new Date(now + 4 * 3600000).toISOString();
  assert.equal(advanceSongReview(storage, 5, 3, next), true);
  assert.equal(readSongReviewQueue(storage)[0].masteryLevel, 3);
  assert.equal(readSongReviewQueue(storage)[0].attempts, 1);
  addMissedSongWords(storage, [{ wordId: 5 }], 'song-b', now + 5000);
  const updated = readSongReviewQueue(storage)[0];
  assert.equal(updated.masteryLevel, 3);
  assert.equal(updated.attempts, 1);
  assert.equal(updated.songId, 'song-b');
  assert.equal(updated.dueAt, new Date(now + 5000).toISOString());
  assert.equal(removeSongReview(storage, 5), true);
  assert.equal(removeSongReview(storage, 5), false);
  assert.deepEqual(readSongReviewQueue(storage).map(row => row.wordId), ['6']);
});

test('song review combines with normal SRS cards without duplicate words or overwriting regular due data', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  const wordMap = {
    5: { id: 5, burmese_word: 'မေတ္တာ', english_meaning: 'loving-kindness' },
    6: { id: 6, burmese_word: 'ရူး', english_meaning: 'crazy' }
  };
  const core = [{ wordId: 5, word: 'မေတ္တာ', meaning: 'loving-kindness',
    dueAt: now + 86400000, due: '1d', isDue: false, level: 5 }];
  const rows = [{ wordId: '5', dueAt: new Date(now).toISOString(), masteryLevel: 2 },
    { wordId: '6', dueAt: new Date(now + 3600000).toISOString(), masteryLevel: 1 }];
  const combined = combineSongReviewQueue(core, rows, wordMap, now);
  assert.equal(combined.length, 2);
  assert.equal(combined[0].wordId, 5);
  assert.equal(combined[0].isDue, true);
  assert.equal(combined[0].srsDue, false);
  assert.equal(combined[0].songDue, true);
  assert.equal(combined[0].songLevel, 2);
  assert.equal(combined[0].level, 2); // The active card uses its local song level.
  assert.equal(combined[0].srsLevel, 5); // Original SRS level is retained separately.
  assert.equal(combined[1].isDue, false);
  assert.equal(combined[1].due, '1h');
  assert.equal(combined[1].level, 1);
  assert.equal(core[0].isDue, false); // No mutation to existing queue cards.
  const dueCore = [{ wordId: 5, word: 'မေတ္တာ', meaning: 'loving-kindness',
    dueAt: now - 60000, due: 'Now', isDue: true, level: 5 }];
  const bothDue = combineSongReviewQueue(dueCore, rows, wordMap, now);
  assert.equal(bothDue[0].srsDue, true);
  assert.equal(bothDue[0].songDue, true);
  assert.equal(bothDue[0].level, 5); // Normal SRS takes precedence when both are due.
  assert.equal(bothDue.length, 2);
});

test('corrupt or blocked local storage does not lose or alter unrelated song records', () => {
  const storage = memoryStorage();
  storage.setItem(SONG_REVIEW_STORAGE_KEY, 'bad json');
  assert.deepEqual(readSongReviewQueue(storage), []);
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(addMissedSongWords(blocked, [{ wordId: 10 }], 'test').saved, false);
  assert.deepEqual(readSongReviewQueue(blocked), []);
  assert.equal(advanceSongReview(blocked, 10, 2, new Date().toISOString()), false);
});
