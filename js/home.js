// ═══ HOME TAB ═══
// Daily-rotating "Today's Focus" hero. Drop in js/home.js

// Each entry is one day's focus. The home screen picks one by date, so it
// changes every day and recolors to that focus's accent.
const FOCI = [
  { source: 'kg_book',    glyph: 'မ',     title: 'Greetings & basics', sub: 'KG Book · Lesson 3',    meta: '8 new words',  color: '#FF6B8A', done: 'Vocabulary' },
  { source: 'words',      glyph: 'စာ',    title: 'Core vocabulary',    sub: 'Main Words · Set 12',   meta: '10 new words', color: '#58CC02', done: 'Greetings' },
  { source: 'recipes',    glyph: 'ဟင်း',  title: 'Kitchen & food',     sub: 'Recipes · Chapter 4',   meta: '6 new words',  color: '#CE82FF', done: 'Core vocab' },
  { source: 'colloquial', glyph: 'စကား', title: 'Everyday speech',    sub: 'Colloquial · Unit 7',   meta: '9 new words',  color: '#FFC800', done: 'Kitchen' },
  { source: 'kg_book',    glyph: 'ဗျည်း', title: 'Consonant drill',    sub: 'KG Book · Writing pad', meta: '5 letters',    color: '#1CB0F6', done: 'Everyday' },
];

export class HomeTab {
  constructor(app) { this.app = app; }

  todayFocus() {
    return FOCI[Math.floor(Date.now() / 86400000) % FOCI.length];
  }

  render(container) {
    const f = this.todayFocus();
    container.innerHTML = `
      <div class="home" style="--focus:${f.color};">
        <div class="home-header">
          <div class="home-logo">မ</div>
          <div class="home-brand">Burmese Study</div>
          <button class="home-stats" id="home-stats">📊 Stats</button>
          <button class="home-icon" id="home-settings">⚙️</button>
        </div>

        <div class="home-wm" aria-hidden="true">
          <span style="top:70px;right:-10px;font-size:150px;">${f.glyph}</span>
          <span style="top:300px;left:-20px;font-size:120px;">စာ</span>
          <span style="bottom:40px;right:20px;font-size:130px;">ကျ</span>
        </div>

        <div class="home-hero">
          <div class="home-done">✓ ${f.done} completed today</div>
          <div class="home-glyph">${f.glyph}</div>
          <div class="home-focus-label">Today's Focus</div>
          <div class="home-title">${f.title}</div>
          <div class="home-sub">${f.sub}</div>
          <div class="home-meta">${f.meta}</div>
          <button class="home-start" id="home-start">
            <span class="home-play">▶</span>
            <span class="home-start-label">Start practice</span>
          </button>
        </div>
      </div>`;

    // "Start practice" → preselect today's source and jump straight into a session.
    container.querySelector('#home-start').addEventListener('click', () => {
      const study = this.app.tabs.study;
      study.selectedSource = f.source;
      study.mode = 'burmese';
      this.app.switchTab('study');
      study.startSession(this.app.contentEl);
    });
    container.querySelector('#home-stats').addEventListener('click', () => this.app.showStats());
    container.querySelector('#home-settings').addEventListener('click', () => this.app.showSettings());
  }
}
