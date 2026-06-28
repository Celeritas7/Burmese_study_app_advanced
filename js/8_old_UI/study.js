// ═══ STUDY TAB ═══
import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';
import { Modal } from './modal.js';
import { Quiz } from './quiz.js';
import { getSettings } from './settings.js';

const MODES = [
  { id: 'burmese', icon: 'မ', label: 'Myanmar→EN' },
  { id: 'deva', icon: 'द', label: 'Deva→Myanmar' },
  { id: 'meaning', icon: 'En', label: 'EN→Myanmar' },
  { id: 'writing', icon: '✍', label: 'Write' }
];

const SOURCES = [
  { id: 'kg_book', name: 'KG Book', icon: '🪷', color: '#FF6B8A' },
  { id: 'words', name: 'Main Words', icon: '💬', color: '#58CC02' },
  { id: 'recipes', name: 'Recipes', icon: '🍜', color: '#CE82FF' },
  { id: 'colloquial', name: 'Colloquial Burmese', icon: '🎓', color: '#FFC800' }
];

const RATINGS = [
  { icon: '○', label: 'New', color: '#6B7280' },
  { icon: '✓', label: 'Got it', color: '#58CC02' },
  { icon: '💬', label: 'Seen', color: '#1CB0F6' },
  { icon: '🔥', label: 'Easy', color: '#FFC800' },
  { icon: '🤔', label: 'Fuzzy', color: '#CE82FF' },
  { icon: '✗', label: 'Nope', color: '#FF6B8A' }
];

export class StudyTab {
  constructor(app) {
    this.app = app;
    this.phase = 'setup'; // setup | session
    this.mode = 'burmese';
    this.wordsPerSession = 10;
    this.selectedSource = null;
    this.words = [];
    this.currentIdx = 0;
    this.revealLevel = 0;
    this.ratings = {};
    this.wordCounts = {};
    this.sentenceCounts = {};
    this.anchorsCache = {};
    this.quiz = null;
  }

  async init() {
    try {
      this.wordCounts = await db.getWordCounts();
    } catch { /* offline fallback */ }
  }

  render(container) {
    if (this.phase === 'setup') {
      this.renderSetup(container);
    } else if (this.phase === 'quiz') {
      this.quiz.render(container);
    } else if (this.phase === 'results') {
      this.renderResults(container);
    } else {
      this.renderSession(container);
    }
  }

