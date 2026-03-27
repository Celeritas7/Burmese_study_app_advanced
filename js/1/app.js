// ═══ BURMESE STUDY APP ═══
// Main application class — single-page architecture
// Mirrors JLPTStudyApp pattern from Japanese app

import { db } from './supabase.js';
import { StudyTab } from './tabs/study.js';
import { SRSTab } from './tabs/srs.js';
import { MoreTab } from './tabs/more.js';

class BurmeseStudyApp {
  constructor() {
    this.activeTab = 'study';
    this.tabs = {};
    this.contentEl = null;
  }

  async init() {
    // Render shell
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

    // Initialize tabs
    this.tabs.study = new StudyTab(this);
    this.tabs.srs = new SRSTab(this);
    this.tabs.more = new MoreTab(this);

    // Tab bar events
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Try connecting to Supabase
    await db.testConnection();

    // Initialize study tab data
    await this.tabs.study.init();

    // Render initial tab
    this.renderTab();
  }

  switchTab(tabId) {
    if (tabId === this.activeTab && tabId === 'study') {
      // If already on study tab, go back to setup
      this.tabs.study.phase = 'setup';
    }
    this.activeTab = tabId;

    // Update tab bar
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    this.renderTab();
  }

  renderTab() {
    const tab = this.tabs[this.activeTab];
    if (tab) {
      tab.render(this.contentEl);
    }
  }
}

// ─── BOOT ───
const app = new BurmeseStudyApp();
app.init().catch(err => {
  console.error('App init failed:', err);
  document.getElementById('app').innerHTML = `
    <div style="padding:40px 20px; text-align:center;">
      <div style="font-size:24px; margin-bottom:12px;">⚠️</div>
      <div style="font-size:16px; color:#EAEEF3; margin-bottom:8px;">Failed to start</div>
      <div style="font-size:13px; color:#5A7A88;">${err.message}</div>
    </div>
  `;
});
