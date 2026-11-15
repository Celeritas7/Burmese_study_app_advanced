// ═══ SETTINGS PAGE ═══
import { db } from './supabase.js';
import { createDeviceBackup } from './data-backup.js';
import { renderAccountMarkup } from './account-ui.js';
import { checkAppOffline, downloadAppOffline } from './offline.js';

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
    this.offlineDownloading = false;
    // Keep the user's open sections through preference re-renders in this session.
    this.expandedSections = new Set(['learning']);
    this.app.songReviewSync?.subscribe(() => this.refreshAccountPanel());
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        const current = this.accountContainer;
        if (current?.isConnected && !this.offlineDownloading) this.checkServiceWorker(current);
      });
    }
  }

  async render(container) {
    const s = getSettings();

    container.innerHTML = `
      <div class="pad-sm settings-page">
        <!-- Header -->
        <div class="settings-page-header">
          <button id="set-back" style="background:var(--surface);border:2px solid var(--border);border-radius:10px;
            color:var(--text-muted);cursor:pointer;font-size:12px;padding:8px 12px;font-weight:700;font-family:var(--font);">← Back</button>
          <div class="settings-page-heading">
            <h1>⚙️ Settings</h1>
            <p>Account, learning & device data</p>
          </div>
        </div>

        <!-- Account: sign-in and sync controls belong in Settings, not the Review queue. -->
        <h2 class="settings-account-label">Account</h2>
        <section class="settings-account-card" id="settings-account-panel" aria-label="Account and song review sync"></section>

        <div class="settings-fold-list">
        <!-- Voice (Phase 8) -->
        <details class="settings-fold" data-settings-section="learning" ${this.expandedSections.has('learning') ? 'open' : ''}>
          <summary class="settings-fold-summary">
            <span class="settings-fold-icon" aria-hidden="true">🔊</span>
            <span class="settings-fold-title"><strong>Learning & audio</strong><small>Voice and playback options</small></span>
            <span class="settings-fold-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div class="settings-fold-content">
          <div class="settings-group-card">
          <div class="settings-row settings-row-choices">
            <div class="settings-row-text">
              <div style="font-size:14px;font-weight:600;color:var(--text);">Your voice</div>
              <div style="font-size:11px;color:var(--text-muted);">Who you hear on 🔊 and your word for “I”</div>
            </div>
            <div class="settings-choice-group">
              ${[['m', '♂ ကျွန်တော်'], ['f', '♀ ကျွန်မ']].map(([v, label]) => `
                <button class="set-opt" data-key="voice" data-val="${v}" aria-pressed="${s.voice === v}" style="
                  padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);
                  background:${s.voice === v ? 'var(--blue)' : 'var(--bg)'};
                  border:2px solid ${s.voice === v ? 'var(--blue)' : 'var(--border)'};
                  color:${s.voice === v ? '#fff' : 'var(--text-muted)'};
                ">${label}</button>
              `).join('')}
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-text">
              <div style="font-size:14px;font-weight:600;color:var(--text);">Play sound on reveal</div>
              <div style="font-size:11px;color:var(--text-muted);">Study & Review say the word when you reveal the card</div>
            </div>
            <button class="set-toggle" data-key="autoPlay" role="switch" aria-label="Play sound on reveal" aria-checked="${s.autoPlay}" style="
              width:48px;height:28px;border-radius:14px;border:none;cursor:pointer;position:relative;transition:all 0.2s;flex-shrink:0;
              background:${s.autoPlay ? 'var(--green)' : 'var(--border)'};
            ">
              <div style="width:22px;height:22px;border-radius:11px;background:#fff;position:absolute;top:3px;
                transition:all 0.2s;${s.autoPlay ? 'left:23px;' : 'left:3px;'}"></div>
            </button>
          </div>
          </div>
          </div>
        </details>

        <!-- Display Settings -->
        <details class="settings-fold" data-settings-section="display" ${this.expandedSections.has('display') ? 'open' : ''}>
          <summary class="settings-fold-summary">
            <span class="settings-fold-icon" aria-hidden="true">🔤</span>
            <span class="settings-fold-title"><strong>Display</strong><small>Text size and pronunciation guides</small></span>
            <span class="settings-fold-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div class="settings-fold-content">
          <div class="settings-group-card">

          <!-- Font Size -->
          <div class="settings-row settings-row-choices">
            <div class="settings-row-text">
              <div style="font-size:14px;font-weight:600;color:var(--text);">Burmese Font Size</div>
              <div style="font-size:11px;color:var(--text-muted);">Adjust word card text size</div>
            </div>
            <div class="settings-choice-group">
              ${['small', 'normal', 'large'].map(v => `
                <button class="set-opt" data-key="fontSize" data-val="${v}" aria-pressed="${s.fontSize === v}" style="
                  padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);
                  background:${s.fontSize === v ? 'var(--blue)' : 'var(--bg)'};
                  border:2px solid ${s.fontSize === v ? 'var(--blue)' : 'var(--border)'};
                  color:${s.fontSize === v ? '#fff' : 'var(--text-muted)'};
                ">${v[0].toUpperCase() + v.slice(1)}</button>
              `).join('')}
            </div>
          </div>

          <!-- Show Devanagari -->
          <div class="settings-row">
            <div class="settings-row-text">
              <div style="font-size:14px;font-weight:600;color:var(--text);">Show Devanagari</div>
              <div style="font-size:11px;color:var(--text-muted);">Display transliteration</div>
            </div>
            <button class="set-toggle" data-key="showDevanagari" role="switch" aria-label="Show Devanagari" aria-checked="${s.showDevanagari}" style="
              width:48px;height:28px;border-radius:14px;border:none;cursor:pointer;position:relative;transition:all 0.2s;flex-shrink:0;
              background:${s.showDevanagari ? 'var(--green)' : 'var(--border)'};
            ">
              <div style="width:22px;height:22px;border-radius:11px;background:#fff;position:absolute;top:3px;
                transition:all 0.2s;${s.showDevanagari ? 'left:23px;' : 'left:3px;'}"></div>
            </button>
          </div>

          <!-- Show playful pack (Phase 11) -->
          <div class="settings-row">
            <div class="settings-row-text">
              <div style="font-size:14px;font-weight:600;color:var(--text);">Show playful pack 😏</div>
              <div style="font-size:11px;color:var(--text-muted);">Teasing & flirting lines for friends. Off hides it from Speak.</div>
            </div>
            <button class="set-toggle" data-key="showPlayful" role="switch" aria-label="Show playful pack" aria-checked="${s.showPlayful}" style="
              width:48px;height:28px;border-radius:14px;border:none;cursor:pointer;position:relative;transition:all 0.2s;flex-shrink:0;
              background:${s.showPlayful ? 'var(--green)' : 'var(--border)'};
            ">
              <div style="width:22px;height:22px;border-radius:11px;background:#fff;position:absolute;top:3px;
                transition:all 0.2s;${s.showPlayful ? 'left:23px;' : 'left:3px;'}"></div>
            </button>
          </div>

          <!-- Show Romanization -->
          <div class="settings-row">
            <div class="settings-row-text">
              <div style="font-size:14px;font-weight:600;color:var(--text);">Show Romanization</div>
              <div style="font-size:11px;color:var(--text-muted);">Show English pronunciation</div>
            </div>
            <button class="set-toggle" data-key="showRomanization" role="switch" aria-label="Show Romanization" aria-checked="${s.showRomanization}" style="
              width:48px;height:28px;border-radius:14px;border:none;cursor:pointer;position:relative;transition:all 0.2s;flex-shrink:0;
              background:${s.showRomanization ? 'var(--green)' : 'var(--border)'};
            ">
              <div style="width:22px;height:22px;border-radius:11px;background:#fff;position:absolute;top:3px;
                transition:all 0.2s;${s.showRomanization ? 'left:23px;' : 'left:3px;'}"></div>
            </button>
          </div>
          </div>
          </div>
        </details>

        <!-- Data Management -->
        <details class="settings-fold" data-settings-section="data" ${this.expandedSections.has('data') ? 'open' : ''}>
          <summary class="settings-fold-summary">
            <span class="settings-fold-icon" aria-hidden="true">💾</span>
            <span class="settings-fold-title"><strong>Data & safety</strong><small>Device backup and protected actions</small></span>
            <span class="settings-fold-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div class="settings-fold-content">
          <div class="settings-group-card">

          <!-- Export: local-only until regular Study/SRS rows are account owned. -->
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);">
            <div class="settings-action-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
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
            <div class="settings-action-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
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
            <div class="settings-action-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="min-width:0;">
                <div style="font-size:14px;font-weight:600;color:var(--pink);">Reset All Progress</div>
                <div id="reset-help" style="font-size:11px;color:var(--text-muted);">Temporarily unavailable until progress can be deleted for your account only.</div>
              </div>
              <button type="button" disabled aria-describedby="reset-help" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;
                background:var(--border);border:2px solid var(--border);color:var(--text-muted);font-family:var(--font);flex-shrink:0;opacity:.65;">Paused</button>
            </div>
          </div>
          </div>
          </div>
        </details>

        <!-- Offline -->
        <details class="settings-fold" data-settings-section="offline" ${this.expandedSections.has('offline') ? 'open' : ''}>
          <summary class="settings-fold-summary">
            <span class="settings-fold-icon" aria-hidden="true">📥</span>
            <span class="settings-fold-title"><strong>Offline</strong><small>Save app files and recorded audio</small></span>
            <span class="settings-fold-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div class="settings-fold-content">
          <div class="settings-group-card">
          <div class="settings-row">
              <div class="settings-row-text">
                <div style="font-size:14px;font-weight:600;color:var(--text);">App files for offline</div>
                <div style="font-size:11px;color:var(--text-muted);" id="sw-status" role="status" aria-live="polite">Checking downloaded files…</div>
              </div>
              <button id="btn-cache" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;
                background:var(--purple);border:none;color:#fff;font-family:var(--font);">Download files</button>
          </div>
          <div class="offline-info" id="sw-detail">App files are separate from lessons and learning records stored on the server. Downloading the app does not download your complete Study/SRS vocabulary or progress.</div>
          <progress id="sw-progress" max="100" value="0" hidden aria-label="App file download progress"></progress>
          <div class="settings-row">
              <div class="settings-row-text">
                <div style="font-size:14px;font-weight:600;color:var(--text);">Audio for offline</div>
                <div style="font-size:11px;color:var(--text-muted);" id="audio-status" role="status" aria-live="polite">Checking recorded clips…</div>
              </div>
              <button id="btn-audio-dl" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;
                background:var(--purple);border:none;color:#fff;font-family:var(--font);">Download all</button>
          </div>
          <div class="offline-info">Previously saved audio stays on this device across app updates. Unavailable recordings and online-only videos cannot be downloaded here.</div>
          </div>
          </div>
        </details>
        </div>

        <!-- App Info -->
        <div class="settings-app-info">Burmese Study App · v1.0
          <span>Supabase: ${db.connected ? '✓ Connected' : '✕ Not connected'}</span>
        </div>
      </div>
    `;

    this.accountContainer = container;
    this.refreshAccountPanel();

    container.querySelectorAll('[data-settings-section]').forEach(section => {
      section.addEventListener('toggle', () => {
        if (!section.isConnected) return; // Ignore delayed events from replaced preference rows.
        if (section.open) this.expandedSections.add(section.dataset.settingsSection);
        else this.expandedSections.delete(section.dataset.settingsSection);
      });
    });

    // Check SW status
    this.checkServiceWorker(container);

    // Audio for offline (Phase 12): N of M saved + retryable Download all.
    import('./app-audio.js?v=1').then(A => {
      const st = container.querySelector('#audio-status'), btn = container.querySelector('#btn-audio-dl');
      if (!st || !btn) return;
      if (!('caches' in window)) { st.textContent = 'Not supported in this browser'; btn.disabled = true; btn.style.opacity = '.5'; return; }
      const show = async () => {
        const { saved, total } = await A.savedCount();
        st.style.color = 'var(--text-muted)';
        if (!total) { st.textContent = 'Audio list unavailable. Connect and retry.'; btn.disabled = false; btn.textContent = 'Retry'; return; }
        st.textContent = `${saved.toLocaleString()} of ${total.toLocaleString()} clips saved on this device`;
        if (saved >= total) { btn.textContent = '✓ All saved'; btn.disabled = true; btn.style.opacity = '.6'; }
        else { btn.textContent = 'Download all'; btn.disabled = false; btn.style.opacity = '1'; }
      };
      show().catch(error => { st.textContent = `Unable to count audio: ${error.message}`; });
      btn.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = 'Downloading…';
        try {
          const r = await A.downloadAll((n, t) => { st.style.color = 'var(--yellow)'; st.textContent = `Downloading ${n.toLocaleString()} / ${t.toLocaleString()}…`; });
          if (r.failed) {
            const { saved, total } = await A.savedCount();
            st.style.color = 'var(--pink)'; st.textContent = `${saved} / ${total} saved · ${r.failed} failed. Check connection and retry.`;
            btn.disabled = false; btn.textContent = 'Retry';
          } else await show();
        } catch (error) {
          st.style.color = 'var(--pink)'; st.textContent = `Audio download stopped: ${error.message}`;
          btn.disabled = false; btn.textContent = 'Retry';
        }
      });
    }).catch(() => {});

    // Back
    container.querySelector('#set-back').addEventListener('click', () => {
      this.app.goBack();
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

    // App-shell download. Registering a worker alone never means ready.
    container.querySelector('#btn-cache').addEventListener('click', async () => {
      const btn = container.querySelector('#btn-cache');
      const swStatus = container.querySelector('#sw-status');
      const progress = container.querySelector('#sw-progress');
      this.offlineDownloading = true;
      btn.disabled = true; btn.textContent = 'Downloading…';
      progress.hidden = false; progress.value = 0;
      swStatus.style.color = 'var(--yellow)'; swStatus.textContent = 'Preparing app files…';
      try {
        const result = await downloadAppOffline(({ completed, total, failed }) => {
          progress.max = total; progress.value = completed;
          swStatus.textContent = `${completed} / ${total} app files checked${failed ? ` · ${failed} failed` : ''}`;
        });
        if (result.ready) {
          swStatus.style.color = 'var(--green)';
          swStatus.textContent = `✓ App files ready offline (${result.saved} / ${result.total}). Lessons may still require internet.`;
          btn.textContent = 'Check again';
        } else {
          swStatus.style.color = 'var(--pink)';
          swStatus.textContent = `${result.saved} / ${result.total} app files saved · ${result.missing.length} missing. Connect and retry.`;
          btn.textContent = 'Retry';
        }
      } catch (error) {
        swStatus.style.color = 'var(--pink)'; swStatus.textContent = `App download stopped: ${error.message}`;
        btn.textContent = 'Retry';
      } finally { this.offlineDownloading = false; btn.disabled = false; progress.hidden = true; }
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

  async checkServiceWorker(container) {
    const swStatus = container.querySelector('#sw-status');
    if (!swStatus) return;
    try {
      const state = await checkAppOffline();
      // Do not replace a status on a Settings page that has been navigated away.
      if (!container.querySelector('#sw-status') || this.offlineDownloading) return;
      const status = {
        unsupported: ['App caching unavailable in this browser.', 'var(--pink)'],
        'not-installed': ['App files not downloaded yet.', 'var(--text-muted)'],
        installing: ['Worker registered · downloading or updating files…', 'var(--yellow)'],
        unknown: ['Worker registered · offline readiness unverified. Tap Download files to retry.', 'var(--yellow)']
      }[state.kind];
      if (status) { swStatus.textContent = status[0]; swStatus.style.color = status[1]; }
      else if (state.kind === 'ready') {
        swStatus.textContent = `✓ App files ready offline (${state.saved} / ${state.total}). Lessons may still need internet.`;
        swStatus.style.color = 'var(--green)';
      } else {
        swStatus.textContent = `${state.saved} / ${state.total} app files saved · ${state.missing.length} missing.`;
        swStatus.style.color = 'var(--yellow)';
      }
      const button = container.querySelector('#btn-cache');
      if (state.kind === 'unsupported') button.disabled = true;
      else button.textContent = state.kind === 'ready' ? 'Check again'
        : state.kind === 'partial' || state.kind === 'unknown' ? 'Retry' : 'Download files';
    } catch (error) {
      swStatus.textContent = `Unable to check app files: ${error.message}`;
      swStatus.style.color = 'var(--pink)';
    }
  }
}
