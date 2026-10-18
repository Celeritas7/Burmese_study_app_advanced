// ═══ STATS & PROGRESS ═══
import { db } from './supabase.js';
import { getSettings } from './settings.js';
import { PACKS } from './speak-data.js?v=4';
import { sayBtn } from './app-audio.js?v=1';

// Phase 14: local calendar day (not UTC) so a late-evening session counts for today.
const localDay = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
// Days in a row with at least one answer. Today not done yet doesn't break it until tomorrow.
export function dayStreak(days) {
  const d = new Date();
  if (!days.has(localDay(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(localDay(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export class StatsPage {
  constructor(app) {
    this.app = app;
    this.loaded = false;
    this.userStates = [];
    this.words = [];
    this.events = [];
    this.view = 'words';      // Phase 14: 'words' | 'speak'
    this.backTo = null;       // 'speak' when opened from Speak home
    this.speakRows = [];
    this.speakLoaded = false;
  }

  async loadData() {
    try {
      const [states, words] = await Promise.all([
        db.getUserState(),
        db.getWords()
      ]);
      this.userStates = states;
      this.words = words;
      // Get recent progress events (last 50)
      try {
        this.events = await db.query('burmese_app_progress_events', {
          order: 'created_at.desc',
          limit: 50
        });
      } catch { this.events = []; }
      this.loaded = true;
    } catch (err) {
      console.error('Stats load error:', err);
    }
  }

  async render(container) {
    if (this.view === 'speak') return this.renderSpeak(container);
    if (!this.loaded) {
      container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;font-size:24px;">Loading...</div>';
      await this.loadData();
    }

    const total = this.words.length;
    const studied = this.userStates.length;
    const pct = total > 0 ? Math.round((studied / total) * 100) : 0;

    // Mastery breakdown
    const mastery = [0, 0, 0, 0, 0, 0]; // levels 0-5
    let totalCorrect = 0, totalIncorrect = 0, totalStreak = 0;
    for (const s of this.userStates) {
      const lv = Math.min(5, Math.max(0, s.mastery_level || 0));
      mastery[lv]++;
      totalCorrect += s.correct_count || 0;
      totalIncorrect += s.incorrect_count || 0;
      totalStreak = Math.max(totalStreak, s.streak || 0);
    }
    const totalAttempts = totalCorrect + totalIncorrect;
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    // Due now
    const now = Date.now();
    const dueNow = this.userStates.filter(s => !s.next_review_at || new Date(s.next_review_at).getTime() <= now).length;

    // Source breakdown
    const sourceMap = {};
    const wordMap = {};
    for (const w of this.words) {
      wordMap[w.id] = w;
      const src = w.source || 'unknown';
      if (!sourceMap[src]) sourceMap[src] = { total: 0, studied: 0 };
      sourceMap[src].total++;
    }
    for (const s of this.userStates) {
      const w = wordMap[s.word_id];
      if (w) {
        const src = w.source || 'unknown';
        if (sourceMap[src]) sourceMap[src].studied++;
      }
    }

    // Recent activity
    const recentDays = {};
    for (const e of this.events) {
      if (e.created_at) {
        const day = e.created_at.split('T')[0];
        recentDays[day] = (recentDays[day] || 0) + 1;
      }
    }
    const dayKeys = Object.keys(recentDays).sort().slice(-7);

    // Mastery labels & colors
    const masteryInfo = [
      { label: 'New', color: '#6B7280' },
      { label: 'Seen', color: '#1CB0F6' },
      { label: 'Learning', color: '#CE82FF' },
      { label: 'Familiar', color: '#FFC800' },
      { label: 'Strong', color: '#FF9600' },
      { label: 'Mastered', color: '#58CC02' },
    ];

    container.innerHTML = `
      <div class="pad-sm">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <button id="stats-back" style="background:var(--surface);border:2px solid var(--border);border-radius:10px;
            color:var(--text-muted);cursor:pointer;font-size:12px;padding:6px 12px;font-weight:700;font-family:var(--font);">← Back</button>
          <div style="flex:1;">
            <div style="font-size:20px;font-weight:800;">📊 Stats & Progress</div>
            <div style="font-size:12px;color:var(--text-muted);">${studied} of ${total} words studied</div>
          </div>
        </div>

        ${this.segHtml()}

        <!-- Overall progress ring -->
        <div style="display:flex;align-items:center;gap:20px;padding:20px;background:var(--surface);border-radius:16px;border:2px solid var(--border);margin-bottom:16px;">
          <div style="position:relative;width:80px;height:80px;">
            <svg viewBox="0 0 36 36" style="width:80px;height:80px;transform:rotate(-90deg);">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" stroke-width="3"></circle>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--green)" stroke-width="3"
                stroke-dasharray="${pct} ${100 - pct}" stroke-linecap="round"></circle>
            </svg>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:var(--green);">${pct}%</div>
          </div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px;">Overall Progress</div>
            <div style="font-size:12px;color:var(--text-muted);line-height:1.6;">
              ${studied} words studied<br>
              ${total - studied} remaining<br>
              ${dueNow} due for review
            </div>
          </div>
        </div>

        <!-- Key stats -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;">
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--green);">${accuracy}%</div>
            <div class="srs-stat-label">Accuracy</div>
          </div>
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--yellow);">${totalStreak}</div>
            <div class="srs-stat-label">Best Streak</div>
          </div>
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--pink);">${dueNow}</div>
            <div class="srs-stat-label">Due Now</div>
          </div>
        </div>

        <!-- Mastery breakdown -->
        <div style="background:var(--surface);border-radius:16px;border:2px solid var(--border);padding:16px;margin-bottom:16px;">
          <div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:12px;">Mastery Levels</div>
          ${masteryInfo.map((m, i) => {
            const count = mastery[i];
            const barPct = studied > 0 ? Math.round((count / studied) * 100) : 0;
            return `
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <div style="width:70px;font-size:11px;font-weight:600;color:${m.color};">${m.label}</div>
                <div style="flex:1;height:8px;background:var(--bg);border-radius:4px;overflow:hidden;">
                  <div style="height:100%;width:${barPct}%;background:${m.color};border-radius:4px;transition:width 0.4s;"></div>
                </div>
                <div style="width:30px;font-size:12px;font-weight:700;color:var(--text-muted);text-align:right;">${count}</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Source breakdown -->
        <div style="background:var(--surface);border-radius:16px;border:2px solid var(--border);padding:16px;margin-bottom:16px;">
          <div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:12px;">By Source</div>
          ${Object.entries(sourceMap).map(([src, data]) => {
            const srcPct = data.total > 0 ? Math.round((data.studied / data.total) * 100) : 0;
            const colors = { kg_book: '#FF6B8A', main_words: '#58CC02', dictionary: '#FFC800', recipes: '#CE82FF' };
            const color = colors[src] || '#5A7A88';
            return `
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <div style="width:80px;font-size:11px;font-weight:600;color:${color};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${src}</div>
                <div style="flex:1;height:8px;background:var(--bg);border-radius:4px;overflow:hidden;">
                  <div style="height:100%;width:${srcPct}%;background:${color};border-radius:4px;"></div>
                </div>
                <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${data.studied}/${data.total}</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Activity heatmap (last 7 days) -->
        <div style="background:var(--surface);border-radius:16px;border:2px solid var(--border);padding:16px;margin-bottom:16px;">
          <div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:12px;">Recent Activity</div>
          ${dayKeys.length > 0 ? `
            <div style="display:flex;gap:6px;align-items:flex-end;height:80px;">
              ${dayKeys.map(day => {
                const count = recentDays[day];
                const maxCount = Math.max(...dayKeys.map(d => recentDays[d]));
                const h = maxCount > 0 ? Math.max(10, Math.round((count / maxCount) * 70)) : 10;
                const dayLabel = day.split('-').slice(1).join('/');
                return `
                  <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
                    <div style="font-size:10px;color:var(--blue);font-weight:700;">${count}</div>
                    <div style="width:100%;height:${h}px;background:var(--blue);border-radius:4px;"></div>
                    <div style="font-size:9px;color:var(--text-muted);">${dayLabel}</div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : '<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:20px;">No activity yet. Start studying!</div>'}
        </div>

        <!-- Totals -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--green);font-size:22px;">${totalCorrect}</div>
            <div class="srs-stat-label">Total Correct</div>
          </div>
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--pink);font-size:22px;">${totalIncorrect}</div>
            <div class="srs-stat-label">Total Incorrect</div>
          </div>
        </div>
      </div>
    `;

    this.bindCommon(container);
  }

  // ─── Words | Speak switch (Phase 14) ───
  segHtml() {
    const b = (id, label) => `<button class="stats-seg" data-view="${id}" style="padding:8px;border-radius:9px;border:none;cursor:pointer;font-family:var(--font);font-size:13px;font-weight:800;
      background:${this.view === id ? 'var(--surface)' : 'transparent'};color:${this.view === id ? 'var(--text)' : 'var(--text-muted)'};
      box-shadow:${this.view === id ? '0 0 0 2px var(--border-light)' : 'none'};">${label}</button>`;
    return `<div style="display:grid;grid-template-columns:1fr 1fr;background:var(--elevated);border:2px solid var(--border);border-radius:12px;padding:3px;margin-bottom:16px;">${b('words', '📖 Words')}${b('speak', '🗣 Speak')}</div>`;
  }

  bindCommon(container) {
    container.querySelector('#stats-back').addEventListener('click', () => {
      if (this.backTo === 'speak') { this.backTo = null; this.app.switchTab('speak'); }
      else this.app.tabs.more.render(this.app.contentEl);
    });
    container.querySelectorAll('.stats-seg').forEach(b => b.addEventListener('click', () => {
      if (this.view === b.dataset.view) return;
      this.view = b.dataset.view;
      this.render(container);
    }));
  }

  // Opened from Speak home: Speak view, fresh rows, Back returns to Speak.
  openSpeak() { this.view = 'speak'; this.backTo = 'speak'; this.speakLoaded = false; this.app.showStats(); }

  async loadSpeak() {
    try { this.speakRows = await db.query('speak_log', { select: 'pack,item,step,ok,created_at', order: 'created_at.asc', limit: 20000 }); }
    catch { this.speakRows = []; }
    this.speakLoaded = true;
  }

  // ─── SPEAK STATS (Phase 14) — everything comes from speak_log ───
  async renderSpeak(container) {
    if (!this.speakLoaded) {
      container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;font-size:24px;">Loading...</div>';
      await this.loadSpeak();
    }
    let playful = false; try { playful = !!getSettings().showPlayful; } catch {}
    const packs = PACKS.filter(p => !p.playful || playful);
    const byId = Object.fromEntries(packs.map(p => [p.id, p]));
    const rows = this.speakRows.filter(r => byId[r.pack]);   // hidden playful pack = no trace

    const head = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <button id="stats-back" style="background:var(--surface);border:2px solid var(--border);border-radius:10px;
            color:var(--text-muted);cursor:pointer;font-size:12px;padding:6px 12px;font-weight:700;font-family:var(--font);">← Back</button>
          <div style="flex:1;">
            <div style="font-size:20px;font-weight:800;">📊 Stats & Progress</div>
            <div style="font-size:12px;color:var(--text-muted);">Speak · from your answers</div>
          </div>
        </div>
        ${this.segHtml()}`;
    const card = 'background:var(--surface);border-radius:16px;border:2px solid var(--border);padding:16px;margin-bottom:16px;';

    if (!rows.length) {
      container.innerHTML = `<div class="pad-sm">${head}
        <div style="${card}text-align:center;padding:28px 18px;">
          <div style="font-size:40px;">🗣</div>
          <div style="font-size:15px;font-weight:800;color:var(--text);margin-top:6px;">Nothing said yet</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;line-height:1.5;">Your Speak answers show up here: what you’ve said, what to say again, and your streak.</div>
          <button id="sst-go" class="btn-primary" style="background:var(--green);margin-top:14px;">Go to Speak →</button>
        </div></div>`;
      this.bindCommon(container);
      container.querySelector('#sst-go').addEventListener('click', () => { this.backTo = null; this.app.switchTab('speak'); });
      return;
    }

    const okN = rows.filter(r => r.ok).length, pct = Math.round(okN / rows.length * 100);
    const days = new Set(rows.map(r => localDay(r.created_at)));
    const streak = dayStreak(days);
    const strip = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); strip.push(d); }
    const active = strip.filter(d => days.has(localDay(d))).length;
    const color = v => v >= 70 ? 'var(--green)' : v >= 50 ? 'var(--yellow)' : 'var(--pink)';

    const perPack = packs.map(p => {
      const pr = rows.filter(r => r.pack === p.id);
      const tried = new Set(pr.filter(r => r.step === 1).map(r => r.item));
      return { p, n: pr.length, tried: p.words.filter(w => tried.has(w.en)).length, pct: pr.length ? Math.round(pr.filter(r => r.ok).length / pr.length * 100) : null };
    });

    // Most missed: words whose latest answer was "Not yet", most misses first (same idea as Speak's Retry list).
    const items = {};
    for (const r of rows) {
      if (r.step !== 1) continue;
      const k = r.pack + '|' + r.item, o = items[k] || (items[k] = { pack: r.pack, item: r.item, miss: 0, last: true });
      if (!r.ok) o.miss++;
      o.last = r.ok;
    }
    const missed = Object.values(items).filter(o => !o.last).sort((a, b) => b.miss - a.miss)
      .map(o => ({ ...o, w: byId[o.pack].words.find(w => w.en === o.item) })).filter(o => o.w).slice(0, 5);

    container.innerHTML = `<div class="pad-sm">${head}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;">
          <div class="srs-stat"><div class="srs-stat-num" style="color:var(--blue);">${rows.length}</div><div class="srs-stat-label">Said out loud</div></div>
          <div class="srs-stat"><div class="srs-stat-num" style="color:${color(pct)};">${pct}%</div><div class="srs-stat-label">Said it</div></div>
          <div class="srs-stat"><div class="srs-stat-num" style="color:var(--yellow);">${streak}</div><div class="srs-stat-label">Day streak${streak > 1 ? ' 🔥' : ''}</div></div>
        </div>

        <div style="${card}">
          <div style="display:flex;align-items:center;margin-bottom:12px;">
            <div style="flex:1;font-size:13px;font-weight:800;color:var(--text);">Last 14 days</div>
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">${active} day${active === 1 ? '' : 's'} practised</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(14,1fr);gap:4px;">
            ${strip.map((d, i) => { const on = days.has(localDay(d)); return `<div title="${d.toLocaleDateString()}" style="aspect-ratio:1;border-radius:5px;
              background:${on ? 'var(--green)' : 'var(--bg)'};border:1px solid ${on ? 'var(--green)' : 'var(--border)'};
              ${i === 13 ? 'box-shadow:0 0 0 2px var(--yellow);' : ''}"></div>`; }).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-muted);font-weight:700;margin-top:6px;">
            <span>${strip[0].toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span><span>Today</span>
          </div>
        </div>

        <div style="${card}">
          <div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:12px;">By pack</div>
          ${perPack.map(({ p, n, tried, pct }) => `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;${n ? '' : 'opacity:.5;'}">
              <div style="width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;flex:none;background:${p.color}1F;">${p.emoji}</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;gap:8px;">
                  <span style="font-size:13px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.title}</span>
                  <span style="font-size:11px;color:var(--text-muted);font-weight:600;flex:none;">${n ? `${tried} / ${p.words.length} tried` : 'not started'}</span>
                </div>
                <div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden;margin-top:5px;">
                  <div style="height:100%;width:${pct || 0}%;background:${pct === null ? 'transparent' : color(pct)};border-radius:4px;transition:width 0.4s;"></div>
                </div>
              </div>
              <div style="width:40px;text-align:right;font-size:13px;font-weight:800;flex:none;color:${pct === null ? 'var(--text-muted)' : color(pct)};">${pct === null ? '—' : pct + '%'}</div>
            </div>`).join('')}
        </div>

        ${missed.length ? `
        <div style="${card}">
          <div style="display:flex;align-items:center;margin-bottom:4px;">
            <div style="flex:1;font-size:13px;font-weight:800;color:var(--text);">Most missed</div>
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">last answer “Not yet”</div>
          </div>
          ${missed.map((o, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;${i ? 'border-top:1px solid var(--border);' : ''}">
              <div style="flex:1;min-width:0;">
                <div style="font-size:15px;font-weight:700;color:var(--text);">${o.w.my}</div>
                <div style="font-size:11px;color:var(--text-muted);">${o.w.en}</div>
              </div>
              <span style="font-size:11px;font-weight:800;color:var(--pink);flex:none;">✗ ${o.miss}</span>
              ${sayBtn(o.w.my)}
            </div>`).join('')}
          <button id="sst-retry" class="btn-primary" style="background:var(--pink);margin-top:8px;">Retry in Speak →</button>
        </div>` : ''}
      </div>`;

    this.bindCommon(container);
    container.querySelector('#sst-retry')?.addEventListener('click', () => {
      this.backTo = null;
      this.app.switchTab('speak');
      this.app.tabs.speak?.startMisses?.();
    });
  }
}
