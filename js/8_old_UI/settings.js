// ═══ SETTINGS PAGE ═══
import { db } from './supabase.js';

const STORAGE_KEY = 'burmese_app_settings';

const DEFAULTS = {
  fontSize: 'normal',     // small | normal | large
  showDevanagari: true,
  showRomanization: false,
  autoReveal: false,       // auto-reveal after delay
  sessionSize: 10,
  theme: 'dark'            // dark only for now
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

export function saveSetting(key, value) {
  const s = getSettings();
  s[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export class SettingsPage {
  constructor(app) {
    this.app = app;
    this.exportStatus = '';
    this.importStatus = '';
  }

  async render(container) {
    const s = getSettings();

    container.innerHTML = `
      <div class="pad-sm">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <button id="set-back" style="background:var(--surface);border:2px solid var(--border);border-radius:10px;
            color:var(--text-muted);cursor:pointer;font-size:12px;padding:6px 12px;font-weight:700;font-family:var(--font);">← Back</button>
          <div style="flex:1;">
            <div style="font-size:20px;font-weight:800;">⚙️ Settings</div>
            <div style="font-size:12px;color:var(--text-muted);">Preferences & data</div>
          </div>
        </div>

        <!-- Display Settings -->
        <div style="font-size:10px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Display</div>
        <div style="background:var(--surface);border-radius:16px;border:2px solid var(--border);padding:4px 0;margin-bottom:16px;">

          <!-- Font Size -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);">
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--text);">Burmese Font Size</div>
              <div style="font-size:11px;color:var(--text-muted);">Adjust word card text size</div>
            </div>
            <div style="display:flex;gap:4px;">
              ${['small', 'normal', 'large'].map(v => `
                <button class="set-opt" data-key="fontSize" data-val="${v}" style="
                  padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);
                  background:${s.fontSize === v ? 'var(--blue)' : 'var(--bg)'};
                  border:2px solid ${s.fontSize === v ? 'var(--blue)' : 'var(--border)'};
                  color:${s.fontSize === v ? '#fff' : 'var(--text-muted)'};
                ">${v[0].toUpperCase() + v.slice(1)}</button>
              `).join('')}
            </div>
          </div>

          <!-- Show Devanagari -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);">
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--text);">Show Devanagari</div>
              <div style="font-size:11px;color:var(--text-muted);">Display transliteration</div>
            </div>
            <button class="set-toggle" data-key="showDevanagari" style="
              width:48px;height:28px;border-radius:14px;border:none;cursor:pointer;position:relative;transition:all 0.2s;
              background:${s.showDevanagari ? 'var(--green)' : 'var(--border)'};
            ">
              <div style="width:22px;height:22px;border-radius:11px;background:#fff;position:absolute;top:3px;
                transition:all 0.2s;${s.showDevanagari ? 'left:23px;' : 'left:3px;'}"></div>
            </button>
          </div>

          <!-- Show Romanization -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;">
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--text);">Show Romanization</div>
              <div style="font-size:11px;color:var(--text-muted);">Show English pronunciation</div>
            </div>
            <button class="set-toggle" data-key="showRomanization" style="
              width:48px;height:28px;border-radius:14px;border:none;cursor:pointer;position:relative;transition:all 0.2s;
              background:${s.showRomanization ? 'var(--green)' : 'var(--border)'};
            ">
              <div style="width:22px;height:22px;border-radius:11px;background:#fff;position:absolute;top:3px;
                transition:all 0.2s;${s.showRomanization ? 'left:23px;' : 'left:3px;'}"></div>
            </button>
          </div>
        </div>

        <!-- Data Management -->
        <div style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Data</div>
        <div style="background:var(--surface);border-radius:16px;border:2px solid var(--border);padding:4px 0;margin-bottom:16px;">

          <!-- Export -->
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--text);">Export Progress</div>
                <div style="font-size:11px;color:var(--text-muted);">Download your learning data as JSON</div>
              </div>
              <button id="btn-export" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;
                background:var(--green);border:none;color:var(--bg);font-family:var(--font);">Export</button>
            </div>
            <div id="export-status" style="font-size:11px;color:var(--text-muted);"></div>
          </div>

          <!-- Import -->
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--text);">Import Progress</div>
                <div style="font-size:11px;color:var(--text-muted);">Restore from a JSON backup</div>
              </div>
              <label style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;
                background:var(--blue);border:none;color:var(--bg);font-family:var(--font);">
                Import
                <input type="file" id="file-import" accept=".json" style="display:none;">
              </label>
            </div>
            <div id="import-status" style="font-size:11px;color:var(--text-muted);"></div>
          </div>

          <!-- Reset -->
          <div style="padding:12px 16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--pink);">Reset All Progress</div>
                <div style="font-size:11px;color:var(--text-muted);">Clear ratings, SRS state, and events</div>
              </div>
              <button id="btn-reset" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;
                background:rgba(255,107,138,0.1);border:2px solid rgba(255,107,138,0.25);color:var(--pink);font-family:var(--font);">Reset</button>
            </div>
          </div>
        </div>

        <!-- Offline -->
        <div style="font-size:10px;font-weight:700;color:var(--purple);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Offline</div>
        <div style="background:var(--surface);border-radius:16px;border:2px solid var(--border);padding:4px 0;margin-bottom:16px;">
          <div style="padding:12px 16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--text);">Cache for Offline</div>
                <div style="font-size:11px;color:var(--text-muted);" id="sw-status">Checking...</div>
              </div>
              <button id="btn-cache" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;
                background:var(--purple);border:none;color:#fff;font-family:var(--font);">Cache Now</button>
            </div>
          </div>
        </div>

        <!-- App Info -->
        <div style="text-align:center;padding:16px;color:var(--text-dim);font-size:11px;">
          Burmese Study App · v1.0<br>
          Supabase: ${db.connected ? '✓ Connected' : '✕ Not connected'}
        </div>
      </div>
    `;

    // Check SW status
    this.checkServiceWorker(container);

    // Back
    container.querySelector('#set-back').addEventListener('click', () => {
      this.app.tabs.more.render(this.app.contentEl);
    });

    // Option buttons (font size)
    container.querySelectorAll('.set-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        saveSetting(btn.dataset.key, btn.dataset.val);
        this.render(container);
      });
    });

    // Toggle buttons
    container.querySelectorAll('.set-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const current = getSettings()[key];
        saveSetting(key, !current);
        this.render(container);
      });
    });

    // Export
    container.querySelector('#btn-export').addEventListener('click', async () => {
      const status = container.querySelector('#export-status');
      status.style.color = 'var(--yellow)';
      status.textContent = 'Exporting...';
      try {
        const [userState, events] = await Promise.all([
          db.getUserState(),
          db.query('burmese_app_progress_events', { order: 'created_at.desc', limit: 5000 })
        ]);

        const data = {
          exportDate: new Date().toISOString(),
          app: 'burmese_study',
          version: 1,
          settings: getSettings(),
          userState,
          progressEvents: events
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `burmese_progress_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        status.style.color = 'var(--green)';
        status.textContent = `✓ Exported ${userState.length} states + ${events.length} events`;
      } catch (e) {
        status.style.color = 'var(--pink)';
        status.textContent = `✕ Error: ${e.message}`;
      }
    });

    // Import
    container.querySelector('#file-import').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const status = container.querySelector('#import-status');
      status.style.color = 'var(--yellow)';
      status.textContent = 'Reading file...';

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.app || data.app !== 'burmese_study') {
          throw new Error('Not a valid Burmese Study export file');
        }

        let imported = 0;

        // Import settings
        if (data.settings) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.settings));
        }

        // Import user states
        if (data.userState && data.userState.length > 0) {
          for (const s of data.userState) {
            try {
              await db.insert('burmese_app_user_state', {
                word_id: s.word_id,
                word_type: s.word_type || 'word',
                correct_count: s.correct_count || 0,
                incorrect_count: s.incorrect_count || 0,
                streak: s.streak || 0,
                mastery_level: s.mastery_level || 0,
                next_review_at: s.next_review_at,
                last_practiced_at: s.last_practiced_at
              });
              imported++;
            } catch { /* skip duplicates */ }
          }
        }

        status.style.color = 'var(--green)';
        status.textContent = `✓ Imported ${imported} states + settings restored`;
        setTimeout(() => this.render(container), 1500);
      } catch (e) {
        status.style.color = 'var(--pink)';
        status.textContent = `✕ Error: ${e.message}`;
      }
    });

    // Reset
    container.querySelector('#btn-reset').addEventListener('click', async () => {
      const confirmed = confirm('This will delete ALL your ratings, SRS progress, and study events. Are you sure?');
      if (!confirmed) return;

      try {
        // Delete all user_state and progress_events
        const res1 = await fetch(`${db.url}/rest/v1/burmese_app_user_state?id=gt.0`, {
          method: 'DELETE', headers: db.headers
        });
        const res2 = await fetch(`${db.url}/rest/v1/burmese_app_progress_events?id=gt.0`, {
          method: 'DELETE', headers: db.headers
        });

        alert('Progress reset complete.');
        this.render(container);
      } catch (e) {
        alert(`Reset error: ${e.message}`);
      }
    });

    // Cache button
    container.querySelector('#btn-cache').addEventListener('click', async () => {
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          const swStatus = container.querySelector('#sw-status');
          swStatus.textContent = '✓ Service worker registered — caching...';
          swStatus.style.color = 'var(--green)';
        } catch (e) {
          const swStatus = container.querySelector('#sw-status');
          swStatus.textContent = `✕ ${e.message}`;
          swStatus.style.color = 'var(--pink)';
        }
      }
    });
  }

  checkServiceWorker(container) {
    const swStatus = container.querySelector('#sw-status');
    if (!('serviceWorker' in navigator)) {
      swStatus.textContent = 'Not supported in this browser';
      swStatus.style.color = 'var(--text-dim)';
      return;
    }
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) {
        swStatus.textContent = '✓ Cached for offline use';
        swStatus.style.color = 'var(--green)';
      } else {
        swStatus.textContent = 'Not cached yet';
        swStatus.style.color = 'var(--text-muted)';
      }
    });
  }
}
