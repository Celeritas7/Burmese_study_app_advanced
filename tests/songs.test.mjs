import test from 'node:test';
import assert from 'node:assert/strict';
import { SONG_CATEGORIES, STARTER_SONGS, escapeSongHTML, filterSongs, loadSongs, SongsPage,
  validatedYouTubeUrl, youtubeSearchUrl } from '../js/songs.js';

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
