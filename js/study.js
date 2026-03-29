// ═══ STUDY TAB ═══
import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';
import { Modal } from './modal.js';
import { Quiz } from './quiz.js';

const MODES = [
  { id: 'burmese', icon: 'မ', label: 'Myanmar→EN' },
  { id: 'deva', icon: 'द', label: 'Deva→Myanmar' },
  { id: 'meaning', icon: 'En', label: 'EN→Myanmar' },
  { id: 'writing', icon: '✍', label: 'Write' }
];

const SOURCES = [
  { id: 'kg_book', name: 'KG Book', icon: '🪷', color: '#FF6B8A' },
  { id: 'main_words', name: 'Main Words', icon: '💬', color: '#58CC02' },
  { id: 'dictionary', name: 'Dictionary', icon: '📚', color: '#FFC800' },
  { id: 'recipes', name: 'Recipes', icon: '🍜', color: '#CE82FF' },
  { id: 'colloquial', name: 'Colloquial Burmese', icon: '🎓', color: '#5A7A88', disabled: true }
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

    const dev = toDev(w.burmese_word);
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
        primaryText = dev;
        break;
      default:
        primaryText = w.burmese_word;
    }

    const fontSize = (this.mode === 'meaning' || this.mode === 'writing') ? '24px' : '42px';

    // Show sentence in word card after reading is revealed
    const devaLevel = w.hint ? 2 : 1; // deva is at level 2 if hint exists, level 1 if not
    const sentenceInCard = (this.revealLevel >= devaLevel && w.sentence)
      ? `<div style="font-size:14px;color:rgba(0,0,0,0.4);margin-top:8px;font-weight:400;">${w.sentence}</div>`
      : '';

    container.innerHTML = `
      <div class="pad-sm">
        <!-- Top bar -->
        <div class="fc-top">
          <div class="fc-title">📖 ${w.burmese_word} <span>${dev}</span></div>
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
          <button class="btn-nav btn-next" id="btn-next">Next →</button>
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

    const hasHint = !!w.hint;
    // Build reveal layers dynamically
    const layers = [];
    if (hasHint) layers.push({ type: 'hint', html: `<div style="text-align:center;font-size:14px;color:#1CB0F6;margin-bottom:6px;">💡 ${w.hint}</div>` });
    layers.push({ type: 'deva', html: `<div style="text-align:center;font-size:22px;font-weight:700;color:var(--yellow);margin-bottom:6px;">${dev}</div>` });
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
    return (w.hint ? 1 : 0) + 2; // hint(optional) + deva + meaning
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
      this.currentIdx = Math.min(this.words.length - 1, this.currentIdx + 1);
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
    let sentences = [];
    try {
      const links = await db.getSentencesForWord(word.id);
      // Extract sentence data from junction response
      sentences = links
        .map(link => link.burmese_app_sentences)
        .filter(s => s && s.burmese_text);
    } catch { /* offline */ }

    Modal.show(`
      <div class="modal-header">
        <div class="modal-title" style="color:var(--blue);">💬 Sentences (${sentences.length})</div>
        <button class="modal-close" data-modal-close>✕ Close</button>
      </div>
      <div style="background:var(--bg); border-radius:12px; padding:10px 14px; margin-bottom:14px; border:1px solid var(--border);">
        <span style="font-size:16px; font-weight:700;">${word.burmese_word}</span>
        <span style="font-size:12px; color:var(--green); margin-left:6px;">${word.english_meaning || ''}</span>
      </div>
      ${sentences.length > 0 ? sentences.map(s => `
        <div style="padding:12px; border-radius:12px; background:var(--bg); border:1px solid var(--border); margin-bottom:8px;">
          <div style="font-size:15px; font-weight:600; color:var(--text); margin-bottom:4px;">${s.burmese_text}</div>
          <div style="font-size:13px; color:var(--text-muted);">${s.english_text || ''}</div>
        </div>
      `).join('') : '<div style="color:var(--text-muted); text-align:center; padding:20px; font-size:13px;">No sentences linked</div>'}
    `, { borderColor: 'var(--blue)' });
  }
}
