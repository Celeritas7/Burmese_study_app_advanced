// ═══ WRITING PRACTICE ═══
// Grid-based practice sheet — deduplicated consonants

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
      const raw = await db.getConsonants();
      // Deduplicate: keep only one entry per unique burmese_char
      const seen = new Set();
      this.consonants = [];
      for (const c of raw) {
        if (!seen.has(c.burmese_char)) {
          seen.add(c.burmese_char);
          this.consonants.push(c);
        }
      }
      this.loaded = true;
    } catch (err) { console.error('Writing load error:', err); }
  }

  async render(container) {
    if (!this.loaded) {
      container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;font-size:24px;">Loading...</div>';
      await this.loadData();
    }

    container.innerHTML = `
      <div style="padding:10px 6px 80px;">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 4px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <button id="wr-back" style="background:var(--surface);border:2px solid var(--border);border-radius:10px;
              color:var(--text-muted);cursor:pointer;font-size:11px;padding:6px 10px;font-weight:700;font-family:var(--font);">←</button>
            <div style="font-size:14px;font-weight:800;">📝 Practice Sheet</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <button id="wr-guide-toggle" style="padding:6px 10px;border-radius:8px;
              background:${this.showGuide ? 'var(--green)' : 'var(--surface)'};
              border:2px solid ${this.showGuide ? 'var(--green)' : 'var(--border)'};
              color:${this.showGuide ? '#fff' : 'var(--text-muted)'};
              font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font);">Guide</button>
            <button id="wr-clear-all" style="padding:6px 10px;border-radius:8px;background:var(--surface);
              border:2px solid var(--border);color:var(--text-muted);font-size:10px;font-weight:700;
              cursor:pointer;font-family:var(--font);">🗑 Clear</button>
          </div>
        </div>

        <!-- Grid -->
        <div id="wr-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:0;
          border:2px solid #ddd;border-radius:6px;overflow:hidden;background:#fff;">
          ${this.consonants.map((c, i) => this.renderCell(c, i)).join('')}
        </div>
      </div>
    `;

    this.initAllCanvases(container);
    this.bindEvents(container);
  }

  renderCell(consonant, idx) {
    const dev = toDev(consonant.burmese_char);
    const roman = consonant.romanization || '';
    const isChecked = this.checked[consonant.id];

    // Calculate font size based on character length
    const charLen = [...consonant.burmese_char].length;
    const guideFontSize = charLen > 2 ? 40 : charLen > 1 ? 55 : 70;

    return `
      <div class="wr-cell" data-idx="${idx}" style="
        position:relative;border-right:1px solid #e0e0e0;border-bottom:1px solid #e0e0e0;
        background:#FAFAF8;
      ">
        <!-- Clear -->
        <button class="wr-cell-clear" data-cidx="${idx}" style="
          position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:3px;
          background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);
          color:rgba(0,0,0,0.25);font-size:8px;cursor:pointer;font-family:var(--font);
          display:flex;align-items:center;justify-content:center;z-index:5;
        ">✕</button>

        <!-- Checkbox -->
        <button class="wr-cell-check" data-chid="${consonant.id}" style="
          position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:4px;
          background:${isChecked ? '#58CC02' : 'rgba(0,0,0,0.03)'};
          border:2px solid ${isChecked ? '#58CC02' : 'rgba(0,0,0,0.12)'};
          cursor:pointer;z-index:5;display:flex;align-items:center;justify-content:center;
          font-size:11px;color:#fff;
        ">${isChecked ? '✓' : ''}</button>

        <!-- Guide character -->
        <div class="wr-guide-char" style="
          position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          font-size:${guideFontSize}px;font-weight:700;color:rgba(0,0,0,0.07);pointer-events:none;
          font-family:'Noto Sans Myanmar',sans-serif;padding-bottom:28px;
          ${this.showGuide ? '' : 'display:none;'}
        ">${consonant.burmese_char}</div>

        <!-- Canvas -->
        <canvas class="wr-canvas" data-canvasid="${idx}" width="200" height="160"
          style="width:100%;height:120px;display:block;cursor:crosshair;touch-action:none;"></canvas>

        <!-- Label bar -->
        <div style="text-align:center;padding:2px 2px 4px;background:rgba(0,0,0,0.03);border-top:1px solid rgba(0,0,0,0.06);
          display:flex;justify-content:center;gap:4px;align-items:baseline;">
          <span style="font-size:13px;font-weight:700;color:#444;font-family:'Noto Sans Myanmar',sans-serif;">${consonant.burmese_char}</span>
          <span style="font-size:10px;color:#888;">${dev}</span>
          ${roman ? `<span style="font-size:9px;color:#aaa;">${roman}</span>` : ''}
        </div>
      </div>
    `;
  }

  initAllCanvases(container) {
    this.canvases = {};
    container.querySelectorAll('.wr-canvas').forEach(canvas => {
      const idx = canvas.dataset.canvasid;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = 120 * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2.5;

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

  bindEvents(container) {
    container.querySelector('#wr-back').addEventListener('click', () => {
      this.app.tabs.more.render(this.app.contentEl);
    });

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

    container.querySelector('#wr-clear-all').addEventListener('click', () => {
      for (const idx of Object.keys(this.canvases)) this.clearCanvas(idx);
      this.checked = {};
      container.querySelectorAll('.wr-cell-check').forEach(btn => {
        btn.style.background = 'rgba(0,0,0,0.03)';
        btn.style.borderColor = 'rgba(0,0,0,0.12)';
        btn.textContent = '';
      });
    });

    container.querySelectorAll('.wr-cell-clear').forEach(btn => {
      btn.addEventListener('click', () => this.clearCanvas(btn.dataset.cidx));
    });

    container.querySelectorAll('.wr-cell-check').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = parseInt(btn.dataset.chid);
        this.checked[cid] = !this.checked[cid];
        btn.style.background = this.checked[cid] ? '#58CC02' : 'rgba(0,0,0,0.03)';
        btn.style.borderColor = this.checked[cid] ? '#58CC02' : 'rgba(0,0,0,0.12)';
        btn.textContent = this.checked[cid] ? '✓' : '';
      });
    });
  }
}
