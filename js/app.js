// ═══ BURMESE STUDY APP ═══
import { db } from './supabase.js';
import { StudyTab } from './study.js';
import { SRSTab } from './srs.js';
import { MoreTab } from './more.js';
import { DialoguesTab } from './dialogues.js';
import { HubExplorer } from './hubexplorer.js';
import { StatsPage } from './stats.js';
import { WritingPractice } from './writing.js';
import { SentencesPage } from './sentences.js';
import { SettingsPage } from './settings.js';
import { HomeTab } from './home.js';
import { CourseTab } from './course.js';
import { SpeakTab } from './speak.js?v=7';
import { SongsPage } from './songs.js';
import { SongReviewCloudSync } from './song-review-sync.js';
import { NavigationState, PRIMARY_TABS } from './navigation.js';
import { registerAppWorker } from './offline.js';
import { isOfflineEdition } from './edition.js';

class BurmeseStudyApp {
  constructor() {
    this.navigation = new NavigationState();
    this.activeTab = this.navigation.activeTab; // Used by existing Study/SRS/Speak refresh logic.
    this.tabs = {};
    this.contentEl = null;
    // Account ownership for old Study/SRS rows has not been verified. The
    // offline edition cannot silently enable account sync or import them.
    this.songReviewSync = isOfflineEdition ? null : new SongReviewCloudSync();
  }

  async init() {
    const app = document.getElementById('app');
    app.innerHTML = `
      ${isOfflineEdition ? `<div class="offline-edition-banner" role="status">
        <div><strong>📥 Burmese Study Offline</strong><span>Study/SRS ratings stay on this device.</span></div>
        <button type="button" id="offline-edition-packs">Download words</button>
      </div>` : ''}
      <div class="tab-content" id="tab-content"></div>
      <nav class="tab-bar" id="tab-bar" aria-label="Main navigation">
        <button type="button" class="tab-btn active" data-tab="home" aria-current="page"><span class="tab-icon" aria-hidden="true">🏠</span><span class="tab-label">Home</span></button>
        <button type="button" class="tab-btn" data-tab="study"><span class="tab-icon" aria-hidden="true">📖</span><span class="tab-label">Study</span></button>
        <button type="button" class="tab-btn" data-tab="srs"><span class="tab-icon" aria-hidden="true">🔄</span><span class="tab-label">SRS</span></button>
        <button type="button" class="tab-btn" data-tab="speak"><span class="tab-icon" aria-hidden="true">🗣</span><span class="tab-label">Speak</span></button>
        <button type="button" class="tab-btn" data-tab="more"><span class="tab-icon" aria-hidden="true">⋯</span><span class="tab-label">More</span></button>
      </nav>
    `;
    this.contentEl = document.getElementById('tab-content');
    this.tabs.study = new StudyTab(this);
    this.tabs.home = new HomeTab(this);
    this.tabs.srs = new SRSTab(this);
    this.tabs.course = new CourseTab(this);
    this.tabs.more = new MoreTab(this);
    this.tabs.dialogues = new DialoguesTab(this);
    this.tabs.hubExplorer = new HubExplorer(this);
    this.tabs.stats = new StatsPage(this);
    this.tabs.writing = new WritingPractice(this);
    this.tabs.sentences = new SentencesPage(this);
    this.tabs.settings = new SettingsPage(this);
    this.tabs.speak = new SpeakTab(this);
    this.tabs.songs = new SongsPage(this);

    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
    document.getElementById('offline-edition-packs')?.addEventListener('click', () => this.showSettings());
    await db.testConnection();
    // Speak progress follows you across devices: rebuild said/miss (step 1) and ladder counts (steps 2–4, correct only) from the answer log (single user, anon key, so every row is mine).
    if (db.connected) db.query('speak_log', { select: 'pack,item,step,ok,created_at', filters: ['or=(step.eq.1,and(step.in.(2,3,4),ok.is.true))'], order: 'created_at' })
      .then(rows => this.tabs.speak.hydrate(rows)).catch(() => {});
    await this.tabs.study.init();
    this.renderTab();
    // Optional Google Auth must never hold up Study, Songs or offline practice.
    if (this.songReviewSync) {
      this.songReviewSync.initialize().catch(() => {});
      window.addEventListener('online', () => {
        const sync = this.songReviewSync;
        (sync.client ? sync.sync() : sync.initialize()).catch(() => {});
      });
    }
  }

  switchTab(tabId) {
    // Course is now a subpage; existing Speak grammar shortcuts continue to work.
    if (!PRIMARY_TABS.includes(tabId)) {
      if (tabId === 'course') this.showCourse();
      else if (this.tabs[tabId]) this.showSubPage(tabId);
      return;
    }
    if (tabId === this.activeTab && tabId === 'study') this.tabs.study.phase = 'setup';
    this.navigation.switchTab(tabId);
    this.activeTab = this.navigation.activeTab;
    this.updateNavHighlight();
    this.renderTab();
  }

  updateNavHighlight() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const active = btn.dataset.tab === this.activeTab;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }

  renderTab() {
    // A comfortable reading width on tablets, without widening unrelated pages.
    const appEl = document.getElementById('app');
    if (this.navigation.page !== 'writing' && appEl?.classList.contains('writing-layout'))
      this.tabs.writing?.cleanup(); // Restore viewport and tab bar if Writing was left indirectly.
    appEl?.classList.toggle('learning-wide',
      ['study', 'srs', 'songs'].includes(this.navigation.page));
    const tab = this.tabs[this.navigation.page];
    if (tab) tab.render(this.contentEl);
  }

  showSubPage(name) {
    if (!this.tabs[name]) return;
    this.navigation.open(name);
    this.updateNavHighlight(); // Keep the originating primary tab highlighted.
    this.renderTab();
  }

  goBack() {
    this.navigation.back();
    this.updateNavHighlight();
    this.renderTab();
  }

  showCourse() {
    if (this.navigation.page !== 'course') this.tabs.course.view = 'home';
    this.showSubPage('course');
  }

  showDialogues() { this.showSubPage('dialogues'); }
  showHubExplorer() { this.showSubPage('hubExplorer'); }
  showStats() { this.showSubPage('stats'); }
  showWriting() { this.showSubPage('writing'); }
  showSentences() { this.showSubPage('sentences'); }
  showSettings() { this.showSubPage('settings'); }
  showSongs() { this.showSubPage('songs'); }
}

const app = new BurmeseStudyApp();
app.init().catch(err => {
  console.error('App init failed:', err);
  document.getElementById('app').innerHTML = `
    <div style="padding:40px 20px;text-align:center;">
      <div style="font-size:24px;margin-bottom:12px;">⚠️</div>
      <div style="font-size:16px;color:#EAEEF3;margin-bottom:8px;">Failed to start</div>
      <div style="font-size:13px;color:#5A7A88;">${err.message}</div>
    </div>`;
});

// Offline: a scope-relative worker works at / and under GitHub Pages /<repo>/.
registerAppWorker().catch(() => {});
