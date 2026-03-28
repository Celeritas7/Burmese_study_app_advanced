// ═══ WRITING PRACTICE ═══
// Grid-based practice sheet — all consonants visible at once
// Each cell has its own canvas for tracing

import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';

export class WritingPractice {
  constructor(app) {
    this.app = app;
    this.consonants = [];
    this.loaded = false;
    this.showGuide = true;
    this.canvases = {};
    this.checked = {};
  }

  async loadData() {
    try {
      this.consonants = await db.getConsonants();
      this.loaded = true;
    } catch (err) { console.error('Writing load error:', err); }
  }

  async render(container) {
    if (!this.loaded) {
      container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;font-size:24px;">Loading...</div>';
      await this.loadData();
    }

    container.innerHTML = `
      <div style="padding:12px 8px 80px;">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:0 6px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <button id="wr-back" style="background:var(--surface);border:2px solid var(--border);border-radius:10px;
              color:var(--text-muted);cursor:pointer;font-size:12px;padding:6px 12px;font-weight:700;font-family:var(--font);">← Back</button>
            <div style="font-size:16px;font-weight:800;">📝 Consonants Practice Sheet</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <!-- Guide toggle -->
            <button id="wr-guide-toggle" style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;
              background:${this.showGuide ? 'var(--green)' : 'var(--surface)'};
              border:2px solid ${this.showGuide ? 'var(--green)' : 'var(--border)'};
              color:${this.showGuide ? '#fff' : 'var(--text-muted)'};
              font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);">
              Show Guide
            </button>
            <!-- Clear All -->
            <button id="wr-clear-all" style="padding:6px 12px;border-radius:10px;background:var(--surface);
              border:2px solid var(--border);color:var(--text-muted);font-size:11px;font-weight:700;
              cursor:pointer;font-family:var(--font);">🗑 Clear All</button>
          </div>
        </div>

        <!-- Grid -->
        <div id="wr-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:0;border:2px solid var(--border-light);border-radius:4px;overflow:hidden;">
          ${this.consonants.map((c, i) => this.renderCell(c, i)).join('')}
        </div>
      </div>
    `;

    this.initAllCanvases(container);
    this.bindEvents(container);
  }

  renderCell(consonant, idx) {
    const dev = toDev(consonant.burmese_char);
    const isChecked = this.checked[consonant.id];
    return `
      <div class="wr-cell" data-idx="${idx}" data-cid="${consonant.id}" style="
        position:relative;border-right:1px solid var(--border-light);border-bottom:1px solid var(--border-light);
        background:#FAFAF8;
      ">
        <!-- Clear cell button -->
        <button class="wr-cell-clear" data-cidx="${idx}" style="
          position:absolute;top:4px;left:4px;width:18px;height:18px;border-radius:4px;
          background:rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.1);
          color:rgba(0,0,0,0.3);font-size:10px;cursor:pointer;font-family:var(--font);
          display:flex;align-items:center;justify-content:center;z-index:5;
        ">✕</button>

        <!-- Checkbox -->
        <button class="wr-cell-check" data-chid="${consonant.id}" style="
          position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:4px;
          background:${isChecked ? 'var(--green)' : 'rgba(0,0,0,0.04)'};
          border:2px solid ${isChecked ? 'var(--green)' : 'rgba(0,0,0,0.15)'};
          cursor:pointer;z-index:5;display:flex;align-items:center;justify-content:center;
          font-size:12px;color:#fff;
        ">${isChecked ? '✓' : ''}</button>

        <!-- Guide character -->
        <div class="wr-guide-char" style="
          position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          font-size:80px;font-weight:700;color:rgba(0,0,0,0.08);pointer-events:none;
          font-family:'Noto Sans Myanmar',sans-serif;padding-bottom:24px;
          ${this.showGuide ? '' : 'display:none;'}
        ">${consonant.burmese_char}</div>

        <!-- Canvas -->
        <canvas class="wr-canvas" data-canvasid="${idx}" width="200" height="180"
          style="width:100%;height:140px;display:block;cursor:crosshair;touch-action:none;"></canvas>

        <!-- Label -->
        <div style="text-align:center;padding:3px 0 6px;background:rgba(0,0,0,0.03);border-top:1px solid rgba(0,0,0,0.06);">
          <span style="font-size:12px;font-weight:600;color:#555;">${dev}</span>
        </div>
      </div>
    `;
  }

