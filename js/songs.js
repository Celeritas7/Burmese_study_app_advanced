// ═══ BURMESE MUSIC LIBRARY ═══
// Curated starter entries live in the app; personal additions and links stay on this device.
// learningWords are topic prompts, not verified verbatim song lyrics.
const STORAGE_KEY = 'burmese_song_library_v1';

export const SONG_CATEGORIES = [
  { id: 'kids', label: 'Children & Alphabet', burmese: 'ကလေးသီချင်းများ', icon: '🧸', focus: 'Letters, numbers and repetition' },
  { id: 'love', label: 'Love & Feelings', burmese: 'အချစ်သီချင်းများ', icon: '❤️', focus: 'Emotions and relationships' },
  { id: 'daily', label: 'Daily Life', burmese: 'နေ့စဉ်ဘဝ', icon: '🏡', focus: 'Family, food and everyday actions' },
  { id: 'nature', label: 'Nature & Animals', burmese: 'သဘာဝနှင့် တိရစ္ဆာန်များ', icon: '🌿', focus: 'Weather, plants and animals' },
  { id: 'spiritual', label: 'Spiritual & Metta Chants', burmese: 'မေတ္တာပို့နှင့် ဓမ္မတေးများ', icon: '🙏', focus: 'Loving-kindness, compassion and peace' },
  { id: 'folk', label: 'Traditional & Folk', burmese: 'ရိုးရာသီချင်းများ', icon: '🪕', focus: 'Culture and traditional expressions' },
  { id: 'festival', label: 'Festivals', burmese: 'ပွဲတော်သီချင်းများ', icon: '🎉', focus: 'Celebrations and seasons' },
  { id: 'pop', label: 'Modern Pop', burmese: 'ခေတ်ပေါ်သီချင်းများ', icon: '🎤', focus: 'Everyday conversational expressions' },
  { id: 'other', label: 'Other', burmese: 'အခြား', icon: '🎶', focus: 'Personal discoveries' }
];

const validCategory = value => SONG_CATEGORIES.some(item => item.id === value) ? value : 'other';
const normalizeWords = value => Array.isArray(value) ? value.filter(word => typeof word === 'string').slice(0, 12) : [];