  // ─── SETUP SCREEN ───
  renderSetup(container) {
    container.innerHTML = `
      <div class="pad">
        <div class="mb-24">
          <div class="app-title">မြန်မာစာ</div>
          <div class="app-subtitle">Burmese Study</div>
        </div>

        <div class="section-label" style="color:var(--blue);">Test mode</div>
        <div class="mode-grid">
          ${MODES.map(m => `
            <button class="mode-btn ${this.mode === m.id ? 'active' : ''}" data-mode="${m.id}">
              <div class="mode-icon">${m.icon}</div>
              <div class="mode-text">${m.label}</div>
            </button>
          `).join('')}
        </div>

        <div class="section-label" style="color:var(--purple);">Words per session</div>
        <div class="num-row">
          ${[5, 10, 15, 20, 30].map(n => `
            <button class="num-btn ${this.wordsPerSession === n ? 'active' : ''}" data-num="${n}">${n}</button>
          `).join('')}
        </div>

        <div class="section-label" style="color:var(--pink);">Source</div>
        <div class="source-list">
          ${SOURCES.map(s => {
            const count = this.wordCounts[s.id] || (s.disabled ? 0 : '...');
            return `
              <button class="source-item ${this.selectedSource === s.id ? 'active' : ''} ${s.disabled ? 'disabled' : ''}"
                data-source="${s.id}" style="${this.selectedSource === s.id ? `border-color:${s.color};` : ''}">
                <div class="source-icon" style="background:${s.color}18; border-color:${s.color}30;">${s.icon}</div>
                <div class="flex-1">
                  <div class="source-name">${s.name}</div>
                  <div class="source-count">${s.disabled ? 'Coming soon' : `${count} words`}</div>
                </div>
                <span class="source-badge" style="background:${s.color}18; color:${s.color};">${count || '—'}</span>
              </button>
            `;
          }).join('')}
        </div>

        <button class="btn-primary" id="start-btn">Start Session →</button>
        <button class="btn-primary" id="quiz-btn" style="background:var(--purple); margin-top:8px;">🧠 Quiz Mode →</button>
      </div>
    `;

    // Event listeners
    container.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.mode;
        this.render(container);
      });
    });

    container.querySelectorAll('[data-num]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.wordsPerSession = parseInt(btn.dataset.num);
        this.render(container);
      });
    });

    container.querySelectorAll('[data-source]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled')) return;
        const src = btn.dataset.source;
        this.selectedSource = this.selectedSource === src ? null : src;
        this.render(container);
      });
    });

    container.querySelector('#start-btn').addEventListener('click', () => this.startSession(container));
    container.querySelector('#quiz-btn').addEventListener('click', () => this.startQuiz(container));
  }

  // ─── START QUIZ ───
  async startQuiz(container) {
    container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;"><div style="font-size:24px;">Loading...</div></div>';
    try {
      const opts = {};
      if (this.selectedSource) opts.source = this.selectedSource;
      const words = await db.getWords(opts);
      if (words.length < 4) {
        container.innerHTML = '<div class="pad text-center" style="padding-top:30vh;"><div style="font-size:18px;color:var(--text-muted);">Need at least 4 words for quiz.</div><button class="btn-primary" id="back-btn" style="max-width:200px;margin:16px auto;">← Back</button></div>';
        container.querySelector('#back-btn').addEventListener('click', () => { this.phase = 'setup'; this.render(container); });
        return;
      }
      this.quiz = new Quiz(this.app, words, () => {
        this.phase = 'setup';
        this.quiz = null;
        this.render(this.app.contentEl);
      });
      this.phase = 'quiz';
      this.quiz.render(container);
    } catch (err) {
      console.error('Quiz load error:', err);
      container.innerHTML = `<div class="pad text-center" style="padding-top:30vh;"><div style="font-size:18px;color:var(--pink);">Connection error</div><div style="font-size:13px;color:var(--text-muted);margin-top:8px;">${err.message}</div><button class="btn-primary" id="back-btn" style="max-width:200px;margin:16px auto;">← Back</button></div>`;
      container.querySelector('#back-btn').addEventListener('click', () => { this.phase = 'setup'; this.render(container); });
    }
  }

  // ─── START SESSION ───
  async startSession(container) {
    container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;"><div style="font-size:24px;">Loading...</div></div>';

    try {
      const opts = { limit: this.wordsPerSession };
      if (this.selectedSource) opts.source = this.selectedSource;
      let words = await db.getWords(opts);

      // Shuffle
      words = words.sort(() => Math.random() - 0.5).slice(0, this.wordsPerSession);

      if (words.length === 0) {
        container.innerHTML = '<div class="pad text-center" style="padding-top:30vh;"><div style="font-size:18px;color:var(--text-muted);">No words found. Try a different source.</div><button class="btn-primary" id="back-btn" style="max-width:200px;margin:16px auto;">← Back</button></div>';
        container.querySelector('#back-btn').addEventListener('click', () => {
          this.phase = 'setup';
          this.render(container);
        });
        return;
      }

      this.words = words;
      this.currentIdx = 0;
      this.revealLevel = 0;
      this.ratings = {};
      this.sentenceCounts = {};
      this.phase = 'session';

      // Batch load sentence counts for all words in session
      try {
        this.sentenceCounts = await db.getSentenceCountsForWords(words.map(w => w.id));
      } catch { /* offline, skip */ }

      this.render(container);
    } catch (err) {
      console.error('Failed to load words:', err);
      container.innerHTML = `<div class="pad text-center" style="padding-top:30vh;">
        <div style="font-size:18px;color:var(--pink);">Connection error</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:8px;">${err.message}</div>
        <button class="btn-primary" id="back-btn" style="max-width:200px;margin:16px auto;">← Back</button>
      </div>`;
      container.querySelector('#back-btn').addEventListener('click', () => {
        this.phase = 'setup';
        this.render(container);
      });
    }
  }

  // ─── FLASHCARD SESSION ───
  renderSession(container) {
    const w = this.words[this.currentIdx];
    if (!w) return;

    const settings = getSettings();
    const dev = settings.showDevanagari ? toDev(w.burmese_word) : '';
    const rating = this.ratings[w.id];
    const total = this.words.length;
    const progress = ((this.currentIdx + 1) / total * 100);

    // Determine what to show based on mode
    let primaryText;
    switch (this.mode) {
      case 'meaning': case 'writing':
        primaryText = w.english_meaning || '(no meaning)';
        break;
      case 'deva':
        primaryText = settings.showDevanagari ? toDev(w.burmese_word) : w.burmese_word;
        break;
      default:
        primaryText = w.burmese_word;
    }

    const fontSizeMap = { small: '32px', normal: '42px', large: '52px' };
    const fontSize = (this.mode === 'meaning' || this.mode === 'writing') ? '24px' : (fontSizeMap[settings.fontSize] || '42px');

    // Show sentence in word card after reading is revealed
    const devaLevel = w.hint ? 2 : 1; // deva is at level 2 if hint exists, level 1 if not
    const sentenceInCard = (this.revealLevel >= devaLevel && w.sentence)
      ? `<div style="font-size:14px;color:rgba(0,0,0,0.4);margin-top:8px;font-weight:400;">${w.sentence}</div>`
      : '';

    container.innerHTML = `
      <div class="pad-sm">
        <!-- Top bar -->
        <div class="fc-top">
          <div class="fc-title">📖 ${w.burmese_word} ${dev ? `<span>${dev}</span>` : ''}</div>
          <button class="fc-close" id="fc-close">✕</button>
        </div>
        <div class="fc-counter">${this.currentIdx + 1} / ${total}</div>

        <!-- Mode toggles -->
        <div style="display:flex; gap:5px; justify-content:center; margin-bottom:12px;">
          ${MODES.map(m => `
            <button class="mode-btn ${this.mode === m.id ? 'active' : ''}" data-mode="${m.id}"
              style="padding:5px 13px; border-radius:10px; font-size:11px; font-weight:700;">
              <span class="mode-icon" style="font-size:11px;">${m.icon}</span>
              ${this.mode === m.id ? `<span class="mode-text" style="margin:0 0 0 3px; font-size:10px;">${m.label}</span>` : ''}
            </button>
          `).join('')}
        </div>

        <!-- Word card -->
        <div class="word-card">
          <div class="word-card-text" style="font-size:${fontSize};">${primaryText}</div>
          ${sentenceInCard}
        </div>

        <!-- Reveal box -->
        <div class="reveal-box ${this.revealLevel > 0 ? 'revealed' : ''}" id="reveal-box">
          ${this.renderReveal(w, dev)}
        </div>

        <!-- Action row -->
        <div class="action-row">
          <button class="btn-story" id="btn-story">📝 My Story</button>
          <button class="btn-action" style="color:var(--orange);" id="btn-edit">✏️</button>
          <button class="btn-action" style="color:var(--pink);" id="btn-flag">🚩</button>
        </div>

        <!-- Rating -->
        <div style="text-align:center;font-size:12px;color:var(--text-muted);margin-bottom:8px;">Change Rating</div>
        <div style="display:flex;justify-content:center;gap:8px;margin-bottom:14px;">
          ${RATINGS.map((r, i) => {
            const isActive = rating === i;
            const isNope = i === 5;
            const size = '44px';
            const bg = isActive ? r.color : (isNope ? 'rgba(255,75,75,0.15)' : `${r.color}15`);
            const border = isActive ? r.color : (isNope ? 'rgba(255,75,75,0.4)' : 'var(--border)');
            const iconColor = isActive ? '#fff' : r.color;
            const radius = isNope ? '12px' : '22px';
            return `
              <button data-rating="${i}" style="
                width:${size};height:${size};border-radius:${radius};
                display:flex;align-items:center;justify-content:center;
                font-size:${isNope ? '18px' : '17px'};cursor:pointer;
                background:${bg};border:2px solid ${border};
                color:${iconColor};transition:all 0.15s;font-family:var(--font);
              ">${r.icon}</button>
            `;
          }).join('')}
        </div>

        <!-- Navigation -->
        <div class="nav-row">
          <button class="btn-nav btn-prev" id="btn-prev" ${this.currentIdx === 0 ? 'disabled' : ''}>← Prev</button>
          <button class="btn-nav btn-shuffle" id="btn-shuffle">🎲</button>
          <button class="btn-nav btn-next" id="btn-next">${this.currentIdx === this.words.length - 1 ? 'Finish ✓' : 'Next →'}</button>
        </div>

        <!-- Progress -->
        <div class="progress-bar">
          <div class="progress-fill" style="width:${progress}%;"></div>
        </div>

        <!-- Sentences -->
        <button class="sentences-toggle" id="btn-sentences">💬 Sentences${(this.sentenceCounts?.[w.id] || 0) > 0 ? ` (${this.sentenceCounts[w.id]} linked)` : ''} ▼</button>
      </div>
    `;

    this.bindSessionEvents(container, w, dev);
  }

  renderReveal(w, dev) {
    if (this.revealLevel === 0) {
      return '<div class="reveal-placeholder">👆 Tap to reveal</div>';
    }

    const settings = getSettings();
    const hasHint = !!w.hint;
    // Build reveal layers dynamically
    const layers = [];
    if (hasHint) layers.push({ type: 'hint', html: `<div style="text-align:center;font-size:14px;color:#1CB0F6;margin-bottom:6px;">💡 ${w.hint}</div>` });
    if (settings.showDevanagari && dev) {
      layers.push({ type: 'deva', html: `<div style="text-align:center;font-size:22px;font-weight:700;color:var(--yellow);margin-bottom:6px;">${dev}</div>` });
    }
    layers.push({ type: 'meaning', html: `<div style="text-align:center;font-size:20px;font-weight:700;color:var(--green);">${w.english_meaning || '(unknown)'}</div>` });

    const maxLevel = layers.length;
    let html = '';
    for (let i = 0; i < Math.min(this.revealLevel, maxLevel); i++) {
      html += layers[i].html;
    }

    if (this.revealLevel < maxLevel) {
      const next = layers[this.revealLevel]?.type;
      const label = next === 'deva' ? 'reading' : next === 'meaning' ? 'meaning' : '';
      html += `<div class="reveal-more">👆 tap to reveal ${label}</div>`;
    }

    return html;
  }

  getMaxRevealLevel(w) {
    const settings = getSettings();
    return (w.hint ? 1 : 0) + (settings.showDevanagari ? 1 : 0) + 1; // hint(optional) + deva(optional) + meaning
  }

  bindSessionEvents(container, word, dev) {
    // Close
    container.querySelector('#fc-close').addEventListener('click', () => {
      this.phase = 'setup';
      this.render(container);
    });

    // Mode toggles
    container.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.mode;
        this.render(container);
      });
    });

    // Reveal
    container.querySelector('#reveal-box').addEventListener('click', () => {
      const maxLevel = this.getMaxRevealLevel(word);
      if (this.revealLevel < maxLevel) {
        this.revealLevel++;
        const box = container.querySelector('#reveal-box');
        box.innerHTML = this.renderReveal(word, dev);
        if (this.revealLevel >= maxLevel) box.classList.add('revealed');
      }
    });

    // Ratings
    container.querySelectorAll('[data-rating]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const r = parseInt(btn.dataset.rating);
        this.ratings[word.id] = r;
        this.render(container);

        // Log to Supabase
        try {
          await db.logProgress({ type: 'rating', wordId: word.id, result: RATINGS[r].label });
          await db.upsertUserState(word.id, r);
        } catch { /* offline, skip */ }
      });
    });

    // Navigation
    container.querySelector('#btn-prev').addEventListener('click', () => {
      this.currentIdx = Math.max(0, this.currentIdx - 1);
      this.revealLevel = 0;
      this.render(container);
    });

    container.querySelector('#btn-next').addEventListener('click', () => {
      if (this.currentIdx >= this.words.length - 1) {
        // Last card → show session results
        this.phase = 'results';
        this.render(container);
        return;
      }
      this.currentIdx++;
      this.revealLevel = 0;
      this.render(container);
    });

    container.querySelector('#btn-shuffle').addEventListener('click', () => {
      this.currentIdx = Math.floor(Math.random() * this.words.length);
      this.revealLevel = 0;
      this.render(container);
    });

    // Story modal
    container.querySelector('#btn-story').addEventListener('click', () => this.showStoryModal(word));

    // Edit modal
    container.querySelector('#btn-edit').addEventListener('click', () => this.showEditModal(word));

    // Flag modal
    container.querySelector('#btn-flag').addEventListener('click', () => this.showFlagModal(word, dev));

    // Sentences
    container.querySelector('#btn-sentences').addEventListener('click', () => this.showSentencesModal(word));
  }

  // ─── SESSION RESULTS ───
  renderResults(container) {
    const total = this.words.length;
    const rated = Object.keys(this.ratings).length;
    const gotIt = Object.values(this.ratings).filter(r => r === 1 || r === 3).length; // Got it + Easy
    const fuzzy = Object.values(this.ratings).filter(r => r === 4).length;
    const nope = Object.values(this.ratings).filter(r => r === 5).length;
    const pct = total > 0 ? Math.round((gotIt / total) * 100) : 0;
    const emoji = pct >= 90 ? '🌟' : pct >= 70 ? '👏' : pct >= 50 ? '💪' : '📚';
    const msg = pct >= 90 ? 'Excellent!' : pct >= 70 ? 'Good job!' : pct >= 50 ? 'Keep going!' : 'Keep practicing!';
    const barColor = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--pink)';

    container.innerHTML = `
      <div class="pad">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:48px;margin-bottom:8px;">${emoji}</div>
          <div style="font-size:24px;font-weight:800;color:var(--text);">${msg}</div>
          <div style="font-size:14px;color:var(--text-muted);margin-top:4px;">
            ${rated} of ${total} words rated
          </div>
        </div>

        <div style="height:12px;background:var(--surface);border-radius:6px;margin-bottom:24px;padding:2px;border:2px solid var(--border);">
          <div style="height:100%;border-radius:4px;background:${barColor};width:${pct}%;transition:width 0.6s;"></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:24px;">
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--green);">${gotIt}</div>
            <div class="srs-stat-label">Got it / Easy</div>
          </div>
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--purple);">${fuzzy}</div>
            <div class="srs-stat-label">Fuzzy</div>
          </div>
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--pink);">${nope}</div>
            <div class="srs-stat-label">Nope</div>
          </div>
        </div>

        <div class="section-label" style="color:var(--text-muted);">Words</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px;">
          ${this.words.map(w => {
            const r = this.ratings[w.id];
            const rInfo = r !== undefined ? RATINGS[r] : null;
            const color = rInfo ? rInfo.color : 'var(--text-muted)';
            const label = rInfo ? rInfo.label : 'Not rated';
            const dev = toDev(w.burmese_word);
            return `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;
                background:var(--surface);border:2px solid var(--border);">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:16px;font-weight:700;color:var(--text);">${w.burmese_word}</div>
                  <div style="font-size:11px;color:var(--yellow);">${dev}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:13px;font-weight:700;color:${color};">${rInfo ? rInfo.icon : '—'} ${label}</div>
                  <div style="font-size:11px;color:var(--green);">${w.english_meaning || ''}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display:flex;gap:8px;">
          <button id="res-new" class="btn-nav btn-prev" style="flex:1;">New Session</button>
          <button id="res-done" class="btn-nav btn-next" style="flex:1;">Done ✓</button>
        </div>
      </div>
    `;

    container.querySelector('#res-new').addEventListener('click', () => {
      this.phase = 'setup';
      this.render(container);
    });

    container.querySelector('#res-done').addEventListener('click', () => {
      this.phase = 'setup';
      this.render(container);
    });
  }

  // ─── MODALS ───

  async showHubSpokeModal(word) {
    let anchors = [];
    let spokes = [];
    try {
      anchors = await db.getAnchorForWord(word.burmese_word);
      if (anchors.length > 0) {
        spokes = await db.getSpokesForAnchor(anchors[0].burmese_word);
      }
    } catch { /* offline */ }

    const hub = anchors[0];
    const hubWord = hub ? hub.burmese_word : '—';
    const hubMeaning = hub ? (hub.meaning || '') : 'No hub found';

    Modal.show(`
      <div class="modal-header">
        <div class="modal-title" style="color:var(--green);">🌿 ${hubWord}</div>
        <button class="modal-close" data-modal-close>✕ Close</button>
      </div>
      <div class="mb-4 input-label">Meaning</div>
      <div style="font-size:14px; color:var(--text); margin-bottom:14px;">${hubMeaning}</div>
      <div class="mb-8 input-label">Spokes (${spokes.length} words)</div>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
        ${spokes.length > 0 ? spokes.map(s => `
          <div style="padding:8px 16px; border-radius:12px; background:rgba(88,204,2,0.08); border:2px solid rgba(88,204,2,0.15);">
            <div style="font-size:16px; font-weight:700; color:var(--green);">${s.burmese_word}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${s.english_meaning || ''}</div>
          </div>
        `).join('') : '<div style="color:var(--text-muted); font-size:13px;">No spokes found</div>'}
      </div>
      <div style="display:flex; gap:8px;">
        <button style="flex:1; padding:10px; border-radius:12px; background:rgba(255,107,138,0.08); border:1px solid rgba(255,107,138,0.2); color:var(--pink); font-size:12px; font-weight:700; cursor:pointer; font-family:var(--font);">🚩 Wrong hub</button>
        <button style="flex:1; padding:10px; border-radius:12px; background:rgba(28,176,246,0.08); border:1px solid rgba(28,176,246,0.2); color:var(--blue); font-size:12px; font-weight:700; cursor:pointer; font-family:var(--font);">📝 Request story</button>
      </div>
    `, { borderColor: 'var(--green)' });
  }

  showStoryModal(word) {
    Modal.show(`
      <div class="modal-header">
        <div class="modal-title" style="color:var(--purple);">📝 My Story</div>
        <button class="modal-close" data-modal-close>✕ Close</button>
      </div>
      <div style="background:var(--bg); border-radius:12px; padding:10px 14px; margin-bottom:14px; border:1px solid var(--border);">
        <span style="font-size:16px; font-weight:700; color:var(--text);">${word.burmese_word}</span>
        <span style="font-size:12px; color:var(--blue); margin-left:6px;">${toDev(word.burmese_word)}</span>
        <div style="font-size:12px; color:var(--green); margin-top:3px;">${word.english_meaning || ''}</div>
      </div>
      <div class="input-label">Your mnemonic story</div>
      <textarea class="input-field mb-12" placeholder="Write a story to remember this word..." id="story-input"></textarea>
      <button class="btn-primary" style="background:var(--purple);">Save Story</button>
    `, { borderColor: 'var(--purple)' });
  }

  showEditModal(word) {
    Modal.show(`
      <div class="modal-header">
        <div class="modal-title" style="color:var(--orange);">✏️ Edit Word</div>
        <button class="modal-close" data-modal-close>✕ Close</button>
      </div>
      <div class="input-label">Hint</div>
      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <input class="input-field" placeholder="e.g. Used when greeting..." value="${word.hint || ''}" id="hint-input">
        <button style="padding:8px 16px; border-radius:12px; background:var(--orange); color:var(--bg); border:none; font-weight:700; cursor:pointer; font-family:var(--font); white-space:nowrap;">Save</button>
      </div>
      <div class="input-label">Burmese Sentence</div>
      <textarea class="input-field mb-12" placeholder="e.g. နေကောင်းပါတယ်" id="sentence-my-input"></textarea>
      <div class="input-label">English Meaning</div>
      <input class="input-field mb-12" placeholder="e.g. I'm doing well" id="meaning-input">
      <button class="btn-primary" style="background:var(--orange);">Save & Link</button>
    `, { borderColor: 'var(--orange)' });
  }

  showFlagModal(word, dev) {
    const box = Modal.show(`
      <div class="modal-header">
        <div class="modal-title" style="color:var(--pink);">🚩 Flag word issue</div>
        <button class="modal-close" data-modal-close>✕ Close</button>
      </div>
      <div style="background:var(--bg); border-radius:12px; padding:10px 14px; margin-bottom:14px; border:1px solid var(--border);">
        <span style="font-size:16px; font-weight:700; color:var(--text);">${word.burmese_word}</span>
        <span style="font-size:12px; color:var(--blue); margin-left:6px;">${dev}</span>
        <div style="font-size:12px; color:var(--green); margin-top:3px;">${word.english_meaning || ''}</div>
      </div>
      <div class="input-label mb-8">Issue type</div>
      <div class="issue-grid">
        <button class="issue-btn" data-issue="deva">
          <div class="issue-icon" style="color:var(--yellow);">द</div>
          <div class="issue-title">Wrong Deva</div>
          <div class="issue-desc">Transliteration wrong</div>
        </button>
        <button class="issue-btn" data-issue="meaning">
          <div class="issue-icon" style="color:var(--green);">En</div>
          <div class="issue-title">Wrong meaning</div>
          <div class="issue-desc">English is wrong</div>
        </button>
        <button class="issue-btn" data-issue="sentence">
          <div class="issue-icon" style="color:var(--blue);">文</div>
          <div class="issue-title">Bad sentence</div>
          <div class="issue-desc">Context issue</div>
        </button>
        <button class="issue-btn" data-issue="notaword">
          <div class="issue-icon" style="color:var(--pink);">✕</div>
          <div class="issue-title">Not a word</div>
          <div class="issue-desc">Shouldn't be here</div>
        </button>
      </div>
      <div class="input-label mb-4">Comment (what's wrong?)</div>
      <textarea class="input-field mb-12" placeholder="e.g. Devanagari should be..." id="flag-comment"></textarea>
      <button class="btn-primary" style="background:var(--pink);">🚩 Submit Flag</button>
    `, { borderColor: 'var(--pink)' });

    // Issue type selection
    if (box) {
      box.querySelectorAll('[data-issue]').forEach(btn => {
        btn.addEventListener('click', () => {
          box.querySelectorAll('[data-issue]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    }
  }

  async showSentencesModal(word) {
    const settings = getSettings();
    // Show loading
    Modal.show(`
      <div class="modal-header">
        <div class="modal-title" style="color:var(--blue);">💬 Sentences</div>
        <button class="modal-close" data-modal-close>✕ Close</button>
      </div>
      <div style="text-align:center;padding:30px;color:var(--text-muted);">Loading...</div>
    `, { borderColor: 'var(--blue)' });

    // Load data
    let linkedIds = new Set();
    let linkedSentences = [];
    let textMatched = [];

    try {
      const links = await db.getSentencesForWord(word.id);
      linkedSentences = links
        .filter(link => link.burmese_app_sentences?.burmese_text)
        .map(link => ({ ...link.burmese_app_sentences, rating: link.rating || 0 }));
      linkedIds = new Set(linkedSentences.map(s => s.id));
    } catch { /* junction table may not have RLS yet */ }

    try {
      textMatched = await db.searchSentencesByText(word.burmese_word);
      textMatched = textMatched.filter(s => !linkedIds.has(s.id));
    } catch { /* offline */ }

    const total = linkedSentences.length + textMatched.length;
    const renderStars = (sid, rating) => [1,2,3].map(n =>
      `<button class="sent-star" data-sid="${sid}" data-star="${n}" style="
        font-size:16px;background:none;border:none;cursor:pointer;padding:2px;color:${n <= rating ? '#FFC800' : 'var(--border)'};
      ">${n <= rating ? '★' : '☆'}</button>`
    ).join('');

    // Close loading modal, open real one
    Modal.close();
    const box = Modal.show(`
      <div class="modal-header">
        <div class="modal-title" style="color:var(--blue);">💬 Sentences (${total})</div>
        <button class="modal-close" data-modal-close>✕ Close</button>
      </div>
      <div style="background:var(--bg); border-radius:12px; padding:10px 14px; margin-bottom:14px; border:1px solid var(--border);">
        <span style="font-size:16px; font-weight:700;">${word.burmese_word}</span>
        <span style="font-size:12px; color:var(--green); margin-left:6px;">${word.english_meaning || ''}</span>
      </div>

      ${linkedSentences.length > 0 ? `
        <div style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">✓ Linked (${linkedSentences.length})</div>
        ${linkedSentences.map(s => `
          <div class="sent-card" data-sid="${s.id}" style="padding:10px 12px;border-radius:12px;background:rgba(88,204,2,0.06);border:2px solid rgba(88,204,2,0.2);margin-bottom:6px;">
            <div style="display:flex;align-items:start;gap:8px;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:3px;">${s.burmese_text}</div>
                ${settings.showDevanagari ? `<div style="font-size:12px;color:var(--yellow);margin-bottom:3px;">${toDev(s.burmese_text)}</div>` : ''}
                <div style="font-size:12px;color:var(--text-muted);">${s.english_text || ''}</div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                <div class="sent-stars" data-sid="${s.id}">${renderStars(s.id, s.rating)}</div>
                <button class="sent-unlink" data-sid="${s.id}" style="padding:2px 6px;border-radius:6px;font-size:9px;font-weight:700;
                  background:rgba(255,107,138,0.1);border:1px solid rgba(255,107,138,0.25);color:var(--pink);cursor:pointer;font-family:var(--font);">✕</button>
              </div>
            </div>
          </div>
        `).join('')}
      ` : ''}

      ${textMatched.length > 0 ? `
        <div style="font-size:10px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:1px;margin:${linkedSentences.length > 0 ? '12px' : '0'} 0 6px;">Found in text (${textMatched.length})</div>
        ${textMatched.map(s => `
          <div class="sent-card" data-sid="${s.id}" style="padding:10px 12px;border-radius:12px;background:var(--surface);border:2px solid var(--border);margin-bottom:6px;">
            <div style="display:flex;align-items:start;gap:8px;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:3px;">${s.burmese_text}</div>
                ${settings.showDevanagari ? `<div style="font-size:12px;color:var(--yellow);margin-bottom:3px;">${toDev(s.burmese_text)}</div>` : ''}
                <div style="font-size:12px;color:var(--text-muted);">${s.english_text || ''}</div>
              </div>
              <button class="sent-link" data-sid="${s.id}" style="padding:4px 8px;border-radius:8px;font-size:10px;font-weight:700;
                background:rgba(28,176,246,0.1);border:1px solid rgba(28,176,246,0.25);color:var(--blue);cursor:pointer;font-family:var(--font);white-space:nowrap;">+ Link</button>
            </div>
          </div>
        `).join('')}
      ` : ''}

      ${total === 0 ? '<div style="color:var(--text-muted);text-align:center;padding:20px;font-size:13px;">No sentences contain this word</div>' : ''}
    `, { borderColor: 'var(--blue)' });

    if (!box) return;

    // Link buttons
    box.querySelectorAll('.sent-link').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sid = parseInt(btn.dataset.sid);
        try {
          await db.linkWordSentence(word.id, sid);
          btn.textContent = '✓';
          btn.style.color = 'var(--green)';
          btn.style.borderColor = 'rgba(88,204,2,0.25)';
          btn.style.background = 'rgba(88,204,2,0.1)';
          btn.disabled = true;
          // Update card style
          const card = btn.closest('.sent-card');
          if (card) {
            card.style.borderColor = 'rgba(88,204,2,0.2)';
            card.style.background = 'rgba(88,204,2,0.06)';
          }
          this.sentenceCounts[word.id] = (this.sentenceCounts[word.id] || 0) + 1;
        } catch (e) {
          btn.textContent = 'Error';
          btn.style.color = 'var(--pink)';
        }
      });
    });

    // Unlink buttons
    box.querySelectorAll('.sent-unlink').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sid = parseInt(btn.dataset.sid);
        try {
          await db.unlinkWordSentence(word.id, sid);
          const card = btn.closest('.sent-card');
          if (card) {
            card.style.opacity = '0.3';
            card.style.pointerEvents = 'none';
          }
          this.sentenceCounts[word.id] = Math.max(0, (this.sentenceCounts[word.id] || 0) - 1);
        } catch (e) {
          btn.textContent = 'Err';
        }
      });
    });

    // Star rating buttons
    box.querySelectorAll('.sent-star').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sid = parseInt(btn.dataset.sid);
        const star = parseInt(btn.dataset.star);
        // Toggle: if tapping the same star that's already the rating, set to 0
        const starsContainer = btn.closest('.sent-stars');
        const currentStars = starsContainer.querySelectorAll('.sent-star');
        const currentRating = Array.from(currentStars).filter(s => s.textContent === '★').length;
        const newRating = (star === currentRating) ? 0 : star;

        try {
          await db.rateSentenceLink(word.id, sid, newRating);
          // Update star display
          currentStars.forEach(s => {
            const n = parseInt(s.dataset.star);
            s.textContent = n <= newRating ? '★' : '☆';
            s.style.color = n <= newRating ? '#FFC800' : 'var(--border)';
          });
        } catch { /* offline */ }
      });
    });
  }
}
