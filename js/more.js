// ═══ MORE TAB ═══
import { db } from './supabase.js';
import { Modal } from './modal.js';

const ITEMS = [
  { icon: '📊', label: 'Stats & Progress', desc: 'Learning analytics', color: '#1CB0F6' },
  { icon: '💬', label: 'Dialogues', desc: 'Colloquial Burmese book', color: '#CE82FF', badge: 'NEW' },
  { icon: '✍', label: 'Writing Practice', desc: 'Consonant & word canvas', color: '#FF9600' },
  { icon: '🌿', label: 'Hub Explorer', desc: 'Anchor word trees', color: '#58CC02' },
  { icon: '📝', label: 'Sentences', desc: 'Full sentence practice', color: '#1CB0F6' },
  { icon: '🔌', label: 'Supabase', desc: db.connected ? 'Connected' : 'Not connected', color: db.connected ? '#58CC02' : '#FF4B4B' },
  { icon: '⚙️', label: 'Settings', desc: 'Theme & preferences', color: '#5A7A88' }
];

export class MoreTab {
  constructor(app) {
    this.app = app;
  }

  render(container) {
    // Update connection status
    ITEMS[5].desc = db.connected ? 'Connected ✓' : 'Not connected';
    ITEMS[5].color = db.connected ? '#58CC02' : '#FF4B4B';

    container.innerHTML = `
      <div class="pad">
        <div class="mb-20" style="font-size:22px; font-weight:800;">More</div>
        ${ITEMS.map((item, i) => `
          <button class="more-item" data-item="${i}">
            <div class="more-icon" style="background:${item.color}18; border-color:${item.color}30;">${item.icon}</div>
            <div class="flex-1">
              <div class="more-label">
                ${item.label}
                ${item.badge ? `<span class="more-badge" style="background:var(--pink); color:#fff;">${item.badge}</span>` : ''}
              </div>
              <div class="more-desc">${item.desc}</div>
            </div>
            <span class="more-arrow">›</span>
          </button>
        `).join('')}
      </div>
    `;

    // Item click handlers
    container.querySelectorAll('[data-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.item);
        if (idx === 0) {
          // Stats & Progress
          this.app.showStats();
        } else if (idx === 1) {
          // Dialogues
          this.app.showDialogues();
        } else if (idx === 2) {
          // Writing Practice
          this.app.showWriting();
        } else if (idx === 3) {
          // Hub Explorer
          this.app.showHubExplorer();
        } else if (idx === 4) {
          // Sentences
          this.app.showSentences();
        } else if (idx === 5) {
          this.showSupabaseModal();
        } else if (idx === 6) {
          this.app.showSettings();
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
