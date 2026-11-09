// ═══ BURMESE MUSIC LIBRARY ═══
// The starter entry lives in the app; personal additions and links stay on this device.
// Do not put unverified YouTube video/channel URLs into the starter catalog.
const STORAGE_KEY = 'burmese_song_library_v1';

export const STARTER_SONGS = [
  {
    id: 'arzani-yin-yin-lay-yuu',
    artist: 'အဆိုတော် အာဇာနည်',
    title: 'ယဉ်ယဉ်လေးရူး',
    videoUrl: '',
    channelUrl: ''
  }
];

export const escapeSongHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

export function validatedYouTubeUrl(value, kind) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const isYouTube = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host);
    const segments = url.pathname.split('/').filter(Boolean);
    const first = segments[0] || '';
    if (kind === 'video') {
      const direct = host === 'youtu.be' && segments.length === 1;
      const watch = isYouTube && first === 'watch' && Boolean(url.searchParams.get('v'));
      const playlist = isYouTube && first === 'playlist' && Boolean(url.searchParams.get('list'));
      const shortOrLive = isYouTube && ['shorts', 'live'].includes(first) && segments.length >= 2;
      return direct || watch || playlist || shortOrLive ? url.href : null;
    }
    if (kind === 'channel') {
      return isYouTube && (first.startsWith('@') || ['channel', 'c', 'user'].includes(first)) &&
        (first.startsWith('@') || segments.length >= 2) ? url.href : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function youtubeSearchUrl(terms) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(terms)}`;
}

export function loadSongs(storage = localStorage) {
  let stored = [];
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(parsed)) stored = parsed;
  } catch { /* Browser storage may be unavailable or contain old data. */ }

  const validEntry = song => song && typeof song.id === 'string' &&
    typeof song.artist === 'string' && typeof song.title === 'string';
  const saved = stored.filter(validEntry);
  const result = STARTER_SONGS.map(base => {
    const updated = saved.find(song => song.id === base.id);
    return { ...base, videoUrl: updated?.videoUrl || '', channelUrl: updated?.channelUrl || '' };
  });
  for (const song of saved) {
    if (result.some(base => base.id === song.id)) continue;
    result.push({ id: song.id, artist: song.artist, title: song.title,
      videoUrl: song.videoUrl || '', channelUrl: song.channelUrl || '' });
  }
  return result;
}

export class SongsPage {
  constructor(app, storage = localStorage) {
    this.app = app;
    this.storage = storage;
    this.songs = loadSongs(storage);
    this.search = '';
    this.editId = null;
    this.message = '';
  }

  save() {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.songs));
      this.message = '✓ Saved on this device';
      return true;
    } catch {
      this.message = 'Could not save: browser storage is unavailable.';
      return false;
    }
  }

  render(container) {
    this.container = container;
    container.innerHTML = `
      <div class="songs-page pad">
        <div class="songs-header">
          <button class="songs-back" data-song-action="back" aria-label="Back to More">←</button>
          <div class="flex-1">
            <div class="app-title">🎵 Burmese Songs</div>
            <div class="app-subtitle">Listen, discover & learn from music</div>
          </div>
        </div>
        <div class="songs-intro">Find Burmese songs on YouTube or save a direct video and artist-channel link for next time.</div>
        <div class="songs-tools">
          <input class="songs-search" id="songs-search" type="search" maxlength="100"
            placeholder="Search song or artist…" aria-label="Search songs" value="${escapeSongHTML(this.search)}">
          <button class="songs-add" data-song-action="add">+ Song</button>
        </div>
        <div class="songs-status" id="songs-status" role="status">${escapeSongHTML(this.message)}</div>
        <div class="songs-list" id="songs-list"></div>
        <div class="songs-editor" id="songs-editor"></div>
        <p class="songs-footnote">Your new songs and saved links stay in this browser. YouTube opens in a new tab or app.</p>
      </div>`;

    container.onclick = event => {
      const button = event.target.closest('[data-song-action]');
      if (!button) return;
      const action = button.dataset.songAction;
      if (action === 'back') return this.app.tabs.more.render(this.app.contentEl);
      if (action === 'add') this.editId = 'new';
      if (action === 'edit') this.editId = button.dataset.id;
      if (action === 'cancel') this.editId = null;
      if (action === 'delete') {
        const song = this.songs.find(item => item.id === button.dataset.id);
        if (song && !STARTER_SONGS.some(base => base.id === song.id) &&
            confirm(`Remove “${song.title}” from your songs?`)) {
          this.songs = this.songs.filter(item => item.id !== song.id);
          this.save();
          this.editId = null;
        }
      }
      this.renderEditor();
      this.renderList();
      container.querySelector('#songs-status').textContent = this.message;
    };

    container.querySelector('#songs-search').oninput = event => {
      this.search = event.target.value;
      this.renderList();
    };
    container.onsubmit = event => {
      if (event.target.id !== 'song-form') return;
      event.preventDefault();
      this.submitForm(event.target);
    };
    this.renderList();
    this.renderEditor();
  }

  renderList() {
    const list = this.container.querySelector('#songs-list');
    const query = this.search.toLocaleLowerCase().trim();
    const matches = this.songs.filter(song => `${song.title} ${song.artist}`.toLocaleLowerCase().includes(query));
    list.innerHTML = matches.length ? matches.map(song => {
      const video = validatedYouTubeUrl(song.videoUrl, 'video');
      const channel = validatedYouTubeUrl(song.channelUrl, 'channel');
      const search = youtubeSearchUrl(`${song.artist} ${song.title}`);
      const channelSearch = youtubeSearchUrl(`${song.artist} official channel`);
      return `<article class="song-card">
        <div class="song-card-top">
          <div class="song-art" aria-hidden="true">♫</div>
          <div class="flex-1">
            <div class="song-title">${escapeSongHTML(song.title)}</div>
            <div class="song-artist">${escapeSongHTML(song.artist)}</div>
          </div>
        </div>
        <div class="song-actions">
          <a href="${escapeSongHTML(video || search)}" target="_blank" rel="noopener noreferrer" class="song-link song-link-main">${video ? '▶ Watch on YouTube' : '⌕ Find song on YouTube'}</a>
          <a href="${escapeSongHTML(channel || channelSearch)}" target="_blank" rel="noopener noreferrer" class="song-link">${channel ? '♫ Artist channel' : '⌕ Find artist channel'}</a>
        </div>
        <button class="song-edit-link" data-song-action="edit" data-id="${escapeSongHTML(song.id)}">🔗 ${video || channel ? 'Edit YouTube links' : 'Add YouTube links'}</button>
      </article>`;
    }).join('') : '<div class="songs-empty">No songs found. Try another search or add one.</div>';
  }

  renderEditor() {
    const panel = this.container.querySelector('#songs-editor');
    if (!this.editId) { panel.innerHTML = ''; return; }
    const isNew = this.editId === 'new';
    const song = isNew ? { title: '', artist: '', videoUrl: '', channelUrl: '' } :
      this.songs.find(item => item.id === this.editId);
    if (!song) { this.editId = null; panel.innerHTML = ''; return; }
    const custom = !isNew && !STARTER_SONGS.some(item => item.id === song.id);
    panel.innerHTML = `<form id="song-form" class="song-form">
      <div class="song-form-title">${isNew ? 'Add a Burmese song' : 'Song details & YouTube links'}</div>
      <label for="song-title">Song title</label>
      <input id="song-title" name="title" required maxlength="120" value="${escapeSongHTML(song.title)}" ${isNew || custom ? '' : 'readonly'}>
      <label for="song-artist">Artist / singer</label>
      <input id="song-artist" name="artist" required maxlength="120" value="${escapeSongHTML(song.artist)}" ${isNew || custom ? '' : 'readonly'}>
      <label for="song-video">YouTube video or playlist URL <span>(optional)</span></label>
      <input id="song-video" name="videoUrl" type="url" placeholder="https://www.youtube.com/watch?v=…" value="${escapeSongHTML(song.videoUrl)}">
      <label for="song-channel">YouTube artist channel URL <span>(optional)</span></label>
      <input id="song-channel" name="channelUrl" type="url" placeholder="https://www.youtube.com/@artist" value="${escapeSongHTML(song.channelUrl)}">
      <div class="song-form-error" id="song-form-error" role="alert"></div>
      <div class="song-form-buttons">
        <button type="submit" class="song-save">Save</button>
        <button type="button" class="song-cancel" data-song-action="cancel">Cancel</button>
        ${custom ? `<button type="button" class="song-remove" data-song-action="delete" data-id="${escapeSongHTML(song.id)}">Remove</button>` : ''}
      </div>
    </form>`;
  }

  submitForm(form) {
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    const artist = String(data.get('artist') || '').trim();
    const videoUrl = validatedYouTubeUrl(data.get('videoUrl'), 'video');
    const channelUrl = validatedYouTubeUrl(data.get('channelUrl'), 'channel');
    const error = form.querySelector('#song-form-error');
    if (!title || !artist) { error.textContent = 'Please enter both the song and artist.'; return; }
    if (videoUrl === null) { error.textContent = 'Use a valid HTTPS YouTube video or playlist link.'; return; }
    if (channelUrl === null) { error.textContent = 'Use a valid HTTPS YouTube channel link.'; return; }

    if (this.editId === 'new') {
      this.songs.push({ id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title, artist, videoUrl, channelUrl });
    } else {
      const song = this.songs.find(item => item.id === this.editId);
      if (!song) return;
      Object.assign(song, { videoUrl, channelUrl });
      if (!STARTER_SONGS.some(item => item.id === song.id)) Object.assign(song, { title, artist });
    }
    this.save();
    this.editId = null;
    this.render(this.container);
  }
}
