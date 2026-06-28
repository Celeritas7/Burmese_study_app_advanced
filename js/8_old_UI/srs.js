// ═══ SRS TAB ═══
import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';
import { getSettings } from './settings.js';

const SRS_RESPONSES = [
  { label: 'Again', icon: '✗', color: '#FF6B8A', mastery: -2 },
  { label: 'Hard', icon: '🤔', color: '#CE82FF', mastery: -1 },
  { label: 'Good', icon: '✓', color: '#58CC02', mastery: 1 },
  { label: 'Easy', icon: '🔥', color: '#FFC800', mastery: 2 },
];

const INTERVALS_HOURS = [0, 1, 4, 8, 24, 72, 168, 336]; // mastery 0→7

export class SRSTab {
  constructor(app) {
    this.app = app;
    this.queue = [];
    this.wordMap = {};
    this.stateMap = {};
    this.loaded = false;
    this.phase = 'queue';
    this.reviewCards = [];
    this.currentIdx = 0;
    this.revealLevel = 0;
    this.sessionResults = [];
  }

  async loadQueue() {
    try {
      const [states, words] = await Promise.all([
        db.getUserState(),
        db.getWords()
      ]);

      this.wordMap = {};
      for (const w of words) this.wordMap[w.id] = w;

      this.stateMap = {};
      for (const s of states) this.stateMap[s.word_id] = s;

      const now = Date.now();
      this.queue = states
        .filter(s => this.wordMap[s.word_id])
        .map(s => {
          const w = this.wordMap[s.word_id];
          const dueAt = s.next_review_at ? new Date(s.next_review_at).getTime() : 0;
          const diff = dueAt - now;
          let dueLabel;
          if (diff <= 0) dueLabel = 'Now';
          else if (diff < 3600000) dueLabel = `${Math.round(diff / 60000)}m`;
          else if (diff < 86400000) dueLabel = `${Math.round(diff / 3600000)}h`;
          else dueLabel = `${Math.round(diff / 86400000)}d`;

          return {
            wordId: w.id,
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
    switch (this.phase) {
      case 'review': return this.renderReview(container);
      case 'results': return this.renderResults(container);
      default: return this.renderQueue(container);
    }
  }

  // ─── QUEUE VIEW ───
  renderQueue(container) {
    const dueNow = this.queue.filter(w => w.isDue);
    const mastered = this.queue.filter(w => w.level >= 5);

    container.innerHTML = `
      <div class="pad">
        <div class="mb-4" style="font-size:22px; font-weight:800;">🔄 Review</div>
        <div style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">
          ${dueNow.length} due now · ${this.queue.length} total
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
          <button class="btn-primary mb-20" id="start-review" style="background:var(--green);">
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

    container.querySelector('#start-review')?.addEventListener('click', () => {
      this.startReview(container);
    });
  }

  // ─── START REVIEW ───
  startReview(container) {
    const dueNow = this.queue.filter(w => w.isDue);
    if (dueNow.length === 0) return;
    this.reviewCards = dueNow.sort(() => Math.random() - 0.5);
    this.currentIdx = 0;
    this.revealLevel = 0;
    this.sessionResults = [];
    this.phase = 'review';
    this.render(container);
  }

  // ─── REVIEW FLASHCARD ───
  renderReview(container) {
    const card = this.reviewCards[this.currentIdx];
    if (!card) { this.phase = 'results'; return this.render(container); }

    const w = this.wordMap[card.wordId];
    if (!w) { this.phase = 'results'; return this.render(container); }

    const settings = getSettings();
    const dev = settings.showDevanagari ? toDev(w.burmese_word) : '';
    const total = this.reviewCards.length;
    const progress = ((this.currentIdx) / total * 100);
    const hasHint = !!w.hint;
    const showDeva = settings.showDevanagari;
    const maxLevel = (hasHint ? 1 : 0) + (showDeva ? 1 : 0) + 1;
    const fullyRevealed = this.revealLevel >= maxLevel;
    const fontSizeMap = { small: '32px', normal: '42px', large: '52px' };
    const cardFontSize = fontSizeMap[settings.fontSize] || '42px';

    container.innerHTML = `
      <div class="pad-sm">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <button id="srs-exit" style="background:var(--surface);border:2px solid var(--border);border-radius:10px;
            color:var(--text-muted);cursor:pointer;font-size:12px;padding:5px 12px;font-weight:700;font-family:var(--font);">
            ✕ Exit
          </button>
          <div style="font-size:13px;color:var(--text-muted);font-weight:600;">
            ${this.currentIdx + 1} / ${total}
          </div>
          <div class="srs-levels" style="margin:0;">
            ${[1,2,3,4,5].map(j => `<div class="srs-level-dot ${j <= card.level ? 'filled' : ''}"></div>`).join('')}
          </div>
        </div>

        <!-- Progress -->
        <div style="height:8px;background:var(--surface);border-radius:5px;margin-bottom:16px;padding:2px;border:2px solid var(--border);">
          <div style="height:100%;border-radius:3px;background:var(--green);width:${progress}%;transition:width 0.4s;"></div>
        </div>

        <!-- Word card -->
        <div class="word-card">
          <div class="word-card-text" style="font-size:${cardFontSize};">${w.burmese_word}</div>
        </div>

        <!-- Reveal box -->
        <div class="reveal-box ${this.revealLevel > 0 ? 'revealed' : ''}" id="reveal-box">
          ${this.renderReveal(w, dev, hasHint, maxLevel)}
        </div>

        <!-- SRS response buttons (after full reveal) -->
        ${fullyRevealed ? `
          <div style="text-align:center;font-size:12px;color:var(--text-muted);margin-bottom:8px;">How well did you know this?</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:14px;">
            ${SRS_RESPONSES.map((r, i) => `
              <button class="srs-resp" data-resp="${i}" style="
                padding:12px 6px;border-radius:12px;text-align:center;cursor:pointer;font-family:var(--font);
                background:${r.color}12;border:2px solid ${r.color}40;transition:all 0.15s;
              ">
                <div style="font-size:20px;margin-bottom:2px;">${r.icon}</div>
                <div style="font-size:11px;font-weight:700;color:${r.color};">${r.label}</div>
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    // Events
    container.querySelector('#srs-exit').addEventListener('click', () => {
      this.phase = 'queue';
      this.loaded = false;
      this.render(container);
    });

    container.querySelector('#reveal-box').addEventListener('click', () => {
      if (this.revealLevel < maxLevel) {
        this.revealLevel++;
        if (this.revealLevel >= maxLevel) {
          this.render(container); // Re-render to show response buttons
        } else {
          const box = container.querySelector('#reveal-box');
          box.innerHTML = this.renderReveal(w, dev, hasHint, maxLevel);
        }
      }
    });

    container.querySelectorAll('.srs-resp').forEach(btn => {
      btn.addEventListener('click', async () => {
        const respIdx = parseInt(btn.dataset.resp);
        const resp = SRS_RESPONSES[respIdx];
        const oldLevel = card.level;
        const newLevel = Math.min(7, Math.max(0, oldLevel + resp.mastery));
        const nextInterval = INTERVALS_HOURS[newLevel] || 0;
        const nextReview = new Date(Date.now() + nextInterval * 3600000).toISOString();
        const isCorrect = respIdx >= 2;

        this.sessionResults.push({
          wordId: card.wordId,
          word: w.burmese_word,
          meaning: w.english_meaning || '',
          response: resp.label,
          oldLevel,
          newLevel,
          correct: isCorrect
        });

        try {
          const state = this.stateMap[card.wordId];
          if (state) {
            await db.update('burmese_app_user_state', state.id, {
              mastery_level: newLevel,
              correct_count: (state.correct_count || 0) + (isCorrect ? 1 : 0),
              incorrect_count: (state.incorrect_count || 0) + (isCorrect ? 0 : 1),
              streak: isCorrect ? (state.streak || 0) + 1 : 0,
              next_review_at: nextReview,
              last_practiced_at: new Date().toISOString()
            });
          }
          await db.logProgress({ type: 'srs_review', wordId: card.wordId, result: resp.label });
        } catch { /* offline */ }

        this.currentIdx++;
        this.revealLevel = 0;
        this.render(container);
      });
    });
  }

  renderReveal(w, dev, hasHint, maxLevel) {
    if (this.revealLevel === 0) {
      return '<div class="reveal-placeholder">👆 Tap to reveal</div>';
    }

    const layers = [];
    if (hasHint) layers.push(`<div style="text-align:center;font-size:14px;color:#1CB0F6;margin-bottom:6px;">💡 ${w.hint}</div>`);
    if (dev) layers.push(`<div style="text-align:center;font-size:22px;font-weight:700;color:var(--yellow);margin-bottom:6px;">${dev}</div>`);
    layers.push(`<div style="text-align:center;font-size:20px;font-weight:700;color:var(--green);">${w.english_meaning || '(unknown)'}</div>`);

    let html = '';
    for (let i = 0; i < Math.min(this.revealLevel, layers.length); i++) {
      html += layers[i];
    }

    if (this.revealLevel < maxLevel) {
      const nextIdx = this.revealLevel;
      const nextLabel = (hasHint && nextIdx === 1 && dev) ? 'reading' : 'meaning';
      html += `<div class="reveal-more">👆 tap to reveal ${nextLabel}</div>`;
    }

    return html;
  }

  // ─── RESULTS ───
  renderResults(container) {
    const settings = getSettings();
    const total = this.sessionResults.length;
    const correct = this.sessionResults.filter(r => r.correct).length;
    const wrong = total - correct;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const emoji = pct >= 90 ? '🌟' : pct >= 70 ? '👏' : pct >= 50 ? '💪' : '📚';
    const msg = pct >= 90 ? 'Excellent!' : pct >= 70 ? 'Good job!' : pct >= 50 ? 'Keep going!' : 'Keep practicing!';
    const barColor = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--pink)';
    const wrongWords = this.sessionResults.filter(r => !r.correct);

    container.innerHTML = `
      <div class="pad">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:48px;margin-bottom:8px;">${emoji}</div>
          <div style="font-size:24px;font-weight:800;color:var(--text);">${msg}</div>
          <div style="font-size:14px;color:var(--text-muted);margin-top:4px;">
            ${correct} correct · ${wrong} to review
          </div>
        </div>

        <div style="height:12px;background:var(--surface);border-radius:6px;margin-bottom:24px;padding:2px;border:2px solid var(--border);">
          <div style="height:100%;border-radius:4px;background:${barColor};width:${pct}%;transition:width 0.6s;"></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:24px;">
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--green);">${correct}</div>
            <div class="srs-stat-label">Good/Easy</div>
          </div>
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--pink);">${wrong}</div>
            <div class="srs-stat-label">Again/Hard</div>
          </div>
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--blue);">${pct}%</div>
            <div class="srs-stat-label">Score</div>
          </div>
        </div>

        <!-- All results -->
        <div class="section-label" style="color:var(--text-muted);">Results</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px;">
          ${this.sessionResults.map(r => {
            const respInfo = SRS_RESPONSES.find(s => s.label === r.response);
            const color = respInfo ? respInfo.color : 'var(--text-muted)';
            return `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;
                background:var(--surface);border:2px solid var(--border);">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:16px;font-weight:700;color:var(--text);">${r.word}</div>
                  ${settings.showDevanagari ? `<div style="font-size:11px;color:var(--yellow);">${toDev(r.word)}</div>` : ''}
                </div>
                <div style="text-align:right;">
                  <div style="font-size:12px;font-weight:700;color:${color};">${r.response}</div>
                  <div class="srs-levels" style="margin-top:2px;">
                    ${[1,2,3,4,5].map(j => `<div class="srs-level-dot ${j <= r.newLevel ? 'filled' : ''}"></div>`).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${wrongWords.length > 0 ? `
          <div class="section-label" style="color:var(--pink);">Review these again</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px;">
            ${wrongWords.map(r => `
              <div style="padding:8px 14px;border-radius:10px;background:rgba(255,107,138,0.08);border:2px solid rgba(255,107,138,0.15);">
                <div style="font-size:15px;font-weight:700;color:var(--text);">${r.word}</div>
                <div style="font-size:11px;color:var(--green);margin-top:2px;">${r.meaning}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="display:flex;gap:8px;">
          <button id="res-back" class="btn-nav btn-prev" style="flex:1;">← Back</button>
          ${wrongWords.length > 0 ? `
            <button id="res-retry" class="btn-nav btn-next" style="flex:1;background:var(--pink);">Review Wrong →</button>
          ` : `
            <button id="res-done" class="btn-nav btn-next" style="flex:1;">Done ✓</button>
          `}
        </div>
      </div>
    `;

    container.querySelector('#res-back').addEventListener('click', () => {
      this.phase = 'queue';
      this.loaded = false;
      this.render(container);
    });

    container.querySelector('#res-done')?.addEventListener('click', () => {
      this.phase = 'queue';
      this.loaded = false;
      this.render(container);
    });

    container.querySelector('#res-retry')?.addEventListener('click', () => {
      this.reviewCards = wrongWords.map(r => ({
        wordId: r.wordId,
        word: r.word,
        meaning: r.meaning,
        level: r.newLevel || 0,
        isDue: true
      }));
      this.currentIdx = 0;
      this.revealLevel = 0;
      this.sessionResults = [];
      this.phase = 'review';
      this.render(container);
    });
  }
}
