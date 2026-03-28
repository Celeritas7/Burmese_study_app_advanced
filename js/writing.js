// ═══ WRITING PRACTICE ═══
// Canvas-based tracing for Burmese consonants and words

import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';

export class WritingPractice {
  constructor(app) {
    this.app = app;
    this.consonants = [];
    this.words = [];
    this.loaded = false;
    this.mode = 'consonants'; // consonants | words
    this.currentIdx = 0;
    this.showGuide = true;
    this.strokes = [];
    this.isDrawing = false;
    this.ctx = null;
    this.canvas = null;
  }

  async loadData() {
    try {
      const [consonants, words] = await Promise.all([
        db.getConsonants(),
        db.getWords({ limit: 200 })
      ]);
      this.consonants = consonants;
      this.words = words.sort(() => Math.random() - 0.5);
      this.loaded = true;
    } catch (err) { console.error('Writing load error:', err); }
  }

  getCurrentItem() {
    if (this.mode === 'consonants') {
      const c = this.consonants[this.currentIdx];
      return c ? { char: c.burmese_char, roman: c.romanization || '', dev: '', meaning: '' } : null;
    } else {
      const w = this.words[this.currentIdx];
      return w ? { char: w.burmese_word, roman: '', dev: toDev(w.burmese_word), meaning: w.english_meaning || '' } : null;
    }
  }

  getTotal() {
    return this.mode === 'consonants' ? this.consonants.length : this.words.length;
  }

  async render(container) {
    if (!this.loaded) {
      container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;font-size:24px;">Loading...</div>';
      await this.loadData();
    }

    const item = this.getCurrentItem();
    if (!item) return;
    const total = this.getTotal();

    container.innerHTML = `
      <div class="pad-sm">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <button id="wr-back" style="background:var(--surface);border:2px solid var(--border);border-radius:10px;
            color:var(--text-muted);cursor:pointer;font-size:12px;padding:6px 12px;font-weight:700;font-family:var(--font);">← Back</button>
          <div style="flex:1;">
            <div style="font-size:20px;font-weight:800;">✍ Writing Practice</div>
            <div style="font-size:12px;color:var(--text-muted);">${this.currentIdx + 1} / ${total}</div>
          </div>
        </div>

        <!-- Mode toggle -->
        <div style="display:flex;gap:6px;margin-bottom:14px;">
          ${['consonants','words'].map(m => `
            <button class="wr-mode-btn" data-wmode="${m}" style="
              flex:1;padding:9px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);
              background:${this.mode===m ? 'var(--orange)15' : 'var(--surface)'};
              border:2px solid ${this.mode===m ? 'var(--orange)' : 'var(--border)'};
              color:${this.mode===m ? 'var(--orange)' : 'var(--text-muted)'};
            ">${m === 'consonants' ? 'Consonants' : 'Words'}</button>
          `).join('')}
        </div>

        <!-- Info card -->
        <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;
          background:var(--surface);border:2px solid var(--border);margin-bottom:14px;">
          <div style="font-size:36px;font-weight:800;color:var(--orange);min-width:60px;text-align:center;">
            ${item.char}
          </div>
          <div style="flex:1;">
            ${item.roman ? `<div style="font-size:14px;font-weight:700;color:var(--text);">${item.roman}</div>` : ''}
            ${item.dev ? `<div style="font-size:14px;color:var(--yellow);font-weight:600;">${item.dev}</div>` : ''}
            ${item.meaning ? `<div style="font-size:12px;color:var(--text-muted);">${item.meaning}</div>` : ''}
          </div>
        </div>

        <!-- Canvas area -->
        <div style="position:relative;border-radius:16px;overflow:hidden;border:3px solid var(--border);margin-bottom:12px;
          background:var(--surface);touch-action:none;">
          <!-- Guide character (underneath) -->
          <div id="wr-guide" style="
            position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
            font-size:${this.mode === 'consonants' ? '180px' : '120px'};font-weight:800;
            color:rgba(255,255,255,0.06);pointer-events:none;font-family:var(--font);
            ${this.showGuide ? '' : 'display:none;'}
          ">${item.char}</div>
          <canvas id="wr-canvas" width="400" height="320" style="width:100%;height:320px;display:block;cursor:crosshair;"></canvas>
        </div>

        <!-- Controls -->
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button id="wr-clear" style="flex:1;padding:12px;border-radius:12px;background:var(--surface);
            border:2px solid var(--border);color:var(--text-muted);font-size:13px;font-weight:700;
            cursor:pointer;font-family:var(--font);">🗑 Clear</button>
          <button id="wr-guide-toggle" style="flex:1;padding:12px;border-radius:12px;
            background:${this.showGuide ? 'var(--orange)15' : 'var(--surface)'};
            border:2px solid ${this.showGuide ? 'var(--orange)' : 'var(--border)'};
            color:${this.showGuide ? 'var(--orange)' : 'var(--text-muted)'};
            font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font);">
            ${this.showGuide ? '👁 Guide ON' : '👁 Guide OFF'}
          </button>
          <button id="wr-undo" style="padding:12px 16px;border-radius:12px;background:var(--surface);
            border:2px solid var(--border);color:var(--text-muted);font-size:13px;font-weight:700;
            cursor:pointer;font-family:var(--font);">↩</button>
        </div>

        <!-- Pen size -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:0 4px;">
          <span style="font-size:11px;color:var(--text-muted);font-weight:600;">Pen</span>
          <input id="wr-pen-size" type="range" min="2" max="12" value="4" style="flex:1;accent-color:var(--orange);">
          <span id="wr-pen-label" style="font-size:11px;color:var(--orange);font-weight:700;min-width:20px;">4</span>
        </div>

        <!-- Navigation -->
        <div style="display:flex;gap:8px;">
          <button id="wr-prev" class="btn-nav btn-prev" style="flex:1;" ${this.currentIdx === 0 ? 'disabled' : ''}>← Prev</button>
          <button id="wr-random" style="padding:13px 18px;border-radius:var(--radius);background:var(--surface);
            border:2px solid var(--border);font-size:18px;cursor:pointer;">🎲</button>
          <button id="wr-next" class="btn-nav btn-next" style="flex:1;">Next →</button>
        </div>

        <!-- Progress -->
        <div style="margin-top:10px;">
          <div class="progress-bar">
            <div class="progress-fill" style="width:${((this.currentIdx + 1) / total) * 100}%;"></div>
          </div>
        </div>
      </div>
    `;

