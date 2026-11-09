import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTER_SONGS, escapeSongHTML, loadSongs, SongsPage,
  validatedYouTubeUrl, youtubeSearchUrl } from '../js/songs.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

test('the exact requested Burmese artist and title are available by default', () => {
  const songs = loadSongs(memoryStorage());
  assert.equal(songs.length, 1);
  assert.equal(songs[0].artist, 'အဆိုတော် အာဇာနည်');
  assert.equal(songs[0].title, 'ယဉ်ယဉ်လေးရူး');
  assert.equal(songs[0].videoUrl, '');
});

test('song links and new songs persist without duplicating the starter', () => {
  const storage = memoryStorage();
  const page = new SongsPage({}, storage);
  page.songs[0].videoUrl = 'https://www.youtube.com/watch?v=abcdef12345';
  page.songs.push({ id: 'custom-one', artist: 'Test artist', title: 'Test title',
    videoUrl: '', channelUrl: '' });
  assert.equal(page.save(), true);
  const loaded = loadSongs(storage);
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].videoUrl, 'https://www.youtube.com/watch?v=abcdef12345');
  assert.equal(loaded[1].title, 'Test title');
  assert.equal(STARTER_SONGS[0].videoUrl, '');
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
