// ═══ SRS TAB ═══
import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';

export class SRSTab {
  constructor(app) {
    this.app = app;
    this.queue = [];
    this.loaded = false;
  }

  async loadQueue() {
    try {
      const states = await db.getUserState();
      const words = await db.getWords();
      const wordMap = {};
      for (const w of words) wordMap[w.id] = w;

      const now = Date.now();
      this.queue = states
        .filter(s => wordMap[s.word_id])
        .map(s => {
          const w = wordMap[s.word_id];
          const dueAt = s.next_review_at ? new Date(s.next_review_at).getTime() : 0;
          const diff = dueAt - now;
          let dueLabel;
          if (diff <= 0) dueLabel = 'Now';
          else if (diff < 3600000) dueLabel = `${Math.round(diff / 60000)}m`;
          else if (diff < 86400000) dueLabel = `${Math.round(diff / 3600000)}h`;
          else dueLabel = `${Math.round(diff / 86400000)}d`;

          return {
            word: w.burmese_word,
            meaning: w.english_meaning || '',
            due: dueLabel,
            isDue: diff <= 0,
            level: s.mastery_level || 0,
            dueAt
          };
        })
        .sort((a, b) => a.dueAt - b.dueAt);

      this.loaded = true;
    } catch (err) {
      console.error('SRS load error:', err);
      this.queue = [];
    }
  }

  async render(container) {
    if (!this.loaded) await this.loadQueue();

    const dueNow = this.queue.filter(w => w.isDue);
    const upcoming = this.queue.filter(w => !w.isDue);
    const mastered = this.queue.filter(w => w.level >= 4);

    container.innerHTML = `
      <div class="pad">
        <div class="mb-4" style="font-size:22px; font-weight:800;">🔄 Review</div>
        <div style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">
          ${dueNow.length} due now · ${upcoming.length} upcoming
        </div>

        <div class="srs-stats">
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--pink);">${dueNow.length}</div>
            <div class="srs-stat-label">Due Now</div>
          </div>
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--yellow);">${this.queue.length}</div>
            <div class="srs-stat-label">Total</div>
          </div>
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--green);">${mastered.length}</div>
            <div class="srs-stat-label">Mastered</div>
          </div>
        </div>

        ${dueNow.length > 0 ? `
          <button class="btn-primary mb-20" style="background:var(--green);">
            Review ${dueNow.length} Words →
          </button>
        ` : `
          <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:14px; margin-bottom:20px;">
            No words due for review right now ✓
          </div>
        `}

        <div class="section-label" style="color:var(--text-muted);">Queue</div>
        ${this.queue.length > 0 ? this.queue.map(w => `
          <div class="srs-item">
            <div class="srs-dot" style="background:${w.isDue ? 'var(--pink)' : w.due.includes('h') ? 'var(--yellow)' : 'var(--text-muted)'};
              ${w.isDue ? 'box-shadow:0 0 6px rgba(255,107,138,0.5);' : ''}"></div>
            <div class="flex-1">
              <div class="srs-word">${w.word}</div>
              <div class="srs-meaning">${w.meaning}</div>
            </div>
            <div style="text-align:right;">
              <div class="srs-due" style="color:${w.isDue ? 'var(--pink)' : 'var(--text-muted)'};">${w.due}</div>
              <div class="srs-levels">
                ${[1,2,3,4,5].map(j => `<div class="srs-level-dot ${j <= w.level ? 'filled' : ''}"></div>`).join('')}
              </div>
            </div>
          </div>
        `).join('') : `
          <div style="text-align:center; padding:30px; color:var(--text-muted); font-size:14px;">
            Start studying to build your review queue
          </div>
        `}
      </div>
    `;
  }
}