    this.initCanvas(container);
    this.bindEvents(container);
  }

  // ─── CANVAS ───
  initCanvas(container) {
    this.canvas = container.querySelector('#wr-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Scale for retina
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = 320 * dpr;
    this.ctx.scale(dpr, dpr);

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#FF9600';
    this.ctx.lineWidth = 4;

    // Redraw existing strokes
    this.redrawStrokes();

    // Touch/mouse events
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const startDraw = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      const pos = getPos(e);
      this.strokes.push([pos]);
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      const currentStroke = this.strokes[this.strokes.length - 1];
      currentStroke.push(pos);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    };

    const endDraw = (e) => {
      if (e) e.preventDefault();
      this.isDrawing = false;
      this.ctx.beginPath();
    };

    this.canvas.addEventListener('mousedown', startDraw);
    this.canvas.addEventListener('mousemove', draw);
    this.canvas.addEventListener('mouseup', endDraw);
    this.canvas.addEventListener('mouseleave', endDraw);
    this.canvas.addEventListener('touchstart', startDraw, { passive: false });
    this.canvas.addEventListener('touchmove', draw, { passive: false });
    this.canvas.addEventListener('touchend', endDraw, { passive: false });
  }

  redrawStrokes() {
    if (!this.ctx || !this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

    for (const stroke of this.strokes) {
      if (stroke.length < 2) continue;
      this.ctx.beginPath();
      this.ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        this.ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      this.ctx.stroke();
    }
  }

  // ─── EVENTS ───
  bindEvents(container) {
    container.querySelector('#wr-back').addEventListener('click', () => {
      this.app.tabs.more.render(this.app.contentEl);
    });

    // Mode toggle
    container.querySelectorAll('.wr-mode-btn').forEach(b => {
      b.addEventListener('click', () => {
        this.mode = b.dataset.wmode;
        this.currentIdx = 0;
        this.strokes = [];
        this.render(container);
      });
    });

    // Clear
    container.querySelector('#wr-clear').addEventListener('click', () => {
      this.strokes = [];
      this.redrawStrokes();
    });

    // Undo
    container.querySelector('#wr-undo').addEventListener('click', () => {
      this.strokes.pop();
      this.redrawStrokes();
    });

    // Guide toggle
    container.querySelector('#wr-guide-toggle').addEventListener('click', () => {
      this.showGuide = !this.showGuide;
      this.render(container);
    });

    // Pen size
    const penSlider = container.querySelector('#wr-pen-size');
    const penLabel = container.querySelector('#wr-pen-label');
    penSlider.addEventListener('input', () => {
      const size = parseInt(penSlider.value);
      penLabel.textContent = size;
      if (this.ctx) this.ctx.lineWidth = size;
    });

    // Navigation
    container.querySelector('#wr-prev').addEventListener('click', () => {
      this.currentIdx = Math.max(0, this.currentIdx - 1);
      this.strokes = [];
      this.render(container);
    });

    container.querySelector('#wr-next').addEventListener('click', () => {
      this.currentIdx = Math.min(this.getTotal() - 1, this.currentIdx + 1);
      this.strokes = [];
      this.render(container);
    });

    container.querySelector('#wr-random').addEventListener('click', () => {
      this.currentIdx = Math.floor(Math.random() * this.getTotal());
      this.strokes = [];
      this.render(container);
    });
  }
}
