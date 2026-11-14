// ═══ SETTINGS PAGE ═══
import { db } from './supabase.js';
import { createDeviceBackup } from './data-backup.js';
import { renderAccountMarkup } from './account-ui.js';

const STORAGE_KEY = 'burmese_app_settings';

const DEFAULTS = {
  fontSize: 'normal',     // small | normal | large
  showDevanagari: true,
  showRomanization: false,
  autoReveal: false,       // auto-reveal after delay
  sessionSize: 10,
  theme: 'dark',           // dark only for now
  voice: 'm',              // m = ♂ ကျွန်တော် (Thiha), f = ♀ ကျွန်မ (Nilar) — used by every 🔊 in the app
  showPlayful: false,      // "Just for fun 😏" pack on Speak home
  autoPlay: false          // Phase 12: say the word when a Study / Review card is revealed
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
    this.accountContainer = null;
    this.accountPending = false;
    this.accountError = '';
    this.app.songReviewSync?.subscribe(() => this.refreshAccountPanel());
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

        <!-- Account: sign-in and sync controls belong in Settings, not the Review queue. -->
        <div style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Account</div>
        <section class="settings-account-card" id="settings-account-panel" aria-label="Account and song review sync"></section>

        <!-- Voice (Phase 8) -->
        <div style="font-size:10px;font-weight:700;color:var(--yellow);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Voice</div>
        <div style="background:var(--surface);border-radius:16px;border:2px solid var(--border);padding:4px 0;margin-bottom:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;">
            <div style="min-width:0;">
              <div style="font-size:14px;font-weight:600;color:var(--text);">Your voice</div>
              <div style="font-size:11px;color:var(--text-muted);">Who you hear on 🔊 and your word for “I”</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;">
              ${[['m', '♂ ကျွန်တော်'], ['f', '♀ ကျွန်မ']].map(([v, label]) => `
                <button class="set-opt" data-key="voice" data-val="${v}" style="
                  padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);
                  background:${s.voice === v ? 'var(--blue)' : 'var(--bg)'};
                  border:2px solid ${s.voice === v ? 'var(--blue)' : 'var(--border)'};
                  color:${s.voice === v ? '#fff' : 'var(--text-muted)'};
                ">${label}</button>
              `).join('')}
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-top:1px solid var(--border);">
            <div style="min-width:0;">
              <div style="font-size:14px;font-weight:600;color:var(--text);">Play sound on reveal</div>
              <div style="font-size:11px;color:var(--text-muted);">Study & Review say the word when you reveal the card</div>
            </div>
            <button class="set-toggle" data-key="autoPlay" style="
              width:48px;height:28px;border-radius:14px;border:none;cursor:pointer;position:relative;transition:all 0.2s;flex-shrink:0;
              background:${s.autoPlay ? 'var(--green)' : 'var(--border)'};
            ">
              <div style="width:22px;height:22px;border-radius:11px;background:#fff;position:absolute;top:3px;
                transition:all 0.2s;${s.autoPlay ? 'left:23px;' : 'left:3px;'}"></div>
            </button>
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

          <!-- Show playful pack (Phase 11) -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);">
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--text);">Show playful pack 😏</div>
              <div style="font-size:11px;color:var(--text-muted);">Teasing & flirting lines for friends. Off hides it from Speak.</div>
            </div>
            <button class="set-toggle" data-key="showPlayful" style="
              width:48px;height:28px;border-radius:14px;border:none;cursor:pointer;position:relative;transition:all 0.2s;
              background:${s.showPlayful ? 'var(--green)' : 'var(--border)'};
            ">
              <div style="width:22px;height:22px;border-radius:11px;background:#fff;position:absolute;top:3px;
                transition:all 0.2s;${s.showPlayful ? 'left:23px;' : 'left:3px;'}"></div>
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

          <!-- Export: local-only until regular Study/SRS rows are account owned. -->
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
              <div style="min-width:0;">
                <div style="font-size:14px;font-weight:600;color:var(--text);">Back up device data</div>
                <div style="font-size:11px;color:var(--text-muted);">Download settings, Speak and Course progress, dialogue voices, saved songs, and this device's song reviews as JSON.</div>
              </div>
              <button id="btn-export" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;
                background:var(--green);border:none;color:var(--bg);font-family:var(--font);flex-shrink:0;">Download</button>
            </div>
            <div style="font-size:11px;color:var(--yellow);line-height:1.5;margin-bottom:6px;">Partial backup only. Does not include regular Study/SRS progress, server events, cloud-only reviews, or offline media. Store the JSON privately. Restore is not yet available.</div>
            <div id="export-status" style="font-size:11px;color:var(--text-muted);"></div>
          </div>

          <!-- Import: disable shared-table writes until account-safe restoration exists. -->
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="min-width:0;">
                <div style="font-size:14px;font-weight:600;color:var(--text);">Restore backup</div>
                <div id="import-help" style="font-size:11px;color:var(--text-muted);">Temporarily unavailable: the old importer could write to shared Study/SRS data. Your existing data is untouched.</div>
              </div>
              <button type="button" disabled aria-describedby="import-help" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;
                background:var(--border);border:none;color:var(--text-muted);font-family:var(--font);flex-shrink:0;opacity:.65;">Paused</button>
            </div>
          </div>

          <!-- Reset: never delete shared tables without an account ownership check. -->
          <div style="padding:12px 16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="min-width:0;">
                <div style="font-size:14px;font-weight:600;color:var(--pink);">Reset All Progress</div>
                <div id="reset-help" style="font-size:11px;color:var(--text-muted);">Temporarily unavailable until progress can be deleted for your account only.</div>
              </div>
              <button type="button" disabled aria-describedby="reset-help" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;
                background:var(--border);border:2px solid var(--border);color:var(--text-muted);font-family:var(--font);flex-shrink:0;opacity:.65;">Paused</button>
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
          <div style="padding:12px 16px;border-top:1px solid var(--border);">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="min-width:0;">
                <div style="font-size:14px;font-weight:600;color:var(--text);">Audio for offline</div>
                <div style="font-size:11px;color:var(--text-muted);" id="audio-status">Clips are saved the first time you play them</div>
              </div>
              <button id="btn-audio-dl" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;
                background:var(--purple);border:none;color:#fff;font-family:var(--font);">Download all</button>
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

    this.accountContainer = container;
    this.refreshAccountPanel();

    // Check SW status
    this.checkServiceWorker(container);

    // Audio for offline (Phase 12): N of M saved + Download all
    import('./app-audio.js?v=1').then(A => {
      const st = container.querySelector('#audio-status'), btn = container.querySelector('#btn-audio-dl');
      if (!st || !btn) return;
      if (!('caches' in window)) { st.textContent = 'Not supported in this browser'; btn.disabled = true; btn.style.opacity = '.5'; return; }
      const show = async () => {
        const { saved, total } = await A.savedCount();
        if (!total) return;
        st.style.color = 'var(--text-muted)';
        st.textContent = `${saved.toLocaleString()} of ${total.toLocaleString()} clips saved on this device`;
        if (saved >= total) { btn.textContent = '✓ All saved'; btn.disabled = true; btn.style.opacity = '.6'; }
      };
      show();
      btn.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = 'Downloading…';
        const r = await A.downloadAll((n, t) => { st.style.color = 'var(--yellow)'; st.textContent = `Downloading ${n.toLocaleString()} / ${t.toLocaleString()}…`; });
        if (r.failed) {
          st.style.color = 'var(--pink)'; st.textContent = `${r.failed} clips failed. Check your connection and try again.`;
          btn.disabled = false; btn.textContent = 'Retry';
        } else { btn.textContent = 'Download all'; show(); }
      });
    }).catch(() => {});

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

    // Export device-local data only. Legacy Study/SRS tables have no user-scoped backup path.
    container.querySelector('#btn-export').addEventListener('click', async () => {
      const status = container.querySelector('#export-status');
      status.style.color = 'var(--yellow)';
      status.textContent = 'Preparing device backup...';
      try {
        const data = createDeviceBackup(localStorage);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `burmese_device_backup_${data.exportDate.split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        status.style.color = 'var(--green)';
        status.textContent = '✓ Device backup downloaded (partial; restore unavailable).';
      } catch (e) {
        status.style.color = 'var(--pink)';
        status.textContent = `✕ Error: ${e.message}`;
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

  refreshAccountPanel() {
    const panel = this.accountContainer?.querySelector('#settings-account-panel');
    if (!panel) return; // Settings is no longer the visible page.
    const sync = this.app.songReviewSync;
    if (!sync) {
      panel.textContent = 'Account sync is unavailable. You can still study offline.';
      return;
    }
    panel.innerHTML = renderAccountMarkup(sync.getState(), {
      pending: this.accountPending, error: this.accountError
    });
    panel.querySelectorAll('[data-account-action]').forEach(button => {
      button.addEventListener('click', () => this.performAccountAction(button.dataset.accountAction));
    });
  }

  async performAccountAction(action) {
    if (this.accountPending) return;
    const sync = this.app.songReviewSync;
    if (!sync) return;
    this.accountPending = true;
    this.accountError = '';
    this.refreshAccountPanel();
    try {
      if (action === 'google') await sync.signInGoogle();
      else if (action === 'sync' && sync.getState().signedIn) await sync.sync();
      else if (action === 'out' && sync.getState().signedIn) await sync.signOut();
    } catch (error) {
      this.accountError = `Account action failed: ${error.message}`;
    } finally {
      this.accountPending = false;
      this.refreshAccountPanel();
    }
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
