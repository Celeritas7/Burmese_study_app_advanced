// ═══ MORE TAB ═══
import { db } from './supabase.js';
import { Modal } from './modal.js';

const ITEMS = [
  { action: 'course', section: 'paths', icon: '🗺', label: 'Course', desc: 'Guided units and learning path', color: '#FFC800' },
  { action: 'groups', section: 'paths', icon: '🏷️', label: 'Groups', desc: 'Explore anchor word trees', color: '#58CC02' },
  { action: 'songs', section: 'paths', icon: '🎵', label: 'Songs & Chants', desc: 'Music, Metta chants · vocabulary practice', color: '#FF6B8A', badge: 'NEW' },
  { action: 'dialogues', section: 'paths', icon: '💬', label: 'Dialogues', desc: 'Colloquial Burmese book', color: '#CE82FF' },
  { action: 'writing', section: 'paths', icon: '✍', label: 'Writing Practice', desc: 'Consonant & word canvas', color: '#FF9600' },
  { action: 'sentences', section: 'paths', icon: '📝', label: 'Sentences', desc: 'Full sentence practice', color: '#1CB0F6' },
  { action: 'stats', section: 'tools', icon: '📊', label: 'Stats & Progress', desc: 'Learning analytics', color: '#1CB0F6' },
  { action: 'settings', section: 'tools', icon: '⚙️', label: 'Settings', desc: 'Account, voice & preferences', color: '#5A7A88' },
  { action: 'audit', section: 'tools', icon: '🔍', label: 'Devanagari Audit', desc: 'Review transliteration', color: '#FFC800' },
  { action: 'supabase', section: 'tools', icon: '🔌', label: 'Supabase', desc: 'Connection settings', color: '#58CC02' }
];

export class MoreTab {
  constructor(app) {
    this.app = app;
  }

  render(container) {
    const renderSection = section => ITEMS.filter(item => item.section === section).map(item => {
      const color = item.action === 'supabase' && !db.connected ? '#FF4B4B' : item.color;
      const desc = item.action === 'supabase' ? (db.connected ? 'Connected ✓' : 'Not connected') : item.desc;
      return `
        <button class="more-item" data-item="${item.action}">
          <div class="more-icon" style="background:${color}18; border-color:${color}30;">${item.icon}</div>
          <div class="flex-1">
            <div class="more-label">
              ${item.label}
              ${item.badge ? `<span class="more-badge" style="background:var(--pink); color:#fff;">${item.badge}</span>` : ''}
            </div>
            <div class="more-desc">${desc}</div>
          </div>
          <span class="more-arrow" aria-hidden="true">›</span>
        </button>`;
    }).join('');

    container.innerHTML = `
      <div class="pad">
        <div class="mb-20" style="font-size:22px; font-weight:800;">More</div>
        <h2 class="more-section-label">Learn & explore</h2>
        ${renderSection('paths')}
        <h2 class="more-section-label">Tools & account</h2>
        ${renderSection('tools')}
      </div>
    `;

    // Item click handlers
    container.querySelectorAll('[data-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        switch (btn.dataset.item) {
          case 'course': this.app.showCourse(); break;
          case 'groups': this.app.showHubExplorer(); break;
          case 'songs': this.app.showSongs(); break;
          case 'dialogues': this.app.showDialogues(); break;
          case 'writing': this.app.showWriting(); break;
          case 'sentences': this.app.showSentences(); break;
          case 'stats': this.app.showStats(); break;
          case 'settings': this.app.showSettings(); break;
          case 'audit': window.open('audit.html', '_blank'); break;
          case 'supabase': this.showSupabaseModal(); break;
        }
      });
    });
  }

  showSupabaseModal() {
    const box = Modal.show(`
      <div class="modal-header">
        <div class="modal-title" style="color:${db.connected ? 'var(--green)' : 'var(--pink)'};">
          🔌 Supabase Connection
        </div>
        <button class="modal-close" data-modal-close>✕</button>
      </div>
      <div style="margin-bottom:14px;">
        <div style="font-size:13px; color:var(--text-muted); margin-bottom:4px;">Status</div>
        <div style="font-size:15px; font-weight:700; color:${db.connected ? 'var(--green)' : 'var(--pink)'};">
          ${db.connected ? '✓ Connected' : '✕ Not connected'}
        </div>
      </div>
      <div style="margin-bottom:8px;">
        <div style="font-size:13px; color:var(--text-muted); margin-bottom:4px;">URL</div>
        <div style="font-size:12px; color:var(--text); word-break:break-all;">${db.url}</div>
      </div>
      <div class="input-label">Anon Key</div>
      <input class="input-field mb-12" type="password" placeholder="Paste your anon key..." id="sb-key-input" value="${db.key}">
      <button class="btn-primary" id="sb-connect-btn" style="background:var(--green);">Test & Save Connection</button>
      <div id="sb-status" style="text-align:center; margin-top:10px; font-size:13px;"></div>
    `, { borderColor: db.connected ? 'var(--green)' : 'var(--pink)' });

    if (box) {
      box.querySelector('#sb-connect-btn').addEventListener('click', async () => {
        const key = box.querySelector('#sb-key-input').value.trim();
        const status = box.querySelector('#sb-status');
        if (!key) {
          status.style.color = 'var(--pink)';
          status.textContent = 'Please enter a key';
          return;
        }
        status.style.color = 'var(--yellow)';
        status.textContent = 'Testing connection...';

        db.setKey(key);
        const ok = await db.testConnection();
        if (ok) {
          status.style.color = 'var(--green)';
          status.textContent = '✓ Connected successfully!';
          setTimeout(() => {
            Modal.close();
            this.render(this.app.contentEl);
          }, 1000);
        } else {
          status.style.color = 'var(--pink)';
          status.textContent = '✕ Connection failed. Check your key.';
        }
      });
    }
  }
}
