// ═══ STATS & PROGRESS ═══
import { db } from './supabase.js';

export class StatsPage {
  constructor(app) {
    this.app = app;
    this.loaded = false;
    this.userStates = [];
    this.words = [];
    this.events = [];
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

    container.querySelector('#stats-back').addEventListener('click', () => {
      this.app.tabs.more.render(this.app.contentEl);
    });
  }
}