export const STARTER_SONGS = [
  {
    id: 'arzani-yin-yin-lay-yuu',
    artist: 'အဆိုတော် အာဇာနည်',
    title: 'ယဉ်ယဉ်လေးရူး',
    category: 'pop',
    learningWords: ['ယဉ်ယဉ်', 'ရူး'],
    videoUrl: '',
    channelUrl: ''
  },
  {
    id: 'myanmar-alphabet-ka-to-a',
    artist: 'Myanmar Alphabet · Learning song',
    title: 'သံစဉ်ကဗျာ ဗျည်းအက္ခရာ { က မှ အ }',
    category: 'kids',
    learningWords: ['က', 'ခ', 'ဂ'],
    videoUrl: 'https://www.youtube.com/watch?v=UZ0WYXWRg1Q',
    channelUrl: ''
  },
  {
    id: 'ma-nhote-sat-chin-bu',
    artist: 'ရဲလေး ft. လွှမ်းပိုင်, အိမ့်ချစ်, Bobby Soxer',
    title: 'မနှုတ်ဆက်ချင်ဘူး',
    category: 'love',
    learningWords: ['နှုတ်ဆက်', 'မ…ချင်ဘူး'],
    videoUrl: 'https://www.youtube.com/watch?v=t7Tlvi03syQ',
    channelUrl: ''
  },
  {
    id: 'myanmar-children-zoo',
    artist: 'Little Thumbling · ကလေးသီချင်း',
    title: 'တိရိစ္ဆာန်ဉယျာဉ်သို့',
    category: 'nature',
    learningWords: ['တိရိစ္ဆာန်', 'ဉယျာဉ်'],
    videoUrl: 'https://www.youtube.com/watch?v=iKtxvCvn8qM',
    channelUrl: ''
  },
  {
    id: 'ydnm-thingyan-2026',
    artist: 'Various Artists · YDNM Music',
    title: 'သင်္ကြန်သီချင်းများ | Thingyan 2026',
    category: 'festival',
    learningWords: ['သင်္ကြန်', 'မိုး', 'နှစ်သစ်'],
    videoUrl: 'https://www.youtube.com/watch?v=oHVgsEe3aJc',
    channelUrl: ''
  },
  {
    id: 'metta-chant-dhamma-blossom',
    artist: 'ဓမ္မအသိပွင့်လန်းရာ · Dhamma Blossom (Pali with Burmese subtitles)',
    title: 'မေတ္တာပို့ ဓမ္မတေး (The Chant of Metta)',
    category: 'spiritual',
    learningWords: ['မေတ္တာ', 'သတ္တဝါ', 'ငြိမ်းချမ်း'],
    videoUrl: 'https://www.youtube.com/watch?v=VvpeNTrV5ak',
    channelUrl: 'https://www.youtube.com/@dhammablossom'
  },
  {
    id: 'metta-sutta-burmese-phonetic',
    artist: 'AA MM (Pali chant with Burmese pronunciation subtitles)',
    title: 'မေတ္တာသုတ် (မြန်မာအသံထွက် စာတန်းထိုး)',
    category: 'spiritual',
    learningWords: ['မေတ္တာ', 'သုတ်'],
    videoUrl: 'https://www.youtube.com/watch?v=M3U4OamBis8',
    channelUrl: ''
  },
  // Phase 3: additional verified YouTube recordings, grouped by learning theme.
  {
    id: 'children-eyes-can-see',
    artist: 'Cho My My Cartoon · ကလေးသီချင်း',
    title: 'မျက်စိလေးကမြင်တယ်',
    category: 'kids',
    learningWords: ['မျက်စိ', 'မြင်'],
    videoUrl: 'https://www.youtube.com/watch?v=xmvlXlKlqos',
    channelUrl: ''
  },
  {
    id: 'children-crab-family',
    artist: 'Cho My My Cartoon · ကလေးသီချင်း',
    title: 'ဂဏန်းမိသားစု တေးကဗျာ',
    category: 'kids',
    learningWords: ['ဂဏန်း', 'မိသားစု', 'လမ်းလျှောက်'],
    videoUrl: 'https://www.youtube.com/watch?v=LcG1M77VFvI',
    channelUrl: ''
  },
  {
    id: 'daily-mingalaba-greeting',
    artist: 'Cho My My Cartoon · Grade 1 song',
    title: 'မင်္ဂလာပါ (ပထမတန်းတေးကဗျာ)',
    category: 'daily',
    learningWords: ['မင်္ဂလာပါ', 'နှုတ်ဆက်'],
    videoUrl: 'https://www.youtube.com/watch?v=TPcuL3G8xG0',
    channelUrl: ''
  },
  {
    id: 'daily-a-childs-day',
    artist: 'Cho My My Cartoon · KG song',
    title: 'လူကလေး၏တစ်နေ့တာ',
    category: 'daily',
    learningWords: ['စောစောထ', 'သွားတိုက်', 'မျက်နှာသစ်'],
    videoUrl: 'https://www.youtube.com/watch?v=kRZ1EfbcGB8',
    channelUrl: ''
  },
  {
    id: 'daily-ma-naw-family-collection',
    artist: 'မနော · May Kyay Mone Official (song collection)',
    title: 'မနောရဲ့ အကောင်းဆုံးတေးသီချင်းများ (မိသားစုနှင့် ဘဝ)',
    category: 'daily',
    learningWords: ['အမေ', 'အဖေ', 'စာသင်ခန်း'],
    videoUrl: 'https://www.youtube.com/watch?v=HquZ5vCatS0',
    channelUrl: ''
  },
  {
    id: 'nature-little-rabbit-ears',
    artist: 'Cho My My Cartoon · ကလေးသီချင်း',
    title: 'ယုန်ကလေးက နားရွက်ထောင်',
    category: 'nature',
    learningWords: ['ယုန်', 'နားရွက်'],
    videoUrl: 'https://www.youtube.com/watch?v=BXhYLyGeCss',
    channelUrl: ''
  },
  {
    id: 'nature-gecko-tree',
    artist: 'Cho My My Cartoon · ကလေးသီချင်း',
    title: 'သစ်ပင်ပေါ်ကတောက်တဲ့ (Gecko on the Tree)',
    category: 'nature',
    learningWords: ['သစ်ပင်', 'တောက်တဲ့'],
    videoUrl: 'https://www.youtube.com/watch?v=eK9a9x174uA',
    channelUrl: ''
  },
  {
    id: 'love-jfire-a-htar-kya',
    artist: 'J-Fire feat. Khaing Myae Thitsar · Official MV',
    title: 'အထာကျတဲ့အချစ်',
    category: 'love',
    learningWords: ['အချစ်', 'ချစ်'],
    videoUrl: 'https://www.youtube.com/watch?v=Th-XjqOB4IA',
    channelUrl: ''
  },
  {
    id: 'love-bg18-a-chit',
    artist: 'BG18 · Official lyric video',
    title: 'အချစ်',
    category: 'love',
    learningWords: ['အချစ်', 'ချစ်ခြင်း'],
    videoUrl: 'https://www.youtube.com/watch?v=8r4h3KMufL4',
    channelUrl: 'https://www.youtube.com/@bg_labels'
  },
  {
    id: 'spiritual-morning-metta',
    artist: 'BB Channel · Pali chant with Burmese/English subtitles',
    title: 'နံနက်ခင်းမေတ္တာပို့ ဓမ္မတေး',
    category: 'spiritual',
    learningWords: ['မေတ္တာ', 'မိဘ', 'ဆရာသမား'],
    videoUrl: 'https://www.youtube.com/watch?v=S6U6DlGPNgg',
    channelUrl: ''
  },
  {
    id: 'folk-rural-myanmar-collection',
    artist: 'KB Soe Moe Producer · rural song collection',
    title: 'မြန်မာသံစဉ် ကျေးလက်တေးသီချင်းများ',
    category: 'folk',
    learningWords: ['ကျေးလက်', 'သံစဉ်'],
    videoUrl: 'https://www.youtube.com/watch?v=Avgjyq-pNaQ',
    channelUrl: ''
  },
  {
    id: 'folk-ma-lay-lat-khat-than',
    artist: 'Crew-X MM · traditional dance to Gita Yadana song',
    title: 'မလေးလက်ခတ်သံ (Burmese Folk Dance)',
    category: 'folk',
    learningWords: ['ရိုးရာ', 'အက'],
    videoUrl: 'https://www.youtube.com/watch?v=zhXy2AQVq5k',
    channelUrl: ''
  },
  {
    id: 'folk-traditional-heartbreak-collection',
    artist: 'Rayrai Production · traditional-style collection',
    title: 'မြန်မာသံစဉ် အသည်းကွဲတေးသီချင်းများ',
    category: 'folk',
    learningWords: ['အသည်းကွဲ', 'တေးသီချင်း'],
    videoUrl: 'https://www.youtube.com/watch?v=Yd8NpQqjeXo',
    channelUrl: ''
  },
  {
    id: 'festival-thingyan-songs-collection',
    artist: 'Various artists · Thingyan song collection',
    title: 'သင်္ကြန်သီချင်းများ | Myanmar Thingyan Songs',
    category: 'festival',
    learningWords: ['သင်္ကြန်', 'ရေ', 'ပွဲတော်'],
    videoUrl: 'https://www.youtube.com/watch?v=F_zRihTQheE',
    channelUrl: ''
  },
  {
    id: 'festival-yadanar-myaing-thingyan',
    artist: 'Various artists · Thingyan song collection',
    title: 'ရတနာမြိုင်သင်္ကြန်သီချင်းများ',
    category: 'festival',
    learningWords: ['သင်္ကြန်', 'ရတနာ', 'နှစ်သစ်'],
    videoUrl: 'https://www.youtube.com/watch?v=xid8fASmtYw',
    channelUrl: ''
  },
  {
    id: 'pop-ni-ni-khin-zaw-atta',
    artist: 'Ni Ni Khin Zaw · Official MV',
    title: 'အတ္တကြီးစွာချစ်သည်',
    category: 'pop',
    learningWords: ['အတ္တ', 'ချစ်'],
    videoUrl: 'https://www.youtube.com/watch?v=knxc1Wm8y0Q',
    channelUrl: ''
  },
  {
    id: 'pop-bunny-phyoe-my-energy',
    artist: 'Bunny Phyoe · Official MV',
    title: 'My Energy',
    category: 'pop',
    learningWords: ['အား', 'စွမ်းအား'],
    videoUrl: 'https://www.youtube.com/watch?v=fEOwYlS4u5o',
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

export function filterSongs(songs, category = 'all', search = '') {
  const query = String(search).toLocaleLowerCase().trim();
  return songs.filter(song =>
    (category === 'all' || song.category === category) &&
    `${song.title} ${song.artist} ${(song.learningWords || []).join(' ')}`.toLocaleLowerCase().includes(query));
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
    return { ...base,
      category: updated?.category ? validCategory(updated.category) : base.category,
      learningWords: updated?.learningWords ? normalizeWords(updated.learningWords) : base.learningWords,
      videoUrl: updated?.videoUrl ?? base.videoUrl,
      channelUrl: updated?.channelUrl ?? base.channelUrl
    };
  });
  for (const song of saved) {
    if (result.some(base => base.id === song.id)) continue;
    result.push({ id: song.id, artist: song.artist, title: song.title,
      category: validCategory(song.category), learningWords: normalizeWords(song.learningWords),
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
    this.activeCategory = 'all';
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
            <div class="app-title">🎵 Songs & Chants</div>
            <div class="app-subtitle">Listen, discover & learn Burmese</div>
          </div>
        </div>
        <div class="songs-intro">Pick a theme, listen to a song, and practise a few repeated Burmese words. Add your own songs and YouTube links as you discover them.</div>
        <div class="songs-category-title">Choose a learning theme</div>
        <div class="songs-categories" id="songs-categories" aria-label="Song categories"></div>
        <div class="songs-tools">
          <input class="songs-search" id="songs-search" type="search" maxlength="100"
            placeholder="Search song or artist…" aria-label="Search songs" value="${escapeSongHTML(this.search)}">
          <button class="songs-add" data-song-action="add">+ Song</button>
        </div>
        <div class="songs-count" id="songs-count"></div>
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
      if (action === 'filter') {
        this.activeCategory = button.dataset.category;
        this.renderFilters();
        this.renderList();
        return;
      }
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
      this.renderFilters();
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
    this.renderFilters();
    this.renderList();
    this.renderEditor();
  }

  renderFilters() {
    const counts = Object.fromEntries(SONG_CATEGORIES.map(item => [item.id,
      this.songs.filter(song => song.category === item.id).length]));
    const filters = [{ id: 'all', icon: '🎵', label: 'All', count: this.songs.length },
      ...SONG_CATEGORIES.map(item => ({ ...item, count: counts[item.id] }))];
    this.container.querySelector('#songs-categories').innerHTML = filters.map(item => `
      <button class="songs-category ${this.activeCategory === item.id ? 'active' : ''}"
        type="button" data-song-action="filter" data-category="${item.id}"
        aria-pressed="${this.activeCategory === item.id}">
        <span>${item.icon} ${escapeSongHTML(item.label)}</span><span class="songs-category-count">${item.count}</span>
      </button>`).join('');
  }

  renderList() {
    const list = this.container.querySelector('#songs-list');
    const query = this.search.toLocaleLowerCase().trim();
    const matches = filterSongs(this.songs, this.activeCategory, query);
    this.container.querySelector('#songs-count').textContent = `${matches.length} song${matches.length === 1 ? '' : 's'} in this view`;
    const card = song => {
      const video = validatedYouTubeUrl(song.videoUrl, 'video');
      const channel = validatedYouTubeUrl(song.channelUrl, 'channel');
      const search = youtubeSearchUrl(`${song.artist} ${song.title}`);
      const channelSearch = youtubeSearchUrl(`${song.artist} official channel`);
      const category = SONG_CATEGORIES.find(item => item.id === song.category) || SONG_CATEGORIES.at(-1);
      const words = normalizeWords(song.learningWords);
      return `<article class="song-card">
        <div class="song-card-top">
          <div class="song-art" aria-hidden="true">♫</div>
          <div class="flex-1">
            <div class="song-title">${escapeSongHTML(song.title)}</div>
            <div class="song-artist">${escapeSongHTML(song.artist)}</div>
            <div class="song-theme">${category.icon} ${escapeSongHTML(category.label)}</div>
          </div>
        </div>
        <div class="song-word-focus"><span>Words / themes to notice</span>
          <div>${words.length ? words.map(word => `<span class="song-word-chip">${escapeSongHTML(word)}</span>`).join('') :
            `<span class="song-word-suggestion">${escapeSongHTML(category.focus)}</span>`}</div>
        </div>
        <div class="song-actions">
          <a href="${escapeSongHTML(video || search)}" target="_blank" rel="noopener noreferrer" class="song-link song-link-main">${video ? '▶ Watch on YouTube' : '⌕ Find song on YouTube'}</a>
          <a href="${escapeSongHTML(channel || channelSearch)}" target="_blank" rel="noopener noreferrer" class="song-link">${channel ? '♫ Artist channel' : '⌕ Find artist channel'}</a>
        </div>
        <button class="song-edit-link" data-song-action="edit" data-id="${escapeSongHTML(song.id)}">✎ Edit category, words & links</button>
      </article>`;
    };
    if (!matches.length) {
      list.innerHTML = '<div class="songs-empty">No songs in this category yet. Add one with + Song.</div>';
    } else if (this.activeCategory === 'all' && !query) {
      list.innerHTML = SONG_CATEGORIES.map(category => {
        const group = matches.filter(song => song.category === category.id);
        return group.length ? `<div class="song-group-heading">${category.icon} ${escapeSongHTML(category.label)} <span>${group.length}</span></div>${group.map(card).join('')}` : '';
      }).join('');
    } else {
      list.innerHTML = matches.map(card).join('');
    }
  }

  renderEditor() {
    const panel = this.container.querySelector('#songs-editor');
    if (!this.editId) { panel.innerHTML = ''; return; }
    const isNew = this.editId === 'new';
    const song = isNew ? { title: '', artist: '', category: this.activeCategory === 'all' ? 'other' : this.activeCategory,
      learningWords: [], videoUrl: '', channelUrl: '' } :
      this.songs.find(item => item.id === this.editId);
    if (!song) { this.editId = null; panel.innerHTML = ''; return; }
    const custom = !isNew && !STARTER_SONGS.some(item => item.id === song.id);
    panel.innerHTML = `<form id="song-form" class="song-form">
      <div class="song-form-title">${isNew ? 'Add a Burmese song' : 'Song details & YouTube links'}</div>
      <label for="song-title">Song title</label>
      <input id="song-title" name="title" required maxlength="120" value="${escapeSongHTML(song.title)}" ${isNew || custom ? '' : 'readonly'}>
      <label for="song-artist">Artist / source</label>
      <input id="song-artist" name="artist" required maxlength="120" value="${escapeSongHTML(song.artist)}" ${isNew || custom ? '' : 'readonly'}>
      <label for="song-category">Category</label>
      <select id="song-category" name="category">
        ${SONG_CATEGORIES.map(item => `<option value="${item.id}" ${song.category === item.id ? 'selected' : ''}>${item.icon} ${escapeSongHTML(item.label)} (${escapeSongHTML(item.burmese)})</option>`).join('')}
      </select>
      <label for="song-words">Words to remember <span>(comma-separated, up to 12)</span></label>
      <input id="song-words" name="words" maxlength="260" placeholder="ချစ်, မင်္ဂလာ, ကျေးဇူး" value="${escapeSongHTML(normalizeWords(song.learningWords).join(', '))}">
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
    const category = validCategory(String(data.get('category') || 'other'));
    const learningWords = String(data.get('words') || '').split(/[,，၊]/).map(word => word.trim()).filter(Boolean).slice(0, 12);
    const videoUrl = validatedYouTubeUrl(data.get('videoUrl'), 'video');
    const channelUrl = validatedYouTubeUrl(data.get('channelUrl'), 'channel');
    const error = form.querySelector('#song-form-error');
    if (!title || !artist) { error.textContent = 'Please enter both the song and artist.'; return; }
    if (videoUrl === null) { error.textContent = 'Use a valid HTTPS YouTube video or playlist link.'; return; }
    if (channelUrl === null) { error.textContent = 'Use a valid HTTPS YouTube channel link.'; return; }

    if (this.editId === 'new') {
      this.songs.push({ id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title, artist, category, learningWords, videoUrl, channelUrl });
    } else {
      const song = this.songs.find(item => item.id === this.editId);
      if (!song) return;
      Object.assign(song, { category, learningWords, videoUrl, channelUrl });
      if (!STARTER_SONGS.some(item => item.id === song.id)) Object.assign(song, { title, artist });
    }
    this.save();
    this.editId = null;
    this.render(this.container);
  }
}
