// ═══ QUIZ MODULE ═══
// Three modes: MCQ, Typing, Matching
// Launched from Study tab setup screen

import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';

const QUIZ_MODES = [
  { id: 'mcq', label: 'Multiple Choice', icon: '🔘', color: '#1CB0F6', desc: 'Pick the correct answer' },
  { id: 'typing', label: 'Type Answer', icon: '⌨️', color: '#58CC02', desc: 'Type the meaning or word' },
  { id: 'matching', label: 'Match Pairs', icon: '🔗', color: '#CE82FF', desc: 'Match words to meanings' },
];

export class Quiz {
  constructor(app, words, onExit) {
    this.app = app;
    this.allWords = words;
    this.onExit = onExit;
    this.mode = null;
    this.questionCount = 10;
    this.questions = [];
    this.currentIdx = 0;
    this.score = 0;
    this.answers = [];
    this.phase = 'setup'; // setup | active | results
    this.selectedAnswer = null;
    this.typedAnswer = '';
    this.matchState = null;
    this.timer = null;
    this.timeLeft = 0;
  }

  render(container) {
    switch (this.phase) {
      case 'setup': return this.renderSetup(container);
      case 'active': return this.renderQuestion(container);
      case 'results': return this.renderResults(container);
    }
  }

  // ─── SETUP ───
  renderSetup(container) {
    container.innerHTML = `
      <div class="pad">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;">
          <button id="quiz-back" style="background:var(--surface); border:2px solid var(--border); border-radius:10px;
            color:var(--text-muted); cursor:pointer; font-size:12px; padding:6px 12px; font-weight:700; font-family:var(--font);">
            ← Back
          </button>
          <div>
            <div style="font-size:20px; font-weight:800;">🧠 Quiz</div>
            <div style="font-size:12px; color:var(--text-muted);">${this.allWords.length} words available</div>
          </div>
        </div>

        <!-- Quiz mode -->
        <div class="section-label" style="color:var(--blue);">Quiz type</div>
        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:22px;">
          ${QUIZ_MODES.map(m => `
            <button class="quiz-mode-btn" data-qmode="${m.id}" style="
              display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:14px;
              background:${this.mode === m.id ? `${m.color}12` : 'var(--surface)'};
              border:2px solid ${this.mode === m.id ? m.color : 'var(--border)'};
              cursor:pointer; width:100%; text-align:left; font-family:var(--font);
              transition:all 0.2s;
            ">
              <div style="font-size:24px; width:44px; height:44px; border-radius:12px;
                background:${m.color}18; border:2px solid ${m.color}30;
                display:flex; align-items:center; justify-content:center;">${m.icon}</div>
              <div style="flex:1;">
                <div style="font-size:14px; font-weight:700; color:var(--text);">${m.label}</div>
                <div style="font-size:11px; color:var(--text-muted);">${m.desc}</div>
              </div>
              ${this.mode === m.id ? `<div style="width:10px; height:10px; border-radius:5px; background:${m.color};"></div>` : ''}
            </button>
          `).join('')}
        </div>

        <!-- Question count -->
        <div class="section-label" style="color:var(--green);">Questions</div>
        <div class="num-row" style="margin-bottom:24px;">
          ${[5, 10, 15, 20].map(n => `
            <button class="num-btn ${this.questionCount === n ? 'active' : ''}" data-qcount="${n}">${n}</button>
          `).join('')}
        </div>

        <!-- Start -->
        <button id="quiz-start" class="btn-primary" ${!this.mode ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
          Start Quiz →
        </button>
      </div>
    `;

    container.querySelector('#quiz-back').addEventListener('click', () => this.onExit());

    container.querySelectorAll('[data-qmode]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.qmode;
        this.render(container);
      });
    });

    container.querySelectorAll('[data-qcount]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.questionCount = parseInt(btn.dataset.qcount);
        this.render(container);
      });
    });

    container.querySelector('#quiz-start').addEventListener('click', () => {
      if (!this.mode) return;
      this.generateQuestions();
      this.phase = 'active';
      this.currentIdx = 0;
      this.score = 0;
      this.answers = [];
      this.render(container);
    });
  }

  // ─── GENERATE QUESTIONS ───
  generateQuestions() {
    const shuffled = [...this.allWords].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, this.questionCount);
    this.questions = [];

    if (this.mode === 'matching') {
      // Generate matching rounds (6 pairs each)
      const pairsPerRound = 6;
      const rounds = Math.ceil(selected.length / pairsPerRound);
      for (let r = 0; r < rounds; r++) {
        const start = r * pairsPerRound;
        const pairs = selected.slice(start, start + pairsPerRound);
        if (pairs.length >= 3) {
          this.questions.push({ type: 'matching', pairs });
        }
      }
    } else {
      for (const word of selected) {
        // Generate distractors from same pool
        const others = this.allWords.filter(w => w.id !== word.id);
        const distractors = others.sort(() => Math.random() - 0.5).slice(0, 3);

        if (this.mode === 'mcq') {
          // Random direction: burmese→english or english→burmese
          const direction = Math.random() > 0.5 ? 'b2e' : 'e2b';
          const options = [...distractors.map(d => ({
            id: d.id,
            text: direction === 'b2e' ? (d.english_meaning || '—') : d.burmese_word,
            correct: false
          })), {
            id: word.id,
            text: direction === 'b2e' ? (word.english_meaning || '—') : word.burmese_word,
            correct: true
          }].sort(() => Math.random() - 0.5);

          this.questions.push({
            type: 'mcq',
            direction,
            word,
            prompt: direction === 'b2e' ? word.burmese_word : (word.english_meaning || '—'),
            promptSub: direction === 'b2e' ? toDev(word.burmese_word) : '',
            options
          });
        } else {
          // Typing: show burmese, type english
          this.questions.push({
            type: 'typing',
            word,
            prompt: word.burmese_word,
            promptSub: toDev(word.burmese_word),
            answer: (word.english_meaning || '').toLowerCase().trim()
          });
        }
      }
    }
  }

  // ─── RENDER QUESTION ───
  renderQuestion(container) {
    const q = this.questions[this.currentIdx];
    if (!q) return this.showResults(container);

    const modeInfo = QUIZ_MODES.find(m => m.id === this.mode);
    const progress = ((this.currentIdx) / this.questions.length * 100);

    if (q.type === 'matching') {
      return this.renderMatching(container, q, modeInfo, progress);
    }

    const answered = this.selectedAnswer !== null || this.answers[this.currentIdx] !== undefined;
    const isCorrect = this.answers[this.currentIdx]?.correct;

    container.innerHTML = `
      <div class="pad-sm">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <button id="q-exit" style="background:var(--surface); border:2px solid var(--border); border-radius:10px;
            color:var(--text-muted); cursor:pointer; font-size:12px; padding:5px 12px; font-weight:700; font-family:var(--font);">
            ✕ Exit
          </button>
          <div style="font-size:13px; color:var(--text-muted); font-weight:600;">
            ${this.currentIdx + 1} / ${this.questions.length}
          </div>
          <div style="display:flex; align-items:center; gap:6px;
            background:var(--green)18; padding:4px 12px; border-radius:10px; border:1px solid var(--green)30;">
            <span style="font-size:14px; font-weight:800; color:var(--green);">${this.score}</span>
            <span style="font-size:11px; color:var(--text-muted);">correct</span>
          </div>
        </div>

        <!-- Progress -->
        <div style="height:8px; background:var(--surface); border-radius:5px; margin-bottom:16px; padding:2px; border:2px solid var(--border);">
          <div style="height:100%; border-radius:3px; background:${modeInfo.color}; width:${progress}%; transition:width 0.4s;"></div>
        </div>

        <!-- Prompt card -->
        <div style="background:var(--card-bg); border-radius:18px; padding:28px 20px; text-align:center;
          margin-bottom:16px; border:3px solid ${modeInfo.color};">
          <div style="font-size:11px; color:#8B7355; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px;">
            ${q.direction === 'e2b' ? 'What is this in Burmese?' : 'What does this mean?'}
          </div>
          <div style="font-size:${q.direction === 'e2b' ? '22px' : '38px'}; font-weight:800; color:var(--card-text);">
            ${q.prompt}
          </div>
          ${q.promptSub ? `<div style="font-size:14px; color:#8B7355; margin-top:6px;">${q.promptSub}</div>` : ''}
        </div>

        <!-- Answer area -->
        ${q.type === 'mcq' ? this.renderMCQ(q, answered, isCorrect) : this.renderTyping(q, answered, isCorrect)}

        <!-- Next button (after answer) -->
        ${answered ? `
          <button id="q-next" class="btn-primary" style="margin-top:12px;
            background:${isCorrect ? 'var(--green)' : 'var(--blue)'};">
            ${this.currentIdx < this.questions.length - 1 ? 'Next →' : 'See Results'}
          </button>
        ` : ''}
      </div>
    `;

    this.bindQuestionEvents(container, q);
  }

  renderMCQ(q, answered) {
    return `
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${q.options.map((opt, i) => {
          let bg = 'var(--surface)';
          let border = 'var(--border)';
          let textColor = 'var(--text)';
          if (answered) {
            if (opt.correct) { bg = 'var(--green)18'; border = 'var(--green)'; textColor = 'var(--green)'; }
            else if (this.selectedAnswer === i && !opt.correct) { bg = 'var(--pink)18'; border = 'var(--pink)'; textColor = 'var(--pink)'; }
          } else if (this.selectedAnswer === i) {
            bg = 'var(--blue)12'; border = 'var(--blue)';
          }
          return `
            <button class="mcq-opt" data-opt="${i}" ${answered ? 'disabled' : ''} style="
              display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:14px;
              background:${bg}; border:2px solid ${border};
              cursor:${answered ? 'default' : 'pointer'}; width:100%; text-align:left; font-family:var(--font);
            ">
              <div style="width:28px; height:28px; border-radius:8px; background:var(--surface);
                border:2px solid ${border}; display:flex; align-items:center; justify-content:center;
                font-size:13px; font-weight:800; color:${textColor};">
                ${answered ? (opt.correct ? '✓' : (this.selectedAnswer === i ? '✗' : '')) : String.fromCharCode(65 + i)}
              </div>
              <span style="font-size:15px; font-weight:600; color:${textColor};">${opt.text}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  renderTyping(q, answered, isCorrect) {
    return `
      <div style="margin-bottom:8px;">
        <div class="input-label" style="margin-bottom:6px;">Type the English meaning</div>
        <div style="display:flex; gap:8px;">
          <input class="input-field" id="type-input" placeholder="Type your answer..."
            value="${this.typedAnswer}" ${answered ? 'disabled' : ''} 
            style="flex:1; font-size:16px; ${answered ? (isCorrect ? 'border-color:var(--green);' : 'border-color:var(--pink);') : ''}">
          ${!answered ? `
            <button id="type-submit" style="padding:10px 18px; border-radius:12px; background:var(--blue);
              color:var(--bg); border:none; font-weight:800; cursor:pointer; font-family:var(--font); font-size:14px;">
              Check
            </button>
          ` : ''}
        </div>
        ${answered ? `
          <div style="margin-top:10px; padding:12px 16px; border-radius:12px;
            background:${isCorrect ? 'var(--green)12' : 'var(--pink)12'};
            border:2px solid ${isCorrect ? 'var(--green)' : 'var(--pink)'};">
            <div style="font-size:13px; font-weight:800; color:${isCorrect ? 'var(--green)' : 'var(--pink)'};">
              ${isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
            ${!isCorrect ? `
              <div style="font-size:14px; color:var(--text); margin-top:4px;">
                Answer: <strong style="color:var(--green);">${q.answer}</strong>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  // ─── MATCHING ───
  renderMatching(container, q, modeInfo, progress) {
    if (!this.matchState) {
      this.matchState = this.initMatchState(q.pairs);
    }
    const ms = this.matchState;
    const allMatched = ms.matched.length === q.pairs.length;

    container.innerHTML = `
      <div class="pad-sm">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <button id="q-exit" style="background:var(--surface); border:2px solid var(--border); border-radius:10px;
            color:var(--text-muted); cursor:pointer; font-size:12px; padding:5px 12px; font-weight:700; font-family:var(--font);">
            ✕ Exit
          </button>
          <div style="font-size:13px; color:var(--text-muted); font-weight:600;">
            Round ${this.currentIdx + 1} / ${this.questions.length}
          </div>
          <div style="font-size:13px; font-weight:800; color:var(--green);">
            ${ms.matched.length} / ${q.pairs.length}
          </div>
        </div>

        <div style="height:8px; background:var(--surface); border-radius:5px; margin-bottom:12px; padding:2px; border:2px solid var(--border);">
          <div style="height:100%; border-radius:3px; background:${modeInfo.color}; width:${progress}%; transition:width 0.4s;"></div>
        </div>

        <div style="font-size:12px; color:var(--text-muted); text-align:center; margin-bottom:14px; font-weight:600;">
          Tap a Burmese word, then tap its English meaning
        </div>

        <!-- Two columns -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <!-- Left: Burmese -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${ms.leftItems.map((item, i) => {
              const isMatched = ms.matched.includes(item.id);
              const isSelected = ms.selectedLeft === i;
              const isWrong = ms.wrongLeft === i;
              return `
                <button class="match-left" data-mleft="${i}" ${isMatched ? 'disabled' : ''} style="
                  padding:12px 10px; border-radius:12px; text-align:center;
                  background:${isMatched ? 'var(--green)12' : isSelected ? 'var(--blue)15' : isWrong ? 'var(--pink)15' : 'var(--surface)'};
                  border:2px solid ${isMatched ? 'var(--green)' : isSelected ? 'var(--blue)' : isWrong ? 'var(--pink)' : 'var(--border)'};
                  cursor:${isMatched ? 'default' : 'pointer'}; font-family:var(--font);
                  opacity:${isMatched ? '0.5' : '1'}; transition:all 0.15s;
                ">
                  <div style="font-size:16px; font-weight:700; color:${isMatched ? 'var(--green)' : 'var(--text)'};">${item.burmese}</div>
                  <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">${item.deva}</div>
                </button>
              `;
            }).join('')}
          </div>
          <!-- Right: English -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${ms.rightItems.map((item, i) => {
              const isMatched = ms.matched.includes(item.id);
              const isSelected = ms.selectedRight === i;
              const isWrong = ms.wrongRight === i;
              return `
                <button class="match-right" data-mright="${i}" ${isMatched ? 'disabled' : ''} style="
                  padding:12px 10px; border-radius:12px; text-align:center;
                  background:${isMatched ? 'var(--green)12' : isSelected ? 'var(--blue)15' : isWrong ? 'var(--pink)15' : 'var(--surface)'};
                  border:2px solid ${isMatched ? 'var(--green)' : isSelected ? 'var(--blue)' : isWrong ? 'var(--pink)' : 'var(--border)'};
                  cursor:${isMatched ? 'default' : 'pointer'}; font-family:var(--font);
                  opacity:${isMatched ? '0.5' : '1'}; transition:all 0.15s;
                ">
                  <div style="font-size:13px; font-weight:600; color:${isMatched ? 'var(--green)' : 'var(--text)'};">${item.english}</div>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        ${allMatched ? `
          <button id="q-next" class="btn-primary" style="margin-top:16px; background:var(--green);">
            ${this.currentIdx < this.questions.length - 1 ? 'Next Round →' : 'See Results'}
          </button>
        ` : ''}
      </div>
    `;

    this.bindMatchEvents(container, q);
  }

  initMatchState(pairs) {
    const leftItems = pairs.map(w => ({
      id: w.id, burmese: w.burmese_word, deva: toDev(w.burmese_word)
    })).sort(() => Math.random() - 0.5);

    const rightItems = pairs.map(w => ({
      id: w.id, english: w.english_meaning || '—'
    })).sort(() => Math.random() - 0.5);

    return { leftItems, rightItems, matched: [], selectedLeft: null, selectedRight: null, wrongLeft: null, wrongRight: null, errors: 0 };
  }

  // ─── EVENT BINDING ───
  bindQuestionEvents(container, q) {
    container.querySelector('#q-exit')?.addEventListener('click', () => this.onExit());

    // MCQ options
    container.querySelectorAll('.mcq-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.opt);
        if (this.answers[this.currentIdx] !== undefined) return;

        this.selectedAnswer = idx;
        const isCorrect = q.options[idx].correct;
        if (isCorrect) this.score++;
        this.answers[this.currentIdx] = { selected: idx, correct: isCorrect, word: q.word };

        // Log to Supabase
        try {
          await db.logProgress({ type: 'quiz_mcq', wordId: q.word.id, result: isCorrect ? 'correct' : 'incorrect' });
          await db.upsertUserState(q.word.id, isCorrect ? 1 : 5);
        } catch (err) { console.error('Quiz save error:', err); }

        this.render(container);
      });
    });

    // Typing submit
    const typeInput = container.querySelector('#type-input');
    const typeSubmit = container.querySelector('#type-submit');
    if (typeInput && typeSubmit) {
      const doSubmit = () => {
        if (this.answers[this.currentIdx] !== undefined) return;
        this.typedAnswer = typeInput.value.trim();
        const isCorrect = this.checkTypedAnswer(this.typedAnswer, q.answer);
        if (isCorrect) this.score++;
        this.answers[this.currentIdx] = { typed: this.typedAnswer, correct: isCorrect, word: q.word };

        try {
          await db.logProgress({ type: 'quiz_typing', wordId: q.word.id, result: isCorrect ? 'correct' : 'incorrect' });
          await db.upsertUserState(q.word.id, isCorrect ? 1 : 5);
        } catch (err) { console.error('Quiz save error:', err); }

        this.render(container);
      };
      typeSubmit.addEventListener('click', doSubmit);
      typeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSubmit(); });
      typeInput.focus();
    }

    // Next button
    container.querySelector('#q-next')?.addEventListener('click', () => {
      this.currentIdx++;
      this.selectedAnswer = null;
      this.typedAnswer = '';
      this.matchState = null;
      if (this.currentIdx >= this.questions.length) {
        this.phase = 'results';
      }
      this.render(container);
    });
  }

  bindMatchEvents(container, q) {
    container.querySelector('#q-exit')?.addEventListener('click', () => this.onExit());

    const ms = this.matchState;

    container.querySelectorAll('.match-left').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.mleft);
        if (ms.matched.includes(ms.leftItems[i].id)) return;
        ms.selectedLeft = i;
        ms.wrongLeft = null;
        ms.wrongRight = null;

        if (ms.selectedRight !== null) {
          this.checkMatch(container, q);
        } else {
          this.render(container);
        }
      });
    });

    container.querySelectorAll('.match-right').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.mright);
        if (ms.matched.includes(ms.rightItems[i].id)) return;
        ms.selectedRight = i;
        ms.wrongLeft = null;
        ms.wrongRight = null;

        if (ms.selectedLeft !== null) {
          this.checkMatch(container, q);
        } else {
          this.render(container);
        }
      });
    });

    container.querySelector('#q-next')?.addEventListener('click', () => {
      this.currentIdx++;
      this.matchState = null;
      if (this.currentIdx >= this.questions.length) {
        this.score = q.pairs.length - (this.matchState?.errors || 0);
        this.phase = 'results';
      }
      this.render(container);
    });
  }

  checkMatch(container, q) {
    const ms = this.matchState;
    const leftId = ms.leftItems[ms.selectedLeft].id;
    const rightId = ms.rightItems[ms.selectedRight].id;

    if (leftId === rightId) {
      ms.matched.push(leftId);
      ms.selectedLeft = null;
      ms.selectedRight = null;
      this.score++;
      // Save correct match to Supabase
      try {
        db.logProgress({ type: 'quiz_matching', wordId: leftId, result: 'correct' });
        db.upsertUserState(leftId, 1);
      } catch {}
    } else {
      ms.wrongLeft = ms.selectedLeft;
      ms.wrongRight = ms.selectedRight;
      ms.errors = (ms.errors || 0) + 1;
      ms.selectedLeft = null;
      ms.selectedRight = null;
      // Save wrong match to Supabase
      try {
        db.logProgress({ type: 'quiz_matching', wordId: leftId, result: 'incorrect' });
      } catch {}

      // Flash wrong then clear
      this.render(container);
      setTimeout(() => {
        ms.wrongLeft = null;
        ms.wrongRight = null;
        this.render(container);
      }, 600);
      return;
    }
    this.render(container);
  }

  checkTypedAnswer(typed, correct) {
    if (!typed || !correct) return false;
    const t = typed.toLowerCase().trim();
    const c = correct.toLowerCase().trim();
    // Exact match
    if (t === c) return true;
    // Contains match (for multi-word meanings like "to go, to walk")
    const parts = c.split(/[,;\/]/).map(p => p.trim().toLowerCase());
    if (parts.some(p => p === t)) return true;
    // Fuzzy: allow minor typos (1 char diff for words > 4 chars)
    if (t.length > 4 && c.length > 4) {
      let diff = 0;
      const shorter = t.length < c.length ? t : c;
      const longer = t.length < c.length ? c : t;
      if (Math.abs(t.length - c.length) <= 1) {
        for (let i = 0; i < shorter.length; i++) {
          if (shorter[i] !== longer[i]) diff++;
        }
        if (diff <= 1) return true;
      }
    }
    return false;
  }

  // ─── RESULTS ───
  renderResults(container) {
    const total = this.mode === 'matching'
      ? this.questions.reduce((sum, q) => sum + q.pairs.length, 0)
      : this.questions.length;
    const pct = Math.round((this.score / total) * 100);
    const emoji = pct >= 90 ? '🌟' : pct >= 70 ? '👏' : pct >= 50 ? '💪' : '📚';
    const msg = pct >= 90 ? 'Excellent!' : pct >= 70 ? 'Good job!' : pct >= 50 ? 'Keep going!' : 'Keep practicing!';
    const barColor = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--pink)';

    // Collect wrong answers for review
    const wrong = this.answers.filter(a => a && !a.correct && a.word);

    container.innerHTML = `
      <div class="pad">
        <div style="text-align:center; margin-bottom:24px;">
          <div style="font-size:48px; margin-bottom:8px;">${emoji}</div>
          <div style="font-size:24px; font-weight:800; color:var(--text);">${msg}</div>
          <div style="font-size:14px; color:var(--text-muted); margin-top:4px;">
            ${this.score} / ${total} correct
          </div>
        </div>

        <!-- Score bar -->
        <div style="height:12px; background:var(--surface); border-radius:6px; margin-bottom:24px; padding:2px; border:2px solid var(--border);">
          <div style="height:100%; border-radius:4px; background:${barColor}; width:${pct}%; transition:width 0.6s;"></div>
        </div>

        <!-- Stats -->
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:24px;">
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--green);">${this.score}</div>
            <div class="srs-stat-label">Correct</div>
          </div>
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--pink);">${total - this.score}</div>
            <div class="srs-stat-label">Wrong</div>
          </div>
          <div class="srs-stat">
            <div class="srs-stat-num" style="color:var(--blue);">${pct}%</div>
            <div class="srs-stat-label">Score</div>
          </div>
        </div>

        <!-- Wrong answers review -->
        ${wrong.length > 0 ? `
          <div class="section-label" style="color:var(--pink);">Review mistakes</div>
          <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:20px;">
            ${wrong.map(a => `
              <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:12px;
                background:var(--surface); border:2px solid var(--border);">
                <div style="font-size:16px; font-weight:700; color:var(--text);">${a.word.burmese_word}</div>
                <div style="font-size:11px; color:var(--yellow);">${toDev(a.word.burmese_word)}</div>
                <div style="flex:1; text-align:right; font-size:13px; color:var(--green);">${a.word.english_meaning || '—'}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Actions -->
        <div style="display:flex; gap:8px;">
          <button id="res-retry" class="btn-nav btn-prev" style="flex:1;">🔄 Retry</button>
          <button id="res-done" class="btn-nav btn-next" style="flex:1;">Done ✓</button>
        </div>
      </div>
    `;

    container.querySelector('#res-retry').addEventListener('click', () => {
      this.phase = 'setup';
      this.render(container);
    });

    container.querySelector('#res-done').addEventListener('click', () => this.onExit());
  }

  showResults(container) {
    this.phase = 'results';
    this.render(container);
  }
}
