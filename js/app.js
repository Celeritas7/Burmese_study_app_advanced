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

class BurmeseStudyApp {
  constructor() {
    this.activeTab = 'study';
    this.tabs = {};
    this.contentEl = null;
  }

  async init() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="tab-content" id="tab-content"></div>
      <div class="tab-bar" id="tab-bar">
        <button class="tab-btn active" data-tab="study">
          <span class="tab-icon">📖</span>
          <span class="tab-label">Study</span>
        </button>
        <button class="tab-btn" data-tab="srs">
          <span class="tab-icon">🔄</span>
          <span class="tab-label">SRS</span>
        </button>
        <button class="tab-btn" data-tab="more">
          <span class="tab-icon">☰</span>
          <span class="tab-label">More</span>
        </button>
      </div>
    `;
    this.contentEl = document.getElementById('tab-content');
    this.tabs.study = new StudyTab(this);
    this.tabs.srs = new SRSTab(this);
    this.tabs.more = new MoreTab(this);
    this.tabs.dialogues = new DialoguesTab(this);
    this.tabs.hubExplorer = new HubExplorer(this);
    this.tabs.stats = new StatsPage(this);
    this.tabs.writing = new WritingPractice(this);
    this.tabs.sentences = new SentencesPage(this);
    this.tabs.settings = new SettingsPage(this);

    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
    await db.testConnection();
    await this.tabs.study.init();
    this.renderTab();
  }

  switchTab(tabId) {
    if (tabId === this.activeTab && tabId === 'study') this.tabs.study.phase = 'setup';
    this.activeTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    this.renderTab();
  }

  renderTab() { const tab = this.tabs[this.activeTab]; if (tab) tab.render(this.contentEl); }

  showSubPage(name) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    this.tabs[name].render(this.contentEl);
  }

  showDialogues() { this.showSubPage('dialogues'); }
  showHubExplorer() { this.showSubPage('hubExplorer'); }
  showStats() { this.showSubPage('stats'); }
  showWriting() { this.showSubPage('writing'); }
  showSentences() { this.showSubPage('sentences'); }
  showSettings() { this.showSubPage('settings'); }
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