  // ─── CANVAS INIT ───
  initAllCanvases(container) {
    this.canvases = {};
    container.querySelectorAll('.wr-canvas').forEach(canvas => {
      const idx = canvas.dataset.canvasid;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = 140 * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;

      this.canvases[idx] = { canvas, ctx, strokes: [], isDrawing: false };

      const getPos = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return { x: t.clientX - r.left, y: t.clientY - r.top };
      };

      const startDraw = (e) => {
        e.preventDefault();
        const data = this.canvases[idx];
        data.isDrawing = true;
        const pos = getPos(e);
        data.strokes.push([pos]);
        data.ctx.beginPath();
        data.ctx.moveTo(pos.x, pos.y);
      };

      const draw = (e) => {
        const data = this.canvases[idx];
        if (!data.isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        const stroke = data.strokes[data.strokes.length - 1];
        stroke.push(pos);
        data.ctx.lineTo(pos.x, pos.y);
        data.ctx.stroke();
        data.ctx.beginPath();
        data.ctx.moveTo(pos.x, pos.y);
      };

      const endDraw = (e) => {
        if (e) e.preventDefault();
        this.canvases[idx].isDrawing = false;
        this.canvases[idx].ctx.beginPath();
      };

      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', endDraw);
      canvas.addEventListener('mouseleave', endDraw);
      canvas.addEventListener('touchstart', startDraw, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', endDraw, { passive: false });
    });
  }

  clearCanvas(idx) {
    const data = this.canvases[idx];
    if (!data) return;
    const dpr = window.devicePixelRatio || 1;
    data.ctx.clearRect(0, 0, data.canvas.width / dpr, data.canvas.height / dpr);
    data.strokes = [];
  }

  // ─── EVENTS ───
  bindEvents(container) {
    container.querySelector('#wr-back').addEventListener('click', () => {
      this.app.tabs.more.render(this.app.contentEl);
    });

    // Guide toggle
    container.querySelector('#wr-guide-toggle').addEventListener('click', () => {
      this.showGuide = !this.showGuide;
      container.querySelectorAll('.wr-guide-char').forEach(el => {
        el.style.display = this.showGuide ? 'flex' : 'none';
      });
      const btn = container.querySelector('#wr-guide-toggle');
      btn.style.background = this.showGuide ? 'var(--green)' : 'var(--surface)';
      btn.style.borderColor = this.showGuide ? 'var(--green)' : 'var(--border)';
      btn.style.color = this.showGuide ? '#fff' : 'var(--text-muted)';
    });

    // Clear All
    container.querySelector('#wr-clear-all').addEventListener('click', () => {
      for (const idx of Object.keys(this.canvases)) {
        this.clearCanvas(idx);
      }
      this.checked = {};
      container.querySelectorAll('.wr-cell-check').forEach(btn => {
        btn.style.background = 'rgba(0,0,0,0.04)';
        btn.style.borderColor = 'rgba(0,0,0,0.15)';
        btn.textContent = '';
      });
    });

    // Individual cell clear
    container.querySelectorAll('.wr-cell-clear').forEach(btn => {
      btn.addEventListener('click', () => {
        this.clearCanvas(btn.dataset.cidx);
      });
    });

    // Checkboxes
    container.querySelectorAll('.wr-cell-check').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = parseInt(btn.dataset.chid);
        this.checked[cid] = !this.checked[cid];
        btn.style.background = this.checked[cid] ? 'var(--green)' : 'rgba(0,0,0,0.04)';
        btn.style.borderColor = this.checked[cid] ? 'var(--green)' : 'rgba(0,0,0,0.15)';
        btn.textContent = this.checked[cid] ? '✓' : '';
      });
    });
  }
}
