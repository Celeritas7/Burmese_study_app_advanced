// ═══ WRITING PRACTICE ═══
// Grid-based practice sheet — grouped by Devanagari equivalent

import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';

export class WritingPractice {
  constructor(app) {
    this.app = app;
    this.groups = []; // [{chars: [{burmese, dev, roman}], dev, id}]
    this.loaded = false;
    this.showGuide = true;
    this.canvases = {};
    this.checked = {};
  }

  async loadData() {
    try {
      const raw = await db.getConsonants();
      // Group consonants by their Devanagari equivalent
      const devMap = new Map(); // dev → [{burmese_char, romanization, id}]
      for (const c of raw) {
        const dev = toDev(c.burmese_char);
        const key = dev || c.burmese_char;
        if (!devMap.has(key)) devMap.set(key, []);
        // Avoid duplicate burmese_char within same group
        const existing = devMap.get(key);
        if (!existing.some(e => e.burmese_char === c.burmese_char)) {
          existing.push(c);
        }
      }
      this.groups = [];
      let idx = 0;
      for (const [dev, chars] of devMap) {
        this.groups.push({
          id: idx,
          dev,
          chars: chars.map(c => ({
            burmese: c.burmese_char,
            roman: c.romanization || '',
            cid: c.id
          }))
        });
        idx++;
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

        <div id="wr-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:0;
          border:2px solid #ddd;border-radius:6px;overflow:hidden;background:#fff;">
          ${this.groups.map((g, i) => this.renderCell(g, i)).join('')}
        </div>
      </div>
    `;

    this.initAllCanvases(container);
    this.bindEvents(container);
  }

  renderCell(group, idx) {
    const isChecked = this.checked[idx];
    const isSingle = group.chars.length === 1;

    // Build guide text: show all burmese chars stacked or side by side
    const guideChars = group.chars.map(c => c.burmese).join(' ');
    const guideFontSize = guideChars.length > 6 ? 30 : guideChars.length > 3 ? 45 : 65;

    // Build label: show each burmese + roman pair
    const labelParts = group.chars.map(c =>
      `<span style="white-space:nowrap;">${c.burmese}${c.roman ? ` <span style="font-size:8px;color:#aaa;">${c.roman}</span>` : ''}</span>`
    ).join('<span style="color:#ccc;margin:0 2px;">·</span>');

    return `
      <div class="wr-cell" data-idx="${idx}" style="
        position:relative;border-right:1px solid #e0e0e0;border-bottom:1px solid #e0e0e0;
        background:#FAFAF8;
      ">
        <button class="wr-cell-clear" data-cidx="${idx}" style="
          position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:3px;
          background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);
          color:rgba(0,0,0,0.25);font-size:8px;cursor:pointer;font-family:var(--font);
          display:flex;align-items:center;justify-content:center;z-index:5;
        ">✕</button>

        <button class="wr-cell-check" data-chidx="${idx}" style="
          position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:4px;
          background:${isChecked ? '#58CC02' : 'rgba(0,0,0,0.03)'};
          border:2px solid ${isChecked ? '#58CC02' : 'rgba(0,0,0,0.12)'};
          cursor:pointer;z-index:5;display:flex;align-items:center;justify-content:center;
          font-size:11px;color:#fff;
        ">${isChecked ? '✓' : ''}</button>

        <div class="wr-guide-char" style="
          position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          font-size:${guideFontSize}px;font-weight:700;color:rgba(0,0,0,0.07);pointer-events:none;
          font-family:'Noto Sans Myanmar',sans-serif;padding-bottom:28px;
          ${this.showGuide ? '' : 'display:none;'}
        ">${guideChars}</div>

        <canvas class="wr-canvas" data-canvasid="${idx}" width="200" height="160"
          style="width:100%;height:120px;display:block;cursor:crosshair;touch-action:none;"></canvas>

        <div style="text-align:center;padding:2px 2px 4px;background:rgba(0,0,0,0.03);border-top:1px solid rgba(0,0,0,0.06);
          display:flex;justify-content:center;align-items:baseline;gap:2px;flex-wrap:wrap;">
          ${labelParts}
          <span style="font-size:10px;color:#888;margin-left:2px;">${group.dev}</span>
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
        const idx = parseInt(btn.dataset.chidx);
        this.checked[idx] = !this.checked[idx];
        btn.style.background = this.checked[idx] ? '#58CC02' : 'rgba(0,0,0,0.03)';
        btn.style.borderColor = this.checked[idx] ? '#58CC02' : 'rgba(0,0,0,0.12)';
        btn.textContent = this.checked[idx] ? '✓' : '';
      });
    });
  }
}
