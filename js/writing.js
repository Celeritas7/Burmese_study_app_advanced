// ═══ WRITING PRACTICE ═══
// Fixed square cells, auto-fit characters, scrollable grid

import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';

export class WritingPractice {
  constructor(app) {
    this.app = app;
    this.groups = [];
    this.loaded = false;
    this.showGuide = true;
    this.canvases = {};
    this.checked = {};
  }

  async loadData() {
    try {
      const raw = await db.getConsonants();
      const devMap = new Map();
      for (const c of raw) {
        const dev = toDev(c.burmese_char);
        const key = dev || c.burmese_char;
        if (!devMap.has(key)) devMap.set(key, []);
        const existing = devMap.get(key);
        if (!existing.some(e => e.burmese_char === c.burmese_char)) {
          existing.push(c);
        }
      }
      this.groups = [];
      let idx = 0;
      for (const [dev, chars] of devMap) {
        this.groups.push({
          id: idx, dev,
          chars: chars.map(c => ({ burmese: c.burmese_char, roman: c.romanization || '', cid: c.id }))
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

    const CELL = 150; // fixed square size in px

    container.innerHTML = `
      <div style="padding:10px 6px 80px;">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 4px;position:sticky;top:0;z-index:10;background:var(--bg);padding-top:6px;padding-bottom:6px;">
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

        <!-- Grid: fixed cell size, wraps naturally -->
        <div id="wr-grid" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">
          ${this.groups.map((g, i) => this.renderCell(g, i, CELL)).join('')}
        </div>
      </div>
    `;

    this.initAllCanvases(container);
    this.bindEvents(container);
  }

  renderCell(group, idx, size) {
    const isChecked = this.checked[idx];
    const guideChars = group.chars.map(c => c.burmese).join(' ');
    const totalLen = [...guideChars.replace(/ /g, '')].length;
    const guideFontSize = totalLen > 4 ? 36 : totalLen > 2 ? 50 : 72;
    const canvasH = size - 36; // leave room for label

    const labelParts = group.chars.map(c =>
      `<span style="white-space:nowrap;font-size:11px;font-weight:700;color:#444;font-family:'Noto Sans Myanmar',sans-serif;">${c.burmese}</span>`
    ).join(' ');

    return `
      <div class="wr-cell" data-idx="${idx}" style="
        position:relative;width:${size}px;height:${size}px;
        border-radius:8px;overflow:hidden;
        background:#FAFAF8;border:2px solid #e0e0e0;
        flex-shrink:0;
      ">
        <!-- Clear -->
        <button class="wr-cell-clear" data-cidx="${idx}" style="
          position:absolute;top:4px;left:4px;width:18px;height:18px;border-radius:4px;
          background:rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.1);
          color:rgba(0,0,0,0.3);font-size:9px;cursor:pointer;font-family:var(--font);
          display:flex;align-items:center;justify-content:center;z-index:5;
        ">✕</button>

        <!-- Checkbox -->
        <button class="wr-cell-check" data-chidx="${idx}" style="
          position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:5px;
          background:${isChecked ? '#58CC02' : 'rgba(0,0,0,0.04)'};
          border:2px solid ${isChecked ? '#58CC02' : 'rgba(0,0,0,0.14)'};
          cursor:pointer;z-index:5;display:flex;align-items:center;justify-content:center;
          font-size:12px;color:#fff;
        ">${isChecked ? '✓' : ''}</button>

        <!-- Guide -->
        <div class="wr-guide-char" style="
          position:absolute;top:0;left:0;right:0;height:${canvasH}px;
          display:flex;align-items:center;justify-content:center;
          font-size:${guideFontSize}px;font-weight:700;color:rgba(0,0,0,0.07);pointer-events:none;
          font-family:'Noto Sans Myanmar',sans-serif;
          ${this.showGuide ? '' : 'display:none;'}
        ">${guideChars}</div>

        <!-- Canvas -->
        <canvas class="wr-canvas" data-canvasid="${idx}" width="${size * 2}" height="${canvasH * 2}"
          style="width:${size}px;height:${canvasH}px;display:block;cursor:crosshair;touch-action:none;"></canvas>

        <!-- Label -->
        <div style="position:absolute;bottom:0;left:0;right:0;height:36px;
          background:rgba(0,0,0,0.04);border-top:1px solid rgba(0,0,0,0.08);
          display:flex;align-items:center;justify-content:center;gap:4px;padding:0 4px;">
          ${labelParts}
          <span style="font-size:11px;color:#999;font-weight:600;">${group.dev}</span>
          ${group.chars[0].roman ? `<span style="font-size:9px;color:#bbb;">${group.chars.map(c=>c.roman).join('/')}</span>` : ''}
        </div>
      </div>
    `;
  }

  initAllCanvases(container) {
    this.canvases = {};
    container.querySelectorAll('.wr-canvas').forEach(canvas => {
      const idx = canvas.dataset.canvasid;
      const ctx = canvas.getContext('2d');
      // Canvas already sized via width/height attributes (2x for retina)
      ctx.scale(2, 2);
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
        const d = this.canvases[idx];
        d.isDrawing = true;
        const pos = getPos(e);
        d.strokes.push([pos]);
        d.ctx.beginPath();
        d.ctx.moveTo(pos.x, pos.y);
      };

      const draw = (e) => {
        const d = this.canvases[idx];
        if (!d.isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        d.strokes[d.strokes.length - 1].push(pos);
        d.ctx.lineTo(pos.x, pos.y);
        d.ctx.stroke();
        d.ctx.beginPath();
        d.ctx.moveTo(pos.x, pos.y);
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
    const d = this.canvases[idx];
    if (!d) return;
    d.ctx.clearRect(0, 0, d.canvas.width / 2, d.canvas.height / 2);
    d.strokes = [];
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
        btn.style.background = 'rgba(0,0,0,0.04)';
        btn.style.borderColor = 'rgba(0,0,0,0.14)';
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
        btn.style.background = this.checked[idx] ? '#58CC02' : 'rgba(0,0,0,0.04)';
        btn.style.borderColor = this.checked[idx] ? '#58CC02' : 'rgba(0,0,0,0.14)';
        btn.textContent = this.checked[idx] ? '✓' : '';
      });
    });
  }
}
